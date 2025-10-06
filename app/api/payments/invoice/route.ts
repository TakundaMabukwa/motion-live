import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account number from query params
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    console.log(`Fetching payment invoice for account: ${accountNumber}`);

    // Fetch payment data from payments_ table
    const { data: paymentData, error: fetchError } = await supabase
      .from('payments_')
      .select(`
        id,
        company,
        cost_code,
        reference,
        due_amount,
        paid_amount,
        balance_due,
        invoice_date,
        due_date,
        payment_status,
        overdue_30_days,
        overdue_60_days,
        overdue_90_days,
        billing_month,
        last_updated
      `)
      .eq('cost_code', accountNumber)
      .single();

    if (fetchError) {
      console.error('Error fetching payment data:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch payment data' }, { status: 500 });
    }

    if (!paymentData) {
      return NextResponse.json({ 
        success: true,
        accountNumber,
        invoiceData: null,
        message: 'No payment data found for this account'
      });
    }

    console.log(`Found payment data for account ${accountNumber}`);

    // Format the payment data for invoice display
    const invoiceData = {
      // Basic Info
      accountNumber: paymentData.cost_code,
      company: paymentData.company || 'N/A',
      reference: paymentData.reference || 'N/A',
      
      // Dates
      invoiceDate: paymentData.invoice_date,
      dueDate: paymentData.due_date,
      billingMonth: paymentData.billing_month,
      lastUpdated: paymentData.last_updated,
      
      // Financial Data
      dueAmount: parseFloat(paymentData.due_amount) || 0,
      paidAmount: parseFloat(paymentData.paid_amount) || 0,
      balanceDue: parseFloat(paymentData.balance_due) || 0,
      
      // Overdue Data
      overdue30Days: parseFloat(paymentData.overdue_30_days) || 0,
      overdue60Days: parseFloat(paymentData.overdue_60_days) || 0,
      overdue90Days: parseFloat(paymentData.overdue_90_days) || 0,
      
      // Status
      paymentStatus: paymentData.payment_status || 'pending',
      
      // Calculated Fields
      totalOverdue: (parseFloat(paymentData.overdue_30_days) || 0) + 
                   (parseFloat(paymentData.overdue_60_days) || 0) + 
                   (parseFloat(paymentData.overdue_90_days) || 0),
      
      // Invoice Items (simplified structure for payments_ table)
      invoiceItems: [
        {
          id: paymentData.id,
          description: `Payment for ${paymentData.cost_code}`,
          reference: paymentData.reference || 'N/A',
          dueAmount: parseFloat(paymentData.due_amount) || 0,
          paidAmount: parseFloat(paymentData.paid_amount) || 0,
          balanceDue: parseFloat(paymentData.balance_due) || 0,
          status: paymentData.payment_status || 'pending',
          billingMonth: paymentData.billing_month,
          invoiceDate: paymentData.invoice_date,
          dueDate: paymentData.due_date
        }
      ]
    };

    return NextResponse.json({
      success: true,
      accountNumber,
      invoiceData,
      message: 'Payment invoice data retrieved successfully'
    });

  } catch (error) {
    console.error('Error in payment invoice API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
