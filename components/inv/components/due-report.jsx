"use client";

import React, { useMemo, useState } from "react";
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

const toNumber = (value) => {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatAmount = (amount) =>
  toNumber(amount).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatCurrency = (amount) => `R ${formatAmount(amount)}`;

const formatDate = (value) => {
  if (!value) return "N/A";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString("en-GB");
};

const formatLongDate = (value) => {
  if (!value) return "N/A";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatMonthYear = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
};

const formatStatementTransactionDate = (value, fallbackDay = null) => {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return String(value || 'N/A');
  }

  if (fallbackDay) {
    const monthIndex = parsed.getUTCMonth();
    const year = parsed.getUTCFullYear();
    const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const safeDay = Math.max(1, Math.min(fallbackDay, lastDay));
    const monthLabel = parsed.toLocaleString('en-GB', {
      month: 'short',
      timeZone: 'UTC',
    });
    return `${String(safeDay).padStart(2, '0')} ${monthLabel}`;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
};
const sortTransactionDatesAsc = (left, right) => {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
  const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
  return safeLeft - safeRight;
};

const normalizeStatementDescription = (value, fallback = "") => {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (raw.toUpperCase().includes("OPEN")) return fallback;
  if (raw.toUpperCase() === "IMPORT") return fallback;
  return raw;
};

const normalizeBillingMonthValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

const getBillingMonthCutoff = (billingMonth) => {
  const normalized = normalizeBillingMonthValue(billingMonth);
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0, 23, 59, 59, 999));
};

const getBillingMonthDisplayDate = (billingMonth) => {
  const normalized = normalizeBillingMonthValue(billingMonth);
  if (!normalized) return "";
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  const lastDay = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0)).getUTCDate();
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
};

const getStatementAsAtDate = (statementMonthSource) => {
  const normalized = normalizeBillingMonthValue(statementMonthSource);
  const today = new Date();
  const formatLocalDateValue = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  if (!normalized) {
    return formatLocalDateValue(today);
  }

  const statementMonthDate = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(statementMonthDate.getTime())) {
    return formatLocalDateValue(today);
  }

  const currentMonthNormalized = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  if (normalized === currentMonthNormalized) {
    return formatLocalDateValue(today);
  }

  return `${statementMonthDate.getUTCFullYear()}-${String(statementMonthDate.getUTCMonth() + 1).padStart(2, "0")}-${String(new Date(Date.UTC(statementMonthDate.getUTCFullYear(), statementMonthDate.getUTCMonth() + 1, 0)).getUTCDate()).padStart(2, "0")}`;
};

const isOnOrBeforeBillingMonth = (billingMonth, value, fallbackDateValue = null) => {
  const normalizedBillingMonth = normalizeBillingMonthValue(billingMonth);
  if (!normalizedBillingMonth) return true;

  const cutoff = getBillingMonthCutoff(normalizedBillingMonth);
  const parsedFallback = fallbackDateValue ? new Date(String(fallbackDateValue)) : null;
  const hasRealFallbackDate =
    parsedFallback && !Number.isNaN(parsedFallback.getTime()) && cutoff;

  const normalizedValue = normalizeBillingMonthValue(value);
  if (normalizedValue) {
    if (normalizedValue > normalizedBillingMonth) {
      return false;
    }

    if (normalizedValue < normalizedBillingMonth) {
      return true;
    }

    if (hasRealFallbackDate) {
      return parsedFallback.getTime() <= cutoff.getTime();
    }

    return true;
  }

  if (!fallbackDateValue) return false;
  if (Number.isNaN(parsedFallback.getTime()) || !cutoff) return false;
  return parsedFallback.getTime() <= cutoff.getTime();
};

const isWithinBillingMonth = (billingMonth, value, fallbackDateValue = null) => {
  const normalizedBillingMonth = normalizeBillingMonthValue(billingMonth);
  if (!normalizedBillingMonth) return true;

  const cutoff = getBillingMonthCutoff(normalizedBillingMonth);
  const monthStart = new Date(`${normalizedBillingMonth}T00:00:00.000Z`);
  const parsedFallback = fallbackDateValue ? new Date(String(fallbackDateValue)) : null;
  const hasRealFallbackDate =
    parsedFallback && !Number.isNaN(parsedFallback.getTime()) && cutoff;

  const normalizedValue = normalizeBillingMonthValue(value);
  if (normalizedValue) {
    if (normalizedValue !== normalizedBillingMonth) {
      return false;
    }

    if (hasRealFallbackDate) {
      return (
        parsedFallback.getTime() >= monthStart.getTime() &&
        parsedFallback.getTime() <= cutoff.getTime()
      );
    }

    return true;
  }

  if (!hasRealFallbackDate) return false;
  return (
    parsedFallback.getTime() >= monthStart.getTime() &&
    parsedFallback.getTime() <= cutoff.getTime()
  );
};

const isBeforeBillingMonth = (billingMonth, value, fallbackDateValue = null) => {
  const normalizedBillingMonth = normalizeBillingMonthValue(billingMonth);
  if (!normalizedBillingMonth) return false;
  return (
    isOnOrBeforeBillingMonth(normalizedBillingMonth, value, fallbackDateValue) &&
    !isWithinBillingMonth(normalizedBillingMonth, value, fallbackDateValue)
  );
};

const isAccountStyleInvoice = (invoice) => {
  const sourceType = String(invoice?.source_type || "").trim();
  return sourceType === "account_invoice" || sourceType === "bulk_account_invoice";
};

const isInvoiceWithinBillingMonth = (billingMonth, invoice) => {
  const normalizedBillingMonth = normalizeBillingMonthValue(billingMonth);
  if (!normalizedBillingMonth) return true;

  const normalizedInvoiceBillingMonth = normalizeBillingMonthValue(invoice?.billing_month);
  if (isAccountStyleInvoice(invoice) && normalizedInvoiceBillingMonth) {
    return normalizedInvoiceBillingMonth === normalizedBillingMonth;
  }

  return isWithinBillingMonth(
    normalizedBillingMonth,
    invoice?.billing_month,
    invoice?.invoice_date || invoice?.created_at,
  );
};

