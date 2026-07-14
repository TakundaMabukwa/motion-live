import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // 1. Fetch completed jobs where role=admin or move_to=admin, directly from DB
    let query = supabase
      .from('job_cards')
      .select(`
        id, job_number, job_date, due_date, start_time, end_time,
        status, job_type, job_description, priority,
        customer_name, customer_email, customer_phone, customer_address,
        vehicle_registration, vehicle_make, vehicle_model, vehicle_year,
        assigned_technician_id, technician_name, technician_phone,
        job_location, estimated_duration_hours, actual_duration_hours,
        created_at, updated_at, parts_required, products_required,
        quotation_products, before_photos, after_photos,
        quotation_total_amount, qr_code, work_notes, completion_notes,
        job_status, customer_feedback, quotation_number, quote_status,
        special_instructions, access_requirements, site_contact_person,
        site_contact_phone, repair, role, move_to,
        escalation_role, escalation_source_role, escalated_at,
        decommission_date, annuity_end_date,
        move_history
      `)
      .or('status.eq.completed,job_status.eq.completed')
      .or('role.eq.admin,move_to.eq.admin')
      .order('created_at', { ascending: false });

    // Apply search filter at DB level
    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%,job_number.ilike.%${search}%,vehicle_registration.ilike.%${search}%,vehicle_make.ilike.%${search}%,vehicle_model.ilike.%${search}%,technician_name.ilike.%${search}%,work_notes.ilike.%${search}%,completion_notes.ilike.%${search}%,special_instructions.ilike.%${search}%`
      );
    }

    const { data: completedJobs, error } = await query.range(0, 9999);

    if (error) {
      console.error('Error fetching awaiting testing jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    if (!completedJobs || completedJobs.length === 0) {
      return NextResponse.json({ jobs: [], total: 0 });
    }

    // 2. Check which jobs have invoices
    const jobIds = completedJobs.map(j => j.id).filter(Boolean);
    const invoicedJobIds = new Set<string>();
    
    if (jobIds.length > 0) {
      const { data: invoiceRows } = await supabase
        .from('invoices')
        .select('job_card_id')
        .in('job_card_id', jobIds);
      
      if (Array.isArray(invoiceRows)) {
        for (const row of invoiceRows) {
          if (row.job_card_id) invoicedJobIds.add(row.job_card_id);
        }
      }
    }

    // 3. Filter out invoiced jobs and ensure completed + admin-routed
    const awaitingJobs = completedJobs
      .filter(job => {
        if (invoicedJobIds.has(job.id)) return false;
        const isCompleted = (job.status || '').toLowerCase() === 'completed' ||
                            (job.job_status || '').toLowerCase() === 'completed';
        const isAdminRouted = (job.role || '').toLowerCase() === 'admin' ||
                              (job.move_to || '').toLowerCase() === 'admin';
        return isCompleted && isAdminRouted;
      })
      .map(job => ({
        ...job,
        status: job.status || job.job_status,
        job_status: job.job_status || job.status,
        is_invoiced: false,
      }));

    return NextResponse.json({
      jobs: awaitingJobs,
      total: awaitingJobs.length
    });

  } catch (error) {
    console.error('Error in awaiting testing GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
