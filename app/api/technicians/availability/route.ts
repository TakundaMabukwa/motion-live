import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface JobConflict {
  id?: string;
  job_id?: string;
  job_number: string;
  job_date?: string;
  conflicting_date?: string;
  start_time?: string;
  technician_name?: string;
  customer_name?: string;
  job_description?: string;
  status?: string;
}

/**
 * API endpoint to check technician availability
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const technicianName = url.searchParams.get('technician');
    const date = url.searchParams.get('date');
    const time = url.searchParams.get('time') || '09:00';
    const hoursBuffer = url.searchParams.get('buffer') ? 
      parseInt(url.searchParams.get('buffer')!) : 3;
      
    if (!technicianName || !date) {
      return NextResponse.json({ 
        error: 'Missing required parameters: technician, date' 
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Convert the selected time to a Date object
    const selectedDateTime = new Date(`${date}T${time}:00`);
    
    if (isNaN(selectedDateTime.getTime())) {
      return NextResponse.json({ 
        error: 'Invalid date or time format' 
      }, { status: 400 });
    }
    
    // Create date objects for strict comparison of date parts
    const targetDate = new Date(selectedDateTime.getFullYear(), selectedDateTime.getMonth(), selectedDateTime.getDate());
    const targetHour = selectedDateTime.getHours();
    
    let conflictingJobs: JobConflict[] = [];
    
    // Get all jobs for this technician
    const { data, error: queryError } = await supabase
      .from('job_cards')
      .select('id, job_number, job_date, start_time, technician_name, customer_name, job_description, status')
      .eq('technician_name', technicianName)
      .neq('status', 'cancelled')
      .neq('status', 'completed');
      
    if (queryError) {
      return NextResponse.json({ 
        error: 'Error checking technician availability',
        details: queryError.message
      }, { status: 500 });
    }
    
    console.log('Found jobs for technician:', technicianName, data?.length || 0);
    
    // Manual filtering: same day and within time window
    conflictingJobs = (data || []).filter((job) => {
      // Get the job datetime (prefer start_time if available)
      const jobDateTime = job.start_time ? new Date(job.start_time) : new Date(job.job_date || '');
      
      // Skip if invalid date
      if (isNaN(jobDateTime.getTime())) {
        console.log('Skipping job with invalid date:', job.job_number);
        return false;
      }
      
      // Only consider same day jobs by comparing date parts
      const jobDate = new Date(
        jobDateTime.getFullYear(), 
        jobDateTime.getMonth(), 
        jobDateTime.getDate()
      );
      
      if (jobDate.getTime() !== targetDate.getTime()) {
        console.log('Skipping job on different date:', job.job_number, jobDate.toDateString(), '≠', targetDate.toDateString());
        return false;
      }
      
      // For jobs with just a date and no time, use default time (9:00 AM)
      let jobHour = jobDateTime.getHours();
      if (jobDateTime.getHours() === 0 && jobDateTime.getMinutes() === 0 && !job.start_time) {
        jobHour = 9; // Default to 9:00 AM
      }
      
      // Check if within time window (e.g., 3 hours before/after)
      const hourDiff = Math.abs(jobHour - targetHour);
      const isConflict = hourDiff <= hoursBuffer;
      
      if (isConflict) {
        console.log('Found conflict:', job.job_number, 'at hour', jobHour, 'vs target hour', targetHour);
      }
      
      return isConflict;
    });
    
    console.log('Manual filtering results:', conflictingJobs);
    
    return NextResponse.json({
      technician: technicianName,
      date: date,
      time: time,
      hoursBuffer: hoursBuffer,
      isAvailable: conflictingJobs.length === 0,
      conflictCount: conflictingJobs.length,
      conflictingJobs: conflictingJobs.map(job => ({
        id: job.id,
        job_number: job.job_number,
        job_date: job.job_date,
        start_time: job.start_time,
        technician_name: job.technician_name,
        customer_name: job.customer_name,
        job_description: job.job_description || 'No description',
        status: job.status
      }))
    });

  } catch (error) {
    console.error('Error in technician availability endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * API endpoint to assign technician with validation
 * POST /api/technicians/availability
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      jobId, 
      technicianName, 
      jobDate,
      startTime,
      override = false 
    } = body;

    if (!jobId || !technicianName || !jobDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: jobId, technicianName, jobDate'
      }, { status: 400 });
    }

    // Format the date properly
    const formattedDate = startTime ? 
      `${jobDate}T${startTime}:00` : 
      jobDate.includes('T') ? jobDate : `${jobDate}T09:00:00`;
    const selectedDateTime = new Date(formattedDate);

    // Call the function with parts transfer logic
    const { data: result, error: rpcError } = await supabase.rpc(
      'assign_technician_with_override',
      {
        p_job_id: jobId,
        p_technician_name: technicianName,
        p_job_date: formattedDate,
        p_override: override || false
      }
    );
    
    const functionResult = result;

    if (rpcError) {
      console.error('Error calling assign_technician_with_override:', rpcError);
      console.error('RPC Error details:', JSON.stringify(rpcError, null, 2));
      return NextResponse.json({
        success: false,
        error: 'Failed to assign technician',
        details: rpcError.message,
        hint: rpcError.hint || 'Check server logs for more details'
      }, { status: 500 });
    }

    // If the function returned conflicts and not overriding
    if (!functionResult.success && functionResult.conflicts && !override) {
      return NextResponse.json({
        success: false,
        message: functionResult.message,
        conflicts: functionResult.conflicts,
        needsOverride: true
      }, { status: 409 });
    }

    // If successful
    if (functionResult.success) {
      const partsMessage = functionResult.parts_transferred > 0 
        ? ` Parts transferred: ${functionResult.parts_transferred} items.`
        : '';
        
      return NextResponse.json({
        success: true,
        message: 'Technician assigned successfully' + partsMessage,
        conflicts: functionResult.conflicts || []
      });
    }

    // If function failed for other reasons
    return NextResponse.json({
      success: false,
      error: functionResult.message || 'Failed to assign technician'
    }, { status: 500 });
  } catch (error) {
    console.error('Error in technician assignment endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}