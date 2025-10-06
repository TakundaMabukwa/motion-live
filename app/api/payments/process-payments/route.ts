import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Payments_ API called');
    const requestBody = await request.json();
    console.log('Raw request body:', requestBody);
    
    const { accountNumber, paymentReference, amount, paymentType } = requestBody;
    console.log('Payment request data:', { accountNumber, paymentReference, amount, paymentType });

    // Validate required fields
    if (!accountNumber || !paymentReference || !amount) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: accountNumber, paymentReference, amount' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (amount <= 0) {
      console.log('Invalid amount:', amount);
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate amount is reasonable (not more than 1 million)
    if (amount > 1000000) {
      console.log('Amount too high:', amount);
      return NextResponse.json(
        { error: 'Amount seems unreasonably high. Please verify the payment amount.' },
        { status: 400 }
      );
    }

    console.log('Creating Supabase client...');
    const supabase = await createClient();
    console.log('Supabase client created');

    // Handle cost center payments using payments_ table
    if (paymentType === 'cost_center_payment') {
      console.log('Processing cost center payment for account:', accountNumber);
      
      // First, check if a payment record already exists for this cost_code
      console.log('Checking for existing payment record for cost_code:', accountNumber);
      const { data: existingPayment, error: lookupError } = await supabase
        .from('payments_')
        .select('*')
        .eq('cost_code', accountNumber)
        .single();

      if (lookupError && lookupError.code !== 'PGRST116') {
        console.error('Error looking up existing payment:', lookupError);
        return NextResponse.json(
          { error: 'Failed to check existing payment record' },
          { status: 500 }
        );
      }

      console.log('Existing payment lookup result:', { existingPayment, lookupError });

      let payment;
      let paymentError;

      if (existingPayment) {
        // Update existing payment record
        console.log('Updating existing payment record for cost_code:', accountNumber);
        console.log('Current due_amount:', existingPayment.due_amount, 'Current paid_amount:', existingPayment.paid_amount);
        console.log('Current balance_due:', existingPayment.balance_due, 'Adding payment:', amount);
        
        // Calculate new paid amount and balance due
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
        
        // Calculate overdue amounts based on due_date
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
            reference: paymentReference,
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

        console.log('Update result:', { updatedPayment, updateError });
        console.log('Payment updated - paid_amount:', newPaidAmount, 'balance_due:', newBalanceDue, 'status:', paymentStatus);
        payment = updatedPayment;
        paymentError = updateError;
      } else {
        // Create new payment record - this shouldn't happen often as payments_ should be pre-populated
        console.log('Creating new payment record for cost_code:', accountNumber);
        
        const { data: newPayment, error: insertError } = await supabase
          .from('payments_')
          .insert({
            cost_code: accountNumber,
            company: '', // Will be populated from other data
            reference: paymentReference,
            due_amount: amount, // Initial due amount
            paid_amount: amount, // First payment
            balance_due: 0, // Fully paid
            payment_status: 'paid',
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            overdue_30_days: 0,
            overdue_60_days: 0,
            overdue_90_days: 0,
            billing_month: new Date().toISOString().split('T')[0].substring(0, 7) + '-01', // First day of current month
            last_updated: new Date().toISOString()
          })
          .select()
          .single();

        console.log('Insert result:', { newPayment, insertError });
        payment = newPayment;
        paymentError = insertError;
      }

      if (paymentError) {
        console.error('Payment processing error:', paymentError);
        return NextResponse.json(
          { error: 'Failed to process payment' },
          { status: 500 }
        );
      }

      console.log('Payment processed successfully:', payment);
      
      // Return the payment data with updated amounts
      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        payment: {
          ...payment,
          message: `Payment of ${amount} recorded successfully. New balance due: ${payment.balance_due}`
        }
      });
    }

    // Handle other payment types if needed
    return NextResponse.json(
      { error: 'Unsupported payment type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
