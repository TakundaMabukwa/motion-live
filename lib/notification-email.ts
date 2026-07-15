import { Pingram } from 'pingram';

let pingramClient: Pingram | null = null;

function getPingramClient() {
  const apiKey = process.env.PINGRAM_API_KEY;
  const baseUrl = process.env.PINGRAM_BASE_URL || 'https://api.pingram.io';

  if (!apiKey) {
    throw new Error('Pingram is not configured. Missing PINGRAM_API_KEY.');
  }

  if (!pingramClient) {
    pingramClient = new Pingram({
      apiKey,
      baseUrl,
    });
  }

  return pingramClient;
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
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export async function sendEmail(
  recipients: EmailRecipient[],
  emailData: EmailData,
) {
  const pingram = getPingramClient();

  try {
    const results = [];

    for (const recipient of recipients) {
      const result = await pingram.send({
        type: 'accounts',
        to: {
          id: recipient.id,
          email: recipient.email,
        },
        email: {
          subject: emailData.subject,
          html: emailData.html,
          senderName: emailData.senderName || 'Solflo Team',
          senderEmail: emailData.senderEmail || process.env.EMAIL_FROM || 'admin@solflo.co.za',
        },
        options: emailData.attachments?.length
          ? {
              email: {
                attachments: emailData.attachments,
              },
            }
          : undefined,
      });

      results.push({
        recipient: recipient.email,
        success: true,
        result,
      });
    }

    return {
      success: true,
      results,
      totalSent: results.length,
    };
  } catch (error) {
    console.error('Error sending email via Pingram:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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

export async function sendTechnicianAssignmentEmail(assignmentData: {
  technicianName: string;
  technicianEmails: string[];
  jobNumber: string;
  jobType: string;
  jobSubType?: string;
  jobDescription?: string;
  priority?: string;
  orderNumber?: string;
  customerName?: string;
  contactPerson?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColour?: string;
  vinNumber?: string;
  odometer?: string;
  jobDate?: string;
  startTime?: string;
  endTime?: string;
  jobLocation?: string;
  dueDate?: string;
  estimatedDuration?: string;
  purchaseType?: string;
  isReassignment?: boolean;
  quotationProducts?: Array<{
    name?: string;
    description?: string;
    quantity?: number;
    type?: string;
    category?: string;
  }>;
  partsRequired?: Array<{
    description?: string;
    code?: string;
    quantity?: number;
    serial_number?: string;
    ip_address?: string;
  }>;
}) {
  const {
    technicianName,
    technicianEmails,
    jobNumber,
    jobType,
    jobSubType,
    jobDescription,
    priority,
    orderNumber,
    customerName,
    contactPerson,
    customerPhone,
    customerEmail,
    customerAddress,
    vehicleRegistration,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleColour,
    vinNumber,
    odometer,
    jobDate,
    startTime,
    endTime,
    jobLocation,
    dueDate,
    estimatedDuration,
    purchaseType,
    isReassignment,
    quotationProducts,
    partsRequired,
  } = assignmentData;

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  const formattedDate = jobDate
    ? new Date(jobDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Not set';

  const extractTime = (val: unknown): string => {
    if (!val) return 'Not set';
    const match = String(val).match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : 'Not set';
  };

  const formattedTime = extractTime(startTime);

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Not set';

  const jobTypeDisplay = jobType === 'installation' ? 'Installation' : jobType === 'de_installation' || jobType === 'de-installation' ? 'De-Installation' : jobType === 'repair' ? 'Repair' : jobType || 'N/A';

  const priorityColor = priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#22c55e';

  const partsHtml = partsRequired && partsRequired.length > 0 ? `
    <div style="margin-top: 24px;">
      <h3 style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">Parts Required</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #475569;">Description</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #475569;">Code</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: 600; color: #475569;">Qty</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #475569;">Serial #</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: #475569;">IP Address</th>
          </tr>
        </thead>
        <tbody>
          ${partsRequired.map((part, i) => `
            <tr style="border-bottom: 1px solid #f1f5f9; ${i % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
              <td style="padding: 10px 12px; color: #334155;">${escapeHtml(part.description || 'N/A')}</td>
              <td style="padding: 10px 12px; color: #64748b; font-family: monospace; font-size: 12px;">${escapeHtml(part.code || 'N/A')}</td>
              <td style="padding: 10px 12px; text-align: center; color: #334155;">${part.quantity || 1}</td>
              <td style="padding: 10px 12px; color: #64748b; font-family: monospace; font-size: 12px;">${escapeHtml(part.serial_number || 'N/A')}</td>
              <td style="padding: 10px 12px; color: #64748b; font-family: monospace; font-size: 12px;">${escapeHtml(part.ip_address || 'N/A')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const hasProducts = Array.isArray(quotationProducts) && quotationProducts.length > 0;
  const productsHtml = hasProducts ? `
    <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.03em;">Products / Equipment</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb;">
          <th style="padding: 8px 0; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Item</th>
          <th style="padding: 8px 0; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Type</th>
          <th style="padding: 8px 0; text-align: center; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Qty</th>
        </tr>
      </thead>
      <tbody>
        ${quotationProducts.map((p, i) => `
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 8px 0; font-size: 14px; color: #111827;">${escapeHtml(p.name || p.description || 'N/A')}</td>
            <td style="padding: 8px 0; font-size: 13px; color: #6b7280;">${escapeHtml(p.type || p.category || '')}</td>
            <td style="padding: 8px 0; text-align: center; font-size: 14px; color: #111827;">${p.quantity || 1}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '';

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Job Assignment - ${escapeHtml(jobNumber)}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; padding: 32px 24px;">
        <!-- Header -->
        <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #111827;">${isReassignment ? 'Job Reassigned' : 'New Job Scheduled'}</h1>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #374151; line-height: 1.6;">
          Hello ${escapeHtml(technicianName)}, you have been ${isReassignment ? 'reassigned' : 'assigned'} a new service request. Please review the details below to prepare for your shift.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px 0;">

        <!-- Job Number & Client Name -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Job Number</p>
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #111827;">#${escapeHtml(jobNumber)}</p>
            </td>
            <td style="width: 50%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Client Name</p>
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${escapeHtml(customerName || 'N/A')}</p>
            </td>
          </tr>
        </table>

        <!-- Date & Start Time -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Date</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">📅 ${formattedDate}</p>
            </td>
            <td style="width: 50%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Start Time</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">🕐 ${formattedTime}</p>
            </td>
          </tr>
        </table>

        <!-- Vehicle Details -->
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.03em;">🚗 Vehicle Details</p>
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          ${vehicleRegistration || vehicleMake || vehicleModel || vehicleYear ? `
          <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 600; color: #111827;">
            ${escapeHtml(vehicleYear || '')} ${escapeHtml(vehicleMake || '')} ${escapeHtml(vehicleModel || '')}${vehicleRegistration ? ` - ${escapeHtml(vehicleRegistration)}` : ''}
          </p>
          ` : '<p style="margin: 0 0 6px 0; font-size: 14px; color: #6b7280;">No vehicle information provided</p>'}
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              ${vehicleColour ? `
              <td style="padding: 2px 0; width: 50%;">
                <span style="font-size: 12px; color: #6b7280;">Colour: </span>
                <span style="font-size: 13px; color: #111827; font-weight: 500;">${escapeHtml(vehicleColour)}</span>
              </td>
              ` : ''}
              ${vinNumber ? `
              <td style="padding: 2px 0; width: ${vehicleColour ? '50' : '100'}%;">
                <span style="font-size: 12px; color: #6b7280;">VIN: </span>
                <span style="font-size: 13px; color: #111827; font-weight: 500;">${escapeHtml(vinNumber)}</span>
              </td>
              ` : ''}
            </tr>
            <tr>
              ${odometer ? `
              <td style="padding: 2px 0; width: 50%;">
                <span style="font-size: 12px; color: #6b7280;">Odometer: </span>
                <span style="font-size: 13px; color: #111827; font-weight: 500;">${escapeHtml(odometer)}</span>
              </td>
              ` : ''}
            </tr>
          </table>
        </div>

        <!-- Job Type, Priority & Order -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 33%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Job Type</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(jobTypeDisplay)}</p>
            </td>
            <td style="width: 33%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Priority</p>
              <p style="margin: 0; font-size: 15px; color: #111827; font-weight: 600;">${priority ? escapeHtml(priority.charAt(0).toUpperCase() + priority.slice(1)) : 'N/A'}</p>
            </td>
            ${orderNumber ? `
            <td style="width: 34%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Order #</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(orderNumber)}</p>
            </td>
            ` : ''}
          </tr>
        </table>

        ${purchaseType || jobSubType ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            ${purchaseType ? `
            <td style="width: 50%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Cash Type</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(purchaseType === 'purchase' ? 'Cash' : purchaseType === 'rental' ? 'Rental' : purchaseType)}</p>
            </td>
            ` : ''}
            ${jobSubType ? `
            <td style="width: ${purchaseType ? '50' : '100'}%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Sub Category</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(jobSubType)}</p>
            </td>
            ` : ''}
          </tr>
        </table>
        ` : ''}

        ${dueDate ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 50%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Due Date</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${formattedDueDate}</p>
            </td>
            ${estimatedDuration ? `
            <td style="width: 50%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Est. Duration</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(String(estimatedDuration))} hours</p>
            </td>
            ` : ''}
          </tr>
        </table>
        ` : ''}

        ${!dueDate && estimatedDuration ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Est. Duration</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(String(estimatedDuration))} hours</p>
            </td>
          </tr>
        </table>
        ` : ''}

        ${jobLocation ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Location</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">📍 ${escapeHtml(jobLocation)}</p>
            </td>
          </tr>
        </table>
        ` : ''}

        ${customerAddress ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Customer Address</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(customerAddress)}</p>
            </td>
          </tr>
        </table>
        ` : ''}

        ${contactPerson || customerPhone || customerEmail ? `
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.03em;">Contact Information</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            ${contactPerson ? `
            <td style="width: 50%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Contact Person</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(contactPerson)}</p>
            </td>
            ` : ''}
            ${customerPhone ? `
            <td style="width: ${contactPerson ? '50' : '100'}%; padding: 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Phone</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(customerPhone)}</p>
            </td>
            ` : ''}
          </tr>
          ${customerEmail ? `
          <tr>
            <td style="padding: 8px 0 0 0; vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Email</p>
              <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(customerEmail)}</p>
            </td>
          </tr>
          ` : ''}
        </table>
        ` : ''}

        ${jobDescription ? `
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.03em;">Job Description</p>
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">${escapeHtml(jobDescription)}</p>
        </div>
        ` : ''}

        ${productsHtml}
        ${partsHtml}

        <!-- Footer -->
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px 0;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by Solflo Workforce Management
        </p>
      </div>
    </body>
    </html>
  `;

  const recipients: EmailRecipient[] = technicianEmails.map((email, index) => ({
    id: `tech_assign_${index}_${Date.now()}`,
    email,
  }));

  const action = isReassignment ? 'Reassigned' : 'Assigned';

  return await sendEmail(recipients, {
    subject: `Job ${action} - #${jobNumber} (${jobTypeDisplay})`,
    html: emailHTML,
    senderName: 'Solflo Workforce',
    senderEmail: process.env.EMAIL_FROM,
  });
}
