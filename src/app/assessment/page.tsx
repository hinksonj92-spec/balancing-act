'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ---- Types ----
interface AssessmentResponse {
  attributeName: string;
  questionText: string;
  score: number;
}

interface AttributeAverage {
  name: string;
  average: number;
  weight: number;
}

interface ChristlikeAssessment {
  id: string;
  date: string;
  periodLabel: string;
  responses: AssessmentResponse[];
  attributeAverages: AttributeAverage[];
  overallAverage: number;
  overallWeighted: number;
}

// ---- Assessment Data ----
const ATTRIBUTES = [
  {
    name: 'Faith',
    weight: 1,
    questions: [
      'I exercise faith in Jesus Christ',
      'I act in faith even when uncertain',
      'I trust God\'s plan for my life',
    ],
  },
  {
    name: 'Hope',
    weight: 1,
    questions: [
      'I have hope for the future',
      'I remain optimistic through trials',
      'I look forward to eternal blessings',
    ],
  },
  {
    name: 'Charity & Love',
    weight: 1,
    questions: [
      'I feel genuine love for others',
      'I serve without expecting recognition',
      'I forgive readily',
    ],
  },
  {
    name: 'Virtue',
    weight: 1,
    questions: [
      'I seek after virtuous things',
      'My thoughts are clean and uplifting',
      'I choose entertainment that invites the Spirit',
    ],
  },
  {
    name: 'Knowledge',
    weight: 1,
    questions: [
      'I actively seek learning and truth',
      'I study the scriptures with intent to understand',
      'I apply what I learn',
    ],
  },
  {
    name: 'Patience',
    weight: 1,
    questions: [
      'I remain calm in frustrating situations',
      'I give others time to grow',
      'I wait on the Lord\'s timing',
    ],
  },
  {
    name: 'Humility',
    weight: 1,
    questions: [
      'I acknowledge my dependence on God',
      'I accept correction gracefully',
      'I recognize others\' strengths',
    ],
  },
  {
    name: 'Diligence',
    weight: 1,
    questions: [
      'I persist in doing good',
      'I follow through on commitments',
      'I work hard even when no one is watching',
    ],
  },
  {
    name: 'Obedience',
    weight: 1,
    questions: [
      'I keep the commandments willingly',
      'I follow prophetic counsel',
      'I honor my covenants',
    ],
  },
];

const STORAGE_KEY = 'balancing-act-christlike-assessments';

function getAssessments(): ChristlikeAssessment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAssessments(assessments: ChristlikeAssessment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
}

function getCurrentQuarterLabel(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- Rating Input Component ----
function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-3 justify-center">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="transition-all duration-200"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `2px solid ${n <= value ? '#C49A6C' : '#E8E3DD'}`,
            backgroundColor: n <= value ? '#C49A6C' : 'transparent',
            color: n <= value ? '#FFFFFF' : '#9A938B',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            transform: n <= value ? 'scale(1.08)' : 'scale(1)',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ---- Radar Chart Component (SVG) ----
function RadarChart({ attributes }: { attributes: AttributeAverage[] }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 110;
  const levels = 5;
  const count = attributes.length;
  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2; // start from top

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 5) * maxRadius;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  // Grid circles
  const gridCircles = Array.from({ length: levels }, (_, i) => {
    const r = ((i + 1) / levels) * maxRadius;
    const points = Array.from({ length: count }, (_, j) => {
      const angle = startAngle + j * angleStep;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
    return points;
  });

  // Data polygon
  const dataPoints = attributes.map((a, i) => {
    const p = getPoint(i, a.average);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid */}
      {gridCircles.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="#E8E3DD"
          strokeWidth={i === levels - 1 ? 1.5 : 0.75}
        />
      ))}

      {/* Axis lines */}
      {attributes.map((_, i) => {
        const p = getPoint(i, 5);
        return (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E8E3DD" strokeWidth={0.75} />
        );
      })}

      {/* Data fill */}
      <polygon
        points={dataPoints}
        fill="rgba(196, 154, 108, 0.2)"
        stroke="#C49A6C"
        strokeWidth={2}
      />

      {/* Data points */}
      {attributes.map((a, i) => {
        const p = getPoint(i, a.average);
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill="#C49A6C" />;
      })}

      {/* Labels */}
      {attributes.map((a, i) => {
        const p = getPoint(i, 5.8);
        const angle = startAngle + i * angleStep;
        const degrees = (angle * 180) / Math.PI;
        let anchor: 'start' | 'middle' | 'end' = 'middle';
        if (degrees > -80 && degrees < 80) anchor = 'start';
        else if (degrees > 100 || degrees < -100) anchor = 'end';

        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="central"
            fill="#6B6560"
            fontSize={10}
            fontWeight={500}
          >
            {a.name}
          </text>
        );
      })}
    </svg>
  );
}

