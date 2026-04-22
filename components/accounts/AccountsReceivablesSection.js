"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
  Eye,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import InvoiceReportComponent from "@/components/inv/components/invoice-report";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMonthInputValue = (value) => {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw.slice(0, 7) : "";
};

const monthValueToBillingMonth = (value) => {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : "";
};

const getStateTone = (state) => {
  switch (String(state || "").toLowerCase()) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "partial":
      return "bg-orange-50 text-orange-600 border-orange-100";
    case "credit":
      return "bg-sky-50 text-sky-700 border-sky-100";
    case "pending":
      return "bg-rose-50 text-rose-700 border-rose-100";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const renderRowSkeleton = (key) => (
  <tr key={key} className="border-b border-slate-200 even:bg-slate-50/60">
    {Array.from({ length: 12 }).map((_, index) => (
      <td key={`${key}-${index}`} className="border-r border-slate-200 px-3 py-3 last:border-r-0">
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
      </td>
    ))}
  </tr>
);

const buildPrintableInvoiceHtml = (invoice) => {
  const lineItems = Array.isArray(invoice?.line_items) ? invoice.line_items : [];
  const rowsHtml =
    lineItems.length > 0
      ? lineItems
          .map((item) => {
            const description =
              item?.description ||
              item?.item_code ||
              item?.comments ||
              "Invoice item";
            const quantity = Number(item?.units || item?.quantity || 1);
            const total =
              Number(item?.total_including_vat || item?.total_incl_vat || item?.total_amount || 0) ||
              Number(item?.amountExcludingVat || item?.total_excl_vat || 0);

            return `
              <tr>
                <td>${String(description)}</td>
                <td style="text-align:right;">${quantity}</td>
                <td style="text-align:right;">${formatCurrency(total)}</td>
              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="3" style="text-align:center;color:#64748b;">No stored line items</td>
        </tr>
      `;

  return `
    <!doctype html>
    <html>
      <head>
        <title>${invoice?.invoice_number || "Invoice"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
          .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
          .title { font-size:28px; font-weight:700; margin:0; }
          .meta { font-size:14px; color:#475569; }
          .block { margin-bottom:20px; }
          table { width:100%; border-collapse:collapse; margin-top:12px; }
          th, td { border:1px solid #e2e8f0; padding:10px; font-size:13px; vertical-align:top; }
          th { background:#f8fafc; text-align:left; }
          .totals { margin-top:16px; display:flex; justify-content:flex-end; }
          .totals-box { min-width:260px; }
          .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e2e8f0; }
          .row.total { font-weight:700; font-size:16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${String(invoice?.company_name || invoice?.account_number || "Invoice")}</h1>
            <div class="meta">${String(invoice?.client_address || "").replace(/\n/g, "<br />")}</div>
          </div>
          <div class="meta">
            <div><strong>Invoice:</strong> ${invoice?.invoice_number || "PENDING"}</div>
            <div><strong>Date:</strong> ${formatDate(invoice?.invoice_date)}</div>
            <div><strong>Account:</strong> ${invoice?.account_number || "—"}</div>
          </div>
        </div>

        <div class="block">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="totals-box">
            <div class="row total">
              <span>Total</span>
              <span>${formatCurrency(invoice?.total_amount || 0)}</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export default function AccountsReceivablesSection() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    accounts: 0,
    openAnnuity: 0,
    days30: 0,
    days60: 0,
    days90: 0,
    days120: 0,
    paymentsTotal: 0,
    invoiceTotal: 0,
    totalAmount: 0,
    creditAmount: 0,
    openJobCount: 0,
    openJobValue: 0,
    closedJobCount: 0,
    closedJobValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  const fetchReceivables = useCallback(async (billingMonthOverride = "") => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      const targetMonth = String(billingMonthOverride || "").trim();
      if (targetMonth) {
        query.set("billingMonth", targetMonth);
      }

      const response = await fetch(
        `/api/accounts/receivables${query.toString() ? `?${query.toString()}` : ""}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch receivables");
      }

      const result = await response.json();
      setRows(Array.isArray(result?.rows) ? result.rows : []);
      setSummary(
        result?.summary || {
          accounts: 0,
          openAnnuity: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          days120: 0,
          paymentsTotal: 0,
          invoiceTotal: 0,
          totalAmount: 0,
          creditAmount: 0,
          openJobCount: 0,
          openJobValue: 0,
          closedJobCount: 0,
          closedJobValue: 0,
        },
      );

      const resolvedMonth = formatMonthInputValue(result?.resolvedBillingMonth);
      if (resolvedMonth && resolvedMonth !== selectedMonth) {
        setSelectedMonth(resolvedMonth);
      }

      setHasLoadedOnce(true);
    } catch (error) {
      console.error("Error fetching receivables:", error);
      toast.error("Failed to load receivables");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchReceivables(selectedMonth ? monthValueToBillingMonth(selectedMonth) : "");
  }, [fetchReceivables, selectedMonth]);

  const displayRows = useMemo(() => {
    const search = String(searchTerm || "").trim().toUpperCase();
    if (!search) return rows;

    return rows.filter((row) => {
      return (
        String(row.accountNumber || "").toUpperCase().includes(search) ||
        String(row.company || "").toUpperCase().includes(search) ||
        String(row.lastPaymentReference || "").toUpperCase().includes(search) ||
        Array.isArray(row.invoices) &&
          row.invoices.some((invoice) =>
            String(invoice.invoice_number || "").toUpperCase().includes(search),
          )
      );
    });
  }, [rows, searchTerm]);

  const handleRefresh = () => {
    fetchReceivables(selectedMonth ? monthValueToBillingMonth(selectedMonth) : "");
  };

  const handleOpenClientJobs = (accountNumber, state) => {
    const query = new URLSearchParams({
      section: "job-cards",
      jobState: state,
    });

    if (selectedMonth) {
      query.set("billingMonth", selectedMonth);
    }

    router.push(`/protected/accounts/${encodeURIComponent(accountNumber)}?${query.toString()}`);
  };

  const toggleExpanded = (accountNumber) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accountNumber]: !prev[accountNumber],
    }));
  };

  const handleOpenInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowViewer(true);
  };

  const handleDownloadInvoice = (invoice) => {
    const html = buildPrintableInvoiceHtml(invoice);
    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) {
      toast.error("Unable to open invoice window");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Receivables
          </h2>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
            Billing Month Receivables View
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-xl"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Accounts
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {String(summary.accounts || 0).padStart(2, "0")}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Open Value
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(summary.openAnnuity)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Payments Received
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            {formatCurrency(summary.paymentsTotal)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Invoiced Total
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(summary.invoiceTotal)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Open JC Value
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(summary.openJobValue)}
          </div>
          <div className="mt-1 text-xs text-slate-500">{summary.openJobCount} open jobs</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Closed JC Value
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(summary.closedJobValue)}
          </div>
          <div className="mt-1 text-xs text-slate-500">{summary.closedJobCount} closed jobs</div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
            Outstanding
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-700">
            {formatCurrency(summary.totalAmount)}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              Accounts Overview
            </div>
            <div className="text-sm text-slate-500">
              Month-driven receivables snapshot from the payment mirror and invoice ledger.
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
            <div className="relative w-full md:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search client, account, invoice..."
                className="pl-9"
              />
            </div>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full md:w-[180px]"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1740px] w-full table-fixed border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left">
                <th className="w-[260px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">Client</th>
                <th className="w-[120px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">Current.</th>
                <th className="w-[100px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">30</th>
                <th className="w-[100px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">60</th>
                <th className="w-[100px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">90</th>
                <th className="w-[100px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">120+</th>
                <th className="w-[150px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">Open JC</th>
                <th className="w-[150px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">Closed JC</th>
                <th className="w-[170px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">Payments</th>
                <th className="w-[310px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">Invoiced - Annuity</th>
                <th className="w-[120px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600 last:border-r-0">Payment State</th>
                <th className="w-[120px] px-3 py-3 font-semibold text-slate-600">Total Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading && !hasLoadedOnce
                ? Array.from({ length: 8 }).map((_, index) =>
                    renderRowSkeleton(`receivables-skeleton-${index}`),
                  )
                : displayRows.map((row) => {
                    const expanded = Boolean(expandedAccounts[row.accountNumber]);
                    const invoices = Array.isArray(row.invoices) ? row.invoices : [];
                    const visibleInvoices =
                      expanded || invoices.length <= 1 ? invoices : invoices.slice(0, 1);

                    return (
                      <tr
                        key={row.accountNumber}
                        className="border-b border-slate-200 align-top odd:bg-white even:bg-slate-50/60 hover:bg-blue-50/40"
                      >
                        <td className="border-r border-slate-200 px-3 py-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">
                              {row.company}
                            </div>
                            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                              {row.accountNumber}
                            </div>
                          </div>
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3 font-semibold text-slate-900">
                          {formatCurrency(row.openAnnuity)}
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3 text-slate-700">{formatCurrency(row.days30)}</td>
                        <td className="border-r border-slate-200 px-3 py-3 text-slate-700">{formatCurrency(row.days60)}</td>
                        <td className="border-r border-slate-200 px-3 py-3 text-slate-700">{formatCurrency(row.days90)}</td>
                        <td className="border-r border-slate-200 px-3 py-3 text-slate-700">{formatCurrency(row.days120)}</td>
                        <td className="border-r border-slate-200 px-3 py-3">
                          {row.openJobCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenClientJobs(row.accountNumber, "open")}
                              className="w-full rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-100/70"
                            >
                              <div className="font-semibold text-emerald-700">
                                {row.openJobCount} open
                              </div>
                              <div className="text-xs text-emerald-700/80">
                                {formatCurrency(row.openJobValue)}
                              </div>
                            </button>
                          ) : (
                            <div className="text-xs text-slate-400">No open jobs</div>
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3">
                          {row.closedJobCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenClientJobs(row.accountNumber, "closed")}
                              className="w-full rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2 text-left transition hover:border-blue-200 hover:bg-blue-100/70"
                            >
                              <div className="font-semibold text-blue-700">
                                {row.closedJobCount} closed
                              </div>
                              <div className="text-xs text-blue-700/80">
                                {formatCurrency(row.closedJobValue)}
                              </div>
                            </button>
                          ) : (
                            <div className="text-xs text-slate-400">No closed jobs</div>
                          )}
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3">
                          <div className="font-semibold text-emerald-700">
                            {formatCurrency(row.paymentsTotal)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.paymentsCount} payment{row.paymentsCount === 1 ? "" : "s"}
                          </div>
                          <div className="truncate text-xs text-slate-400">
                            {row.lastPaymentDate ? formatDate(row.lastPaymentDate) : "No payments"}
                          </div>
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3">
                          <div className="space-y-2">
                            {visibleInvoices.length > 0 ? (
                              visibleInvoices.map((invoice) => (
                                <div
                                  key={invoice.id || invoice.invoice_number}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate font-medium text-slate-900">
                                        {invoice.invoice_number || "PENDING"}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {formatDate(invoice.invoice_date)}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleOpenInvoice(invoice)}
                                      >
                                        <Eye className="mr-1 h-3.5 w-3.5" />
                                        View
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleDownloadInvoice(invoice)}
                                      >
                                        <Download className="mr-1 h-3.5 w-3.5" />
                                        PDF
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-slate-400">No invoice for this month</div>
                            )}

                            {invoices.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(row.accountNumber)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                              >
                                {expanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                                {expanded
                                  ? "Hide extra invoices"
                                  : `Show ${invoices.length - 1} more`}
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="border-r border-slate-200 px-3 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${getStateTone(row.paymentState)}`}
                          >
                            {row.paymentState}
                          </span>
                          {row.creditAmount > 0 ? (
                            <div className="mt-2 text-xs text-sky-700">
                              Credit {formatCurrency(row.creditAmount)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 font-semibold text-rose-700">
                          {formatCurrency(row.totalAmount)}
                        </td>
                      </tr>
                    );
                  })}

              {!loading && hasLoadedOnce && displayRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-slate-500">
                    No receivables found for the selected month.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-7xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedInvoice?.invoice_number || "Invoice Preview"}</DialogTitle>
          </DialogHeader>
          {selectedInvoice ? (
            <InvoiceReportComponent
              viewOnly
              clientLegalName={selectedInvoice.company_name || selectedInvoice.account_number}
              costCenter={{
                accountNumber: selectedInvoice.account_number,
                billingMonth: selectedInvoice.billing_month,
              }}
              invoiceData={{
                ...selectedInvoice,
                account_number: selectedInvoice.account_number,
                billing_month: selectedInvoice.billing_month,
                invoice_number: selectedInvoice.invoice_number,
                invoice_date: selectedInvoice.invoice_date,
                total_amount: Number(selectedInvoice.total_amount || 0),
                paid_amount: Number(selectedInvoice.paid_amount || 0),
                balance_due: Number(selectedInvoice.balance_due || 0),
                notes: selectedInvoice.notes || "",
                customer_vat_number: selectedInvoice.customer_vat_number,
                company_registration_number: selectedInvoice.company_registration_number,
                client_address: selectedInvoice.client_address,
                company_name: selectedInvoice.company_name,
                line_items: Array.isArray(selectedInvoice.line_items) ? selectedInvoice.line_items : [],
                invoice_items: Array.isArray(selectedInvoice.line_items) ? selectedInvoice.line_items : [],
                invoiceItems: Array.isArray(selectedInvoice.line_items) ? selectedInvoice.line_items : [],
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
