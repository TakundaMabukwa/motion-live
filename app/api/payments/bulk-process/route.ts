import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Bulk Payments API called');
    const requestBody = await request.json();
    console.log('Raw request body:', requestBody);
    
    const { payments, paymentReference } = requestBody;
    console.log('Bulk payment request data:', { paymentsCount: payments?.length, paymentReference });

    // Validate required fields
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      console.log('Missing or invalid payments array');
      return NextResponse.json(
        { error: 'Missing or invalid payments array' },
        { status: 400 }
      );
    }

    if (!paymentReference || !paymentReference.trim()) {
      console.log('Missing payment reference');
      return NextResponse.json(
        { error: 'Payment reference is required for bulk payments' },
        { status: 400 }
      );
    }

    // Validate each payment
    for (const payment of payments) {
      if (!payment.accountNumber || !payment.amount || payment.amount <= 0) {
        return NextResponse.json(
          { error: `Invalid payment data for account ${payment.accountNumber || 'unknown'}` },
          { status: 400 }
        );
      }
    }

    console.log('Creating Supabase client...');
    const supabase = await createClient();
    console.log('Supabase client created');

    const results = [];
    const errors = [];
    let successCount = 0;

    // Process each payment
    for (const payment of payments) {
      try {
        const { accountNumber, amount } = payment;
        console.log(`Processing payment for ${accountNumber}: ${amount}`);

        // Check if payment record exists
        const { data: existingPayment, error: lookupError } = await supabase
          .from('payments_')
          .select('*')
          .eq('cost_code', accountNumber)
          .single();

        if (lookupError && lookupError.code !== 'PGRST116') {
          console.error(`Error looking up payment for ${accountNumber}:`, lookupError);
          errors.push(`${accountNumber}: Database lookup error`);
          continue;
        }

        let paymentResult;
        let paymentError;

        if (existingPayment) {
          // Update existing payment record
          console.log(`Updating existing payment record for ${accountNumber}`);
          
          const currentPaidAmount = parseFloat(existingPayment.paid_amount) || 0;
          const currentBalanceDue = parseFloat(existingPayment.balance_due) || 0;
          const currentDueAmount = parseFloat(existingPayment.due_amount) || 0;
          
          const newPaidAmount = currentPaidAmount + amount;
          const newBalanceDue = Math.max(0, currentBalanceDue - amount);
          
          // Determine payment status
          let paymentStatus = 'partial';
          if (newBalanceDue === 0) {
            paymentStatus = 'paid';
          } else if (newBalanceDue > 0 && newPaidAmount < currentDueAmount) {
            paymentStatus = 'partial';
          } else if (newBalanceDue > 0 && newPaidAmount >= currentDueAmount) {
            paymentStatus = 'overdue';
          }
          
          // Calculate overdue amounts
          const today = new Date();
          const dueDate = existingPayment.due_date ? new Date(existingPayment.due_date) : new Date();
          const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          let overdue30Days = 0;
          let overdue60Days = 0;
          let overdue90Days = 0;
          
          if (newBalanceDue > 0) {
            if (daysOverdue > 90) {
              overdue90Days = newBalanceDue;
            } else if (daysOverdue > 60) {
              overdue60Days = newBalanceDue;
            } else if (daysOverdue > 30) {
              overdue30Days = newBalanceDue;
            }
          }
          
          const { data: updatedPayment, error: updateError } = await supabase
            .from('payments_')
            .update({
              reference: paymentReference.trim(),
              paid_amount: newPaidAmount,
              balance_due: newBalanceDue,
              payment_status: paymentStatus,
              overdue_30_days: overdue30Days,
              overdue_60_days: overdue60Days,
              overdue_90_days: overdue90Days,
              last_updated: new Date().toISOString()
            })
            .eq('cost_code', accountNumber)
            .select()
            .single();

          paymentResult = updatedPayment;
          paymentError = updateError;
        } else {
          // Create new payment record
          console.log(`Creating new payment record for ${accountNumber}`);
          
          const { data: newPayment, error: insertError } = await supabase
            .from('payments_')
            .insert({
              cost_code: accountNumber,
              company: '',
              reference: paymentReference.trim(),
              due_amount: amount,
              paid_amount: amount,
              balance_due: 0,
              payment_status: 'paid',
              invoice_date: new Date().toISOString().split('T')[0],
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              overdue_30_days: 0,
              overdue_60_days: 0,
              overdue_90_days: 0,
              billing_month: new Date().toISOString().split('T')[0].substring(0, 7) + '-01',
              last_updated: new Date().toISOString()
            })
            .select()
            .single();

          paymentResult = newPayment;
          paymentError = insertError;
        }

        if (paymentError) {
          console.error(`Payment processing error for ${accountNumber}:`, paymentError);
          errors.push(`${accountNumber}: ${paymentError.message}`);
        } else {
          console.log(`Payment processed successfully for ${accountNumber}`);
          results.push({
            accountNumber,
            amount,
            success: true,
            payment: paymentResult
          });
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing payment for ${payment.accountNumber}:`, error);
        errors.push(`${payment.accountNumber}: ${error.message}`);
      }
    }

    console.log(`Bulk payment processing complete: ${successCount} successful, ${errors.length} errors`);

    // Return results
    return NextResponse.json({
      success: successCount > 0,
      message: `Processed ${successCount} out of ${payments.length} payments successfully`,
      results,
      errors,
      summary: {
        total: payments.length,
        successful: successCount,
        failed: errors.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
      }
    });

  } catch (error) {
    console.error('Bulk payment processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
