import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BASE_SYSTEM_PROMPT = `You are the AI assistant for "Balancing Act", a life-balance tracker app. The user tracks 8 life categories with daily/weekly/monthly metrics, plus life goals.

## Categories & Sample Metrics

1. **Spiritual** (color: #C49A6C) — Faith, worship, spiritual growth
   Metrics: Keeping the Commandments, Daily Scripture Reading, Church Attendance, Tithing, Temple Attendance, Ponderize One Scripture, Daily Strive to Live Like Christ, Family Home Evening, Family Prayers, Personal Prayers

2. **Family** (color: #C47060) — Family relationships and quality time
   Metrics: 2 Hours with Family, Weekly Date with Wife, Family Prayers, Family Activity, Quality Time with Each Child, Family Dinner Together

3. **Emotional** (color: #D4A96A) — Emotional health and wellbeing
   Metrics: Positive Attitude, Gratitude Practice, Managed Stress Well, Emotional Check-in, Patience Score, No Anger Outbursts

4. **Personal** (color: #7BAF7E) — Personal habits, discipline, growth
   Metrics: Daily Journal, Go to Bed Before 12:00, Wake Up Before 6:00, Daily Planning, No Social Media Binge, Read 30 Min, Morning Routine Complete

5. **Physical** (color: #5A9BB5) — Exercise, nutrition, physical health
   Metrics: Daily Exercise, Eat Healthy, Good Night's Rest, Daily Stretching, 10000 Steps, Drink 64oz Water, No Junk Food

6. **Financial** (color: #6BAA8C) — Earning, saving, investing, giving
   Metrics: Stayed on Budget, Reviewed Finances, Side Income Work, Generous Giving, No Impulse Purchases

7. **Intellectual** (color: #9688B5) — Learning, study, mental growth
   Metrics: Language Study, Read Non-Fiction, Skill Development, Online Course, Deep Work Session

## Your Job

When the user talks to you, do TWO things:
1. **Respond naturally** — be warm, encouraging, concise. Acknowledge what they shared. Ask follow-up questions if something is ambiguous.
2. **Extract structured data** — pull out any metric updates and goal actions from what they said.

You have FULL READ ACCESS to the user's goals and can answer questions about them (what they are, their progress, which are complete, etc.). When the user asks about their goals, reference the actual data provided below.

## Output Format

You MUST respond with ONLY valid JSON — no markdown, no code fences, no text before or after the JSON. Just the raw JSON object:

{
  "message": "Your natural language response to the user",
  "metric_updates": [
    {
      "metric_name": "Daily Scripture Reading",
      "value": 1,
      "confidence": 0.92,
      "category": "Spiritual",
      "category_color": "#C49A6C"
    }
  ],
  "goal_actions": [
    {
      "type": "add",
      "goal_name": "Run a marathon",
      "category": "Physical",
      "target_date": "2027-06-01",
      "progress_pct": null,
      "description": null
    }
  ],
  "questions": ["Optional follow-up questions if something was ambiguous"]
}

CRITICAL: Your entire response must be a single valid JSON object. Do NOT include any text outside the JSON.

## Rules for metric_updates
- value: 1 = yes/completed, 0 = no/missed. For scales use 0-1. For counts use the actual number.
- confidence: 0.0 to 1.0 — how sure you are this is what they meant
- Only include metrics you're reasonably confident about (>0.7)
- Match metric names exactly from the lists above when possible
- If a metric doesn't exist in the lists, use a descriptive name and the closest category

## Rules for goal_actions
- type: "add" | "edit" | "delete" | "complete" | "update_progress"
- For "add": include goal_name, category (one of the 8), optionally target_date and description
- For "complete": just goal_name — match the EXACT name from the user's goals list
- For "update_progress": goal_name and progress_pct (0-100) — match EXACT name
- For "delete": just goal_name — match EXACT name
- For "edit": goal_name plus whatever fields are changing (target_date, description, category) — match EXACT name
- When referencing existing goals, use their EXACT name from the goals data below

## Rules for questions
- Only ask if something is genuinely ambiguous
- Keep it to 1-2 questions max
- Empty array if nothing to ask

## Conversation style
- Be warm but not saccharine. Professional but human.
- Keep responses short — 1-3 sentences unless the user asks for more.
- If they just say hi or something unrelated to tracking, respond normally with no updates. Return empty arrays.
- If they mention something you can track but you're not sure, include it with lower confidence and ask a follow-up.
- Celebrate streaks and progress when mentioned.
- If they mention completing a life goal, suggest marking it complete via goal_actions.
- When asked "what are my goals" or similar, list their actual goals from the data.
- When asked about a specific goal, give its real status, progress, and target date.`;

