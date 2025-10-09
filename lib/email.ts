import nodemailer from 'nodemailer';

// Solflo SMTP configuration - use connection URL to satisfy nodemailer typings
const smtpUser = encodeURIComponent(process.env.ADMIN_EMAIL || process.env.SOLFLO_EMAIL || 'admin@solflo.co.za');
const smtpPass = encodeURIComponent(process.env.ADMIN_EMAIL_PASSWORD || process.env.SOLFLO_PASSWORD || '8n~YFq^z6#|e');
const smtpHost = process.env.SOLFO_SMTP_HOST || 'mail.solflo.co.za';
const smtpPort = process.env.SOLFO_SMTP_PORT || '587';
const smtpUrl = `smtp://${smtpUser}:${smtpPass}@${smtpHost}:${smtpPort}`;
const transporter = nodemailer.createTransport(smtpUrl);

export interface InvoiceData {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  vatAmount: number;
  subtotal: number;
  items: InvoiceItem[];
  paymentTerms?: string;
  notes?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  vehicleRegistration?: string;
}

export async function sendInvoiceEmail(invoiceData: InvoiceData) {
  try {
    const { 
      invoiceNumber, 
      clientName, 
      clientEmail, 
      clientPhone, 
      clientAddress,
      invoiceDate, 
      dueDate, 
      totalAmount, 
      vatAmount, 
      subtotal, 
      items,
      paymentTerms = '30 days',
      notes 
    } = invoiceData;

    // Generate HTML email template for invoice
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
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
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            flex-wrap: wrap;
          }
          .client-info, .invoice-info {
            flex: 1;
            min-width: 250px;
            margin: 10px;
          }
          .client-info h3, .invoice-info h3 {
            color: #0070f3;
            margin-bottom: 15px;
            border-bottom: 2px solid #0070f3;
            padding-bottom: 5px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: white;
          }
          .items-table th, .items-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          .items-table th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #495057;
          }
          .items-table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .totals {
            margin-top: 20px;
            text-align: right;
          }
          .totals table {
            margin-left: auto;
            width: 300px;
            border-collapse: collapse;
          }
          .totals td {
            padding: 8px 12px;
            border-bottom: 1px solid #ddd;
          }
          .totals .total-row {
            font-weight: bold;
            font-size: 1.1em;
            background-color: #0070f3;
            color: white;
          }
          .payment-info {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
          }
          .notes {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
          }
          .button {
            display: inline-block;
            background-color: #28a745;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background-color: #218838;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Solflo Invoice</h1>
            <p>Invoice #${invoiceNumber}</p>
          </div>
          
          <div class="invoice-details">
            <div class="client-info">
              <h3>Bill To:</h3>
              <p><strong>${clientName}</strong></p>
              ${clientEmail ? `<p>Email: ${clientEmail}</p>` : ''}
              ${clientPhone ? `<p>Phone: ${clientPhone}</p>` : ''}
              ${clientAddress ? `<p>Address: ${clientAddress}</p>` : ''}
            </div>
            
            <div class="invoice-info">
              <h3>Invoice Details:</h3>
              <p><strong>Invoice Date:</strong> ${new Date(invoiceDate).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
              <p><strong>Payment Terms:</strong> ${paymentTerms}</p>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Vehicle</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.vehicleRegistration || 'N/A'}</td>
                  <td>${item.quantity}</td>
                  <td>R ${item.unitPrice.toFixed(2)}</td>
                  <td>R ${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td>R ${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>VAT (15%):</td>
                <td>R ${vatAmount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Amount:</td>
                <td>R ${totalAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div class="payment-info">
            <h3>Payment Information</h3>
            <p><strong>Bank Details:</strong></p>
            <p>Bank: Standard Bank<br>
            Account Name: Solflo (Pty) Ltd<br>
            Account Number: [Account Number]<br>
            Branch Code: [Branch Code]</p>
            <p><strong>Reference:</strong> Invoice ${invoiceNumber}</p>
          </div>
          
          ${notes ? `
            <div class="notes">
              <h4>Notes:</h4>
              <p>${notes}</p>
            </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="mailto:${process.env.ADMIN_EMAIL || 'admin@solflo.co.za'}?subject=Payment Confirmation - Invoice ${invoiceNumber}" class="button">
              Confirm Payment
            </a>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>For any queries regarding this invoice, please contact us at ${process.env.ADMIN_EMAIL || 'admin@solflo.co.za'}</p>
            <p>This is an automated invoice from the Solflo system.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Solflo Invoicing" <${process.env.ADMIN_EMAIL || 'admin@solflo.co.za'}>`,
      to: clientEmail,
      cc: process.env.ADMIN_EMAIL || 'admin@solflo.co.za', // Copy to admin
      subject: `Invoice ${invoiceNumber} - ${clientName}`,
      html: emailHTML,
    };

    // Add timeout wrapper to prevent hanging
    const sendWithTimeout = async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Email sending timeout'));
        }, 10000); // 10 second timeout for invoice emails

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
  interface SendResult { messageId?: string }
  const res = result as SendResult | undefined;
  console.log('Invoice email sent successfully:', res?.messageId);
  return { success: true, messageId: res?.messageId };
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

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
      from: `"Solflo System Access" <${process.env.ADMIN_EMAIL || 'admin@solflo.co.za'}>`,
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
  // Nodemailer sendMail result includes useful diagnostic fields like
  // messageId, accepted, rejected and envelope which help determine
  // whether the SMTP server accepted the recipient address.
  const info = result as unknown as {
    messageId?: string;
    accepted?: string[];
    rejected?: string[];
    envelope?: Record<string, unknown>;
    response?: string;
  };

  console.log('Email sent successfully via Solflo SMTP:', info.messageId, 'accepted:', info.accepted, 'rejected:', info.rejected, 'envelope:', info.envelope, 'response:', info.response);
  return { success: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, envelope: info.envelope };
  } catch (error) {
    console.error('Error sending email via Solflo SMTP:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendExistingAccountNotification(opts: { email: string; systemName: string; systemUrl: string }) {
  try {
    const { email, systemName, systemUrl } = opts;
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Notice</title>
        <style>body{font-family:Arial, sans-serif;color:#333}</style>
      </head>
      <body>
        <h2>Your ${systemName} account</h2>
        <p>Hello,</p>
        <p>There is already an account registered with this email address (${email}) on the ${systemName} system.</p>
        <p>If you don&apos;t remember your password, you can reset it here: <a href="${systemUrl}/forgot-password">Reset your password</a></p>
        <p>If you believe this is an error, contact your system administrator.</p>
        <p>This is an automated message from ${systemName}.</p>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${process.env.ADMIN_EMAIL ? 'Solflo System' : 'Solflo'}" <${process.env.ADMIN_EMAIL || 'admin@solflo.co.za'}>`,
      to: email,
      subject: `${systemName} account already exists`,
      html: emailHTML,
    };

    const sendWithTimeout = async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Email sending timeout')), 7000);
        transporter.sendMail(mailOptions).then((r) => { clearTimeout(timeout); resolve(r); }).catch((e) => { clearTimeout(timeout); reject(e); });
      });
    };

    const result = await sendWithTimeout();
    const info = result as unknown as { messageId?: string; accepted?: string[]; rejected?: string[]; envelope?: Record<string, unknown>; response?: string };
    console.log('Existing-account email sent:', info.messageId, info.accepted, info.rejected);
    return { success: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, envelope: info.envelope };
  } catch (error) {
    console.error('Error sending existing-account email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export default transporter;
