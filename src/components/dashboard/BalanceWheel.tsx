'use client';

import type { CategoryWithScore } from '@/lib/types';
import { formatScore } from '@/lib/scoring';

interface Props {
  categories: CategoryWithScore[];
  overallScore: number;
  balanceIndex: number;
}

export function BalanceWheel({ categories, overallScore, balanceIndex }: Props) {
  const cx = 160;
  const cy = 160;
  const radius = 120;
  const n = categories.length;

  // Compute polygon points for the score shape
  const scorePoints = categories.map((cat, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = radius * cat.current_score;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Axis lines
  const axes = categories.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x2: cx + radius * Math.cos(angle),
      y2: cy + radius * Math.sin(angle),
    };
  });

  // Label positions (slightly outside the radius)
  const labels = categories.map((cat, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const labelR = radius + 28;
    return {
      x: cx + labelR * Math.cos(angle),
      y: cy + labelR * Math.sin(angle),
      name: cat.name,
      score: cat.current_score,
      color: cat.color || '#C49A6C',
    };
  });

  const polygonPath = scorePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="relative">
      <svg viewBox="0 0 320 320" className="w-full max-w-[320px] mx-auto">
        {/* Grid rings */}
        {rings.map(r => (
          <polygon
            key={r}
            points={Array.from({ length: n }, (_, i) => {
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
              return `${cx + radius * r * Math.cos(angle)},${cy + radius * r * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke="#2D2824"
            strokeWidth="0.5"
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {axes.map((axis, i) => (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={axis.x2} y2={axis.y2}
            stroke="#2D2824"
            strokeWidth="0.5"
            opacity={0.5}
          />
        ))}

        {/* Score polygon fill */}
        <path
          d={polygonPath}
          fill="rgba(196, 154, 108, 0.15)"
          stroke="#C49A6C"
          strokeWidth="2"
        />

        {/* Score dots on each vertex */}
        {scorePoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y}
            r="4"
            fill={categories[i].color || '#C49A6C'}
            stroke="#141210"
            strokeWidth="1.5"
          />
        ))}

        {/* Category labels */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[8px] font-medium"
            fill={label.color}
          >
            {label.name.length > 8 ? label.name.slice(0, 7) + '.' : label.name}
          </text>
        ))}

        {/* Center score */}
        <text
          x={cx} y={cy - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[28px] font-bold"
          fill="#F5F0EB"
        >
          {formatScore(overallScore)}
        </text>
        <text
          x={cx} y={cy + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[10px]"
          fill="#A39B91"
        >
          Balance: {formatScore(balanceIndex)}
        </text>
      </svg>
    </div>
  );
}
