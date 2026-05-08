import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function authenticate(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('christlike_assessments')
      .select('*, christlike_responses(*, christlike_questions(*, christlike_attributes(*)))')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/assessments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { responses, overall_score } = body;

    if (!Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json(
        { error: 'responses array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Create the assessment record
    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from('christlike_assessments')
      .insert({
        user_id: user.id,
        overall_score: overall_score ?? null,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (assessmentError) {
      return NextResponse.json({ error: assessmentError.message }, { status: 500 });
    }

    // Insert all responses linked to this assessment
    const responseRows = responses.map((r: any) => ({
      assessment_id: assessment.id,
      question_id: r.question_id,
      score: r.score,
      notes: r.notes || null,
    }));

    const { error: responsesError } = await supabaseAdmin
      .from('christlike_responses')
      .insert(responseRows);

    if (responsesError) {
      return NextResponse.json({ error: responsesError.message }, { status: 500 });
    }

    return NextResponse.json(assessment, { status: 201 });
  } catch (err) {
    console.error('POST /api/assessments error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
