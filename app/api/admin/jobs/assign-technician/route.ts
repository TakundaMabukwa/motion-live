import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper function to add parts to technician stock
async function addPartsToTechnicianStock(supabase: any, technicianEmail: string, partsRequired: any[]) {
  try {
    console.log(`[PARTS ASSIGNMENT] Starting parts assignment for technician: ${technicianEmail}`);
    console.log(`[PARTS ASSIGNMENT] Parts to assign:`, JSON.stringify(partsRequired, null, 2));

    // Get existing technician stock
    const { data: techStock } = await supabase
      .from('tech_stock')
      .select('assigned_parts')
      .eq('technician_email', technicianEmail)
      .maybeSingle();

    let currentParts = techStock?.assigned_parts || [];

    // Simply copy the parts_required array as-is, preserving all details
    const newParts = [...currentParts, ...partsRequired];

    // Update or insert technician stock
    const { error } = await supabase
      .from('tech_stock')
      .upsert({
        technician_email: technicianEmail,
        assigned_parts: newParts
      }, {
        onConflict: 'technician_email'
      });

    if (error) {
      console.error(`[PARTS ASSIGNMENT] ERROR:`, error);
      return { success: false, error };
    } else {
      console.log(`[PARTS ASSIGNMENT] SUCCESS: Added ${partsRequired.length} parts`);
      return { success: true, totalParts: newParts.length, partsAdded: partsRequired.length };
    }
  } catch (error) {
    console.error(`[PARTS ASSIGNMENT] ERROR:`, error);
    return { success: false, error };
  }
}

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

    if (!jobId || !technicianName || !jobDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: jobId, technicianName, jobDate' 
      }, { status: 400 });
    }

    // Always generate email from technician name and store in technician_phone field
    const emailName = technicianName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');
    const finalTechnicianEmail = `${emailName}@soltrack.co.za`;

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
    
    // Skip notes handling since column doesn't exist
    // const { data: existingJob } = await supabase
    //   .from('job_cards')
    //   .select('notes')
    //   .eq('id', jobId)
    //   .single();

    // Get job parts before updating
    const { data: jobData } = await supabase
      .from('job_cards')
      .select('parts_required')
      .eq('id', jobId)
      .single();
    
    console.log(`[JOB ASSIGNMENT] Job ${jobId} data:`, jobData);

    // Update the job card with technician assignment and scheduling
    const updateData = {
      assigned_technician_id: user.id, // Store the user ID who made the assignment
      technician_name: technicianName,
      technician_phone: finalTechnicianEmail, // Store generated email in technician_phone field
      job_date: jobDate,
      start_time: startDateTime,
      end_time: endDateTime,
      status: 'assigned',
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

    // Add parts to technician stock if parts are required
    let partsMessage = '';
    if (jobData?.parts_required && Array.isArray(jobData.parts_required) && jobData.parts_required.length > 0) {
      console.log(`[JOB ASSIGNMENT] Job ${jobId} has ${jobData.parts_required.length} parts required`);
      const result = await addPartsToTechnicianStock(supabase, finalTechnicianEmail, jobData.parts_required);
      
      if (result?.success) {
        partsMessage = ` Parts transferred: ${result.partsAdded} parts added to technician stock.`;
      } else {
        partsMessage = ` Parts transfer failed.`;
      }
    } else {
      console.log(`[JOB ASSIGNMENT] Job ${jobId} has no parts required`);
      partsMessage = ' No parts to transfer.';
    }

    return NextResponse.json({
      success: true,
      message: 'Technician assigned successfully.' + partsMessage,
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
