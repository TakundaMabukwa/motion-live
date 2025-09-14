// Simple email test script for Digital Ocean server
const nodemailer = require('nodemailer');

// Brevo (Sendinblue) SMTP configuration
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_EMAIL || '970244001@smtp-brevo.com',
    pass: process.env.BREVO_SMTP_KEY || 'rTMhALQas6cKtW0N',
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
  pool: false,
});

async function testEmail() {
  try {
    console.log('Testing email connection...');
    
    const mailOptions = {
      from: '"Solflo System Access" <mabukwa25@gmail.com>',
      to: 'mabukwa25@gmail.com', // Test email
      subject: 'Test Email from Digital Ocean',
      html: '<h1>Test Email</h1><p>This is a test email from your Digital Ocean server.</p>',
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
  } catch (error) {
    console.error('❌ Email failed:', error.message);
  }
}

testEmail();
