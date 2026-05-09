'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getGoals,
  onGoalsChanged,
  toggleCheckOff,
  isGoalCheckedOff,
  getCurrentPeriodKey,
  toggleGoalComplete,
  setGoalProgress,
  addGoal,
  deleteGoal as removeGoal,
  setSupabaseSync,
  loadGoalsFromSupabase,
  type StoredGoal,
  type GoalHorizon,
} from '@/lib/goalsStore';
import { useAuth } from '@/lib/AuthContext';

// ── Active Goals Storage ─────────────────────────────────────────────────
const ACTIVE_IDS_KEY = 'balancing-act-active-goal-ids';
const GOAL_CAP_KEY = 'balancing-act-goal-cap';

function getActiveIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACTIVE_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveActiveIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_IDS_KEY, JSON.stringify(ids));
}

function getGoalCap(): number {
  if (typeof window === 'undefined') return 3;
  const raw = localStorage.getItem(GOAL_CAP_KEY);
  return raw ? parseInt(raw, 10) : 3;
}

function saveGoalCap(cap: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOAL_CAP_KEY, String(cap));
}

// ── Category Colors ──────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  Spiritual: '#C49A6C',
  Family: '#C47060',
  Emotional: '#D4A96A',
  Personal: '#7BAF7E',
  Physical: '#5A9BB5',
  Financial: '#6BAA8C',
  Intellectual: '#9688B5',
};

// ── Suggested Starter Goals ──────────────────────────────────────────────
const STARTER_GOALS = [
  { name: 'Daily Scripture Study', category: 'Spiritual', horizon: 'daily' as GoalHorizon },
  { name: 'Daily Exercise', category: 'Physical', horizon: 'daily' as GoalHorizon },
  { name: 'Quality Family Time', category: 'Family', horizon: 'daily' as GoalHorizon },
  { name: 'Daily Journal', category: 'Personal', horizon: 'daily' as GoalHorizon },
  { name: 'Weekly Date Night', category: 'Family', horizon: 'weekly' as GoalHorizon },
  { name: 'Read 30 Minutes', category: 'Intellectual', horizon: 'daily' as GoalHorizon },
  { name: 'Practice Gratitude', category: 'Emotional', horizon: 'daily' as GoalHorizon },
  { name: 'Stick to Budget', category: 'Financial', horizon: 'weekly' as GoalHorizon },
];

// ══════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════

