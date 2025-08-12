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
      .select('id, job_number, job_date, due_date, completion_date, status, job_type, job_description, priority, account_id, customer_name, customer_email, customer_phone, customer_address, vehicle_id, vehicle_registration, vehicle_make, vehicle_model, vehicle_year, assigned_technician_id, technician_name, technician_phone, job_location, latitude, longitude, products_required, parts_required, equipment_used, estimated_duration_hours, actual_duration_hours, estimated_cost, actual_cost, start_time, end_time, work_notes, completion_notes, job_status, safety_checklist_completed, quality_check_passed, customer_signature_obtained, before_photos, after_photos, documents, customer_satisfaction_rating, customer_feedback, quotation_number, quote_date, quote_expiry_date, quote_status, purchase_type, quotation_job_type, quotation_products, quotation_subtotal, quotation_vat_amount, quotation_total_amount, quote_email_subject, quote_email_body, quote_email_footer, quote_notes, quote_type, special_instructions, access_requirements, site_contact_person, site_contact_phone, created_at, updated_at, created_by, updated_by')
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (company) {
      query = query.ilike('customer_name', `%${company}%`);
    }
    if (role && role !== 'all') {
      // Filter by role - tech role shows technician jobs
      if (role === 'tech') {
        // For tech role, we'll show jobs that are assigned to technicians
        query = query.not('assigned_technician_id', 'is', null);
      } else if (role === 'admin') {
        query = query.in('job_type', ['install', 'maintenance']);
      } else if (role === 'user') {
        query = query.in('job_type', ['repair', 'deinstall']);
      }
    }
    
    // Filter by specific technician if provided
    if (technician) {
      query = query.ilike('technician_phone', `%${technician}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedQuotes = data?.map(job => ({
      id: job.id,
      customer_name: job.customer_name,
      customer_email: job.customer_email,
      customer_phone: job.customer_phone,
      job_type: job.job_type,
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
    })) || [];

    console.log('Fetched jobs:', transformedQuotes.length, 'records');
    
    return NextResponse.json({ 
      quotes: transformedQuotes,
      count: transformedQuotes.length
    });
  } catch (error) {
    console.error('Error in jobs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
