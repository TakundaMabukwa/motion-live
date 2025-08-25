import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Debug logging
    console.log('Received client quote data:', {
      accountNumber: body.accountNumber,
      new_account_number: body.new_account_number,
      accountId: body.accountId,
      customerName: body.customerName,
      urlParams: request.url,
      fullBody: body
    });
    
    // Generate job number for client quote
    const jobNumber = `CLIENT-${Date.now()}`;
    
    // Prepare data for client_quotes table
    const clientQuoteData = {
      // Basic quote information
      job_number: jobNumber,
      quote_date: new Date().toISOString(),
      quote_expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      quote_type: 'internal',
      status: 'draft',
      quote_status: 'draft',
      job_status: 'draft',
      
      // Job details
      job_type: body.jobType || 'install',
      job_description: body.jobDescription || '',
      purchase_type: body.purchaseType || 'purchase',
      quotation_job_type: body.jobType || 'install',
      priority: 'medium',
      
      // Customer information
      customer_name: body.customerName || '',
      customer_email: body.customerEmail || '',
      customer_phone: body.customerPhone || '',
      customer_address: body.customerAddress || '',
      
      // Account information
      account_id: body.accountId || null,
      new_account_number: body.new_account_number || body.accountNumber || null, // Prioritize new_account_number field
      
      // Quotation products and pricing
      quotation_products: body.quotationProducts || [],
      quotation_subtotal: body.quotationSubtotal || 0,
      quotation_vat_amount: body.quotationVatAmount || 0,
      quotation_total_amount: body.quotationTotalAmount || 0,
      
      // Email details
      quote_email_body: body.quoteEmailBody || '',
      quote_email_subject: body.quoteEmailSubject || `Client Quotation for ${body.customerName}`,
      quote_email_footer: body.quoteEmailFooter || '',
      quote_notes: body.quoteNotes || '',
      
      // Additional fields
      special_instructions: body.quoteNotes || null,
      work_notes: body.quoteNotes || null,
      
      // Metadata
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    // Debug logging before insert
    console.log('Inserting client quote data:', {
      job_number: clientQuoteData.job_number,
      new_account_number: clientQuoteData.new_account_number,
      account_id: clientQuoteData.account_id,
      customer_name: clientQuoteData.customer_name,
      source_accountNumber: body.accountNumber,
      source_new_account_number: body.new_account_number,
      final_new_account_number: clientQuoteData.new_account_number,
      fullData: clientQuoteData
    });
    
    // Insert into client_quotes table
    const { data, error } = await supabase
      .from('client_quotes')
      .insert(clientQuoteData)
      .select('*') // Select all fields to see what's actually stored
      .single();

    if (error) {
      console.error('Database error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ 
        error: 'Failed to create client quote',
        details: error.message 
      }, { status: 500 });
    }

    // Debug logging after successful insert
    console.log('Successfully created client quote:', {
      id: data.id,
      job_number: data.job_number,
      new_account_number: data.new_account_number,
      account_id: data.account_id
    });
    
    return NextResponse.json({
      success: true,
      message: 'Client quote created successfully',
      data: {
        id: data.id,
        job_number: data.job_number,
        quote_date: data.quote_date,
        customer_name: data.customer_name,
        quotation_total_amount: data.quotation_total_amount,
        status: data.status,
        new_account_number: data.new_account_number // Include this in response
      }
    });

  } catch (error) {
    console.error('Error creating client quote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('account_number') || searchParams.get('accountNumber');
    const status = searchParams.get('status');

    let query = supabase
      .from('client_quotes')
      .select('*')
      .order('created_at', { ascending: false });

    // Only filter by account number if specifically provided
    if (accountNumber && accountNumber.trim() !== '') {
      console.log('Filtering quotes by account number:', accountNumber);
      query = query.eq('new_account_number', accountNumber);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch client quotes',
        details: error.message 
      }, { status: 500 });
    }

    console.log(`Found ${data?.length || 0} quotes for account ${accountNumber || 'all accounts'}`);

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error fetching client quotes:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
