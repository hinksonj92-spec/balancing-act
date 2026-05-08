'use client';

import { useState, useEffect } from 'react';
import { getMockLifeGoals } from '@/lib/mockData';

interface GoalWithCategory {
  id: string;
  name: string;
  is_completed: boolean;
  completed_at: string | null;
  progress_pct: number;
  target_date: string | null;
  category_name: string;
  category_color: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithCategory[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [groupBy, setGroupBy] = useState<'category' | 'status'>('category');

  useEffect(() => {
    setGoals(getMockLifeGoals());
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

  // Group goals
  const grouped = new Map<string, GoalWithCategory[]>();
  filtered.forEach(g => {
    const key = groupBy === 'category' ? g.category_name : (g.is_completed ? 'Completed' : 'In Progress');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g);
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-100">Life Goals</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {completedCount} of {goals.length} completed
        </p>
      </div>

      {/* Overall progress bar */}
      <div className="bg-dark-card rounded-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Overall Progress</span>
          <span className="text-sm font-bold text-purple-400">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${overallProgress}%`,
              background: 'linear-gradient(90deg, #6C5CE7, #A29BFE)',
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
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-purple-600 text-white'
                : 'bg-dark-card text-gray-400 hover:text-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setGroupBy(g => g === 'category' ? 'status' : 'category')}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-dark-card text-gray-400 hover:text-gray-200"
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
            <h2 className="text-sm font-semibold text-gray-400">{group}</h2>
            <span className="text-[10px] text-gray-600">
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

function GoalCard({ goal }: { goal: GoalWithCategory }) {
  return (
    <div className={`bg-dark-card rounded-card p-4 transition-opacity ${goal.is_completed ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Completion indicator */}
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
          goal.is_completed
            ? 'border-green-400 bg-green-400/20'
            : 'border-gray-600'
        }`}>
          {goal.is_completed && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${goal.is_completed ? 'text-gray-400 line-through' : 'text-gray-100'}`}>
              {goal.name}
            </span>
          </div>

          {/* Progress bar (for incomplete goals with progress) */}
          {!goal.is_completed && goal.progress_pct > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-500">Progress</span>
                <span className="text-[10px] font-medium text-gray-400">{Math.round(goal.progress_pct)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
            <span className="text-[10px] text-gray-500" style={{ color: goal.category_color }}>
              {goal.category_name}
            </span>
            {goal.target_date && (
              <span className="text-[10px] text-gray-600">
                Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
            {goal.completed_at && (
              <span className="text-[10px] text-green-500">
                Completed {new Date(goal.completed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
