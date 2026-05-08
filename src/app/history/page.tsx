'use client';

import { useState, useEffect } from 'react';
import { getMockHeatmapData, getMockDashboardData } from '@/lib/mockData';
import { useAuth } from '@/lib/AuthContext';
import { fetchHeatmapData, fetchDashboardData } from '@/lib/supabaseData';
import { CATEGORY_COLOR_MAP } from '@/lib/types';

export default function HistoryPage() {
  const { user } = useAuth();
  const [heatmapData, setHeatmapData] = useState<{ month: string; scores: Record<string, number> }[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState(() => getMockDashboardData());

  const categories = Object.keys(CATEGORY_COLOR_MAP);

  useEffect(() => {
    if (user?.id) {
      fetchHeatmapData(user.id, selectedYear)
        .then(setHeatmapData)
        .catch(() => setHeatmapData(getMockHeatmapData()));
    } else {
      setHeatmapData(getMockHeatmapData());
    }
  }, [user, selectedYear]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData(user.id)
        .then(setDashboard)
        .catch(() => setDashboard(getMockDashboardData()));
    } else {
      setDashboard(getMockDashboardData());
    }
  }, [user]);
  const selectedCatData = selectedCategory
    ? dashboard.categories.find(c => c.name === selectedCategory)
    : null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>History</h1>
          <p className="text-xs mt-0.5" style={{ color: '#9A938B' }}>Year in Review</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedYear(y => y - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#FFFFFF', color: '#6B6560', border: '1px solid #E8E3DD' }}
          >‹</button>
          <span className="text-sm font-semibold w-12 text-center" style={{ color: '#1C1A17' }}>{selectedYear}</span>
          <button
            onClick={() => setSelectedYear(y => y + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#FFFFFF', color: '#6B6560', border: '1px solid #E8E3DD' }}
          >›</button>
        </div>
      </div>

      {/* Year Heatmap */}
      <div className="rounded-card p-4 overflow-x-auto" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-xs font-medium mb-3" style={{ color: '#6B6560' }}>Score Heatmap</p>
        <div>
          {/* Month headers */}
          <div className="flex">
            <div className="w-24 flex-shrink-0" />
            {heatmapData.map(d => (
              <div key={d.month} className="flex-1 text-center text-[9px] pb-1" style={{ color: '#9A938B' }}>
                {d.month}
              </div>
            ))}
          </div>

          {/* Category rows */}
          {categories.map(catName => (
            <div
              key={catName}
              className="flex items-center cursor-pointer rounded transition-colors"
              style={{
                backgroundColor: selectedCategory === catName ? 'rgba(240, 237, 232, 0.8)' : 'transparent',
              }}
              onClick={() => setSelectedCategory(selectedCategory === catName ? null : catName)}
            >
              <div className="w-24 flex-shrink-0 pr-2 py-0.5">
                <span className="text-[10px] font-medium truncate" style={{ color: CATEGORY_COLOR_MAP[catName] }}>
                  {catName}
                </span>
              </div>
              {heatmapData.map(d => {
                const score = d.scores[catName] || 0;
                const color = CATEGORY_COLOR_MAP[catName];
                return (
                  <div key={d.month} className="flex-1 p-0.5">
                    <div
                      className="w-full aspect-square rounded-sm transition-opacity"
                      style={{
                        backgroundColor: color,
                        opacity: 0.12 + score * 0.88,
                      }}
                      title={`${catName} - ${d.month}: ${Math.round(score * 100)}%`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-3">
          <span className="text-[9px]" style={{ color: '#C5BFB8' }}>Low</span>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map(opacity => (
            <div
              key={opacity}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: '#C49A6C', opacity }}
            />
          ))}
          <span className="text-[9px]" style={{ color: '#C5BFB8' }}>High</span>
        </div>
      </div>

      {/* Category Trend Detail */}
      {selectedCatData && (
        <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: selectedCatData.color || '#C49A6C' }}
            />
            <h3 className="text-sm font-semibold" style={{ color: '#1C1A17' }}>{selectedCatData.name} — 12-Month Trend</h3>
          </div>

          <TrendChart
            data={selectedCatData.monthly_scores}
            color={selectedCatData.color || '#C49A6C'}
          />

          <div className="flex items-center justify-between mt-3">
            <div>
              <span className="text-xs" style={{ color: '#9A938B' }}>Current</span>
              <span className="text-sm font-bold ml-2" style={{ color: '#1C1A17' }}>
                {Math.round(selectedCatData.current_score * 100)}%
              </span>
            </div>
            <div>
              <span className="text-xs" style={{ color: '#9A938B' }}>Avg</span>
              <span className="text-sm font-medium ml-2" style={{ color: '#6B6560' }}>
                {Math.round(selectedCatData.monthly_scores.reduce((a, b) => a + b, 0) / selectedCatData.monthly_scores.length * 100)}%
              </span>
            </div>
            <div>
              <span className="text-xs" style={{ color: '#9A938B' }}>Best</span>
              <span className="text-sm font-medium ml-2" style={{ color: '#7BAF7E' }}>
                {Math.round(Math.max(...selectedCatData.monthly_scores) * 100)}%
              </span>
            </div>
            <div>
              <span className="text-xs" style={{ color: '#9A938B' }}>Streak</span>
              <span className="text-sm font-medium ml-2" style={{ color: '#C49A6C' }}>
                {selectedCatData.streak_days}d
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Year-over-Year */}
      <div className="rounded-card p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: '#6B6560' }}>Year-over-Year</h3>
        <p className="text-xs" style={{ color: '#C5BFB8' }}>
          Compare {selectedYear} vs {selectedYear - 1} — available once you have data from multiple years.
        </p>
      </div>
    </div>
  );
}

function TrendChart({ data, color }: { data: number[]; color: string }) {
  const width = 300;
  const height = 80;
  const padding = 4;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 0.1;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
      <path d={areaPath} fill={color} opacity={0.08} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}
    </svg>
  );
}
