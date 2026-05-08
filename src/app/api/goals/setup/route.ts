import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const SETUP_SQL = `
-- ============================================================
-- user_goals — stores all goals for authenticated users
-- ============================================================
CREATE TABLE IF NOT EXISTS user_goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  category_color TEXT NOT NULL DEFAULT '#6B6560',
  horizon TEXT NOT NULL DEFAULT 'lifetime',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  progress_pct NUMERIC NOT NULL DEFAULT 0,
  target_date DATE,
  description TEXT,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);

-- RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_goals' AND policyname = 'user_goals_own_rows'
  ) THEN
    CREATE POLICY user_goals_own_rows ON user_goals
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- goal_check_offs — recurring goal check-off tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS goal_check_offs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_id, period_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_goal_check_offs_user_id ON goal_check_offs(user_id);

-- RLS
ALTER TABLE goal_check_offs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'goal_check_offs' AND policyname = 'goal_check_offs_own_rows'
  ) THEN
    CREATE POLICY goal_check_offs_own_rows ON goal_check_offs
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
`;

export async function POST() {
  try {
    const serviceClient = createServiceClient();

    const { error } = await serviceClient.rpc('exec_sql', { sql: SETUP_SQL });

    // If the rpc doesn't exist, fall back to running statements via rest
    if (error) {
      // Try running the SQL directly (requires the service role key)
      const { error: sqlError } = await serviceClient.from('_setup_goals').select('1').limit(0);

      // The rpc approach failed — try the raw SQL endpoint
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

      if (!supabaseUrl || !serviceKey) {
        return NextResponse.json(
          { success: false, error: 'Missing Supabase configuration' },
          { status: 500 },
        );
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ sql: SETUP_SQL }),
      });

      if (!res.ok) {
        // As a final fallback, just report and suggest running SQL manually
        console.warn('[goals/setup] Could not run SQL automatically. Run the SQL in Supabase Dashboard SQL editor.');
        return NextResponse.json({
          success: false,
          error: 'Could not execute SQL automatically. Please run the SQL in the Supabase Dashboard SQL editor.',
          sql: SETUP_SQL,
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[goals/setup] Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
