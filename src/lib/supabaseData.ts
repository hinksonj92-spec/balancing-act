// ============================================================
// Balancing Act — Supabase Data Layer
// Real database queries replacing mock data for authenticated users
// ============================================================

import { supabase } from '@/lib/supabase';
import type {
  Category,
  Metric,
  MetricEntry,
  CategorySnapshot,
  CategoryWithScore,
  DashboardData,
  TrendDirection,
} from '@/lib/types';

// ---- Helpers ----

/** Returns today as YYYY-MM-DD */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the current month period label as YYYY-MM */
function currentPeriod(): string {
  return todayISO().slice(0, 7);
}

/** Returns the previous month period label as YYYY-MM */
function previousPeriod(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

/** Returns the start-of-month date string (YYYY-MM-01) for a given period */
function periodStart(period: string): string {
  return `${period}-01`;
}

/** Returns the last day of the month for a given period */
function periodEnd(period: string): string {
  const [year, month] = period.split('-').map(Number);
  // Day 0 of next month = last day of current month
  const lastDay = new Date(year, month, 0).getDate();
  return `${period}-${String(lastDay).padStart(2, '0')}`;
}

// ---- 6. computeNormalizedValue ----

/**
 * Normalizes a raw value to 0-1 range given scale bounds.
 * Clamps the result between 0 and 1.
 */
export function computeNormalizedValue(
  value: number,
  scaleMin: number,
  scaleMax: number,
): number {
  if (scaleMax === scaleMin) return value >= scaleMax ? 1 : 0;
  const normalized = (value - scaleMin) / (scaleMax - scaleMin);
  return Math.max(0, Math.min(1, normalized));
}

// ---- 5. lookupMetricByName ----

/**
 * Finds a metric by exact name match (case-insensitive).
 * Returns metric info needed for writing entries, or null if not found.
 */
export async function lookupMetricByName(
  userId: string,
  metricName: string,
): Promise<{ id: string; category_id: string; scale_min: number; scale_max: number } | null> {
  const { data, error } = await supabase
    .from('metrics')
    .select('id, category_id, scale_min, scale_max')
    .eq('user_id', userId)
    .eq('is_active', true)
    .ilike('name', metricName)
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    category_id: data.category_id,
    scale_min: Number(data.scale_min),
    scale_max: Number(data.scale_max),
  };
}

// ---- 4. writeMetricEntry ----

/**
 * Writes (upserts) a metric entry for today.
 * Looks up the metric by name, then inserts or updates the entry for today's date.
 */
