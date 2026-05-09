import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function authenticate(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    let query = getSupabaseAdmin()
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET /api/metrics error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await authenticate(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      category_id, name, measurement_type, measurement_frequency,
      weight, display_order, is_active,
    } = body;

    if (!category_id || !name) {
      return NextResponse.json({ error: 'category_id and name are required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('metrics')
      .insert({
        user_id: user.id,
        category_id,
        name,
        measurement_type: measurement_type || 'boolean',
        measurement_frequency: measurement_frequency || 'daily',
        weight: weight ?? 1.0,
        display_order: display_order ?? 0,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('POST /api/metrics error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
