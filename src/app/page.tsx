'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BalanceWheel } from '@/components/dashboard/BalanceWheel';
import { CategoryCard } from '@/components/dashboard/CategoryCard';
import { getMockDashboardData, getMockMetrics } from '@/lib/mockData';
import { useAuth } from '@/lib/AuthContext';
import { fetchDashboardData, fetchCategoryMetrics } from '@/lib/supabaseData';
import type { DashboardData } from '@/lib/types';

const ONBOARDING_KEY = 'balancing-act-onboarding-complete';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Onboarding gate: redirect if not completed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        router.replace('/onboarding');
        return;
      }
      setOnboardingChecked(true);
    }
  }, [router]);

  useEffect(() => {
    if (!onboardingChecked) return;
    if (user?.id) {
      fetchDashboardData(user.id).then(setData).catch(() => setData(getMockDashboardData()));
    } else {
      setData(getMockDashboardData());
    }
  }, [user, onboardingChecked]);

  if (!onboardingChecked || !data) {
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
          <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>Balancing Act</h1>
          <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: '#FFFFFF' }}>
            <span className="text-sm" style={{ color: '#C49A6C' }}>&#9670;</span>
            <span className="text-sm font-semibold" style={{ color: '#1C1A17' }}>{data.overall_streak}</span>
            <span className="text-[10px]" style={{ color: '#9A938B' }}>day streak</span>
          </div>
          <Link
            href="/settings"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#F0EDE8' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A938B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Balance Wheel */}
      <BalanceWheel
        categories={data.categories}
        overallScore={data.overall_score}
        balanceIndex={data.balance_index}
      />

      {/* Today's check-in status */}
      <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: '#6B6560' }}>Today&apos;s Check-in</span>
          <span className="text-xs" style={{ color: '#9A938B' }}>
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
                  backgroundColor: updated ? cat.color || '#C49A6C' : '#E8E3DD',
                  opacity: updated ? 1 : 0.3,
                }}
                title={`${cat.name}: ${updated ? 'Updated' : 'Not updated'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Christlike Assessment Quick Link */}
      <Link
        href="/assessment"
        className="flex items-center gap-3 rounded-2xl p-4 transition-colors"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(196, 154, 108, 0.12)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C49A6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: '#1C1A17' }}>Christlike Assessment</p>
          <p className="text-[10px]" style={{ color: '#9A938B' }}>Quarterly self-reflection on 9 attributes</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A938B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>

      {/* Category Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold px-1" style={{ color: '#6B6560' }}>Categories</h2>
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
          userId={user?.id}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </div>
  );
}

// Inline category detail panel
function CategoryDetail({ category, userId, onClose }: { category: any; userId?: string; onClose: () => void }) {
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      fetchCategoryMetrics(userId, category.id)
        .then(setMetrics)
        .catch(() => setMetrics(getMockMetrics(category.id)));
    } else {
      setMetrics(getMockMetrics(category.id));
    }
  }, [userId, category.id]);

  return (
    <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold" style={{ color: category.color }}>
          {category.name} — Metrics
        </h3>
        <button onClick={onClose} className="text-sm" style={{ color: '#9A938B' }}>Close</button>
      </div>
      <div className="space-y-3">
        {metrics.map((m: any, i: number) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate" style={{ color: '#1C1A17' }}>{m.name}</div>
              <div className="text-[10px]" style={{ color: '#9A938B' }}>
                Weight: {Math.round(m.weight * 100)}% · Streak: {m.streak} days
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: '#1C1A17' }}>
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