export async function writeMetricEntry(params: {
  userId: string;
  metricName: string;
  value: number;
  normalizedValue: number;
  source: 'chat' | 'manual';
}): Promise<{ success: boolean; error?: string }> {
  const { userId, metricName, value, normalizedValue, source } = params;

  // Look up the metric by name
  const metric = await lookupMetricByName(userId, metricName);
  if (!metric) {
    return { success: false, error: `Metric "${metricName}" not found` };
  }

  const today = todayISO();
  const period = currentPeriod();

  const { error } = await supabase
    .from('metric_entries')
    .upsert(
      {
        metric_id: metric.id,
        user_id: userId,
        value,
        normalized_value: normalizedValue,
        entry_date: today,
        entry_period: period,
        source,
      },
      { onConflict: 'metric_id,entry_date' },
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ---- Internal: compute weighted score for a category from entries ----

async function computeCategoryScore(
  userId: string,
  categoryId: string,
  period: string,
): Promise<number> {
  // Get all active metrics for this category
  const { data: metrics } = await supabase
    .from('metrics')
    .select('id, weight')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .eq('is_active', true);

  if (!metrics || metrics.length === 0) return 0;

  // Get entries for these metrics in the given period
  const metricIds = metrics.map((m) => m.id);
  const { data: entries } = await supabase
    .from('metric_entries')
    .select('metric_id, normalized_value')
    .eq('user_id', userId)
    .in('metric_id', metricIds)
    .gte('entry_date', periodStart(period))
    .lte('entry_date', periodEnd(period));

  if (!entries || entries.length === 0) return 0;

  // For each metric, use the latest entry's normalized_value (take the max entry_date)
  // Since we may have multiple entries per metric in a month, group by metric_id
  const latestByMetric = new Map<string, number>();
  for (const entry of entries) {
    // If multiple entries exist, later ones overwrite (entries come in default order)
    latestByMetric.set(entry.metric_id, Number(entry.normalized_value));
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (const metric of metrics) {
    const normVal = latestByMetric.get(metric.id);
    if (normVal !== undefined) {
      weightedSum += normVal * Number(metric.weight);
      totalWeight += Number(metric.weight);
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ---- Internal: compute streak (consecutive days with at least one entry) ----

async function computeStreak(userId: string, categoryId?: string): Promise<number> {
  // Build the query to get distinct entry dates, most recent first
  let query = supabase
    .from('metric_entries')
    .select('entry_date')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .limit(365); // cap at one year look-back

  if (categoryId) {
    // Need to filter by metrics belonging to this category
    const { data: metrics } = await supabase
      .from('metrics')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('is_active', true);

    if (!metrics || metrics.length === 0) return 0;
    query = query.in('metric_id', metrics.map((m) => m.id));
  }

  const { data: entries } = await query;
  if (!entries || entries.length === 0) return 0;

  // Get unique dates sorted descending
  const uniqueDates = [...new Set(entries.map((e) => e.entry_date))].sort(
    (a, b) => (b > a ? 1 : -1),
  );

  // Count consecutive days backwards from today
  const today = todayISO();
  let streak = 0;
  let expectedDate = today;

  for (const date of uniqueDates) {
    if (date === expectedDate) {
      streak++;
      // Move expected to previous day
      const d = new Date(expectedDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      expectedDate = d.toISOString().slice(0, 10);
    } else if (date < expectedDate) {
      // Gap found — streak is broken
      break;
    }
  }

  return streak;
}

// ---- Internal: compute trend for a category ----

async function computeTrend(
  userId: string,
  categoryId: string,
): Promise<{ direction: TrendDirection; delta: number }> {
  const current = currentPeriod();
  const previous = previousPeriod();

  const [currentScore, previousScore] = await Promise.all([
    computeCategoryScore(userId, categoryId, current),
    computeCategoryScore(userId, categoryId, previous),
  ]);

  const delta = currentScore - previousScore;

  let direction: TrendDirection = 'stable';
  if (delta > 0.02) direction = 'improving';
  else if (delta < -0.02) direction = 'declining';

  return { direction, delta: Math.round(delta * 100) / 100 };
}

// ---- Internal: get monthly scores for sparkline (last 12 months) ----

async function getMonthlyScores(
  userId: string,
  categoryId: string,
): Promise<number[]> {
  // Check category_snapshots first for pre-computed scores
  const now = new Date();
  const periods: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    );
  }

  const { data: snapshots } = await supabase
    .from('category_snapshots')
    .select('period_label, weighted_score')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .eq('period_type', 'monthly')
    .in('period_label', periods);

  const snapshotMap = new Map<string, number>();
  if (snapshots) {
    for (const s of snapshots) {
      snapshotMap.set(s.period_label, Number(s.weighted_score));
    }
  }

  // For any month without a snapshot, compute from entries
  const scores: number[] = [];
  for (const period of periods) {
    if (snapshotMap.has(period)) {
      scores.push(snapshotMap.get(period)!);
    } else {
      // Only compute for current month (others likely have no data)
      if (period === currentPeriod()) {
        const score = await computeCategoryScore(userId, categoryId, period);
        scores.push(score);
      } else {
        scores.push(0);
      }
    }
  }

  return scores;
}

// ---- 1. fetchDashboardData ----

/**
 * Fetches all data needed for the dashboard.
 * Queries categories, computes scores from metric_entries for current month,
 * calculates streaks and trends.
 */
export async function fetchDashboardData(userId: string): Promise<DashboardData> {
  // 1. Fetch all active categories
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (catError || !categories || categories.length === 0) {
    // Return empty dashboard structure
    return {
      overall_score: 0,
      balance_index: 0,
      overall_streak: 0,
      categories: [],
      today_updated_categories: [],
    };
  }

  // 2. For each category, compute score, trend, streak, and monthly scores
  const categoriesWithScores: CategoryWithScore[] = await Promise.all(
    categories.map(async (cat: Category) => {
      const [score, trend, streak, monthlyScores] = await Promise.all([
        computeCategoryScore(userId, cat.id, currentPeriod()),
        computeTrend(userId, cat.id),
        computeStreak(userId, cat.id),
        getMonthlyScores(userId, cat.id),
      ]);

      return {
        ...cat,
        current_score: Math.round(score * 100) / 100,
        trend_direction: trend.direction,
        trend_delta: trend.delta,
        streak_days: streak,
        monthly_scores: monthlyScores,
      } as CategoryWithScore;
    }),
  );

  // 3. Compute overall weighted score
  let weightedSum = 0;
  let totalWeight = 0;
  for (const cat of categoriesWithScores) {
    weightedSum += cat.current_score * cat.weight;
    totalWeight += cat.weight;
  }
  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // 4. Compute balance index (1 - coefficient of variation of category scores)
  // A perfectly balanced life = 1.0, highly imbalanced = closer to 0
  const scores = categoriesWithScores.map((c) => c.current_score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  let balanceIndex = 1;
  if (mean > 0 && scores.length > 1) {
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    balanceIndex = Math.max(0, Math.min(1, 1 - cv));
  } else if (mean === 0) {
    balanceIndex = 0;
  }

  // 5. Compute overall streak
  const overallStreak = await computeStreak(userId);

  // 6. Determine which categories have entries today
  const today = todayISO();
  const { data: todayEntries } = await supabase
    .from('metric_entries')
    .select('metric_id')
    .eq('user_id', userId)
    .eq('entry_date', today);

  const todayUpdatedCategories: string[] = [];
  if (todayEntries && todayEntries.length > 0) {
    const todayMetricIds = todayEntries.map((e) => e.metric_id);
    const { data: todayMetrics } = await supabase
      .from('metrics')
      .select('category_id')
      .in('id', todayMetricIds);

    if (todayMetrics) {
      const uniqueCatIds = [...new Set(todayMetrics.map((m) => m.category_id))];
      todayUpdatedCategories.push(...uniqueCatIds);
    }
  }

  return {
    overall_score: Math.round(overallScore * 100) / 100,
    balance_index: Math.round(balanceIndex * 100) / 100,
    overall_streak: overallStreak,
    categories: categoriesWithScores,
    today_updated_categories: todayUpdatedCategories,
  };
}

// ---- 2. fetchHeatmapData ----

/**
 * Queries category_snapshots grouped by month for the given year.
 * Returns 12 months of data with scores per category.
 */
export async function fetchHeatmapData(
  userId: string,
  year: number,
): Promise<{ month: string; scores: Record<string, number> }[]> {
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  // Build period labels for the year
  const periodLabels = monthLabels.map(
    (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`,
  );

  // Fetch snapshots for this year
  const { data: snapshots } = await supabase
    .from('category_snapshots')
    .select('category_id, period_label, weighted_score')
    .eq('user_id', userId)
    .eq('period_type', 'monthly')
    .in('period_label', periodLabels);

  // Fetch categories to map IDs to names
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_active', true);

  const catNameMap = new Map<string, string>();
  if (categories) {
    for (const c of categories) {
      catNameMap.set(c.id, c.name);
    }
  }

  // Build snapshot lookup: period_label -> { categoryName -> score }
  const snapshotLookup = new Map<string, Record<string, number>>();
  if (snapshots) {
    for (const s of snapshots) {
      const catName = catNameMap.get(s.category_id);
      if (!catName) continue;

      if (!snapshotLookup.has(s.period_label)) {
        snapshotLookup.set(s.period_label, {});
      }
      snapshotLookup.get(s.period_label)![catName] = Number(s.weighted_score);
    }
  }

  return monthLabels.map((month, i) => {
    const period = periodLabels[i];
    const scores = snapshotLookup.get(period) || {};
    return { month, scores };
  });
}

// ---- 3. fetchCategoryMetrics ----

/**
 * Queries metrics and their latest entries for a specific category.
 * Returns metric details with current value, trend, and streak.
 */
export async function fetchCategoryMetrics(
  userId: string,
  categoryId: string,
): Promise<
  {
    name: string;
    value: number;
    weight: number;
    trend: 'improving' | 'stable' | 'declining';
    streak: number;
  }[]
> {
  // Get all active metrics for this category
  const { data: metrics, error } = await supabase
    .from('metrics')
    .select('id, name, weight, polarity')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error || !metrics || metrics.length === 0) return [];

  const period = currentPeriod();
  const prevPeriod = previousPeriod();
  const today = todayISO();

  const results = await Promise.all(
    metrics.map(async (metric) => {
      // Get latest entry for this metric in current period
      const { data: currentEntries } = await supabase
        .from('metric_entries')
        .select('normalized_value, entry_date')
        .eq('metric_id', metric.id)
        .eq('user_id', userId)
        .gte('entry_date', periodStart(period))
        .lte('entry_date', periodEnd(period))
        .order('entry_date', { ascending: false })
        .limit(1);

      const currentValue =
        currentEntries && currentEntries.length > 0
          ? Number(currentEntries[0].normalized_value)
          : 0;

      // Get latest entry for previous period for trend
      const { data: prevEntries } = await supabase
        .from('metric_entries')
        .select('normalized_value')
        .eq('metric_id', metric.id)
        .eq('user_id', userId)
        .gte('entry_date', periodStart(prevPeriod))
        .lte('entry_date', periodEnd(prevPeriod))
        .order('entry_date', { ascending: false })
        .limit(1);

      const prevValue =
        prevEntries && prevEntries.length > 0
          ? Number(prevEntries[0].normalized_value)
          : 0;

      const delta = currentValue - prevValue;
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (delta > 0.02) trend = 'improving';
      else if (delta < -0.02) trend = 'declining';

      // Compute metric-level streak (consecutive days with entries for this metric)
      const { data: streakEntries } = await supabase
        .from('metric_entries')
        .select('entry_date')
        .eq('metric_id', metric.id)
        .eq('user_id', userId)
        .order('entry_date', { ascending: false })
        .limit(365);

      let streak = 0;
      if (streakEntries && streakEntries.length > 0) {
        let expectedDate = today;
        for (const entry of streakEntries) {
          if (entry.entry_date === expectedDate) {
            streak++;
            const d = new Date(expectedDate + 'T00:00:00');
            d.setDate(d.getDate() - 1);
            expectedDate = d.toISOString().slice(0, 10);
          } else if (entry.entry_date < expectedDate) {
            break;
          }
        }
      }

      return {
        name: metric.name,
        value: Math.round(currentValue * 100) / 100,
        weight: Number(metric.weight),
        trend,
        streak,
      };
    }),
  );

  return results;
}
