'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getGoals,
  onGoalsChanged,
  toggleCheckOff,
  isGoalCheckedOff,
  getCurrentPeriodKey,
  getPeriodLabel,
  toggleGoalComplete,
  setGoalProgress,
  setSupabaseSync,
  loadGoalsFromSupabase,
  type StoredGoal,
  type GoalHorizon,
} from '@/lib/goalsStore';
import { useAuth } from '@/lib/AuthContext';

const HORIZONS: { key: GoalHorizon; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'lifetime', label: 'Lifetime' },
];

export default function GoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<StoredGoal[]>([]);
  const [horizon, setHorizon] = useState<GoalHorizon>('daily');
  const [, setTick] = useState(0); // force re-render on check-off changes
  const syncInitialized = useRef(false);

  const reload = useCallback(() => {
    setGoals(getGoals());
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    reload();
    const unsub = onGoalsChanged(reload);
    return unsub;
  }, [reload]);

  // Initialize Supabase sync for authenticated users
  useEffect(() => {
    if (user?.id && !syncInitialized.current) {
      syncInitialized.current = true;
      setSupabaseSync(user.id, true);
      loadGoalsFromSupabase(user.id).then(() => {
        reload();
      });
    }
  }, [user, reload]);

  const horizonGoals = goals.filter(g => g.horizon === horizon);
  const isRecurring = horizon !== 'lifetime' && horizon !== 'yearly';
  const periodKey = getCurrentPeriodKey(horizon);
  const periodLabel = getPeriodLabel(horizon);

  // Count check-offs for recurring goals
  const checkedCount = isRecurring
    ? horizonGoals.filter(g => isGoalCheckedOff(g.id, periodKey)).length
    : horizonGoals.filter(g => g.is_completed).length;

  // Group by category
  const categoryOrder = ['Spiritual', 'Family', 'Personal', 'Emotional', 'Physical', 'Financial', 'Intellectual'];
  const grouped = new Map<string, StoredGoal[]>();
  horizonGoals.forEach(g => {
    if (!grouped.has(g.category_name)) grouped.set(g.category_name, []);
    grouped.get(g.category_name)!.push(g);
  });
  const sortedGroups = categoryOrder
    .filter(cat => grouped.has(cat))
    .map(cat => ({ category: cat, goals: grouped.get(cat)! }));

  // Per-horizon counts for tab badges
  const horizonCounts = HORIZONS.map(h => ({
    ...h,
    count: goals.filter(g => g.horizon === h.key).length,
  }));

  const progressPct = horizonGoals.length > 0 ? (checkedCount / horizonGoals.length) * 100 : 0;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>Goals</h1>
        <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>
          {goals.length} goals across all horizons
        </p>
      </div>

      {/* Horizon Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
        {horizonCounts.map(h => {
          const isActive = horizon === h.key;
          return (
            <button
              key={h.key}
              onClick={() => setHorizon(h.key)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: isActive ? '#C49A6C' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#6B6560',
                border: isActive ? '1px solid #C49A6C' : '1px solid #E8E3DD',
              }}
            >
              {h.label}
              <span className="ml-1.5 text-[10px] font-normal" style={{ opacity: 0.7 }}>
                {h.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Period progress card */}
      <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: '#6B6560' }}>
            {periodLabel}
          </span>
          <span className="text-sm font-bold" style={{ color: '#C49A6C' }}>
            {checkedCount}/{horizonGoals.length}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              background: progressPct === 100
                ? 'linear-gradient(90deg, #7BAF7E, #8FC492)'
                : 'linear-gradient(90deg, #C49A6C, #D4B896)',
            }}
          />
        </div>
        {isRecurring && (
          <p className="text-[10px] mt-1.5" style={{ color: '#C5BFB8' }}>
            Tap to check off {horizon === 'daily' ? 'for today' : horizon === 'weekly' ? 'for this week' : 'for this month'}
          </p>
        )}
      </div>

      {/* Category Groups */}
      {sortedGroups.map(({ category, goals: catGoals }) => {
        const catChecked = isRecurring
          ? catGoals.filter(g => isGoalCheckedOff(g.id, periodKey)).length
          : catGoals.filter(g => g.is_completed).length;

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: catGoals[0]?.category_color }}
              />
              <h2 className="text-sm font-semibold" style={{ color: '#6B6560' }}>{category}</h2>
              <span className="text-[10px]" style={{ color: '#C5BFB8' }}>
                {catChecked}/{catGoals.length}
              </span>
            </div>

            <div className="space-y-2">
              {catGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isRecurring={isRecurring}
                  periodKey={periodKey}
                  onToggle={reload}
                />
              ))}
            </div>
          </div>
        );
      })}

      {sortedGroups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: '#9A938B' }}>No {horizon} goals set yet.</p>
        </div>
      )}
    </div>
  );
}

