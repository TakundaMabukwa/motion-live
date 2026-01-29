import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('user_sessions')
      .update({ logout_time: new Date().toISOString() })
      .is('logout_time', null)
      .lt('last_activity', thirtyMinutesAgo)
      .select();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      closed: data?.length || 0 
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
