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
    
    // Prepare job card data from quotation
    const jobCardData = {
      // Job details
      job_type: body.jobType || 'install',
      job_description: body.jobDescription || '',
      priority: body.priority || 'medium',
      
      // Customer information
      account_id: body.accountId && body.accountId !== 'null' ? body.accountId : null,
      customer_name: body.customerName || '',
      customer_email: body.customerEmail || '',
      customer_phone: body.customerPhone || '',
      customer_address: body.customerAddress || '',
      
      // Vehicle information
      vehicle_id: body.vehicleId || null,
      vehicle_registration: body.vehicleRegistration || '',
      vehicle_make: body.vehicleMake || '',
      vehicle_model: body.vehicleModel || '',
      vehicle_year: body.vehicleYear || null,
      vin_numer: body.vinNumber || '',
      odormeter: body.odormeter || '',
      
      // Location information
      job_location: body.jobLocation || '',
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      
      // Quotation details
      quotation_number: quotationNumber,
      quote_date: body.quoteDate || new Date().toISOString(),
      quote_expiry_date: body.quoteExpiryDate || null,
      quote_status: body.quoteStatus || 'draft',
      
      // Purchase and job type for quotation
      purchase_type: body.purchaseType || 'purchase',
      quotation_job_type: body.quotationJobType || 'install',
      
      // Quotation pricing breakdown
      quotation_products: body.quotationProducts || [],
      quotation_subtotal: body.quotationSubtotal || 0,
      quotation_vat_amount: body.quotationVatAmount || 0,
      quotation_total_amount: body.quotationTotalAmount || 0,
      
      // Quotation email details
      quote_email_subject: body.quoteEmailSubject || '',
      quote_email_body: body.quoteEmailBody || '',
      quote_email_footer: body.quoteEmailFooter || '',
      quote_notes: body.quoteNotes || '',
      
      // Quotation type
      quote_type: body.quoteType || 'external',
      
      // Additional fields
      special_instructions: body.specialInstructions || '',
      access_requirements: body.accessRequirements || '',
      site_contact_person: body.siteContactPerson || '',
      site_contact_phone: body.siteContactPhone || '',
      
      // Status
      status: body.status || 'draft',
      
      // Metadata
      created_by: '00000000-0000-0000-0000-000000000000', // Temporary user ID
      updated_by: '00000000-0000-0000-0000-000000000000', // Temporary user ID
      
      // Set job_number explicitly to avoid trigger conflicts
      job_number: jobNumber
    };

    // Insert the job card
    const { data, error } = await supabase
      .from('job_cards')
      .insert([jobCardData])
      .select('id, job_number, quotation_number, customer_name, job_type, status, created_at')
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