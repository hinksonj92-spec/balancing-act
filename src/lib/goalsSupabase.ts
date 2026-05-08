// ============================================================
// Goals Supabase Data Layer
// CRUD operations for goals and check-offs in Supabase
// Used by goalsStore.ts as a write-through layer
// ============================================================

import { supabase } from '@/lib/supabase';
import type { StoredGoal, GoalHorizon, CheckOffRecord } from '@/lib/goalsStore';

// ---- Fetch all goals for a user ----

export async function fetchGoals(userId: string): Promise<StoredGoal[]> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('[goalsSupabase] fetchGoals error:', error?.message);
    return [];
  }

  return data.map(row => ({
    id: row.id,
    name: row.name,
    category_name: row.category_name,
    category_color: row.category_color,
    horizon: row.horizon as GoalHorizon,
    is_completed: row.is_completed ?? false,
    completed_at: row.completed_at ?? null,
    progress_pct: Number(row.progress_pct) || 0,
    target_date: row.target_date ?? null,
    description: row.description ?? null,
    weight: Number(row.weight) || 0,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  }));
}

// ---- Upsert a single goal ----

export async function upsertGoal(userId: string, goal: StoredGoal): Promise<void> {
  const { error } = await supabase
    .from('user_goals')
    .upsert(
      {
        id: goal.id,
        user_id: userId,
        name: goal.name,
        category_name: goal.category_name,
        category_color: goal.category_color,
        horizon: goal.horizon,
        is_completed: goal.is_completed,
        completed_at: goal.completed_at,
        progress_pct: goal.progress_pct,
        target_date: goal.target_date,
        description: goal.description,
        weight: goal.weight,
        created_at: goal.created_at,
        updated_at: goal.updated_at,
      },
      { onConflict: 'id' },
    );

  if (error) {
    console.error('[goalsSupabase] upsertGoal error:', error.message);
  }
}

// ---- Delete a goal ----

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const { error } = await supabase
    .from('user_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', userId);

  if (error) {
    console.error('[goalsSupabase] deleteGoal error:', error.message);
  }
}

// ---- Fetch check-offs for current period ----

export async function fetchCheckOffs(userId: string, horizon: GoalHorizon): Promise<CheckOffRecord[]> {
  // We fetch all check-offs for the user — filtering by period can happen client-side
  // This keeps it simple and allows the store to merge properly
  const { data, error } = await supabase
    .from('goal_check_offs')
    .select('goal_id, period_key, checked, checked_at')
    .eq('user_id', userId);

  if (error || !data) {
    console.error('[goalsSupabase] fetchCheckOffs error:', error?.message);
    return [];
  }

  return data.map(row => ({
    goal_id: row.goal_id,
    period_key: row.period_key,
    checked: row.checked ?? false,
    checked_at: row.checked_at ?? new Date().toISOString(),
  }));
}

// ---- Upsert a check-off record ----

export async function upsertCheckOff(userId: string, record: CheckOffRecord): Promise<void> {
  const { error } = await supabase
    .from('goal_check_offs')
    .upsert(
      {
        user_id: userId,
        goal_id: record.goal_id,
        period_key: record.period_key,
        checked: record.checked,
        checked_at: record.checked_at,
      },
      { onConflict: 'user_id,goal_id,period_key' },
    );

  if (error) {
    console.error('[goalsSupabase] upsertCheckOff error:', error.message);
  }
}

// ---- Bulk sync from localStorage to Supabase (initial migration) ----

export async function syncGoalsToSupabase(userId: string, goals: StoredGoal[]): Promise<void> {
  if (goals.length === 0) return;

  const rows = goals.map(goal => ({
    id: goal.id,
    user_id: userId,
    name: goal.name,
    category_name: goal.category_name,
    category_color: goal.category_color,
    horizon: goal.horizon,
    is_completed: goal.is_completed,
    completed_at: goal.completed_at,
    progress_pct: goal.progress_pct,
    target_date: goal.target_date,
    description: goal.description,
    weight: goal.weight,
    created_at: goal.created_at,
    updated_at: goal.updated_at,
  }));

  // Upsert in batches of 50 to avoid payload limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('user_goals')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`[goalsSupabase] syncGoalsToSupabase batch ${i} error:`, error.message);
    }
  }
}
