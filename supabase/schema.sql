-- ============================================================
-- Balancing Act — Complete Database Schema
-- Run this in your Supabase SQL editor to create all tables
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- Enum Types ----

CREATE TYPE measurement_type AS ENUM ('binary', 'scale', 'count', 'percentage', 'currency', 'target');
CREATE TYPE measurement_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'biannual', 'annual', 'one_time');
CREATE TYPE polarity AS ENUM ('positive', 'negative');
CREATE TYPE metric_tier AS ENUM ('monthly', 'yearly', 'life');
CREATE TYPE period_type AS ENUM ('daily', 'weekly', 'monthly', 'yearly', 'lifetime');
CREATE TYPE trend_direction AS ENUM ('improving', 'stable', 'declining');
CREATE TYPE entry_source AS ENUM ('chat', 'voice', 'manual', 'import', 'system');
CREATE TYPE session_type AS ENUM ('check_in', 'review', 'assessment', 'goal_management', 'query');
CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE display_format AS ENUM ('percentage', 'number', 'boolean', 'hours', 'currency');
CREATE TYPE time_horizon AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime');

-- ---- Tables ----

-- 1. Users (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Denver',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Categories (the 8 life pillars)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(5,4) NOT NULL CHECK (weight > 0),
  display_order INT NOT NULL,
  color TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Metrics (individual trackable items)
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  measurement_type measurement_type NOT NULL,
  measurement_frequency measurement_frequency NOT NULL,
  weight NUMERIC(5,4) NOT NULL CHECK (weight > 0),
  polarity polarity NOT NULL DEFAULT 'positive',
  scale_min NUMERIC DEFAULT 0,
  scale_max NUMERIC DEFAULT 1,
  display_format display_format DEFAULT 'percentage',
  is_active BOOLEAN DEFAULT true,
  tier metric_tier NOT NULL DEFAULT 'monthly',
  display_order INT NOT NULL,
  ai_extraction_hints TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Metric Entries (the raw data)
CREATE TABLE metric_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  normalized_value NUMERIC NOT NULL,
  entry_date DATE NOT NULL,
  entry_period TEXT,
  source entry_source DEFAULT 'chat',
  chat_message_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(metric_id, entry_date)
);

-- 5. Metric Goals
CREATE TABLE metric_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_horizon time_horizon NOT NULL,
  target_value NUMERIC NOT NULL,
  target_normalized NUMERIC NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Category Snapshots (pre-computed scores)
CREATE TABLE category_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type period_type NOT NULL,
  period_label TEXT NOT NULL,
  weighted_score NUMERIC(5,4) NOT NULL,
  metric_count INT NOT NULL,
  streak_days INT DEFAULT 0,
  trend_direction trend_direction,
  trend_delta NUMERIC(5,4),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, period_type, period_label)
);

-- 7. Balance Snapshots (overall composite score)
CREATE TABLE balance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type period_type NOT NULL,
  period_label TEXT NOT NULL,
  overall_score NUMERIC(5,4) NOT NULL,
  best_category_id UUID REFERENCES categories(id),
  worst_category_id UUID REFERENCES categories(id),
  balance_index NUMERIC(5,4),
  streak_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period_type, period_label)
);

-- 8. Life Goals
CREATE TABLE life_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  target_date DATE,
  progress_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Life Goal Notes
CREATE TABLE life_goal_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  life_goal_id UUID NOT NULL REFERENCES life_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  progress_pct_at_time NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Christlike Assessments
CREATE TABLE christlike_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  period_label TEXT NOT NULL,
  overall_real_average NUMERIC(3,2),
  overall_weighted_average NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Christlike Attributes
CREATE TABLE christlike_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  display_order INT NOT NULL,
  weight NUMERIC(5,4) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true
);

-- 12. Christlike Questions
CREATE TABLE christlike_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attribute_id UUID NOT NULL REFERENCES christlike_attributes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  scripture_ref TEXT,
  display_order INT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- 13. Christlike Responses
CREATE TABLE christlike_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES christlike_assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES christlike_questions(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC(3,2) NOT NULL CHECK (score >= 0 AND score <= 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Chat Sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type session_type DEFAULT 'check_in',
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metrics_updated INT DEFAULT 0
);

-- 15. Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role chat_role NOT NULL,
  content TEXT NOT NULL,
  audio_transcript TEXT,
  extracted_updates JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key for metric_entries.chat_message_id after chat_messages exists
ALTER TABLE metric_entries
  ADD CONSTRAINT fk_metric_entries_chat_message
  FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id);

