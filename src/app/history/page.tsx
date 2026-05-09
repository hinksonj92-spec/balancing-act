'use client';

import { useState, useEffect } from 'react';
import { getMockHeatmapData, getMockDashboardData } from '@/lib/mockData';
import { useAuth } from '@/lib/AuthContext';
import { fetchHeatmapData, fetchDashboardData } from '@/lib/supabaseData';
import { supabase } from '@/lib/supabase';
import { CATEGORY_COLOR_MAP } from '@/lib/types';
import type { CategoryWithScore, DashboardData } from '@/lib/types';

type TabId = 'trends' | 'weekly' | 'monthly';

// ---- Types for summary data ----

interface WeeklyData {
  overallScore: number;
  categoryScores: { name: string; score: number; priorScore: number; color: string }[];
  improvements: { name: string; delta: number; color: string }[];
  declines: { name: string; delta: number; color: string }[];
  streaks: { name: string; days: number; color: string; maintained: boolean }[];
}

interface MonthlyData {
  currentMonth: string;
  priorMonth: string;
  overallCurrent: number;
  overallPrior: number;
  categoryBreakdown: { name: string; current: number; prior: number; delta: number; color: string }[];
  goalProgress: { name: string; progressPct: number; categoryColor: string }[];
  trendScores: { label: string; score: number }[]; // last 6 months
}

// ---- Helper: date math ----

function getWeekRange(weeksAgo: number): { start: string; end: string; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - dayOfWeek - weeksAgo * 7);
  const endOfWeek = new Date(startOfThisWeek);
  endOfWeek.setDate(startOfThisWeek.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const shortFmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return {
    start: fmt(startOfThisWeek),
    end: fmt(endOfWeek),
    label: `${shortFmt(startOfThisWeek)} – ${shortFmt(endOfWeek)}`,
  };
}

function getMonthPeriod(monthsAgo: number): { period: string; label: string; start: string; end: string } {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const period = `${year}-${String(month).padStart(2, '0')}`;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    period,
    label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    start: `${period}-01`,
    end: `${period}-${String(lastDay).padStart(2, '0')}`,
  };
}

// ---- Build weekly data from dashboard (mock-compatible) + Supabase ----

