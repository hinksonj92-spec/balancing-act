// ============================================================
// Goals Store — localStorage-backed CRUD for life goals
// Shared between Chat and Goals pages
// ============================================================

export interface StoredGoal {
  id: string;
  name: string;
  category_name: string;
  category_color: string;
  is_completed: boolean;
  completed_at: string | null;
  progress_pct: number;
  target_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'balancing-act-goals';

const CATEGORY_COLORS: Record<string, string> = {
  Spiritual: '#C49A6C',
  Family: '#C47060',
  Emotional: '#D4A96A',
  Personal: '#7BAF7E',
  Physical: '#5A9BB5',
  Financial: '#6BAA8C',
  Intellectual: '#9688B5',
  Ecclesiastical: '#B57D8F',
};

// Default seed goals — loaded on first use
const SEED_GOALS: StoredGoal[] = [
  { id: 'lg-1', name: 'Serve a Full Time Mission', category_name: 'Spiritual', category_color: '#C49A6C', is_completed: true, completed_at: '2012-06-15', progress_pct: 100, target_date: null, description: null, created_at: '2012-01-01', updated_at: '2012-06-15' },
  { id: 'lg-2', name: 'Sealed in the Temple', category_name: 'Spiritual', category_color: '#C49A6C', is_completed: true, completed_at: '2018-03-10', progress_pct: 100, target_date: null, description: null, created_at: '2015-01-01', updated_at: '2018-03-10' },
  { id: 'lg-3', name: 'Be a Father', category_name: 'Spiritual', category_color: '#C49A6C', is_completed: true, completed_at: '2020-01-15', progress_pct: 100, target_date: null, description: null, created_at: '2018-01-01', updated_at: '2020-01-15' },
  { id: 'lg-4', name: 'Run a Marathon', category_name: 'Physical', category_color: '#5A9BB5', is_completed: false, completed_at: null, progress_pct: 35, target_date: '2027-06-01', description: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'lg-5', name: 'Complete an Iron Man', category_name: 'Physical', category_color: '#5A9BB5', is_completed: false, completed_at: null, progress_pct: 10, target_date: '2028-09-01', description: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'lg-6', name: 'Publish First Book', category_name: 'Financial', category_color: '#6BAA8C', is_completed: false, completed_at: null, progress_pct: 45, target_date: '2027-12-31', description: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'lg-7', name: 'Own 10 Property Units', category_name: 'Financial', category_color: '#6BAA8C', is_completed: false, completed_at: null, progress_pct: 20, target_date: null, description: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'lg-8', name: "Bachelor's Degree", category_name: 'Intellectual', category_color: '#9688B5', is_completed: true, completed_at: '2016-04-20', progress_pct: 100, target_date: null, description: null, created_at: '2012-01-01', updated_at: '2016-04-20' },
  { id: 'lg-9', name: "Master's Degree", category_name: 'Intellectual', category_color: '#9688B5', is_completed: false, completed_at: null, progress_pct: 0, target_date: '2028-05-01', description: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'lg-10', name: 'Visit the Pyramids', category_name: 'Personal', category_color: '#7BAF7E', is_completed: false, completed_at: null, progress_pct: 0, target_date: null, description: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'lg-11', name: 'Go Skydiving', category_name: 'Personal', category_color: '#7BAF7E', is_completed: false, completed_at: null, progress_pct: 0, target_date: null, description: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
  { id: 'lg-12', name: 'See the Eiffel Tower', category_name: 'Personal', category_color: '#7BAF7E', is_completed: false, completed_at: null, progress_pct: 0, target_date: null, description: null, created_at: '2025-01-01', updated_at: '2025-01-01' },
];

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// ---- Read ----

export function getGoals(): StoredGoal[] {
  if (!isBrowser()) return SEED_GOALS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // First load — seed defaults
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_GOALS));
    return SEED_GOALS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_GOALS;
  }
}

function saveGoals(goals: StoredGoal[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

// ---- Create ----

export function addGoal(params: {
  name: string;
  category_name: string;
  target_date?: string | null;
  description?: string | null;
  progress_pct?: number;
}): StoredGoal {
  const goals = getGoals();
  const now = new Date().toISOString();
  const newGoal: StoredGoal = {
    id: `lg-${Date.now()}`,
    name: params.name,
    category_name: params.category_name,
    category_color: CATEGORY_COLORS[params.category_name] || '#A39B91',
    is_completed: false,
    completed_at: null,
    progress_pct: params.progress_pct ?? 0,
    target_date: params.target_date ?? null,
    description: params.description ?? null,
    created_at: now,
    updated_at: now,
  };
  goals.push(newGoal);
  saveGoals(goals);
  return newGoal;
}

// ---- Update ----

export function updateGoal(name: string, updates: Partial<Pick<StoredGoal, 'name' | 'category_name' | 'target_date' | 'description' | 'progress_pct'>>): StoredGoal | null {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) return null;
  const goal = goals[idx];
  if (updates.name !== undefined) goal.name = updates.name;
  if (updates.category_name !== undefined) {
    goal.category_name = updates.category_name;
    goal.category_color = CATEGORY_COLORS[updates.category_name] || goal.category_color;
  }
  if (updates.target_date !== undefined) goal.target_date = updates.target_date;
  if (updates.description !== undefined) goal.description = updates.description;
  if (updates.progress_pct !== undefined) goal.progress_pct = updates.progress_pct;
  goal.updated_at = new Date().toISOString();
  goals[idx] = goal;
  saveGoals(goals);
  return goal;
}

// ---- Complete ----

export function completeGoal(name: string): StoredGoal | null {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) return null;
  goals[idx].is_completed = true;
  goals[idx].completed_at = new Date().toISOString();
  goals[idx].progress_pct = 100;
  goals[idx].updated_at = new Date().toISOString();
  saveGoals(goals);
  return goals[idx];
}

// ---- Delete ----

export function deleteGoal(name: string): boolean {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) return false;
  goals.splice(idx, 1);
  saveGoals(goals);
  return true;
}

// ---- Summary for LLM context ----

export function getGoalsSummaryForAI(): string {
  const goals = getGoals();
  if (goals.length === 0) return 'No goals set yet.';

  const active = goals.filter(g => !g.is_completed);
  const completed = goals.filter(g => g.is_completed);

  let summary = `## Current Life Goals (${goals.length} total: ${active.length} active, ${completed.length} completed)\n\n`;

  if (active.length > 0) {
    summary += '### Active Goals\n';
    active.forEach(g => {
      summary += `- "${g.name}" (${g.category_name}) — ${g.progress_pct}% done`;
      if (g.target_date) summary += ` — target: ${g.target_date}`;
      if (g.description) summary += ` — ${g.description}`;
      summary += '\n';
    });
    summary += '\n';
  }

  if (completed.length > 0) {
    summary += '### Completed Goals\n';
    completed.forEach(g => {
      summary += `- "${g.name}" (${g.category_name})`;
      if (g.completed_at) summary += ` — completed ${g.completed_at.slice(0, 10)}`;
      summary += '\n';
    });
  }

  return summary;
}

// ---- Event system for cross-page reactivity ----

const GOALS_CHANGED_EVENT = 'balancing-act-goals-changed';

export function notifyGoalsChanged(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(GOALS_CHANGED_EVENT));
}

export function onGoalsChanged(callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(GOALS_CHANGED_EVENT, callback);
  return () => window.removeEventListener(GOALS_CHANGED_EVENT, callback);
}
