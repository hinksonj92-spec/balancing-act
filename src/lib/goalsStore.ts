// ============================================================
// Goals Store — localStorage-backed CRUD for all goal horizons
// Supports: daily, weekly, monthly, yearly, lifetime
// Shared between Chat and Goals pages
// ============================================================

export type GoalHorizon = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime';

export interface StoredGoal {
  id: string;
  name: string;
  category_name: string;
  category_color: string;
  horizon: GoalHorizon;
  is_completed: boolean;
  completed_at: string | null;
  progress_pct: number;
  target_date: string | null;
  description: string | null;
  weight: number;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'balancing-act-goals-v2';

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

// ── Seed data from Excel spreadsheet ──────────────────────────────────────

function g(id: string, name: string, cat: string, horizon: GoalHorizon, weight: number, opts?: Partial<StoredGoal>): StoredGoal {
  return {
    id,
    name,
    category_name: cat,
    category_color: CATEGORY_COLORS[cat] || '#6B6560',
    horizon,
    is_completed: false,
    completed_at: null,
    progress_pct: 0,
    target_date: null,
    description: null,
    weight,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...opts,
  };
}

const SEED_GOALS: StoredGoal[] = [
  // =========================================================================
  // SPIRITUAL
  // =========================================================================
  // Daily
  g('sd-1', 'Keep the Commandments', 'Spiritual', 'daily', 0.40),
  g('sd-2', 'Ponderize One Scripture', 'Spiritual', 'daily', 0.10),
  g('sd-3', 'Strive to Live Like Christ', 'Spiritual', 'daily', 0.05),
  g('sd-4', 'Sincere Scripture Reading', 'Spiritual', 'daily', 0.05),
  // Weekly
  g('sw-1', 'Church Attendance', 'Spiritual', 'weekly', 0.19),
  g('sw-2', 'Family History Work', 'Spiritual', 'weekly', 0.01),
  // Monthly
  g('sm-1', 'Tithing', 'Spiritual', 'monthly', 0.15),
  g('sm-2', 'Temple Attendance', 'Spiritual', 'monthly', 0.05),
  g('sm-3', 'Monthly Fast', 'Spiritual', 'monthly', 0.04),
  g('sm-4', 'Home Teaching / Ministering', 'Spiritual', 'monthly', 0.01),
  // Yearly
  g('sy-1', 'Book of Mormon Reading', 'Spiritual', 'yearly', 0.20),
  g('sy-2', 'New Testament Reading', 'Spiritual', 'yearly', 0.10),
  g('sy-3', 'Old Testament Reading', 'Spiritual', 'yearly', 0.02),
  g('sy-4', 'Pearl of Great Price Reading', 'Spiritual', 'yearly', 0.05),
  g('sy-5', 'Doctrine and Covenants Reading', 'Spiritual', 'yearly', 0.10),
  g('sy-6', 'General Conference (in English)', 'Spiritual', 'yearly', 0.25),
  g('sy-7', 'Monthly Temple Trip', 'Spiritual', 'yearly', 0.13),
  g('sy-8', 'Quarterly Christlike Attributes Assessment', 'Spiritual', 'yearly', 0.15),
  // Lifetime
  g('sl-1', 'Serve a Full Time Mission', 'Spiritual', 'lifetime', 0.15, { is_completed: true, completed_at: '2012-06-15', progress_pct: 100 }),
  g('sl-2', 'Sealed in the Temple — Never Divorce', 'Spiritual', 'lifetime', 0.25, { is_completed: true, completed_at: '2018-03-10', progress_pct: 100 }),
  g('sl-3', 'Be a Father', 'Spiritual', 'lifetime', 0.25, { is_completed: true, completed_at: '2020-01-15', progress_pct: 100 }),
  g('sl-4', 'Live to See Patriarchal Blessings Fulfilled', 'Spiritual', 'lifetime', 0.35),

  // =========================================================================
  // FAMILY
  // =========================================================================
  // Daily
  g('fd-1', '2 Hours a Day with Family', 'Family', 'daily', 0.14),
  g('fd-2', 'Family Meals Together', 'Family', 'daily', 0.05),
  g('fd-3', 'Family Scriptures', 'Family', 'daily', 0.05),
  g('fd-4', 'Family Prayers', 'Family', 'daily', 0.05),
  g('fd-5', 'Family Reading Time', 'Family', 'daily', 0.05),
  // Weekly
  g('fw-1', 'Weekly Date with Wife', 'Family', 'weekly', 0.15),
  g('fw-2', 'Walk the Dog 5x a Week', 'Family', 'weekly', 0.11),
  g('fw-3', 'Family Night', 'Family', 'weekly', 0.05),
  g('fw-4', 'Personal Time with Every Child', 'Family', 'weekly', 0.05),
  g('fw-5', 'Weekly Family Interviews', 'Family', 'weekly', 0.05),
  // Monthly
  g('fm-1', 'Email for Parents', 'Family', 'monthly', 0.60),
  g('fm-2', 'Phone Call Parents', 'Family', 'monthly', 0.05),
  // Yearly
  g('fy-1', 'Memorize Siblings Full Names', 'Family', 'yearly', 0.15),
  g('fy-2', 'Memorize Siblings Birthdays', 'Family', 'yearly', 0.15),
  g('fy-3', 'Memorize Siblings Anniversaries', 'Family', 'yearly', 0.10),
  g('fy-4', 'Memorize Nieces/Nephews Full Names', 'Family', 'yearly', 0.20),
  g('fy-5', 'Memorize Nieces/Nephews Birthdays', 'Family', 'yearly', 0.20),
  g('fy-6', 'Memorize Nieces/Nephews Anniversaries', 'Family', 'yearly', 0.20),
  // Lifetime
  g('fl-1', 'Get Married', 'Family', 'lifetime', 1.0, { is_completed: true, completed_at: '2018-03-10', progress_pct: 100 }),
  g('fl-2', 'Become a Father', 'Family', 'lifetime', 1.0, { is_completed: true, completed_at: '2020-01-15', progress_pct: 100 }),

  // =========================================================================
  // PERSONAL
  // =========================================================================
  // Daily
  g('pd-1', 'Daily Journal', 'Personal', 'daily', 0.07),
  g('pd-2', 'Daily Goal App', 'Personal', 'daily', 0.10),
  g('pd-3', 'Daily Life Measurements', 'Personal', 'daily', 0.10),
  g('pd-4', 'Clean Room', 'Personal', 'daily', 0.09),
  g('pd-5', 'Make Your Bed', 'Personal', 'daily', 0.09),
  g('pd-6', 'Keep Desk Clear', 'Personal', 'daily', 0.07),
  g('pd-7', 'Clean Home', 'Personal', 'daily', 0.05),
  g('pd-8', 'Go to Bed Before Midnight', 'Personal', 'daily', 0.05),
  g('pd-9', 'Get Up Before 6:00 AM', 'Personal', 'daily', 0.05),
  g('pd-10', 'Brush Teeth', 'Personal', 'daily', 0.03),
  g('pd-11', 'Practice Good Hygiene', 'Personal', 'daily', 0.03),
  g('pd-12', 'Do Hard Things', 'Personal', 'daily', 0.04),
  g('pd-13', 'Strictly Avoid Addictions', 'Personal', 'daily', 0.07),
  g('pd-14', 'Motivational Minute', 'Personal', 'daily', 0.07),
  // Weekly
  g('pw-1', 'Laundry', 'Personal', 'weekly', 0.03),
  g('pw-2', 'Grocery Shopping', 'Personal', 'weekly', 0.01),
  g('pw-3', 'Personal Interviews', 'Personal', 'weekly', 0.05),
  // Lifetime
  g('pl-1', 'Go Skydiving', 'Personal', 'lifetime', 0.125),
  g('pl-2', 'Ride a Camel', 'Personal', 'lifetime', 0.125),
  g('pl-3', 'Visit Gettysburg', 'Personal', 'lifetime', 0.125),
  g('pl-4', 'Visit Niagara Falls', 'Personal', 'lifetime', 0.125),
  g('pl-5', 'Visit Mount Rushmore', 'Personal', 'lifetime', 0.125),
  g('pl-6', 'Visit Washington DC', 'Personal', 'lifetime', 0.125),
  g('pl-7', 'See the Pyramids Live', 'Personal', 'lifetime', 0.125),
  g('pl-8', 'See the Eiffel Tower', 'Personal', 'lifetime', 0.125),

  // =========================================================================
  // EMOTIONAL
  // =========================================================================
  // Daily (positive emotions to cultivate)
  g('ed-1', 'Be Positive', 'Emotional', 'daily', 0.10),
  g('ed-2', 'Practice Patience', 'Emotional', 'daily', 0.07),
  g('ed-3', 'Find Joy', 'Emotional', 'daily', 0.07),
  g('ed-4', 'Feel Peace', 'Emotional', 'daily', 0.07),
  g('ed-5', 'Have Fun', 'Emotional', 'daily', 0.01),
  g('ed-6', 'Serve Someone', 'Emotional', 'daily', 0.02),
  g('ed-7', 'Practice Hope', 'Emotional', 'daily', 0.08),
  g('ed-8', 'Exercise Faith', 'Emotional', 'daily', 0.15),
  g('ed-9', 'Feel Excited About Something', 'Emotional', 'daily', 0.01),
  g('ed-10', 'Practice Charity', 'Emotional', 'daily', 0.12),
  g('ed-11', 'Smell the Roses', 'Emotional', 'daily', 0.30),
  // Weekly
  g('ew-1', 'Weekly Stress Reliever Activity', 'Emotional', 'weekly', 0.30),
  // Yearly
  g('ey-1', 'Choose Comfort in God Every Month', 'Emotional', 'yearly', 0.55),
  g('ey-2', 'Satisfaction from Family Labor', 'Emotional', 'yearly', 0.10),
  g('ey-3', 'Satisfaction from Church Labor', 'Emotional', 'yearly', 0.05),
  // Lifetime
  g('el-1', 'Identify 45 Physical Stress Relief Activities', 'Emotional', 'lifetime', 0.25),
  g('el-2', 'Determine Negative vs Positive Stressors', 'Emotional', 'lifetime', 0.25),
  g('el-3', 'Eliminate Negative Stressors', 'Emotional', 'lifetime', 0.25),
  g('el-4', 'Discover Proper Ways to Handle Positive Stressors', 'Emotional', 'lifetime', 0.25),

  // =========================================================================
  // PHYSICAL
  // =========================================================================
  // Daily
  g('phd-1', 'Daily Exercise', 'Physical', 'daily', 0.25),
  g('phd-2', 'Eat Healthy', 'Physical', 'daily', 0.25),
  g('phd-3', "Good Night's Rest", 'Physical', 'daily', 0.25),
  g('phd-4', 'Daily Stretching / Mobility', 'Physical', 'daily', 0.25),
  // Monthly
  g('phm-1', 'Vitamins / Minerals', 'Physical', 'monthly', 0.10),
  // Yearly
  g('phy-1', 'Hit Ideal Weight Target (185)', 'Physical', 'yearly', 0.50),
  g('phy-2', 'Maintain Six Pack', 'Physical', 'yearly', 0.50),
  // Lifetime
  g('phl-1', 'Marathon', 'Physical', 'lifetime', 0.09, { progress_pct: 35, target_date: '2027-06-01' }),
  g('phl-2', 'Iron Man', 'Physical', 'lifetime', 0.09, { progress_pct: 10, target_date: '2028-09-01' }),
  g('phl-3', 'Spartan', 'Physical', 'lifetime', 0.09),
  g('phl-4', '1 Mile Swim', 'Physical', 'lifetime', 0.07),
  g('phl-5', '50 Mile Bike Ride', 'Physical', 'lifetime', 0.09),
  g('phl-6', '1000 Push Ups in a Row', 'Physical', 'lifetime', 0.09),
  g('phl-7', '100 Pull Ups in a Row', 'Physical', 'lifetime', 0.09),
  g('phl-8', '1000 Sit Ups in a Row', 'Physical', 'lifetime', 0.09),
  g('phl-9', 'Always Keep the Six Pack', 'Physical', 'lifetime', 0.30),

  // =========================================================================
  // FINANCIAL
  // =========================================================================
  // Monthly
  g('fid-1', '$2000 Towards Storage Units', 'Financial', 'monthly', 0.50),
  g('fid-2', 'Zero Credit Card Interest', 'Financial', 'monthly', 0.10),
  g('fid-3', 'Spend Less Than You Make', 'Financial', 'monthly', 0.40),
  g('fid-4', 'Follow Budgeted Plan', 'Financial', 'monthly', 0.15),
  // Weekly
  g('fiw-1', 'Write 10 Pages in Your Book', 'Financial', 'weekly', 0.08),
  // Yearly
  g('fiy-1', 'Quarterly Search for Suitable Properties', 'Financial', 'yearly', 0.40),
  g('fiy-2', 'More Financially Secure Than Last Year', 'Financial', 'yearly', 0.40),
  g('fiy-3', 'Wider Range of Investments Than Last Year', 'Financial', 'yearly', 0.20),
  // Lifetime
  g('fil-1', 'Property Owner 10 Units', 'Financial', 'lifetime', 0.10, { progress_pct: 20 }),
  g('fil-2', 'Property Owner 100 Units', 'Financial', 'lifetime', 0.14),
  g('fil-3', 'Property Owner 500 Units', 'Financial', 'lifetime', 0.20),
  g('fil-4', 'Publish First Book', 'Financial', 'lifetime', 0.15, { progress_pct: 45, target_date: '2027-12-31' }),
  g('fil-5', 'Publish Second Book', 'Financial', 'lifetime', 0.15),
  g('fil-6', 'Publish Third Book', 'Financial', 'lifetime', 0.15),
  g('fil-7', 'Turn a Book Into a Movie', 'Financial', 'lifetime', 0.15),
  g('fil-8', 'Retire from Having a Boss', 'Financial', 'lifetime', 0.10),
  g('fil-9', 'Pay Off House', 'Financial', 'lifetime', 0.20),
  g('fil-10', 'No Car Payments', 'Financial', 'lifetime', 0.20),
  g('fil-11', 'Have No Debt and $5M (2010 Equivalent)', 'Financial', 'lifetime', 0.10),

  // =========================================================================
  // INTELLECTUAL
  // =========================================================================
  // Daily
  g('id-1', 'Language Study', 'Intellectual', 'daily', 1.0),
  // Weekly
  g('iw-1', 'Podcast (~2 Hours)', 'Intellectual', 'weekly', 0.20),
  g('iw-2', 'AudioBook (~2 Hours)', 'Intellectual', 'weekly', 0.20),
  g('iw-3', 'Greek/Latin Roots Flash Cards', 'Intellectual', 'weekly', 0.10),
  g('iw-4', 'Read About History', 'Intellectual', 'weekly', 0.10),
  // Yearly
  g('iy-1', 'Read a Novel', 'Intellectual', 'yearly', 0.10),
  g('iy-2', 'Read a Classical Book', 'Intellectual', 'yearly', 0.10),
  g('iy-3', 'Thai One Month Study', 'Intellectual', 'yearly', 0.05),
  g('iy-4', 'Lao One Month Study', 'Intellectual', 'yearly', 0.05),
  g('iy-5', 'Burmese One Month Study', 'Intellectual', 'yearly', 0.05),
  g('iy-6', 'Memorize World Geography', 'Intellectual', 'yearly', 0.05),
  g('iy-7', 'World History Study', 'Intellectual', 'yearly', 0.05),
  g('iy-8', 'Yearly BYU Independent Study Class', 'Intellectual', 'yearly', 0.05),
  g('iy-9', 'Conference in Every Language Each Session', 'Intellectual', 'yearly', 0.05),
  // Lifetime
  g('il-1', "Bachelor's Degree", 'Intellectual', 'lifetime', 0.20, { is_completed: true, completed_at: '2016-04-20', progress_pct: 100 }),
  g('il-2', "Master's Degree", 'Intellectual', 'lifetime', 0.20, { target_date: '2028-05-01' }),
  g('il-3', 'PhD', 'Intellectual', 'lifetime', 0.20),
  g('il-4', 'Nuclear Physics', 'Intellectual', 'lifetime', 0.01),
  g('il-5', 'Rocket Science', 'Intellectual', 'lifetime', 0.01),
  g('il-6', 'Biology', 'Intellectual', 'lifetime', 0.01),
  g('il-7', 'Chemistry', 'Intellectual', 'lifetime', 0.01),
  g('il-8', 'Memorize Declaration of Independence', 'Intellectual', 'lifetime', 0.03),
  g('il-9', 'Memorize the United States Constitution', 'Intellectual', 'lifetime', 0.04),
  g('il-10', 'Memorize the Gettysburg Address', 'Intellectual', 'lifetime', 0.02),
  g('il-11', 'Learn to Play 21 Piano Songs', 'Intellectual', 'lifetime', 0.005),
  g('il-12', 'Learn to Play the Bag Pipes', 'Intellectual', 'lifetime', 0.05),
  g('il-13', 'Learn to Play the Accordion', 'Intellectual', 'lifetime', 0.04),
  g('il-14', 'Answer the Issue for Sticky Wages', 'Intellectual', 'lifetime', 1.0),
  g('il-15', 'Japanese Language', 'Intellectual', 'lifetime', 0.40),
  g('il-16', 'Arabic Language', 'Intellectual', 'lifetime', 0.01),
  g('il-17', 'Swedish Language', 'Intellectual', 'lifetime', 0.20),
  g('il-18', 'German Language', 'Intellectual', 'lifetime', 0.20),
  g('il-19', 'Portuguese Language', 'Intellectual', 'lifetime', 0.05),
  g('il-20', 'Spanish Language', 'Intellectual', 'lifetime', 0.10),
  g('il-21', 'French Language', 'Intellectual', 'lifetime', 0.02),
  g('il-22', 'Latin or Greek Language', 'Intellectual', 'lifetime', 0.01),
  g('il-23', 'Biblical Hebrew', 'Intellectual', 'lifetime', 0.01),

  // =========================================================================
  // ECCLESIASTICAL
  // =========================================================================
  // Daily
  g('ecd-1', 'Fulfill Calling Responsibilities', 'Ecclesiastical', 'daily', 0.40),
  g('ecd-2', 'Ministering Thoughts/Actions', 'Ecclesiastical', 'daily', 0.20),
  // Weekly
  g('ecw-1', 'Attend All Church Meetings', 'Ecclesiastical', 'weekly', 0.30),
  g('ecw-2', 'Serve in Community', 'Ecclesiastical', 'weekly', 0.10),
  // Monthly
  g('ecm-1', 'Ministering Visit', 'Ecclesiastical', 'monthly', 0.30),
  g('ecm-2', 'Temple Service', 'Ecclesiastical', 'monthly', 0.20),
];

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// ---- Read ----

export function getGoals(): StoredGoal[] {
  if (!isBrowser()) return SEED_GOALS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_GOALS));
    return SEED_GOALS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_GOALS;
  }
}

