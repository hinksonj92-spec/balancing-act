'use client';

import { useState, useEffect, useCallback } from 'react';
import { SEED_METRICS, SEED_CATEGORIES } from '@/lib/seedCatalog';
import { CATEGORY_COLOR_MAP } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

type TimeHorizon = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface MetricGoalLocal {
  id: string;
  metricName: string;
  categoryName: string;
  timeHorizon: TimeHorizon;
  targetValue: number;
  currentValue: number;
  createdAt: string;
  isActive: boolean;
}

const STORAGE_KEY = 'balancing-act-metric-goals';

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadGoals(): MetricGoalLocal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGoals(goals: MetricGoalLocal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

function genId() {
  return `mg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function horizonLabel(h: TimeHorizon) {
  return { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[h];
}

function progressColor(current: number, target: number): string {
  if (target <= 0) return '#C49A6C';
  const pct = current / target;
  if (pct >= 1) return '#7BAF7E';     // green — on track / ahead
  if (pct >= 0.5) return '#D4A96A';   // yellow — close
  return '#C47060';                    // red — behind
}

function progressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
}

// ── Category order ───────────────────────────────────────────────────────────

const CATEGORY_ORDER = SEED_CATEGORIES.map(c => c.name);

// ── Component ────────────────────────────────────────────────────────────────

export default function MetricGoals() {
  const [goals, setGoals] = useState<MetricGoalLocal[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedMetric, setSelectedMetric] = useState('');
  const [targetValue, setTargetValue] = useState<number>(1);
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('daily');

  const reload = useCallback(() => setGoals(loadGoals()), []);

  useEffect(() => { reload(); }, [reload]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!selectedMetric) return;
    const metric = SEED_METRICS.find(m => m.name === selectedMetric);
    if (!metric) return;

    const newGoal: MetricGoalLocal = {
      id: genId(),
      metricName: metric.name,
      categoryName: metric.category_name,
      timeHorizon,
      targetValue,
      currentValue: 0,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const updated = [...goals, newGoal];
    saveGoals(updated);
    setGoals(updated);
    setShowForm(false);
    setSelectedMetric('');
    setTargetValue(1);
    setTimeHorizon('daily');
  };

  const handleDelete = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    saveGoals(updated);
    setGoals(updated);
  };

  const handleUpdateCurrent = (id: string, value: number) => {
    const updated = goals.map(g => g.id === id ? { ...g, currentValue: value } : g);
    saveGoals(updated);
    setGoals(updated);
  };

  // ── Group active goals by category ───────────────────────────────────────

  const activeGoals = goals.filter(g => g.isActive);
  const grouped = new Map<string, MetricGoalLocal[]>();
  activeGoals.forEach(g => {
    if (!grouped.has(g.categoryName)) grouped.set(g.categoryName, []);
    grouped.get(g.categoryName)!.push(g);
  });
  const sortedGroups = CATEGORY_ORDER
    .filter(cat => grouped.has(cat))
    .map(cat => ({ category: cat, goals: grouped.get(cat)! }));

  // ── Metric dropdown: group by category, exclude already-added ────────────

  const existingMetricNames = new Set(activeGoals.map(g => g.metricName));
  const availableMetrics = SEED_METRICS.filter(m => !existingMetricNames.has(m.name));
  const metricsByCategory = new Map<string, typeof SEED_METRICS>();
  availableMetrics.forEach(m => {
    if (!metricsByCategory.has(m.category_name)) metricsByCategory.set(m.category_name, []);
    metricsByCategory.get(m.category_name)!.push(m);
  });

  // ── Overall progress ─────────────────────────────────────────────────────

  const totalGoals = activeGoals.length;
  const onTrack = activeGoals.filter(g => g.currentValue >= g.targetValue).length;
  const overallPct = totalGoals > 0 ? (onTrack / totalGoals) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: '#6B6560' }}>
            Metric Targets
          </span>
          <span className="text-sm font-bold" style={{ color: '#C49A6C' }}>
            {onTrack}/{totalGoals} on track
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${overallPct}%`,
              background: overallPct === 100
                ? 'linear-gradient(90deg, #7BAF7E, #8FC492)'
                : 'linear-gradient(90deg, #C49A6C, #D4B896)',
            }}
          />
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: '#C5BFB8' }}>
          Recurring targets for your tracked metrics
        </p>
      </div>

      {/* Add Goal button / form */}
      <div>
        <button
          onClick={() => setShowForm(prev => !prev)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={{
            backgroundColor: showForm ? '#F0EDE8' : '#C49A6C',
            color: showForm ? '#6B6560' : '#FFFFFF',
            border: showForm ? '1px solid #E8E3DD' : '1px solid #C49A6C',
          }}
        >
          {showForm ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Target
            </>
          )}
        </button>

        {/* Inline add form */}
        {showForm && (
          <div
            className="mt-3 rounded-2xl p-4 space-y-3"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}
          >
            {/* Metric select */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B6560' }}>Metric</label>
              <select
                value={selectedMetric}
                onChange={e => setSelectedMetric(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: '#FAF8F5',
                  border: '1px solid #E8E3DD',
                  color: '#1C1A17',
                }}
              >
                <option value="">Select a metric...</option>
                {CATEGORY_ORDER.filter(cat => metricsByCategory.has(cat)).map(cat => (
                  <optgroup key={cat} label={cat}>
                    {metricsByCategory.get(cat)!.map(m => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Target value */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B6560' }}>Target Value</label>
              <input
                type="number"
                min={0}
                step={1}
                value={targetValue}
                onChange={e => setTargetValue(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{
                  backgroundColor: '#FAF8F5',
                  border: '1px solid #E8E3DD',
                  color: '#1C1A17',
                }}
              />
              {selectedMetric && (() => {
                const m = SEED_METRICS.find(x => x.name === selectedMetric);
                if (!m) return null;
                const hint = m.measurement_type === 'binary' ? '(0 or 1)' :
                  m.measurement_type === 'scale' ? `(${m.scale_min ?? 0}–${m.scale_max ?? 5})` :
                  m.measurement_type === 'percentage' ? '(0–100)' :
                  m.measurement_type === 'count' ? `(count, max ${m.scale_max ?? '...'})` : '';
                return <p className="text-[10px] mt-1" style={{ color: '#C5BFB8' }}>{m.measurement_type} {hint}</p>;
              })()}
            </div>

            {/* Time horizon */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B6560' }}>Frequency</label>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly', 'yearly'] as TimeHorizon[]).map(h => (
                  <button
                    key={h}
                    onClick={() => setTimeHorizon(h)}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: timeHorizon === h ? '#C49A6C' : '#FAF8F5',
                      color: timeHorizon === h ? '#FFFFFF' : '#6B6560',
                      border: `1px solid ${timeHorizon === h ? '#C49A6C' : '#E8E3DD'}`,
                    }}
                  >
                    {horizonLabel(h)}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleAdd}
              disabled={!selectedMetric}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                backgroundColor: selectedMetric ? '#C49A6C' : '#E8E3DD',
                color: selectedMetric ? '#FFFFFF' : '#C5BFB8',
                cursor: selectedMetric ? 'pointer' : 'default',
              }}
            >
              Add Target
            </button>
          </div>
        )}
      </div>

      {/* Goal groups by category */}
      {sortedGroups.map(({ category, goals: catGoals }) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLOR_MAP[category] || '#C49A6C' }}
            />
            <h2 className="text-sm font-semibold" style={{ color: '#6B6560' }}>{category}</h2>
            <span className="text-[10px]" style={{ color: '#C5BFB8' }}>
              {catGoals.filter(g => g.currentValue >= g.targetValue).length}/{catGoals.length}
            </span>
          </div>

          <div className="space-y-2">
            {catGoals.map(goal => (
              <MetricGoalCard
                key={goal.id}
                goal={goal}
                onDelete={handleDelete}
                onUpdateCurrent={handleUpdateCurrent}
              />
            ))}
          </div>
        </div>
      ))}

      {sortedGroups.length === 0 && !showForm && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: '#9A938B' }}>No metric targets set yet.</p>
          <p className="text-xs mt-1" style={{ color: '#C5BFB8' }}>
            Tap &quot;Add Target&quot; to create recurring goals for your metrics.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Goal Card ────────────────────────────────────────────────────────────────

