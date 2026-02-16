import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    
    // Re-enable authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = await params.id;
    const body = await request.json();
    const { technician, date, time, override } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    if (!technician || !date || !time) {
      return NextResponse.json({ error: 'Technician, date, and time are required' }, { status: 400 });
    }

    // Handle multiple technicians (comma-separated emails)
    const technicianEmails = technician.split(',').map(email => email.trim());
    const technicianNames = [];
    const technicianIds = [];

    // Get all technician data for the provided emails
    for (const email of technicianEmails) {
      const { data: techData } = await supabase
        .from('technicians')
        .select('id, name')
        .eq('email', email)
        .single();
      
      if (techData) {
        technicianNames.push(techData.name);
        technicianIds.push(techData.id);
      }
    }

    if (technicianNames.length === 0) {
      return NextResponse.json({ error: 'No valid technicians found' }, { status: 404 });
    }

    const combinedNames = technicianNames.join(', ');
    const combinedIds = technicianIds.join(', ');

    // Check for conflicts unless override is true
    if (!override) {
      const bufferHours = 1;
      const selectedDateTime = new Date(`${date}T${time}:00`);
      const bufferInMs = bufferHours * 60 * 60 * 1000;
      const startWindow = new Date(selectedDateTime.getTime() - bufferInMs);
      const endWindow = new Date(selectedDateTime.getTime() + bufferInMs);
      const startWindowLocal = formatLocalDateTime(startWindow);
      const endWindowLocal = formatLocalDateTime(endWindow);

      const conflicts = [];
      for (const email of technicianEmails) {
        const { data: conflictJobs } = await supabase
          .from('job_cards')
          .select('job_number, customer_name, start_time, job_date')
          .eq('technician_phone', email)
          .gte('start_time', startWindowLocal)
          .lte('start_time', endWindowLocal)
          .neq('status', 'cancelled')
          .neq('status', 'completed')
          .neq('id', jobId);
        
        if (conflictJobs && conflictJobs.length > 0) {
          conflicts.push(...conflictJobs);
        }
      }
      
      if (conflicts.length > 0) {
        return NextResponse.json({
          error: 'Scheduling conflict detected',
          needsOverride: true,
          conflicts: conflicts,
          message: `WARNING: This will create a double booking! Technician already has ${conflicts.length} other job(s) within 1 hour of the selected time.`
        }, { status: 409 });
      }
    }

    // Keep exact user-entered local datetime (no implicit UTC conversion)
    const assignmentDateTime = `${date}T${time}:00`;

    // Update the job card with technician assignment
    const { data: updatedJob, error: updateError } = await supabase
      .from('job_cards')
      .update({
        assigned_technician_id: combinedIds,
        technician_name: combinedNames,
        technician_phone: technician, // Store comma-separated emails in technician_phone field
        job_date: date,
        start_time: assignmentDateTime, // Preserve exact input time
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        work_notes: `Technician${technicianNames.length > 1 ? 's' : ''} assigned: ${combinedNames} (${technician}) on ${date} at ${time}`
      })
      .eq('id', jobId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating job card:', updateError);
      return NextResponse.json({ error: 'Failed to assign technician' }, { status: 500 });
    }

    console.log('Job card updated successfully:', updatedJob);

    // Create a schedule entry for this job
    const scheduleData = {
      job_card_id: jobId,
      technician_id: combinedIds,
      technician_name: combinedNames,
      technician_email: technician, // Store comma-separated emails
      job_number: updatedJob.job_number,
      job_type: updatedJob.job_type,
      job_description: updatedJob.job_description,
      customer_name: updatedJob.customer_name,
      vehicle_registration: updatedJob.vehicle_registration,
      job_location: updatedJob.job_location,
      scheduled_date: assignmentDateTime,
      estimated_duration_hours: updatedJob.estimated_duration_hours || 2,
      status: 'scheduled',
      notes: `Assigned to ${combinedNames} on ${date} at ${time}`,
      created_by: user.id,
      updated_by: user.id
    };

    // Insert into schedule table
    const { data: scheduleEntry, error: scheduleError } = await supabase
      .from('schedule')
      .insert([scheduleData])
      .select('*')
      .single();

    if (scheduleError) {
      console.error('Error creating schedule entry:', scheduleError);
      // Don't fail the whole operation if schedule creation fails
      console.log('Schedule creation failed, but job assignment succeeded');
    }

    return NextResponse.json({
      success: true,
      message: 'Technician assigned successfully',
      job: updatedJob,
      schedule: scheduleEntry
    });

  } catch (error) {
    console.error('Error in assign technician API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
