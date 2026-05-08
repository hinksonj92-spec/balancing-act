// ============================================================
// Balancing Act — TypeScript Type Definitions
// Maps 1:1 to the Supabase database schema from the PRD
// ============================================================

export type MeasurementType = 'binary' | 'scale' | 'count' | 'percentage' | 'currency' | 'target';
export type MeasurementFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'one_time';
export type Polarity = 'positive' | 'negative';
export type MetricTier = 'monthly' | 'yearly' | 'life';
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime';
export type TrendDirection = 'improving' | 'stable' | 'declining';
export type EntrySource = 'chat' | 'voice' | 'manual' | 'import' | 'system';
export type SessionType = 'check_in' | 'review' | 'assessment' | 'goal_management' | 'query';
export type ChatRole = 'user' | 'assistant' | 'system';
export type DisplayFormat = 'percentage' | 'number' | 'boolean' | 'hours' | 'currency';
export type TimeHorizon = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'lifetime';

// ---- Core entities ----

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  weight: number;
  display_order: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: string;
  category_id: string;
  user_id: string;
  name: string;
  description: string | null;
  measurement_type: MeasurementType;
  measurement_frequency: MeasurementFrequency;
  weight: number;
  polarity: Polarity;
  scale_min: number;
  scale_max: number;
  display_format: DisplayFormat;
  is_active: boolean;
  tier: MetricTier;
  display_order: number;
  ai_extraction_hints: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface MetricEntry {
  id: string;
  metric_id: string;
  user_id: string;
  value: number;
  normalized_value: number;
  entry_date: string;
  entry_period: string | null;
  source: EntrySource;
  chat_message_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface MetricGoal {
  id: string;
  metric_id: string;
  user_id: string;
  time_horizon: TimeHorizon;
  target_value: number;
  target_normalized: number;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

export interface CategorySnapshot {
  id: string;
  category_id: string;
  user_id: string;
  period_type: PeriodType;
  period_label: string;
  weighted_score: number;
  metric_count: number;
  streak_days: number;
  trend_direction: TrendDirection | null;
  trend_delta: number | null;
  created_at: string;
}

export interface BalanceSnapshot {
  id: string;
  user_id: string;
  period_type: PeriodType;
  period_label: string;
  overall_score: number;
  best_category_id: string | null;
  worst_category_id: string | null;
  balance_index: number | null;
  streak_days: number;
  created_at: string;
}

export interface LifeGoal {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  weight: number;
  is_completed: boolean;
  completed_at: string | null;
  target_date: string | null;
  progress_pct: number;
  created_at: string;
  updated_at: string;
}

export interface LifeGoalNote {
  id: string;
  life_goal_id: string;
  user_id: string;
  note: string;
  progress_pct_at_time: number | null;
  created_at: string;
}

export interface ChristlikeAssessment {
  id: string;
  user_id: string;
  assessment_date: string;
  period_label: string;
  overall_real_average: number | null;
  overall_weighted_average: number | null;
  created_at: string;
}

export interface ChristlikeAttribute {
  id: string;
  user_id: string;
  attribute_name: string;
  display_order: number;
  weight: number;
  is_active: boolean;
}

export interface ChristlikeQuestion {
  id: string;
  attribute_id: string;
  question_text: string;
  scripture_ref: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ChristlikeResponse {
  id: string;
  assessment_id: string;
  question_id: string;
  user_id: string;
  score: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  session_type: SessionType;
  started_at: string;
  ended_at: string | null;
  metrics_updated: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  audio_transcript: string | null;
  extracted_updates: ExtractedUpdate[] | null;
  created_at: string;
}

// ---- AI extraction types ----

export interface ExtractedUpdate {
  metric_id: string;
  metric_name: string;
  value: number;
  confidence: number;
  reasoning: string;
}

export interface FollowUpQuestion {
  question: string;
  related_metric_id: string;
  context: string;
}

export interface UnmatchedStatement {
  statement: string;
  suggestion: string;
}

export interface AIExtractionResult {
  updates: ExtractedUpdate[];
  follow_up_questions: FollowUpQuestion[];
  unmatched: UnmatchedStatement[];
}

// ---- Dashboard view types ----

export interface CategoryWithScore extends Category {
  current_score: number;
  trend_direction: TrendDirection | null;
  trend_delta: number | null;
  streak_days: number;
  monthly_scores: number[]; // last 12 months for sparkline
}

export interface DashboardData {
  overall_score: number;
  balance_index: number;
  overall_streak: number;
  categories: CategoryWithScore[];
  today_updated_categories: string[]; // category IDs
}

// ---- Default category configuration ----

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Spiritual', description: 'Faith, worship, and spiritual growth', weight: 0.175, display_order: 1, color: '#C49A6C', icon: 'book-open', is_active: true },
  { name: 'Family', description: 'Family relationships and quality time', weight: 0.175, display_order: 2, color: '#C47060', icon: 'heart', is_active: true },
  { name: 'Emotional', description: 'Emotional health and wellbeing', weight: 0.125, display_order: 3, color: '#D4A96A', icon: 'smile', is_active: true },
  { name: 'Personal', description: 'Personal habits, discipline, and growth', weight: 0.125, display_order: 4, color: '#7BAF7E', icon: 'user', is_active: true },
  { name: 'Physical', description: 'Exercise, nutrition, and physical health', weight: 0.125, display_order: 5, color: '#5A9BB5', icon: 'activity', is_active: true },
  { name: 'Financial', description: 'Earning, saving, investing, and giving', weight: 0.100, display_order: 6, color: '#6BAA8C', icon: 'dollar-sign', is_active: true },
  { name: 'Intellectual', description: 'Learning, study, and mental growth', weight: 0.100, display_order: 7, color: '#9688B5', icon: 'brain', is_active: true },
];

export const CATEGORY_COLOR_MAP: Record<string, string> = {
  'Spiritual': '#C49A6C',
  'Family': '#C47060',
  'Emotional': '#D4A96A',
  'Personal': '#7BAF7E',
  'Physical': '#5A9BB5',
  'Financial': '#6BAA8C',
  'Intellectual': '#9688B5',
};
