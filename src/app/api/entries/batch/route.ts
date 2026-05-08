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

export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { entries } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'entries array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate and prepare rows
    const rows = entries.map((entry: any) => {
      if (!entry.metric_id || !entry.entry_date || entry.value === undefined) {
        throw new Error('Each entry requires metric_id, entry_date, and value');
      }
      return {
        user_id: user.id,
        metric_id: entry.metric_id,
        entry_date: entry.entry_date,
        value: entry.value,
        normalized_value: entry.normalized_value ?? entry.value,
        source: entry.source || 'voice',
      };
    });

    const { data, error } = await supabaseAdmin
      .from('metric_entries')
      .upsert(rows, { onConflict: 'user_id,metric_id,entry_date' })
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ inserted: data?.length ?? 0, data }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/entries/batch error:', err);
    const message = err?.message || 'Internal server error';
    const status = message.includes('requires') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
