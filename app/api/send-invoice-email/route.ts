import { NextRequest, NextResponse } from 'next/server';
import { sendInvoiceEmail } from '@/lib/notification-email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.invoiceNumber || !body.clientName || !body.clientEmail) {
      return NextResponse.json({ 
        error: 'Missing required fields: invoiceNumber, clientName, and clientEmail are required' 
      }, { status: 400 });
    }

    // Prepare invoice data
    const invoiceData = {
      invoiceNumber: body.invoiceNumber,
      clientName: body.clientName,
      clientEmails: [body.clientEmail], // Convert single email to array
      clientPhone: body.clientPhone || '',
      clientAddress: body.clientAddress || '',
      invoiceDate: body.invoiceDate || new Date().toISOString(),
      dueDate: body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      totalAmount: parseFloat(body.totalAmount) || 0,
      vatAmount: parseFloat(body.vatAmount) || 0,
      subtotal: parseFloat(body.subtotal) || 0,
      items: body.items || [],
      paymentTerms: body.paymentTerms || '30 days',
      notes: body.notes || ''
    };

    // Send the invoice email
    const result = await sendInvoiceEmail(invoiceData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Invoice email sent successfully',
        totalSent: result.totalSent,
        results: result.results
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to send invoice email'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in send-invoice-email API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
