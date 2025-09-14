import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all systems
    const { data, error } = await supabase
      .from('systems')
      .select('*')
      .order('system_name', { ascending: true });

    if (error) {
      console.error('Error fetching systems:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch systems',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error in systems GET:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
