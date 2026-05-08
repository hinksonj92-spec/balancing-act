'use client';

import { useState, useRef, useEffect } from 'react';
import { mockExtractMetrics } from '@/lib/mockData';

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
  questions?: string[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey! How was your day? Tell me what you've been up to and I'll update your tracker.",
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

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock AI extraction
    const result = mockExtractMetrics(userMessage.content);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: result.updates.length > 0
        ? "Here's what I picked up from that:"
        : "I'm not sure what to update based on that.",
      timestamp: new Date(),
      extractedUpdates: result.updates.map(u => ({ ...u, confirmed: undefined })),
      questions: result.questions,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsProcessing(false);
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

  const handleConfirmAll = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;

      // Add confirmation message
      const confirmedCount = msg.extractedUpdates?.filter(u => u.confirmed !== false).length || 0;

      return {
        ...msg,
        extractedUpdates: msg.extractedUpdates?.map(u => ({
          ...u,
          confirmed: u.confirmed !== false ? true : false,
        })),
      };
    }));

    // Add confirmation response
    const confirmedUpdates = messages.find(m => m.id === messageId)?.extractedUpdates?.filter(u => u.confirmed !== false) || [];
    const confirmMsg: Message = {
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: `Got it! Updated ${confirmedUpdates.length} metric${confirmedUpdates.length !== 1 ? 's' : ''}. Your scores are recalculating now. Anything else to log?`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, confirmMsg]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div>
          <h1 className="text-lg font-bold text-gray-100">Daily Check-in</h1>
          <p className="text-[10px] text-gray-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Voice button placeholder */}
          <button
            className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400"
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
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-md'
                    : 'bg-dark-card text-gray-200 rounded-bl-md'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-[9px] mt-1 opacity-50">
                  {msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Confirmation Card */}
            {msg.extractedUpdates && msg.extractedUpdates.length > 0 && (
              <div className="mt-3 bg-dark-card rounded-card p-4 border border-gray-700">
                <p className="text-xs font-medium text-gray-400 mb-3">Detected updates:</p>
                <div className="space-y-2">
                  {msg.extractedUpdates.map((update, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: update.category_color }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm text-gray-200 truncate">{update.metric_name}</div>
                          <div className="text-[10px] text-gray-500">
                            {update.category} · {Math.round(update.confidence * 100)}% confidence
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <span className="text-sm font-semibold text-gray-200 mr-2">
                          {update.value === 1 ? 'Yes' : update.value === 0 ? 'No' : update.value}
                        </span>
                        {update.confirmed === undefined ? (
                          <>
                            <button
                              onClick={() => handleConfirmUpdate(msg.id, update.metric_name, true)}
                              className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs hover:bg-green-500/30"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleConfirmUpdate(msg.id, update.metric_name, false)}
                              className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs hover:bg-red-500/30"
                            >
                              ✕
                            </button>
                          </>
                        ) : update.confirmed ? (
                          <span className="text-green-400 text-sm">✓</span>
                        ) : (
                          <span className="text-red-400 text-sm line-through">✕</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Confirm All button */}
                {msg.extractedUpdates.some(u => u.confirmed === undefined) && (
                  <button
                    onClick={() => handleConfirmAll(msg.id)}
                    className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white rounded-button py-2.5 text-sm font-semibold transition-colors"
                  >
                    Confirm All
                  </button>
                )}

                {/* Follow-up questions */}
                {msg.questions && msg.questions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {msg.questions.map((q, i) => (
                      <p key={i} className="text-xs text-yellow-400 bg-yellow-400/10 rounded-lg px-3 py-2">
                        {q}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Questions without updates */}
            {msg.questions && msg.questions.length > 0 && (!msg.extractedUpdates || msg.extractedUpdates.length === 0) && (
              <div className="mt-2 space-y-1">
                {msg.questions.map((q, i) => (
                  <p key={i} className="text-xs text-gray-400 bg-dark-card rounded-lg px-3 py-2">
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
            <div className="bg-dark-card rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-800 pt-3 pb-1">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Tell me about your day..."
            className="flex-1 bg-gray-800 rounded-button px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-button px-4 py-3 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[9px] text-gray-600 text-center mt-2">
          Voice input coming soon — type your update for now
        </p>
      </div>
    </div>
  );
}
