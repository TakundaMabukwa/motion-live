import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY_RE = /^\d{2}:\d{2}$/;

function normalizeDatePart(rawDate: string): string {
  const dateStr = String(rawDate || '').trim();
  if (DATE_ONLY_RE.test(dateStr)) return dateStr;
  if (dateStr.includes('T')) return dateStr.split('T')[0];

  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

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

    const currentParts = techStock?.assigned_parts || [];

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
    const { jobId, technicianName, jobDate, startTime, endTime, override = false } = body;

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
    const datePart = normalizeDatePart(jobDate);
    if (!datePart) {
      return NextResponse.json({
        error: 'Invalid job date format'
      }, { status: 400 });
    }

    const hasValidStartTime = !!startTime && TIME_ONLY_RE.test(String(startTime));
    const hasValidEndTime = !!endTime && TIME_ONLY_RE.test(String(endTime));
    const startDateTime = hasValidStartTime ? `${datePart}T${startTime}:00` : null;
    const endDateTime = hasValidEndTime ? `${datePart}T${endTime}:00` : null;
    
    // Check for scheduling conflicts (only if override is not requested)  
    if (!override) {
      const jobDateTime = startDateTime || `${datePart}T00:00:00`;
      const bufferHours = 1; // 1-hour window
      
      // Calculate time window
      try {
        const selectedDateTime = new Date(jobDateTime);
        
        // Validate the date
        if (isNaN(selectedDateTime.getTime())) {
          return NextResponse.json({ 
            error: 'Invalid job date/time format' 
          }, { status: 400 });
        }
        
        const bufferInMs = bufferHours * 60 * 60 * 1000;
        const startWindow = new Date(selectedDateTime.getTime() - bufferInMs);
        const endWindow = new Date(selectedDateTime.getTime() + bufferInMs);
        const startWindowLocal = formatLocalDateTime(startWindow);
        const endWindowLocal = formatLocalDateTime(endWindow);
        
        console.log(`Checking conflicts for ${technicianName} between ${startWindow.toISOString()} and ${endWindow.toISOString()}`);
        
        // Check conflicts by precise start_time window
        const { data: startTimeConflicts, error: startTimeConflictError } = await supabase
          .from('job_cards')
          .select('id, job_number, job_date, start_time, customer_name')
          .eq('technician_name', technicianName)
          .gte('start_time', startWindowLocal)
          .lte('start_time', endWindowLocal)
          .neq('status', 'cancelled')
          .neq('status', 'completed')
          .neq('id', jobId);  // Exclude the current job

        if (startTimeConflictError) {
          console.error('Error checking start_time conflicts:', startTimeConflictError);
          return NextResponse.json({ 
            error: 'Failed to check scheduling conflicts',
            details: startTimeConflictError.message 
          }, { status: 500 });
        }

        const conflicts = startTimeConflicts || [];

        console.log(`Conflict check result: ${conflicts?.length || 0} conflicts found`);
        
        if (conflicts && conflicts.length > 0) {
          console.warn(`Found ${conflicts.length} scheduling conflicts for technician ${technicianName}:`, conflicts);
          
          // Return 409 status with conflict data to trigger override dialog
          return NextResponse.json({
            error: 'Scheduling conflict detected',
            needsOverride: true,
            conflicts: conflicts.map(conflict => ({
              id: conflict.id,
              job_number: conflict.job_number,
              customer_name: conflict.customer_name,
              start_time: conflict.start_time,
              job_date: conflict.job_date
            })),
            message: `⚠️ WARNING: This will create a double booking! ${technicianName} is already assigned to ${conflicts.length} other job(s) within 1 hour of the selected time.`
          }, { status: 409 });
        }
      } catch (dateError) {
        console.error('Date parsing error:', dateError);
        return NextResponse.json({ 
          error: 'Invalid job date/time format',
          details: dateError.message 
        }, { status: 400 });
      }
    } else {
      console.log(`⚠️ Override flag set - skipping conflict detection for technician ${technicianName}`);
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
      job_date: datePart,
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
      message: override
        ? `Technician assigned successfully with scheduling conflict override.${partsMessage}`
        : `Technician assigned successfully.${partsMessage}`,
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
