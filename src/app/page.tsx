'use client';

import { useState, useEffect } from 'react';
import { BalanceWheel } from '@/components/dashboard/BalanceWheel';
import { CategoryCard } from '@/components/dashboard/CategoryCard';
import { getMockDashboardData } from '@/lib/mockData';
import type { DashboardData } from '@/lib/types';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Replace with real Supabase query when connected
    setData(getMockDashboardData());
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Balancing Act</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-dark-card rounded-full px-3 py-1.5">
            <span className="text-orange-400 text-sm">🔥</span>
            <span className="text-sm font-semibold text-gray-200">{data.overall_streak}</span>
            <span className="text-[10px] text-gray-500">day streak</span>
          </div>
        </div>
      </div>

      {/* Balance Wheel */}
      <BalanceWheel
        categories={data.categories}
        overallScore={data.overall_score}
        balanceIndex={data.balance_index}
      />

      {/* Today's check-in status */}
      <div className="bg-dark-card rounded-card p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">Today&apos;s Check-in</span>
          <span className="text-xs text-gray-500">
            {data.today_updated_categories.length}/{data.categories.length} updated
          </span>
        </div>
        <div className="flex gap-1.5">
          {data.categories.map(cat => {
            const updated = data.today_updated_categories.includes(cat.id);
            return (
              <div
                key={cat.id}
                className="flex-1 h-2 rounded-full transition-colors"
                style={{
                  backgroundColor: updated ? cat.color || '#6C5CE7' : '#2d3748',
                  opacity: updated ? 1 : 0.4,
                }}
                title={`${cat.name}: ${updated ? 'Updated' : 'Not updated'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Category Cards */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-400 px-1">Categories</h2>
        {data.categories.map(cat => (
          <CategoryCard
            key={cat.id}
            category={cat}
            isUpdatedToday={data.today_updated_categories.includes(cat.id)}
            onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
          />
        ))}
      </div>

      {/* Category Detail Modal (inline expand for now) */}
      {selectedCategory && (
        <CategoryDetail
          category={data.categories.find(c => c.id === selectedCategory)!}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </div>
  );
}

// Inline category detail panel
function CategoryDetail({ category, onClose }: { category: any; onClose: () => void }) {
  const { getMockMetrics } = require('@/lib/mockData');
  const metrics = getMockMetrics(category.id);

  return (
    <div className="bg-dark-card rounded-card p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold" style={{ color: category.color }}>
          {category.name} — Metrics
        </h3>
        <button onClick={onClose} className="text-gray-500 text-sm">Close</button>
      </div>
      <div className="space-y-3">
        {metrics.map((m: any, i: number) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-200 truncate">{m.name}</div>
              <div className="text-[10px] text-gray-500">
                Weight: {Math.round(m.weight * 100)}% · Streak: {m.streak} days
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-100">
                {Math.round(m.value * 100)}%
              </span>
              <span className={`text-xs ${
                m.trend === 'improving' ? 'text-green-400' :
                m.trend === 'declining' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {m.trend === 'improving' ? '↑' : m.trend === 'declining' ? '↓' : '→'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
