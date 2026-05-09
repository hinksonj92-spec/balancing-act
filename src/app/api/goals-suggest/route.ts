import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a goal-setting coach inside "Balancing Act," a life-balance app. Your job is to help users choose specific, actionable goals based on what they tell you about their life.

## Rules
- Suggest 2-4 concrete, measurable goals the user can check off daily or weekly
- Each goal should be SHORT (3-6 words max for the name)
- Goals must be specific and actionable — not vague aspirations
- Match goals to the right category from: Spiritual, Family, Personal, Emotional, Physical, Financial, Intellectual
- Be warm but concise. 2-3 sentences for your message, max.
- If the user is vague, ask ONE follow-up question — don't just guess
- Never say "here are some goals" without actually listing them in the goals array

## Response Format (JSON only, no markdown)
{
  "message": "Your conversational response — 2-3 sentences max. Be encouraging and direct. Never reference goals 'above' or 'below' — your suggested goals appear as buttons next to your message.",
  "goals": [
    {
      "name": "Short Goal Name",
      "category": "Physical",
      "horizon": "daily",
      "why": "One sentence on why this helps"
    }
  ]
}

## Examples

User: "I'm out of shape and need to fix that"
{
  "message": "Let's start with the basics that compound fast. Here are three habits that'll move the needle:",
  "goals": [
    { "name": "30 Min Exercise", "category": "Physical", "horizon": "daily", "why": "Consistent movement beats intensity every time" },
    { "name": "10K Steps", "category": "Physical", "horizon": "daily", "why": "Walking is the most underrated fitness habit" },
    { "name": "No Eating After 8 PM", "category": "Physical", "horizon": "daily", "why": "Late eating disrupts sleep and metabolism" }
  ]
}

User: "I want to be a better dad"
{
  "message": "That intention already puts you ahead. Here are a few daily anchors:",
  "goals": [
    { "name": "15 Min 1-on-1 Per Kid", "category": "Family", "horizon": "daily", "why": "Undivided attention is what kids remember most" },
    { "name": "Family Dinner Together", "category": "Family", "horizon": "daily", "why": "Shared meals build connection and routine" },
    { "name": "Bedtime Stories", "category": "Family", "horizon": "daily", "why": "The last thing they hear at night matters" }
  ]
}

User: "money"
{
  "message": "Money's a big topic — what's the biggest pain point? Are you trying to save more, spend less, pay off debt, or invest?",
  "goals": []
}`;

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      // Fallback: return some generic suggestions based on keywords
      return NextResponse.json({
        message: "I'm running in demo mode. Here are some suggestions based on what you said:",
        goals: getKeywordGoals(message),
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const historyParts = (conversationHistory || [])
      .slice(-8)
      .map((msg: { role: string; text: string }) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: `System instructions: ${SYSTEM_PROMPT}` }] },
        {
          role: 'model',
          parts: [{ text: JSON.stringify({
            message: "Tell me what you'd like to work on — your health, relationships, career, faith, finances — and I'll suggest goals tailored to you.",
            goals: [],
          }) }],
        },
        ...historyParts,
      ],
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text().trim();

    // Parse JSON response
    let parsed: any = null;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
      }
    }

    if (!parsed) {
      return NextResponse.json({
        message: responseText.slice(0, 200) || "Could you tell me more about what you'd like to work on?",
        goals: [],
      });
    }

    return NextResponse.json({
      message: parsed.message || "Here's what I'd suggest:",
      goals: Array.isArray(parsed.goals) ? parsed.goals.map((g: any) => ({
        name: g.name || 'Untitled Goal',
        category: g.category || 'Personal',
        horizon: g.horizon || 'daily',
        why: g.why || null,
      })) : [],
    });
  } catch (error: any) {
    console.error('Goals suggest API error:', error);
    return NextResponse.json({
      message: "Sorry, something went wrong. Try telling me what area of life you want to improve.",
      goals: [],
    }, { status: 200 }); // Return 200 so the client can show the message
  }
}

// Keyword-based fallback when no API key is configured
function getKeywordGoals(message: string): { name: string; category: string; horizon: string; why: string }[] {
  const m = message.toLowerCase();
  if (m.includes('exercise') || m.includes('fit') || m.includes('fat') || m.includes('weight') || m.includes('gym') || m.includes('physical')) {
    return [
      { name: '30 Min Exercise', category: 'Physical', horizon: 'daily', why: 'Consistency beats intensity' },
      { name: 'Eat Clean', category: 'Physical', horizon: 'daily', why: 'You can\'t outrun a bad diet' },
      { name: '10K Steps', category: 'Physical', horizon: 'daily', why: 'Walking is underrated' },
    ];
  }
  if (m.includes('family') || m.includes('kids') || m.includes('wife') || m.includes('dad') || m.includes('husband')) {
    return [
      { name: 'Quality Family Time', category: 'Family', horizon: 'daily', why: 'Presence over presents' },
      { name: 'Family Dinner', category: 'Family', horizon: 'daily', why: 'Connection happens at the table' },
      { name: 'Weekly Date Night', category: 'Family', horizon: 'weekly', why: 'Marriage needs maintenance too' },
    ];
  }
  if (m.includes('money') || m.includes('financial') || m.includes('save') || m.includes('debt') || m.includes('budget')) {
    return [
      { name: 'Track Spending', category: 'Financial', horizon: 'daily', why: 'Awareness changes behavior' },
      { name: 'No Impulse Buys', category: 'Financial', horizon: 'daily', why: '24-hour rule on purchases' },
      { name: 'Review Budget', category: 'Financial', horizon: 'weekly', why: 'What gets measured gets managed' },
    ];
  }
  if (m.includes('spirit') || m.includes('pray') || m.includes('scripture') || m.includes('faith') || m.includes('god') || m.includes('church')) {
    return [
      { name: 'Scripture Study', category: 'Spiritual', horizon: 'daily', why: 'Start the day grounded' },
      { name: 'Morning Prayer', category: 'Spiritual', horizon: 'daily', why: 'Set your intention before the world sets it for you' },
      { name: 'Serve Someone', category: 'Spiritual', horizon: 'daily', why: 'Service lifts both giver and receiver' },
    ];
  }
  return [
    { name: '30 Min Exercise', category: 'Physical', horizon: 'daily', why: 'Physical health is the foundation' },
    { name: 'Daily Journal', category: 'Personal', horizon: 'daily', why: 'Clarity comes from writing' },
    { name: 'Practice Gratitude', category: 'Emotional', horizon: 'daily', why: 'Gratitude rewires your brain' },
  ];
}
