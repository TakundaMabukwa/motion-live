"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Button,
} from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Download,
} from "lucide-react";
import { toast } from "sonner";

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const VAT_RATE = 0.15;

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatCompactDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-GB");
};

const getBillingInvoiceDate = (billingMonth) => {
  if (!billingMonth) return new Date().toISOString();
  const normalized = String(billingMonth).slice(0, 7) + "-01T00:00:00";
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  const year = parsed.getFullYear();
  const month = parsed.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const invoiceDay = Math.min(30, lastDay);
  return new Date(year, month, invoiceDay).toISOString();
};

const escapeHtml = (str) => {
  const s = String(str || "");
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return s.replace(/[&<>"']/g, (ch) => map[ch]);
};

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

export default function AnnuityBillingTab() {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Cost centers & FC filter
  const [costCenters, setCostCenters] = useState([]);
  const [costCentersLoading, setCostCentersLoading] = useState(true);
  const [fcFilter, setFcFilter] = useState("");
  const [fcUserOptions, setFcUserOptions] = useState([]);

  // Date range
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));

  // Preview state
  const [stage, setStage] = useState("options"); // "options" | "preview"
  const [previewRows, setPreviewRows] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);

  useEffect(() => {
    (async () => {
      setCostCentersLoading(true);
      try {
        const res = await fetch("/api/cost-centers?all=1");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data?.costCenters) ? data.costCenters : Array.isArray(data) ? data : [];
          setCostCenters(list);
        }
      } catch { /* ignore */ }
      setCostCentersLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/fc/users", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setFcUserOptions(data.fcUsers || []);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Build a lookup from cost_code -> cost center for FC filtering
  const costCenterByCode = useMemo(() => {
    const map = {};
    for (const cc of costCenters) {
      const key = String(cc.cost_code || "").trim().toUpperCase();
      if (key) map[key] = cc;
    }
    return map;
  }, [costCenters]);

  const filteredPreviewRows = useMemo(() => {
    if (!fcFilter) return previewRows;
    return previewRows.filter((row) => {
      const code = String(row.accountNumber || "").trim().toUpperCase();
      const cc = costCenterByCode[code];
      if (!cc) return false;
      return String(cc.fc_id || "").trim().toLowerCase() === String(fcFilter).trim().toLowerCase();
    });
  }, [previewRows, fcFilter, costCenterByCode]);

  const selectedRows = useMemo(
    () => filteredPreviewRows.filter((row) => row.selected),
    [filteredPreviewRows],
  );

  const previewTotals = useMemo(
    () =>
      selectedRows.reduce(
        (acc, row) => ({
          subtotal: acc.subtotal + row.subtotal,
          vatAmount: acc.vatAmount + row.vatAmount,
          totalAmount: acc.totalAmount + row.totalAmount,
          vehicleCount: acc.vehicleCount + row.vehicleCount,
        }),
        { subtotal: 0, vatAmount: 0, totalAmount: 0, vehicleCount: 0 },
      ),
    [selectedRows],
  );

  // --- Helper functions (ported from AccountsClientsSection) ---

  const extractInvoiceItems = (invoiceData) => {
    if (Array.isArray(invoiceData?.invoiceItems)) return invoiceData.invoiceItems;
    if (Array.isArray(invoiceData?.invoice_items)) return invoiceData.invoice_items;
    return [];
  };

  const countInvoiceVehicles = (invoiceItems) => {
    const regs = new Set();
    for (const item of invoiceItems) {
      const r = String(item?.new_reg || item?.reg || "").trim().toUpperCase();
      if (r && r !== "-" && r !== "N/A") regs.add(r);
    }
    return regs.size > 0 ? regs.size : invoiceItems.length > 0 ? 1 : 0;
  };

  const normalizePreviewRows = (invoices) => {
    const rows = invoices.map(({ accountNumber, invoiceData }) => {
      const invoiceItems = extractInvoiceItems(invoiceData);
      const subtotal = toNumber(invoiceData?.subtotal);
      const vatAmount = toNumber(invoiceData?.vat_amount);
      const totalAmount = toNumber(invoiceData?.total_amount);
      const vehicleCount = countInvoiceVehicles(invoiceItems);
      const invoiceNumber = String(invoiceData?.invoice_number || "").trim();
      const alreadyInvoiced = Boolean(invoiceNumber);
      return {
        accountNumber: String(accountNumber || "").trim().toUpperCase(),
        companyName: String(invoiceData?.company_name || accountNumber || "").trim(),
        billingMonth: String(invoiceData?.billing_month || "").trim(),
        vehicleCount,
        subtotal,
        vatAmount,
        totalAmount,
        selected: !alreadyInvoiced,
        alreadyInvoiced,
        invoiceData,
      };
    });
    rows.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
    return rows;
  };

  const mapInvoiceItemsToBulkLineItems = (invoiceItems) =>
    invoiceItems.map((item) => ({
      previous_reg: item.previous_reg || item.reg || "-",
      new_reg: item.new_reg || item.fleetNumber || item.reg || "-",
      item_code: item.item_code || "-",
      description: item.description || "-",
      comments: item.company || "",
      units: item.units || item.quantity || 1,
      quantity: item.quantity || item.units || 1,
      unit_price_without_vat:
        item.unit_price_without_vat ??
        item.amountExcludingVat ??
        item.total_excl_vat ??
        item.unit_price ??
        0,
      amountExcludingVat:
        item.amountExcludingVat ??
        item.unit_price_without_vat ??
        item.total_excl_vat ??
        item.unit_price ??
        0,
      vat_amount: item.vat_amount ?? 0,
      total_incl_vat:
        item.total_incl_vat ??
        item.total_including_vat ??
        item.totalRentalSub ??
        0,
      total_including_vat:
        item.total_including_vat ??
        item.total_incl_vat ??
        item.totalRentalSub ??
        0,
      reg: item.reg || null,
      fleetNumber: item.fleetNumber || null,
      company: item.company || "",
      vehicle_created_at: item.vehicle_created_at || null,
      item_added_at:
        item.item_added_at || item.vehicle_created_at || item.created_at || null,
    }));

  const parseDateValue = (value) => {
    if (!value) return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const buildPreviewLineItems = (row) => {
    const billingDate = (() => {
      const d = parseDateValue(row.invoiceData?.invoice_date);
      if (d) return d;
      const fallback = parseDateValue(getBillingInvoiceDate(String(row.billingMonth || "").trim()));
      return fallback || new Date();
    })();
    const recentCutoff = new Date(billingDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const items = extractInvoiceItems(row.invoiceData);
    return items.map((item, index) => {
      const exVat = toNumber(
        item?.amountExcludingVat ??
          item?.unit_price_without_vat ??
          item?.total_excl_vat ??
          item?.unit_price,
      );
      const vatAmount = toNumber(item?.vat_amount ?? item?.vatAmount) || exVat * VAT_RATE;
      const totalInclVat =
        toNumber(item?.total_including_vat ?? item?.total_incl_vat ?? item?.totalRentalSub) ||
        exVat + vatAmount;
      const quantity = Math.max(1, Number(item?.quantity ?? item?.units ?? 1) || 1);
      const addedAtRaw =
        item?.item_added_at ??
        item?.vehicle_created_at ??
        item?.created_at ??
        item?.amount_locked_at ??
        null;
      const addedAtDate = parseDateValue(addedAtRaw);
      const isRecent = Boolean(
        addedAtDate &&
          addedAtDate.getTime() >= recentCutoff.getTime() &&
          addedAtDate.getTime() <= billingDate.getTime(),
      );
      return {
        key: `${row.accountNumber}-${index}-${String(item?.reg || item?.fleetNumber || item?.item_code || "item")}`,
        regFleet: String(item?.new_reg || item?.reg || item?.fleetNumber || item?.previous_reg || "-"),
        itemCode: String(item?.item_code || "-"),
        description: String(item?.description || "-"),
        exVat,
        vatAmount,
        totalInclVat,
        quantity,
        addedAtRaw,
        addedAtLabel: formatCompactDate(addedAtRaw),
        isRecent,
      };
    });
  };

  const buildInvoiceStyles = () => `
    body {
      margin: 0;
      padding: 0;
      background: #f4f4f5;
      font-family: Arial, sans-serif;
      color: #111827;
    }
    .invoice-toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
      padding: 8px 16px;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
    }
    .invoice-print-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 20px;
      font-size: 14px;
      cursor: pointer;
    }
    .invoice-print-btn:hover { background: #1d4ed8; }
    .invoice-page {
      page-break-after: always;
      background: #fff;
      max-width: 900px;
      margin: 12px auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    .invoice-sheet { padding: 20px 24px; }
    .invoice-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .invoice-logo { max-width: 140px; }
    .invoice-company { text-align: right; font-size: 11px; line-height: 1.5; color: #374151; }
    .invoice-rule { border-top: 2px solid #2563eb; margin: 12px 0; }
    .invoice-title { font-size: 22px; font-weight: 700; color: #1e3a5f; letter-spacing: 1px; margin-bottom: 14px; }
    .invoice-party-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 14px; }
    .invoice-client-block { font-size: 12px; line-height: 1.6; flex: 1; }
    .invoice-client-name { font-size: 15px; font-weight: 700; margin-bottom: 4px; color: #111827; }
    .invoice-client-name-row { margin-bottom: 2px; }
    .invoice-client-edit-row { font-size: 11px; margin: 2px 0; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .invoice-inline-input { border: 1px solid #d1d5db; border-radius: 4px; padding: 2px 6px; font-size: 11px; width: 160px; }
    .invoice-inline-save { background: #2563eb; color: #fff; border: none; border-radius: 3px; padding: 2px 8px; font-size: 10px; cursor: pointer; }
    .invoice-inline-save:hover { background: #1d4ed8; }
    .invoice-inline-status { font-size: 10px; color: #059669; }
    .invoice-meta { text-align: right; font-size: 12px; min-width: 200px; }
    .invoice-meta-label { font-weight: 700; color: #374151; margin-top: 4px; }
    .invoice-meta-value { color: #111827; }
    .invoice-summary-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
    .invoice-summary-table th { background: #f3f4f6; padding: 5px 8px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; }
    .invoice-summary-table td { padding: 5px 8px; border: 1px solid #e5e7eb; color: #111827; }
    .invoice-table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e5e7eb; }
    .invoice-table th { background: #1e3a5f; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 10px; white-space: nowrap; }
    .invoice-table td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; color: #111827; }
    .invoice-body-spacer td { height: 4px; background: #f9fafb; }
    .col-center { text-align: center; }
    .col-right { text-align: right; }
    .invoice-notes-totals { display: flex; justify-content: space-between; gap: 20px; margin-top: 14px; }
    .invoice-notes { font-size: 11px; flex: 1; }
    .invoice-totals-table { border-collapse: collapse; font-size: 12px; min-width: 200px; }
    .invoice-totals-table td { padding: 4px 12px; }
    .invoice-totals-table .label { text-align: right; color: #374151; }
    .invoice-totals-table .value { text-align: right; font-weight: 600; color: #111827; }
    .grand-total td { font-size: 14px; font-weight: 700; color: #111827; border-top: 2px solid #111827; padding-top: 6px; }
    .invoice-footer-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 9px; color: #6b7280; }
    .invoice-footer-table td { padding: 6px 8px; vertical-align: top; border: 1px solid #e5e7eb; width: 25%; }
    @media print {
      body { background: #fff; }
      .invoice-toolbar { display: none; }
      .invoice-page { box-shadow: none; border-radius: 0; margin: 0; }
      .invoice-sheet { padding: 16px; }
    }
  `;

  const renderInvoicesToPreviewWindow = (invoices) => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      throw new Error("Please allow popups to preview the invoices");
    }
    previewWindow.document.write(
      '<html><head><title>Preparing invoices...</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">Preparing invoice preview...</body></html>',
    );
    previewWindow.document.close();

    const logoUrl = `${window.location.origin}/soltrack_logo.png`;
    const invoicePages = invoices
      .map(({ accountNumber, invoiceData }) => {
        const items = extractInvoiceItems(invoiceData);
        const rows = items.map((item) => {
          const exVat = toNumber(
            item.unit_price_without_vat ??
              item.amountExcludingVat ??
              item.total_excl_vat ??
              item.unit_price,
          );
          const vatAmt = toNumber(item.vat_amount) || exVat * VAT_RATE;
          const totalIncl =
            toNumber(item.total_including_vat ?? item.total_incl_vat ?? item.totalRentalSub) ||
            exVat + vatAmt;
          return {
            previousReg: String(item.previous_reg || item.reg || "-"),
            newReg: String(item.new_reg || item.fleetNumber || item.reg || "-"),
            itemCode: String(item.item_code || "-"),
            description: String(item.description || "-"),
            comments: String(item.company || ""),
            units: String(item.units || item.quantity || 1),
            unitPrice: formatCurrency(exVat),
            vatAmount: formatCurrency(vatAmt),
            totalIncl: formatCurrency(totalIncl),
            exVat,
            vat: vatAmt,
            incl: totalIncl,
          };
        });
        const totals = rows.reduce(
          (acc, row) => ({
            subtotal: acc.subtotal + row.exVat,
            vat: acc.vat + row.vat,
            total: acc.total + row.incl,
          }),
          { subtotal: 0, vat: 0, total: 0 },
        );
        const rowMarkup =
          rows
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
                <td class="col-center">15%</td>
                <td class="col-right">${escapeHtml(row.totalIncl)}</td>
              </tr>
            `,
            )
            .join("") ||
          '<tr><td colspan="10">No invoice rows available</td></tr>';

        return `
          <div class="invoice-page" data-account-number="${escapeHtml(accountNumber)}" data-billing-month="${escapeHtml(String(invoiceData?.billing_month || ""))}" data-company-name="${escapeHtml(invoiceData?.company_name || accountNumber)}">
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
                  <div class="invoice-client-name-row">
                    <div class="invoice-client-name">${escapeHtml(invoiceData?.company_name || accountNumber)}</div>
                  </div>
                  <div class="invoice-client-edit-row">
                    <strong>Company Reg:</strong>
                    <input class="invoice-inline-input" value="${escapeHtml(invoiceData?.company_registration_number || "")}" data-role="company-registration-number" placeholder="Enter company registration number" />
                    <button class="invoice-inline-save" type="button" data-role="save-company-details">Save</button>
                    <span class="invoice-inline-status" data-role="company-save-status"></span>
                  </div>
                  <div>${escapeHtml(String(invoiceData?.client_address || "")).replace(/\n/g, "<br />")}</div>
                </div>
                <div class="invoice-meta">
                  <div class="invoice-meta-label">TAX INVOICE :</div>
                  <div class="invoice-meta-value">${escapeHtml(invoiceData?.invoice_number || "PENDING")}</div>
                  <div class="invoice-meta-label">Date:</div>
                  <div class="invoice-meta-value">${escapeHtml(formatCompactDate(invoiceData?.invoice_date || getBillingInvoiceDate(invoiceData?.billing_month)))}</div>
                </div>
              </div>
              <table class="invoice-summary-table">
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
                    <td>${escapeHtml(accountNumber)}</td>
                    <td>${escapeHtml(invoiceData?.company_name || accountNumber)}</td>
                    <td>VAT 15%</td>
                    <td>
                      <div class="invoice-editable-cell">
                        <input class="invoice-inline-input" value="${escapeHtml(invoiceData?.customer_vat_number || "")}" data-role="vat-number" />
                        <button class="invoice-inline-save" type="button" data-role="save-vat-number">Save</button>
                        <span class="invoice-inline-status" data-role="vat-save-status"></span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table class="invoice-table">
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
                <div class="invoice-notes"><strong>Notes:</strong> ${escapeHtml(invoiceData?.notes || "").replace(/\n/g, "<br />")}</div>
                <table class="invoice-totals-table">
                  <tbody>
                    <tr>
                      <td class="label">Total Ex. VAT</td>
                      <td class="value">${escapeHtml(formatCurrency(toNumber(invoiceData?.subtotal) || totals.subtotal))}</td>
                    </tr>
                    <tr>
                      <td class="label">Discount</td>
                      <td class="value">R 0.00</td>
                    </tr>
                    <tr>
                      <td class="label">VAT</td>
                      <td class="value">${escapeHtml(formatCurrency(toNumber(invoiceData?.vat_amount) || totals.vat))}</td>
                    </tr>
                    <tr class="grand-total">
                      <td class="label">Total Incl. VAT</td>
                      <td class="value">${escapeHtml(formatCurrency(toNumber(invoiceData?.total_amount) || totals.total))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <table class="invoice-footer-table">
                <tbody>
                  <tr>
                    <td><strong>Head Office:</strong>${COMPANY_INFO.headOffice.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</td>
                    <td><strong>Postal Address:</strong>${COMPANY_INFO.postal.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</td>
                    <td><strong>Contact Details</strong>${COMPANY_INFO.contact.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</td>
                    <td><strong>${escapeHtml(COMPANY_INFO.name)}</strong>${COMPANY_INFO.banking.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        `;
      })
      .join("");

    previewWindow.document.open();
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>All Client Invoices</title>
          <style>${buildInvoiceStyles()}</style>
        </head>
        <body>
          <div class="invoice-toolbar">
            <button class="invoice-print-btn" type="button" data-role="print-invoices">Print</button>
          </div>
          ${invoicePages}
          <script>
            (function () {
              const printButton = document.querySelector('[data-role="print-invoices"]');
              if (printButton) {
                printButton.addEventListener('click', function() {
                  window.print();
                });
              }
              async function saveVatNumber(page) {
                const input = page.querySelector('[data-role="vat-number"]');
                const button = page.querySelector('[data-role="save-vat-number"]');
                const status = page.querySelector('[data-role="vat-save-status"]');
                const accountNumber = page.getAttribute('data-account-number') || '';
                const billingMonth = page.getAttribute('data-billing-month') || '';
                const customerVatNumber = input && input.value ? input.value.trim() : '';
                if (!accountNumber || !billingMonth) {
                  if (status) status.textContent = 'Missing account or month';
                  return;
                }
                if (button) button.disabled = true;
                if (status) status.textContent = 'Saving...';
                try {
                  const response = await fetch('/api/invoices/bulk-account', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountNumber, billingMonth, customerVatNumber }),
                  });
                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to save VAT number');
                  }
                  if (status) status.textContent = 'Saved';
                } catch (error) {
                  if (status) status.textContent = error && error.message ? error.message : 'Save failed';
                } finally {
                  if (button) button.disabled = false;
                }
              }
              async function saveCompanyDetails(page) {
                const companyRegistrationInput = page.querySelector('[data-role="company-registration-number"]');
                const button = page.querySelector('[data-role="save-company-details"]');
                const status = page.querySelector('[data-role="company-save-status"]');
                const accountNumber = page.getAttribute('data-account-number') || '';
                const billingMonth = page.getAttribute('data-billing-month') || '';
                const companyName = page.getAttribute('data-company-name') || '';
                const companyRegistrationNumber = companyRegistrationInput && companyRegistrationInput.value ? companyRegistrationInput.value.trim() : '';
                if (!accountNumber || !billingMonth) {
                  if (status) status.textContent = 'Missing account or month';
                  return;
                }
                if (!companyName) {
                  if (status) status.textContent = 'Enter a client name';
                  return;
                }
                if (button) button.disabled = true;
                if (status) status.textContent = 'Saving...';
                try {
                  const response = await fetch('/api/invoices/bulk-account', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountNumber, billingMonth, companyName, companyRegistrationNumber }),
                  });
                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to save company details');
                  }
                  if (status) status.textContent = 'Saved';
                } catch (error) {
                  if (status) status.textContent = error && error.message ? error.message : 'Save failed';
                } finally {
                  if (button) button.disabled = false;
                }
              }
              document.querySelectorAll('.invoice-page').forEach(function(page) {
                const companyButton = page.querySelector('[data-role="save-company-details"]');
                if (companyButton) {
                  companyButton.addEventListener('click', function() {
                    saveCompanyDetails(page);
                  });
                }
                const vatButton = page.querySelector('[data-role="save-vat-number"]');
                if (vatButton) {
                  vatButton.addEventListener('click', function() {
                    saveVatNumber(page);
                  });
                }
              });
            })();
          </script>
        </body>
      </html>
    `);
    previewWindow.document.close();
    previewWindow.focus();
    previewWindow.onload = () => {
      setTimeout(() => previewWindow.print(), 200);
    };
  };

  // --- Handlers ---

  const handlePreview = async () => {
    if (!startMonth) {
      toast.error("Please select a start month");
      return;
    }
    setLoadingPreview(true);
    try {
      const params = new URLSearchParams();
      params.set("persist", "false");
      if (startMonth) params.set("startMonth", startMonth);
      if (endMonth) params.set("endMonth", endMonth);

      // If FC filter is active, only request data for that FC's cost centers
      if (fcFilter) {
        const fcCostCodes = costCenters
          .filter((cc) => String(cc.fc_id || "").trim().toLowerCase() === String(fcFilter).trim().toLowerCase())
          .map((cc) => String(cc.cost_code || "").trim())
          .filter(Boolean);
        if (fcCostCodes.length > 0) {
          params.set("all_new_account_numbers", fcCostCodes.join(","));
        }
      }

      const res = await fetch(
        `/api/vehicles/bulk-client-invoices-pdf-data?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to load invoice preview");
      const result = await res.json();
      const invoices = Array.isArray(result?.invoices) ? result.invoices : [];
      if (invoices.length === 0) {
        toast.error("No invoice data found for the selected period");
        return;
      }
      setPreviewRows(normalizePreviewRows(invoices));
      setExpandedRows({});
      setStage("preview");
    } catch (err) {
      toast.error(err.message || "Failed to load preview");
    }
    setLoadingPreview(false);
  };

  const toggleSelection = (accountNumber) => {
    setPreviewRows((prev) =>
      prev.map((row) =>
        row.accountNumber === accountNumber
          ? { ...row, selected: !row.selected }
          : row,
      ),
    );
  };

  const setAllSelections = (selected) => {
    setPreviewRows((prev) =>
      prev.map((row) => ({ ...row, selected })),
    );
  };

  const toggleExpansion = (accountNumber) => {
    setExpandedRows((prev) => ({
      ...prev,
      [accountNumber]: !prev[accountNumber],
    }));
  };

  const handleGenerateSelectedInvoicesPdf = async () => {
    const rowsToGenerate = filteredPreviewRows.filter((row) => row.selected);
    if (rowsToGenerate.length === 0) {
      toast.error("Select at least one cost center");
      return;
    }
    setGeneratingInvoices(true);
    try {
      const generatedInvoices = [];
      const errors = [];
      const CONCURRENCY = 5;

      const generateOne = async (row) => {
        const invoiceItems = extractInvoiceItems(row.invoiceData);
        const lineItems = mapInvoiceItemsToBulkLineItems(invoiceItems);
        const subtotal = toNumber(row.invoiceData?.subtotal);
        const vatAmount = toNumber(row.invoiceData?.vat_amount);
        const totalAmount = toNumber(row.invoiceData?.total_amount);
        const billingMonth = String(row.billingMonth || row.invoiceData?.billing_month || "").trim();

        const persistResponse = await fetch("/api/invoices/bulk-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountNumber: row.accountNumber,
            billingMonth: billingMonth || null,
            companyName: row.invoiceData?.company_name || row.companyName || row.accountNumber,
            companyRegistrationNumber: row.invoiceData?.company_registration_number || null,
            clientAddress: row.invoiceData?.client_address || null,
            customerVatNumber: row.invoiceData?.customer_vat_number || null,
            invoiceDate: row.invoiceData?.invoice_date || getBillingInvoiceDate(billingMonth),
            subtotal,
            vatAmount,
            discountAmount: 0,
            totalAmount,
            lineItems,
            notes: row.invoiceData?.notes || null,
          }),
        });

        if (!persistResponse.ok) {
          const errorPayload = await persistResponse.json().catch(() => ({}));
          throw new Error(errorPayload?.error || `Failed to generate invoice for ${row.accountNumber}`);
        }

        const persistResult = await persistResponse.json().catch(() => ({}));
        const persistedInvoice = persistResult?.invoice;
        const persistedLineItems = Array.isArray(persistedInvoice?.line_items)
          ? persistedInvoice.line_items
          : invoiceItems;

        if (!persistedInvoice || !String(persistedInvoice?.invoice_number || "").trim()) {
          throw new Error(`Missing invoice number for ${row.accountNumber}`);
        }

        return {
          accountNumber: row.accountNumber,
          invoiceData: {
            ...row.invoiceData,
            ...persistedInvoice,
            invoiceItems: persistedLineItems,
            invoice_items: persistedLineItems,
          },
        };
      };

      for (let i = 0; i < rowsToGenerate.length; i += CONCURRENCY) {
        const batch = rowsToGenerate.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(batch.map(generateOne));
        for (const result of results) {
          if (result.status === "fulfilled") {
            generatedInvoices.push(result.value);
          } else {
            errors.push(result.reason?.message || "Unknown error");
          }
        }
      }

      if (errors.length > 0) {
        console.error("Invoice generation errors:", errors);
        toast.error(`${errors.length} invoice(s) failed. ${generatedInvoices.length} succeeded.`);
      }

      if (generatedInvoices.length > 0) {
        renderInvoicesToPreviewWindow(generatedInvoices);
        toast.success(`Generated and stored ${generatedInvoices.length} invoices`);
        setStage("options");
        setPreviewRows([]);
      }
    } catch (err) {
      toast.error(err.message || "Failed to generate selected invoices");
    }
    setGeneratingInvoices(false);
  };

  // --- Render ---

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-blue-600" />
            Bulk Invoice Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {stage === "options" && (
            <>
              {/* FC Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <Label className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Filter by FC
                </Label>
                <select
                  value={fcFilter}
                  onChange={(e) => setFcFilter(e.target.value)}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All FCs</option>
                  {fcUserOptions.map((fc) => (
                    <option key={fc.id} value={fc.id}>
                      {fc.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    From Month
                  </Label>
                  <Input
                    type="month"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    To Month
                  </Label>
                  <Input
                    type="month"
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Invoice Date
                  </Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Preview Button */}
              <div className="flex gap-3">
                <Button
                  onClick={handlePreview}
                  disabled={loadingPreview || !startMonth}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loadingPreview ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading preview...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Preview Invoices
                    </>
                  )}
                </Button>
              </div>

              {costCentersLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              )}
            </>
          )}

          {stage === "preview" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Label className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Filter by FC
                  </Label>
                  <select
                    value={fcFilter}
                    onChange={(e) => setFcFilter(e.target.value)}
                    className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All FCs</option>
                    {fcUserOptions.map((fc) => (
                      <option key={fc.id} value={fc.id}>
                        {fc.email}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-500">
                    {filteredPreviewRows.length} cost center
                    {filteredPreviewRows.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Light green rows indicate items added in the last 30 days from the billing date.
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAllSelections(true)}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAllSelections(false)}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-auto max-h-[55vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="w-[42px] text-center text-[11px] px-2">Open</TableHead>
                      <TableHead className="w-[54px] text-center text-[11px] px-2">Use</TableHead>
                      <TableHead className="text-[11px] px-2">Cost Center</TableHead>
                      <TableHead className="text-[11px] px-2">Client</TableHead>
                      <TableHead className="text-right text-[11px] px-2">Vehicles</TableHead>
                      <TableHead className="text-right text-[11px] px-2">Total Ex VAT</TableHead>
                      <TableHead className="text-right text-[11px] px-2">VAT</TableHead>
                      <TableHead className="text-right text-[11px] px-2">Total Incl VAT</TableHead>
                      <TableHead className="text-right text-[11px] px-2">New (30d)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPreviewRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-sm text-gray-500">
                          No cost centers found for the selected period and filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPreviewRows.map((row) => {
                        const isExpanded = Boolean(expandedRows[row.accountNumber]);
                        const lineItems = buildPreviewLineItems(row);
                        const recentItems = lineItems.filter((item) => item.isRecent);
                        return [
                          <TableRow key={`preview-${row.accountNumber}`} className="h-8 text-xs">
                            <TableCell className="text-center px-2 py-1">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-300 hover:bg-gray-100"
                                onClick={() => toggleExpansion(row.accountNumber)}
                                aria-label={isExpanded ? "Collapse row" : "Expand row"}
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            </TableCell>
                            <TableCell className="text-center px-2 py-1">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={() => toggleSelection(row.accountNumber)}
                                disabled={generatingInvoices}
                              />
                            </TableCell>
                            <TableCell className="font-medium px-2 py-1">{row.accountNumber}</TableCell>
                            <TableCell className="px-2 py-1">{row.companyName || row.accountNumber}</TableCell>
                            <TableCell className="text-right px-2 py-1">{row.vehicleCount}</TableCell>
                            <TableCell className="text-right px-2 py-1">{formatCurrency(row.subtotal)}</TableCell>
                            <TableCell className="text-right px-2 py-1">{formatCurrency(row.vatAmount)}</TableCell>
                            <TableCell className="text-right px-2 py-1">{formatCurrency(row.totalAmount)}</TableCell>
                            <TableCell className="text-right px-2 py-1">
                              {row.alreadyInvoiced ? (
                                <span className="inline-flex items-center rounded bg-gray-200 text-gray-600 px-1.5 py-0.5 text-[10px] font-semibold">
                                  Invoiced
                                </span>
                              ) : recentItems.length > 0 ? (
                                <span className="inline-flex items-center rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-[10px] font-semibold">
                                  {recentItems.length}
                                </span>
                              ) : (
                                <span className="text-gray-400">0</span>
                              )}
                            </TableCell>
                          </TableRow>,
                          isExpanded ? (
                            <TableRow key={`preview-details-${row.accountNumber}`}>
                              <TableCell colSpan={9} className="bg-gray-50 px-2 py-2">
                                <div className="rounded border bg-white overflow-hidden">
                                  <div className="px-2 py-1 text-[11px] text-gray-600 border-b">
                                    Billing Date:{" "}
                                    {formatCompactDate(
                                      row.invoiceData?.invoice_date || getBillingInvoiceDate(row.billingMonth),
                                    )}
                                  </div>
                                  <div className="max-h-[28vh] overflow-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="h-7">
                                          <TableHead className="text-[10px] px-2 py-1">Vehicle (Reg/Fleet)</TableHead>
                                          <TableHead className="text-[10px] px-2 py-1">Item Code</TableHead>
                                          <TableHead className="text-[10px] px-2 py-1">Description</TableHead>
                                          <TableHead className="text-right text-[10px] px-2 py-1">Qty</TableHead>
                                          <TableHead className="text-right text-[10px] px-2 py-1">Added</TableHead>
                                          <TableHead className="text-right text-[10px] px-2 py-1">Ex VAT</TableHead>
                                          <TableHead className="text-right text-[10px] px-2 py-1">VAT</TableHead>
                                          <TableHead className="text-right text-[10px] px-2 py-1">Incl VAT</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {lineItems.length === 0 ? (
                                          <TableRow>
                                            <TableCell colSpan={8} className="text-center py-3 text-[11px] text-gray-500">
                                              No line items available.
                                            </TableCell>
                                          </TableRow>
                                        ) : (
                                          lineItems.map((item) => (
                                            <TableRow key={item.key} className={`h-7 text-[11px] ${item.isRecent ? "bg-green-50" : ""}`}>
                                              <TableCell className="px-2 py-1">{item.regFleet}</TableCell>
                                              <TableCell className="px-2 py-1">{item.itemCode}</TableCell>
                                              <TableCell className="px-2 py-1">{item.description}</TableCell>
                                              <TableCell className="text-right px-2 py-1">{item.quantity}</TableCell>
                                              <TableCell className="text-right px-2 py-1">{item.addedAtLabel}</TableCell>
                                              <TableCell className="text-right px-2 py-1">{formatCurrency(item.exVat)}</TableCell>
                                              <TableCell className="text-right px-2 py-1">{formatCurrency(item.vatAmount)}</TableCell>
                                              <TableCell className="text-right px-2 py-1">{formatCurrency(item.totalInclVat)}</TableCell>
                                            </TableRow>
                                          ))
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null,
                        ];
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals Summary */}
              <div className="rounded-md bg-gray-50 border px-4 py-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500">Selected Cost Centers</div>
                    <div className="font-semibold text-gray-900">{selectedRows.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Vehicles</div>
                    <div className="font-semibold text-gray-900">{previewTotals.vehicleCount}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Total Ex VAT (Annuity)</div>
                    <div className="font-semibold text-gray-900">{formatCurrency(previewTotals.subtotal)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Total Incl VAT</div>
                    <div className="font-semibold text-gray-900">{formatCurrency(previewTotals.totalAmount)}</div>
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium text-gray-700">
                  VAT: {formatCurrency(previewTotals.vatAmount)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStage("options");
                    setPreviewRows([]);
                    setExpandedRows({});
                  }}
                  disabled={generatingInvoices}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={generatingInvoices || selectedRows.length === 0}
                  onClick={handleGenerateSelectedInvoicesPdf}
                >
                  {generatingInvoices ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Sequentially...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Generate PDF Invoices
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
