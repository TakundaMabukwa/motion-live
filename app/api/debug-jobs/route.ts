import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Debug Jobs API - Auth check:', { user: !!user, error: authError });
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total count of jobs
    const { count: totalJobs } = await supabase
      .from('job_cards')
      .select('*', { count: 'exact', head: true });

    // Get jobs with dates
    const { data: jobsWithDates, error: dateError } = await supabase
      .from('job_cards')
      .select('id, job_number, job_date, technician_name, customer_name, status')
      .not('job_date', 'is', null)
      .limit(10);

    // Get jobs with technicians
    const { data: jobsWithTechnicians, error: techError } = await supabase
      .from('job_cards')
      .select('id, job_number, technician_name, technician_phone, customer_name, status')
      .not('technician_name', 'is', null)
      .limit(10);

    // Get recent jobs
    const { data: recentJobs, error: recentError } = await supabase
      .from('job_cards')
      .select('id, job_number, job_date, start_time, end_time, status, job_type, customer_name, technician_name, technician_phone')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      totalJobs: totalJobs || 0,
      jobsWithDates: jobsWithDates || [],
      jobsWithTechnicians: jobsWithTechnicians || [],
      recentJobs: recentJobs || [],
      errors: {
        dateError: dateError?.message,
        techError: techError?.message,
        recentError: recentError?.message
      }
    });

  } catch (error) {
    console.error('Error in debug jobs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
