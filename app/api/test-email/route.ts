import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import transporter from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const testEmail = body.email || 'mabukwa25@gmail.com';

    // Simple test email HTML
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Solflo Email Test</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 20px;
          }
          .header {
            background-color: #0070f3;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 30px -30px;
          }
          .content {
            text-align: center;
            padding: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Solflo Email Test</h1>
            <p>Testing Email Service</p>
          </div>
          
          <div class="content">
            <h2>Hello World! 🌍</h2>
            <p>This is a test email from the Solflo system.</p>
            <p><strong>Email Service Status:</strong> ✅ Working</p>
            <p><strong>SMTP Server:</strong> mail.solflo.co.za</p>
            <p><strong>Sent From:</strong> admin@solflo.co.za</p>
            <p><strong>Sent At:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="footer">
            <p>This is a test email from the Solflo email service.</p>
            <p>If you received this email, the email service is working correctly!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: '"Solflo Test" <admin@solflo.co.za>',
      to: testEmail,
      subject: 'Hello World - Solflo Email Test',
      html: emailHTML,
    };

    // Add timeout wrapper to prevent hanging
    const sendWithTimeout = async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Email sending timeout'));
        }, 10000); // 10 second timeout

        transporter.sendMail(mailOptions)
          .then((result) => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      });
    };

    const result = await sendWithTimeout();
    console.log('Test email sent successfully:', result.messageId);
    
    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}`,
      messageId: result.messageId,
      details: {
        from: 'admin@solflo.co.za',
        to: testEmail,
        subject: 'Hello World - Solflo Email Test',
        sentAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ 
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
