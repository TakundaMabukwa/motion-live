import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();

    if (!id) {
      return NextResponse.json({ error: 'Job card id is required' }, { status: 400 });
    }

    const { data: jobCard, error } = await supabase
      .from('job_cards')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !jobCard) {
      console.error('Error fetching job card details:', error);
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, job_card: jobCard });
  } catch (error) {
    console.error('Job card details route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
