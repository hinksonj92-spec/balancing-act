// ============================================================
// Mock data provider for demo mode
// Generates realistic data so the app works before Supabase is connected
// ============================================================

import type { CategoryWithScore, DashboardData, LifeGoal, ChatMessage } from './types';

function generateMonthlyScores(base: number, variance: number): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const trend = (i - 6) * 0.008; // slight upward trend over time
    const noise = (Math.random() - 0.5) * variance;
    return Math.max(0, Math.min(1, base + trend + noise));
  });
}

const MOCK_CATEGORIES: CategoryWithScore[] = [
  {
    id: 'cat-spiritual', user_id: 'demo', name: 'Spiritual',
    description: 'Faith, worship, and spiritual growth',
    weight: 0.175, display_order: 1, color: '#C49A6C', icon: 'book-open',
    is_active: true, created_at: '', updated_at: '',
    current_score: 0.72, trend_direction: 'improving', trend_delta: 0.05,
    streak_days: 14, monthly_scores: generateMonthlyScores(0.68, 0.15),
  },
  {
    id: 'cat-family', user_id: 'demo', name: 'Family',
    description: 'Family relationships and quality time',
    weight: 0.175, display_order: 2, color: '#C47060', icon: 'heart',
    is_active: true, created_at: '', updated_at: '',
    current_score: 0.81, trend_direction: 'stable', trend_delta: 0.01,
    streak_days: 22, monthly_scores: generateMonthlyScores(0.78, 0.10),
  },
  {
    id: 'cat-emotional', user_id: 'demo', name: 'Emotional',
    description: 'Emotional health and wellbeing',
    weight: 0.125, display_order: 3, color: '#D4A96A', icon: 'smile',
    is_active: true, created_at: '', updated_at: '',
    current_score: 0.58, trend_direction: 'declining', trend_delta: -0.08,
    streak_days: 5, monthly_scores: generateMonthlyScores(0.62, 0.18),
  },
  {
    id: 'cat-personal', user_id: 'demo', name: 'Personal',
    description: 'Personal habits, discipline, and growth',
    weight: 0.125, display_order: 4, color: '#7BAF7E', icon: 'user',
    is_active: true, created_at: '', updated_at: '',
    current_score: 0.65, trend_direction: 'improving', trend_delta: 0.03,
    streak_days: 9, monthly_scores: generateMonthlyScores(0.60, 0.14),
  },
  {
    id: 'cat-physical', user_id: 'demo', name: 'Physical',
    description: 'Exercise, nutrition, and physical health',
    weight: 0.125, display_order: 5, color: '#5A9BB5', icon: 'activity',
    is_active: true, created_at: '', updated_at: '',
    current_score: 0.74, trend_direction: 'improving', trend_delta: 0.06,
    streak_days: 18, monthly_scores: generateMonthlyScores(0.66, 0.12),
  },
  {
    id: 'cat-financial', user_id: 'demo', name: 'Financial',
    description: 'Earning, saving, investing, and giving',
    weight: 0.100, display_order: 6, color: '#6BAA8C', icon: 'dollar-sign',
    is_active: true, created_at: '', updated_at: '',
    current_score: 0.55, trend_direction: 'stable', trend_delta: 0.00,
    streak_days: 3, monthly_scores: generateMonthlyScores(0.54, 0.10),
  },
  {
    id: 'cat-intellectual', user_id: 'demo', name: 'Intellectual',
    description: 'Learning, study, and mental growth',
    weight: 0.100, display_order: 7, color: '#9688B5', icon: 'brain',
    is_active: true, created_at: '', updated_at: '',
    current_score: 0.48, trend_direction: 'declining', trend_delta: -0.04,
    streak_days: 1, monthly_scores: generateMonthlyScores(0.52, 0.16),
  },
  {
    id: 'cat-ecclesiastical', user_id: 'demo', name: 'Ecclesiastical',
    description: 'Church service and community involvement',
    weight: 0.075, display_order: 8, color: '#B57D8F', icon: 'users',
    is_active: true, created_at: '', updated_at: '',
    current_score: 0.69, trend_direction: 'improving', trend_delta: 0.04,
    streak_days: 7, monthly_scores: generateMonthlyScores(0.64, 0.12),
  },
];

export function getMockDashboardData(): DashboardData {
  // Compute overall score as weighted average
  let weightedSum = 0;
  let totalWeight = 0;
  for (const cat of MOCK_CATEGORIES) {
    weightedSum += cat.current_score * cat.weight;
    totalWeight += cat.weight;
  }

  return {
    overall_score: weightedSum / totalWeight,
    balance_index: 0.72,
    overall_streak: 5,
    categories: MOCK_CATEGORIES,
    today_updated_categories: ['cat-spiritual', 'cat-family', 'cat-physical'],
  };
}

