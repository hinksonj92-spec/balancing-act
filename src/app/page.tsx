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
          <h1 className="text-xl font-bold" style={{ color: '#F5F0EB' }}>Balancing Act</h1>
          <p className="text-xs mt-0.5" style={{ color: '#6B6560' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: '#1C1A17' }}>
            <span className="text-sm" style={{ color: '#C49A6C' }}>&#9670;</span>
            <span className="text-sm font-semibold" style={{ color: '#F5F0EB' }}>{data.overall_streak}</span>
            <span className="text-[10px]" style={{ color: '#6B6560' }}>day streak</span>
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
      <div className="rounded-card p-3" style={{ backgroundColor: '#1C1A17' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: '#A39B91' }}>Today&apos;s Check-in</span>
          <span className="text-xs" style={{ color: '#6B6560' }}>
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
                  backgroundColor: updated ? cat.color || '#C49A6C' : '#2D2824',
                  opacity: updated ? 1 : 0.3,
                }}
                title={`${cat.name}: ${updated ? 'Updated' : 'Not updated'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Category Cards */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold px-1" style={{ color: '#A39B91' }}>Categories</h2>
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
    <div className="rounded-card p-4" style={{ backgroundColor: '#1C1A17', border: '1px solid #2D2824' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold" style={{ color: category.color }}>
          {category.name} — Metrics
        </h3>
        <button onClick={onClose} className="text-sm" style={{ color: '#6B6560' }}>Close</button>
      </div>
      <div className="space-y-3">
        {metrics.map((m: any, i: number) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate" style={{ color: '#F5F0EB' }}>{m.name}</div>
              <div className="text-[10px]" style={{ color: '#6B6560' }}>
                Weight: {Math.round(m.weight * 100)}% · Streak: {m.streak} days
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: '#F5F0EB' }}>
                {Math.round(m.value * 100)}%
              </span>
              <span style={{ color: m.trend === 'improving' ? '#7BAF7E' : m.trend === 'declining' ? '#C47060' : '#D4A96A' }} className="text-xs">
                {m.trend === 'improving' ? '↑' : m.trend === 'declining' ? '↓' : '→'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
