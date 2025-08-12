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
    const { technician_id, technician_name, technician_email, assignment_date, assignment_notes } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    if (!technician_id || !technician_name || !technician_email) {
      return NextResponse.json({ error: 'Technician ID, name, and email are required' }, { status: 400 });
    }

    // Get the job card details first
    const { data: jobCard, error: fetchError } = await supabase
      .from('job_cards')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !jobCard) {
      console.error('Error fetching job card:', fetchError);
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    // Check if job already has a technician assigned
    if (jobCard.assigned_technician_id) {
      return NextResponse.json({ 
        error: 'Job already has a technician assigned',
        currentTechnician: jobCard.technician_name 
      }, { status: 400 });
    }

    // Validate assignment date
    const assignmentDateTime = assignment_date || new Date().toISOString();
    const assignmentDate = new Date(assignmentDateTime);
    
    if (isNaN(assignmentDate.getTime())) {
      return NextResponse.json({ error: 'Invalid assignment date' }, { status: 400 });
    }

    // Update the job card with technician assignment
    const updateData = {
      assigned_technician_id: technician_id,
      technician_name: technician_name,
      technician_phone: technician_email, // Using email as phone since that's what the field stores
      updated_at: new Date().toISOString(),
      updated_by: user.id,
      // Add assignment details to work_notes
      work_notes: assignment_notes ? 
        `Technician assigned: ${technician_name} (${technician_email}) on ${assignmentDateTime}. ${assignment_notes}` :
        `Technician assigned: ${technician_name} (${technician_email}) on ${assignmentDateTime}`
    };

    const { data: updatedJob, error: updateError } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', jobId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating job card:', updateError);
      return NextResponse.json({ error: 'Failed to assign technician to job' }, { status: 500 });
    }

    // Create a schedule entry for this job
    const scheduleData = {
      job_card_id: jobId,
      technician_id: technician_id,
      technician_name: technician_name,
      technician_email: technician_email,
      job_number: jobCard.job_number,
      job_type: jobCard.job_type,
      job_description: jobCard.job_description,
      customer_name: jobCard.customer_name,
      vehicle_registration: jobCard.vehicle_registration,
      job_location: jobCard.job_location,
      scheduled_date: assignmentDateTime,
      estimated_duration_hours: jobCard.estimated_duration_hours || 2,
      status: 'scheduled',
      notes: assignment_notes || '',
      created_by: user.id,
      updated_by: user.id
    };

    // Insert into schedule table (create if doesn't exist)
    const { data: scheduleEntry, error: scheduleError } = await supabase
      .from('schedule')
      .insert([scheduleData])
      .select('*')
      .single();

    if (scheduleError) {
      console.error('Error creating schedule entry:', scheduleError);
      // Don't fail the whole operation if schedule creation fails
      console.log('Schedule creation failed, but job assignment succeeded');
      
      return NextResponse.json({
        success: true,
        message: 'Technician assigned successfully (schedule creation failed)',
        job: updatedJob,
        warning: 'Schedule entry could not be created'
      });
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