async function fetchWeeklyData(userId: string | null, dashboard: DashboardData): Promise<WeeklyData> {
  const thisWeek = getWeekRange(0);
  const lastWeek = getWeekRange(1);
  const categories = dashboard.categories;

  if (!userId) {
    // Mock mode: derive from dashboard data with slight variation for prior week
    const categoryScores = categories.map(cat => {
      const priorScore = Math.max(0, Math.min(1, cat.current_score + (cat.trend_delta || 0) * -1));
      return { name: cat.name, score: cat.current_score, priorScore, color: cat.color || CATEGORY_COLOR_MAP[cat.name] || '#C49A6C' };
    });
    const sorted = [...categoryScores].sort((a, b) => (b.score - b.priorScore) - (a.score - a.priorScore));
    const improvements = sorted.filter(c => c.score > c.priorScore).slice(0, 3).map(c => ({ name: c.name, delta: c.score - c.priorScore, color: c.color }));
    const declines = sorted.filter(c => c.score < c.priorScore).reverse().slice(0, 3).map(c => ({ name: c.name, delta: c.score - c.priorScore, color: c.color }));
    const overallScore = categories.reduce((s, c) => s + c.current_score * c.weight, 0) / categories.reduce((s, c) => s + c.weight, 0);
    const streaks = categories.map(c => ({
      name: c.name,
      days: c.streak_days,
      color: c.color || CATEGORY_COLOR_MAP[c.name] || '#C49A6C',
      maintained: c.streak_days > 3,
    }));
    return { overallScore, categoryScores, improvements, declines, streaks };
  }

  // Real Supabase mode: compute weekly averages per category
  try {
    const { data: cats } = await supabase
      .from('categories').select('id, name, color, weight')
      .eq('user_id', userId).eq('is_active', true).order('display_order');

    if (!cats || cats.length === 0) return { overallScore: 0, categoryScores: [], improvements: [], declines: [], streaks: [] };

    const { data: metrics } = await supabase
      .from('metrics').select('id, category_id, weight')
      .eq('user_id', userId).eq('is_active', true);

    if (!metrics) return { overallScore: 0, categoryScores: [], improvements: [], declines: [], streaks: [] };

    // This week entries
    const { data: thisEntries } = await supabase
      .from('metric_entries').select('metric_id, normalized_value')
      .eq('user_id', userId)
      .gte('entry_date', thisWeek.start).lte('entry_date', thisWeek.end);

    // Last week entries
    const { data: lastEntries } = await supabase
      .from('metric_entries').select('metric_id, normalized_value')
      .eq('user_id', userId)
      .gte('entry_date', lastWeek.start).lte('entry_date', lastWeek.end);

    function avgByCategory(entries: typeof thisEntries, catId: string): number {
      if (!entries) return 0;
      const catMetrics = metrics!.filter(m => m.category_id === catId);
      const catMetricIds = new Set(catMetrics.map(m => m.id));
      const relevant = entries.filter(e => catMetricIds.has(e.metric_id));
      if (relevant.length === 0) return 0;
      return relevant.reduce((s, e) => s + Number(e.normalized_value), 0) / relevant.length;
    }

    const categoryScores = cats.map(cat => {
      const score = avgByCategory(thisEntries, cat.id);
      const priorScore = avgByCategory(lastEntries, cat.id);
      return { name: cat.name, score, priorScore, color: cat.color || CATEGORY_COLOR_MAP[cat.name] || '#C49A6C' };
    });

    const totalWeight = cats.reduce((s, c) => s + Number(c.weight), 0);
    const overallScore = totalWeight > 0
      ? categoryScores.reduce((s, cs, i) => s + cs.score * Number(cats[i].weight), 0) / totalWeight
      : 0;

    const sorted = [...categoryScores].sort((a, b) => (b.score - b.priorScore) - (a.score - a.priorScore));
    const improvements = sorted.filter(c => c.score > c.priorScore).slice(0, 3).map(c => ({ name: c.name, delta: c.score - c.priorScore, color: c.color }));
    const declines = sorted.filter(c => c.score < c.priorScore).reverse().slice(0, 3).map(c => ({ name: c.name, delta: c.score - c.priorScore, color: c.color }));

    // Streaks from dashboard data (already computed)
    const streaks = dashboard.categories.map(c => ({
      name: c.name,
      days: c.streak_days,
      color: c.color || CATEGORY_COLOR_MAP[c.name] || '#C49A6C',
      maintained: c.streak_days >= 7,
    }));

    return { overallScore, categoryScores, improvements, declines, streaks };
  } catch {
    // Fallback to mock-derived
    const categoryScores = categories.map(cat => ({
      name: cat.name, score: cat.current_score,
      priorScore: Math.max(0, Math.min(1, cat.current_score + (cat.trend_delta || 0) * -1)),
      color: cat.color || CATEGORY_COLOR_MAP[cat.name] || '#C49A6C',
    }));
    const overallScore = categories.reduce((s, c) => s + c.current_score * c.weight, 0) / categories.reduce((s, c) => s + c.weight, 0);
    return { overallScore, categoryScores, improvements: [], declines: [], streaks: [] };
  }
}

