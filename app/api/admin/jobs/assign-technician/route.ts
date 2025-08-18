import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, technicianEmail, technicianName, jobDate, startTime, endTime } = body;

    if (!jobId || !technicianEmail || !technicianName || !jobDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: jobId, technicianEmail, technicianName, jobDate' 
      }, { status: 400 });
    }

    // Build proper timestamp strings for start_time/end_time if provided
    const datePart = String(jobDate).includes('T') ? String(jobDate).split('T')[0] : String(jobDate);
    const startDateTime = startTime ? `${datePart}T${startTime}:00` : null;
    const endDateTime = endTime ? `${datePart}T${endTime}:00` : null;

    // Update the job card with technician assignment and scheduling
    const updateData = {
      assigned_technician_id: user.id, // Store the user ID who made the assignment
      technician_name: technicianName,
      technician_phone: technicianEmail, // Store email in technician_phone field
      job_date: jobDate,
      start_time: startDateTime,
      end_time: endDateTime,
      status: 'assigned',
      updated_at: new Date().toISOString(),
      updated_by: user.id
    } as const;

    const { data, error } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', jobId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating job card:', error);
      return NextResponse.json({ 
        error: 'Failed to assign technician',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Technician assigned successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in assign technician:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
