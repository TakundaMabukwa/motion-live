import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch completed jobs where role is 'fc' and job_status is 'Completed'.
    // Select all columns so FC screens can use full job-card context.
    const { data, error } = await supabase
      .from('job_cards')
      .select('*')
      .eq('role', 'fc')
      .eq('job_status', 'Completed')
      .order('completion_date', { ascending: false });

    if (error) {
      console.error('Error fetching FC completed jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch completed jobs' }, { status: 500 });
    }

    return NextResponse.json({
      jobs: data || [],
      total: (data || []).length
    });

  } catch (error) {
    console.error('Error in FC completed jobs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
