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
    const recipientEmailsRaw = String(formData.get('recipientEmails') || recipientEmail).trim();
    const subject = String(formData.get('subject') || '').trim();
    const html = String(formData.get('html') || '').trim();
    const senderName = String(formData.get('senderName') || 'Solflo').trim();
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

    const recipientEmails = recipientEmailsRaw
      .split(/[;,]/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (
      recipientEmails.length === 0 ||
      recipientEmails.some((email) => !emailPattern.test(email))
    ) {
      return NextResponse.json(
        { error: 'At least one valid recipient email is required' },
        { status: 400 },
      );
    }

    const attachmentBuffer = Buffer.from(await attachment.arrayBuffer());
    const attachmentContent = attachmentBuffer.toString('base64');

    const result = await sendEmail(
      recipientEmails.map((email) => ({
        id: email === user.email ? user.id : `${user.id}:${email}`,
        email,
      })),
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
      email: recipientEmails.join(', '),
      provider: 'Pingram',
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