export default function GoalsPage() {
  const { user } = useAuth();
  const [allGoals, setAllGoals] = useState<StoredGoal[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [goalCap, setGoalCapState] = useState(3);
  const [showSetup, setShowSetup] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showDreams, setShowDreams] = useState(false);
  const syncInit = useRef(false);

  const reload = useCallback(() => {
    setAllGoals(getGoals());
    setActiveIds(getActiveIds());
    setGoalCapState(getGoalCap());
  }, []);

  useEffect(() => {
    reload();
    const unsub = onGoalsChanged(reload);
    return unsub;
  }, [reload]);

  useEffect(() => {
    if (user?.id && !syncInit.current) {
      syncInit.current = true;
      setSupabaseSync(user.id, true);
      loadGoalsFromSupabase(user.id).then(reload);
    }
  }, [user, reload]);

  // Derived state
  const activeGoals = allGoals.filter(g => activeIds.includes(g.id));
  const lifetimeGoals = allGoals.filter(g => g.horizon === 'lifetime' && !g.is_completed);
  const completedLifetime = allGoals.filter(g => g.horizon === 'lifetime' && g.is_completed);
  const periodKey = getCurrentPeriodKey('daily');
  const weekKey = getCurrentPeriodKey('weekly');

  // Check-off counts for today
  const todayGoals = activeGoals.filter(g => g.horizon === 'daily');
  const weekGoals = activeGoals.filter(g => g.horizon === 'weekly');
  const todayChecked = todayGoals.filter(g => isGoalCheckedOff(g.id, periodKey)).length;
  const weekChecked = weekGoals.filter(g => isGoalCheckedOff(g.id, weekKey)).length;

  // Should we show the setup flow?
  const needsSetup = activeIds.length === 0 && !showAddGoal;

  // Can the user level up?
  const canLevelUp = goalCap < 7 && activeIds.length >= goalCap;

  const handleActivateGoal = (goalId: string) => {
    const ids = getActiveIds();
    if (ids.length >= goalCap) return;
    if (!ids.includes(goalId)) {
      const next = [...ids, goalId];
      saveActiveIds(next);
      setActiveIds(next);
    }
  };

  const handleDeactivateGoal = (goalId: string) => {
    const next = activeIds.filter(id => id !== goalId);
    saveActiveIds(next);
    setActiveIds(next);
  };

  const handleLevelUp = () => {
    const next = goalCap === 3 ? 5 : 7;
    saveGoalCap(next);
    setGoalCapState(next);
  };

  const handleCheckOff = (goal: StoredGoal) => {
    if (goal.horizon === 'daily' || goal.horizon === 'weekly' || goal.horizon === 'monthly') {
      toggleCheckOff(goal.id, goal.horizon);
    } else {
      toggleGoalComplete(goal.id);
    }
    reload();
  };

  // ── Setup Flow ───────────────────────────────────────────────────────
  if (needsSetup || showSetup) {
    return (
      <SetupFlow
        allGoals={allGoals}
        goalCap={goalCap}
        onComplete={(selectedIds) => {
          saveActiveIds(selectedIds);
          setActiveIds(selectedIds);
          setShowSetup(false);
        }}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  // ── Main View ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>Goals</h1>
          <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>
            {activeGoals.length} of {goalCap} active
          </p>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          className="text-xs font-medium px-3 py-1.5 rounded-full"
          style={{ backgroundColor: 'rgba(196, 154, 108, 0.12)', color: '#C49A6C' }}
        >
          Edit Goals
        </button>
      </div>

      {/* ── Today's Goals ───────────────────────────────────────────── */}
      {todayGoals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A938B' }}>
              Today
            </h2>
            <span className="text-xs font-semibold" style={{ color: todayChecked === todayGoals.length && todayGoals.length > 0 ? '#7BAF7E' : '#C49A6C' }}>
              {todayChecked}/{todayGoals.length}
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5 mb-4">
            {todayGoals.map(g => {
              const done = isGoalCheckedOff(g.id, periodKey);
              return (
                <div
                  key={g.id}
                  className="flex-1 h-1.5 rounded-full transition-all duration-300"
                  style={{ backgroundColor: done ? '#7BAF7E' : '#E8E3DD' }}
                />
              );
            })}
          </div>

          <div className="space-y-2">
            {todayGoals.map(g => (
              <ActiveGoalCard
                key={g.id}
                goal={g}
                checked={isGoalCheckedOff(g.id, periodKey)}
                onCheck={() => handleCheckOff(g)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── This Week's Goals ───────────────────────────────────────── */}
      {weekGoals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A938B' }}>
              This Week
            </h2>
            <span className="text-xs font-semibold" style={{ color: weekChecked === weekGoals.length && weekGoals.length > 0 ? '#7BAF7E' : '#C49A6C' }}>
              {weekChecked}/{weekGoals.length}
            </span>
          </div>
          <div className="space-y-2">
            {weekGoals.map(g => (
              <ActiveGoalCard
                key={g.id}
                goal={g}
                checked={isGoalCheckedOff(g.id, weekKey)}
                onCheck={() => handleCheckOff(g)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Monthly / Other active goals ────────────────────────────── */}
      {activeGoals.filter(g => g.horizon !== 'daily' && g.horizon !== 'weekly').length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9A938B' }}>
            Longer Term
          </h2>
          <div className="space-y-2">
            {activeGoals
              .filter(g => g.horizon !== 'daily' && g.horizon !== 'weekly')
              .map(g => {
                const pk = getCurrentPeriodKey(g.horizon);
                const done = g.horizon === 'lifetime' || g.horizon === 'yearly'
                  ? g.is_completed
                  : isGoalCheckedOff(g.id, pk);
                return (
                  <ActiveGoalCard
                    key={g.id}
                    goal={g}
                    checked={done}
                    onCheck={() => handleCheckOff(g)}
                    showProgress={g.horizon === 'lifetime' || g.horizon === 'yearly'}
                  />
                );
              })}
          </div>
        </section>
      )}

      {/* ── Add Goal / Level Up ──────────────────────────────────────── */}
      {activeIds.length < goalCap && (
        <button
          onClick={() => setShowAddGoal(true)}
          className="w-full py-3 rounded-2xl text-sm font-medium transition-all"
          style={{
            border: '2px dashed #E8E3DD',
            color: '#9A938B',
            backgroundColor: 'transparent',
          }}
        >
          + Add a goal ({activeIds.length}/{goalCap})
        </button>
      )}

      {canLevelUp && (
        <div
          className="rounded-2xl p-4 text-center"
          style={{ backgroundColor: 'rgba(123, 175, 126, 0.08)', border: '1px solid rgba(123, 175, 126, 0.2)' }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: '#1C1A17' }}>
            You&apos;re crushing it
          </p>
          <p className="text-xs mb-3" style={{ color: '#6B6560' }}>
            Ready to take on {goalCap === 3 ? '5' : '7'} goals?
          </p>
          <button
            onClick={handleLevelUp}
            className="text-xs font-semibold px-4 py-2 rounded-xl"
            style={{ backgroundColor: '#7BAF7E', color: '#FFFFFF' }}
          >
            Level Up to {goalCap === 3 ? 5 : 7} Goals
          </button>
        </div>
      )}

      {/* ── Dreams & Milestones ──────────────────────────────────────── */}
      {lifetimeGoals.length > 0 && (
        <section>
          <button
            onClick={() => setShowDreams(!showDreams)}
            className="flex items-center justify-between w-full py-2"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A938B' }}>
              Dreams & Milestones
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: '#C5BFB8' }}>
                {completedLifetime.length}/{lifetimeGoals.length + completedLifetime.length}
              </span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="#9A938B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showDreams ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {showDreams && (
            <div className="space-y-2 mt-2">
              {lifetimeGoals.map(g => (
                <DreamCard key={g.id} goal={g} onToggle={reload} />
              ))}
              {completedLifetime.length > 0 && (
                <>
                  <p className="text-[10px] font-medium pt-2" style={{ color: '#7BAF7E' }}>
                    Achieved
                  </p>
                  {completedLifetime.map(g => (
                    <DreamCard key={g.id} goal={g} onToggle={reload} />
                  ))}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Add Goal Modal ──────────────────────────────────────────── */}
      {showAddGoal && (
        <AddGoalSheet
          allGoals={allGoals}
          activeIds={activeIds}
          goalCap={goalCap}
          onAdd={(goalId) => {
            handleActivateGoal(goalId);
          }}
          onAddNew={(name, category, horizon) => {
            const newGoal = addGoal({ name, category_name: category, horizon, weight: 1.0 });
            handleActivateGoal(newGoal.id);
            reload();
          }}
          onClose={() => setShowAddGoal(false)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Active Goal Card
// ══════════════════════════════════════════════════════════════════════════

function ActiveGoalCard({
  goal,
  checked,
  onCheck,
  showProgress = false,
}: {
  goal: StoredGoal;
  checked: boolean;
  onCheck: () => void;
  showProgress?: boolean;
}) {
  return (
    <button
      onClick={onCheck}
      className="w-full rounded-2xl p-4 transition-all active:scale-[0.98]"
      style={{
        backgroundColor: checked ? 'rgba(123, 175, 126, 0.06)' : '#FFFFFF',
        border: `1px solid ${checked ? 'rgba(123, 175, 126, 0.25)' : '#E8E3DD'}`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Check circle */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            border: `2px solid ${checked ? '#7BAF7E' : '#D4D0CB'}`,
            backgroundColor: checked ? 'rgba(123, 175, 126, 0.15)' : 'transparent',
          }}
        >
          {checked && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7BAF7E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        {/* Goal info */}
        <div className="flex-1 min-w-0 text-left">
          <span
            className={`text-sm font-medium block ${checked ? 'line-through' : ''}`}
            style={{ color: checked ? '#9A938B' : '#1C1A17' }}
          >
            {goal.name}
          </span>
          {showProgress && goal.progress_pct > 0 && goal.progress_pct < 100 && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${goal.progress_pct}%`, backgroundColor: goal.category_color }}
                />
              </div>
              <span className="text-[10px] font-medium" style={{ color: '#9A938B' }}>
                {Math.round(goal.progress_pct)}%
              </span>
            </div>
          )}
        </div>

        {/* Category dot */}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: goal.category_color || '#C49A6C' }}
        />
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Dream / Lifetime Goal Card
// ══════════════════════════════════════════════════════════════════════════

function DreamCard({ goal, onToggle }: { goal: StoredGoal; onToggle: () => void }) {
  return (
    <div
      className="rounded-2xl p-3.5 transition-all"
      style={{
        backgroundColor: goal.is_completed ? 'rgba(123, 175, 126, 0.04)' : '#FFFFFF',
        border: `1px solid ${goal.is_completed ? 'rgba(123, 175, 126, 0.2)' : '#E8E3DD'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: goal.category_color }}
        />
        <span
          className={`text-sm flex-1 ${goal.is_completed ? 'line-through' : ''}`}
          style={{ color: goal.is_completed ? '#9A938B' : '#1C1A17' }}
        >
          {goal.name}
        </span>
        {goal.is_completed && goal.completed_at && (
          <span className="text-[10px] flex-shrink-0" style={{ color: '#7BAF7E' }}>
            {new Date(goal.completed_at).getFullYear()}
          </span>
        )}
      </div>
      {!goal.is_completed && goal.progress_pct > 0 && (
        <div className="flex items-center gap-2 mt-2 ml-5">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${goal.progress_pct}%`, backgroundColor: goal.category_color }}
            />
          </div>
          <span className="text-[10px]" style={{ color: '#9A938B' }}>
            {Math.round(goal.progress_pct)}%
          </span>
        </div>
      )}
      {!goal.is_completed && goal.target_date && (
        <p className="text-[10px] mt-1 ml-5" style={{ color: '#C5BFB8' }}>
          Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Setup Flow — Pick your first 3 goals
// ══════════════════════════════════════════════════════════════════════════

function SetupFlow({
  allGoals,
  goalCap,
  onComplete,
  onCancel,
}: {
  allGoals: StoredGoal[];
  goalCap: number;
  onComplete: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Personal');
  const [customHorizon, setCustomHorizon] = useState<GoalHorizon>('daily');
  const [showCustom, setShowCustom] = useState(false);

  // Build suggested goals — mix of starters + existing goals from store
  const existingDaily = allGoals.filter(g => g.horizon === 'daily').slice(0, 6);
  const existingWeekly = allGoals.filter(g => g.horizon === 'weekly').slice(0, 4);

  // Combine starters with existing, deduplicate by name
  const suggestions: { id: string; name: string; category: string; color: string; horizon: GoalHorizon }[] = [];
  const seen = new Set<string>();

  for (const s of STARTER_GOALS) {
    const existing = allGoals.find(g => g.name.toLowerCase() === s.name.toLowerCase());
    const key = s.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push({
        id: existing?.id || `starter-${key}`,
        name: s.name,
        category: s.category,
        color: CATEGORY_COLORS[s.category] || '#6B6560',
        horizon: s.horizon,
      });
    }
  }

  for (const g of [...existingDaily, ...existingWeekly]) {
    const key = g.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push({
        id: g.id,
        name: g.name,
        category: g.category_name,
        color: g.category_color,
        horizon: g.horizon,
      });
    }
  }

  const handleToggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < goalCap) {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const newGoal = addGoal({
      name: customName.trim(),
      category_name: customCategory,
      horizon: customHorizon,
      weight: 1.0,
    });
    suggestions.push({
      id: newGoal.id,
      name: newGoal.name,
      category: newGoal.category_name,
      color: newGoal.category_color,
      horizon: newGoal.horizon,
    });
    setSelected(prev => {
      const next = new Set(prev);
      if (next.size < goalCap) next.add(newGoal.id);
      return next;
    });
    setCustomName('');
    setShowCustom(false);
  };

  const handleComplete = () => {
    // Ensure all selected goals exist in the store
    const existing = new Set(allGoals.map(g => g.id));
    for (const id of selected) {
      if (!existing.has(id)) {
        const s = suggestions.find(sg => sg.id === id);
        if (s) {
          const newGoal = addGoal({ name: s.name, category_name: s.category, horizon: s.horizon, weight: 1.0 });
          selected.delete(id);
          selected.add(newGoal.id);
        }
      }
    }
    onComplete(Array.from(selected));
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>
          Choose Your Goals
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6B6560' }}>
          Pick {goalCap} things to focus on. Start small — you can always add more once these become habit.
        </p>
      </div>

      {/* Selection count */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {Array.from({ length: goalCap }).map((_, i) => (
            <div
              key={i}
              className="w-8 h-1.5 rounded-full transition-all"
              style={{ backgroundColor: i < selected.size ? '#C49A6C' : '#E8E3DD' }}
            />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color: '#9A938B' }}>
          {selected.size}/{goalCap} selected
        </span>
      </div>

      {/* Suggested goals */}
      <div className="space-y-2">
        {suggestions.map(s => {
          const isSelected = selected.has(s.id);
          const disabled = !isSelected && selected.size >= goalCap;
          return (
            <button
              key={s.id}
              onClick={() => !disabled && handleToggle(s.id)}
              className="w-full rounded-2xl p-4 transition-all active:scale-[0.98]"
              style={{
                backgroundColor: isSelected ? 'rgba(196, 154, 108, 0.08)' : '#FFFFFF',
                border: `1.5px solid ${isSelected ? '#C49A6C' : '#E8E3DD'}`,
                opacity: disabled ? 0.4 : 1,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Selection indicator */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    border: `2px solid ${isSelected ? '#C49A6C' : '#D4D0CB'}`,
                    backgroundColor: isSelected ? '#C49A6C' : 'transparent',
                  }}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <span className="text-sm font-medium" style={{ color: '#1C1A17' }}>{s.name}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                    {s.category}
                  </span>
                  <span className="text-[10px]" style={{ color: '#C5BFB8' }}>
                    {s.horizon === 'daily' ? 'Daily' : s.horizon === 'weekly' ? 'Weekly' : s.horizon}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Add custom goal */}
      {showCustom ? (
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder="What do you want to accomplish?"
            className="w-full text-sm px-0 py-1 focus:outline-none"
            style={{ color: '#1C1A17', borderBottom: '1px solid #E8E3DD' }}
            autoFocus
          />
          <div className="flex gap-2">
            <select
              value={customCategory}
              onChange={e => setCustomCategory(e.target.value)}
              className="flex-1 text-xs rounded-lg px-3 py-2"
              style={{ backgroundColor: '#FAF8F5', color: '#6B6560', border: '1px solid #E8E3DD' }}
            >
              {Object.keys(CATEGORY_COLORS).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={customHorizon}
              onChange={e => setCustomHorizon(e.target.value as GoalHorizon)}
              className="text-xs rounded-lg px-3 py-2"
              style={{ backgroundColor: '#FAF8F5', color: '#6B6560', border: '1px solid #E8E3DD' }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCustom}
              disabled={!customName.trim()}
              className="flex-1 text-sm font-semibold py-2 rounded-xl disabled:opacity-40"
              style={{ backgroundColor: '#C49A6C', color: '#FFFFFF' }}
            >
              Add Goal
            </button>
            <button
              onClick={() => setShowCustom(false)}
              className="text-sm px-4 py-2 rounded-xl"
              style={{ color: '#9A938B' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          className="w-full py-3 rounded-2xl text-sm font-medium"
          style={{ border: '2px dashed #E8E3DD', color: '#9A938B' }}
        >
          + Create a custom goal
        </button>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleComplete}
          disabled={selected.size === 0}
          className="flex-1 py-3.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ backgroundColor: '#C49A6C', color: '#FFFFFF' }}
        >
          {selected.size === goalCap
            ? 'Set My Goals'
            : selected.size > 0
              ? `Set ${selected.size} Goal${selected.size > 1 ? 's' : ''}`
              : 'Select goals above'
          }
        </button>
        {allGoals.length > 0 && (
          <button
            onClick={onCancel}
            className="px-4 py-3.5 rounded-2xl text-sm"
            style={{ color: '#9A938B', border: '1px solid #E8E3DD' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Add Goal Sheet — pick from existing or create new
// ══════════════════════════════════════════════════════════════════════════

function AddGoalSheet({
  allGoals,
  activeIds,
  goalCap,
  onAdd,
  onAddNew,
  onClose,
}: {
  allGoals: StoredGoal[];
  activeIds: string[];
  goalCap: number;
  onAdd: (goalId: string) => void;
  onAddNew: (name: string, category: string, horizon: GoalHorizon) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Personal');
  const [newHorizon, setNewHorizon] = useState<GoalHorizon>('daily');

  const availableGoals = allGoals.filter(g =>
    !activeIds.includes(g.id) &&
    g.horizon !== 'lifetime' &&
    g.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 15);

  const slotsLeft = goalCap - activeIds.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto"
        style={{ backgroundColor: '#FAF8F5' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: '#E8E3DD' }} />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: '#1C1A17' }}>
            Add a Goal
          </h3>
          <span className="text-xs" style={{ color: '#9A938B' }}>
            {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} left
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search existing goals..."
          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none mb-3"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD', color: '#1C1A17' }}
        />

        {/* Existing goals */}
        <div className="space-y-1.5 mb-4">
          {availableGoals.map(g => (
            <button
              key={g.id}
              onClick={() => { onAdd(g.id); onClose(); }}
              className="w-full flex items-center gap-3 rounded-xl p-3 transition-all active:scale-[0.98]"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.category_color }} />
              <span className="text-sm flex-1 text-left" style={{ color: '#1C1A17' }}>{g.name}</span>
              <span className="text-[10px]" style={{ color: '#C5BFB8' }}>{g.horizon}</span>
            </button>
          ))}
        </div>

        {/* Create new */}
        {showCreate ? (
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Goal name"
              className="w-full text-sm px-0 py-1 focus:outline-none"
              style={{ color: '#1C1A17', borderBottom: '1px solid #E8E3DD' }}
              autoFocus
            />
            <div className="flex gap-2">
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="flex-1 text-xs rounded-lg px-3 py-2"
                style={{ backgroundColor: '#FAF8F5', color: '#6B6560', border: '1px solid #E8E3DD' }}
              >
                {Object.keys(CATEGORY_COLORS).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={newHorizon}
                onChange={e => setNewHorizon(e.target.value as GoalHorizon)}
                className="text-xs rounded-lg px-3 py-2"
                style={{ backgroundColor: '#FAF8F5', color: '#6B6560', border: '1px solid #E8E3DD' }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <button
              onClick={() => {
                if (newName.trim()) {
                  onAddNew(newName.trim(), newCategory, newHorizon);
                  onClose();
                }
              }}
              disabled={!newName.trim()}
              className="w-full text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40"
              style={{ backgroundColor: '#C49A6C', color: '#FFFFFF' }}
            >
              Create & Activate
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{ border: '2px dashed #E8E3DD', color: '#9A938B' }}
          >
            + Create new goal
          </button>
        )}
      </div>
    </div>
  );
}