export function getMockLifeGoals(): (LifeGoal & { category_name: string; category_color: string })[] {
  return [
    { id: 'lg-1', user_id: 'demo', category_id: 'cat-spiritual', name: 'Serve a Full Time Mission', description: null, weight: 0.15, is_completed: true, completed_at: '2012-06-15', target_date: null, progress_pct: 100, created_at: '', updated_at: '', category_name: 'Spiritual', category_color: '#C49A6C' },
    { id: 'lg-2', user_id: 'demo', category_id: 'cat-spiritual', name: 'Sealed in the Temple', description: null, weight: 0.25, is_completed: true, completed_at: '2018-03-10', target_date: null, progress_pct: 100, created_at: '', updated_at: '', category_name: 'Spiritual', category_color: '#C49A6C' },
    { id: 'lg-3', user_id: 'demo', category_id: 'cat-spiritual', name: 'Be a Father', description: null, weight: 0.25, is_completed: true, completed_at: '2020-01-15', target_date: null, progress_pct: 100, created_at: '', updated_at: '', category_name: 'Spiritual', category_color: '#C49A6C' },
    { id: 'lg-4', user_id: 'demo', category_id: 'cat-physical', name: 'Run a Marathon', description: null, weight: 0.09, is_completed: false, completed_at: null, target_date: '2027-06-01', progress_pct: 35, created_at: '', updated_at: '', category_name: 'Physical', category_color: '#5A9BB5' },
    { id: 'lg-5', user_id: 'demo', category_id: 'cat-physical', name: 'Complete an Iron Man', description: null, weight: 0.09, is_completed: false, completed_at: null, target_date: '2028-09-01', progress_pct: 10, created_at: '', updated_at: '', category_name: 'Physical', category_color: '#5A9BB5' },
    { id: 'lg-6', user_id: 'demo', category_id: 'cat-financial', name: 'Publish First Book', description: null, weight: 0.15, is_completed: false, completed_at: null, target_date: '2027-12-31', progress_pct: 45, created_at: '', updated_at: '', category_name: 'Financial', category_color: '#6BAA8C' },
    { id: 'lg-7', user_id: 'demo', category_id: 'cat-financial', name: 'Own 10 Property Units', description: null, weight: 0.10, is_completed: false, completed_at: null, target_date: null, progress_pct: 20, created_at: '', updated_at: '', category_name: 'Financial', category_color: '#6BAA8C' },
    { id: 'lg-8', user_id: 'demo', category_id: 'cat-intellectual', name: "Bachelor's Degree", description: null, weight: 0.20, is_completed: true, completed_at: '2016-04-20', target_date: null, progress_pct: 100, created_at: '', updated_at: '', category_name: 'Intellectual', category_color: '#9688B5' },
    { id: 'lg-9', user_id: 'demo', category_id: 'cat-intellectual', name: "Master's Degree", description: null, weight: 0.20, is_completed: false, completed_at: null, target_date: '2028-05-01', progress_pct: 0, created_at: '', updated_at: '', category_name: 'Intellectual', category_color: '#9688B5' },
    { id: 'lg-10', user_id: 'demo', category_id: 'cat-personal', name: 'Visit the Pyramids', description: null, weight: 0.05, is_completed: false, completed_at: null, target_date: null, progress_pct: 0, created_at: '', updated_at: '', category_name: 'Personal', category_color: '#7BAF7E' },
    { id: 'lg-11', user_id: 'demo', category_id: 'cat-personal', name: 'Go Skydiving', description: null, weight: 0.05, is_completed: false, completed_at: null, target_date: null, progress_pct: 0, created_at: '', updated_at: '', category_name: 'Personal', category_color: '#7BAF7E' },
    { id: 'lg-12', user_id: 'demo', category_id: 'cat-personal', name: 'See the Eiffel Tower', description: null, weight: 0.05, is_completed: false, completed_at: null, target_date: null, progress_pct: 0, created_at: '', updated_at: '', category_name: 'Personal', category_color: '#7BAF7E' },
  ];
}

// Generate mock yearly heatmap data (12 months x 8 categories)
export function getMockHeatmapData(): { month: string; scores: Record<string, number> }[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const catNames = ['Spiritual', 'Family', 'Emotional', 'Personal', 'Physical', 'Financial', 'Intellectual', 'Ecclesiastical'];

  return months.map((month, i) => {
    const scores: Record<string, number> = {};
    catNames.forEach(cat => {
      const base = MOCK_CATEGORIES.find(c => c.name === cat)!.current_score;
      scores[cat] = Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.25 + (i - 6) * 0.01));
    });
    return { month, scores };
  });
}

