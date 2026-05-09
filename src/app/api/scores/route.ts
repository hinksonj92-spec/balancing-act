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
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { error: 'type query param is required (balance | categories | trends | streaks)' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'balance': {
        const period = searchParams.get('period') || 'monthly';
        const label = searchParams.get('label');

        let query = getSupabaseAdmin()
          .from('balance_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .eq('period_type', period)
          .order('period_label', { ascending: false });

        if (label) query = query.eq('period_label', label);

        const { data, error } = await query.limit(50);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      }

      case 'categories': {
        const period = searchParams.get('period') || 'monthly';
        const label = searchParams.get('label');

        let query = getSupabaseAdmin()
          .from('category_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .eq('period_type', period)
          .order('period_label', { ascending: false });

        if (label) query = query.eq('period_label', label);

        const { data, error } = await query.limit(200);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      }

      case 'trends': {
        const categoryId = searchParams.get('category_id');
        const periods = parseInt(searchParams.get('periods') || '12', 10);

        if (!categoryId) {
          return NextResponse.json({ error: 'category_id is required for trends' }, { status: 400 });
        }

        const { data, error } = await getSupabaseAdmin()
          .from('category_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .eq('category_id', categoryId)
          .eq('period_type', 'monthly')
          .order('period_label', { ascending: false })
          .limit(periods);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
      }

      case 'streaks': {
        const { data, error } = await getSupabaseAdmin()
          .from('category_snapshots')
          .select('category_id, streak_days, trend_direction, period_label')
          .eq('user_id', user.id)
          .eq('period_type', 'monthly')
          .order('period_label', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Return only the latest snapshot per category
        const latestByCategory = new Map<string, any>();
        for (const row of data || []) {
          if (!latestByCategory.has(row.category_id)) {
            latestByCategory.set(row.category_id, row);
          }
        }

        return NextResponse.json(Array.from(latestByCategory.values()));
      }

      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}. Use balance, categories, trends, or streaks.` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error('GET /api/scores error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
