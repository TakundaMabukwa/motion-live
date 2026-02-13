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
     
     if (body.vehicle_registration) {
       vehicleRegistration = body.vehicle_registration;
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
       vehicle_registration: body.vehicle_registration || null,
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
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerName = searchParams.get('customer_name');
    const quoteType = searchParams.get('quote_type');

    let query = supabase
      .from('customer_quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (customerName) {
      query = query.ilike('customer_name', `%${customerName}%`);
    }
    if (quoteType) {
      query = query.eq('quote_type', quoteType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch customer quotes',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error fetching customer quotes:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
