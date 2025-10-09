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
    const { jobId, technicianEmail, technicianName, jobDate, startTime, endTime, assignmentNotes } = body;

    if (!jobId || !technicianEmail || !technicianName || !jobDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: jobId, technicianEmail, technicianName, jobDate' 
      }, { status: 400 });
    }

    // Build proper timestamp strings for start_time/end_time if provided
    const datePart = String(jobDate).includes('T') ? String(jobDate).split('T')[0] : String(jobDate);
    const startDateTime = startTime ? `${datePart}T${startTime}:00` : null;
    const endDateTime = endTime ? `${datePart}T${endTime}:00` : null;
    
    // Check for scheduling conflicts
    const jobDateTime = startDateTime || jobDate;
    const bufferHours = 3; // 3-hour window
    
    // Calculate time window
    const selectedDateTime = new Date(jobDateTime);
    const bufferInMs = bufferHours * 60 * 60 * 1000;
    const startWindow = new Date(selectedDateTime.getTime() - bufferInMs);
    const endWindow = new Date(selectedDateTime.getTime() + bufferInMs);
    
    // Check for conflicts
    const { data: conflicts, error: conflictError } = await supabase
      .from('job_cards')
      .select('id, job_number, job_date, start_time, customer_name')
      .eq('technician_name', technicianName)
      .or(`job_date.gte.${startWindow.toISOString()},job_date.lte.${endWindow.toISOString()}`)
      .neq('status', 'cancelled')
      .neq('status', 'completed')
      .neq('id', jobId);  // Exclude the current job
    
    if (conflictError) {
      console.error('Error checking conflicts:', conflictError);
    } else if (conflicts && conflicts.length > 0) {
      console.warn(`Found ${conflicts.length} scheduling conflicts for technician ${technicianName}`);
    }
    
    // Get the existing job card to append notes
    const { data: existingJob } = await supabase
      .from('job_cards')
      .select('notes')
      .eq('id', jobId)
      .single();
    
    // Format notes - append new assignment note if provided
    let updatedNotes = existingJob?.notes || '';
    if (assignmentNotes) {
      const timestamp = new Date().toISOString().split('T')[0];
      if (updatedNotes) {
        updatedNotes += `\n---\n${timestamp} - Assignment note: ${assignmentNotes}`;
      } else {
        updatedNotes = `${timestamp} - Assignment note: ${assignmentNotes}`;
      }
    }

    // Update the job card with technician assignment and scheduling
    const updateData = {
      assigned_technician_id: user.id, // Store the user ID who made the assignment
      technician_name: technicianName,
      technician_phone: technicianEmail, // Store email in technician_phone field
      job_date: jobDate,
      start_time: startDateTime,
      end_time: endDateTime,
      status: 'assigned',
      notes: updatedNotes,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

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
