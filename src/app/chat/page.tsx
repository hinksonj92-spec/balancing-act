'use client';

import { useState, useRef, useEffect } from 'react';
import { mockExtractMetrics } from '@/lib/mockData';

interface GoalAction {
  type: 'add' | 'edit' | 'delete' | 'complete' | 'update_progress';
  goal_name: string;
  category?: string;
  target_date?: string;
  progress_pct?: number;
  description?: string;
  confirmed?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractedUpdates?: {
    metric_name: string;
    value: number;
    confidence: number;
    category: string;
    category_color: string;
    confirmed?: boolean;
  }[];
  goalActions?: GoalAction[];
  questions?: string[];
}

function getActionDescription(action: GoalAction): string {
  switch (action.type) {
    case 'add': return `Add new goal: "${action.goal_name}"${action.category ? ` (${action.category})` : ''}`;
    case 'complete': return `Mark "${action.goal_name}" as completed`;
    case 'update_progress': return `Update "${action.goal_name}" progress to ${action.progress_pct}%`;
    case 'delete': return `Remove goal: "${action.goal_name}"`;
    case 'edit': return `Update "${action.goal_name}"${action.target_date ? ` — target: ${action.target_date}` : ''}`;
    default: return '';
  }
}

function getActionIcon(type: string): string {
  switch (type) {
    case 'add': return '+';
    case 'complete': return '✓';
    case 'update_progress': return '↗';
    case 'delete': return '×';
    case 'edit': return '✎';
    default: return '•';
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  'Spiritual': '#C49A6C', 'Family': '#C47060', 'Emotional': '#D4A96A', 'Personal': '#7BAF7E',
  'Physical': '#5A9BB5', 'Financial': '#6BAA8C', 'Intellectual': '#9688B5', 'Ecclesiastical': '#B57D8F',
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey — tell me about your day, or manage your goals. I can update metrics, add goals, track progress, and more.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Build conversation history for the API
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
        }),
      });

      const data = await response.json();

      // If the API returned fallback mode (no API key), use local detection
      if (data.fallback) {
        const localResult = mockExtractMetrics(userMessage.content);
        const localGoals = detectGoalActionsLocal(userMessage.content);

        let content = data.message;
        if (localResult.updates.length > 0 || localGoals.length > 0) {
          content = "Running in demo mode — here's what I detected:";
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content,
          timestamp: new Date(),
          extractedUpdates: localResult.updates.length > 0
            ? localResult.updates.map(u => ({ ...u, confirmed: undefined }))
            : undefined,
          goalActions: localGoals.length > 0
            ? localGoals.map(a => ({ ...a, confirmed: undefined }))
            : undefined,
          questions: localResult.questions.length > 0 ? localResult.questions : undefined,
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsProcessing(false);
        return;
      }

      // Build assistant message from LLM response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        extractedUpdates: data.metric_updates?.length > 0
          ? data.metric_updates.map((u: any) => ({ ...u, confirmed: undefined }))
          : undefined,
        goalActions: data.goal_actions?.length > 0
          ? data.goal_actions.map((a: any) => ({ ...a, confirmed: undefined }))
          : undefined,
        questions: data.questions?.length > 0 ? data.questions : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Network error — fall back to local detection
      const localResult = mockExtractMetrics(userMessage.content);
      const localGoals = detectGoalActionsLocal(userMessage.content);

      let content = '';
      if (localResult.updates.length > 0 || localGoals.length > 0) {
        content = "I'm offline right now, but here's what I picked up:";
      } else {
        content = "I'm having trouble connecting. Try again in a moment.";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
        extractedUpdates: localResult.updates.length > 0
          ? localResult.updates.map(u => ({ ...u, confirmed: undefined }))
          : undefined,
        goalActions: localGoals.length > 0
          ? localGoals.map(a => ({ ...a, confirmed: undefined }))
          : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmUpdate = (messageId: string, metricName: string, confirmed: boolean) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      return {
        ...msg,
        extractedUpdates: msg.extractedUpdates?.map(u =>
          u.metric_name === metricName ? { ...u, confirmed } : u
        ),
      };
    }));
  };

  const handleConfirmGoalAction = (messageId: string, goalName: string, confirmed: boolean) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      return {
        ...msg,
        goalActions: msg.goalActions?.map(a =>
          a.goal_name === goalName ? { ...a, confirmed } : a
        ),
      };
    }));
  };

  const handleConfirmAll = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      return {
        ...msg,
        extractedUpdates: msg.extractedUpdates?.map(u => ({
          ...u,
          confirmed: u.confirmed !== false ? true : false,
        })),
        goalActions: msg.goalActions?.map(a => ({
          ...a,
          confirmed: a.confirmed !== false ? true : false,
        })),
      };
    }));

    const msg = messages.find(m => m.id === messageId);
    const metricCount = msg?.extractedUpdates?.filter(u => u.confirmed !== false).length || 0;
    const goalCount = msg?.goalActions?.filter(a => a.confirmed !== false).length || 0;
    const parts = [];
    if (metricCount > 0) parts.push(`${metricCount} metric${metricCount !== 1 ? 's' : ''}`);
    if (goalCount > 0) parts.push(`${goalCount} goal${goalCount !== 1 ? 's' : ''}`);

    const confirmMsg: Message = {
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: `Done — updated ${parts.join(' and ')}. What else?`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, confirmMsg]);
  };

  const hasPending = (msg: Message) => {
    const pendingMetrics = msg.extractedUpdates?.some(u => u.confirmed === undefined) || false;
    const pendingGoals = msg.goalActions?.some(a => a.confirmed === undefined) || false;
    return pendingMetrics || pendingGoals;
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 6.5rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid #2D2824' }}>
        <div>
          <h1 className="text-lg font-bold" style={{ color: '#F5F0EB' }}>Daily Check-in</h1>
          <p className="text-[10px]" style={{ color: '#6B6560' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#24221E', color: '#6B6560' }}
            title="Voice input coming soon"
            disabled
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id}>
            {/* Message bubble */}
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3"
                style={msg.role === 'user'
                  ? { backgroundColor: '#C49A6C', color: '#141210', borderBottomRightRadius: '6px' }
                  : { backgroundColor: '#1C1A17', color: '#F5F0EB', borderBottomLeftRadius: '6px' }
                }
              >
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
                <p className="text-[9px] mt-1 opacity-50">
                  {msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Metric Confirmation Card */}
            {msg.extractedUpdates && msg.extractedUpdates.length > 0 && (
              <div className="mt-3 rounded-2xl p-4" style={{ backgroundColor: '#1C1A17', border: '1px solid #2D2824' }}>
                <p className="text-xs font-medium mb-3" style={{ color: '#A39B91' }}>Metric updates:</p>
                <div className="space-y-2">
                  {msg.extractedUpdates.map((update, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: '#24221E' }}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: update.category_color }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm truncate" style={{ color: '#F5F0EB' }}>{update.metric_name}</div>
                          <div className="text-[10px]" style={{ color: '#6B6560' }}>
                            {update.category} · {Math.round(update.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <span className="text-sm font-semibold mr-2" style={{ color: '#F5F0EB' }}>
                          {update.value === 1 ? 'Yes' : update.value === 0 ? 'No' : update.value}
                        </span>
                        {update.confirmed === undefined ? (
                          <>
                            <button
                              onClick={() => handleConfirmUpdate(msg.id, update.metric_name, true)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                              style={{ backgroundColor: 'rgba(123, 175, 126, 0.15)', color: '#7BAF7E' }}
                            >✓</button>
                            <button
                              onClick={() => handleConfirmUpdate(msg.id, update.metric_name, false)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                              style={{ backgroundColor: 'rgba(196, 112, 96, 0.15)', color: '#C47060' }}
                            >✕</button>
                          </>
                        ) : update.confirmed ? (
                          <span style={{ color: '#7BAF7E' }} className="text-sm">✓</span>
                        ) : (
                          <span style={{ color: '#C47060' }} className="text-sm line-through">✕</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goal Action Cards */}
            {msg.goalActions && msg.goalActions.length > 0 && (
              <div className="mt-3 rounded-2xl p-4" style={{ backgroundColor: '#1C1A17', border: '1px solid #2D2824' }}>
                <p className="text-xs font-medium mb-3" style={{ color: '#A39B91' }}>Goal changes:</p>
                <div className="space-y-2">
                  {msg.goalActions.map((action, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: '#24221E' }}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            backgroundColor: action.type === 'delete'
                              ? 'rgba(196, 112, 96, 0.15)'
                              : action.type === 'complete'
                                ? 'rgba(123, 175, 126, 0.15)'
                                : 'rgba(196, 154, 108, 0.15)',
                            color: action.type === 'delete'
                              ? '#C47060'
                              : action.type === 'complete'
                                ? '#7BAF7E'
                                : '#C49A6C',
                          }}
                        >
                          {getActionIcon(action.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm truncate" style={{ color: '#F5F0EB' }}>{getActionDescription(action)}</div>
                          {action.category && (
                            <div className="text-[10px]" style={{ color: CATEGORY_COLORS[action.category] || '#6B6560' }}>
                              {action.category}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {action.confirmed === undefined ? (
                          <>
                            <button
                              onClick={() => handleConfirmGoalAction(msg.id, action.goal_name, true)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                              style={{ backgroundColor: 'rgba(123, 175, 126, 0.15)', color: '#7BAF7E' }}
                            >✓</button>
                            <button
                              onClick={() => handleConfirmGoalAction(msg.id, action.goal_name, false)}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                              style={{ backgroundColor: 'rgba(196, 112, 96, 0.15)', color: '#C47060' }}
                            >✕</button>
                          </>
                        ) : action.confirmed ? (
                          <span style={{ color: '#7BAF7E' }} className="text-sm">✓</span>
                        ) : (
                          <span style={{ color: '#C47060' }} className="text-sm line-through">✕</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm All button */}
            {hasPending(msg) && (
              <div className="mt-3">
                <button
                  onClick={() => handleConfirmAll(msg.id)}
                  className="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors"
                  style={{ backgroundColor: '#C49A6C', color: '#141210' }}
                >
                  Confirm All
                </button>
              </div>
            )}

            {/* Follow-up questions */}
            {msg.questions && msg.questions.length > 0 && (
              <div className="mt-3 space-y-1">
                {msg.questions.map((q, i) => (
                  <p key={i} className="text-xs rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(212, 169, 106, 0.1)', color: '#D4A96A' }}>
                    {q}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: '#1C1A17', borderBottomLeftRadius: '6px' }}>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#6B6560', animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#6B6560', animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#6B6560', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="pt-3 pb-1" style={{ borderTop: '1px solid #2D2824' }}>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Log your day or manage goals..."
            className="flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{
              backgroundColor: '#24221E',
              color: '#F5F0EB',
              '--tw-ring-color': 'rgba(196, 154, 108, 0.3)',
            } as any}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="rounded-xl px-4 py-3 transition-colors disabled:opacity-30"
            style={{ backgroundColor: '#C49A6C', color: '#141210' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[9px] text-center mt-2" style={{ color: '#3D3832' }}>
          Powered by AI · Voice input coming soon
        </p>
      </div>
    </div>
  );
}

// Local fallback goal detection (used when API is unavailable)
function detectGoalActionsLocal(text: string): GoalAction[] {
  const lower = text.toLowerCase();
  const actions: GoalAction[] = [];

  const addMatch = lower.match(/(?:add|create|new|set)\s+(?:a\s+)?(?:goal|life goal)(?:\s+(?:to|for|:))?\s*[""""]?(.+?)[""""]?$/i)
    || lower.match(/(?:i want to|my goal is to|i'd like to)\s+(.+)/i);
  if (addMatch) {
    const goalName = addMatch[1].replace(/["""".!]+$/, '').trim();
    let category = '';
    if (/physical|exercise|run|marathon|fitness|health|iron\s*man/i.test(goalName)) category = 'Physical';
    else if (/spiritual|faith|temple|mission|church/i.test(goalName)) category = 'Spiritual';
    else if (/family|marriage|kids|parent/i.test(goalName)) category = 'Family';
    else if (/financial|money|save|invest|property|book|publish/i.test(goalName)) category = 'Financial';
    else if (/intellectual|degree|learn|study|master/i.test(goalName)) category = 'Intellectual';
    else if (/personal|travel|visit|experience/i.test(goalName)) category = 'Personal';
    else if (/emotional|mental|therapy|mindful/i.test(goalName)) category = 'Emotional';
    else if (/ecclesiastical|serve|calling|volunteer/i.test(goalName)) category = 'Ecclesiastical';
    actions.push({ type: 'add', goal_name: goalName, category: category || undefined });
  }

  const completeMatch = lower.match(/(?:complete|finished|done with|accomplished|mark.+complete)\s+[""""]?(.+?)[""""]?$/i)
    || lower.match(/(?:i (?:completed|finished|accomplished))\s+(.+)/i);
  if (completeMatch) {
    actions.push({ type: 'complete', goal_name: completeMatch[1].replace(/["""".!]+$/, '').trim() });
  }

  const progressMatch = lower.match(/(?:update|set|change)\s+(?:progress\s+(?:on|for)\s+)?[""""]?(.+?)[""""]?\s+(?:to|at|is)\s+(\d+)%?/i)
    || lower.match(/[""""]?(.+?)[""""]?\s+(?:is|progress)\s+(?:at\s+)?(\d+)%/i);
  if (progressMatch) {
    actions.push({
      type: 'update_progress',
      goal_name: progressMatch[1].replace(/["""".!]+$/, '').trim(),
      progress_pct: parseInt(progressMatch[2]),
    });
  }

  const deleteMatch = lower.match(/(?:delete|remove|drop)\s+(?:the\s+)?(?:goal\s+)?[""""]?(.+?)[""""]?$/i);
  if (deleteMatch) {
    actions.push({ type: 'delete', goal_name: deleteMatch[1].replace(/["""".!]+$/, '').trim() });
  }

  return actions;
}
