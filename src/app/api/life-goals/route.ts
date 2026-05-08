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
      .from('life_goals')
      .select('*, life_goal_notes(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/life-goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      title, description, category_id, target_date,
      priority, status, progress_pct,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('life_goals')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        category_id: category_id || null,
        target_date: target_date || null,
        priority: priority || 'medium',
        status: status || 'active',
        progress_pct: progress_pct ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('POST /api/life-goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required in body' }, { status: 400 });
    }

    // Remove fields that shouldn't be directly updated
    delete updates.user_id;
    delete updates.created_at;

    const { data, error } = await supabaseAdmin
      .from('life_goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('PATCH /api/life-goals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
