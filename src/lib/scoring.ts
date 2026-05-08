// ============================================================
// Balancing Act — Scoring Engine
// Implements the full scoring pipeline from the PRD:
// Raw entries -> Normalized values -> Weighted category scores -> Weighted balance score
// ============================================================

import type { Metric, MetricEntry, Category, CategorySnapshot, MeasurementType } from './types';

/**
 * Normalize a raw value to 0-1 based on metric configuration.
 * PRD Section 4.2, Step 1.
 */
export function normalizeValue(
  value: number,
  metric: Pick<Metric, 'measurement_type' | 'scale_min' | 'scale_max' | 'polarity'>
): number {
  let normalized: number;

  switch (metric.measurement_type) {
    case 'binary':
      normalized = value; // already 0 or 1
      break;
    case 'scale':
      normalized = value; // already 0-1
      break;
    case 'count':
      normalized = Math.min(value / (metric.scale_max || 1), 1.0);
      break;
    case 'percentage':
      normalized = value / 100;
      break;
    case 'currency':
      normalized = Math.min(value / (metric.scale_max || 1), 1.0);
      break;
    case 'target':
      normalized = Math.min(value / (metric.scale_max || 1), 1.0);
      break;
    default:
      normalized = value;
  }

  // Clamp to 0-1
  normalized = Math.max(0, Math.min(1, normalized));

  // Negative polarity inverts the score
  if (metric.polarity === 'negative') {
    normalized = 1 - normalized;
  }

  return normalized;
}

/**
 * Compute weighted category score from metric entries.
 * PRD Section 4.2, Step 3.
 * Only includes metrics that have entries (missing != zero).
 */
export function computeCategoryScore(
  metrics: Pick<Metric, 'id' | 'weight' | 'is_active'>[],
  entries: Map<string, number> // metric_id -> normalized_value
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const metric of metrics) {
    if (!metric.is_active) continue;
    const normalizedValue = entries.get(metric.id);
    if (normalizedValue === undefined) continue; // missing = no data, not zero

    weightedSum += normalizedValue * metric.weight;
    totalWeight += metric.weight;
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

/**
 * Compute overall balance score from category scores.
 * PRD Section 4.2, Step 4.
 */
export function computeBalanceScore(
  categories: Pick<Category, 'id' | 'weight' | 'is_active'>[],
  categoryScores: Map<string, number> // category_id -> weighted_score
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const cat of categories) {
    if (!cat.is_active) continue;
    const score = categoryScores.get(cat.id);
    if (score === undefined) continue;

    weightedSum += score * cat.weight;
    totalWeight += cat.weight;
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

/**
 * Compute balance index (how evenly distributed effort is).
 * PRD Section 3.2.7: 1 - (stdev / 0.5), normalized to 0-1.
 * 1.0 = perfectly balanced, 0.0 = heavily lopsided.
 */
export function computeBalanceIndex(categoryScores: number[]): number {
  if (categoryScores.length === 0) return 0;

  const mean = categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;
  const variance = categoryScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / categoryScores.length;
  const stdev = Math.sqrt(variance);

  return Math.max(0, Math.min(1, 1 - stdev / 0.5));
}

/**
 * Determine trend direction.
 * PRD Section 4.2, Step 5.
 */
export function computeTrend(currentScore: number, priorScore: number): {
  direction: 'improving' | 'stable' | 'declining';
  delta: number;
} {
  const delta = currentScore - priorScore;
  let direction: 'improving' | 'stable' | 'declining';

  if (delta > 0.02) direction = 'improving';
  else if (delta < -0.02) direction = 'declining';
  else direction = 'stable';

  return { direction, delta };
}

/**
 * Format a 0-1 score as a percentage string.
 */
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Format a score with one decimal place.
 */
export function formatScoreDecimal(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Get trend arrow emoji.
 */
export function trendArrow(direction: 'improving' | 'stable' | 'declining' | null): string {
  switch (direction) {
    case 'improving': return '↑';
    case 'declining': return '↓';
    case 'stable': return '→';
    default: return '';
  }
}

/**
 * Get trend color class.
 */
export function trendColor(direction: 'improving' | 'stable' | 'declining' | null): string {
  switch (direction) {
    case 'improving': return 'text-green-400';
    case 'declining': return 'text-red-400';
    case 'stable': return 'text-yellow-400';
    default: return 'text-gray-400';
  }
}
