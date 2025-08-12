import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Re-enable authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('technicians')
      .select('id, name, email, admin, color_code')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching technicians:', error);
      return NextResponse.json({ error: 'Failed to fetch technicians' }, { status: 500 });
    }

    return NextResponse.json({ technicians: data || [] });

  } catch (error) {
    console.error('Error in technicians GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
