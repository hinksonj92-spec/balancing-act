'use client';

import { useState, useEffect } from 'react';
import { getGoals, onGoalsChanged, type StoredGoal } from '@/lib/goalsStore';

export default function GoalsPage() {
  const [goals, setGoals] = useState<StoredGoal[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [groupBy, setGroupBy] = useState<'category' | 'status'>('category');

  const loadGoals = () => setGoals(getGoals());

  useEffect(() => {
    loadGoals();
    // Re-load when chat modifies goals
    const unsub = onGoalsChanged(loadGoals);
    return unsub;
  }, []);

  const filtered = goals.filter(g => {
    if (filter === 'active') return !g.is_completed;
    if (filter === 'completed') return g.is_completed;
    return true;
  });

  const completedCount = goals.filter(g => g.is_completed).length;
  const overallProgress = goals.length > 0
    ? goals.reduce((sum, g) => sum + g.progress_pct, 0) / goals.length
    : 0;

  const grouped = new Map<string, StoredGoal[]>();
  filtered.forEach(g => {
    const key = groupBy === 'category' ? g.category_name : (g.is_completed ? 'Completed' : 'In Progress');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g);
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>Life Goals</h1>
        <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>
          {completedCount} of {goals.length} completed
        </p>
      </div>

      {/* Overall progress bar */}
      <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: '#6B6560' }}>Overall Progress</span>
          <span className="text-sm font-bold" style={{ color: '#C49A6C' }}>{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${overallProgress}%`,
              background: 'linear-gradient(90deg, #C49A6C, #D4B896)',
            }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: filter === f ? '#C49A6C' : '#FFFFFF',
              color: filter === f ? '#141210' : '#6B6560',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setGroupBy(g => g === 'category' ? 'status' : 'category')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: '#FFFFFF', color: '#6B6560' }}
        >
          Group: {groupBy === 'category' ? 'Category' : 'Status'}
        </button>
      </div>

      {/* Goal Groups */}
      {Array.from(grouped.entries()).map(([group, groupGoals]) => (
        <div key={group}>
          <div className="flex items-center gap-2 mb-3">
            {groupBy === 'category' && (
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: groupGoals[0]?.category_color }}
              />
            )}
            <h2 className="text-sm font-semibold" style={{ color: '#6B6560' }}>{group}</h2>
            <span className="text-[10px]" style={{ color: '#C5BFB8' }}>
              {groupGoals.filter(g => g.is_completed).length}/{groupGoals.length}
            </span>
          </div>

          <div className="space-y-2">
            {groupGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalCard({ goal }: { goal: StoredGoal }) {
  return (
    <div
      className="rounded-card p-4 transition-opacity"
      style={{
        backgroundColor: '#FFFFFF',
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
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${goal.is_completed ? 'line-through' : ''}`}
              style={{ color: goal.is_completed ? '#6B6560' : '#1C1A17' }}
            >
              {goal.name}
            </span>
          </div>

          {/* Progress bar */}
          {!goal.is_completed && goal.progress_pct > 0 && (
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

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px]" style={{ color: goal.category_color }}>
              {goal.category_name}
            </span>
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
      </div>
    </div>
  );
}
