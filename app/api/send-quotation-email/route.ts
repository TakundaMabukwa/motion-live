import { NextRequest, NextResponse } from 'next/server';
import { sendQuotationEmail } from '@/lib/notification-email';

export async function POST(request: NextRequest) {
  try {
    const quotationData = await request.json();
    
    // Validate required fields
    if (!quotationData.clientEmails || quotationData.clientEmails.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No email recipients provided' },
        { status: 400 }
      );
    }

    // Send the quotation email
    const result = await sendQuotationEmail(quotationData);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        totalSent: result.totalSent,
        results: result.results
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in send-quotation-email API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}