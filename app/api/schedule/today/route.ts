import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Today Schedule API - Auth check:', { user: !!user, error: authError });
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get today's date
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Query jobs scheduled for today
    const { data, error } = await supabase
      .from('job_cards')
      .select(`
        id,
        job_number,
        job_date,
        start_time,
        end_time,
        status,
        job_type,
        job_description,
        priority,
        customer_name,
        customer_email,
        customer_phone,
        vehicle_registration,
        vehicle_make,
        vehicle_model,
        technician_name,
        technician_phone,
        job_location,
        estimated_duration_hours,
        estimated_cost,
        created_at
      `)
      .not('job_date', 'is', null)
      .gte('job_date', startOfDay.toISOString())
      .lte('job_date', endOfDay.toISOString())
      .not('technician_name', 'is', null) // Only jobs with assigned technicians
      .order('start_time', { ascending: true });

    console.log('Today Schedule API - Query result:', { 
      dataCount: data?.length || 0, 
      error: error?.message || null 
    });

    if (error) {
      console.error('Error fetching today\'s jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch today\'s jobs' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const todayJobs = (data || []).map(job => ({
      id: job.id,
      job_number: job.job_number,
      scheduled_date: job.job_date,
      start_time: job.start_time,
      end_time: job.end_time,
      status: job.status,
      job_type: job.job_type,
      job_description: job.job_description,
      priority: job.priority,
      customer_name: job.customer_name,
      customer_email: job.customer_email,
      customer_phone: job.customer_phone,
      vehicle_registration: job.vehicle_registration,
      vehicle_make: job.vehicle_make,
      vehicle_model: job.vehicle_model,
      technician_name: job.technician_name,
      technician_email: job.technician_phone, // This contains the email
      job_location: job.job_location,
      estimated_duration_hours: job.estimated_duration_hours,
      estimated_cost: job.estimated_cost,
      notes: `Job scheduled for ${new Date(job.job_date).toLocaleDateString()} at ${job.start_time ? new Date(job.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}`
    }));

    return NextResponse.json({
      today_jobs: todayJobs,
      total: todayJobs.length
    });

  } catch (error) {
    console.error('Error in today schedule GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
