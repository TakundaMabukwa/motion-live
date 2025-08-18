import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication - only authenticated users can access this data
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Schedule API - Auth check:', { user: !!user, error: authError });
    
    if (authError || !user) {
      console.log('Schedule API - Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, let's check if there are any jobs at all
    const { data: allJobs, error: allJobsError } = await supabase
      .from('job_cards')
      .select('id, job_date, technician_name, status')
      .limit(10);
    
    console.log('All jobs check:', { 
      count: allJobs?.length || 0, 
      error: allJobsError?.message || null,
      sample: allJobs 
    });

    // Also check technicians
    const { data: allTechnicians, error: allTechError } = await supabase
      .from('technicians')
      .select('id, name, email, color_code')
      .limit(10);
    
    console.log('All technicians check:', { 
      count: allTechnicians?.length || 0, 
      error: allTechError?.message || null,
      sample: allTechnicians 
    });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Optional: filter by specific date
    const technicianName = searchParams.get('technician_name'); // Optional: filter by technician name
    const technicianEmail = searchParams.get('technician_email'); // Optional: filter by technician email

    // Build the query with technician color information
    let query = supabase
      .from('job_cards')
      .select(`
        id,
        job_number,
        job_date,
        due_date,
        start_time,
        end_time,
        status,
        job_type,
        job_description,
        priority,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        vehicle_registration,
        vehicle_make,
        vehicle_model,
        assigned_technician_id,
        technician_name,
        technician_phone,
        job_location,
        estimated_duration_hours,
        actual_duration_hours,
        estimated_cost,
        actual_cost,
        created_at
      `)
      .not('job_date', 'is', null) // Only jobs with dates
      .order('job_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Apply date filter if provided
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .gte('job_date', startOfDay.toISOString())
        .lte('job_date', endOfDay.toISOString());
    }

    // Apply technician name filter if provided
    if (technicianName) {
      query = query.eq('technician_name', technicianName);
    }

    // Apply technician email filter if provided
    if (technicianEmail) {
      // Note: technician_email is stored in technician_phone field as per user's note
      query = query.eq('technician_phone', technicianEmail);
    }

    const { data, error } = await query;

    console.log('Schedule API - Query result:', { 
      dataCount: data?.length || 0, 
      error: error?.message || null 
    });

    if (error) {
      console.error('Error fetching schedule jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch schedule jobs' }, { status: 500 });
    }

    // Debug: Log the raw data to see what we're getting
    console.log('Raw data from query:', JSON.stringify(data, null, 2));

    // Process the data to flatten technician information
    const processedJobs = (data || []).map(job => {
      console.log('Processing job:', {
        id: job.id,
        technician_name: job.technician_name,
        color_code: null // Will be filled below
      });
      
      return {
        ...job,
        technician_color: 'gray', // Will be updated below
        technician_id: null
      };
    });

    console.log('Processed jobs:', processedJobs);

    // Now fetch technician colors and match them by name
    const { data: technicians, error: technicianColorError } = await supabase
      .from('technicians')
      .select('name, color_code');
    
    if (technicianColorError) {
      console.error('Error fetching technicians:', technicianColorError);
    } else {
      console.log('Technicians with colors:', technicians);
      
      // Create a map of technician names to colors
      const technicianColorMap = {};
      technicians?.forEach(tech => {
        technicianColorMap[tech.name] = tech.color_code;
      });
      
      console.log('Technician color map:', technicianColorMap);
      
      // Update the jobs with their technician colors
      processedJobs.forEach(job => {
        if (job.technician_name && technicianColorMap[job.technician_name]) {
          job.technician_color = technicianColorMap[job.technician_name];
          console.log(`Updated job ${job.id} with color: ${job.technician_color} for technician: ${job.technician_name}`);
        } else {
          console.log(`No color found for technician: ${job.technician_name} on job ${job.id}`);
        }
      });
    }

    // Group jobs by date for easier frontend processing
    const jobsByDate = processedJobs.reduce((acc, job) => {
      const dateKey = job.job_date ? new Date(job.job_date).toISOString().split('T')[0] : 'no-date';
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(job);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('Jobs grouped by date:', jobsByDate);

    return NextResponse.json({
      jobs: processedJobs,
      jobsByDate,
      total: processedJobs.length
    });

  } catch (error) {
    console.error('Error in schedule jobs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST method to fetch jobs for a specific technician
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { technicianName, technicianEmail } = body;

    if (!technicianName && !technicianEmail) {
      return NextResponse.json({ error: 'Technician name or email is required' }, { status: 400 });
    }

    // Build query for technician-specific jobs
    let query = supabase
      .from('job_cards')
      .select(`
        id,
        job_number,
        job_date,
        due_date,
        start_time,
        end_time,
        status,
        job_type,
        job_description,
        priority,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        vehicle_registration,
        vehicle_make,
        vehicle_model,
        assigned_technician_id,
        technician_name,
        technician_phone,
        job_location,
        estimated_duration_hours,
        actual_duration_hours,
        estimated_cost,
        actual_cost,
        created_at
      `)
      .not('job_date', 'is', null)
      .order('job_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Apply technician filter
    if (technicianName) {
      query = query.eq('technician_name', technicianName);
    } else if (technicianEmail) {
      query = query.eq('technician_phone', technicianEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching technician jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch technician jobs' }, { status: 500 });
    }

    // Process jobs and add technician colors
    const processedJobs = (data || []).map(job => ({
      ...job,
      technician_color: 'gray'
    }));

    // Fetch technician colors
    const { data: technicians } = await supabase
      .from('technicians')
      .select('name, color_code');

    if (technicians) {
      const technicianColorMap = {};
      technicians.forEach(tech => {
        technicianColorMap[tech.name] = tech.color_code;
      });

      processedJobs.forEach(job => {
        if (job.technician_name && technicianColorMap[job.technician_name]) {
          job.technician_color = technicianColorMap[job.technician_name];
        }
      });
    }

    // Group jobs by date
    const jobsByDate = processedJobs.reduce((acc, job) => {
      const dateKey = job.job_date ? new Date(job.job_date).toISOString().split('T')[0] : 'no-date';
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(job);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      jobs: processedJobs,
      jobsByDate,
      total: processedJobs.length
    });

  } catch (error) {
    console.error('Error in technician jobs POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
