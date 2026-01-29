import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'master') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabase
      .from('user_sessions')
      .select('*')
      .order('login_time', { ascending: false })
      .limit(limit);

    if (userId) query = query.eq('user_id', userId);
    if (startDate) query = query.gte('login_time', `${startDate}T00:00:00`);
    if (endDate) query = query.lte('login_time', `${endDate}T23:59:59`);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ sessions: data });
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
