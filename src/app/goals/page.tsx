'use client';

import { useState, useEffect } from 'react';
import { getGoals, onGoalsChanged, type StoredGoal, type GoalHorizon } from '@/lib/goalsStore';

const HORIZONS: { key: GoalHorizon; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'lifetime', label: 'Lifetime' },
];

const HORIZON_DESCRIPTIONS: Record<GoalHorizon, string> = {
  daily: 'Track these every day',
  weekly: 'Complete each week',
  monthly: 'Hit these each month',
  yearly: 'Annual goals & milestones',
  lifetime: 'Big life achievements',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<StoredGoal[]>([]);
  const [horizon, setHorizon] = useState<GoalHorizon>('daily');

  const loadGoals = () => setGoals(getGoals());

  useEffect(() => {
    loadGoals();
    const unsub = onGoalsChanged(loadGoals);
    return unsub;
  }, []);

  const horizonGoals = goals.filter(g => g.horizon === horizon);
  const completedCount = horizonGoals.filter(g => g.is_completed).length;

  // Group by category, preserving display order
  const categoryOrder = ['Spiritual', 'Family', 'Personal', 'Emotional', 'Physical', 'Financial', 'Intellectual', 'Ecclesiastical'];
  const grouped = new Map<string, StoredGoal[]>();
  horizonGoals.forEach(g => {
    if (!grouped.has(g.category_name)) grouped.set(g.category_name, []);
    grouped.get(g.category_name)!.push(g);
  });
  const sortedGroups = categoryOrder
    .filter(cat => grouped.has(cat))
    .map(cat => ({ category: cat, goals: grouped.get(cat)! }));

  // Summary stats across all horizons
  const totalGoals = goals.length;
  const totalCompleted = goals.filter(g => g.is_completed).length;

  // Per-horizon counts for the tab badges
  const horizonCounts = HORIZONS.map(h => ({
    ...h,
    count: goals.filter(g => g.horizon === h.key).length,
    done: goals.filter(g => g.horizon === h.key && g.is_completed).length,
  }));

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>Goals</h1>
        <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>
          {totalCompleted} of {totalGoals} completed across all horizons
        </p>
      </div>

      {/* Horizon Tabs — scrollable row */}
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
              <span
                className="ml-1.5 text-[10px] font-normal"
                style={{ opacity: 0.7 }}
              >
                {h.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horizon description + progress */}
      <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: '#6B6560' }}>
            {HORIZON_DESCRIPTIONS[horizon]}
          </span>
          {horizon === 'lifetime' ? (
            <span className="text-sm font-bold" style={{ color: '#C49A6C' }}>
              {completedCount}/{horizonGoals.length}
            </span>
          ) : (
            <span className="text-sm font-bold" style={{ color: '#C49A6C' }}>
              {horizonGoals.length} goals
            </span>
          )}
        </div>
        {horizon === 'lifetime' && horizonGoals.length > 0 && (
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(completedCount / horizonGoals.length) * 100}%`,
                background: 'linear-gradient(90deg, #C49A6C, #D4B896)',
              }}
            />
          </div>
        )}
      </div>

      {/* Category Groups */}
      {sortedGroups.map(({ category, goals: catGoals }) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: catGoals[0]?.category_color }}
            />
            <h2 className="text-sm font-semibold" style={{ color: '#6B6560' }}>{category}</h2>
            <span className="text-[10px]" style={{ color: '#C5BFB8' }}>
              {catGoals.length}
            </span>
          </div>

          <div className="space-y-2">
            {catGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {sortedGroups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: '#9A938B' }}>No {horizon} goals set yet.</p>
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: StoredGoal }) {
  const isRecurring = goal.horizon !== 'lifetime';

  return (
    <div
      className="rounded-card p-3.5 transition-opacity"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E3DD',
        opacity: goal.is_completed ? 0.7 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Completion indicator */}
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            border: `2px solid ${goal.is_completed ? '#7BAF7E' : '#E8E3DD'}`,
            backgroundColor: goal.is_completed ? 'rgba(123, 175, 126, 0.15)' : 'transparent',
          }}
        >
          {goal.is_completed && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7BAF7E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span
            className={`text-sm font-medium ${goal.is_completed ? 'line-through' : ''}`}
            style={{ color: goal.is_completed ? '#9A938B' : '#1C1A17' }}
          >
            {goal.name}
          </span>

          {/* Progress bar for lifetime goals with progress */}
          {!isRecurring && !goal.is_completed && goal.progress_pct > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px]" style={{ color: '#9A938B' }}>Progress</span>
                <span className="text-[10px] font-medium" style={{ color: '#6B6560' }}>{Math.round(goal.progress_pct)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${goal.progress_pct}%`,
                    backgroundColor: goal.category_color,
                  }}
                />
              </div>
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1">
            {isRecurring && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F5F2EE', color: '#9A938B' }}>
                {goal.horizon}
              </span>
            )}
            {goal.target_date && (
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

        {/* Weight indicator for recurring goals */}
        {isRecurring && goal.weight > 0 && (
          <div className="flex-shrink-0 text-right">
            <span className="text-[10px] font-medium" style={{ color: '#C5BFB8' }}>
              {Math.round(goal.weight * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
