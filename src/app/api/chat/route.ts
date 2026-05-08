import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

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

8. **Ecclesiastical** (color: #B57D8F) — Church service and community
   Metrics: Fulfilled Calling Duties, Service to Others, Ministering Visit, Community Involvement

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

    // Build the full system prompt with goals context
    let fullPrompt = BASE_SYSTEM_PROMPT;
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

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: `System instructions: ${fullPrompt}` }] },
        { role: 'model', parts: [{ text: JSON.stringify({ message: "Got it. I'll respond in the JSON format specified, extracting metrics and goal actions from user messages. I have access to the user's goals data.", metric_updates: [], goal_actions: [], questions: [] }) }] },
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