function extractJSON(text: string): any {
  // Strategy 1: Try parsing the full text directly
  try {
    return JSON.parse(text);
  } catch {}

  // Strategy 2: Strip code fences
  const fenceStripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(fenceStripped);
  } catch {}

  // Strategy 3: Find the first { and last } — extract the JSON object
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // Strategy 4: All failed — return null
  return null;
}

// ---- Historical query detection ----

const HISTORICAL_PATTERNS = [
  /how (?:was|were|is|has been) my\b/i,
  /show me (?:my )?(trends?|scores?|data|history|progress)/i,
  /what (?:was|were|is|has been) my\b.*\bscore/i,
  /compare my\b/i,
  /how am i doing (?:on|in|with)\b/i,
  /how have i (?:been doing|done|performed)/i,
  /my .* (?:in|during|for|over|last|this|since) (?:the )?\d/i,
  /(?:last|past|previous) \d+ (?:days?|weeks?|months?|years?)/i,
  /\b(?:streak|streaks|progress|trend|trends|history|historical)\b/i,
  /\b(?:average|avg|mean|total|sum|best|worst|highest|lowest)\b.*\b(?:score|metric|category)\b/i,
  /how (?:did|has) .* (?:change|improve|decline|drop)/i,
  /\bthis (?:week|month|year)\b.*\b(?:score|progress|data)\b/i,
  /\b(?:weekly|monthly|yearly|annual) (?:review|summary|report|recap)\b/i,
];

