import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Re-enable authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const company = searchParams.get('company');
    const role = searchParams.get('role');
    const technician = searchParams.get('technician');

    let query = supabase
      .from('job_cards')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('job_status', status);
    }
    if (company) {
      query = query.ilike('customer_name', `%${company}%`);
    }
    if (technician) {
      query = query.eq('technician_phone', technician);
      console.log('Jobs API - Filtering by technician:', technician);
    } else {
      console.log('Jobs API - No technician filter, showing all jobs');
    }
    if (role && role !== 'all') {
      if (role === 'tech') {
        // For tech role, show all jobs unless filtered by technician
        // This allows tech admins to see all jobs
      } else if (role === 'admin') {
        query = query.in('job_type', ['install', 'maintenance']);
      } else if (role === 'user') {
        query = query.in('job_type', ['repair', 'deinstall']);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedQuotes = data?.map(job => {
      console.log('Job:', job.id, 'technician_name:', job.technician_name);
      return {
        ...job,
        total_amount: job.estimated_cost || job.quotation_total_amount || 0,
        jobs: [
          {
            id: job.id,
            product_name: job.job_description || 'Job Service',
            quantity: 1,
            subtotal: job.estimated_cost || job.quotation_total_amount || 0,
            technician: job.technician_name,
            date: job.job_date,
            time: job.start_time
          }
        ]
      };
    }) || [];

    console.log('Jobs API - Filters applied:', { status, company, role, technician });
    console.log('Jobs API - Fetched jobs:', transformedQuotes.length, 'records');
    console.log('Jobs API - Sample job:', transformedQuotes[0]);
    
    return NextResponse.json({ 
      quotes: transformedQuotes,
      count: transformedQuotes.length
    });
  } catch (error) {
    console.error('Error in jobs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
