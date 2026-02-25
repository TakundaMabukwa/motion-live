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

         // Build the base query for job_cards
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
         site_contact_phone,
         repair,
         role,
         move_to,
         decommission_date,
         annuity_end_date
       `);

    // Apply company filter (using customer_name as company)
    if (companyFilter) {
      query = query.ilike('customer_name', `%${companyFilter}%`);
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching admin jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch admin jobs' }, { status: 500 });
    }

    const isCompletedJob = (job: {
      job_status?: string | null;
      status?: string | null;
    }) => {
      const normalizedJobStatus = String(job.job_status || '').toLowerCase();
      const normalizedStatus = String(job.status || '').toLowerCase();
      return normalizedJobStatus === 'completed' || normalizedStatus === 'completed';
    };

    const hasPartsRequired = (parts: unknown) => (
      Array.isArray(parts) && parts.length > 0
    );

    const isAdminRoutedJob = (job: {
      role?: string | null;
      move_to?: string | null;
      status?: string | null;
    }) => {
      const role = String(job.role || '').toLowerCase();
      const moveTo = String(job.move_to || '').toLowerCase();
      const status = String(job.status || '').toLowerCase();

      return (
        role === 'admin' ||
        moveTo === 'admin' ||
        status === 'admin_created'
      );
    };

    // Transform the data to match the expected format
    let transformedJobs = (data || []).map(job => ({
      id: job.id,
      job_number: job.job_number,
      job_date: job.job_date,
      due_date: job.due_date,
      start_time: job.start_time,
      end_time: job.end_time,
      status: job.job_status || job.status,
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
      site_contact_phone: job.site_contact_phone,
      repair: job.repair,
      role: job.role,
      move_to: job.move_to,
      decommission_date: job.decommission_date,
      annuity_end_date: job.annuity_end_date
    }));

    if (status === 'open') {
      transformedJobs = transformedJobs.filter(job => {
        if (isCompletedJob(job)) return false;
        return hasPartsRequired(job.parts_required) || isAdminRoutedJob(job);
      });
    } else if (status === 'completed') {
      transformedJobs = transformedJobs.filter((job) => isCompletedJob(job));
    }

    if (roleFilter && roleFilter.trim() !== '') {
      const normalizedRoleFilter = roleFilter.trim().toLowerCase();
      transformedJobs = transformedJobs.filter(job =>
        String(job.role || '').toLowerCase() === normalizedRoleFilter ||
        String(job.move_to || '').toLowerCase() === normalizedRoleFilter ||
        (normalizedRoleFilter === 'admin' && String(job.status || '').toLowerCase() === 'admin_created')
      );
    }

    return NextResponse.json({
      jobs: transformedJobs,
      total: transformedJobs.length
    });

  } catch (error) {
    console.error('Error in admin jobs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