function isHistoricalQuery(message: string): boolean {
  return HISTORICAL_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Parse a date range from the user's message for querying historical data.
 * Returns { startDate, endDate } as YYYY-MM-DD strings.
 */
function parseDateRange(message: string): { startDate: string; endDate: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // "last N days/weeks/months/years"
  const lastNMatch = message.match(/(?:last|past|previous) (\d+) (days?|weeks?|months?|years?)/i);
  if (lastNMatch) {
    const n = parseInt(lastNMatch[1], 10);
    const unit = lastNMatch[2].toLowerCase().replace(/s$/, '');
    const start = new Date(now);
    if (unit === 'day') start.setDate(start.getDate() - n);
    else if (unit === 'week') start.setDate(start.getDate() - n * 7);
    else if (unit === 'month') start.setMonth(start.getMonth() - n);
    else if (unit === 'year') start.setFullYear(start.getFullYear() - n);
    return { startDate: start.toISOString().slice(0, 10), endDate: today };
  }

  // "in 2024" or "in 2025"
  const yearMatch = message.match(/\bin (\d{4})\b/i);
  if (yearMatch) {
    const year = yearMatch[1];
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }

  // "this week"
  if (/this week/i.test(message)) {
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(start.getDate() - dayOfWeek);
    return { startDate: start.toISOString().slice(0, 10), endDate: today };
  }

  // "this month"
  if (/this month/i.test(message)) {
    return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  }

  // "this year"
  if (/this year/i.test(message)) {
    return { startDate: `${now.getFullYear()}-01-01`, endDate: today };
  }

  // Default: last 3 months
  const start = new Date(now);
  start.setMonth(start.getMonth() - 3);
  return { startDate: start.toISOString().slice(0, 10), endDate: today };
}

/**
 * Extract the category name(s) the user is asking about from their message.
 * Returns matching category names, or empty array if none detected (meaning all categories).
 */
function extractMentionedCategories(message: string): string[] {
  const allCategories = ['Spiritual', 'Family', 'Emotional', 'Personal', 'Physical', 'Financial', 'Intellectual'];
  const lower = message.toLowerCase();
  return allCategories.filter((cat) => lower.includes(cat.toLowerCase()));
}

/**
 * Fetch historical data from Supabase for the user's query.
 */
async function fetchHistoricalData(
  userId: string,
  message: string,
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return '(Historical data unavailable — Supabase not configured)';
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { startDate, endDate } = parseDateRange(message);
  const mentionedCategories = extractMentionedCategories(message);

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, color, weight')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (!categories || categories.length === 0) {
    return '(No categories found for this user)';
  }

  // Filter to mentioned categories if any
  const relevantCategories = mentionedCategories.length > 0
    ? categories.filter((c) => mentionedCategories.includes(c.name))
    : categories;

  const categoryIds = relevantCategories.map((c) => c.id);
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Fetch metrics for relevant categories
  const { data: metrics } = await supabase
    .from('metrics')
    .select('id, name, category_id, weight, measurement_type, measurement_frequency')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('category_id', categoryIds)
    .order('display_order', { ascending: true });

  if (!metrics || metrics.length === 0) {
    return `(No metrics found for ${mentionedCategories.length > 0 ? mentionedCategories.join(', ') : 'any category'})`;
  }

  const metricIds = metrics.map((m) => m.id);
  const metricMap = new Map(metrics.map((m) => [m.id, m]));

  // Fetch entries in the date range
  const { data: entries } = await supabase
    .from('metric_entries')
    .select('metric_id, value, normalized_value, entry_date, source')
    .eq('user_id', userId)
    .in('metric_id', metricIds)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: true })
    .limit(2000);

  // Fetch category snapshots if available
  const { data: snapshots } = await supabase
    .from('category_snapshots')
    .select('category_id, period_label, weighted_score, streak_days, trend_direction')
    .eq('user_id', userId)
    .eq('period_type', 'monthly')
    .in('category_id', categoryIds)
    .gte('period_label', startDate.slice(0, 7))
    .lte('period_label', endDate.slice(0, 7))
    .order('period_label', { ascending: true });

  // Build a summary string for the LLM
  const lines: string[] = [];
  lines.push(`## Historical Data: ${startDate} to ${endDate}`);
  lines.push('');

  // Monthly snapshots (high-level scores)
  if (snapshots && snapshots.length > 0) {
    lines.push('### Monthly Category Scores');
    for (const snap of snapshots) {
      const catName = categoryMap.get(snap.category_id) || 'Unknown';
      lines.push(`- ${catName} (${snap.period_label}): score=${(snap.weighted_score * 100).toFixed(0)}%, streak=${snap.streak_days}d, trend=${snap.trend_direction || 'n/a'}`);
    }
    lines.push('');
  }

  // Per-category metric summaries
  for (const cat of relevantCategories) {
    const catMetrics = metrics.filter((m) => m.category_id === cat.id);
    const catEntries = (entries || []).filter((e) => {
      const metric = metricMap.get(e.metric_id);
      return metric && metric.category_id === cat.id;
    });

    if (catEntries.length === 0) {
      lines.push(`### ${cat.name}: No entries in this period`);
      lines.push('');
      continue;
    }

    lines.push(`### ${cat.name} (${catEntries.length} entries)`);

    // Group entries by metric
    const byMetric = new Map<string, { values: number[]; dates: string[] }>();
    for (const entry of catEntries) {
      const metric = metricMap.get(entry.metric_id);
      if (!metric) continue;
      if (!byMetric.has(metric.name)) {
        byMetric.set(metric.name, { values: [], dates: [] });
      }
      const group = byMetric.get(metric.name)!;
      group.values.push(Number(entry.normalized_value));
      group.dates.push(entry.entry_date);
    }

    for (const [metricName, data] of byMetric) {
      const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
      const min = Math.min(...data.values);
      const max = Math.max(...data.values);
      const completionRate = data.values.filter((v) => v >= 0.5).length / data.values.length;
      lines.push(`- **${metricName}**: ${data.values.length} entries, avg=${(avg * 100).toFixed(0)}%, min=${(min * 100).toFixed(0)}%, max=${(max * 100).toFixed(0)}%, completion rate=${(completionRate * 100).toFixed(0)}%`);
    }
    lines.push('');
  }

  // Overall stats
  const totalEntries = entries?.length || 0;
  const uniqueDates = new Set((entries || []).map((e) => e.entry_date));
  lines.push(`### Summary`);
  lines.push(`- Total entries in period: ${totalEntries}`);
  lines.push(`- Days with data: ${uniqueDates.size}`);
  lines.push(`- Date range: ${startDate} to ${endDate}`);

  return lines.join('\n');
}

