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

// ── The 3 Universal Starter Goals ────────────────────────────────────────
// These are the foundational habits everyone should build first.
const TOP_THREE = [
  {
    name: 'Daily Exercise',
    category: 'Physical',
    horizon: 'daily' as GoalHorizon,
    description: 'Move your body for at least 30 minutes',
    icon: '💪',
  },
  {
    name: 'Sleep 7+ Hours',
    category: 'Physical',
    horizon: 'daily' as GoalHorizon,
    description: 'Protect your rest — in bed with time to get 7+ hours',
    icon: '😴',
  },
  {
    name: 'Daily Reflection',
    category: 'Personal',
    horizon: 'daily' as GoalHorizon,
    description: 'Journal, meditate, pray, or reflect on your day',
    icon: '📝',
  },
];

// ── More Suggestions (shown when user scrolls / taps "see more") ────────
const MORE_SUGGESTIONS = [
  { name: 'Scripture Study', category: 'Spiritual', horizon: 'daily' as GoalHorizon },
  { name: 'Quality Family Time', category: 'Family', horizon: 'daily' as GoalHorizon },
  { name: 'Drink 8 Glasses of Water', category: 'Physical', horizon: 'daily' as GoalHorizon },
  { name: 'Read 30 Minutes', category: 'Intellectual', horizon: 'daily' as GoalHorizon },
  { name: 'Practice Gratitude', category: 'Emotional', horizon: 'daily' as GoalHorizon },
  { name: 'Weekly Date Night', category: 'Family', horizon: 'weekly' as GoalHorizon },
  { name: 'Meal Prep / Eat Healthy', category: 'Physical', horizon: 'daily' as GoalHorizon },
  { name: 'Stick to Budget', category: 'Financial', horizon: 'weekly' as GoalHorizon },
  { name: 'No Phone Before Bed', category: 'Personal', horizon: 'daily' as GoalHorizon },
  { name: 'Practice Patience', category: 'Emotional', horizon: 'daily' as GoalHorizon },
  { name: 'Language Study', category: 'Intellectual', horizon: 'daily' as GoalHorizon },
  { name: 'Church Attendance', category: 'Spiritual', horizon: 'weekly' as GoalHorizon },
  { name: 'Serve Someone', category: 'Emotional', horizon: 'daily' as GoalHorizon },
  { name: 'Daily Stretching', category: 'Physical', horizon: 'daily' as GoalHorizon },
  { name: 'Save 20% of Income', category: 'Financial', horizon: 'monthly' as GoalHorizon },
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

  const todayGoals = activeGoals.filter(g => g.horizon === 'daily');
  const weekGoals = activeGoals.filter(g => g.horizon === 'weekly');
  const todayChecked = todayGoals.filter(g => isGoalCheckedOff(g.id, periodKey)).length;
  const weekChecked = weekGoals.filter(g => isGoalCheckedOff(g.id, weekKey)).length;

  const needsSetup = activeIds.length === 0 && !showAddGoal;
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
        reload={reload}
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

      {/* ── Today ───────────────────────────────────────────────────── */}
      {todayGoals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A938B' }}>Today</h2>
            <span className="text-xs font-semibold" style={{ color: todayChecked === todayGoals.length ? '#7BAF7E' : '#C49A6C' }}>
              {todayChecked}/{todayGoals.length}
            </span>
          </div>
          <div className="flex gap-1.5 mb-4">
            {todayGoals.map(g => (
              <div key={g.id} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                style={{ backgroundColor: isGoalCheckedOff(g.id, periodKey) ? '#7BAF7E' : '#E8E3DD' }} />
            ))}
          </div>
          <div className="space-y-2">
            {todayGoals.map(g => (
              <ActiveGoalCard key={g.id} goal={g} checked={isGoalCheckedOff(g.id, periodKey)} onCheck={() => handleCheckOff(g)} />
            ))}
          </div>
        </section>
      )}

      {/* ── This Week ───────────────────────────────────────────────── */}
      {weekGoals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A938B' }}>This Week</h2>
            <span className="text-xs font-semibold" style={{ color: weekChecked === weekGoals.length ? '#7BAF7E' : '#C49A6C' }}>
              {weekChecked}/{weekGoals.length}
            </span>
          </div>
          <div className="space-y-2">
            {weekGoals.map(g => (
              <ActiveGoalCard key={g.id} goal={g} checked={isGoalCheckedOff(g.id, weekKey)} onCheck={() => handleCheckOff(g)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Other active ────────────────────────────────────────────── */}
      {activeGoals.filter(g => g.horizon !== 'daily' && g.horizon !== 'weekly').length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9A938B' }}>Longer Term</h2>
          <div className="space-y-2">
            {activeGoals.filter(g => g.horizon !== 'daily' && g.horizon !== 'weekly').map(g => {
              const pk = getCurrentPeriodKey(g.horizon);
              const done = g.horizon === 'lifetime' || g.horizon === 'yearly' ? g.is_completed : isGoalCheckedOff(g.id, pk);
              return <ActiveGoalCard key={g.id} goal={g} checked={done} onCheck={() => handleCheckOff(g)} showProgress={g.horizon === 'lifetime' || g.horizon === 'yearly'} />;
            })}
          </div>
        </section>
      )}

      {/* ── Add / Level Up ──────────────────────────────────────────── */}
      {activeIds.length < goalCap && (
        <button onClick={() => setShowAddGoal(true)}
          className="w-full py-3 rounded-2xl text-sm font-medium"
          style={{ border: '2px dashed #E8E3DD', color: '#9A938B' }}>
          + Add a goal ({activeIds.length}/{goalCap})
        </button>
      )}

      {canLevelUp && (
        <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'rgba(123, 175, 126, 0.08)', border: '1px solid rgba(123, 175, 126, 0.2)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: '#1C1A17' }}>You&apos;re crushing it</p>
          <p className="text-xs mb-3" style={{ color: '#6B6560' }}>Ready to take on {goalCap === 3 ? '5' : '7'} goals?</p>
          <button onClick={handleLevelUp} className="text-xs font-semibold px-4 py-2 rounded-xl" style={{ backgroundColor: '#7BAF7E', color: '#FFFFFF' }}>
            Level Up to {goalCap === 3 ? 5 : 7} Goals
          </button>
        </div>
      )}

      {/* ── Dreams & Milestones ──────────────────────────────────────── */}
      {lifetimeGoals.length > 0 && (
        <section>
          <button onClick={() => setShowDreams(!showDreams)} className="flex items-center justify-between w-full py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A938B' }}>Dreams & Milestones</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: '#C5BFB8' }}>{completedLifetime.length}/{lifetimeGoals.length + completedLifetime.length}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9A938B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showDreams ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>
          {showDreams && (
            <div className="space-y-2 mt-2">
              {lifetimeGoals.map(g => <DreamCard key={g.id} goal={g} onToggle={reload} />)}
              {completedLifetime.length > 0 && (
                <>
                  <p className="text-[10px] font-medium pt-2" style={{ color: '#7BAF7E' }}>Achieved</p>
                  {completedLifetime.map(g => <DreamCard key={g.id} goal={g} onToggle={reload} />)}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Add Goal Sheet ──────────────────────────────────────────── */}
      {showAddGoal && (
        <AddGoalSheet
          allGoals={allGoals}
          activeIds={activeIds}
          goalCap={goalCap}
          onAdd={(goalId) => handleActivateGoal(goalId)}
          onAddNew={(name, category, horizon) => {
            const ng = addGoal({ name, category_name: category, horizon, weight: 1.0 });
            handleActivateGoal(ng.id);
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

function ActiveGoalCard({ goal, checked, onCheck, showProgress = false }: {
  goal: StoredGoal; checked: boolean; onCheck: () => void; showProgress?: boolean;
}) {
  return (
    <button onClick={onCheck} className="w-full rounded-2xl p-4 transition-all active:scale-[0.98]"
      style={{ backgroundColor: checked ? 'rgba(123, 175, 126, 0.06)' : '#FFFFFF', border: `1px solid ${checked ? 'rgba(123, 175, 126, 0.25)' : '#E8E3DD'}` }}>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
          style={{ border: `2px solid ${checked ? '#7BAF7E' : '#D4D0CB'}`, backgroundColor: checked ? 'rgba(123, 175, 126, 0.15)' : 'transparent' }}>
          {checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7BAF7E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <span className={`text-sm font-medium block ${checked ? 'line-through' : ''}`} style={{ color: checked ? '#9A938B' : '#1C1A17' }}>{goal.name}</span>
          {showProgress && goal.progress_pct > 0 && goal.progress_pct < 100 && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
                <div className="h-full rounded-full" style={{ width: `${goal.progress_pct}%`, backgroundColor: goal.category_color }} />
              </div>
              <span className="text-[10px] font-medium" style={{ color: '#9A938B' }}>{Math.round(goal.progress_pct)}%</span>
            </div>
          )}
        </div>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: goal.category_color || '#C49A6C' }} />
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Dream Card
// ══════════════════════════════════════════════════════════════════════════

function DreamCard({ goal, onToggle }: { goal: StoredGoal; onToggle: () => void }) {
  return (
    <div className="rounded-2xl p-3.5" style={{ backgroundColor: goal.is_completed ? 'rgba(123, 175, 126, 0.04)' : '#FFFFFF', border: `1px solid ${goal.is_completed ? 'rgba(123, 175, 126, 0.2)' : '#E8E3DD'}` }}>
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: goal.category_color }} />
        <span className={`text-sm flex-1 ${goal.is_completed ? 'line-through' : ''}`} style={{ color: goal.is_completed ? '#9A938B' : '#1C1A17' }}>{goal.name}</span>
        {goal.is_completed && goal.completed_at && <span className="text-[10px] flex-shrink-0" style={{ color: '#7BAF7E' }}>{new Date(goal.completed_at).getFullYear()}</span>}
      </div>
      {!goal.is_completed && goal.progress_pct > 0 && (
        <div className="flex items-center gap-2 mt-2 ml-5">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
            <div className="h-full rounded-full" style={{ width: `${goal.progress_pct}%`, backgroundColor: goal.category_color }} />
          </div>
          <span className="text-[10px]" style={{ color: '#9A938B' }}>{Math.round(goal.progress_pct)}%</span>
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
// Setup Flow — Top 3, then more suggestions, then AI chat
// ══════════════════════════════════════════════════════════════════════════

function SetupFlow({ allGoals, goalCap, onComplete, onCancel, reload }: {
  allGoals: StoredGoal[]; goalCap: number;
  onComplete: (ids: string[]) => void; onCancel: () => void; reload: () => void;
}) {
  const [selected, setSelected] = useState<Map<string, { name: string; category: string; horizon: GoalHorizon }>>(new Map());
  const [showMore, setShowMore] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const atCap = selected.size >= goalCap;

  const handleToggle = (key: string, name: string, category: string, horizon: GoalHorizon) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < goalCap) {
        next.set(key, { name, category, horizon });
      }
      return next;
    });
  };

  const handleComplete = () => {
    const ids: string[] = [];
    for (const [key, info] of selected) {
      // Check if this goal already exists in the store
      const existing = allGoals.find(g => g.name.toLowerCase() === info.name.toLowerCase());
      if (existing) {
        ids.push(existing.id);
      } else {
        const ng = addGoal({ name: info.name, category_name: info.category, horizon: info.horizon, weight: 1.0 });
        ids.push(ng.id);
      }
    }
    reload();
    onComplete(ids);
  };

  const handleAIGoals = (goals: { name: string; category: string; horizon: GoalHorizon }[]) => {
    setSelected(prev => {
      const next = new Map(prev);
      for (const g of goals) {
        if (next.size >= goalCap) break;
        const key = g.name.toLowerCase();
        if (!next.has(key)) {
          next.set(key, g);
        }
      }
      return next;
    });
    setShowChat(false);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>Choose Your Goals</h1>
        <p className="text-sm mt-1" style={{ color: '#6B6560' }}>
          Start with {goalCap}. Master these before adding more.
        </p>
      </div>

      {/* Selection indicator */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {Array.from({ length: goalCap }).map((_, i) => (
            <div key={i} className="w-8 h-1.5 rounded-full transition-all duration-300"
              style={{ backgroundColor: i < selected.size ? '#C49A6C' : '#E8E3DD' }} />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color: '#9A938B' }}>{selected.size}/{goalCap}</span>
      </div>

      {/* ── Top 3 Recommended ─────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#9A938B' }}>
          Recommended to Start
        </h2>
        <div className="space-y-2">
          {TOP_THREE.map(s => {
            const key = s.name.toLowerCase();
            const isSelected = selected.has(key);
            const disabled = !isSelected && atCap;
            return (
              <button key={key} onClick={() => !disabled && handleToggle(key, s.name, s.category, s.horizon)}
                className="w-full rounded-2xl p-4 transition-all active:scale-[0.98]"
                style={{ backgroundColor: isSelected ? 'rgba(196, 154, 108, 0.08)' : '#FFFFFF',
                  border: `1.5px solid ${isSelected ? '#C49A6C' : '#E8E3DD'}`, opacity: disabled ? 0.4 : 1 }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${CATEGORY_COLORS[s.category]}12` }}>
                    {s.icon}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-sm font-semibold block" style={{ color: '#1C1A17' }}>{s.name}</span>
                    <span className="text-[11px] block mt-0.5" style={{ color: '#9A938B' }}>{s.description}</span>
                  </div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: `2px solid ${isSelected ? '#C49A6C' : '#D4D0CB'}`, backgroundColor: isSelected ? '#C49A6C' : 'transparent' }}>
                    {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── More Suggestions ──────────────────────────────────────── */}
      <section>
        <button onClick={() => setShowMore(!showMore)} className="flex items-center gap-2 w-full py-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9A938B' }}>
            More Ideas
          </h2>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9A938B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showMore && (
          <div className="space-y-1.5 mt-3 max-h-[40vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            {MORE_SUGGESTIONS.map(s => {
              const key = s.name.toLowerCase();
              const isSelected = selected.has(key);
              const disabled = !isSelected && atCap;
              return (
                <button key={key} onClick={() => !disabled && handleToggle(key, s.name, s.category, s.horizon)}
                  className="w-full rounded-xl p-3 transition-all active:scale-[0.98] flex items-center gap-3"
                  style={{ backgroundColor: isSelected ? 'rgba(196, 154, 108, 0.08)' : '#FFFFFF',
                    border: `1px solid ${isSelected ? '#C49A6C' : '#E8E3DD'}`, opacity: disabled ? 0.4 : 1 }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: `2px solid ${isSelected ? '#C49A6C' : '#D4D0CB'}`, backgroundColor: isSelected ? '#C49A6C' : 'transparent' }}>
                    {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  </div>
                  <span className="text-sm flex-1 text-left" style={{ color: '#1C1A17' }}>{s.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `${CATEGORY_COLORS[s.category] || '#6B6560'}15`, color: CATEGORY_COLORS[s.category] || '#6B6560' }}>
                    {s.category}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ backgroundColor: '#E8E3DD' }} />
        <span className="text-xs font-medium" style={{ color: '#C5BFB8' }}>or</span>
        <div className="flex-1 h-px" style={{ backgroundColor: '#E8E3DD' }} />
      </div>

      {/* ── AI Chat for Custom Goals ──────────────────────────────── */}
      {showChat ? (
        <GoalChatAssistant
          goalCap={goalCap}
          currentCount={selected.size}
          onGoalsSuggested={handleAIGoals}
          onClose={() => setShowChat(false)}
        />
      ) : (
        <button onClick={() => setShowChat(true)}
          className="w-full rounded-2xl p-4 transition-all active:scale-[0.98] flex items-center gap-3"
          style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E8E3DD' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(196, 154, 108, 0.12)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C49A6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <span className="text-sm font-semibold block" style={{ color: '#1C1A17' }}>Chat with AI</span>
            <span className="text-[11px] block mt-0.5" style={{ color: '#9A938B' }}>Describe what you want to work on and get personalized goals</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C5BFB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* ── Set Goals Button ──────────────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleComplete} disabled={selected.size === 0}
          className="flex-1 py-3.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ backgroundColor: '#C49A6C', color: '#FFFFFF' }}>
          {selected.size === goalCap ? 'Set My Goals' : selected.size > 0 ? `Set ${selected.size} Goal${selected.size > 1 ? 's' : ''}` : 'Select goals above'}
        </button>
        {allGoals.length > 0 && (
          <button onClick={onCancel} className="px-4 py-3.5 rounded-2xl text-sm" style={{ color: '#9A938B', border: '1px solid #E8E3DD' }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// AI Goal Chat Assistant — dedicated endpoint, shows goal cards inline
// ══════════════════════════════════════════════════════════════════════════

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  goals?: { name: string; category: string; horizon: GoalHorizon; why?: string }[];
}

function GoalChatAssistant({ goalCap, currentCount, onGoalsSuggested, onClose }: {
  goalCap: number; currentCount: number;
  onGoalsSuggested: (goals: { name: string; category: string; horizon: GoalHorizon }[]) => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: "What do you want to work on? Tell me about your health, relationships, career, faith, finances — anything — and I'll suggest specific goals for you." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/goals-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationHistory }),
      });

      const data = await res.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.message || "Could you tell me more about what you'd like to improve?",
        goals: data.goals?.length > 0 ? data.goals : undefined,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Sorry, I couldn't connect right now. Try again in a moment.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #E8E3DD' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(196, 154, 108, 0.15)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C49A6C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: '#1C1A17' }}>Goal Assistant</span>
        </div>
        <button onClick={onClose} className="text-xs font-medium px-3 py-1.5 rounded-full"
          style={{ color: '#9A938B', backgroundColor: '#F0EDE8' }}>
          Close
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="px-4 py-4 space-y-4 max-h-[50vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%] rounded-2xl px-4 py-3"
                style={{
                  backgroundColor: m.role === 'user' ? '#C49A6C' : '#F0EDE8',
                  color: m.role === 'user' ? '#FFFFFF' : '#1C1A17',
                  borderBottomRightRadius: m.role === 'user' ? '6px' : undefined,
                  borderBottomLeftRadius: m.role === 'assistant' ? '6px' : undefined,
                }}>
                <p className="text-sm leading-relaxed">{m.text}</p>
              </div>
            </div>

            {/* Suggested goals as tappable cards */}
            {m.goals && m.goals.length > 0 && (
              <div className="mt-2.5 space-y-2 ml-1">
                {m.goals.map((g, j) => (
                  <button key={j} onClick={() => onGoalsSuggested([g])}
                    className="w-full rounded-xl p-3.5 transition-all active:scale-[0.98] text-left"
                    style={{ backgroundColor: 'rgba(196, 154, 108, 0.06)', border: '1px solid rgba(196, 154, 108, 0.25)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(196, 154, 108, 0.15)' }}>
                        <span className="text-xs font-bold" style={{ color: '#C49A6C' }}>+</span>
                      </div>
                      <span className="text-sm font-semibold flex-1" style={{ color: '#1C1A17' }}>{g.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `${CATEGORY_COLORS[g.category] || '#6B6560'}15`, color: CATEGORY_COLORS[g.category] || '#6B6560' }}>
                        {g.category}
                      </span>
                    </div>
                    {g.why && (
                      <p className="text-[11px] mt-1.5 ml-[34px]" style={{ color: '#9A938B' }}>{g.why}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-5 py-3.5" style={{ backgroundColor: '#F0EDE8', borderBottomLeftRadius: '6px' }}>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#C49A6C', animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#C49A6C', animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#C49A6C', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid #E8E3DD' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="I want to work on..."
          className="flex-1 text-sm px-4 py-2.5 rounded-xl focus:outline-none"
          style={{ backgroundColor: '#FAF8F5', color: '#1C1A17', border: '1px solid #E8E3DD' }}
        />
        <button onClick={handleSend} disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-30"
          style={{ backgroundColor: '#C49A6C' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Add Goal Sheet
// ══════════════════════════════════════════════════════════════════════════

function AddGoalSheet({ allGoals, activeIds, goalCap, onAdd, onAddNew, onClose }: {
  allGoals: StoredGoal[]; activeIds: string[]; goalCap: number;
  onAdd: (goalId: string) => void;
  onAddNew: (name: string, category: string, horizon: GoalHorizon) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Personal');
  const [newHorizon, setNewHorizon] = useState<GoalHorizon>('daily');

  const available = allGoals.filter(g =>
    !activeIds.includes(g.id) && g.horizon !== 'lifetime' &&
    g.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 15);

  const slotsLeft = goalCap - activeIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: '#FAF8F5' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: '#E8E3DD' }} />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ color: '#1C1A17' }}>Add a Goal</h3>
          <span className="text-xs" style={{ color: '#9A938B' }}>{slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} left</span>
        </div>

        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search existing goals..."
          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none mb-3"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD', color: '#1C1A17' }} />

        <div className="space-y-1.5 mb-4">
          {available.map(g => (
            <button key={g.id} onClick={() => { onAdd(g.id); onClose(); }}
              className="w-full flex items-center gap-3 rounded-xl p-3 transition-all active:scale-[0.98]"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.category_color }} />
              <span className="text-sm flex-1 text-left" style={{ color: '#1C1A17' }}>{g.name}</span>
              <span className="text-[10px]" style={{ color: '#C5BFB8' }}>{g.horizon}</span>
            </button>
          ))}
        </div>

        {showCreate ? (
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Goal name"
              className="w-full text-sm px-0 py-1 focus:outline-none" style={{ color: '#1C1A17', borderBottom: '1px solid #E8E3DD' }} autoFocus />
            <div className="flex gap-2">
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                className="flex-1 text-xs rounded-lg px-3 py-2" style={{ backgroundColor: '#FAF8F5', color: '#6B6560', border: '1px solid #E8E3DD' }}>
                {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={newHorizon} onChange={e => setNewHorizon(e.target.value as GoalHorizon)}
                className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: '#FAF8F5', color: '#6B6560', border: '1px solid #E8E3DD' }}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <button onClick={() => { if (newName.trim()) { onAddNew(newName.trim(), newCategory, newHorizon); onClose(); } }}
              disabled={!newName.trim()} className="w-full text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40"
              style={{ backgroundColor: '#C49A6C', color: '#FFFFFF' }}>
              Create & Activate
            </button>
          </div>
        ) : (
          <button onClick={() => setShowCreate(true)} className="w-full py-3 rounded-xl text-sm font-medium"
            style={{ border: '2px dashed #E8E3DD', color: '#9A938B' }}>
            + Create new goal
          </button>
        )}
      </div>
    </div>
  );
}
