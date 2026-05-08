import { supabase } from '@/lib/supabase';
import { SEED_CATEGORIES, SEED_METRICS, SEED_LIFE_GOALS } from '@/lib/seedCatalog';

/**
 * Check whether a user has already been seeded by looking for existing categories.
 */
export async function checkUserSeeded(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    console.error('[seedSupabase] Error checking if user is seeded:', error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Seed a new user's Supabase data with default categories, metrics, and life goals.
 * Should only be called once per user (on first login).
 */
export async function seedUserData(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[seedSupabase] Starting seed for user:', userId);

  // ── Step 1: Insert categories ───────────────────────────────────────────
  const categoryRows = SEED_CATEGORIES.map((cat) => ({
    user_id: userId,
    name: cat.name,
    description: cat.description,
    weight: cat.weight,
    display_order: cat.display_order,
    color: cat.color,
    icon: cat.icon,
    is_active: true,
  }));

  const { data: insertedCategories, error: catError } = await supabase
    .from('categories')
    .insert(categoryRows)
    .select();

  if (catError || !insertedCategories) {
    const msg = catError?.message ?? 'No data returned from category insert';
    console.error('[seedSupabase] Category insert failed:', msg);
    return { success: false, error: `Category insert failed: ${msg}` };
  }

  console.log(
    `[seedSupabase] Inserted ${insertedCategories.length} categories`
  );

  // ── Step 2: Build name → id map ─────────────────────────────────────────
  const categoryMap = new Map<string, string>();
  for (const row of insertedCategories) {
    categoryMap.set(row.name, row.id);
  }

  // ── Step 3: Insert metrics ──────────────────────────────────────────────
  const metricRows = SEED_METRICS.map((m) => ({
    user_id: userId,
    category_id: categoryMap.get(m.category_name),
    name: m.name,
    measurement_type: m.measurement_type,
    measurement_frequency: m.measurement_frequency,
    weight: m.weight,
    polarity: m.polarity,
    tier: m.tier,
    display_order: m.display_order,
    display_format: m.display_format,
    ai_extraction_hints: m.ai_extraction_hints,
    scale_min: m.scale_min ?? null,
    scale_max: m.scale_max ?? null,
    is_active: true,
  }));

  const { data: insertedMetrics, error: metricError } = await supabase
    .from('metrics')
    .insert(metricRows)
    .select();

  if (metricError || !insertedMetrics) {
    const msg = metricError?.message ?? 'No data returned from metric insert';
    console.error('[seedSupabase] Metric insert failed:', msg);
    return { success: false, error: `Metric insert failed: ${msg}` };
  }

  console.log(
    `[seedSupabase] Inserted ${insertedMetrics.length} metrics`
  );

  // ── Step 4: Insert life goals ───────────────────────────────────────────
  const goalRows = SEED_LIFE_GOALS.map((g) => ({
    user_id: userId,
    category_id: categoryMap.get(g.category_name),
    name: g.name,
    weight: g.weight,
    is_completed: false,
    progress_pct: 0,
  }));

  const { data: insertedGoals, error: goalError } = await supabase
    .from('life_goals')
    .insert(goalRows)
    .select();

  if (goalError || !insertedGoals) {
    const msg = goalError?.message ?? 'No data returned from life goal insert';
    console.error('[seedSupabase] Life goal insert failed:', msg);
    return { success: false, error: `Life goal insert failed: ${msg}` };
  }

  console.log(
    `[seedSupabase] Inserted ${insertedGoals.length} life goals`
  );

  console.log('[seedSupabase] Seed complete for user:', userId);
  return { success: true };
}
