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

    const { searchParams } = new URL(request.url);
    const metricId = searchParams.get('metric_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabaseAdmin
      .from('metric_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (metricId) query = query.eq('metric_id', metricId);
    if (from) query = query.gte('entry_date', from);
    if (to) query = query.lte('entry_date', to);

    const { data, error } = await query.limit(1000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/entries error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { metric_id, entry_date, value, normalized_value, source } = body;

    if (!metric_id || !entry_date || value === undefined) {
      return NextResponse.json(
        { error: 'metric_id, entry_date, and value are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('metric_entries')
      .upsert(
        {
          user_id: user.id,
          metric_id,
          entry_date,
          value,
          normalized_value: normalized_value ?? value,
          source: source || 'api',
        },
        { onConflict: 'user_id,metric_id,entry_date' }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('POST /api/entries error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
