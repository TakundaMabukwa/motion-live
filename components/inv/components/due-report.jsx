"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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
    text-align: center;
    font-size: 16px;
    line-height: 1.3;
  }

  .statement-company strong {
    display: block;
    font-size: 20px;
    margin-bottom: 8px;
  }

  .statement-rule {
    border-top: 2px solid var(--statement-line);
    margin: 12px 0 8px;
  }

  .statement-title {
    text-align: center;
    font-weight: 700;
    font-size: 20px;
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
    font-size: 18px;
  }

  .statement-client-block {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .statement-client-address {
    white-space: pre-line;
    font-size: 15px;
    line-height: 1.5;
  }

  .statement-meta {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 18px 14px;
    align-content: start;
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
    statementNumber,
    statementDate,
    accountNumber,
    customerVatNumber,
    rows,
    agingRows,
    itemRows,
    totals,
  } = statementView;

  return `
    <div class="statement-page">
      <style>${buildStatementStyles()}</style>
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
            <div class="statement-client-address">${escapeHtml(clientAddress)}</div>
          </div>
          <div class="statement-meta">
            <div class="statement-meta-label">DEBTOR STATEMENT :</div>
            <div class="statement-meta-value">${escapeHtml(statementNumber)}</div>
            <div class="statement-meta-label">Date:</div>
            <div class="statement-meta-value">${escapeHtml(statementDate)}</div>
          </div>
        </div>

        <table class="statement-summary-table">
          <colgroup>
            <col style="width: 12.5%" />
            <col style="width: 40.5%" />
            <col style="width: 14%" />
            <col style="width: 33%" />
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
            <col style="width: 14%" />
            <col style="width: 22%" />
            <col style="width: 18%" />
            <col style="width: 12%" />
            <col style="width: 10%" />
            <col style="width: 10%" />
            <col style="width: 14%" />
          </colgroup>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Invoice Number</th>
              <th class="col-right">Total Invoiced</th>
              <th class="col-right">Paid</th>
              <th class="col-right">Credited</th>
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
                    <td>${escapeHtml(row.invoiceNumber)}</td>
                    <td class="col-right">${escapeHtml(row.totalInvoiced)}</td>
                    <td class="col-right">${escapeHtml(row.paid)}</td>
                    <td class="col-right">${escapeHtml(row.credited)}</td>
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
              <div class="statement-section-title">Full Item Breakdown Making Up Statement Total</div>
              <table class="statement-table">
                <colgroup>
                  <col style="width: 16%" />
                  <col style="width: 14%" />
                  <col style="width: 34%" />
                  <col style="width: 12%" />
                  <col style="width: 12%" />
                  <col style="width: 12%" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Vehicle Reg</th>
                    <th>Fleet No</th>
                    <th>Description</th>
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

        <div class="statement-section-title">Age Analysis</div>
        <table class="statement-aging-table">
          <colgroup>
            <col style="width: 20%" />
            <col style="width: 20%" />
            <col style="width: 20%" />
            <col style="width: 20%" />
            <col style="width: 20%" />
          </colgroup>
          <thead>
            <tr>
              <th>Current</th>
              <th>30 Days</th>
              <th>60 Days</th>
              <th>90 Days</th>
              <th>120+ Days</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              ${agingRows.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}
            </tr>
          </tbody>
        </table>

        <div class="statement-notes-totals">
          <div class="statement-notes">
            <strong>Notes:</strong>
            This debtor statement reflects the full outstanding amount currently linked to this cost center. Age analysis is shown below using the current invoice balance position.
          </div>

          <table class="statement-totals-table">
            <tbody>
              <tr>
                <td class="label">Total Invoiced</td>
                <td class="value">${escapeHtml(totals.totalInvoiced)}</td>
              </tr>
              <tr>
                <td class="label">Paid</td>
                <td class="value">${escapeHtml(totals.paid)}</td>
              </tr>
              <tr>
                <td class="label">Credited</td>
                <td class="value">${escapeHtml(totals.credited)}</td>
              </tr>
              <tr class="grand-total">
                <td class="label">Outstanding</td>
                <td class="value">${escapeHtml(totals.outstanding)}</td>
              </tr>
            </tbody>
          </table>
        </div>

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

export default function DueReportComponent({
  costCenter,
  clientLegalName,
  paymentData,
  invoiceHistory = [],
  paymentHistory = [],
  bulkInvoice = null,
  showItemBreakdown = false,
}) {
  const statementView = useMemo(() => {
    const invoiceItems =
      costCenter?.invoiceData?.invoiceItems ||
      costCenter?.invoiceData?.invoice_items ||
      [];

    const currentInvoice =
      invoiceHistory.find(
        (invoice) =>
          String(invoice?.billing_month || "") === String(paymentData?.billing_month || "") &&
          String(invoice?.account_number || "") === String(costCenter?.accountNumber || ""),
      ) || null;

    const clientName =
      costCenter?.invoiceData?.company_name ||
      bulkInvoice?.company_name ||
      currentInvoice?.company_name ||
      costCenter?.accountName ||
      paymentData?.company_name ||
      clientLegalName ||
      costCenter?.accountNumber ||
      "Client Name";

    const structuredAddress = [
      costCenter?.costCenterInfo?.physical_address_1,
      costCenter?.costCenterInfo?.physical_address_2,
      costCenter?.costCenterInfo?.physical_address_3,
      costCenter?.costCenterInfo?.physical_area,
      costCenter?.costCenterInfo?.physical_code,
    ]
      .filter(Boolean)
      .join("\n");

    const clientAddress =
      costCenter?.invoiceData?.client_address ||
      bulkInvoice?.client_address ||
      currentInvoice?.client_address ||
      paymentData?.client_address ||
      structuredAddress;

    const activeInvoice =
      bulkInvoice ||
      currentInvoice ||
      (costCenter?.invoiceData
        ? {
            invoice_number: costCenter.invoiceData.invoice_number,
            invoice_date: costCenter.invoiceData.invoice_date,
            created_at: costCenter.invoiceData.created_at,
            total_amount: costCenter.invoiceData.total_amount,
            balance_due: costCenter.invoiceData.balance_due,
            paid_amount: costCenter.invoiceData.paid_amount,
            due_date: costCenter.invoiceData.due_date,
          }
        : null);

    const actualInvoiceNumber =
      activeInvoice?.invoice_number ||
      paymentData?.invoice_number ||
      costCenter?.invoiceData?.invoice_number ||
      costCenter?.reference ||
      "";

    const matchedPayments = paymentHistory.filter((payment) => {
      const sameInvoiceId =
        currentInvoice?.id &&
        String(payment?.account_invoice_id || "") === String(currentInvoice.id);
      const sameInvoiceNumber =
        actualInvoiceNumber &&
        String(payment?.invoice_number || "") === String(actualInvoiceNumber);
      const sameAccount =
        String(payment?.account_number || "") === String(costCenter?.accountNumber || "");
      return sameAccount && (sameInvoiceId || sameInvoiceNumber);
    });

    const paidAmount =
      matchedPayments.length > 0
        ? matchedPayments.reduce((sum, payment) => sum + toNumber(payment?.amount), 0)
        : toNumber(activeInvoice?.paid_amount ?? paymentData?.paid_amount);
    const creditedAmount = toNumber(
      paymentData?.credited_amount ??
        paymentData?.credit_amount ??
        activeInvoice?.credited_amount ??
        activeInvoice?.credit_amount ??
        costCenter?.credit_amount ??
        costCenter?.credited_amount,
    );
    const totalInvoiced = toNumber(
      activeInvoice?.total_amount ||
        paymentData?.due_amount ||
        paymentData?.total_amount ||
        (toNumber(paymentData?.balance_due) + paidAmount + creditedAmount),
    );
    const balanceDue = Math.max(
      0,
      toNumber(activeInvoice?.balance_due ?? paymentData?.balance_due ?? totalInvoiced - paidAmount - creditedAmount),
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
      statementDate: formatDate(new Date().toISOString()),
      accountNumber: costCenter?.accountNumber || "N/A",
      customerVatNumber:
        costCenter?.invoiceData?.customer_vat_number ||
        bulkInvoice?.customer_vat_number ||
        currentInvoice?.customer_vat_number ||
        costCenter?.costCenterInfo?.vat_number ||
        paymentData?.customer_vat_number ||
        "-",
      rows: [
        {
          date: formatDate(
            activeInvoice?.invoice_date ||
              paymentData?.invoice_date ||
              activeInvoice?.created_at ||
              paymentData?.created_at ||
              paymentData?.billing_month,
          ),
          client: clientName,
          invoiceNumber: actualInvoiceNumber || "-",
          totalInvoiced: formatCurrency(totalInvoiced),
          paid: formatCurrency(paidAmount),
          credited: formatCurrency(creditedAmount),
          outstanding: formatCurrency(balanceDue),
        },
      ],
      agingRows: [
        formatCurrency(current),
        formatCurrency(days30),
        formatCurrency(days60),
        formatCurrency(days90),
        formatCurrency(days120Plus),
      ],
      itemRows: invoiceItems.map((item, index) => ({
        id: `${item?.reg || "row"}-${item?.fleetNumber || item?.fleet_number || index}-${index}`,
        reg: item?.reg || "-",
        fleetNumber: item?.fleetNumber || item?.fleet_number || "-",
        description: item?.description || item?.item_description || item?.itemCode || "Billed Item",
        unitPrice: formatCurrency(item?.unit_price_without_vat || item?.unitPrice || 0),
        vatAmount: formatCurrency(item?.vat_amount || item?.vatAmount || 0),
        totalIncl: formatCurrency(item?.total_including_vat || item?.totalIncl || 0),
      })),
      totals: {
        totalInvoiced: formatCurrency(totalInvoiced),
        paid: formatCurrency(paidAmount),
        credited: formatCurrency(creditedAmount),
        outstanding: formatCurrency(balanceDue),
      },
    };
  }, [bulkInvoice, clientLegalName, costCenter, invoiceHistory, paymentData, paymentHistory]);

  const printReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Debtor Statement - ${escapeHtml(statementView.accountNumber)}</title>
        </head>
        <body>${StatementDocument({ statementView, showItemBreakdown })}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = function onLoad() {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 250);
    };
  };

  return (
    <div className="statement-page">
      <style>{buildStatementStyles()}</style>
      <div className="statement-actions">
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