-- ---- Indexes ----

CREATE INDEX idx_metric_entries_user_date ON metric_entries(user_id, entry_date DESC);
CREATE INDEX idx_metric_entries_metric_date ON metric_entries(metric_id, entry_date DESC);
CREATE INDEX idx_category_snapshots_lookup ON category_snapshots(user_id, period_type, period_label);
CREATE INDEX idx_balance_snapshots_lookup ON balance_snapshots(user_id, period_type, period_label);
CREATE INDEX idx_metrics_user_category ON metrics(user_id, category_id) WHERE is_active = true;
CREATE INDEX idx_metrics_hints ON metrics USING GIN(ai_extraction_hints) WHERE is_active = true;
CREATE INDEX idx_life_goals_user ON life_goals(user_id, category_id);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, started_at DESC);

-- ---- Row-Level Security ----

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_goal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE christlike_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE christlike_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE christlike_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE christlike_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users own data" ON users FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users own data" ON categories FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON metrics FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON metric_entries FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON metric_goals FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON category_snapshots FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON balance_snapshots FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON life_goals FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON life_goal_notes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON christlike_assessments FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON christlike_attributes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON christlike_responses FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON chat_sessions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own data" ON chat_messages FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Christlike questions are readable by the user who owns the attribute
CREATE POLICY "Users read own questions" ON christlike_questions FOR SELECT
  USING (attribute_id IN (SELECT id FROM christlike_attributes WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own questions" ON christlike_questions FOR ALL
  USING (attribute_id IN (SELECT id FROM christlike_attributes WHERE user_id = auth.uid()))
  WITH CHECK (attribute_id IN (SELECT id FROM christlike_attributes WHERE user_id = auth.uid()));

-- ---- Scoring Function ----
-- PostgreSQL function to recompute snapshots after entries are written

CREATE OR REPLACE FUNCTION recompute_category_snapshot(
  p_user_id UUID,
  p_category_id UUID,
  p_period_type period_type,
  p_period_label TEXT
) RETURNS VOID AS $$
DECLARE
  v_weighted_sum NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_metric_count INT := 0;
  v_score NUMERIC;
  v_prior_score NUMERIC;
  v_trend trend_direction;
  v_delta NUMERIC;
  rec RECORD;
BEGIN
  -- Compute weighted score from metric entries
  FOR rec IN
    SELECT m.weight, me.normalized_value
    FROM metrics m
    JOIN metric_entries me ON me.metric_id = m.id
    WHERE m.category_id = p_category_id
      AND m.user_id = p_user_id
      AND m.is_active = true
      AND me.entry_period = p_period_label
  LOOP
    v_weighted_sum := v_weighted_sum + (rec.normalized_value * rec.weight);
    v_total_weight := v_total_weight + rec.weight;
    v_metric_count := v_metric_count + 1;
  END LOOP;

  IF v_total_weight > 0 THEN
    v_score := v_weighted_sum / v_total_weight;
  ELSE
    v_score := 0;
  END IF;

  -- Get prior period score for trend
  SELECT weighted_score INTO v_prior_score
  FROM category_snapshots
  WHERE category_id = p_category_id
    AND user_id = p_user_id
    AND period_type = p_period_type
  ORDER BY created_at DESC
  OFFSET 1 LIMIT 1;

  IF v_prior_score IS NOT NULL THEN
    v_delta := v_score - v_prior_score;
    IF v_delta > 0.02 THEN v_trend := 'improving';
    ELSIF v_delta < -0.02 THEN v_trend := 'declining';
    ELSE v_trend := 'stable';
    END IF;
  ELSE
    v_delta := 0;
    v_trend := 'stable';
  END IF;

  -- Upsert snapshot
  INSERT INTO category_snapshots (category_id, user_id, period_type, period_label, weighted_score, metric_count, trend_direction, trend_delta)
  VALUES (p_category_id, p_user_id, p_period_type, p_period_label, v_score, v_metric_count, v_trend, v_delta)
  ON CONFLICT (category_id, period_type, period_label)
  DO UPDATE SET
    weighted_score = EXCLUDED.weighted_score,
    metric_count = EXCLUDED.metric_count,
    trend_direction = EXCLUDED.trend_direction,
    trend_delta = EXCLUDED.trend_delta,
    created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---- Auto-create user profile on signup ----

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
