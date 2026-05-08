import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  // Create a Supabase client with the user's auth token
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Verify the session
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const userId = user.id;

  // Fetch all data in parallel
  const [categoriesRes, metricsRes, entriesRes, goalsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true }),
    supabase
      .from('metrics')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true }),
    supabase
      .from('metric_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false }),
    supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    user_email: user.email || '',
    categories: categoriesRes.data || [],
    metrics: metricsRes.data || [],
    entries: entriesRes.data || [],
    goals: goalsRes.data || [],
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(jsonString, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="balancing-act-export-${today}.json"`,
    },
  });
}
