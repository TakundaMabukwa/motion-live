import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { technician, date, time } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    if (!technician || !date || !time) {
      return NextResponse.json({ error: 'Technician, date, and time are required' }, { status: 400 });
    }

    // Find the technician by email to get their name
    const { data: technicianData, error: techError } = await supabase
      .from('technicians')
      .select('id, name')
      .eq('email', technician)
      .single();

    if (techError || !technicianData) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    // Combine date and time
    const assignmentDateTime = `${date}T${time}:00`;

    // Update the job card with technician assignment
    const { data: updatedJob, error: updateError } = await supabase
      .from('job_cards')
      .update({
        assigned_technician_id: technicianData.id,
        technician_name: technicianData.name,
        technician_phone: technician, // Using technician_phone instead of technician_email
        job_date: date,
        start_time: time,
        updated_at: new Date().toISOString(),
        updated_by: user.id, // Use actual user ID
        // Add assignment details to work_notes
        work_notes: `Technician assigned: ${technicianData.name} (${technician}) on ${date} at ${time}`
      })
      .eq('id', jobId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating job card:', updateError);
      return NextResponse.json({ error: 'Failed to assign technician' }, { status: 500 });
    }

    // Create a schedule entry for this job
    const scheduleData = {
      job_card_id: jobId,
      technician_id: technicianData.id,
      technician_name: technicianData.name,
      technician_email: technician, // Keep this as email for schedule table
      job_number: updatedJob.job_number,
      job_type: updatedJob.job_type,
      job_description: updatedJob.job_description,
      customer_name: updatedJob.customer_name,
      vehicle_registration: updatedJob.vehicle_registration,
      job_location: updatedJob.job_location,
      scheduled_date: assignmentDateTime,
      estimated_duration_hours: updatedJob.estimated_duration_hours || 2,
      status: 'scheduled',
      notes: `Assigned on ${date} at ${time}`,
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
