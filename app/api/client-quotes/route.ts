import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function extractMissingColumnName(message?: string | null): string | null {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsedVehicleYear = Number.parseInt(body.vehicle_year, 10);
    const normalizedJobSubType = String(body.jobSubType || body.job_sub_type || '').trim().toLowerCase();
    const isDecommissionQuote = normalizedJobSubType === 'decommission';
    const normalizedStatus = String(body.status || 'pending').trim().toLowerCase();
    
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
      quote_type: body.quoteType || body.quote_type || 'internal',
      status: normalizedStatus || 'pending',
      quote_status: body.quoteStatus || body.quote_status || 'draft',
      job_status: body.jobStatus || body.job_status || normalizedStatus || 'pending',
      
      // Job details
      job_type: body.jobType || 'install',
      job_sub_type: body.jobSubType || body.job_sub_type || null,
      job_description: body.jobDescription || '',
      purchase_type: body.purchaseType || 'purchase',
      quotation_job_type: body.jobType || 'install',
      priority: 'medium',
      
      // Customer information
      customer_name: body.customerName || '',
      customer_email: body.customerEmail || '',
      customer_phone: body.customerPhone || '',
      customer_address: body.customerAddress || '',
      contact_person: body.contactPerson || '',
      decommission_date: body.decommissionDate || null,
      annuity_end_date: body.annuityEndDate || body.annuity_end_date || null,
      move_to_role: isDecommissionQuote ? (body.moveToRole || body.move_to_role || null) : null,
      vehicle_registration: body.vehicle_registration || null,
      vehicle_make: body.vehicle_make || null,
      vehicle_model: body.vehicle_model || null,
      vehicle_year: Number.isFinite(parsedVehicleYear) ? parsedVehicleYear : null,
      vin_number: body.vin_number || null,
      odormeter: body.odormeter || null,
      
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
    
    // Insert into client_quotes table.
    // If DB schema cache is behind (missing newly added columns), retry without those columns.
    const insertPayload: Record<string, unknown> = { ...clientQuoteData };
    let data: Record<string, unknown> | null = null;
    let error: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await supabase
        .from('client_quotes')
        .insert(insertPayload)
        .select('*')
        .single();

      data = result.data as Record<string, unknown> | null;
      error = result.error as typeof error;

      if (!error) {
        break;
      }

      const missingColumn = extractMissingColumnName(error.message);
      if (error.code === 'PGRST204' && missingColumn && Object.prototype.hasOwnProperty.call(insertPayload, missingColumn)) {
        delete insertPayload[missingColumn];
        continue;
      }

      break;
    }

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
    type CreatedQuote = {
      id?: string;
      job_number?: string;
      job_type?: string;
      account_id?: string;
      customer_name?: string;
      customer_phone?: string;
      customer_address?: string;
      quote_date?: string;
      quote_expiry_date?: string;
      quotation_total_amount?: number;
      quotation_vat_amount?: number;
      quotation_subtotal?: number;
      quote_notes?: string;
      quote_email_body?: string;
      quote_email_subject?: string;
      quote_email_footer?: string;
      new_account_number?: string;
      status?: string;
    };
    const createdQuote = (data || {}) as CreatedQuote;
    console.log('Successfully created client quote:', {
      id: createdQuote.id,
      job_number: createdQuote.job_number,
      new_account_number: createdQuote.new_account_number,
      account_id: createdQuote.account_id
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
        
        const formattedProducts = (body.quotationProducts || []).map((product: QuotationProduct) => {
          const purchaseType = product.purchase_type || 'purchase';
          const isRental = purchaseType === 'rental';
          const cashUnitPrice = (product.cash_price || 0) - (product.cash_discount || 0);
          const rentalUnitPrice = ((product as QuotationProduct & { rental_price?: number; rental_discount?: number }).rental_price || 0)
            - ((product as QuotationProduct & { rental_price?: number; rental_discount?: number }).rental_discount || 0);

          return {
            name: product.name || '',
            description: product.description || '',
            quantity: product.quantity || 1,
            unitPrice: isRental ? rentalUnitPrice : cashUnitPrice,
            total: product.total_price || 0,
            type: product.type || '',
            category: product.category || '',
            vehicleId: product.vehicle_id || '',
            vehiclePlate: product.vehicle_plate || '',
            purchaseType
          };
        });
        
        // Send the quotation email
        const emailResult = await sendQuotationEmail({
          quoteNumber: createdQuote.job_number,
          jobNumber: createdQuote.job_number,
          jobType: createdQuote.job_type || body.jobType || 'install',
          clientName: createdQuote.customer_name || body.customerName || '',
          clientEmail: emailRecipients,
          clientPhone: createdQuote.customer_phone || body.customerPhone || '',
          clientAddress: createdQuote.customer_address || body.customerAddress || '',
          quoteDate: createdQuote.quote_date || new Date().toISOString(),
          expiryDate: createdQuote.quote_expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          totalAmount: createdQuote.quotation_total_amount || body.quotationTotalAmount || 0,
          vatAmount: createdQuote.quotation_vat_amount || body.quotationVatAmount || 0,
          subtotal: createdQuote.quotation_subtotal || body.quotationSubtotal || 0,
          products: formattedProducts,
          notes: createdQuote.quote_notes || body.quoteNotes || '',
          emailBody: createdQuote.quote_email_body || body.quoteEmailBody || body.emailBody || '',
          emailSubject: createdQuote.quote_email_subject || body.quoteEmailSubject || body.emailSubject || '',
          emailFooter: createdQuote.quote_email_footer || body.quoteEmailFooter || body.quoteFooter || '',
          accountNumber: createdQuote.new_account_number || body.new_account_number || ''
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
        id: createdQuote.id,
        job_number: createdQuote.job_number,
        quote_date: createdQuote.quote_date,
        customer_name: createdQuote.customer_name,
        quotation_total_amount: createdQuote.quotation_total_amount,
        status: createdQuote.status,
        new_account_number: createdQuote.new_account_number // Include this in response
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