async function fetchMonthlyData(userId: string | null, dashboard: DashboardData): Promise<MonthlyData> {
  const current = getMonthPeriod(0);
  const prior = getMonthPeriod(1);
  const categories = dashboard.categories;

  // Build 6-month trend from monthly_scores (last 6 of 12)
  const monthLabels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthLabels.push(d.toLocaleDateString('en-US', { month: 'short' }));
  }

  if (!userId) {
    // Mock mode
    const categoryBreakdown = categories.map(cat => {
      const cur = cat.current_score;
      const pr = Math.max(0, Math.min(1, cur + (cat.trend_delta || 0) * -1));
      return { name: cat.name, current: cur, prior: pr, delta: cur - pr, color: cat.color || CATEGORY_COLOR_MAP[cat.name] || '#C49A6C' };
    });
    const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
    const overallCurrent = totalWeight > 0 ? categories.reduce((s, c) => s + c.current_score * c.weight, 0) / totalWeight : 0;
    const overallPrior = totalWeight > 0 ? categoryBreakdown.reduce((s, c, i) => s + c.prior * categories[i].weight, 0) / totalWeight : 0;

    // Trend from monthly_scores
    const trendScores = monthLabels.map((label, i) => {
      const monthIdx = 6 + i; // last 6 of 12
      const catScores = categories.map(c => c.monthly_scores[monthIdx] || 0);
      const weights = categories.map(c => c.weight);
      const tw = weights.reduce((a, b) => a + b, 0);
      const avg = tw > 0 ? catScores.reduce((s, sc, j) => s + sc * weights[j], 0) / tw : 0;
      return { label, score: avg };
    });

    return {
      currentMonth: current.label, priorMonth: prior.label,
      overallCurrent, overallPrior, categoryBreakdown,
      goalProgress: [], trendScores,
    };
  }

  try {
    const { data: cats } = await supabase
      .from('categories').select('id, name, color, weight')
      .eq('user_id', userId).eq('is_active', true).order('display_order');

    if (!cats || cats.length === 0) return {
      currentMonth: current.label, priorMonth: prior.label,
      overallCurrent: 0, overallPrior: 0, categoryBreakdown: [], goalProgress: [], trendScores: [],
    };

    // Get snapshots for current and prior month
    const { data: snapshots } = await supabase
      .from('category_snapshots')
      .select('category_id, period_label, weighted_score')
      .eq('user_id', userId).eq('period_type', 'monthly')
      .in('period_label', [current.period, prior.period]);

    const snapshotMap = new Map<string, number>();
    if (snapshots) {
      for (const s of snapshots) {
        snapshotMap.set(`${s.category_id}_${s.period_label}`, Number(s.weighted_score));
      }
    }

    const categoryBreakdown = cats.map(cat => {
      const cur = snapshotMap.get(`${cat.id}_${current.period}`) ??
        (dashboard.categories.find(c => c.name === cat.name)?.current_score || 0);
      const pr = snapshotMap.get(`${cat.id}_${prior.period}`) ?? 0;
      return {
        name: cat.name, current: cur, prior: pr, delta: cur - pr,
        color: cat.color || CATEGORY_COLOR_MAP[cat.name] || '#C49A6C',
      };
    });

    const totalWeight = cats.reduce((s, c) => s + Number(c.weight), 0);
    const overallCurrent = totalWeight > 0
      ? categoryBreakdown.reduce((s, c, i) => s + c.current * Number(cats[i].weight), 0) / totalWeight : 0;
    const overallPrior = totalWeight > 0
      ? categoryBreakdown.reduce((s, c, i) => s + c.prior * Number(cats[i].weight), 0) / totalWeight : 0;

    // 6-month trend from snapshots
    const trendPeriods: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      trendPeriods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const { data: trendSnapshots } = await supabase
      .from('category_snapshots')
      .select('category_id, period_label, weighted_score')
      .eq('user_id', userId).eq('period_type', 'monthly')
      .in('period_label', trendPeriods);

    const trendScores = trendPeriods.map((period, i) => {
      let weightedSum = 0;
      let tw = 0;
      for (const cat of cats) {
        const snap = trendSnapshots?.find(s => s.category_id === cat.id && s.period_label === period);
        const score = snap ? Number(snap.weighted_score) : 0;
        weightedSum += score * Number(cat.weight);
        tw += Number(cat.weight);
      }
      return { label: monthLabels[i], score: tw > 0 ? weightedSum / tw : 0 };
    });

    // Goal progress
    const { data: goals } = await supabase
      .from('life_goals').select('name, progress_pct, category_id')
      .eq('user_id', userId).eq('is_completed', false).limit(6);

    const goalProgress = (goals || []).map(g => {
      const cat = cats.find(c => c.id === g.category_id);
      return {
        name: g.name,
        progressPct: Number(g.progress_pct),
        categoryColor: cat?.color || '#C49A6C',
      };
    });

    return {
      currentMonth: current.label, priorMonth: prior.label,
      overallCurrent, overallPrior, categoryBreakdown,
      goalProgress, trendScores,
    };
  } catch {
    // Fallback
    const trendScores = monthLabels.map((label, i) => {
      const monthIdx = 6 + i;
      const catScores = categories.map(c => c.monthly_scores[monthIdx] || 0);
      const weights = categories.map(c => c.weight);
      const tw = weights.reduce((a, b) => a + b, 0);
      const avg = tw > 0 ? catScores.reduce((s, sc, j) => s + sc * weights[j], 0) / tw : 0;
      return { label, score: avg };
    });
    return {
      currentMonth: current.label, priorMonth: prior.label,
      overallCurrent: dashboard.overall_score, overallPrior: 0,
      categoryBreakdown: [], goalProgress: [], trendScores,
    };
  }
}

