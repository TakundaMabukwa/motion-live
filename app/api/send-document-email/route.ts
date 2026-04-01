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

    const body = await request.json();
    const subject = String(body?.subject || '').trim();
    const html = String(body?.html || '').trim();
    const attachment = body?.attachment;

    if (!subject || !html || !attachment?.filename || !attachment?.content) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, html, attachment.filename, attachment.content' },
        { status: 400 },
      );
    }

    const result = await sendEmail(
      [
        {
          id: user.id,
          email: user.email,
        },
      ],
      {
        subject,
        html,
        senderName: 'Solflo Reports',
        senderEmail: process.env.EMAIL_FROM,
        attachments: [
          {
            filename: String(attachment.filename),
            content: String(attachment.content),
            contentType: attachment.contentType
              ? String(attachment.contentType)
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
      email: user.email,
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
