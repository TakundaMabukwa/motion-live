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
    
    // Generate a SOL- format 6-digit unique number
    const generateSixDigitNumber = () => {
      // Generate a random 6-digit number
      return Math.floor(100000 + Math.random() * 900000);
    };
    
    const uniqueNumber = generateSixDigitNumber();
    
    // Generate job number for client quote with SOL prefix and 6 digits
    const jobNumber = `SOL-${uniqueNumber}`;
    
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
    
    // Send quotation email
    try {
      // Import the sendQuotationEmail function
      const { sendQuotationEmail } = await import('@/lib/email');
      
      // Prepare email recipients
      let emailRecipients: string[] = [];
      
      // If emailRecipients is provided, use that
      if (body.emailRecipients && Array.isArray(body.emailRecipients) && body.emailRecipients.length > 0) {
        emailRecipients = body.emailRecipients;
      }
      // Otherwise, use customerEmail as fallback
      else if (body.customerEmail) {
        emailRecipients = [body.customerEmail];
      }
      
      // Only send email if we have recipients
      if (emailRecipients.length > 0) {
        // Format product items for the email
        interface QuotationProduct {
          name?: string;
          description?: string;
          quantity?: number;
          cash_price?: number;
          cash_discount?: number;
          total_price?: number;
          type?: string;
          category?: string;
          vehicle_id?: string;
          vehicle_plate?: string;
          purchase_type?: string;
          [key: string]: string | number | boolean | undefined;
        }
        
        const formattedProducts = (body.quotationProducts || []).map((product: QuotationProduct) => ({
          name: product.name || '',
          description: product.description || '',
          quantity: product.quantity || 1,
          unitPrice: (product.cash_price || 0) - (product.cash_discount || 0),
          total: product.total_price || 0,
          type: product.type || '',
          category: product.category || '',
          vehicleId: product.vehicle_id || '',
          vehiclePlate: product.vehicle_plate || '',
          purchaseType: product.purchase_type || 'purchase'
        }));
        
        // Send the quotation email
        const emailResult = await sendQuotationEmail({
          quoteNumber: data.job_number,
          jobNumber: data.job_number,
          jobType: data.job_type || body.jobType || 'install',
          clientName: data.customer_name || body.customerName || '',
          clientEmail: emailRecipients,
          clientPhone: data.customer_phone || body.customerPhone || '',
          clientAddress: data.customer_address || body.customerAddress || '',
          quoteDate: data.quote_date || new Date().toISOString(),
          expiryDate: data.quote_expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          totalAmount: data.quotation_total_amount || body.quotationTotalAmount || 0,
          vatAmount: data.quotation_vat_amount || body.quotationVatAmount || 0,
          subtotal: data.quotation_subtotal || body.quotationSubtotal || 0,
          products: formattedProducts,
          notes: data.quote_notes || body.quoteNotes || '',
          emailBody: data.quote_email_body || body.quoteEmailBody || body.emailBody || '',
          emailSubject: data.quote_email_subject || body.quoteEmailSubject || body.emailSubject || '',
          emailFooter: data.quote_email_footer || body.quoteEmailFooter || body.quoteFooter || '',
          accountNumber: data.new_account_number || body.new_account_number || ''
        });
        
        console.log('Email sending result:', emailResult);
      } else {
        console.log('No email recipients provided, skipping email send');
      }
    } catch (emailError) {
      // Log error but don't fail the quote creation
      console.error('Error sending quotation email:', emailError);
    }
    
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
      
      // First, find the customer group that contains this account number
      const { data: customerGroup } = await supabase
        .from('customers_grouped')
        .select('all_new_account_numbers')
        .ilike('all_new_account_numbers', `%${accountNumber}%`)
        .limit(1);
      
      if (customerGroup && customerGroup.length > 0) {
        // Get all account numbers from the group and use IN clause
        const allAccountNumbers = customerGroup[0].all_new_account_numbers;
        const accountNumbers = [...new Set(
          allAccountNumbers.split(',').map(acc => acc.trim()).filter(acc => acc.length > 0)
        )];
        query = query.in('new_account_number', accountNumbers);
      } else {
        // Fallback to direct match
        query = query.eq('new_account_number', accountNumber);
      }
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