const isInvoiceBeforeBillingMonth = (billingMonth, invoice) => {
  const normalizedBillingMonth = normalizeBillingMonthValue(billingMonth);
  if (!normalizedBillingMonth) return false;

  const normalizedInvoiceBillingMonth = normalizeBillingMonthValue(invoice?.billing_month);
  if (isAccountStyleInvoice(invoice) && normalizedInvoiceBillingMonth) {
    return normalizedInvoiceBillingMonth < normalizedBillingMonth;
  }

  return isBeforeBillingMonth(
    normalizedBillingMonth,
    invoice?.billing_month,
    invoice?.invoice_date || invoice?.created_at,
  );
};


const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");


const buildStatementEmailHtml = ({
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
                  <div style="margin-top:10px;font-size:28px;font-weight:700;line-height:1.2;">Statement Ready</div>
                  <div style="margin-top:8px;font-size:15px;opacity:0.92;">Your debtor statement PDF is attached and ready to use.</div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px;">
                  <div style="font-size:16px;line-height:1.7;color:#111827;white-space:pre-line;">${escapeHtml(bodyText || "Hi,\n\nPlease see attached the statement.\n\nKind regards")}</div>
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
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

const renderStatementHtmlToPdfBlob = async (html) => {
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
    await Promise.all(images.map((image) => new Promise((resolve) => { if (image.complete) { resolve(true); return; } image.onload = () => resolve(true); image.onerror = () => resolve(true); })));
    const canvas = await html2canvas(wrapper, { scale: 1, useCORS: true, backgroundColor: "#ffffff", width: wrapper.scrollWidth, height: wrapper.scrollHeight, windowWidth: wrapper.scrollWidth, windowHeight: wrapper.scrollHeight });
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

const sendStatementDocumentEmail = async ({ recipientEmail, recipientEmails, subject, html, fileName, blob }) => {
  const formData = new FormData();
  formData.append("recipientEmail", recipientEmail || "");
  formData.append("recipientEmails", recipientEmails || recipientEmail || "");
  formData.append("subject", subject || "");
  formData.append("html", html || "");
  formData.append("senderName", "Solflo");
  formData.append("attachment", new File([blob], fileName, { type: "application/pdf" }));
  const response = await fetch("/api/send-document-email", { method: "POST", body: formData });
  const result = await response.json();
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "Failed to send statement email");
  }
  return result;
};

export const buildStatementStyles = () => `
  :root {
    --statement-text: #111111;
    --statement-border: #404040;
    --statement-line: #b7b7b7;
    --statement-fill: #d8d8d8;
    --statement-bg: #ffffff;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: var(--statement-bg);
    color: var(--statement-text);
    font-family: Arial, Helvetica, sans-serif;
  }

  body {
    padding: 24px;
  }

  .statement-page {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    background: #fff;
  }

  .statement-sheet {
    min-height: 1122px;
  }

  .statement-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-bottom: 16px;
  }

  .statement-top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
    gap: 20px;
  }

  .statement-logo {
    width: 220px;
    height: auto;
    object-fit: contain;
  }

.statement-company {
  justify-self: end;
  text-align: left;
  font-size: 15px;
  line-height: 1.3;
  min-width: 240px;
}

.statement-meta {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding-top: 52px;
}

  .statement-company strong {
    display: block;
    font-size: 18px;
    margin-bottom: 8px;
  }

  .statement-rule {
    border-top: 2px solid var(--statement-line);
    margin: 12px 0 8px;
  }

  .statement-title {
    text-align: center;
    font-weight: 700;
    font-size: 18px;
    margin: 8px 0 36px;
    text-transform: uppercase;
  }

  .statement-party-row {
    display: grid;
    grid-template-columns: 1.45fr 0.85fr;
    gap: 24px;
    min-height: 150px;
    margin-bottom: 26px;
  }

  .statement-client-name,
  .statement-meta-label,
  .statement-meta-value {
    font-weight: 700;
    font-size: 15px;
  }

  .statement-client-block {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .statement-client-address {
    white-space: pre-line;
    font-size: 13px;
    line-height: 1.45;
  }

  .statement-meta {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 18px 14px;
    align-content: start;
  }

  .statement-meta-label,
  .statement-meta-value {
    font-size: 14px;
  }

  .statement-summary-table,
  .statement-table,
  .statement-aging-table,
  .statement-footer-table,
  .statement-totals-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .statement-summary-table,
  .statement-table,
  .statement-aging-table {
    margin-bottom: 16px;
  }

  .statement-summary-table th,
  .statement-summary-table td,
  .statement-table th,
  .statement-table td,
  .statement-aging-table th,
  .statement-aging-table td,
  .statement-footer-table td,
  .statement-totals-table td {
    border: 2px solid var(--statement-border);
    padding: 4px 6px;
    vertical-align: top;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .statement-summary-table th,
  .statement-table thead th,
  .statement-aging-table thead th {
    background: var(--statement-fill);
    font-weight: 700;
  }

  .statement-summary-table th,
  .statement-aging-table th {
    text-align: center;
    font-size: 12px;
  }

  .statement-summary-table td,
  .statement-aging-table td {
    text-align: center;
    font-size: 14px;
    height: 38px;
    vertical-align: middle;
  }

  .statement-table thead th {
    font-size: 11px;
    text-align: left;
  }

  .statement-table tbody td {
    font-size: 11px;
    line-height: 1.2;
    height: 30px;
  }

  .statement-table tbody tr:nth-child(even) td {
    background: #efefef;
  }

  .col-center {
    text-align: center;
  }

  .col-right {
    text-align: right;
  }

  .statement-notes-totals {
    display: grid;
    grid-template-columns: 1.25fr 0.85fr;
    gap: 30px;
    align-items: start;
    margin: 24px 0 48px;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .statement-notes {
    white-space: pre-line;
    font-size: 12px;
    line-height: 1.35;
  }

  .statement-notes strong {
    display: block;
    margin-bottom: 10px;
    font-size: 14px;
  }

  .statement-totals-table td {
    height: 40px;
    font-size: 14px;
    vertical-align: middle;
  }

  .statement-totals-table .label {
    font-weight: 700;
    width: 55%;
  }

  .statement-totals-table .value {
    text-align: right;
    width: 45%;
  }

  .statement-totals-table .grand-total td {
    font-weight: 700;
    font-size: 16px;
  }

.statement-section-title {
  margin: 20px 0 8px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
}

.statement-insert-total {
  margin: 10px 0 4px;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  text-align: right;
  line-height: 1.2;
}

  .statement-footer-table td {
    height: 132px;
    font-size: 12px;
    line-height: 1.35;
    vertical-align: top;
  }

  .statement-footer-table strong {
    display: block;
    margin-bottom: 18px;
  }

  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  @media print {
    body {
      padding: 0;
    }

    .statement-actions {
      display: none !important;
    }

    .statement-page {
      max-width: none;
    }

    .statement-sheet {
      min-height: auto;
    }
  }
`;

export function StatementDocument({ statementView, showItemBreakdown = false }) {
  const {
    clientName,
    clientAddress,
    companyRegistrationNumber,
    accountNumber,
    customerVatNumber,
    rows,
    itemRows,
    totals,
    aging,
  } = statementView;

  return `
    <div class="statement-page">
      <style>
        ${buildStatementStyles()}
        .statement-intro {
          margin: 8px 0 18px;
          font-size: 13px;
          line-height: 1.45;
        }
      </style>
      <div class="statement-sheet">
        <div class="statement-top">
          <div>
            <img src="/soltrack_logo.png" alt="Soltrack Logo" class="statement-logo" />
          </div>
          <div class="statement-company">
            <strong>${escapeHtml(COMPANY_INFO.name)}</strong>
            <div>Reg No: ${escapeHtml(COMPANY_INFO.regNo)}</div>
            <div>VAT No.: ${escapeHtml(COMPANY_INFO.vatNo)}</div>
          </div>
        </div>

        <div class="statement-rule"></div>
        <div class="statement-title">Debtor Statement</div>

        <div class="statement-party-row">
          <div class="statement-client-block">
            <div class="statement-client-name">${escapeHtml(clientName)}</div>
            <div class="statement-client-address"><strong>Company Reg:</strong> ${escapeHtml(companyRegistrationNumber || "-")}</div>
            <div class="statement-client-address"><strong>Postal Address:</strong><br />${escapeHtml(clientAddress || "-")}</div>
          </div>
          <div class="statement-meta">
            <div class="statement-meta-label">DEBTOR STATEMENT :</div>
            <div class="statement-meta-value">${escapeHtml(statementView.statementHeaderDate || statementView.statementDate || "-")}</div>
          </div>
        </div>

        <table class="statement-summary-table">
          <colgroup>
            <col style="width: 12.5%" />
            <col style="width: 34.5%" />
            <col style="width: 14%" />
            <col style="width: 39%" />
          </colgroup>
          <thead>
            <tr>
              <th>Account</th>
              <th>Client</th>
              <th>VAT %</th>
              <th>Customer Vat Number</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(accountNumber)}</td>
              <td>${escapeHtml(clientName)}</td>
              <td>VAT 15%</td>
              <td>${escapeHtml(customerVatNumber || "-")}</td>
            </tr>
          </tbody>
        </table>

        <table class="statement-table">
          <colgroup>
            <col style="width: 9%" />
            <col style="width: 20%" />
            <col style="width: 22%" />
            <col style="width: 12%" />
            <col style="width: 12%" />
            <col style="width: 12%" />
            <col style="width: 13%" />
          </colgroup>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Description</th>
              <th class="col-right">Amount</th>
              <th class="col-right">Debit</th>
              <th class="col-right">Credit</th>
              <th class="col-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.date)}</td>
                    <td>${escapeHtml(row.client)}</td>
                    <td>${escapeHtml(row.description)}</td>
                    <td class="col-right">${escapeHtml(row.amount)}</td>
                    <td class="col-right">${escapeHtml(row.debit)}</td>
                    <td class="col-right">${escapeHtml(row.credit)}</td>
                    <td class="col-right">${escapeHtml(row.outstanding)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>

        ${
          showItemBreakdown && itemRows.length > 0
            ? `
              <div class="statement-section-title">Item Breakdown</div>
              <table class="statement-table">
                <colgroup>
                  <col style="width: 14%" />
                  <col style="width: 12%" />
                  <col style="width: 28%" />
                  <col style="width: 18%" />
                  <col style="width: 9%" />
                  <col style="width: 9%" />
                  <col style="width: 10%" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Vehicle Reg</th>
                    <th>Fleet No</th>
                    <th>Description</th>
                    <th>Job Card(s)</th>
                    <th class="col-right">Unit Price</th>
                    <th class="col-right">VAT</th>
                    <th class="col-right">Total Incl</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows
                    .map(
                      (row) => `
                        <tr>
                          <td>${escapeHtml(row.reg)}</td>
                          <td>${escapeHtml(row.fleetNumber)}</td>
                          <td>${escapeHtml(row.description)}</td>
                          <td>${escapeHtml(row.jobCards)}</td>
                          <td class="col-right">${escapeHtml(row.unitPrice)}</td>
                          <td class="col-right">${escapeHtml(row.vatAmount)}</td>
                          <td class="col-right">${escapeHtml(row.totalIncl)}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
            : ""
        }

        <div class="statement-insert-total">Total : ${escapeHtml(totals.outstanding)}</div>

        <table class="statement-footer-table">
          <colgroup>
            <col style="width: 35%" />
            <col style="width: 19%" />
            <col style="width: 26%" />
            <col style="width: 20%" />
          </colgroup>
          <tbody>
            <tr>
              <td>
                <strong>Head Office:</strong>
                ${COMPANY_INFO.headOffice.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
              </td>
              <td>
                <strong>Postal Address:</strong>
                ${COMPANY_INFO.postal.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
              </td>
              <td>
                <strong>Contact Details</strong>
                ${COMPANY_INFO.contact.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
              </td>
              <td>
                <strong>${escapeHtml(COMPANY_INFO.name)}</strong>
                ${COMPANY_INFO.banking.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>
  `;
}

export function buildStatementView({
  costCenter,
  clientLegalName,
  paymentData,
  invoiceHistory = [],
  paymentHistory = [],
  creditNotes = [],
  agingPeriods = [],
  bulkInvoice = null,
}) {
  const isBulkStatement = String(costCenter?.statementMode || "").trim().toLowerCase() === "bulk";
  const statementAccountNumbers = Array.from(
    new Set(
      (isBulkStatement
        ? [
            costCenter?.accountNumber,
            ...(Array.isArray(costCenter?.statementAccountNumbers)
              ? costCenter.statementAccountNumbers
              : []),
          ]
        : [costCenter?.accountNumber])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
  const statementAccountNumberSet = new Set(statementAccountNumbers);
  const targetBillingMonth = normalizeBillingMonthValue(
    costCenter?.billingMonth || paymentData?.billing_month || bulkInvoice?.billing_month || "",
  );

  const filteredInvoiceHistory = invoiceHistory.filter(
    (invoice) =>
      statementAccountNumberSet.has(String(invoice?.account_number || "").trim()) &&
      isInvoiceWithinBillingMonth(targetBillingMonth, invoice),
  );

  const allStatementInvoiceHistory = invoiceHistory.filter((invoice) =>
    statementAccountNumberSet.has(String(invoice?.account_number || "").trim()),
  );

  const filteredPaymentHistory = paymentHistory.filter(
    (payment) =>
      statementAccountNumberSet.has(String(payment?.account_number || "").trim()) &&
      isWithinBillingMonth(
        targetBillingMonth,
        payment?.billing_month,
        payment?.payment_date || payment?.created_at,
      ),
  );

  const filteredCreditNotes = creditNotes.filter(
    (creditNote) =>
      statementAccountNumberSet.has(String(creditNote?.account_number || "").trim()) &&
      isWithinBillingMonth(
        targetBillingMonth,
        creditNote?.billing_month_applies_to,
        creditNote?.credit_note_date || creditNote?.created_at,
      ),
  );

  const primaryStatementAccountNumber = String(costCenter?.accountNumber || "").trim();
  const currentInvoice =
    filteredInvoiceHistory.find(
      (invoice) =>
        normalizeBillingMonthValue(invoice?.billing_month) === targetBillingMonth &&
        String(invoice?.account_number || "").trim() === primaryStatementAccountNumber,
    ) ||
    filteredInvoiceHistory.find(
      (invoice) =>
        normalizeBillingMonthValue(invoice?.billing_month) === targetBillingMonth &&
        statementAccountNumberSet.has(String(invoice?.account_number || "").trim()),
    ) ||
    null;

  const clientName =
    (isBulkStatement ? String(costCenter?.statementCompanyName || "").trim() : "") ||
    costCenter?.accountName ||
    costCenter?.costCenterInfo?.legal_name ||
    costCenter?.costCenterInfo?.company ||
    costCenter?.invoiceData?.company_name ||
      bulkInvoice?.company_name ||
      currentInvoice?.company_name ||
    paymentData?.company_name ||
    clientLegalName ||
    costCenter?.accountNumber ||
    "Client Name";

  const structuredAddress = [
    costCenter?.costCenterInfo?.postal_address_1,
    costCenter?.costCenterInfo?.postal_address_2,
    costCenter?.costCenterInfo?.postal_address_3,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n") || String(
      costCenter?.costCenterInfo?.physical_area || "",
    ).trim();

  const clientAddress = structuredAddress;

  const liveInvoice =
    currentInvoice ||
    (costCenter?.invoiceData
      ? {
          id: costCenter.invoiceData.id,
          account_number: costCenter?.accountNumber,
          billing_month: costCenter.invoiceData.billing_month,
          invoice_number: costCenter.invoiceData.invoice_number,
          invoice_date: costCenter.invoiceData.invoice_date,
          created_at: costCenter.invoiceData.created_at,
          total_amount: costCenter.invoiceData.total_amount,
          balance_due: costCenter.invoiceData.balance_due,
          paid_amount: costCenter.invoiceData.paid_amount,
          credit_amount: costCenter.invoiceData.credit_amount,
          due_date: costCenter.invoiceData.due_date,
        }
      : null);

  const activeInvoice =
    bulkInvoice?.invoice_locked
      ? {
          ...bulkInvoice,
          invoice_date: liveInvoice?.invoice_date || bulkInvoice?.invoice_date,
          billing_month: liveInvoice?.billing_month || bulkInvoice?.billing_month,
        }
      : liveInvoice || bulkInvoice || null;

  const statementInvoiceItems = Array.from(
    new Map(
      [
        ...allStatementInvoiceHistory
          .flatMap((invoice) => {
            const invoiceAccount = String(invoice?.account_number || "").trim();
            const invoiceNumber = String(invoice?.invoice_number || "").trim();
            const rawItems = Array.isArray(invoice?.invoice_items)
              ? invoice.invoice_items
              : Array.isArray(invoice?.line_items)
                ? invoice.line_items
                : [];

            return rawItems.map((item, index) => ({
              ...item,
              source_account_number: invoiceAccount,
              source_invoice_number: invoiceNumber,
              source_job_number: String(invoice?.job_number || "").trim(),
              source_index: index,
            }));
          }),
        ...(Array.isArray(costCenter?.invoiceData?.invoiceItems)
          ? costCenter.invoiceData.invoiceItems
          : Array.isArray(costCenter?.invoiceData?.invoice_items)
            ? costCenter.invoiceData.invoice_items
            : []
        ).map((item, index) => ({
          ...item,
          source_account_number: primaryStatementAccountNumber,
          source_invoice_number: String(costCenter?.invoiceData?.invoice_number || "").trim(),
          source_job_number: String(item?.job_number || "").trim(),
          source_index: index,
        })),
        ...(Array.isArray(costCenter?.invoicedJobs) ? costCenter.invoicedJobs : []).flatMap((job, jobIndex) => {
          const invoiceNumber = String(job?.invoice_number || "").trim();
          const accountNumber = String(job?.account_number || "").trim();
          const reg = String(job?.vehicle_registration || "").trim();
          const products = Array.isArray(job?.quotation_products) ? job.quotation_products : [];

          const productNames = products
            .map((product) =>
              String(
                product?.description ||
                  product?.product ||
                  product?.item ||
                  product?.name ||
                  "",
              ).trim(),
            )
            .filter(Boolean);

          const description = productNames.join(", ") || "Invoiced Job";

          return [
            {
              source_account_number: accountNumber,
              source_invoice_number: invoiceNumber,
              source_job_number: String(job?.job_number || "").trim(),
              source_index: `job-${jobIndex}`,
              reg,
              new_reg: reg,
              description,
              unit_price_without_vat: 0,
              vat_amount: 0,
              total_including_vat: 0,
              from_invoiced_job_card: true,
            },
          ];
        }),
      ].map((item, index) => {
        const key = [
          String(item?.source_account_number || "").trim(),
          String(item?.source_invoice_number || "").trim(),
          String(item?.new_reg || item?.reg || item?.previous_reg || "").trim(),
          String(item?.description || item?.item_description || item?.itemCode || "").trim(),
          String(
            item?.total_including_vat ?? item?.total_incl_vat ?? item?.total_incl ?? item?.totalIncl ?? ""
          ).trim(),
          String(item?.source_index ?? index),
        ].join("|");

        return [key, item];
      }),
    ).values(),
  );

  const actualInvoiceNumber =
    activeInvoice?.invoice_number ||
    paymentData?.invoice_number ||
    costCenter?.invoiceData?.invoice_number ||
    costCenter?.reference ||
    "";

  const matchedPayments = filteredPaymentHistory.filter((payment) => {
    const sameInvoiceId =
      activeInvoice?.id &&
      String(payment?.account_invoice_id || "") === String(activeInvoice.id);
    const sameInvoiceNumber =
      actualInvoiceNumber &&
      String(payment?.invoice_number || "") === String(actualInvoiceNumber);
    const sameAccount = statementAccountNumberSet.has(String(payment?.account_number || "").trim());
    return sameAccount && (sameInvoiceId || sameInvoiceNumber);
  });

  const matchedPaidAmount = matchedPayments.reduce(
    (sum, payment) => sum + toNumber(payment?.amount),
    0,
  );
  const monthlyPaidAmount = Math.max(
    matchedPaidAmount,
    toNumber(activeInvoice?.paid_amount),
    toNumber(paymentData?.paid_amount),
  );
  const creditedAmount = toNumber(
    activeInvoice?.credit_amount ??
      activeInvoice?.credited_amount ??
      paymentData?.credit_amount ??
      paymentData?.credited_amount ??
      costCenter?.credit_amount ??
      costCenter?.credited_amount,
  );
  const totalInvoiced = toNumber(
    activeInvoice?.total_amount ||
      paymentData?.due_amount ||
      paymentData?.total_amount ||
      (toNumber(paymentData?.balance_due) + monthlyPaidAmount + creditedAmount),
  );
  const balanceDue = Math.max(
    0,
    toNumber(
      paymentData?.outstanding_balance ??
        activeInvoice?.balance_due ??
        paymentData?.balance_due ??
        totalInvoiced - monthlyPaidAmount - creditedAmount,
    ),
  );
  const dueDateValue = activeInvoice?.due_date || paymentData?.due_date || null;
  const dueDate = dueDateValue ? new Date(dueDateValue) : null;

  const normalizedToday = new Date();
  normalizedToday.setHours(0, 0, 0, 0);

  let current = toNumber(paymentData?.current_due);
  let days30 = toNumber(paymentData?.overdue_30_days);
  let days60 = toNumber(paymentData?.overdue_60_days);
  let days90 = toNumber(paymentData?.overdue_90_days);
  let days120Plus = toNumber(
    paymentData?.overdue_120_plus_days ?? paymentData?.overdue_91_plus_days,
  );

  const hasMirroredAging =
    current > 0 || days30 > 0 || days60 > 0 || days90 > 0 || days120Plus > 0 || balanceDue <= 0;

  if (!hasMirroredAging) {
    current = balanceDue;
    days30 = 0;
    days60 = 0;
    days90 = 0;
    days120Plus = 0;

    if (balanceDue > 0 && dueDate && !Number.isNaN(dueDate.getTime())) {
      dueDate.setHours(0, 0, 0, 0);
      const daysOverdue = Math.floor((normalizedToday.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue > 0) {
        current = 0;
        if (daysOverdue <= 30) {
          days30 = balanceDue;
        } else if (daysOverdue <= 60) {
          days60 = balanceDue;
        } else if (daysOverdue <= 90) {
          days90 = balanceDue;
        } else {
          days120Plus = balanceDue;
        }
      }
    }
  }

  const statementMonthSource =
    targetBillingMonth ||
    activeInvoice?.billing_month ||
    paymentData?.billing_month ||
    bulkInvoice?.billing_month ||
    activeInvoice?.invoice_date ||
    paymentData?.invoice_date ||
    new Date().toISOString();

  const paymentDateSource =
    paymentData?.last_payment_date ||
    paymentData?.last_payment ||
    paymentData?.payment_date ||
    statementMonthSource;

  const invoiceDateSource =
    activeInvoice?.invoice_date ||
    paymentData?.invoice_date ||
    activeInvoice?.created_at ||
    paymentData?.created_at ||
    statementMonthSource;

  const priorAgingPeriods = agingPeriods.filter(
    (period) =>
      statementAccountNumberSet.has(String(period?.account_number || "").trim()) &&
      isBeforeBillingMonth(
        targetBillingMonth,
        period?.billing_month,
        period?.invoice_date || period?.last_updated,
      ),
  );

  const latestPriorAgingByAccount = new Map();
  priorAgingPeriods.forEach((period) => {
    const accountNumber = String(period?.account_number || "").trim();
    if (!accountNumber) return;

    const candidateTime = new Date(
      String(period?.invoice_date || period?.last_updated || period?.billing_month || 0),
    ).getTime();
    const current = latestPriorAgingByAccount.get(accountNumber);
    const currentTime = current
      ? new Date(
          String(
            current?.invoice_date || current?.last_updated || current?.billing_month || 0,
          ),
        ).getTime()
      : Number.NEGATIVE_INFINITY;

    if (!current || candidateTime > currentTime) {
      latestPriorAgingByAccount.set(accountNumber, period);
    }
  });

  const openingBalanceFromAging = Array.from(latestPriorAgingByAccount.values()).reduce(
    (sum, period) => sum + Math.max(0, toNumber(period?.outstanding_balance)),
    0,
  );
  const openingCreditFromAging = Array.from(latestPriorAgingByAccount.values()).reduce(
    (sum, period) => sum + Math.max(0, toNumber(period?.credit_amount)),
    0,
  );

  const priorInvoiceHistory = invoiceHistory.filter(
    (invoice) =>
      statementAccountNumberSet.has(String(invoice?.account_number || "").trim()) &&
      isInvoiceBeforeBillingMonth(targetBillingMonth, invoice),
  );

  const priorPaymentHistory = paymentHistory.filter(
    (payment) =>
      statementAccountNumberSet.has(String(payment?.account_number || "").trim()) &&
      isBeforeBillingMonth(
        targetBillingMonth,
        payment?.billing_month,
        payment?.payment_date || payment?.created_at,
      ),
  );

  const priorCreditNotes = creditNotes.filter(
    (creditNote) =>
      statementAccountNumberSet.has(String(creditNote?.account_number || "").trim()) &&
      isBeforeBillingMonth(
        targetBillingMonth,
        creditNote?.billing_month_applies_to,
        creditNote?.credit_note_date || creditNote?.created_at,
      ),
  );

  const openingBalanceFromLedger = Math.max(
    0,
    priorInvoiceHistory.reduce((sum, invoice) => sum + toNumber(invoice?.total_amount), 0) -
      priorPaymentHistory.reduce((sum, payment) => sum + toNumber(payment?.amount), 0) -
      priorCreditNotes.reduce(
        (sum, creditNote) => sum + toNumber(creditNote?.applied_amount ?? creditNote?.amount),
        0,
      ),
  );
  const hasPriorAging = latestPriorAgingByAccount.size > 0;
  const openingBalance = hasPriorAging
    ? openingBalanceFromAging
    : openingBalanceFromLedger;
  const openingCreditAmount = hasPriorAging ? openingCreditFromAging : 0;
  const shouldShowOpeningBalanceRow =
    hasPriorAging ||
    openingBalance > 0 ||
    priorInvoiceHistory.length > 0 ||
    priorPaymentHistory.length > 0 ||
    priorCreditNotes.length > 0;

  const matchedStatementPayments = filteredPaymentHistory
    .map((payment) => ({
      id: payment?.id,
      date: payment?.payment_date || payment?.created_at || paymentDateSource,
      description: payment?.payment_reference || payment?.payment_method || 'payment',
      amount: toNumber(payment?.amount),
    }))
    .filter((payment) => payment.amount > 0)
    .sort((left, right) => sortTransactionDatesAsc(left.date, right.date));

  const ledgerPaidAmount = matchedStatementPayments.reduce(
    (sum, payment) => sum + toNumber(payment.amount),
    0,
  );
  const statementPaidAmountFallback = Math.max(
    toNumber(paymentData?.statement_paid_amount),
    monthlyPaidAmount,
    ledgerPaidAmount,
    filteredPaymentHistory.reduce((sum, payment) => sum + toNumber(payment?.amount), 0),
  );
  const creditNoteTotal = filteredCreditNotes.reduce(
    (sum, creditNote) =>
      sum + toNumber(creditNote?.applied_amount ?? creditNote?.amount),
    0,
  );
  const statementCreditedAmountFallback = Math.max(
    toNumber(paymentData?.statement_credit_amount ?? creditedAmount),
    creditNoteTotal,
  );

  const invoiceLedgerRows = filteredInvoiceHistory.map((invoice) => {
    const invoiceAmount = toNumber(invoice?.total_amount);
    const billingMonthDate =
      isAccountStyleInvoice(invoice) && normalizeBillingMonthValue(invoice?.billing_month)
        ? getBillingMonthDisplayDate(invoice?.billing_month)
        : null;
    const sortDate =
      billingMonthDate ||
      invoice?.invoice_date ||
      invoice?.created_at ||
      invoice?.billing_month ||
      statementMonthSource;
    return {
      date: formatStatementTransactionDate(sortDate),
      sortDate,
      client:
        String(invoice?.company_name || "").trim() ||
        String(invoice?.client_name || "").trim() ||
        clientName,
      description: normalizeStatementDescription(invoice?.invoice_number, "invoice"),
      amount: formatCurrency(invoiceAmount),
      debit: formatCurrency(invoiceAmount),
      credit: "-",
      amountValue: invoiceAmount,
      debitValue: invoiceAmount,
      creditValue: 0,
      outstandingValue: 0,
      sourceAccountNumber: String(invoice?.account_number || "").trim(),
      sourceBillingMonth: normalizeBillingMonthValue(invoice?.billing_month),
    };
  });

  const completedJobInvoiceFallbackRows = (Array.isArray(costCenter?.invoicedJobs) ? costCenter.invoicedJobs : [])
    .filter(
      (job) =>
        statementAccountNumberSet.has(String(job?.account_number || "").trim()) &&
        isWithinBillingMonth(
          targetBillingMonth,
          job?.billing_month || job?.invoice_date,
          job?.invoice_date || job?.created_at,
        ),
    )
    .map((job) => {
      const invoiceAmount = toNumber(job?.total_amount);
      const sortDate = job?.invoice_date || statementMonthSource;
      return {
        date: formatStatementTransactionDate(sortDate),
        sortDate,
        client: String(job?.customer_name || clientName || "").trim() || clientName,
        description: normalizeStatementDescription(job?.invoice_number, "invoice"),
        amount: formatCurrency(invoiceAmount),
        debit: formatCurrency(invoiceAmount),
        credit: "-",
        amountValue: invoiceAmount,
        debitValue: invoiceAmount,
        creditValue: 0,
        outstandingValue: 0,
        sourceAccountNumber: String(job?.account_number || "").trim(),
        sourceBillingMonth: normalizeBillingMonthValue(job?.billing_month || job?.invoice_date),
      };
    })
    .filter((row) => toNumber(row.debitValue) > 0);

  const invoiceLedgerKeys = new Set(
    invoiceLedgerRows.map((row) => `${String(row.description || "").trim()}|${String(row.sortDate || "").trim()}`),
  );
  const invoiceLedgerPeriodKeys = new Set(
    invoiceLedgerRows
      .map((row) => `${String(row.sourceAccountNumber || "").trim()}|${normalizeBillingMonthValue(row.sourceBillingMonth)}`)
      .filter((key) => !key.endsWith("|")),
  );

  const agingInvoiceFallbackRows = agingPeriods
    .filter((period) =>
      statementAccountNumberSet.has(String(period?.account_number || "").trim()) &&
      isWithinBillingMonth(
        targetBillingMonth,
        period?.billing_month,
        period?.invoice_date || period?.last_updated,
      ),
    )
    .map((period) => {
      const invoiceAmount = toNumber(period?.due_amount);
      const sortDate =
        period?.invoice_date ||
        period?.billing_month ||
        period?.last_updated ||
        statementMonthSource;
      const description = normalizeStatementDescription(
        period?.invoice_number,
        `Invoice ${period?.billing_month || ""}`.trim(),
      );
      return {
        date: formatStatementTransactionDate(sortDate),
        sortDate,
        client:
          String(period?.company_name || "").trim() ||
          String(period?.client_name || "").trim() ||
          clientName,
        description,
        amount: formatCurrency(invoiceAmount),
        debit: formatCurrency(invoiceAmount),
        credit: "-",
        amountValue: invoiceAmount,
        debitValue: invoiceAmount,
        creditValue: 0,
        outstandingValue: 0,
        sourceAccountNumber: String(period?.account_number || "").trim(),
        sourceBillingMonth: normalizeBillingMonthValue(period?.billing_month),
      };
    })
    .filter((row) => toNumber(row.debitValue) > 0)
    .filter(
      (row) =>
        !invoiceLedgerPeriodKeys.has(
          `${String(row.sourceAccountNumber || "").trim()}|${normalizeBillingMonthValue(row.sourceBillingMonth)}`,
        ),
    )
    .filter((row) => !invoiceLedgerKeys.has(`${String(row.description || "").trim()}|${String(row.sortDate || "").trim()}`));

  const completedJobInvoiceRows = completedJobInvoiceFallbackRows.filter(
    (row) => !invoiceLedgerKeys.has(`${String(row.description || "").trim()}|${String(row.sortDate || "").trim()}`),
  );

  const paymentLedgerRows = filteredPaymentHistory.map((payment) => {
    const paymentAmount = toNumber(payment?.amount);
    const descriptionBase =
      normalizeStatementDescription(payment?.payment_reference) ||
      normalizeStatementDescription(payment?.notes) ||
      normalizeStatementDescription(payment?.payment_method) ||
      (paymentAmount > 0 ? "Payment" : "-");
    const sortDate = payment?.payment_date || payment?.created_at || paymentDateSource;
    return {
      date: formatStatementTransactionDate(sortDate),
      sortDate,
      client: clientName,
      description: descriptionBase,
      amount: formatCurrency(paymentAmount),
      debit: "-",
      credit: formatCurrency(paymentAmount),
      amountValue: paymentAmount,
      debitValue: 0,
      creditValue: paymentAmount,
      outstandingValue: 0,
    };
  });

  const creditLedgerRows = filteredCreditNotes.map((creditNote) => {
    const creditAmount = toNumber(creditNote?.applied_amount ?? creditNote?.amount);
    const sortDate =
      creditNote?.credit_note_date ||
      creditNote?.created_at ||
      creditNote?.billing_month_applies_to ||
      paymentDateSource;
    return {
      date: formatStatementTransactionDate(sortDate),
      sortDate,
      client: clientName,
      description: [
        "Credit Note",
        creditNote?.credit_note_number || creditNote?.reference || creditNote?.reason || "",
      ]
        .filter(Boolean)
        .join(" - "),
      amount: formatCurrency(creditAmount),
      debit: "-",
      credit: formatCurrency(creditAmount),
      amountValue: creditAmount,
      debitValue: 0,
      creditValue: creditAmount,
      outstandingValue: 0,
      isCreditNote: true,
    };
  });

  const allStatementInvoiceRows = [
    ...invoiceLedgerRows,
    ...completedJobInvoiceRows,
    ...agingInvoiceFallbackRows,
  ];

  const ledgerInvoiceTotal = allStatementInvoiceRows.reduce(
    (sum, row) => sum + toNumber(row.debitValue),
    0,
  );
  const ledgerPaymentTotal = paymentLedgerRows.reduce(
    (sum, row) => sum + toNumber(row.creditValue),
    0,
  );
  const ledgerCreditTotal = creditLedgerRows.reduce(
    (sum, row) => sum + toNumber(row.creditValue),
    0,
  );
  const statementOutstandingFromMirror = Math.max(
    0,
    toNumber(paymentData?.outstanding_balance ?? balanceDue),
  );
  const transactionRows = [];

  if (shouldShowOpeningBalanceRow) {
    transactionRows.push({
      date: formatStatementTransactionDate(statementMonthSource, 1),
      sortDate: new Date(statementMonthSource || new Date().toISOString()).toISOString(),
      client: clientName,
      description: "Opening Balance",
      amount: formatCurrency(openingBalance),
      debit: formatCurrency(openingBalance),
      credit: "-",
      amountValue: openingBalance,
      debitValue: openingBalance,
      creditValue: 0,
      outstandingValue: 0,
    });
  }

  if (openingCreditAmount > 0) {
    transactionRows.push({
      date: formatStatementTransactionDate(statementMonthSource, 1),
      sortDate: new Date(statementMonthSource || new Date().toISOString()).toISOString(),
      client: clientName,
      description: "Credit Balance",
      amount: formatCurrency(openingCreditAmount),
      debit: "-",
      credit: formatCurrency(openingCreditAmount),
      amountValue: openingCreditAmount,
      debitValue: 0,
      creditValue: openingCreditAmount,
      outstandingValue: 0,
      isCreditAdjustment: true,
    });
  }

  transactionRows.push(
    ...invoiceLedgerRows,
    ...completedJobInvoiceRows,
    ...agingInvoiceFallbackRows,
    ...paymentLedgerRows,
    ...creditLedgerRows,
  );

  const rowsForStatement = transactionRows
    .sort((left, right) => sortTransactionDatesAsc(left.sortDate, right.sortDate))
    .map((row) => ({ ...row }));

  let runningOutstanding = 0;
  rowsForStatement.forEach((row) => {
    runningOutstanding = Math.max(
      0,
      Number((runningOutstanding + toNumber(row.debitValue) - toNumber(row.creditValue)).toFixed(2)),
    );
    row.outstanding = formatCurrency(runningOutstanding);
    row.outstandingValue = runningOutstanding;
  });

  const totalsFromRows = rowsForStatement.reduce(
    (summary, row) => ({
      totalInvoiced: summary.totalInvoiced + toNumber(row.debitValue),
      paid:
        summary.paid +
        (!row.isCreditNote && !row.isCreditAdjustment && toNumber(row.creditValue) > 0
          ? toNumber(row.creditValue)
          : 0),
      credited:
        summary.credited +
        (row.isCreditNote || row.isCreditAdjustment
          ? toNumber(row.creditValue)
          : 0),
      outstanding: toNumber(row.outstandingValue),
    }),
    { totalInvoiced: 0, paid: 0, credited: 0, outstanding: 0 },
  );
  const totalCredited =
    rowsForStatement.length > 0
      ? totalsFromRows.credited
      : Math.max(totalsFromRows.credited, statementCreditedAmountFallback, creditedAmount);
  const totalPaid =
    rowsForStatement.length > 0
      ? totalsFromRows.paid
      : Math.max(totalsFromRows.paid, statementPaidAmountFallback);
  const statementOutstandingTotal =
    rowsForStatement.length > 0
      ? toNumber(totalsFromRows.outstanding)
      : statementOutstandingFromMirror;

  current = statementOutstandingTotal;
  days30 = 0;
  days60 = 0;
  days90 = 0;
  days120Plus = 0;

  return {
    clientName,
    clientAddress: clientAddress || "-",
    companyRegistrationNumber:
      costCenter?.invoiceData?.company_registration_number ||
      bulkInvoice?.company_registration_number ||
      currentInvoice?.company_registration_number ||
      costCenter?.costCenterInfo?.registration_number ||
      paymentData?.company_registration_number ||
      "-",
    statementNumber: "",
    statementDate: formatDate(getStatementAsAtDate(statementMonthSource)),
    statementHeaderDate: formatLongDate(getStatementAsAtDate(statementMonthSource)),
    statementPeriod: formatMonthYear(statementMonthSource),
    accountNumber: costCenter?.accountNumber || "N/A",
    customerVatNumber:
      costCenter?.invoiceData?.customer_vat_number ||
      bulkInvoice?.customer_vat_number ||
      currentInvoice?.customer_vat_number ||
      costCenter?.costCenterInfo?.vat_number ||
      paymentData?.customer_vat_number ||
      "-",
    rows: rowsForStatement.map((row) => ({
      date: row.date,
      client: row.client,
      description: row.description,
      amount: row.amount,
      debit: row.debit,
      credit: row.credit,
      outstanding: row.outstanding,
    })),
    itemRows: statementInvoiceItems.map((item, index) => ({
      id: `${item?.new_reg || item?.reg || item?.previous_reg || "row"}-${item?.fleetNumber || item?.fleet_number || index}-${index}`,
      reg: item?.new_reg || item?.reg || item?.previous_reg || "-",
      fleetNumber: item?.fleetNumber || item?.fleet_number || "-",
      description: item?.description || item?.item_description || item?.itemCode || "Billed Item",
      jobCards:
        [
          item?.job_number,
          item?.jobNumber,
          item?.source_job_number,
          ...(Array.isArray(item?.job_refs) ? item.job_refs : []),
          ...(Array.isArray(item?.jobRefs) ? item.jobRefs : []),
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .filter((value, itemIndex, values) => values.indexOf(value) === itemIndex)
          .join(", ") || "-",
      unitPrice: item?.from_invoiced_job_card
        ? "-"
        : formatCurrency(item?.unit_price_without_vat || item?.unitPrice || 0),
      vatAmount: item?.from_invoiced_job_card
        ? "-"
        : formatCurrency(item?.vat_amount || item?.vatAmount || 0),
      totalIncl: item?.from_invoiced_job_card
        ? "-"
        : formatCurrency(
            item?.total_including_vat ??
              item?.total_incl_vat ??
              item?.total_incl ??
              item?.totalIncl ??
              0,
          ),
    })),
    totals: {
      currentInvoice: formatCurrency(ledgerInvoiceTotal),
      paymentsReceived: formatCurrency(ledgerPaymentTotal),
      totalInvoiced: formatCurrency(totalsFromRows.totalInvoiced),
      paid: formatCurrency(totalPaid),
      credited: formatCurrency(totalCredited),
      amountDue: formatCurrency(statementOutstandingTotal),
      outstanding: formatCurrency(statementOutstandingTotal),
    },
    aging: {
      current: formatCurrency(current),
      days30: formatCurrency(days30),
      days60: formatCurrency(days60),
      days90: formatCurrency(days90),
      days120Plus: formatCurrency(days120Plus),
    },
  };
}

export default function DueReportComponent({
  costCenter,
  clientLegalName,
  paymentData,
  invoiceHistory = [],
  paymentHistory = [],
  creditNotes = [],
  agingPeriods = [],
  bulkInvoice = null,
  showItemBreakdown = false,
}) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const statementView = useMemo(
    () =>
      buildStatementView({
        costCenter,
        clientLegalName,
        paymentData,
        invoiceHistory,
        paymentHistory,
        creditNotes,
        agingPeriods,
        bulkInvoice,
      }),
    [agingPeriods, bulkInvoice, clientLegalName, costCenter, creditNotes, invoiceHistory, paymentData, paymentHistory],
  );

  const getPrintableHtml = () => `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Debtor Statement - ${escapeHtml(statementView.accountNumber)}</title>
      </head>
      <body>${StatementDocument({ statementView, showItemBreakdown })}</body>
    </html>
  `;

  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(getPrintableHtml());
    printWindow.document.close();
    printWindow.onload = function onLoad() {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 250);
    };
  };

  const emailStatement = async () => {
    setIsSendingEmail(true);

    try {
      const defaultRecipient = String(costCenter?.costCenterInfo?.email || costCenter?.email || paymentData?.email || "").trim();
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
          [...recipientEmails, defaultRecipient]
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      );

      if (allRecipientEmails.length === 0) {
        toast.error("Please enter at least one recipient email address");
        return;
      }

      const html = getPrintableHtml();
      const blob = await renderStatementHtmlToPdfBlob(html);
      const safeAccount = String(statementView.accountNumber || "account").trim().replace(/[^A-Za-z0-9_-]+/g, "_");
      const fileName = `${safeAccount}_Statement.pdf`;
      const subject = `Debtor Statement ${statementView.accountNumber || safeAccount}`;
      const bodyText = `Hi,\n\nPlease see attached the statement for ${statementView.clientName || safeAccount}.\n\nKind regards`;

      await sendStatementDocumentEmail({
        recipientEmail: allRecipientEmails[0],
        recipientEmails: allRecipientEmails.join(', '),
        subject,
        html: buildStatementEmailHtml({
          subject,
          clientName: statementView.clientName,
          accountNumber: statementView.accountNumber,
          attachmentName: fileName,
          bodyText,
        }),
        fileName,
        blob,
      });

      toast.success(`Statement sent successfully to ${allRecipientEmails.join(", ")}!`);
    } catch (error) {
      console.error("Error sending statement email:", error);
      toast.error(`Failed to send statement email: ${error?.message || "Unknown error"}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="statement-page">
      <style>{buildStatementStyles()}</style>
      <div className="statement-actions">
        <Button onClick={emailStatement} disabled={isSendingEmail} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Mail className="mr-2 w-4 h-4" />
          {isSendingEmail ? "Sending..." : "Email Statement"}
        </Button>
        <Button onClick={printReport} className="bg-red-600 hover:bg-red-700 text-white">
          <Download className="mr-2 w-4 h-4" />
          Print Statement
        </Button>
      </div>
      <div
        dangerouslySetInnerHTML={{ __html: StatementDocument({ statementView, showItemBreakdown }) }}
      />
    </div>
  );
}