// Mock metric list for a category
export function getMockMetrics(categoryId: string) {
  const metricsMap: Record<string, { name: string; value: number; weight: number; trend: 'improving' | 'stable' | 'declining'; streak: number }[]> = {
    'cat-spiritual': [
      { name: 'Keeping the Commandments', value: 0.85, weight: 0.40, trend: 'stable', streak: 14 },
      { name: 'Daily Scripture Reading', value: 0.71, weight: 0.05, trend: 'improving', streak: 7 },
      { name: 'Church Attendance', value: 1.0, weight: 0.19, trend: 'stable', streak: 22 },
      { name: 'Tithing', value: 1.0, weight: 0.15, trend: 'stable', streak: 8 },
      { name: 'Temple Attendance', value: 0.5, weight: 0.05, trend: 'declining', streak: 0 },
      { name: 'Ponderize One Scripture', value: 0.43, weight: 0.10, trend: 'improving', streak: 3 },
      { name: 'Daily Strive to Live Like Christ', value: 0.68, weight: 0.05, trend: 'improving', streak: 5 },
    ],
    'cat-physical': [
      { name: 'Daily Exercise', value: 0.78, weight: 0.25, trend: 'improving', streak: 18 },
      { name: 'Eat Healthy', value: 0.65, weight: 0.25, trend: 'stable', streak: 4 },
      { name: 'Good Night\'s Rest', value: 0.71, weight: 0.25, trend: 'declining', streak: 2 },
      { name: 'Daily Stretching', value: 0.82, weight: 0.25, trend: 'improving', streak: 12 },
    ],
  };

  return metricsMap[categoryId] || [
    { name: 'Sample Metric 1', value: 0.70, weight: 0.50, trend: 'stable' as const, streak: 5 },
    { name: 'Sample Metric 2', value: 0.55, weight: 0.50, trend: 'improving' as const, streak: 3 },
  ];
}

// Mock AI extraction from text input
export function mockExtractMetrics(input: string): {
  updates: { metric_name: string; value: number; confidence: number; category: string; category_color: string }[];
  questions: string[];
  unmatched: string[];
} {
  const text = input.toLowerCase();
  const updates: { metric_name: string; value: number; confidence: number; category: string; category_color: string }[] = [];
  const questions: string[] = [];
  const unmatched: string[] = [];

  // Simple keyword matching (this gets replaced by real LLM when OpenAI is connected)
  if (text.includes('scripture') || text.includes('read')) {
    updates.push({ metric_name: 'Daily Scripture Reading', value: 1, confidence: 0.92, category: 'Spiritual', category_color: '#C49A6C' });
  }
  if (text.includes('exercise') || text.includes('gym') || text.includes('ran') || text.includes('workout') || text.includes('worked out')) {
    updates.push({ metric_name: 'Daily Exercise', value: 1, confidence: 0.95, category: 'Physical', category_color: '#5A9BB5' });
  }
  if (text.includes('stretch')) {
    updates.push({ metric_name: 'Daily Stretching', value: 1, confidence: 0.88, category: 'Physical', category_color: '#5A9BB5' });
  }
  if (text.includes('healthy') || text.includes('salad') || text.includes('clean eating')) {
    updates.push({ metric_name: 'Eat Healthy', value: 1, confidence: 0.85, category: 'Physical', category_color: '#5A9BB5' });
  }
  if (text.includes('family') || text.includes('tasha') || text.includes('hazel') || text.includes('kids')) {
    updates.push({ metric_name: '2 Hours with Family', value: 1, confidence: 0.80, category: 'Family', category_color: '#C47060' });
  }
  if (text.includes('date') && (text.includes('wife') || text.includes('tasha'))) {
    updates.push({ metric_name: 'Weekly Date with Wife', value: 1, confidence: 0.90, category: 'Family', category_color: '#C47060' });
  }
  if (text.includes('journal')) {
    updates.push({ metric_name: 'Daily Journal', value: 1, confidence: 0.93, category: 'Personal', category_color: '#7BAF7E' });
  }
  if (text.includes('bed') && (text.includes('early') || text.includes('before'))) {
    updates.push({ metric_name: 'Go to Bed Before 12:00', value: 1, confidence: 0.82, category: 'Personal', category_color: '#7BAF7E' });
  }
  if (text.includes('church') || text.includes('sacrament')) {
    updates.push({ metric_name: 'Church Attendance', value: 1, confidence: 0.95, category: 'Spiritual', category_color: '#C49A6C' });
  }
  if (text.includes('temple')) {
    updates.push({ metric_name: 'Temple Attendance', value: 1, confidence: 0.90, category: 'Spiritual', category_color: '#C49A6C' });
  }
  if (text.includes('language') || text.includes('thai') || text.includes('lao')) {
    const hoursMatch = text.match(/(\d+)\s*hour/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 1;
    updates.push({ metric_name: 'Language Study', value: hours, confidence: 0.88, category: 'Intellectual', category_color: '#9688B5' });
  }
  if (text.includes('positive') || text.includes('great day') || text.includes('feeling good')) {
    updates.push({ metric_name: 'Positive', value: 0.8, confidence: 0.75, category: 'Emotional', category_color: '#D4A96A' });
  }
  if (text.includes('commandment')) {
    updates.push({ metric_name: 'Keeping the Commandments', value: 1, confidence: 0.90, category: 'Spiritual', category_color: '#C49A6C' });
  }
  if (text.includes('pray') || text.includes('prayer')) {
    updates.push({ metric_name: 'Family Prayers', value: 1, confidence: 0.85, category: 'Family', category_color: '#C47060' });
  }

  // Generate follow-up questions for ambiguous input
  if (text.includes('tithing') && !text.includes('paid') && !text.includes('yes')) {
    questions.push('Did you pay tithing this month, or are you planning to?');
  }
  if (updates.length === 0) {
    questions.push("I didn't catch any specific metrics. Could you tell me more about what you did today?");
  }

  return { updates, questions, unmatched };
}