const HISTORICAL_SYSTEM_PROMPT = `You are the AI assistant for "Balancing Act", a life-balance tracker app. The user is asking about their historical tracking data.

You have been given their actual data below. Your job is to:
1. **Analyze the data** and answer their question conversationally.
2. **Highlight key insights** — trends, streaks, areas of strength and weakness.
3. **Be encouraging** but honest — if a category is low, acknowledge it kindly and suggest improvement.
4. **Use specific numbers** from the data when relevant (percentages, streaks, comparisons).
5. **Keep it concise** — 2-5 sentences unless the user asks for a detailed breakdown.

## Output Format

You MUST respond with ONLY valid JSON — no markdown, no code fences, no text before or after the JSON:

{
  "message": "Your natural language response analyzing the user's historical data",
  "metric_updates": [],
  "goal_actions": [],
  "questions": []
}

CRITICAL: metric_updates and goal_actions should always be empty arrays for historical queries. The message field is where all your analysis goes.`;

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, goalsContext } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;

    // Fallback to local processing if no API key
    if (!apiKey) {
      return NextResponse.json({
        message: "I'm running in demo mode without an AI key. I can still detect basic updates from keywords, but for smarter conversations, add a GOOGLE_AI_API_KEY environment variable.",
        metric_updates: [],
        goal_actions: [],
        questions: [],
        fallback: true,
      });
    }

    // ---- Detect historical query and fetch data if applicable ----
    const historicalQuery = isHistoricalQuery(message);
    let historicalDataContext = '';

    if (historicalQuery) {
      // Extract user ID from auth token
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        if (supabaseUrl && supabaseAnonKey) {
          const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
          const { data: { user } } = await supabaseAuth.auth.getUser(token);

          if (user) {
            historicalDataContext = await fetchHistoricalData(user.id, message);
          }
        }
      }
    }

    // Build the full system prompt
    let fullPrompt: string;
    if (historicalQuery && historicalDataContext) {
      fullPrompt = HISTORICAL_SYSTEM_PROMPT + `\n\n${historicalDataContext}`;
    } else {
      fullPrompt = BASE_SYSTEM_PROMPT;
    }

    if (goalsContext) {
      fullPrompt += `\n\n## User's Current Goals Data\n\n${goalsContext}`;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    // Build conversation history for context
    const historyParts = (conversationHistory || [])
      .slice(-10) // Keep last 10 messages for context
      .map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    const systemAck = historicalQuery && historicalDataContext
      ? "Got it. I'll analyze the user's historical data and respond conversationally in JSON format."
      : "Got it. I'll respond in the JSON format specified, extracting metrics and goal actions from user messages. I have access to the user's goals data.";

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: `System instructions: ${fullPrompt}` }] },
        { role: 'model', parts: [{ text: JSON.stringify({ message: systemAck, metric_updates: [], goal_actions: [], questions: [] }) }] },
        ...historyParts,
      ],
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text().trim();

    // Parse JSON with robust extraction
    const parsed = extractJSON(responseText);

    if (!parsed) {
      // If all JSON parsing strategies failed, return the raw text as message
      // but strip any JSON-looking content to avoid leaking it
      let cleanMessage = responseText;
      const jsonStart = responseText.indexOf('{');
      if (jsonStart > 0) {
        cleanMessage = responseText.slice(0, jsonStart).trim();
      }
      return NextResponse.json({
        message: cleanMessage || "I'm not sure what to update there.",
        metric_updates: [],
        goal_actions: [],
        questions: [],
      });
    }

    return NextResponse.json({
      message: parsed.message || "I'm not sure what to update there.",
      metric_updates: Array.isArray(parsed.metric_updates) ? parsed.metric_updates : [],
      goal_actions: Array.isArray(parsed.goal_actions) ? parsed.goal_actions : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    });
  } catch (error: any) {
    console.error('Chat API error:', error);

    const errorMessage = error?.message || error?.errorDetails?.[0]?.reason || String(error);
    const errorStatus = error?.status || error?.httpStatusCode || 500;

    // Handle rate limiting or quota exceeded
    if (errorStatus === 429 || errorMessage.includes('RATE_LIMIT') || errorMessage.includes('quota')) {
      return NextResponse.json({
        message: "I'm getting too many requests right now. Give me a moment and try again.",
        metric_updates: [],
        goal_actions: [],
        questions: [],
      }, { status: 429 });
    }

    return NextResponse.json({
      message: "Something went wrong on my end. Try again in a moment.",
      metric_updates: [],
      goal_actions: [],
      questions: [],
    }, { status: 500 });
  }
}