// ── Goal Card with interactive check-off ──────────────────────────────────

function GoalCard({
  goal,
  isRecurring,
  periodKey,
  onToggle,
}: {
  goal: StoredGoal;
  isRecurring: boolean;
  periodKey: string;
  onToggle: () => void;
}) {
  const [editingProgress, setEditingProgress] = useState(false);
  const [tempProgress, setTempProgress] = useState(goal.progress_pct);

  const checked = isRecurring
    ? isGoalCheckedOff(goal.id, periodKey)
    : goal.is_completed;

  const handleTap = () => {
    if (isRecurring) {
      toggleCheckOff(goal.id, goal.horizon);
    } else {
      toggleGoalComplete(goal.id);
    }
    onToggle();
  };

  const handleProgressSave = () => {
    setGoalProgress(goal.id, tempProgress);
    setEditingProgress(false);
    onToggle();
  };

  return (
    <div
      className="rounded-card p-3.5 transition-all"
      style={{
        backgroundColor: checked ? 'rgba(123, 175, 126, 0.05)' : '#FFFFFF',
        border: `1px solid ${checked ? 'rgba(123, 175, 126, 0.3)' : '#E8E3DD'}`,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Tappable check circle */}
        <button
          onClick={handleTap}
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all active:scale-90"
          style={{
            border: `2px solid ${checked ? '#7BAF7E' : '#D4D0CB'}`,
            backgroundColor: checked ? 'rgba(123, 175, 126, 0.15)' : 'transparent',
          }}
        >
          {checked && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7BAF7E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <span
            className={`text-sm font-medium transition-colors ${checked ? 'line-through' : ''}`}
            style={{ color: checked ? '#9A938B' : '#1C1A17' }}
          >
            {goal.name}
          </span>

          {/* Progress bar for lifetime goals — tappable to edit */}
          {!isRecurring && !goal.is_completed && (
            <div className="mt-2">
              {editingProgress ? (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={tempProgress}
                    onChange={e => setTempProgress(Number(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none"
                    style={{
                      background: `linear-gradient(to right, ${goal.category_color} 0%, ${goal.category_color} ${tempProgress}%, #F0EDE8 ${tempProgress}%, #F0EDE8 100%)`,
                    }}
                  />
                  <span className="text-xs font-medium w-8 text-right" style={{ color: '#6B6560' }}>
                    {tempProgress}%
                  </span>
                  <button
                    onClick={handleProgressSave}
                    className="text-[10px] font-medium px-2 py-1 rounded-lg"
                    style={{ backgroundColor: '#C49A6C', color: '#FFFFFF' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingProgress(false); setTempProgress(goal.progress_pct); }}
                    className="text-[10px] px-1.5 py-1"
                    style={{ color: '#9A938B' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setTempProgress(goal.progress_pct); setEditingProgress(true); }}
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: '#9A938B' }}>
                      Progress
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" style={{ color: '#C49A6C' }}>
                        — tap to edit
                      </span>
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: '#6B6560' }}>{Math.round(goal.progress_pct)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${goal.progress_pct}%`,
                        backgroundColor: goal.category_color,
                      }}
                    />
                  </div>
                </button>
              )}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1">
            {goal.target_date && !goal.is_completed && (
              <span className="text-[10px]" style={{ color: '#C5BFB8' }}>
                Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
            {goal.completed_at && (
              <span className="text-[10px]" style={{ color: '#7BAF7E' }}>
                Completed {new Date(goal.completed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Weight indicator */}
        {goal.weight > 0 && (
          <div className="flex-shrink-0 text-right">
            <span className="text-[10px] font-medium" style={{ color: '#D4D0CB' }}>
              {Math.round(goal.weight * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
