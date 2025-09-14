import nodemailer from 'nodemailer';

// Brevo (Sendinblue) SMTP configuration
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.BREVO_EMAIL || '970244001@smtp-brevo.com', // Your Brevo login email
    pass: process.env.BREVO_SMTP_KEY || 'rTMhALQas6cKtW0N', // Your Brevo SMTP key
  },
  connectionTimeout: 5000, // 5 seconds
  greetingTimeout: 5000, // 5 seconds
  socketTimeout: 5000, // 5 seconds
  pool: false, // Disable connection pooling for faster cleanup
});

export interface UserCredentials {
  email: string;
  password: string;
  role: string;
  systemName: string;
  systemUrl: string;
}

export async function sendUserCredentials(credentials: UserCredentials) {
  try {
    const { email, password, role, systemName, systemUrl } = credentials;

    // Generate HTML email template
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Account Access</title>
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
            padding: 20px;
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
            margin: -20px -20px 20px -20px;
          }
          .credentials-box {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
          }
          .credential-item {
            margin: 10px 0;
            padding: 8px;
            background-color: white;
            border-radius: 4px;
            border-left: 4px solid #0070f3;
          }
          .label {
            font-weight: bold;
            color: #495057;
            display: inline-block;
            width: 100px;
          }
          .value {
            color: #212529;
            font-family: monospace;
            background-color: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
          }
          .button {
            display: inline-block;
            background-color: #0070f3;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background-color: #0056b3;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 12px;
            border-radius: 6px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Solflo</h1>
            <p>Your account has been created successfully</p>
          </div>
          
          <p>Hello,</p>
          <p>Your account has been created and you now have access to the <strong>Solflo</strong> system. Below are your login credentials:</p>
          
          <div class="credentials-box">
            <h3 style="margin-top: 0; color: #0070f3;">Login Credentials</h3>
            <div class="credential-item">
              <span class="label">Email:</span>
              <span class="value">${email}</span>
            </div>
            <div class="credential-item">
              <span class="label">Password:</span>
              <span class="value">${password}</span>
            </div>
            <div class="credential-item">
              <span class="label">Role:</span>
              <span class="value">${role.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div class="credential-item">
              <span class="label">System:</span>
              <span class="value">${systemName} (Solflo)</span>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${systemUrl}" class="button">Access System</a>
          </div>
          
          <div class="warning">
            <strong>Security Notice:</strong> Please change your password after your first login for security purposes.
          </div>
          
          <p>If you have any questions or need assistance, please contact your system administrator.</p>
          
          <div class="footer">
            <p>This is an automated message from the Solflo system.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: '"Solflo System Access" <mabukwa25@gmail.com>', // Use your verified Gmail
      to: email,
      subject: `Your Solflo Account Access - ${systemName}`,
      html: emailHTML,
    };

    // Add timeout wrapper to prevent hanging
    const sendWithTimeout = async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Email sending timeout'));
        }, 7000); // 7 second timeout

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
    console.log('Email sent successfully via Brevo:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export default transporter;