// ============================================================
// Main Page Component
// ============================================================

export default function HistoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('trends');
  const [heatmapData, setHeatmapData] = useState<{ month: string; scores: Record<string, number> }[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState(() => getMockDashboardData());
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const categories = Object.keys(CATEGORY_COLOR_MAP);

  useEffect(() => {
    if (user?.id) {
      fetchHeatmapData(user.id, selectedYear)
        .then(setHeatmapData)
        .catch(() => setHeatmapData(getMockHeatmapData()));
    } else {
      setHeatmapData(getMockHeatmapData());
    }
  }, [user, selectedYear]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData(user.id)
        .then(setDashboard)
        .catch(() => setDashboard(getMockDashboardData()));
    } else {
      setDashboard(getMockDashboardData());
    }
  }, [user]);

  // Fetch weekly data when tab changes
  useEffect(() => {
    if (activeTab === 'weekly' && !weeklyData && !loadingWeekly) {
      setLoadingWeekly(true);
      fetchWeeklyData(user?.id || null, dashboard)
        .then(setWeeklyData)
        .finally(() => setLoadingWeekly(false));
    }
  }, [activeTab, user, dashboard, weeklyData, loadingWeekly]);

  // Fetch monthly data when tab changes
  useEffect(() => {
    if (activeTab === 'monthly' && !monthlyData && !loadingMonthly) {
      setLoadingMonthly(true);
      fetchMonthlyData(user?.id || null, dashboard)
        .then(setMonthlyData)
        .finally(() => setLoadingMonthly(false));
    }
  }, [activeTab, user, dashboard, monthlyData, loadingMonthly]);

  // Re-fetch when dashboard updates
  useEffect(() => {
    setWeeklyData(null);
    setMonthlyData(null);
  }, [dashboard]);

  const selectedCatData = selectedCategory
    ? dashboard.categories.find(c => c.name === selectedCategory)
    : null;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'trends', label: 'Trends' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>History</h1>
          <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>
            {activeTab === 'trends' ? 'Year in Review' : activeTab === 'weekly' ? 'Weekly Summary' : 'Monthly Deep-Dive'}
          </p>
        </div>
        {activeTab === 'trends' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedYear(y => y - 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FFFFFF', color: '#6B6560', border: '1px solid #E8E3DD' }}
            >{'‹'}</button>
            <span className="text-sm font-semibold w-12 text-center" style={{ color: '#1C1A17' }}>{selectedYear}</span>
            <button
              onClick={() => setSelectedYear(y => y + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FFFFFF', color: '#6B6560', border: '1px solid #E8E3DD' }}
            >{'›'}</button>
          </div>
        )}
      </div>

      {/* Tab Selector */}
      <div className="flex rounded-xl p-1" style={{ backgroundColor: '#F0EDE8' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
            style={{
              backgroundColor: activeTab === tab.id ? '#FFFFFF' : 'transparent',
              color: activeTab === tab.id ? '#1C1A17' : '#9A938B',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'trends' && (
        <TrendsTab
          heatmapData={heatmapData}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedCatData={selectedCatData}
          selectedYear={selectedYear}
        />
      )}

      {activeTab === 'weekly' && (
        <WeeklyTab data={weeklyData} loading={loadingWeekly} />
      )}

      {activeTab === 'monthly' && (
        <MonthlyTab data={monthlyData} loading={loadingMonthly} />
      )}
    </div>
  );
}

// ============================================================
// Trends Tab (existing content)
// ============================================================

function TrendsTab({
  heatmapData, categories, selectedCategory, setSelectedCategory, selectedCatData, selectedYear,
}: {
  heatmapData: { month: string; scores: Record<string, number> }[];
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (c: string | null) => void;
  selectedCatData: CategoryWithScore | null | undefined;
  selectedYear: number;
}) {
  return (
    <>
      {/* Year Heatmap */}
      <div className="rounded-card p-4 overflow-x-auto" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-xs font-medium mb-3" style={{ color: '#6B6560' }}>Score Heatmap</p>
        <div>
          {/* Month headers */}
          <div className="flex">
            <div className="w-24 flex-shrink-0" />
            {heatmapData.map(d => (
              <div key={d.month} className="flex-1 text-center text-[9px] pb-1" style={{ color: '#9A938B' }}>
                {d.month}
              </div>
            ))}
          </div>

          {/* Category rows */}
          {categories.map(catName => (
            <div
              key={catName}
              className="flex items-center cursor-pointer rounded transition-colors"
              style={{
                backgroundColor: selectedCategory === catName ? 'rgba(240, 237, 232, 0.8)' : 'transparent',
              }}
              onClick={() => setSelectedCategory(selectedCategory === catName ? null : catName)}
            >
              <div className="w-24 flex-shrink-0 pr-2 py-0.5">
                <span className="text-[10px] font-medium truncate" style={{ color: CATEGORY_COLOR_MAP[catName] }}>
                  {catName}
                </span>
              </div>
              {heatmapData.map(d => {
                const score = d.scores[catName] || 0;
                const color = CATEGORY_COLOR_MAP[catName];
                return (
                  <div key={d.month} className="flex-1 p-0.5">
                    <div
                      className="w-full aspect-square rounded-sm transition-opacity"
                      style={{
                        backgroundColor: color,
                        opacity: 0.12 + score * 0.88,
                      }}
                      title={`${catName} - ${d.month}: ${Math.round(score * 100)}%`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-3">
          <span className="text-[9px]" style={{ color: '#C5BFB8' }}>Low</span>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map(opacity => (
            <div
              key={opacity}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: '#C49A6C', opacity }}
            />
          ))}
          <span className="text-[9px]" style={{ color: '#C5BFB8' }}>High</span>
        </div>
      </div>

      {/* Category Trend Detail */}
      {selectedCatData && (
        <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: selectedCatData.color || '#C49A6C' }}
            />
            <h3 className="text-sm font-semibold" style={{ color: '#1C1A17' }}>{selectedCatData.name} — 12-Month Trend</h3>
          </div>

          <TrendChart
            data={selectedCatData.monthly_scores}
            color={selectedCatData.color || '#C49A6C'}
          />

          <div className="flex items-center justify-between mt-3">
            <div>
              <span className="text-xs" style={{ color: '#9A938B' }}>Current</span>
              <span className="text-sm font-bold ml-2" style={{ color: '#1C1A17' }}>
                {Math.round(selectedCatData.current_score * 100)}%
              </span>
            </div>
            <div>
              <span className="text-xs" style={{ color: '#9A938B' }}>Avg</span>
              <span className="text-sm font-medium ml-2" style={{ color: '#6B6560' }}>
                {Math.round(selectedCatData.monthly_scores.reduce((a, b) => a + b, 0) / selectedCatData.monthly_scores.length * 100)}%
              </span>
            </div>
            <div>
              <span className="text-xs" style={{ color: '#9A938B' }}>Best</span>
              <span className="text-sm font-medium ml-2" style={{ color: '#7BAF7E' }}>
                {Math.round(Math.max(...selectedCatData.monthly_scores) * 100)}%
              </span>
            </div>
            <div>
              <span className="text-xs" style={{ color: '#9A938B' }}>Streak</span>
              <span className="text-sm font-medium ml-2" style={{ color: '#C49A6C' }}>
                {selectedCatData.streak_days}d
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Year-over-Year */}
      <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: '#6B6560' }}>Year-over-Year</h3>
        <p className="text-xs" style={{ color: '#C5BFB8' }}>
          Compare {selectedYear} vs {selectedYear - 1} — available once you have data from multiple years.
        </p>
      </div>
    </>
  );
}

// ============================================================
// Weekly Summary Tab
// ============================================================

function WeeklyTab({ data, loading }: { data: WeeklyData | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#E8E3DD', borderTopColor: '#C49A6C' }} />
      </div>
    );
  }

  const weekLabel = getWeekRange(0).label;

  return (
    <>
      {/* Overall Score Card */}
      <div className="rounded-card p-5 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: '#9A938B' }}>Week of {weekLabel}</p>
        <div className="text-4xl font-bold" style={{ color: '#1C1A17' }}>
          {Math.round(data.overallScore * 100)}
          <span className="text-lg font-normal" style={{ color: '#9A938B' }}>%</span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#9A938B' }}>Overall Score</p>
      </div>

      {/* Category Scores Bar Chart */}
      <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-xs font-semibold mb-4" style={{ color: '#6B6560' }}>Category Scores</p>
        <div className="space-y-3">
          {data.categoryScores.map(cat => {
            const delta = cat.score - cat.priorScore;
            const trendArrow = delta > 0.02 ? '↑' : delta < -0.02 ? '↓' : '→';
            const trendColor = delta > 0.02 ? '#7BAF7E' : delta < -0.02 ? '#C47060' : '#9A938B';
            return (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium" style={{ color: cat.color }}>{cat.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: '#1C1A17' }}>{Math.round(cat.score * 100)}%</span>
                    <span className="text-[10px] font-semibold" style={{ color: trendColor }}>
                      {trendArrow} {delta !== 0 ? `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}` : ''}
                    </span>
                  </div>
                </div>
                {/* Bar */}
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round(cat.score * 100)}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* SVG Bar Chart */}
        <div className="mt-5">
          <CategoryBarChart scores={data.categoryScores} />
        </div>
      </div>

      {/* Top Improvements & Declines */}
      <div className="grid grid-cols-2 gap-3">
        {/* Improvements */}
        <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#7BAF7E' }}>Top Improvements</p>
          {data.improvements.length === 0 ? (
            <p className="text-[10px]" style={{ color: '#C5BFB8' }}>No improvements this week</p>
          ) : (
            <div className="space-y-2">
              {data.improvements.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold" style={{ color: '#7BAF7E' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate" style={{ color: '#1C1A17' }}>{item.name}</p>
                    <p className="text-[9px]" style={{ color: '#7BAF7E' }}>+{Math.round(item.delta * 100)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Declines */}
        <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#C47060' }}>Needs Attention</p>
          {data.declines.length === 0 ? (
            <p className="text-[10px]" style={{ color: '#C5BFB8' }}>No declines this week</p>
          ) : (
            <div className="space-y-2">
              {data.declines.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold" style={{ color: '#C47060' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate" style={{ color: '#1C1A17' }}>{item.name}</p>
                    <p className="text-[9px]" style={{ color: '#C47060' }}>{Math.round(item.delta * 100)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Streaks */}
      <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: '#6B6560' }}>Streaks</p>
        <div className="grid grid-cols-2 gap-2">
          {data.streaks.map(s => (
            <div
              key={s.name}
              className="flex items-center gap-2 p-3 rounded-lg"
              style={{ backgroundColor: s.maintained ? 'rgba(123, 175, 126, 0.06)' : 'rgba(196, 112, 96, 0.06)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate" style={{ color: '#1C1A17' }}>{s.name}</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold" style={{ color: s.maintained ? '#7BAF7E' : '#C47060' }}>
                  {s.days}d
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ============================================================
// Monthly Deep-Dive Tab
// ============================================================

function MonthlyTab({ data, loading }: { data: MonthlyData | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#E8E3DD', borderTopColor: '#C49A6C' }} />
      </div>
    );
  }

  const overallDelta = data.overallCurrent - data.overallPrior;

  return (
    <>
      {/* Month-over-Month Comparison */}
      <div className="rounded-card p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#9A938B' }}>Month-over-Month</p>
        <div className="flex items-end justify-center gap-8">
          {/* Prior Month */}
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: '#9A938B' }}>
              {Math.round(data.overallPrior * 100)}%
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: '#C5BFB8' }}>{data.priorMonth}</p>
          </div>
          {/* Arrow */}
          <div className="pb-2">
            <span className="text-lg" style={{ color: overallDelta > 0 ? '#7BAF7E' : overallDelta < 0 ? '#C47060' : '#9A938B' }}>
              {overallDelta > 0 ? '→' : overallDelta < 0 ? '→' : '='}
            </span>
          </div>
          {/* Current Month */}
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: '#1C1A17' }}>
              {Math.round(data.overallCurrent * 100)}%
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: '#9A938B' }}>{data.currentMonth}</p>
          </div>
        </div>
        {overallDelta !== 0 && (
          <div className="text-center mt-2">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: overallDelta > 0 ? 'rgba(123, 175, 126, 0.1)' : 'rgba(196, 112, 96, 0.1)',
                color: overallDelta > 0 ? '#7BAF7E' : '#C47060',
              }}
            >
              {overallDelta > 0 ? '+' : ''}{Math.round(overallDelta * 100)} points
            </span>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: '#6B6560' }}>Category Breakdown</p>
        <div className="space-y-2">
          {data.categoryBreakdown.map(cat => {
            const deltaColor = cat.delta > 0.02 ? '#7BAF7E' : cat.delta < -0.02 ? '#C47060' : '#9A938B';
            return (
              <div key={cat.name} className="flex items-center gap-3 py-1.5" style={{ borderBottom: '1px solid #F0EDE8' }}>
                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: cat.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium" style={{ color: '#1C1A17' }}>{cat.name}</p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="text-[10px]" style={{ color: '#C5BFB8' }}>{Math.round(cat.prior * 100)}%</span>
                  <span className="text-[10px]" style={{ color: '#9A938B' }}>{'→'}</span>
                  <span className="text-[11px] font-semibold" style={{ color: '#1C1A17' }}>{Math.round(cat.current * 100)}%</span>
                  <span
                    className="text-[10px] font-semibold min-w-[36px] text-right"
                    style={{ color: deltaColor }}
                  >
                    {cat.delta > 0 ? '+' : ''}{Math.round(cat.delta * 100)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6-Month Trend Chart */}
      <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: '#6B6560' }}>6-Month Overall Trend</p>
        <MonthlyTrendChart data={data.trendScores} />
        <div className="flex justify-between mt-2">
          {data.trendScores.map(ts => (
            <span key={ts.label} className="text-[9px]" style={{ color: '#9A938B' }}>{ts.label}</span>
          ))}
        </div>
      </div>

      {/* Goal Progress */}
      {data.goalProgress.length > 0 && (
        <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#6B6560' }}>Goal Progress</p>
          <div className="space-y-3">
            {data.goalProgress.map(goal => (
              <div key={goal.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium" style={{ color: '#1C1A17' }}>{goal.name}</span>
                  <span className="text-[10px] font-semibold" style={{ color: goal.categoryColor }}>{goal.progressPct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${goal.progressPct}%`, backgroundColor: goal.categoryColor }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder for more data */}
      {data.goalProgress.length === 0 && (
        <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#6B6560' }}>Goal Progress</p>
          <p className="text-[10px]" style={{ color: '#C5BFB8' }}>
            Set life goals to track your progress here.
          </p>
        </div>
      )}
    </>
  );
}

// ============================================================
// Shared chart components
// ============================================================

function TrendChart({ data, color }: { data: number[]; color: string }) {
  const width = 300;
  const height = 80;
  const padding = 4;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 0.1;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <path d={areaPath} fill={color} opacity={0.08} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}
    </svg>
  );
}

function CategoryBarChart({ scores }: { scores: { name: string; score: number; priorScore: number; color: string }[] }) {
  const width = 320;
  const height = 140;
  const barWidth = 28;
  const gap = (width - scores.length * barWidth * 2) / (scores.length + 1);
  const chartTop = 10;
  const chartBottom = height - 20;
  const chartHeight = chartBottom - chartTop;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {scores.map((cat, i) => {
        const groupX = gap + i * (barWidth * 2 + gap);
        const priorH = cat.priorScore * chartHeight;
        const currentH = cat.score * chartHeight;
        return (
          <g key={cat.name}>
            {/* Prior week bar (muted) */}
            <rect
              x={groupX}
              y={chartBottom - priorH}
              width={barWidth - 2}
              height={priorH}
              rx={3}
              fill={cat.color}
              opacity={0.25}
            />
            {/* Current week bar */}
            <rect
              x={groupX + barWidth}
              y={chartBottom - currentH}
              width={barWidth - 2}
              height={currentH}
              rx={3}
              fill={cat.color}
              opacity={0.85}
            />
            {/* Label */}
            <text
              x={groupX + barWidth - 1}
              y={height - 4}
              textAnchor="middle"
              fontSize="7"
              fill="#9A938B"
            >
              {cat.name.slice(0, 4)}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={width - 80} y={2} width={8} height={8} rx={2} fill="#C49A6C" opacity={0.25} />
      <text x={width - 68} y={9} fontSize="7" fill="#9A938B">Prior</text>
      <rect x={width - 42} y={2} width={8} height={8} rx={2} fill="#C49A6C" opacity={0.85} />
      <text x={width - 30} y={9} fontSize="7" fill="#9A938B">Current</text>
    </svg>
  );
}

function MonthlyTrendChart({ data }: { data: { label: string; score: number }[] }) {
  if (data.length === 0) return null;

  const width = 300;
  const height = 100;
  const padding = 16;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxScore = Math.max(...data.map(d => d.score), 0.01);
  const minScore = Math.min(...data.map(d => d.score));
  const range = maxScore - minScore || 0.1;

  const points = data.map((d, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding + (1 - (d.score - minScore) / range) * chartHeight,
    score: d.score,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C49A6C" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#C49A6C" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#trendGrad)" />
      <path d={linePath} fill="none" stroke="#C49A6C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#FFFFFF" stroke="#C49A6C" strokeWidth="2" />
          <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="8" fill="#6B6560" fontWeight="600">
            {Math.round(p.score * 100)}%
          </text>
        </g>
      ))}
    </svg>
  );
}