// ---- Score Label ----
function getScoreLabel(score: number): string {
  if (score >= 4.5) return 'Excellent';
  if (score >= 3.5) return 'Strong';
  if (score >= 2.5) return 'Developing';
  if (score >= 1.5) return 'Emerging';
  return 'Beginning';
}

function getScoreColor(score: number): string {
  if (score >= 4.0) return '#7BAF7E';
  if (score >= 3.0) return '#C49A6C';
  if (score >= 2.0) return '#D4A96A';
  return '#C47060';
}

// ---- Main Page Component ----
type PageView = 'home' | 'active' | 'results' | 'detail';

export default function AssessmentPage() {
  const router = useRouter();
  const [view, setView] = useState<PageView>('home');
  const [assessments, setAssessments] = useState<ChristlikeAssessment[]>([]);
  const [currentAttributeIdx, setCurrentAttributeIdx] = useState(0);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [animating, setAnimating] = useState(false);
  const [completedAssessment, setCompletedAssessment] = useState<ChristlikeAssessment | null>(null);
  const [detailAssessment, setDetailAssessment] = useState<ChristlikeAssessment | null>(null);

  useEffect(() => {
    setAssessments(getAssessments());
  }, []);

  const currentAttribute = ATTRIBUTES[currentAttributeIdx];

  // Get current responses for the active attribute
  const currentResponses = useMemo(() => {
    if (!currentAttribute) return [];
    return currentAttribute.questions.map(q => {
      const existing = responses.find(r => r.attributeName === currentAttribute.name && r.questionText === q);
      return existing?.score ?? 0;
    });
  }, [currentAttribute, responses]);

  const allCurrentAnswered = currentResponses.every(s => s > 0);

  const handleRate = useCallback((questionIdx: number, score: number) => {
    const q = currentAttribute.questions[questionIdx];
    setResponses(prev => {
      const filtered = prev.filter(
        r => !(r.attributeName === currentAttribute.name && r.questionText === q)
      );
      return [...filtered, { attributeName: currentAttribute.name, questionText: q, score }];
    });
  }, [currentAttribute]);

  const goNext = useCallback(() => {
    if (currentAttributeIdx < ATTRIBUTES.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentAttributeIdx(i => i + 1);
        setAnimating(false);
      }, 200);
    } else {
      // Finish assessment
      const attributeAverages: AttributeAverage[] = ATTRIBUTES.map(attr => {
        const attrResponses = responses.filter(r => r.attributeName === attr.name);
        const avg = attrResponses.length > 0
          ? attrResponses.reduce((s, r) => s + r.score, 0) / attrResponses.length
          : 0;
        return { name: attr.name, average: Math.round(avg * 100) / 100, weight: attr.weight };
      });

      const totalWeight = attributeAverages.reduce((s, a) => s + a.weight, 0);
      const overallWeighted = totalWeight > 0
        ? attributeAverages.reduce((s, a) => s + a.average * a.weight, 0) / totalWeight
        : 0;
      const overallAverage = attributeAverages.length > 0
        ? attributeAverages.reduce((s, a) => s + a.average, 0) / attributeAverages.length
        : 0;

      const newAssessment: ChristlikeAssessment = {
        id: generateId(),
        date: new Date().toISOString(),
        periodLabel: getCurrentQuarterLabel(),
        responses,
        attributeAverages,
        overallAverage: Math.round(overallAverage * 100) / 100,
        overallWeighted: Math.round(overallWeighted * 100) / 100,
      };

      const updated = [newAssessment, ...assessments];
      saveAssessments(updated);
      setAssessments(updated);
      setCompletedAssessment(newAssessment);
      setView('results');
    }
  }, [currentAttributeIdx, responses, assessments]);

  const goPrev = useCallback(() => {
    if (currentAttributeIdx > 0) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentAttributeIdx(i => i - 1);
        setAnimating(false);
      }, 200);
    }
  }, [currentAttributeIdx]);

  const startNew = () => {
    setResponses([]);
    setCurrentAttributeIdx(0);
    setCompletedAssessment(null);
    setView('active');
  };

  const viewDetail = (a: ChristlikeAssessment) => {
    setDetailAssessment(a);
    setView('detail');
  };

  // ---- Render: Home ----
  if (view === 'home') {
    return (
      <div className="space-y-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#F0EDE8' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>Christlike Assessment</h1>
            <p className="text-xs" style={{ color: '#9A938B' }}>Quarterly self-reflection</p>
          </div>
        </div>

        {/* Intro Card */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(196, 154, 108, 0.12)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C49A6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1C1A17' }}>9 Christlike Attributes</p>
              <p className="text-xs" style={{ color: '#9A938B' }}>27 questions, rated 1-5</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#6B6560' }}>
            Reflect on your personal growth in faith, hope, charity, virtue, knowledge, patience, humility, diligence, and obedience. Each attribute is assessed with three questions on a scale of 1 to 5.
          </p>
          <button
            onClick={startNew}
            className="w-full mt-4 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#C49A6C', color: '#FFFFFF' }}
          >
            Start New Assessment
          </button>
        </div>

        {/* History */}
        {assessments.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold px-1 mb-2 uppercase tracking-wide" style={{ color: '#6B6560' }}>
              Past Assessments
            </h2>
            <div className="space-y-2">
              {assessments.map(a => (
                <button
                  key={a.id}
                  onClick={() => viewDetail(a)}
                  className="w-full rounded-2xl p-4 text-left transition-colors"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: '#1C1A17' }}>{a.periodLabel}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      backgroundColor: `${getScoreColor(a.overallAverage)}18`,
                      color: getScoreColor(a.overallAverage),
                    }}>
                      {a.overallAverage.toFixed(1)} / 5.0
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {a.attributeAverages.map((attr, i) => (
                      <div key={i} className="flex-1">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            backgroundColor: getScoreColor(attr.average),
                            opacity: 0.3 + (attr.average / 5) * 0.7,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: '#9A938B' }}>
                    {new Date(a.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ---- Render: Active Assessment ----
  if (view === 'active') {
    const progress = ((currentAttributeIdx) / ATTRIBUTES.length) * 100;
    const totalAnswered = responses.length;
    const totalQuestions = ATTRIBUTES.reduce((s, a) => s + a.questions.length, 0);

    return (
      <div className="space-y-4 pb-8">
        {/* Header with progress */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => {
              if (currentAttributeIdx === 0) {
                setView('home');
              } else {
                goPrev();
              }
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#F0EDE8' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: '#6B6560' }}>
                {currentAttributeIdx + 1} of {ATTRIBUTES.length}
              </span>
              <span className="text-xs" style={{ color: '#9A938B' }}>
                {totalAnswered}/{totalQuestions} answered
              </span>
            </div>
            <div className="h-1.5 rounded-full" style={{ backgroundColor: '#E8E3DD' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ backgroundColor: '#C49A6C', width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Attribute dots */}
        <div className="flex justify-center gap-1.5 py-1">
          {ATTRIBUTES.map((attr, i) => {
            const attrDone = attr.questions.every(q =>
              responses.some(r => r.attributeName === attr.name && r.questionText === q && r.score > 0)
            );
            return (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === currentAttributeIdx ? 20 : 8,
                  height: 8,
                  backgroundColor: i === currentAttributeIdx
                    ? '#C49A6C'
                    : attrDone
                      ? 'rgba(196, 154, 108, 0.5)'
                      : '#E8E3DD',
                }}
              />
            );
          })}
        </div>

        {/* Questions Card */}
        <div
          className="rounded-2xl p-5 transition-opacity duration-200"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8E3DD',
            opacity: animating ? 0 : 1,
          }}
        >
          <h2 className="text-lg font-bold mb-1 text-center" style={{ color: '#1C1A17' }}>
            {currentAttribute.name}
          </h2>
          <p className="text-xs text-center mb-5" style={{ color: '#9A938B' }}>
            Rate each statement from 1 (rarely) to 5 (consistently)
          </p>

          <div className="space-y-6">
            {currentAttribute.questions.map((q, qi) => (
              <div key={qi}>
                <p className="text-sm text-center mb-3 leading-relaxed" style={{ color: '#6B6560' }}>
                  {q}
                </p>
                <RatingInput
                  value={currentResponses[qi]}
                  onChange={(score) => handleRate(qi, score)}
                />
                <div className="flex justify-between mt-1.5 px-1">
                  <span className="text-[10px]" style={{ color: '#9A938B' }}>Rarely</span>
                  <span className="text-[10px]" style={{ color: '#9A938B' }}>Consistently</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentAttributeIdx > 0 && (
            <button
              onClick={goPrev}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: '#F0EDE8', color: '#6B6560' }}
            >
              Previous
            </button>
          )}
          <button
            onClick={goNext}
            disabled={!allCurrentAnswered}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
            style={{
              backgroundColor: allCurrentAnswered ? '#C49A6C' : '#E8E3DD',
              color: allCurrentAnswered ? '#FFFFFF' : '#9A938B',
            }}
          >
            {currentAttributeIdx === ATTRIBUTES.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    );
  }

  // ---- Render: Results ----
  if (view === 'results' && completedAssessment) {
    return <ResultsView assessment={completedAssessment} onDone={() => setView('home')} onRetake={startNew} />;
  }

  // ---- Render: Detail (past assessment) ----
  if (view === 'detail' && detailAssessment) {
    return <ResultsView assessment={detailAssessment} onDone={() => { setDetailAssessment(null); setView('home'); }} />;
  }

  return null;
}

// ---- Results View Component ----
function ResultsView({
  assessment,
  onDone,
  onRetake,
}: {
  assessment: ChristlikeAssessment;
  onDone: () => void;
  onRetake?: () => void;
}) {
  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onDone}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#F0EDE8' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1C1A17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1C1A17' }}>Assessment Results</h1>
          <p className="text-xs" style={{ color: '#9A938B' }}>{assessment.periodLabel}</p>
        </div>
      </div>

      {/* Overall Score */}
      <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#9A938B' }}>Overall Score</p>
        <div className="text-4xl font-bold mb-1" style={{ color: getScoreColor(assessment.overallAverage) }}>
          {assessment.overallAverage.toFixed(1)}
        </div>
        <p className="text-sm" style={{ color: '#6B6560' }}>out of 5.0</p>
        <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium" style={{
          backgroundColor: `${getScoreColor(assessment.overallAverage)}18`,
          color: getScoreColor(assessment.overallAverage),
        }}>
          {getScoreLabel(assessment.overallAverage)}
        </div>
      </div>

      {/* Radar Chart */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3 text-center" style={{ color: '#6B6560' }}>
          Attribute Profile
        </p>
        <RadarChart attributes={assessment.attributeAverages} />
      </div>

      {/* Per-attribute breakdown */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#6B6560' }}>
          Attribute Scores
        </p>
        <div className="space-y-3">
          {assessment.attributeAverages
            .slice()
            .sort((a, b) => b.average - a.average)
            .map((attr, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: '#1C1A17' }}>{attr.name}</span>
                  <span className="text-sm font-semibold" style={{ color: getScoreColor(attr.average) }}>
                    {attr.average.toFixed(1)}
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ backgroundColor: '#F0EDE8' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(attr.average / 5) * 100}%`,
                      backgroundColor: getScoreColor(attr.average),
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Strengths and Growth Areas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#7BAF7E' }}>
            Strengths
          </p>
          <div className="space-y-1.5">
            {assessment.attributeAverages
              .slice()
              .sort((a, b) => b.average - a.average)
              .slice(0, 3)
              .map((attr, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#7BAF7E' }} />
                  <span className="text-xs" style={{ color: '#1C1A17' }}>{attr.name}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DD' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#D4A96A' }}>
            Growth Areas
          </p>
          <div className="space-y-1.5">
            {assessment.attributeAverages
              .slice()
              .sort((a, b) => a.average - b.average)
              .slice(0, 3)
              .map((attr, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#D4A96A' }} />
                  <span className="text-xs" style={{ color: '#1C1A17' }}>{attr.name}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onDone}
          className="flex-1 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: '#F0EDE8', color: '#6B6560' }}
        >
          Back to History
        </button>
        {onRetake && (
          <button
            onClick={onRetake}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#C49A6C', color: '#FFFFFF' }}
          >
            Retake
          </button>
        )}
      </div>

      {/* Date footer */}
      <p className="text-center text-[10px]" style={{ color: '#9A938B' }}>
        Completed {new Date(assessment.date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}
