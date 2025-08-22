import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Payment API called');
    const requestBody = await request.json();
    console.log('Raw request body:', requestBody);
    
    const { orderNumber, accountNumber, paymentReference, amount, paymentType } = requestBody;
    console.log('Payment request data:', { orderNumber, accountNumber, paymentReference, amount, paymentType });

    // Validate required fields based on payment type
    if (paymentType === 'cost_center_payment') {
      if (!accountNumber || !paymentReference || !amount) {
        console.log('Missing required fields for cost center payment');
        return NextResponse.json(
          { error: 'Missing required fields: accountNumber, paymentReference, amount' },
          { status: 400 }
        );
      }
    } else {
      if (!orderNumber || !paymentReference || !amount) {
        console.log('Missing required fields for order payment');
        return NextResponse.json(
          { error: 'Missing required fields: orderNumber, paymentReference, amount' },
          { status: 400 }
        );
      }
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

    // Handle cost center payments
    if (paymentType === 'cost_center_payment') {
      console.log('Processing cost center payment for account:', accountNumber);
      
      // First, check if a payment record already exists for this account
      console.log('Checking for existing payment record for account:', accountNumber);
      const { data: existingPayment, error: lookupError } = await supabase
        .from('payments')
        .select('*')
        .eq('new_account_number', accountNumber)
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
         console.log('Updating existing payment record for account:', accountNumber);
         console.log('Current total_amount:', existingPayment.total_amount, 'Adding:', amount);
         console.log('Current amount_due:', existingPayment.amount_due);
         
         // Calculate new amount due after payment
         const currentAmountDue = existingPayment.amount_due || 0;
         const newAmountDue = Math.max(0, currentAmountDue - amount);
         
         // Check if date is after 21st of the month for monthly logic
         const today = new Date();
         const dayOfMonth = today.getDate();
         const isAfter21st = dayOfMonth > 21;
         
         // Calculate monthly amounts and overdue
         let firstMonth = existingPayment.first_month || 0;
         let overdue = existingPayment.overdue || 0;
         
         if (isAfter21st && newAmountDue > 0) {
           // If after 21st and there's still amount due, move remaining to first_month and add to overdue
           firstMonth = newAmountDue;
           overdue = (existingPayment.overdue || 0) + newAmountDue;
           console.log('After 21st: Setting first_month to', firstMonth, 'and adding to overdue:', overdue);
         }
         
         const { data: updatedPayment, error: updateError } = await supabase
           .from('payments')
           .update({
             payment_reference: paymentReference,
             total_amount: (existingPayment.total_amount || 0) + amount,
             amount_due: newAmountDue,
             first_month: firstMonth,
             overdue: overdue,
             created_at: existingPayment.created_at // Preserve original creation date
           })
           .eq('new_account_number', accountNumber)
           .select()
           .single();

         console.log('Update result:', { updatedPayment, updateError });
         console.log('Amount due updated from', currentAmountDue, 'to', newAmountDue);
         console.log('Monthly logic - first_month:', firstMonth, 'overdue:', overdue);
         payment = updatedPayment;
         paymentError = updateError;
       } else {
         // Insert new payment record
         console.log('Creating new payment record for account:', accountNumber);
         
         // Check if date is after 21st of the month
         const today = new Date();
         const dayOfMonth = today.getDate();
         const isAfter21st = dayOfMonth > 21;
         
         // For new records, we need to get the initial amount due from vehicle invoices
         // For now, we'll set it to 0 and let the system calculate it
         const { data: newPayment, error: insertError } = await supabase
           .from('payments')
           .insert({
             new_account_number: accountNumber,
             payment_reference: paymentReference,
             total_amount: amount,
             amount_due: 0, // Will be calculated from vehicle invoices
             first_month: 0,
             overdue: 0,
             created_at: new Date().toISOString()
           })
           .select()
           .single();

         console.log('Insert result:', { newPayment, insertError });
         payment = newPayment;
         paymentError = insertError;
       }

      if (paymentError) {
        console.error('Cost center payment error:', paymentError);
        
        // Provide more specific error messages
        if (paymentError.code === '23505') {
          return NextResponse.json(
            { error: 'Payment record already exists for this account. Please try updating the existing record.' },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: `Failed to record cost center payment: ${paymentError.message}` },
          { status: 500 }
        );
      }

      console.log('Cost center payment recorded successfully:', payment);
      
             // Return the payment data with updated amount due
       return NextResponse.json({
         success: true,
         message: 'Cost center payment processed successfully',
         payment: {
           ...payment,
           message: `Payment of ${amount} recorded successfully. New amount due: ${payment.amount_due}`
         }
       });
    }

    // Handle stock order payments (existing logic)
    // First, verify the order exists and get its details
    console.log('Looking up order:', orderNumber);
    const { data: order, error: orderError } = await supabase
      .from('stock_orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    console.log('Order lookup result:', { order, orderError });

    if (orderError || !order) {
      console.log('Order not found or error:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is approved
    if (!order.approved) {
      return NextResponse.json(
        { error: 'Cannot process payment for unapproved order' },
        { status: 400 }
      );
    }

    // Check if payment amount matches order total
    if (Math.abs(amount - order.total_amount_ex_vat) > 0.01) { // Allow small rounding differences
      return NextResponse.json(
        { error: `Payment amount (${amount}) does not match order total (${order.total_amount_ex_vat})` },
        { status: 400 }
      );
    }

    // Insert payment record into stock_payments table
    console.log('Inserting payment record...');
    const { data: payment, error: paymentError } = await supabase
      .from('stock_payments')
      .insert({
        order_number: orderNumber,
        payment_reference: paymentReference,
        amount: amount,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    console.log('Payment insertion result:', { payment, paymentError });

    if (paymentError) {
      console.error('Payment insertion error:', paymentError);
      return NextResponse.json(
        { error: 'Failed to record payment' },
        { status: 500 }
      );
    }

    // Update the order to mark it as paid
    console.log('Updating order status to paid...');
    const { data: updatedOrder, error: updateError } = await supabase
      .from('stock_orders')
      .update({ 
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('order_number', orderNumber)
      .select()
      .single();

    console.log('Order update result:', { updatedOrder, updateError });

    if (updateError) {
      console.error('Order update error:', updateError);
      return NextResponse.json(
        { error: 'Payment recorded but failed to update order status' },
        { status: 500 }
      );
    }

    console.log('Payment processed successfully, returning response');
    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      payment: payment,
      order: updatedOrder
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
