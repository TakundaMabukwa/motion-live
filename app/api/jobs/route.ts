import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const splitCsv = (value: string | null | undefined) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const getTechnicianCandidates = (email: string | null | undefined) => {
  const prefix = String(email || '').split('@')[0] || '';
  const cleaned = prefix.replace(/[._-]/g, ' ');
  return [String(email || '').trim().toLowerCase(), prefix, cleaned, ...cleaned.split(' ')]
    .filter(Boolean)
    .map((value, index) => (index === 0 ? String(value).toLowerCase() : normalizeToken(String(value))));
};

const isJobAssignedToTechnician = (job: Record<string, unknown>, technician: string | null | undefined) => {
  const normalizedEmail = String(technician || '').trim().toLowerCase();
  const emailTokens = splitCsv(String(job?.technician_phone || '')).map((token) => token.toLowerCase());
  if (normalizedEmail && emailTokens.includes(normalizedEmail)) {
    return true;
  }

  const nameTokens = splitCsv(String(job?.technician_name || '')).map((token) => normalizeToken(token));
  const candidates = getTechnicianCandidates(technician).slice(1);
  return candidates.some((candidate) => nameTokens.includes(candidate));
};

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
    if (!technician) {
      console.log('Jobs API - No technician filter, showing all jobs');
    } else {
      console.log('Jobs API - Filtering by technician (csv-aware):', technician);
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

    const filteredJobs = technician
      ? (data || []).filter((job) => isJobAssignedToTechnician(job, technician))
      : (data || []);

    // Transform the data to match the expected format
    const transformedQuotes = filteredJobs.map(job => {
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
