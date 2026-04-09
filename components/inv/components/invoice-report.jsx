"use client";

import React, { useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, Mail } from "lucide-react";
import { toast } from "sonner";

const COMPANY_INFO = {
  name: "Soltrack (PTY) LTD",
  regNo: "2018/095975/07",
  vatNo: "4580161802",
  headOffice: [
    "8 Viscount Road",
    "Viscount office park, Block C unit 4 & 5",
    "Bedfordview, 2008",
  ],
  postal: ["P.O Box 95603", "Grant Park 2051"],
  contact: ["Phone: 011 824 0066", "Email: accounts@soltrack.co.za", "Website: www.soltrack.co.za"],
  banking: ["Nedbank Northrand", "Code - 146905", "A/C No. - 1469109069"],
};

const VAT_RATE = 0.15;

const toNumber = (value) => {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
};

const parseFormattedAmount = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/R/gi, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d{2}$)/, ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const formatAmount = (amount) =>
  toNumber(amount).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatTotalAmount = (amount) => `R ${formatAmount(amount)}`;

const formatDate = (value) => {
  if (!value) {
    return new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getBillingInvoiceDate = (billingMonth) => {
  if (!billingMonth) {
    return new Date().toISOString();
  }

  const normalized = `${String(billingMonth).slice(0, 7)}-01T00:00:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  const year = parsed.getFullYear();
  const month = parsed.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const invoiceDay = Math.min(30, lastDay);
  return new Date(year, month, invoiceDay).toISOString();
};

const EPS_SPECIAL_SOURCE_ACCOUNT = 'EPSC-0001';

const getRealInvoiceNumber = (...values) => {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized && normalized.toUpperCase() !== "PENDING") {
      return normalized;
    }
  }
  return "";
};
const normalizeStoredBulkInvoiceForView = (invoice) => {
  if (!invoice) return null;
  const lineItems = Array.isArray(invoice?.line_items) ? invoice.line_items : [];
  return {
    ...invoice,
    invoice_items: lineItems,
    invoiceItems: lineItems,
  };
};

const buildLockedInvoiceSnapshot = (storedInvoice, liveInvoiceData) => ({
  ...storedInvoice,
  account_number: storedInvoice?.account_number || liveInvoiceData?.account_number || null,
  source_account_number:
    storedInvoice?.source_account_number || liveInvoiceData?.source_account_number || null,
  billing_group: storedInvoice?.billing_group || liveInvoiceData?.billing_group || null,
  company_name: storedInvoice?.company_name || liveInvoiceData?.company_name || null,
  invoice_items: storedInvoice?.invoice_items || [],
  invoiceItems: storedInvoice?.invoiceItems || [],
});

const mergeLiveInvoiceWithStoredBulkInvoice = (liveInvoiceData, storedBulkInvoice) => {
  const normalizedStored = normalizeStoredBulkInvoiceForView(storedBulkInvoice);
  if (!normalizedStored) {
    return liveInvoiceData || null;
  }

  if (normalizedStored.invoice_locked) {
    return buildLockedInvoiceSnapshot(normalizedStored, liveInvoiceData || null);
  }

  return {
    ...(liveInvoiceData || {}),
    id: normalizedStored.id || liveInvoiceData?.id,
    invoice_number: normalizedStored.invoice_number || liveInvoiceData?.invoice_number,
    invoice_date: normalizedStored.invoice_date || liveInvoiceData?.invoice_date,
    billing_month: normalizedStored.billing_month || liveInvoiceData?.billing_month,
    notes: normalizedStored.notes ?? liveInvoiceData?.notes ?? liveInvoiceData?.note ?? null,
    customer_vat_number: normalizedStored.customer_vat_number || liveInvoiceData?.customer_vat_number || null,
    company_registration_number: normalizedStored.company_registration_number || liveInvoiceData?.company_registration_number || null,
    client_address: normalizedStored.client_address || liveInvoiceData?.client_address || null,
    invoice_locked: Boolean(normalizedStored.invoice_locked),
    invoice_locked_by: normalizedStored.invoice_locked_by || null,
    invoice_locked_at: normalizedStored.invoice_locked_at || null,
    invoice_locked_by_email: normalizedStored.invoice_locked_by_email || null,
  };
};


const buildClientAddress = (customerInfo, fallbackAddress = "") => {
  const addressParts = [
    customerInfo?.physical_address_1,
    customerInfo?.physical_address_2,
    customerInfo?.physical_address_3,
    customerInfo?.physical_area,
    customerInfo?.physical_province,
    customerInfo?.physical_code,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (addressParts.length > 0) {
    return addressParts.join("\n");
  }

  return String(fallbackAddress || "").trim();
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildInvoiceEmailHtml = ({
  subject,
  clientName,
  accountNumber,
  attachmentName,
  bodyText,
}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(subject)}</title>
    </head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;color:#ffffff;">
                  <div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;">Solflo</div>
                  <div style="margin-top:10px;font-size:28px;font-weight:700;line-height:1.2;">Invoice Ready</div>
                  <div style="margin-top:8px;font-size:15px;opacity:0.92;">Your invoice PDF is attached and ready to use.</div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;">
                  <div style="font-size:16px;line-height:1.7;color:#111827;white-space:pre-line;">${escapeHtml(bodyText || "Hi,\n\nPlease find the attached invoice.\n\nKind regards")}</div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-collapse:collapse;">
                    <tr>
                      <td style="padding:12px 0;border-top:1px solid #e5e7eb;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Client</td>
                      <td style="padding:12px 0;border-top:1px solid #e5e7eb;font-size:15px;color:#111827;" align="right">${escapeHtml(clientName || "-")}</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0;border-top:1px solid #e5e7eb;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Account</td>
                      <td style="padding:12px 0;border-top:1px solid #e5e7eb;font-size:15px;color:#111827;" align="right">${escapeHtml(accountNumber || "-")}</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0;border-top:1px solid #e5e7eb;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Attachment</td>
                      <td style="padding:12px 0;border-top:1px solid #e5e7eb;font-size:15px;color:#111827;" align="right">${escapeHtml(attachmentName || "-")}</td>
                    </tr>
                  </table>
                  <div style="margin-top:24px;padding:18px 20px;border:1px solid #dcfce7;border-radius:14px;background:#f0fdf4;color:#166534;font-size:14px;line-height:1.6;">
                    The invoice PDF is attached to this email. Open the attachment to view, save, or forward it.
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6;">
                  Solflo automated invoice delivery
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;
const buildInvoiceStyles = () => `
  :root {
    --invoice-text: #111111;
    --invoice-border: #404040;
    --invoice-line: #b7b7b7;
    --invoice-fill: #d8d8d8;
    --invoice-bg: #ffffff;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: var(--invoice-bg);
    color: var(--invoice-text);
    font-family: Arial, Helvetica, sans-serif;
  }

  body {
    padding: 24px;
  }

  .invoice-page {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    background: #fff;
  }

  .invoice-sheet {
    min-height: 1122px;
  }

  .invoice-top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: 20px;
  }

  .invoice-logo {
    width: 220px;
    height: auto;
    object-fit: contain;
  }

  .invoice-company {
    text-align: center;
    font-size: 16px;
    line-height: 1.3;
  }

  .invoice-company strong {
    display: block;
    font-size: 20px;
    margin-bottom: 8px;
  }

  .invoice-rule {
    border-top: 2px solid var(--invoice-line);
    margin: 12px 0 8px;
  }

  .invoice-title {
    text-align: center;
    font-weight: 700;
    font-size: 20px;
    margin: 8px 0 36px;
    text-transform: uppercase;
  }

  .invoice-party-row {
    display: grid;
    grid-template-columns: 1.45fr 0.85fr;
    gap: 24px;
    min-height: 150px;
    margin-bottom: 26px;
  }

  .invoice-client-name,
  .invoice-meta-label,
  .invoice-meta-value {
    font-weight: 700;
    font-size: 18px;
  }

  .invoice-client-block {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .invoice-client-address {
    white-space: pre-line;
    font-size: 15px;
    line-height: 1.5;
  }

  .invoice-meta {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 18px 14px;
    align-content: start;
  }

  .invoice-table,
  .invoice-summary-table,
  .invoice-footer-table,
  .invoice-totals-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .invoice-summary-table {
    margin-bottom: 16px;
  }

  .invoice-summary-table th,
  .invoice-summary-table td,
  .invoice-table th,
  .invoice-table td,
  .invoice-footer-table td,
  .invoice-totals-table td {
    border: 2px solid var(--invoice-border);
    padding: 4px 6px;
    vertical-align: top;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .invoice-summary-table th,
  .invoice-table thead th {
    background: var(--invoice-fill);
    font-weight: 700;
  }

  .invoice-summary-table th {
    text-align: center;
    font-size: 12px;
  }

  .invoice-summary-table td {
    text-align: center;
    font-size: 14px;
    height: 38px;
    vertical-align: middle;
  }

  .invoice-table {
    margin-bottom: 16px;
  }

  .invoice-table thead th {
    font-size: 11px;
    text-align: left;
    white-space: normal;
    line-height: 1.15;
  }

  .invoice-table tbody td {
    font-size: 11px;
    line-height: 1.2;
    height: 30px;
  }

  .invoice-table tbody tr:nth-child(even) td {
    background: #efefef;
  }

  .col-center {
    text-align: center;
  }

  .col-right {
    text-align: right;
  }

  .invoice-body-spacer td {
    height: 168px;
    background: #fff !important;
  }

  .invoice-notes-totals {
    display: grid;
    grid-template-columns: 1.25fr 0.85fr;
    gap: 30px;
    align-items: start;
    margin-bottom: 150px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .invoice-notes {
    white-space: pre-line;
    font-size: 12px;
    line-height: 1.25;
  }

  .invoice-notes strong {
    font-size: 14px;
  }

  .invoice-totals-table td {
    height: 40px;
    font-size: 14px;
    vertical-align: middle;
  }

  .invoice-totals-table .label {
    font-weight: 700;
    width: 55%;
  }

  .invoice-totals-table .value {
    text-align: right;
    width: 45%;
  }

  .invoice-totals-table .grand-total td {
    font-weight: 700;
    font-size: 16px;
  }

  .invoice-footer-table td {
    height: 132px;
    font-size: 12px;
    line-height: 1.35;
    vertical-align: top;
  }

  .invoice-footer-table,
  .invoice-footer-table tr,
  .invoice-footer-table td,
  .invoice-powered {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .invoice-footer-table strong {
    display: block;
    margin-bottom: 18px;
  }

  .invoice-powered {
    margin-top: 24px;
    text-align: right;
    font-size: 12px;
    color: #666666;
  }

  .invoice-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-bottom: 16px;
  }

  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  @media print {
    body {
      padding: 0;
    }

    .invoice-actions {
      display: none !important;
    }

    .invoice-page {
      max-width: none;
    }

    .invoice-sheet {
      min-height: auto;
    }

    .invoice-notes-totals {
      margin-bottom: 48px;
    }

    .invoice-footer-table {
      margin-top: 0;
      break-before: avoid;
      page-break-before: avoid;
    }

    .invoice-powered {
      margin-top: 16px;
    }

    .invoice-company {
      font-size: 15px;
    }

    .invoice-company strong,
    .invoice-client-name,
    .invoice-meta-label,
    .invoice-meta-value {
      font-size: 16px;
    }

    .invoice-client-address {
      font-size: 13px;
      line-height: 1.35;
    }

    .invoice-summary-table th,
    .invoice-summary-table td {
      font-size: 11px;
      padding: 4px 5px;
    }

    .invoice-table thead th,
    .invoice-table tbody td {
      font-size: 9px;
      padding: 3px 4px;
      line-height: 1.15;
    }

    .invoice-totals-table td,
    .invoice-footer-table td,
    .invoice-notes {
      font-size: 11px;
    }
  }
`;

const renderHtmlToPdfBlob = async (html) => {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#ffffff";
  wrapper.style.zIndex = "-1";
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  try {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const images = Array.from(wrapper.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (image) =>
          new Promise((resolve) => {
            if (image.complete) {
              resolve(true);
              return;
            }
            image.onload = () => resolve(true);
            image.onerror = () => resolve(true);
          }),
      ),
    );

    const canvas = await html2canvas(wrapper, {
      scale: 1,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: wrapper.scrollWidth,
      height: wrapper.scrollHeight,
      windowWidth: wrapper.scrollWidth,
      windowHeight: wrapper.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.72);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    return pdf.output("blob");
  } finally {
    wrapper.remove();
  }
};

const sendDocumentEmail = async ({ recipientEmail, recipientEmails, subject, html, fileName, blob, contentType }) => {
  const formData = new FormData();
  formData.append("recipientEmail", recipientEmail || "");
  formData.append("recipientEmails", recipientEmails || recipientEmail || "");
  formData.append("subject", subject || "");
  formData.append("html", html || "");
  formData.append("senderName", "Solflo");
  formData.append(
    "attachment",
    new File([blob], fileName, {
      type: contentType || "application/octet-stream",
    }),
  );

  const response = await fetch("/api/send-document-email", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "Failed to send invoice email");
  }

  return result;
};
function InvoiceDocument({ logoUrl, invoiceView }) {
  const {
    clientName,
    clientAddress,
    companyRegistrationNumber,
    invoiceNumber,
    invoiceDate,
    accountNumber,
    customerVatNumber,
    notes,
    rows,
    totals,
  } = invoiceView;

  return (
    <div className="invoice-page">
      <style>{buildInvoiceStyles()}</style>
      <div className="invoice-sheet" data-invoice-content>
        <div className="invoice-top">
          <div>
            <img src={logoUrl} alt="Soltrack Logo" className="invoice-logo" />
          </div>
          <div className="invoice-company">
            <strong>{COMPANY_INFO.name}</strong>
            <div>Reg No: {COMPANY_INFO.regNo}</div>
            <div>VAT No.: {COMPANY_INFO.vatNo}</div>
          </div>
        </div>

        <div className="invoice-rule" />
        <div className="invoice-title">Tax Invoice</div>

        <div className="invoice-party-row">
          <div className="invoice-client-block">
            <div className="invoice-client-name">{clientName}</div>
            <div className="invoice-client-address">
              <strong>Company Reg:</strong> {companyRegistrationNumber || "-"}
            </div>
            <div className="invoice-client-address">{clientAddress}</div>
          </div>
          <div className="invoice-meta">
            <div className="invoice-meta-label">TAX INVOICE :</div>
            <div className="invoice-meta-value">{invoiceNumber}</div>
            <div className="invoice-meta-label">Date:</div>
            <div className="invoice-meta-value">{invoiceDate}</div>
          </div>
        </div>

        <table className="invoice-summary-table">
          <colgroup>
            <col style={{ width: "12.5%" }} />
            <col style={{ width: "40.5%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "33%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Account</th>
              <th>Your Reference</th>
              <th>VAT %</th>
              <th>Customer Vat Number</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{accountNumber}</td>
              <td>{clientName}</td>
              <td>VAT 15%</td>
              <td>{customerVatNumber}</td>
            </tr>
          </tbody>
        </table>

        <table className="invoice-table">
          <colgroup>
            <col style={{ width: "9.5%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "8.5%" }} />
            <col style={{ width: "6.5%" }} />
            <col style={{ width: "5.5%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Previous Reg</th>
              <th>New Reg</th>
              <th>Item Code</th>
              <th>Description</th>
              <th>Comments</th>
              <th className="col-center">Units</th>
              <th className="col-right">Unit Price</th>
              <th className="col-right">Vat</th>
              <th className="col-center">Vat%</th>
              <th className="col-right">Total Incl</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.itemCode}-${row.previousReg}-${index}`}>
                <td>{row.previousReg}</td>
                <td>{row.newReg}</td>
                <td>{row.itemCode}</td>
                <td>{row.description}</td>
                <td>{row.comments}</td>
                <td className="col-center">{row.units}</td>
                <td className="col-right">{row.unitPrice}</td>
                <td className="col-right">{row.vatAmount}</td>
                <td className="col-center">{row.vatPercent}</td>
                <td className="col-right">{row.totalIncl}</td>
              </tr>
            ))}
            <tr className="invoice-body-spacer">
              <td colSpan={10} />
            </tr>
          </tbody>
        </table>

        <div className="invoice-notes-totals">
          <div className="invoice-notes">
            <strong>Notes:</strong> {notes}
          </div>

          <table className="invoice-totals-table">
            <tbody>
              <tr>
                <td className="label">Total Ex. VAT</td>
                <td className="value">{formatTotalAmount(totals.totalExVat)}</td>
              </tr>
              <tr>
                <td className="label">Discount</td>
                <td className="value">{formatTotalAmount(totals.discount)}</td>
              </tr>
              <tr>
                <td className="label">VAT</td>
                <td className="value">{formatTotalAmount(totals.totalVat)}</td>
              </tr>
              <tr className="grand-total">
                <td className="label">Total Incl. VAT</td>
                <td className="value">{formatTotalAmount(totals.totalInclVat)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table className="invoice-footer-table">
          <colgroup>
            <col style={{ width: "35%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <tbody>
            <tr>
              <td>
                <strong>Head Office:</strong>
                {COMPANY_INFO.headOffice.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </td>
              <td>
                <strong>Postal Address:</strong>
                {COMPANY_INFO.postal.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </td>
              <td>
                <strong>Contact Details</strong>
                {COMPANY_INFO.contact.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </td>
              <td>
                <strong>{COMPANY_INFO.name}</strong>
                {COMPANY_INFO.banking.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  );
}

const normalizeInvoiceLine = (item) => {
  const units = Math.max(1, toNumber(item.units ?? item.quantity) || 1);
  const explicitUnitPrice = toNumber(
    item.unit_price_without_vat ??
      item.unit_price_ex_vat ??
      item.unit_price,
  );
  const explicitLineExVat = toNumber(
    item.total_excl_vat ??
      item.subtotal ??
      item.amountExcludingVat,
  );
  const exVatPerUnit =
    explicitUnitPrice > 0
      ? explicitUnitPrice
      : explicitLineExVat > 0
        ? explicitLineExVat / units
        : 0;
  const exVatLineTotal =
    explicitLineExVat > 0 ? explicitLineExVat : exVatPerUnit * units;

  const explicitVatAmount = toNumber(
    item.vat_amount ?? item.vatAmount ?? item.total_vat,
  );
  const explicitTotalIncl = toNumber(
    item.total_including_vat ??
      item.total_incl_vat ??
      item.total_incl ??
      item.totalIncl ??
      item.totalRentalSub,
  );
  const vatLineTotal =
    explicitVatAmount > 0
      ? explicitVatAmount
      : explicitTotalIncl > 0 && exVatLineTotal > 0
        ? Math.max(0, explicitTotalIncl - exVatLineTotal)
        : exVatLineTotal * VAT_RATE;

  const totalInclLine = exVatLineTotal + vatLineTotal;

  return {
    previousReg: item.reg || item.previous_reg || "-",
    newReg: item.fleetNumber || item.new_reg || item.reg || item.previous_reg || "-",
    itemCode: item.item_code || "-",
    description: item.description || "-",
    comments: item.category || item.comments || item.company || "",
    units,
    unitPrice: formatAmount(exVatPerUnit),
    vatAmount: formatAmount(vatLineTotal),
    vatPercent: item.vat_percent || "15%",
    totalIncl: formatAmount(totalInclLine),
    exVat: exVatLineTotal,
    vat: vatLineTotal,
    incl: totalInclLine,
  };
};

export function buildInvoiceView({
  activeInvoiceData,
  customerInfo,
  clientLegalName,
  costCenter,
  editableNotes,
}) {
  const items = Array.isArray(activeInvoiceData?.invoiceItems)
    ? activeInvoiceData.invoiceItems
    : Array.isArray(activeInvoiceData?.invoice_items)
      ? activeInvoiceData.invoice_items
      : [];

  const rows = items.map(normalizeInvoiceLine);

  const rowTotals = rows.reduce(
    (acc, row) => ({
      totalExVat: acc.totalExVat + row.exVat,
      totalVat: acc.totalVat + row.vat,
      totalInclVat: acc.totalInclVat + row.incl,
      discount: 0,
    }),
    { totalExVat: 0, totalVat: 0, totalInclVat: 0, discount: 0 }
  );

  const isEpsVirtualInvoice =
    String(costCenter?.sourceAccountNumber || activeInvoiceData?.source_account_number || '')
      .trim()
      .toUpperCase() === 'EPSC-0001';

  const clientName = isEpsVirtualInvoice
    ? costCenter?.accountName ||
      customerInfo?.legal_name ||
      customerInfo?.company ||
      activeInvoiceData?.company_name ||
      clientLegalName ||
      ""
    : customerInfo?.legal_name ||
      customerInfo?.company ||
      activeInvoiceData?.company_name ||
      clientLegalName ||
      costCenter?.accountName ||
      "";
  const clientAddress = buildClientAddress(
    customerInfo,
    activeInvoiceData?.client_address || activeInvoiceData?.company_address || "",
  );
  const invoiceNumber =
    getRealInvoiceNumber(
      activeInvoiceData?.invoice_number,
      activeInvoiceData?.invoiceNumber,
      activeInvoiceData?.invoice_no,
    ) || "PENDING";
  const companyRegistrationNumber =
    customerInfo?.registration_number ||
    activeInvoiceData?.company_registration_number ||
    "";

  const totals = {
    totalExVat: rowTotals.totalExVat,
    totalVat: rowTotals.totalVat,
    totalInclVat: rowTotals.totalExVat + rowTotals.totalVat,
    discount: 0,
  };

  const noteText = String(
    editableNotes ?? "",
  ).trim();

  return {
    clientName,
    clientAddress,
    companyRegistrationNumber,
    invoiceNumber,
    invoiceDate: formatDate(activeInvoiceData?.invoice_date || getBillingInvoiceDate(activeInvoiceData?.billing_month || costCenter?.billingMonth)),
    accountNumber: costCenter?.accountNumber || activeInvoiceData?.account_number || "",
    customerVatNumber:
      customerInfo?.vat_number ||
      activeInvoiceData?.customer_vat_number ||
      "",
    notes: noteText,
    rows,
    totals,
  };
}

export function buildInvoicePrintableHtml({ logoUrl, invoiceView }) {
  const rowMarkup =
    invoiceView.rows
      .map(
        (row) => `
            <tr>
              <td>${escapeHtml(row.previousReg)}</td>
              <td>${escapeHtml(row.newReg)}</td>
              <td>${escapeHtml(row.itemCode)}</td>
              <td>${escapeHtml(row.description)}</td>
              <td>${escapeHtml(row.comments)}</td>
              <td class="col-center">${escapeHtml(row.units)}</td>
              <td class="col-right">${escapeHtml(row.unitPrice)}</td>
              <td class="col-right">${escapeHtml(row.vatAmount)}</td>
              <td class="col-center">${escapeHtml(row.vatPercent)}</td>
              <td class="col-right">${escapeHtml(row.totalIncl)}</td>
            </tr>
          `,
      )
      .join("") || `<tr><td colspan="10">No invoice rows available</td></tr>`;

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice - ${escapeHtml(invoiceView.accountNumber)}</title>
          <style>${buildInvoiceStyles()}</style>
        </head>
        <body>
          <div class="invoice-page">
            <div class="invoice-sheet">
              <div class="invoice-top">
                <div>
                  <img src="${escapeHtml(logoUrl)}" alt="Soltrack Logo" class="invoice-logo" />
                </div>
                <div class="invoice-company">
                  <strong>${escapeHtml(COMPANY_INFO.name)}</strong>
                  <div>Reg No: ${escapeHtml(COMPANY_INFO.regNo)}</div>
                  <div>VAT No.: ${escapeHtml(COMPANY_INFO.vatNo)}</div>
                </div>
              </div>
                <div class="invoice-rule"></div>
                <div class="invoice-title">Tax Invoice</div>
                <div class="invoice-party-row">
                  <div class="invoice-client-block">
                    <div class="invoice-client-name">${escapeHtml(invoiceView.clientName)}</div>
                    <div class="invoice-client-address"><strong>Company Reg:</strong> ${escapeHtml(invoiceView.companyRegistrationNumber || "-")}</div>
                    <div class="invoice-client-address">${escapeHtml(invoiceView.clientAddress)}</div>
                  </div>
                  <div class="invoice-meta">
                    <div class="invoice-meta-label">TAX INVOICE :</div>
                    <div class="invoice-meta-value">${escapeHtml(invoiceView.invoiceNumber)}</div>
                  <div class="invoice-meta-label">Date:</div>
                  <div class="invoice-meta-value">${escapeHtml(invoiceView.invoiceDate)}</div>
                </div>
              </div>
              <table class="invoice-summary-table">
                <colgroup>
                  <col style="width:12.5%" />
                  <col style="width:40.5%" />
                  <col style="width:14%" />
                  <col style="width:33%" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Your Reference</th>
                    <th>VAT %</th>
                    <th>Customer Vat Number</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${escapeHtml(invoiceView.accountNumber)}</td>
                    <td>${escapeHtml(invoiceView.clientName)}</td>
                    <td>VAT 15%</td>
                    <td>${escapeHtml(invoiceView.customerVatNumber)}</td>
                  </tr>
                </tbody>
              </table>
              <table class="invoice-table">
                <colgroup>
                  <col style="width:9.5%" />
                  <col style="width:12%" />
                  <col style="width:14%" />
                  <col style="width:16%" />
                  <col style="width:11%" />
                  <col style="width:5%" />
                  <col style="width:8.5%" />
                  <col style="width:6.5%" />
                  <col style="width:5.5%" />
                  <col style="width:8%" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Previous Reg</th>
                    <th>New Reg</th>
                    <th>Item Code</th>
                    <th>Description</th>
                    <th>Comments</th>
                    <th class="col-center">Units</th>
                    <th class="col-right">Unit Price</th>
                    <th class="col-right">Vat</th>
                    <th class="col-center">Vat%</th>
                    <th class="col-right">Total Incl</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowMarkup}
                  <tr class="invoice-body-spacer"><td colspan="10"></td></tr>
                </tbody>
              </table>
              <div class="invoice-notes-totals">
                <div class="invoice-notes"><strong>Notes:</strong> ${escapeHtml(invoiceView.notes).replace(/\n/g, "<br />")}</div>
                <table class="invoice-totals-table">
                  <tbody>
                    <tr>
                      <td class="label">Total Ex. VAT</td>
                      <td class="value">${escapeHtml(formatTotalAmount(invoiceView.totals.totalExVat))}</td>
                    </tr>
                    <tr>
                      <td class="label">Discount</td>
                      <td class="value">${escapeHtml(formatTotalAmount(invoiceView.totals.discount))}</td>
                    </tr>
                    <tr>
                      <td class="label">VAT</td>
                      <td class="value">${escapeHtml(formatTotalAmount(invoiceView.totals.totalVat))}</td>
                    </tr>
                    <tr class="grand-total">
                      <td class="label">Total Incl. VAT</td>
                      <td class="value">${escapeHtml(formatTotalAmount(invoiceView.totals.totalInclVat))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <table class="invoice-footer-table">
                <colgroup>
                  <col style="width:35%" />
                  <col style="width:19%" />
                  <col style="width:26%" />
                  <col style="width:20%" />
                </colgroup>
                <tbody>
                  <tr>
                    <td><strong>Head Office:</strong>${COMPANY_INFO.headOffice
                      .map((line) => `<div>${escapeHtml(line)}</div>`)
                      .join("")}</td>
                    <td><strong>Postal Address:</strong>${COMPANY_INFO.postal
                      .map((line) => `<div>${escapeHtml(line)}</div>`)
                      .join("")}</td>
                    <td><strong>Contact Details</strong>${COMPANY_INFO.contact
                      .map((line) => `<div>${escapeHtml(line)}</div>`)
                      .join("")}</td>
                    <td><strong>${escapeHtml(COMPANY_INFO.name)}</strong>${COMPANY_INFO.banking
                      .map((line) => `<div>${escapeHtml(line)}</div>`)
                      .join("")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;
}

export default function InvoiceReportComponent({
  costCenter,
  clientLegalName,
  invoiceData,
  onInvoiceGenerated,
  viewOnly = false,
  extraActions = null,
}) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isLoadingInvoiceMonth, setIsLoadingInvoiceMonth] = useState(false);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [selectedInvoiceMonth, setSelectedInvoiceMonth] = useState("__current__");
  const [activeInvoiceData, setActiveInvoiceData] = useState(invoiceData);
  const [editableNotes, setEditableNotes] = useState(
    String(invoiceData?.notes ?? invoiceData?.note ?? invoiceData?.quote_notes ?? ""),
  );
  const [customerInfo, setCustomerInfo] = useState(
    costCenter?.costCenterInfo || null,
  );

  useEffect(() => {
    setActiveInvoiceData(invoiceData);
    setSelectedInvoiceMonth("__current__");
  }, [invoiceData]);

  useEffect(() => {
    setEditableNotes(
      String(
        activeInvoiceData?.notes ??
        activeInvoiceData?.note ??
        activeInvoiceData?.quote_notes ??
        "",
      ),
    );
  }, [activeInvoiceData]);

  useEffect(() => {
    if (costCenter?.costCenterInfo) {
      setCustomerInfo(costCenter.costCenterInfo);
    }
  }, [costCenter?.costCenterInfo]);

  useEffect(() => {
    if (viewOnly) {
      setInvoiceHistory([]);
      return undefined;
    }

    let active = true;

    const loadInvoiceHistory = async () => {
      if (!costCenter?.accountNumber) {
        if (active) setInvoiceHistory([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/invoices/account/history?accountNumber=${encodeURIComponent(costCenter.accountNumber)}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch invoice history");
        }

        const result = await response.json();
        if (active) {
          setInvoiceHistory(Array.isArray(result?.invoices) ? result.invoices : []);
        }
      } catch (error) {
        console.error("Error loading invoice history:", error);
        if (active) {
          setInvoiceHistory([]);
        }
      }
    };

    loadInvoiceHistory();

    return () => {
      active = false;
    };
  }, [costCenter?.accountNumber, viewOnly]);

  useEffect(() => {
    if (viewOnly && costCenter?.costCenterInfo) {
      setCustomerInfo(costCenter.costCenterInfo);
      return undefined;
    }

    let active = true;

    const loadCustomerInfo = async () => {
      if (!costCenter?.accountNumber) return;

      try {
        const costCenterResponse = await fetch(
          `/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(costCenter.accountNumber)}`,
        );

        if (costCenterResponse.ok) {
          const costCenterResult = await costCenterResponse.json();
          const matchedCostCenter = Array.isArray(costCenterResult?.costCenters)
            ? costCenterResult.costCenters.find(
                (item) =>
                  String(item?.cost_code || "")
                    .trim()
                    .toUpperCase() === String(costCenter.accountNumber).trim().toUpperCase(),
              ) || costCenterResult.costCenters[0]
            : null;

          if (active && matchedCostCenter) {
            setCustomerInfo(matchedCostCenter);
            return;
          }
        }
        if (active) {
          setCustomerInfo(null);
        }
      } catch (error) {
        console.error("Error loading customer info for invoice:", error);
      }
    };

    loadCustomerInfo();

    return () => {
      active = false;
    };
  }, [costCenter?.accountNumber, viewOnly]);

  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/soltrack_logo.png`
      : "/soltrack_logo.png";

  const invoiceView = useMemo(
    () =>
      buildInvoiceView({
        activeInvoiceData,
        customerInfo,
        clientLegalName,
        costCenter,
        editableNotes,
      }),
    [activeInvoiceData, clientLegalName, costCenter, customerInfo, editableNotes],
  );

  const getPrintableHtml = () => buildInvoicePrintableHtml({ logoUrl, invoiceView });

  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the invoice");
      return;
    }

    printWindow.document.write(getPrintableHtml());
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      const image = printWindow.document.querySelector("img");
      if (image && !image.complete) {
        image.onload = () => {
          setTimeout(() => printWindow.print(), 150);
        };
        image.onerror = () => {
          setTimeout(() => printWindow.print(), 150);
        };
        return;
      }

      setTimeout(() => printWindow.print(), 150);
    };
  };

  const generateInvoice = async () => {
    if (!costCenter?.accountNumber) {
      toast.error("Account number not found");
      return;
    }

    setIsGeneratingInvoice(true);

    try {
      const lineItems = invoiceView.rows.map((row) => ({
        previous_reg: row.previousReg,
        new_reg: row.newReg,
        item_code: row.itemCode,
        description: row.description,
        comments: row.comments,
        units: row.units,
        quantity: row.units,
        unit_price_without_vat: parseFormattedAmount(row.unitPrice),
        amountExcludingVat: parseFormattedAmount(row.unitPrice),
        vat_amount: parseFormattedAmount(row.vatAmount),
        total_incl_vat: parseFormattedAmount(row.totalIncl),
        total_including_vat: parseFormattedAmount(row.totalIncl),
        reg: row.previousReg,
        fleetNumber: row.newReg,
        company: row.comments,
      }));

      const response = await fetch("/api/invoices/bulk-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountNumber: costCenter.accountNumber,
          billingMonth: costCenter.billingMonth || null,
          companyName: invoiceView.clientName,
          companyRegistrationNumber: invoiceView.companyRegistrationNumber,
          clientAddress: invoiceView.clientAddress,
          customerVatNumber: invoiceView.customerVatNumber,
          invoiceDate: getBillingInvoiceDate(costCenter.billingMonth || activeInvoiceData?.billing_month),
          subtotal: invoiceView.totals.totalExVat,
          vatAmount: invoiceView.totals.totalVat,
          discountAmount: invoiceView.totals.discount,
          totalAmount: invoiceView.totals.totalInclVat,
          lineItems,
          notes: editableNotes.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.invoice) {
        throw new Error(result?.error || "Failed to generate invoice");
      }

      const normalizedStoredInvoice = {
        ...result.invoice,
        invoice_items: Array.isArray(result.invoice?.line_items) ? result.invoice.line_items : [],
        invoiceItems: Array.isArray(result.invoice?.line_items) ? result.invoice.line_items : [],
      };
      setActiveInvoiceData(normalizedStoredInvoice);
      setEditableNotes(String(result.invoice?.notes || ""));
      setInvoiceHistory((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const existingIndex = next.findIndex((item) => item?.id === result.invoice?.id);
        if (existingIndex >= 0) {
          next[existingIndex] = result.invoice;
        } else {
          next.unshift(result.invoice);
        }
        return next;
      });

      onInvoiceGenerated?.(result.invoice);
      toast.success("Invoice generated successfully");
    } catch (error) {
      toast.error(error?.message || "Failed to generate invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleInvoiceMonthChange = async (value) => {
    setSelectedInvoiceMonth(value);

    if (value === "__current__") {
      setActiveInvoiceData(invoiceData);
      return;
    }

    if (!costCenter?.accountNumber) return;

    setIsLoadingInvoiceMonth(true);
    try {
      const query = new URLSearchParams({
        accountNumber: costCenter.accountNumber,
        billingMonth: value,
      });
      if (costCenter?.sourceAccountNumber) {
        query.set('sourceAccountNumber', costCenter.sourceAccountNumber);
      }
      if (costCenter?.invoiceGroup) {
        query.set('billingGroup', costCenter.invoiceGroup);
      }

      const [storedResponse, liveResponse] = await Promise.all([
        fetch(`/api/invoices/bulk-account?accountNumber=${encodeURIComponent(costCenter.accountNumber)}&billingMonth=${encodeURIComponent(value)}`),
        fetch(`/api/vehicles/invoice?${query.toString()}`),
      ]);

      let storedInvoice = null;
      if (storedResponse.ok) {
        const storedResult = await storedResponse.json();
        storedInvoice = storedResult?.invoice || null;
      }

      let liveInvoiceData = null;
      if (liveResponse.ok) {
        const result = await liveResponse.json();
        liveInvoiceData = result?.invoiceData || null;
      }

      const nextInvoiceData = mergeLiveInvoiceWithStoredBulkInvoice(liveInvoiceData, storedInvoice);
      if (!nextInvoiceData) {
        throw new Error('Failed to load invoice');
      }

      setActiveInvoiceData(nextInvoiceData);
    } catch (error) {
      toast.error(error?.message || "Failed to load invoice");
      setSelectedInvoiceMonth("__current__");
      setActiveInvoiceData(invoiceData);
    } finally {
      setIsLoadingInvoiceMonth(false);
    }
  };

  const emailPDF = async () => {
    if (!costCenter?.accountNumber) {
      toast.error("Account number not found");
      return;
    }

    setIsSendingEmail(true);

    try {
      let customer = customerInfo;

      if (!customer) {
        const costCenterResponse = await fetch(
          `/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(costCenter.accountNumber)}`,
        );

        if (costCenterResponse.ok) {
          const costCenterResult = await costCenterResponse.json();
          const matchedCostCenter = Array.isArray(costCenterResult?.costCenters)
            ? costCenterResult.costCenters.find(
                (item) =>
                  String(item?.cost_code || "")
                    .trim()
                    .toUpperCase() === String(costCenter.accountNumber).trim().toUpperCase(),
              ) || costCenterResult.costCenters[0]
            : null;

          if (matchedCostCenter) {
            customer = matchedCostCenter;
            setCustomerInfo(matchedCostCenter);
          }
        }
      }

      const defaultRecipient = String(customer?.email || "").trim();
      const recipientInput = window.prompt(
        "Enter recipient email address(es), separated by commas:",
        defaultRecipient,
      );

      if (recipientInput === null) {
        return;
      }

      const recipientEmails = recipientInput
        .split(/[;,]/)
        .map((value) => value.trim())
        .filter(Boolean);
      const allRecipientEmails = Array.from(
        new Set(
          [...recipientEmails, String(customer?.email || "").trim()]
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      );

      if (allRecipientEmails.length === 0) {
        toast.error("Please enter at least one recipient email address");
        return;
      }

      const printableHtml = getPrintableHtml();
      const blob = await renderHtmlToPdfBlob(printableHtml);
      const safeAccount = String(costCenter.accountNumber || "account")
        .trim()
        .replace(/[^A-Za-z0-9_-]+/g, "_");
      const safeInvoiceNumber = String(invoiceView.invoiceNumber || "PENDING")
        .trim()
        .replace(/[^A-Za-z0-9_-]+/g, "_");
      const fileName = `${safeAccount}_${safeInvoiceNumber}_Invoice.pdf`;
      const subject = `Invoice ${invoiceView.invoiceNumber || safeAccount}`;
      const bodyText = `Hi,\n\nPlease see attached the invoice for ${invoiceView.clientName || safeAccount}.\n\nKind regards`;

      await sendDocumentEmail({
        recipientEmail: allRecipientEmails[0],
        recipientEmails: allRecipientEmails.join(', '),
        subject,
        html: buildInvoiceEmailHtml({
          subject,
          clientName: invoiceView.clientName,
          accountNumber: invoiceView.accountNumber,
          attachmentName: fileName,
          bodyText,
        }),
        fileName,
        blob,
        contentType: "application/pdf",
      });

      toast.success(`Invoice sent successfully to ${allRecipientEmails.join(", ")}!`);
    } catch (error) {
      console.error("Error sending invoice email:", error);
      toast.error(`Failed to send invoice email: ${error?.message || "Unknown error"}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="w-full">
      <div className="invoice-actions">
        <select
          value={selectedInvoiceMonth}
          onChange={(event) => handleInvoiceMonthChange(event.target.value)}
          disabled={isLoadingInvoiceMonth}
          className="border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-900"
        >
          <option value="__current__">Current Billing</option>
          {invoiceHistory.map((invoice) => {
            const billingMonthValue = String(invoice?.billing_month || "").trim();
            if (!billingMonthValue) return null;
            return (
              <option key={`${invoice.id}-${billingMonthValue}`} value={billingMonthValue}>
                {`${formatDate(billingMonthValue)} - ${invoice.invoice_number || "Stored Invoice"}`}
              </option>
            );
          })}
        </select>
        {!viewOnly && invoiceView.invoiceNumber === "PENDING" && (
          <Button
            onClick={generateInvoice}
            disabled={isGeneratingInvoice}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isGeneratingInvoice ? (
              <>
                <div className="border-white border-b-2 rounded-full w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Invoice"
            )}
          </Button>
        )}
        <Button onClick={printReport} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Print / Save PDF
        </Button>
        {extraActions}
        {!viewOnly && (
          <Button
            onClick={emailPDF}
            disabled={isSendingEmail}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {isSendingEmail ? (
              <>
                <div className="border-white border-b-2 rounded-full w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Email PDF
              </>
            )}
          </Button>
        )}
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-medium text-sm text-gray-700">
          Invoice Notes
        </label>
        <textarea
          value={editableNotes}
          onChange={(event) => setEditableNotes(event.target.value)}
          rows={4}
          readOnly={viewOnly}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900"
          placeholder="Add invoice notes for this month..."
        />
      </div>

      <InvoiceDocument logoUrl={logoUrl} invoiceView={invoiceView} />
    </div>
  );
}