export function getGoalsByHorizon(horizon: GoalHorizon): StoredGoal[] {
  return getGoals().filter(g => g.horizon === horizon);
}

function saveGoals(goals: StoredGoal[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

// ---- Create ----

export function addGoal(params: {
  name: string;
  category_name: string;
  horizon?: GoalHorizon;
  target_date?: string | null;
  description?: string | null;
  progress_pct?: number;
  weight?: number;
}): StoredGoal {
  const goals = getGoals();
  const now = new Date().toISOString();
  const newGoal: StoredGoal = {
    id: `lg-${Date.now()}`,
    name: params.name,
    category_name: params.category_name,
    category_color: CATEGORY_COLORS[params.category_name] || '#6B6560',
    horizon: params.horizon ?? 'lifetime',
    is_completed: false,
    completed_at: null,
    progress_pct: params.progress_pct ?? 0,
    target_date: params.target_date ?? null,
    description: params.description ?? null,
    weight: params.weight ?? 1.0,
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

  const horizons: GoalHorizon[] = ['daily', 'weekly', 'monthly', 'yearly', 'lifetime'];
  let summary = `## Goals (${goals.length} total)\n\n`;

  for (const h of horizons) {
    const hGoals = goals.filter(g => g.horizon === h);
    if (hGoals.length === 0) continue;
    const completed = hGoals.filter(g => g.is_completed).length;
    summary += `### ${h.charAt(0).toUpperCase() + h.slice(1)} (${completed}/${hGoals.length} done)\n`;
    hGoals.forEach(g => {
      summary += `- "${g.name}" (${g.category_name})`;
      if (g.is_completed) summary += ' [DONE]';
      else if (g.progress_pct > 0) summary += ` — ${g.progress_pct}%`;
      if (g.target_date) summary += ` — target: ${g.target_date}`;
      summary += '\n';
    });
    summary += '\n';
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
