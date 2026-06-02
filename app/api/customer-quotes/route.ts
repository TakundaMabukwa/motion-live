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
    
    // Extract vehicle information - use vehicle_registration if available, otherwise generate temporary_registration
    let vehicleRegistration = null;
    let temporaryRegistration = null;
     
    const submittedVehicleRegistration =
       body.vehicle_registration ||
       body.vehicleRegistration ||
       body.registration ||
       '';

     if (String(submittedVehicleRegistration).trim()) {
       vehicleRegistration = String(submittedVehicleRegistration).trim();
     } else {
       // Generate temporary registration number if vehicle registration is not provided
       temporaryRegistration = `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
       vehicleRegistration = temporaryRegistration; // Use temporary as vehicle registration
     }

         // Generate a SOL- format 6-digit unique number
     const generateSixDigitNumber = () => {
       // Generate a random 6-digit number
       return Math.floor(100000 + Math.random() * 900000);
     };
     
     const uniqueNumber = generateSixDigitNumber();
     
     // Prepare data for customer_quotes table - using all available columns
     const quoteData = {
       // Basic quote information
       job_number: `SOL-${uniqueNumber}`, // Generate job number with SOL prefix and 6 digits
       quote_date: new Date().toISOString(),
       quote_expiry_date: body.quote_expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
       quote_type: 'external',
       status: 'draft',
       quote_status: 'draft',
       
       // Job details
       job_type: body.jobType || 'install',
       job_description: body.description || '',
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
       
       // Vehicle information
       vehicle_registration: vehicleRegistration,
       vehicle_make: body.vehicle_make || null,
       vehicle_model: body.vehicle_model || null,
       vehicle_year: body.vehicle_year ? parseInt(body.vehicle_year) : null,
       vin_number: body.vin_number || null,
       odormeter: body.odormeter || null,
       
       // Quotation products and pricing
       quotation_products: body.quotationProducts || [],
       quotation_subtotal: body.quotationSubtotal || 0,
       quotation_vat_amount: body.quotationVatAmount || 0,
       quotation_total_amount: body.quotationTotalAmount || 0,
       
       // Email details
       quote_email_body: body.emailBody || '',
       quote_email_subject: body.emailSubject || `Quotation for ${body.customerName}`,
       quote_email_footer: body.quoteFooter || '',
       quote_notes: body.extraNotes || '',
       
       // Additional fields
       special_instructions: body.extraNotes || null,
       work_notes: body.extraNotes || null,
       
       // Metadata
       created_by: user.id,
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString(),
       updated_by: user.id
     };

    // Insert into customer_quotes table
    const { data, error } = await supabase
      .from('customer_quotes')
      .insert(quoteData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to create customer quote',
        details: error.message 
      }, { status: 500 });
    }
    
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
          id?: string | number;
          name?: string;
          description?: string;
          quantity?: number;
          cash_price?: number;
          cash_discount?: number;
          total_price?: number;
          type?: string;
          category?: string;
          vehicle_id?: string;
          vehicleId?: string;
          vehicle_plate?: string;
          vehiclePlate?: string;
          purchase_type?: string;
          purchaseType?: string;
          [key: string]: string | number | boolean | undefined;
        }
        
        const formattedProducts = (body.quotationProducts || []).map((product: QuotationProduct) => {
          const purchaseType = product.purchase_type || product.purchaseType || 'purchase';
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
            vehicleId: product.vehicle_id || product.vehicleId || '',
            vehiclePlate: product.vehicle_plate || product.vehiclePlate || '',
            purchaseType
          };
        });
        
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
          notes: data.quote_notes || body.extraNotes || '',
          emailBody: data.quote_email_body || body.emailBody || body.quoteEmailBody || '',
          emailSubject: data.quote_email_subject || body.emailSubject || body.quoteEmailSubject || '',
          emailFooter: data.quote_email_footer || body.quoteFooter || body.quoteEmailFooter || '',
          accountNumber: '' // External quotes don't have account numbers
        });
        
        console.log('External quotation email sending result:', emailResult);
      } else {
        console.log('No email recipients provided for external quote, skipping email send');
      }
    } catch (emailError) {
      // Log error but don't fail the quote creation
      console.error('Error sending external quotation email:', emailError);
    }

    return NextResponse.json({
       success: true,
       message: 'Customer quote created successfully',
       data: {
         id: data.id,
         job_number: data.job_number,
         quote_date: data.quote_date,
         customer_name: data.customer_name,
         quotation_total_amount: data.quotation_total_amount,
         status: data.status
       }
     });

  } catch (error) {
    console.error('Error creating customer quote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const customerName = searchParams.get('customer_name');
    const quoteType = searchParams.get('quote_type');

    // Build filter conditions (shared between data and count queries)
    const applyFilters = (q: ReturnType<typeof supabase.from<'customer_quotes'>['select']>) => {
      if (status === 'draft') {
        q = q.is('job_status', null);
      } else if (status) {
        q = q.eq('job_status', status);
      }
      if (search) {
        const pattern = `*${search}*`;
        q = q.or(
          `job_number.ilike.${pattern},customer_name.ilike.${pattern},customer_email.ilike.${pattern},vehicle_registration.ilike.${pattern}`
        );
      }
      if (customerName) {
        q = q.ilike('customer_name', `%${customerName}%`);
      }
      if (quoteType) {
        q = q.eq('quote_type', quoteType);
      }
      return q;
    };

    // Fetch paginated data
    let dataQuery = supabase
      .from('customer_quotes')
      .select('*')
      .order('created_at', { ascending: false });

    dataQuery = applyFilters(dataQuery);
    dataQuery = dataQuery.range(offset, offset + limit - 1);

    const { data, error } = await dataQuery;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({
        error: 'Failed to fetch customer quotes',
        details: error.message
      }, { status: 500 });
    }

    // Fetch total count for pagination
    let countQuery = supabase
      .from('customer_quotes')
      .select('id', { count: 'exact', head: true });

    countQuery = applyFilters(countQuery as any);

    const { count: total, error: countError } = await countQuery;

    if (countError) {
      console.error('Count query error:', countError);
    }

    // Fetch summary stats by status (parallel)
    const summaryStatuses = ['pending', 'approved', 'rejected'];
    const summaryCounts: Record<string, number> = { draft: 0, pending: 0, approved: 0, rejected: 0 };

    const countResults = await Promise.all(
      summaryStatuses.map(async (s) => {
        const { count } = await supabase
          .from('customer_quotes')
          .select('id', { count: 'exact', head: true })
          .eq('job_status', s);
        return { status: s, count: count ?? 0 };
      })
    );

    countResults.forEach(({ status: s, count }) => { summaryCounts[s] = count; });

    // Draft count: job_status is null (new quotes) or 'draft'
    const { count: draftCount } = await supabase
      .from('customer_quotes')
      .select('id', { count: 'exact', head: true })
      .is('job_status', null);
    summaryCounts.draft = draftCount ?? 0;

    // Aggregate monetary values for approved and rejected
    let approvedValue = 0;
    let declinedValue = 0;
    const { data: valueRows } = await supabase
      .from('customer_quotes')
      .select('job_status, quotation_total_amount')
      .in('job_status', ['approved', 'rejected']);

    (valueRows || []).forEach((row) => {
      const val = parseFloat(String(row.quotation_total_amount)) || 0;
      if (row.job_status === 'approved') {
        approvedValue += val;
      } else if (row.job_status === 'rejected') {
        declinedValue += val;
      }
    });

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: total ?? 0,
        totalPages: total ? Math.ceil(total / limit) : 0
      },
      summary: {
        ...summaryCounts,
        approvedValue,
        declinedValue
      }
    });

  } catch (error) {
    console.error('Error fetching customer quotes:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
