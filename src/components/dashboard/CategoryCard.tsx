'use client';

import type { CategoryWithScore } from '@/lib/types';
import { formatScore, trendArrow, trendColor } from '@/lib/scoring';

interface Props {
  category: CategoryWithScore;
  isUpdatedToday: boolean;
  onClick?: () => void;
}

export function CategoryCard({ category, isUpdatedToday, onClick }: Props) {
  const sparklineWidth = 80;
  const sparklineHeight = 32;
  const scores = category.monthly_scores;
  const maxScore = Math.max(...scores, 0.01);
  const minScore = Math.min(...scores);
  const range = maxScore - minScore || 0.1;

  const points = scores.map((score, i) => {
    const x = (i / (scores.length - 1)) * sparklineWidth;
    const y = sparklineHeight - ((score - minScore) / range) * sparklineHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <button
      onClick={onClick}
      className="w-full rounded-card p-4 flex items-center gap-4 transition-transform active:scale-[0.98]"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}
    >
      {/* Color indicator */}
      <div
        className="w-1 h-12 rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color || '#C49A6C' }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate" style={{ color: '#1C1A17' }}>
            {category.name}
          </span>
          {isUpdatedToday && (
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#7BAF7E' }} title="Updated today" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg font-bold" style={{ color: category.color || '#C49A6C' }}>
            {formatScore(category.current_score)}
          </span>
          <span className={`text-xs font-medium ${trendColor(category.trend_direction)}`}>
            {trendArrow(category.trend_direction)}
            {category.trend_delta !== null ? ` ${Math.abs(Math.round(category.trend_delta * 100))}%` : ''}
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="flex-shrink-0">
        <svg width={sparklineWidth} height={sparklineHeight} className="overflow-visible">
          <polyline
            points={points}
            fill="none"
            stroke={category.color || '#C49A6C'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.6}
          />
        </svg>
      </div>

      {/* Streak */}
      <div className="flex flex-col items-center flex-shrink-0">
        <span className="text-lg font-bold" style={{ color: '#C49A6C' }}>{category.streak_days}</span>
        <span className="text-[9px]" style={{ color: '#9A938B' }}>streak</span>
      </div>
    </button>
  );
}
