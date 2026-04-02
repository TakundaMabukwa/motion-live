import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/notification-email';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json(
        { error: 'Unable to resolve logged-in user email' },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const recipientEmail = String(formData.get('recipientEmail') || '').trim();
    const subject = String(formData.get('subject') || '').trim();
    const html = String(formData.get('html') || '').trim();
    const senderName = String(formData.get('senderName') || 'Solflo Delivery').trim();
    const attachment = formData.get('attachment');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !subject ||
      !html ||
      !(attachment instanceof File) ||
      !attachment.name
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, html, attachment file' },
        { status: 400 },
      );
    }

    if (!recipientEmail || !emailPattern.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'A valid recipientEmail is required' },
        { status: 400 },
      );
    }

    const attachmentBuffer = Buffer.from(await attachment.arrayBuffer());
    const attachmentContent = attachmentBuffer.toString('base64');

    const result = await sendEmail(
      [
        {
          id: recipientEmail === user.email ? user.id : `${user.id}:${recipientEmail}`,
          email: recipientEmail,
        },
      ],
      {
        subject,
        html,
        senderName,
        senderEmail: process.env.EMAIL_FROM,
        attachments: [
          {
            filename: attachment.name,
            content: attachmentContent,
            contentType: attachment.type
              ? String(attachment.type)
              : undefined,
          },
        ],
      },
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send report email' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      email: recipientEmail,
      provider: 'NotificationAPI',
      totalSent: result.totalSent || 0,
    });
  } catch (error) {
    console.error('send-document-email error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
