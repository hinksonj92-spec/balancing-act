'use client';

import { useState, useEffect } from 'react';
import { getMockHeatmapData, getMockDashboardData } from '@/lib/mockData';
import { CATEGORY_COLOR_MAP } from '@/lib/types';

export default function HistoryPage() {
  const [heatmapData, setHeatmapData] = useState<{ month: string; scores: Record<string, number> }[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Object.keys(CATEGORY_COLOR_MAP);

  useEffect(() => {
    setHeatmapData(getMockHeatmapData());
  }, [selectedYear]);

  // Get trend data for selected category
  const dashboard = getMockDashboardData();
  const selectedCatData = selectedCategory
    ? dashboard.categories.find(c => c.name === selectedCategory)
    : null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">History</h1>
          <p className="text-xs text-gray-500 mt-0.5">Year in Review</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedYear(y => y - 1)}
            className="w-8 h-8 rounded-full bg-dark-card flex items-center justify-center text-gray-400 hover:text-gray-200"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-200 w-12 text-center">{selectedYear}</span>
          <button
            onClick={() => setSelectedYear(y => y + 1)}
            className="w-8 h-8 rounded-full bg-dark-card flex items-center justify-center text-gray-400 hover:text-gray-200"
          >
            ›
          </button>
        </div>
      </div>

      {/* Year Heatmap — 12 months x 8 categories */}
      <div className="bg-dark-card rounded-card p-4 overflow-x-auto">
        <p className="text-xs font-medium text-gray-400 mb-3">Score Heatmap</p>
        <div className="min-w-[500px]">
          {/* Month headers */}
          <div className="flex">
            <div className="w-24 flex-shrink-0" /> {/* spacer for category names */}
            {heatmapData.map(d => (
              <div key={d.month} className="flex-1 text-center text-[9px] text-gray-500 pb-1">
                {d.month}
              </div>
            ))}
          </div>

          {/* Category rows */}
          {categories.map(catName => (
            <div
              key={catName}
              className={`flex items-center cursor-pointer hover:bg-gray-800/30 rounded transition-colors ${
                selectedCategory === catName ? 'bg-gray-800/50' : ''
              }`}
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
                        opacity: 0.15 + score * 0.85,
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
          <span className="text-[9px] text-gray-600">Low</span>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map(opacity => (
            <div
              key={opacity}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: '#6C5CE7', opacity }}
            />
          ))}
          <span className="text-[9px] text-gray-600">High</span>
        </div>
      </div>

      {/* Category Trend Detail */}
      {selectedCatData && (
        <div className="bg-dark-card rounded-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: selectedCatData.color || '#6C5CE7' }}
            />
            <h3 className="text-sm font-semibold text-gray-200">{selectedCatData.name} — 12-Month Trend</h3>
          </div>

          {/* Simple line chart using SVG */}
          <TrendChart
            data={selectedCatData.monthly_scores}
            color={selectedCatData.color || '#6C5CE7'}
          />

          <div className="flex items-center justify-between mt-3">
            <div>
              <span className="text-xs text-gray-500">Current</span>
              <span className="text-sm font-bold text-gray-200 ml-2">
                {Math.round(selectedCatData.current_score * 100)}%
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Avg</span>
              <span className="text-sm font-medium text-gray-300 ml-2">
                {Math.round(selectedCatData.monthly_scores.reduce((a, b) => a + b, 0) / selectedCatData.monthly_scores.length * 100)}%
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Best</span>
              <span className="text-sm font-medium text-green-400 ml-2">
                {Math.round(Math.max(...selectedCatData.monthly_scores) * 100)}%
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Streak</span>
              <span className="text-sm font-medium text-orange-400 ml-2">
                {selectedCatData.streak_days}d
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Year-over-Year comparison placeholder */}
      <div className="bg-dark-card rounded-card p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Year-over-Year</h3>
        <p className="text-xs text-gray-600">
          Compare {selectedYear} vs {selectedYear - 1} — available once you have data from multiple years.
        </p>
      </div>
    </div>
  );
}

// Simple SVG trend chart
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
      {/* Area fill */}
      <path d={areaPath} fill={color} opacity={0.1} />
      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}
    </svg>
  );
}
