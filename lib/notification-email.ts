import notificationapi from 'notificationapi-node-server-sdk';

let isInitialized = false;

function ensureInitialized() {
  if (!isInitialized) {
    const clientId = process.env.NOTIFICATIONAPI_CLIENT_ID;
    const clientSecret = process.env.NOTIFICATIONAPI_CLIENT_SECRET;
    
    if (clientId && clientSecret) {
      notificationapi.init(clientId, clientSecret);
      isInitialized = true;
    }
  }
}

export interface EmailRecipient {
  id: string;
  email: string;
}

export interface EmailData {
  subject: string;
  html: string;
  senderName?: string;
  senderEmail?: string;
}

export async function sendEmail(
  recipients: EmailRecipient[],
  emailData: EmailData
) {
  ensureInitialized();
  
  try {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await notificationapi.send({
        type: 'email_notification',
        to: {
          id: recipient.id,
          email: recipient.email
        },
        email: {
          subject: emailData.subject,
          html: emailData.html,
          senderName: emailData.senderName || 'Solflo Team',
          senderEmail: emailData.senderEmail || process.env.EMAIL_FROM || 'admin@solflo.co.za'
        }
      });
      
      results.push({
        recipient: recipient.email,
        success: true,
        result
      });
    }
    
    return {
      success: true,
      results,
      totalSent: results.length
    };
  } catch (error) {
    console.error('Error sending email via NotificationAPI:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendQuotationEmail(quotationData: {
  quoteNumber: string;
  jobNumber: string;
  jobType: string;
  clientName: string;
  clientEmails: string[];
  clientPhone?: string;
  clientAddress?: string;
  quoteDate: string;
  expiryDate: string;
  totalAmount: number;
  vatAmount: number;
  subtotal: number;
  products: Array<{
    name: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    vehiclePlate?: string;
    purchaseType?: string;
  }>;
  notes?: string;
  emailBody?: string;
  emailSubject?: string;
  emailFooter?: string;
  accountNumber?: string;
}) {
  const {
    quoteNumber,
    jobNumber,
    jobType,
    clientName,
    clientEmails,
    clientPhone,
    clientAddress,
    quoteDate,
    expiryDate,
    totalAmount,
    vatAmount,
    subtotal,
    products,
    notes,
    emailBody,
    emailSubject,
    emailFooter,
    accountNumber
  } = quotationData;

  const subject = emailSubject || `Quotation ${quoteNumber} for ${clientName}`;
  const body = emailBody || `Dear ${clientName},\n\nPlease find attached our quotation for your requested services.\n\nBest regards,\nSolflo Team`;
  const footer = emailFooter || "Contact period is 36 months for rental agreements. Rental subject to standard credit checks.";

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Quotation ${quoteNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; background-color: #f4f4f4; }
        .container { background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px; }
        .header { background-color: #0070f3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }
        .quote-details { display: flex; justify-content: space-between; margin-bottom: 30px; flex-wrap: wrap; }
        .client-info, .quote-info { flex: 1; min-width: 250px; margin: 10px; }
        .client-info h3, .quote-info h3 { color: #0070f3; margin-bottom: 15px; border-bottom: 2px solid #0070f3; padding-bottom: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: white; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .items-table th { background-color: #f8f9fa; font-weight: bold; color: #495057; }
        .items-table tr:nth-child(even) { background-color: #f8f9fa; }
        .totals { margin-top: 20px; text-align: right; }
        .totals table { margin-left: auto; width: 300px; border-collapse: collapse; }
        .totals td { padding: 8px 12px; border-bottom: 1px solid #ddd; }
        .totals .total-row { font-weight: bold; font-size: 1.1em; background-color: #0070f3; color: white; }
        .email-body { margin: 30px 0; white-space: pre-line; padding: 15px; background-color: #f9f9f9; border-radius: 8px; }
        .footer-text { margin: 20px 0; padding: 15px; background-color: #f0f8ff; border-left: 4px solid #0070f3; font-style: italic; }
        .notes { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef; padding-top: 20px; }
        .job-type-install { background-color: #4CAF50; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-left: 10px; }
        .job-type-deinstall { background-color: #F44336; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-left: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Solflo Quotation</h1>
          <p>Quote #${quoteNumber} <span class="job-type-${jobType.toLowerCase()}">${jobType.charAt(0).toUpperCase() + jobType.slice(1)}</span></p>
        </div>
        
        <div class="quote-details">
          <div class="client-info">
            <h3>Client Information:</h3>
            <p><strong>${clientName}</strong></p>
            ${clientEmails.length > 0 ? `<p>Email: ${clientEmails.join(', ')}</p>` : ''}
            ${clientPhone ? `<p>Phone: ${clientPhone}</p>` : ''}
            ${clientAddress ? `<p>Address: ${clientAddress}</p>` : ''}
            ${accountNumber ? `<p>Account Number: ${accountNumber}</p>` : ''}
          </div>
          
          <div class="quote-info">
            <h3>Quotation Details:</h3>
            <p><strong>Job Number:</strong> ${jobNumber}</p>
            <p><strong>Quote Date:</strong> ${new Date(quoteDate).toLocaleDateString()}</p>
            <p><strong>Valid Until:</strong> ${new Date(expiryDate).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="email-body">${body}</div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              ${jobType.toLowerCase() === 'deinstall' ? '<th>Vehicle</th>' : ''}
              <th>Type</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(item => `
              <tr>
                <td>${item.name}${item.description ? `<br><small>${item.description}</small>` : ''}</td>
                ${jobType.toLowerCase() === 'deinstall' ? `<td>${item.vehiclePlate || 'N/A'}</td>` : ''}
                <td>${item.purchaseType || 'N/A'}</td>
                <td>${item.quantity}</td>
                <td>R ${item.unitPrice.toFixed(2)}</td>
                <td>R ${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <table>
            <tr><td>Subtotal:</td><td>R ${subtotal.toFixed(2)}</td></tr>
            <tr><td>VAT (15%):</td><td>R ${vatAmount.toFixed(2)}</td></tr>
            <tr class="total-row"><td>Total Amount:</td><td>R ${totalAmount.toFixed(2)}</td></tr>
          </table>
        </div>
        
        <div class="footer-text">${footer}</div>
        
        ${notes ? `<div class="notes"><h4>Additional Notes:</h4><p>${notes}</p></div>` : ''}
        
        <div class="footer">
          <p>Thank you for choosing Solflo!</p>
          <p>For any queries regarding this quotation, please contact us at ${process.env.EMAIL_FROM || 'admin@solflo.co.za'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const recipients: EmailRecipient[] = clientEmails.map((email, index) => ({
    id: `client_${index}_${Date.now()}`,
    email
  }));

  return await sendEmail(recipients, {
    subject,
    html: emailHTML,
    senderName: 'Solflo Quotations',
    senderEmail: process.env.EMAIL_FROM
  });
}

export async function sendInvoiceEmail(invoiceData: {
  invoiceNumber: string;
  clientName: string;
  clientEmails: string[];
  clientPhone?: string;
  clientAddress?: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  vatAmount: number;
  subtotal: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    vehicleRegistration?: string;
  }>;
  paymentTerms?: string;
  notes?: string;
}) {
  const {
    invoiceNumber,
    clientName,
    clientEmails,
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

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; background-color: #f4f4f4; }
        .container { background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin: 20px; }
        .header { background-color: #0070f3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -30px -30px 30px -30px; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; flex-wrap: wrap; }
        .client-info, .invoice-info { flex: 1; min-width: 250px; margin: 10px; }
        .client-info h3, .invoice-info h3 { color: #0070f3; margin-bottom: 15px; border-bottom: 2px solid #0070f3; padding-bottom: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: white; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .items-table th { background-color: #f8f9fa; font-weight: bold; color: #495057; }
        .items-table tr:nth-child(even) { background-color: #f8f9fa; }
        .totals { margin-top: 20px; text-align: right; }
        .totals table { margin-left: auto; width: 300px; border-collapse: collapse; }
        .totals td { padding: 8px 12px; border-bottom: 1px solid #ddd; }
        .totals .total-row { font-weight: bold; font-size: 1.1em; background-color: #0070f3; color: white; }
        .payment-info { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .notes { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef; padding-top: 20px; }
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
            ${clientEmails.length > 0 ? `<p>Email: ${clientEmails.join(', ')}</p>` : ''}
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
            <tr><td>Subtotal:</td><td>R ${subtotal.toFixed(2)}</td></tr>
            <tr><td>VAT (15%):</td><td>R ${vatAmount.toFixed(2)}</td></tr>
            <tr class="total-row"><td>Total Amount:</td><td>R ${totalAmount.toFixed(2)}</td></tr>
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
        
        ${notes ? `<div class="notes"><h4>Notes:</h4><p>${notes}</p></div>` : ''}
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>For any queries regarding this invoice, please contact us at ${process.env.EMAIL_FROM || 'admin@solflo.co.za'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const recipients: EmailRecipient[] = clientEmails.map((email, index) => ({
    id: `invoice_${index}_${Date.now()}`,
    email
  }));

  return await sendEmail(recipients, {
    subject: `Invoice ${invoiceNumber} - ${clientName}`,
    html: emailHTML,
    senderName: 'Solflo Invoicing',
    senderEmail: process.env.EMAIL_FROM
  });
}