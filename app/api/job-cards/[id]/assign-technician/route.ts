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

    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const body = await request.json();
    
    console.log('=== ASSIGN TECHNICIAN DEBUG ===');
    console.log('Job ID:', jobId);
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const { technician_id, technician_name, technician_email, assignment_date, assignment_notes } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    if (!technician_id || !technician_name) {
      return NextResponse.json({ error: 'Technician ID and name are required' }, { status: 400 });
    }

    // Always generate email from technician name and store in technician_phone field
    const emailName = technician_name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');
    let finalTechnicianEmail = `${emailName}@soltrack.co.za`;
    
    // Truncate to 50 characters to fit technician_phone field limit
    if (finalTechnicianEmail.length > 50) {
      const domain = '@soltrack.co.za';
      const maxNameLength = 50 - domain.length;
      const truncatedName = emailName.substring(0, maxNameLength);
      finalTechnicianEmail = `${truncatedName}${domain}`;
    }
    
    console.log('Generated email from technician name:', finalTechnicianEmail);
    console.log('Email length:', finalTechnicianEmail.length);
    
    console.log('Final technician data:');
    console.log('- ID:', technician_id);
    console.log('- Name:', technician_name);
    console.log('- Email (final):', finalTechnicianEmail);

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

    // Allow reassignment - remove the check that prevented it
    if (jobCard.assigned_technician_id) {
      console.log('Reassigning technician from:', jobCard.technician_name, 'to:', technician_name);
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
      technician_phone: finalTechnicianEmail, // Using email as phone since that's what the field stores
      updated_at: new Date().toISOString(),
      updated_by: user.id,
      // Add assignment details to work_notes
      work_notes: assignment_notes ? 
        `Technician assigned: ${technician_name} (${finalTechnicianEmail}) on ${assignmentDateTime}. ${assignment_notes}` :
        `Technician assigned: ${technician_name} (${finalTechnicianEmail}) on ${assignmentDateTime}`
    };

    console.log('About to update job_cards with:', JSON.stringify(updateData, null, 2));
    console.log('technician_phone value being set:', updateData.technician_phone);
    console.log('technician_phone type:', typeof updateData.technician_phone);
    console.log('technician_phone length:', updateData.technician_phone?.length);
    
    // Test: Try updating ONLY technician_phone first
    console.log('TESTING: Updating only technician_phone first...');
    const { data: testUpdate, error: testError } = await supabase
      .from('job_cards')
      .update({ technician_phone: finalTechnicianEmail })
      .eq('id', jobId)
      .select('technician_phone, technician_name')
      .single();
      
    if (testError) {
      console.error('TEST UPDATE FAILED:', testError);
    } else {
      console.log('TEST UPDATE SUCCESS:', testUpdate);
    }
    
    const { data: updatedJob, error: updateError } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', jobId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating job card:', updateError);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      return NextResponse.json({ error: 'Failed to assign technician to job' }, { status: 500 });
    }
    
    console.log('Job updated successfully!');
    console.log('Updated job technician_phone:', updatedJob.technician_phone);
    console.log('Updated job technician_name:', updatedJob.technician_name);
    
    // Double-check by fetching the record again
    const { data: verifyJob, error: verifyError } = await supabase
      .from('job_cards')
      .select('technician_phone, technician_name, assigned_technician_id')
      .eq('id', jobId)
      .single();
      
    if (!verifyError) {
      console.log('VERIFICATION - technician_phone from DB:', verifyJob.technician_phone);
      console.log('VERIFICATION - technician_name from DB:', verifyJob.technician_name);
    } else {
      console.error('Error verifying update:', verifyError);
    }
    
    // Verify the technician_phone was actually set
    if (!updatedJob.technician_phone) {
      console.error('WARNING: technician_phone is empty after update!');
      console.error('This will prevent stock transfers from working.');
      
      // Try a separate update just for technician_phone
      console.log('Attempting separate technician_phone update...');
      const { data: phoneUpdate, error: phoneError } = await supabase
        .from('job_cards')
        .update({ technician_phone: finalTechnicianEmail })
        .eq('id', jobId)
        .select('technician_phone')
        .single();
        
      if (phoneError) {
        console.error('Separate phone update failed:', phoneError);
      } else {
        console.log('Separate phone update result:', phoneUpdate);
      }
    } else {
      console.log('SUCCESS: technician_phone is set, stock transfers should work.');
    }

    // Create a schedule entry for this job
    const scheduleData = {
      job_card_id: jobId,
      technician_id: technician_id,
      technician_name: technician_name,
      technician_email: finalTechnicianEmail,
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

    console.log('=== ASSIGN TECHNICIAN DEBUG END ===');
    
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
