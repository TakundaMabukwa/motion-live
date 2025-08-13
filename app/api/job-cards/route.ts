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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get all job cards data without complex filtering
    let query = supabase
      .from('job_cards')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching job cards:', error);
      return NextResponse.json({ error: 'Failed to fetch job cards' }, { status: 500 });
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('job_cards')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      job_cards: data || [],
      count: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('Error in job cards GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Temporarily disable authentication for testing
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    
    // Generate unique identifiers
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    const jobNumber = `JOB-${timestamp}-${randomSuffix}`;
    const quotationNumber = `QUOTE-${timestamp}-${randomSuffix}`;
    
    // Prepare job card data - handle both quotation and repair jobs
    const jobCardData = {
      // Job details
      job_type: body.jobType || body.job_type || 'install',
      repair: body.repair || false,
      job_description: body.jobDescription || body.job_description || '',
      priority: body.priority || 'medium',
      status: body.status || 'draft',
      job_status: body.job_status || 'created',
      
      // Customer information
      account_id: body.accountId && body.accountId !== 'null' ? body.accountId : null,
      customer_name: body.customerName || body.customer_name || '',
      customer_email: body.customerEmail || body.customer_email || '',
      customer_phone: body.customerPhone || body.customer_phone || '',
      customer_address: body.customerAddress || body.customer_address || '',
      
      // Vehicle information
      vehicle_id: body.vehicleId || body.vehicle_id || null,
      vehicle_registration: body.vehicleRegistration || body.vehicle_registration || '',
      vehicle_make: body.vehicleMake || body.vehicle_make || '',
      vehicle_model: body.vehicleModel || body.vehicle_model || '',
      vehicle_year: body.vehicleYear || body.vehicle_year || null,
      vin_numer: body.vinNumber || body.vin_numer || '',
      odormeter: body.odormeter || body.odormeter || '',
      
      // Location information
      job_location: body.jobLocation || body.job_location || '',
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      
      // Quotation details (only for quotation jobs)
      quotation_number: body.repair ? 'REPAIR-JOB' : (body.quotationNumber || quotationNumber),
      quote_date: body.repair ? null : (body.quoteDate || new Date().toISOString()),
      quote_expiry_date: body.repair ? null : (body.quoteExpiryDate || null),
      quote_status: body.repair ? null : (body.quoteStatus || 'draft'),
      
      // Purchase and job type for quotation
      purchase_type: body.repair ? null : (body.purchaseType || 'purchase'),
      quotation_job_type: body.repair ? null : (body.quotationJobType || 'install'),
      
      // Quotation pricing breakdown (only for quotation jobs)
      quotation_products: body.repair ? null : (body.quotationProducts || []),
      quotation_subtotal: body.repair ? null : (body.quotationSubtotal || 0),
      quotation_vat_amount: body.repair ? null : (body.quotationVatAmount || 0),
      quotation_total_amount: body.repair ? null : (body.quotationTotalAmount || 0),
      
      // Quotation email details (only for quotation jobs)
      quote_email_subject: body.repair ? null : (body.quoteEmailSubject || ''),
      quote_email_body: body.repair ? null : (body.quoteEmailBody || ''),
      quote_email_footer: body.repair ? null : (body.quoteEmailFooter || ''),
      quote_notes: body.repair ? null : (body.quoteNotes || ''),
      
      // Quotation type (only for quotation jobs)
      quote_type: body.repair ? null : (body.quoteType || 'external'),
      
      // Additional fields
      special_instructions: body.specialInstructions || body.special_instructions || '',
      
      // Technician information (for repair jobs)
      technician_name: body.technician_name || null,
      technician_phone: body.technician_phone || null,
      
      // Job timing (for repair jobs)
      job_date: body.job_date || new Date().toISOString(),
      start_time: body.start_time || null,
      completion_date: body.completion_date || null,
      end_time: body.end_time || null,
      
      // Photos (for repair jobs)
      before_photos: body.before_photos || null,
      after_photos: body.after_photos || null,
      
      // Metadata
      created_by: body.created_by || '00000000-0000-0000-0000-000000000000',
      updated_by: body.updated_by || '00000000-0000-0000-0000-000000000000',
      
      // Set job_number explicitly to avoid trigger conflicts
      job_number: body.repair ? (body.job_number || jobNumber) : jobNumber
    };

    // Insert the job card
    const { data, error } = await supabase
      .from('job_cards')
      .insert([jobCardData])
      .select('id, job_number, customer_name, job_type, status, created_at')
      .single();

    if (error) {
      console.error('Error inserting job card:', error);
      return NextResponse.json({ 
        error: 'Failed to create job card',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Job card created successfully',
      data: data 
    });

  } catch (error) {
    console.error('Error in job cards POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 