import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const companyFilter = searchParams.get('company');
    const roleFilter = searchParams.get('role');

    // Build the query for job_cards with parts_required not null or empty
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
        vehicle_year,
        technician_name,
        technician_phone,
        job_location,
        estimated_duration_hours,
        actual_duration_hours,
        created_at,
        updated_at,
        parts_required,
        products_required,
        quotation_products,
        quotation_total_amount,
        qr_code,
        work_notes,
        completion_notes,
        job_status,
        customer_feedback,
        quotation_number,
        quote_status,
        special_instructions,
        access_requirements,
        site_contact_person,
        site_contact_phone
      `)
      .not('parts_required', 'is', null)
      .neq('parts_required', '[]')
      .neq('parts_required', '{}');

    // Apply status filter
    if (status === 'open') {
      query = query.not('status', 'in', ['completed', 'cancelled']);
    } else if (status === 'completed') {
      query = query.eq('status', 'completed');
    }

    // Apply company filter (using customer_name as company)
    if (companyFilter) {
      query = query.ilike('customer_name', `%${companyFilter}%`);
    }

    // Apply role filter (this would need to be implemented based on your role system)
    // For now, we'll return all jobs with parts_required

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching admin jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch admin jobs' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedJobs = (data || []).map(job => ({
      id: job.id,
      job_number: job.job_number,
      job_date: job.job_date,
      due_date: job.due_date,
      start_time: job.start_time,
      end_time: job.end_time,
      status: job.status || job.job_status,
      job_type: job.job_type,
      job_description: job.job_description,
      priority: job.priority,
      customer_name: job.customer_name,
      customer_email: job.customer_email,
      customer_phone: job.customer_phone,
      customer_address: job.customer_address,
      vehicle_registration: job.vehicle_registration,
      vehicle_make: job.vehicle_make,
      vehicle_model: job.vehicle_model,
      vehicle_year: job.vehicle_year,
      technician_name: job.technician_name,
      technician_phone: job.technician_phone, // This contains the email
      job_location: job.job_location,
      estimated_duration_hours: job.estimated_duration_hours,
      actual_duration_hours: job.actual_duration_hours,
      created_at: job.created_at,
      updated_at: job.updated_at,
      parts_required: job.parts_required,
      products_required: job.products_required,
      quotation_products: job.quotation_products,
      quotation_total_amount: job.quotation_total_amount,
      qr_code: job.qr_code,
      work_notes: job.work_notes,
      completion_notes: job.completion_notes,
      customer_feedback: job.customer_feedback,
      quotation_number: job.quotation_number,
      quote_status: job.quote_status,
      special_instructions: job.special_instructions,
      access_requirements: job.access_requirements,
      site_contact_person: job.site_contact_person,
      site_contact_phone: job.site_contact_phone
    }));

    return NextResponse.json({
      jobs: transformedJobs,
      total: transformedJobs.length
    });

  } catch (error) {
    console.error('Error in admin jobs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