function MetricGoalCard({
  goal,
  onDelete,
  onUpdateCurrent,
}: {
  goal: MetricGoalLocal;
  onDelete: (id: string) => void;
  onUpdateCurrent: (id: string, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(goal.currentValue);

  const pct = progressPct(goal.currentValue, goal.targetValue);
  const color = progressColor(goal.currentValue, goal.targetValue);
  const met = goal.currentValue >= goal.targetValue;

  return (
    <div
      className="rounded-2xl p-3.5 transition-all"
      style={{
        backgroundColor: met ? 'rgba(123, 175, 126, 0.05)' : '#FFFFFF',
        border: `1px solid ${met ? 'rgba(123, 175, 126, 0.3)' : '#E8E3DD'}`,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: color }}
        />

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-medium truncate"
              style={{ color: met ? '#7BAF7E' : '#1C1A17' }}
            >
              {goal.metricName}
            </span>
            <span className="text-[10px] font-medium ml-2 flex-shrink-0" style={{ color: '#C5BFB8' }}>
              {horizonLabel(goal.timeHorizon)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px]" style={{ color: '#9A938B' }}>
                {goal.currentValue} / {goal.targetValue}
              </span>
              <span className="text-[10px] font-medium" style={{ color }}>{Math.round(pct)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F0EDE8' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>

          {/* Inline value editor */}
          {editing ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min={0}
                step={1}
                value={tempValue}
                onChange={e => setTempValue(Math.max(0, Number(e.target.value)))}
                className="flex-1 px-2 py-1 rounded-lg text-xs outline-none"
                style={{ backgroundColor: '#FAF8F5', border: '1px solid #E8E3DD', color: '#1C1A17' }}
                autoFocus
              />
              <button
                onClick={() => { onUpdateCurrent(goal.id, tempValue); setEditing(false); }}
                className="text-[10px] font-medium px-2 py-1 rounded-lg"
                style={{ backgroundColor: '#C49A6C', color: '#FFFFFF' }}
              >
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setTempValue(goal.currentValue); }}
                className="text-[10px] px-1.5 py-1"
                style={{ color: '#9A938B' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 mt-1.5">
              <button
                onClick={() => { setTempValue(goal.currentValue); setEditing(true); }}
                className="text-[10px]"
                style={{ color: '#C49A6C' }}
              >
                Update value
              </button>
              <button
                onClick={() => onDelete(goal.id)}
                className="text-[10px]"
                style={{ color: '#C5BFB8' }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
