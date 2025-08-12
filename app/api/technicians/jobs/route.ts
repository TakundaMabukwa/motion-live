import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, tech_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let jobsQuery;

    if (userData.tech_admin) {
      // If tech_admin is true, load all job_cards
      jobsQuery = supabase
        .from('job_cards')
        .select('*')
        .order('created_at', { ascending: false });
    } else {
      // If tech_admin is false, load jobs where email matches technician_phone
      jobsQuery = supabase
        .from('job_cards')
        .select('*')
        .eq('technician_phone', userData.email)
        .order('created_at', { ascending: false });
    }

    const { data: jobs, error: jobsError } = await jobsQuery;

    if (jobsError) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Check if user wants detailed job info
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed');
    const format = searchParams.get('format');

    if (detailed === 'true' || format === 'json') {
      // Return detailed job information with all fields
      return NextResponse.json({ 
        jobs: jobs || [],
        userRole: userData.tech_admin ? 'tech_admin' : 'technician',
        userEmail: userData.email,
        totalJobs: jobs?.length || 0,
        timestamp: new Date().toISOString(),
        fields: {
          basic: ['id', 'job_number', 'job_type', 'status', 'job_status', 'priority', 'job_description'],
          customer: ['customer_name', 'customer_email', 'customer_phone', 'customer_address', 'job_location'],
          vehicle: ['vehicle_registration', 'vehicle_make', 'vehicle_model', 'vin_numer', 'vehicle_year'],
          financial: ['estimated_cost', 'quotation_total_amount', 'actual_cost', 'quotation_subtotal'],
          timeline: ['created_at', 'due_date', 'start_time', 'completion_date', 'updated_at'],
          technical: ['technician_name', 'technician_phone', 'ip_address', 'qr_code', 'special_instructions'],
          additional: ['before_photos', 'after_photos', 'products_required', 'parts_required', 'equipment_used']
        }
      });
    }

    // Return standard response
    return NextResponse.json({ 
      jobs: jobs || [],
      userRole: userData.tech_admin ? 'tech_admin' : 'technician',
      userEmail: userData.email
    });

  } catch (error) {
    console.error('Error in technicians jobs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
