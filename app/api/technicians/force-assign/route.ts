import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, technicianName, jobDate, startTime } = body;

    if (!jobId || !technicianName || !jobDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const formattedDate = startTime ? 
      `${jobDate}T${startTime}:00` : 
      jobDate.includes('T') ? jobDate : `${jobDate}T09:00:00`;

    // Use the force bypass function
    const { data, error } = await supabase.rpc('force_assign_technician', {
      p_job_id: jobId,
      p_technician_name: technicianName,
      p_job_date: formattedDate
    });

    if (error) {
      console.error('Force assign error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to force assign technician',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: data.success,
      message: data.message || 'Technician assigned successfully (force override)',
      job: data
    });

  } catch (error) {
    console.error('Error in force assign:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}