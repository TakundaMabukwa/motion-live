"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, FileDown, FileText, Loader2, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import InvoiceReportComponent from "@/components/inv/components/invoice-report";

interface InvoiceRow {
  id: string;
  account_number: string;
  billing_month: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | string | null;
  paid_amount: number | string | null;
  balance_due: number | string | null;
  payment_status: string | null;
  company_name: string | null;
  customer_vat_number: string | null;
  company_registration_number: string | null;
  client_address: string | null;
  notes: string | null;
  line_items?: unknown[];
  created_at?: string | null;
  job_card_id?: string | null;
  job_number?: string | null;
  order_number?: string | null;
  source_type?: string | null;
  created_by_name?: string | null;
  decline_reason?: string | null;
  approved?: boolean | null;
  created_by_email?: string | null;
  invoice_credited?: string | null;
}

const formatCurrency = (value: unknown) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value: unknown) => {
  if (!value) return "N/A";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusTone = (status: string | null) => {
  switch (String(status || "").toLowerCase()) {
    case "paid":
      return "bg-green-100 text-green-800";
    case "partial":
      return "bg-yellow-100 text-yellow-800";
    case "overdue":
      return "bg-red-100 text-red-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
};

const buildCreditNoteDescription = (invoice: InvoiceRow) => {
  const parts = [];
  if (invoice.invoice_credited) parts.push(`Invoice: ${invoice.invoice_credited}`);
  if (invoice.notes) parts.push(invoice.notes);
  if (invoice.decline_reason) parts.push(invoice.decline_reason);
  return parts.join(" | ") || `Credit Note ${invoice.invoice_number || "N/A"}`;
};

const buildCreditNoteLineItems = (invoice: InvoiceRow) => {
  const amountExVat = Number(invoice.total_amount || 0);
  return [
    {
      previous_reg: "-",
      new_reg: "-",
      item_code: "CREDIT-NOTE",
      description: buildCreditNoteDescription(invoice),
      comments: buildCreditNoteDescription(invoice),
      units: 1,
      quantity: 1,
      unit_price_without_vat: amountExVat,
      amountExcludingVat: amountExVat,
      vat_percent: "15.00%",
      vat_amount: amountExVat * 0.15,
      total_incl_vat: amountExVat * 1.15,
      total_including_vat: amountExVat * 1.15,
      reg: "-",
      fleetNumber: "-",
      company: invoice.company_name || invoice.account_number || "",
    },
  ];
};

interface FCAllInvoicesSectionProps {
  costCodes: string;
}

export default function FCAllInvoicesSection({ costCodes }: FCAllInvoicesSectionProps) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerOrderNumber, setViewerOrderNumber] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"invoice_number" | "company_name">("invoice_number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sourceFilter, setSourceFilter] = useState<"all" | "annuity" | "job_card" | "credit_note">("all");

  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<InvoiceRow | null>(null);
  const [creditNoteDate, setCreditNoteDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [creditNoteAmount, setCreditNoteAmount] = useState("");
  const [creditNoteReference, setCreditNoteReference] = useState("");
  const [creditNoteComment, setCreditNoteComment] = useState("");
  const [creditNoteReason, setCreditNoteReason] = useState("");
  const [processingCreditNote, setProcessingCreditNote] = useState(false);

  const fetchInvoices = async (search = "", month = selectedMonth) => {
    try {
      const isRefresh = !loading;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const query = new URLSearchParams();
      query.set("all", "1");
      if (costCodes) {
        query.set("cost_codes", costCodes);
      }
      if (search.trim()) {
        query.set("search", search.trim());
      }
      if (month.trim()) {
        query.set("month", month.trim());
      }

      const [invoicesRes, creditNotesRes] = await Promise.all([
        fetch(`/api/accounts/invoices?${query.toString()}`, { cache: "no-store" }),
        costCodes
          ? fetch(`/api/credit-notes?account_number=${encodeURIComponent(costCodes)}`, { cache: "no-store" })
          : Promise.resolve(null),
      ]);

      let invoiceRows: InvoiceRow[] = [];
      if (invoicesRes.ok) {
        const result = await invoicesRes.json();
        invoiceRows = Array.isArray(result?.invoices) ? result.invoices : [];
      } else {
        const errData = await invoicesRes.json().catch(() => ({}));
        throw new Error(errData?.error || "Failed to fetch invoices");
      }

      if (creditNotesRes && creditNotesRes.ok) {
        const cnResult = await creditNotesRes.json();
        const rawCN = Array.isArray(cnResult?.credit_notes) ? cnResult.credit_notes : [];
        const creditNoteRows: InvoiceRow[] = rawCN.map((cn: Record<string, unknown>) => ({
          id: `cn-${String(cn?.id || "")}`,
          account_number: String(cn?.account_number || "").trim(),
          billing_month: String(cn?.billing_month_applies_to || "").trim() || null,
          invoice_number: String(cn?.credit_note_number || "").trim() || null,
          invoice_date: String(cn?.credit_note_date || "").trim() || null,
          total_amount: Number(cn?.amount || 0),
          paid_amount: Number(cn?.applied_amount || 0),
          balance_due: Number(cn?.unapplied_amount || 0),
          payment_status: String(cn?.status || "applied").trim(),
          company_name: String(cn?.client_name || "").trim() || null,
          customer_vat_number: null,
          company_registration_number: null,
          client_address: null,
          notes: String(cn?.comment || "").trim() || null,
          line_items: [],
          created_at: String(cn?.created_at || "").trim() || null,
          job_card_id: null,
          job_number: null,
          order_number: null,
          source_type: "credit_note",
          created_by_name: String(cn?.created_by_email || "").trim() || null,
          decline_reason: cn?.decline_reason ? String(cn.decline_reason) : null,
          approved: cn?.approved === true ? true : false,
          created_by_email: String(cn?.created_by_email || "").trim() || null,
          invoice_credited: String(cn?.invoice_credited || cn?.reference || "").trim() || null,
        }));
        invoiceRows = [...creditNoteRows, ...invoiceRows];
      }

      setInvoices(invoiceRows);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load invoices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices(searchTerm, selectedMonth);
  }, [selectedMonth, costCodes]);

  const filteredInvoices = useMemo(() => {
    let list = invoices;

    if (sourceFilter !== "all") {
      list = list.filter((inv) =>
        sourceFilter === "annuity"
          ? inv.source_type === "account_invoice"
          : sourceFilter === "job_card"
            ? inv.source_type === "job_card_invoice"
            : inv.source_type === "credit_note",
      );
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return list;

    return list.filter((invoice) =>
      [
        invoice.invoice_number,
        invoice.account_number,
        invoice.company_name,
        invoice.customer_vat_number,
        invoice.job_number,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)),
    );
  }, [invoices, searchTerm, sourceFilter]);

  const sortedInvoices = useMemo(() => {
    const sorted = [...filteredInvoices].sort((a, b) => {
      const aVal = String(sortField === "invoice_number" ? a.invoice_number : a.company_name || "").trim().toLowerCase();
      const bVal = String(sortField === "invoice_number" ? b.invoice_number : b.company_name || "").trim().toLowerCase();
      return sortDir === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    });
    return sorted;
  }, [filteredInvoices, sortField, sortDir]);

  const invoiceRows = useMemo(() => filteredInvoices.filter((inv) => inv.source_type !== "credit_note"), [filteredInvoices]);
  const creditNoteRows = useMemo(() => filteredInvoices.filter((inv) => inv.source_type === "credit_note"), [filteredInvoices]);

  const totalInvoiceValue = useMemo(
    () => invoiceRows.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0),
    [invoiceRows],
  );

  const totalCreditNoteValue = useMemo(
    () => creditNoteRows.reduce((sum, cn) => sum + Math.abs(Number(cn.total_amount || 0)), 0),
    [creditNoteRows],
  );

  const handleRefresh = async () => {
    await fetchInvoices(searchTerm, selectedMonth);
  };

  const openCreditNoteModal = (invoice: InvoiceRow) => {
    const accountNumber = String(invoice?.account_number || "").trim();
    if (!accountNumber) {
      toast.error("No account number found for this invoice.");
      return;
    }
    setCreditNoteInvoice(invoice);
    const d = new Date();
    setCreditNoteDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setCreditNoteAmount("");
    setCreditNoteReference(invoice.invoice_number || "");
    setCreditNoteComment("");
    setCreditNoteReason("");
    setShowCreditNoteModal(true);
  };

  const closeCreditNoteModal = () => {
    setShowCreditNoteModal(false);
    setCreditNoteInvoice(null);
    setCreditNoteAmount("");
    setCreditNoteReference("");
    setCreditNoteComment("");
    setCreditNoteReason("");
  };

  const handleConfirmCreditNote = async () => {
    if (!creditNoteInvoice?.account_number) {
      toast.error("No account number found for this invoice.");
      return;
    }

    const numericAmount = Number(String(creditNoteAmount || "").replace(/,/g, ""));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a credit note amount greater than 0.");
      return;
    }

    const billingMonth = creditNoteInvoice.billing_month || selectedMonth;
    if (!billingMonth) {
      toast.error("Unable to determine the billing month for this credit note.");
      return;
    }

    setProcessingCreditNote(true);
    try {
      const response = await fetch("/api/credit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountNumber: creditNoteInvoice.account_number,
          clientName: creditNoteInvoice.company_name || null,
          billingMonth,
          creditNoteDate,
          amount: numericAmount,
          reference: creditNoteReference,
          comment: creditNoteComment,
          reason: creditNoteReason,
          invoiceCredited: creditNoteInvoice.invoice_number || null,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || "Failed to apply credit note");
      }

      toast.success(`${result?.creditNote?.credit_note_number || "Credit note"} applied to ${creditNoteInvoice.account_number}.`);
      closeCreditNoteModal();
      await fetchInvoices(searchTerm, selectedMonth);
    } catch (error) {
      console.error("Error applying credit note:", error);
      toast.error(error instanceof Error ? error.message : "Failed to apply credit note.");
    } finally {
      setProcessingCreditNote(false);
    }
  };

  const downloadInvoiceExcel = async (invoice: InvoiceRow) => {
    const items = Array.isArray(invoice.line_items) ? invoice.line_items : [];

    const toNumber = (value: unknown): number => {
      const amount = Number.parseFloat(String(value ?? "").replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(amount) ? amount : 0;
    };
    const formatAmt = (v: number) => v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatTotalAmount = (v: number) => `R ${formatAmt(v)}`;
    const formatDateInner = (value: string | null | undefined): string => {
      if (!value) return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) return value;
      return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    };

    const normalizeLine = (item: Record<string, unknown>) => {
      const units = Math.max(1, toNumber(item.units ?? item.quantity) || 1);
      const explicitUnitPrice = toNumber(item.unit_price_without_vat ?? item.unit_price_ex_vat ?? item.unit_price);
      const explicitLineExVat = toNumber(item.total_excl_vat ?? item.subtotal ?? item.amountExcludingVat);
      const exVatPerUnit = explicitUnitPrice > 0 ? explicitUnitPrice : explicitLineExVat > 0 ? explicitLineExVat / units : 0;
      const exVatLineTotal = explicitLineExVat > 0 ? explicitLineExVat : exVatPerUnit * units;
      const explicitVatAmount = toNumber(item.vat_amount ?? item.vatAmount ?? item.total_vat);
      const explicitTotalIncl = toNumber(item.total_including_vat ?? item.total_incl_vat ?? item.total_incl ?? item.totalIncl ?? item.totalRentalSub);
      const vatLineTotal = explicitVatAmount > 0 ? explicitVatAmount : explicitTotalIncl > 0 && exVatLineTotal > 0 ? Math.max(0, explicitTotalIncl - exVatLineTotal) : exVatLineTotal * 0.15;
      const totalInclLine = exVatLineTotal + vatLineTotal;
      return {
        previousReg: String(item.reg || item.previous_reg || "-"),
        newReg: String(item.fleetNumber || item.new_reg || item.reg || item.previous_reg || "-"),
        itemCode: String(item.item_code || "-"),
        description: String(item.description || "-"),
        comments: String(item.category || item.comments || item.company || ""),
        units,
        unitPrice: formatAmt(exVatPerUnit),
        vatAmount: formatAmt(vatLineTotal),
        vatPercent: String(item.vat_percent || "15%"),
        totalIncl: formatAmt(totalInclLine),
        exVat: exVatLineTotal,
        vat: vatLineTotal,
        incl: totalInclLine,
      };
    };
    const rows = (items as Record<string, unknown>[]).map(normalizeLine);
    const totals = rows.filter((row) => row.itemCode !== "Annuity").reduce((acc, row) => ({
      totalExVat: acc.totalExVat + row.exVat,
      totalVat: acc.totalVat + row.vat,
      discount: 0,
    }), { totalExVat: 0, totalVat: 0, discount: 0 });
    const totalInclVat = totals.totalExVat + totals.totalVat;

    const companyName = "Soltrack (PTY) LTD";
    const companyRegNo = "2018/095975/07";
    const companyVatNo = "4580161802";

    const clientName = invoice.company_name || "";
    const clientAddress = invoice.client_address || "";
    const companyReg = invoice.company_registration_number || "";
    const customerVat = invoice.customer_vat_number || "";
    const invoiceNumber = invoice.invoice_number || "PENDING";
    const invoiceDate = formatDateInner(invoice.invoice_date);
    const accountNumber = invoice.account_number;
    const noteText = invoice.notes || "";

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Motion Live";
    workbook.created = new Date();
    const ws = workbook.addWorksheet("Invoice");
    ws.columns = Array.from({ length: 11 }, () => ({ width: 14 }));

    const xeroTeal = "FF1A6B7B";
    const xeroTealDark = "FF0C4E5E";
    const white = "FFFFFFFF";
    const lightGray = "FFF5F5F5";
    const borderGray = "FFD0D0D0";
    const darkText = "FF333333";

    const thinBorder = {
      top: { style: "thin" as const, color: { argb: borderGray } },
      left: { style: "thin" as const, color: { argb: borderGray } },
      bottom: { style: "thin" as const, color: { argb: borderGray } },
      right: { style: "thin" as const, color: { argb: borderGray } },
    };

    const setCell = (
      row: number, col: number, value: string | number,
      opts?: { bold?: boolean; fill?: string; fontColor?: string; align?: "left" | "right" | "center"; fontSize?: number; border?: boolean },
    ) => {
      const cell = ws.getCell(row, col);
      cell.value = value;
      cell.font = { name: "Calibri", size: opts?.fontSize ?? 10, bold: opts?.bold, color: { argb: opts?.fontColor ?? darkText } };
      if (opts?.fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
      if (opts?.align) cell.alignment = { horizontal: opts.align, vertical: "middle", wrapText: true };
      if (opts?.border !== false) cell.border = thinBorder;
    };

    const merge = (r1: number, c1: number, r2: number, c2: number, value: string, opts?: { bold?: boolean; fill?: string; fontColor?: string; align?: "left" | "right" | "center"; fontSize?: number; border?: boolean }) => {
      if (r1 !== r2 || c1 !== c2) ws.mergeCells(r1, c1, r2, c2);
      setCell(r1, c1, value, opts);
    };

    let row = 1;

    merge(row, 1, row, 11, companyName, { bold: true, fontSize: 14, fontColor: white, fill: xeroTeal, align: "left", border: false });
    row++;
    setCell(row, 1, `Reg No: ${companyRegNo}`, { fontSize: 9, border: false });
    setCell(row, 6, `VAT No.: ${companyVatNo}`, { fontSize: 9, border: false });
    row += 2;

    merge(row, 1, row, 11, "TAX INVOICE", { bold: true, fontSize: 16, fontColor: white, fill: xeroTeal, align: "center", border: false });
    row += 2;

    merge(row, 1, row, 2, "", { border: false });
    setCell(row, 3, "To:", { bold: true, align: "right", border: false });
    merge(row, 4, row, 6, clientName, { bold: true, fontSize: 11, border: false });
    merge(row, 7, row, 8, "", { border: false });
    setCell(row, 9, "", { border: false });
    row++;

    merge(row, 1, row, 2, "", { border: false });
    setCell(row, 3, "", { border: false });
    merge(row, 4, row, 6, `Company Reg: ${companyReg || "-"}`, { fontSize: 9, border: false });
    setCell(row, 7, "", { border: false });
    merge(row, 9, row, 11, "", { border: false });
    row++;

    merge(row, 1, row, 2, "", { border: false });
    setCell(row, 3, "", { border: false });
    merge(row, 4, row, 6, clientAddress, { fontSize: 9, border: false });
    setCell(row, 7, "", { border: false });
    merge(row, 9, row, 11, "", { border: false });
    row += 2;

    merge(row, 1, row, 3, `Account: ${accountNumber}`, { bold: true, fontSize: 10, border: false });
    merge(row, 4, row, 6, `Customer VAT: ${customerVat || "-"}`, { bold: true, fontSize: 10, border: false });
    merge(row, 7, row, 9, `VAT %: VAT 15%`, { bold: true, fontSize: 10, border: false });
    merge(row, 10, row, 11, "", { border: false });
    row++;

    merge(row, 1, row, 3, `Invoice #: ${invoiceNumber}`, { bold: true, fontSize: 10, border: false });
    merge(row, 4, row, 6, `Date: ${invoiceDate}`, { bold: true, fontSize: 10, border: false });
    merge(row, 7, row, 9, "", { border: false });
    merge(row, 10, row, 11, "", { border: false });
    row += 2;

    const headers = ["Previous Reg", "New Reg", "Item Code", "Description", "Comments", "Units", "Unit Price", "VAT", "VAT %", "Total Incl"];
    headers.forEach((h, i) => {
      const isNum = i >= 5;
      setCell(row, i + 1, h, { bold: true, fill: xeroTealDark, fontColor: white, align: isNum ? "right" : "left", fontSize: 10 });
    });
    setCell(row, 11, "", { fill: xeroTealDark, border: false });
    row++;

    rows.forEach((r, idx) => {
      const bgColor = idx % 2 === 1 ? lightGray : undefined;
      const vals: (string | number)[] = [
        r.previousReg, r.newReg, r.itemCode, r.description, r.comments,
        r.units, r.unitPrice, r.vatAmount, r.vatPercent, r.totalIncl,
      ];
      vals.forEach((v, ci) => {
        setCell(row, ci + 1, v, { align: ci >= 5 ? "right" : "left", fill: bgColor });
      });
      setCell(row, 11, "", { border: false });
      row++;
    });

    row += 2;

    merge(row, 1, row, 7, "", { border: false });
    merge(row, 8, row, 10, "Total Ex. VAT", { bold: true, align: "right", fill: lightGray });
    setCell(row, 11, formatTotalAmount(totals.totalExVat), { bold: true, align: "right", fill: lightGray });
    row++;

    merge(row, 1, row, 7, "", { border: false });
    merge(row, 8, row, 10, "Discount", { bold: true, align: "right", fill: lightGray });
    setCell(row, 11, formatTotalAmount(totals.discount), { bold: true, align: "right", fill: lightGray });
    row++;

    merge(row, 1, row, 7, "", { border: false });
    merge(row, 8, row, 10, "VAT", { bold: true, align: "right", fill: lightGray });
    setCell(row, 11, formatTotalAmount(totals.totalVat), { bold: true, align: "right", fill: lightGray });
    row++;

    merge(row, 1, row, 7, "", { bold: true, fill: lightGray });
    merge(row, 8, row, 10, "Total Incl. VAT", { bold: true, align: "right", fill: lightGray });
    setCell(row, 11, formatTotalAmount(totalInclVat), { bold: true, align: "right", fill: lightGray });
    row += 2;

    merge(row, 1, row, 11, `Notes: ${noteText}`, { fontSize: 9, border: false });

    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
    const safeName = (clientName || accountNumber || "invoice").replace(/[^a-zA-Z0-9_-]/g, "_");
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}_${invoiceNumber}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded as Excel");
  };

  const handleOpenInvoice = async (invoice: InvoiceRow) => {
    setSelectedInvoice(invoice);
    setShowViewer(true);
    setViewerOrderNumber(null);
    const id = invoice.job_card_id || (invoice.id?.startsWith("job-card-") ? invoice.id.replace("job-card-", "") : null);
    if (id) {
      try {
        const res = await fetch(`/api/job-cards/${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          setViewerOrderNumber(data?.order_number || invoice.order_number || null);
        } else {
          setViewerOrderNumber(invoice.order_number || null);
        }
      } catch {
        setViewerOrderNumber(invoice.order_number || null);
      }
    } else {
      setViewerOrderNumber(invoice.order_number || null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-xl">Invoices</h1>
          <p className="text-xs text-gray-500">All invoices for this account</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing || loading} variant="outline" size="sm">
          {refreshing || loading ? (
            <Loader2 className="mr-1 w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 w-3 h-3" />
          )}
          {refreshing || loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="top-1/2 left-2.5 absolute w-3.5 h-3.5 text-gray-400 -translate-y-1/2 transform" />
          <Input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          max={new Date().toISOString().slice(0, 7)}
          className="w-44 h-8 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedMonth(currentMonth)}>
          Current
        </Button>
        <div className="flex rounded-md border border-input overflow-hidden">
          {(["all", "annuity", "job_card", "credit_note"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSourceFilter(opt)}
              className={`px-2.5 h-7 text-[11px] font-medium transition-colors ${sourceFilter === opt
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent"
                }`}
            >
              {opt === "all" ? "All" : opt === "annuity" ? "Annuity" : opt === "job_card" ? "Job Card" : "Credit Note"}
            </button>
          ))}
        </div>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as "invoice_number" | "company_name")}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="invoice_number">Invoice No</option>
          <option value="company_name">Company</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="flex items-center gap-1 h-8 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent"
        >
          {sortDir === "asc" ? "↑ A-Z" : "↓ Z-A"}
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="text-slate-500">
          <strong className="text-slate-700">{invoiceRows.length}</strong> invoices
        </span>
        <span className="text-slate-500">
          Total: <strong className="text-green-600">{formatCurrency(totalInvoiceValue)}</strong>
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">
          <strong className="text-slate-700">{creditNoteRows.length}</strong> credit notes
        </span>
        <span className="text-slate-500">
          Credit Total: <strong className="text-red-600">{formatCurrency(totalCreditNoteValue)}</strong>
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="max-h-[65vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="py-2 text-xs">Invoice No</TableHead>
                <TableHead className="py-2 text-xs">Job No</TableHead>
                <TableHead className="py-2 text-xs">Order No</TableHead>
                <TableHead className="py-2 text-xs">Account</TableHead>
                <TableHead className="py-2 text-xs">Company</TableHead>
                <TableHead className="py-2 text-xs">Billing Month</TableHead>
                <TableHead className="py-2 text-xs text-right">Total</TableHead>
                <TableHead className="py-2 text-xs text-right">Balance</TableHead>
                <TableHead className="py-2 text-xs">Source</TableHead>
                <TableHead className="py-2 text-xs">Created By</TableHead>
                <TableHead className="py-2 text-xs">Decline Reason</TableHead>
                <TableHead className="py-2 text-xs text-center">Approved</TableHead>
                <TableHead className="py-2 text-xs text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-xs text-slate-400 py-8">
                    <Loader2 className="mx-auto mb-2 w-4 h-4 animate-spin" />
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : sortedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-xs text-slate-400 py-8">
                    No invoices found{selectedMonth ? ` for ${selectedMonth}` : ""}
                  </TableCell>
                </TableRow>
              ) : (
                sortedInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="text-xs">
                    <TableCell className="py-1.5 font-medium">
                      {invoice.invoice_number || "PENDING"}
                      <div className="text-[10px] text-gray-400">{formatDate(invoice.invoice_date)}</div>
                    </TableCell>
                    <TableCell className="py-1.5 text-[10px] text-slate-500">
                      {invoice.job_number || "—"}
                    </TableCell>
                    <TableCell className="py-1.5 text-[10px] text-slate-500">
                      {invoice.order_number || "—"}
                    </TableCell>
                    <TableCell className="py-1.5">{invoice.account_number || "N/A"}</TableCell>
                    <TableCell className="py-1.5 max-w-[200px] truncate">
                      {invoice.company_name || "N/A"}
                    </TableCell>
                    <TableCell className="py-1.5">{formatDate(invoice.billing_month)}</TableCell>
                    <TableCell className="py-1.5 text-right">{formatCurrency(invoice.total_amount)}</TableCell>
                    <TableCell className="py-1.5 text-right">{formatCurrency(invoice.balance_due)}</TableCell>
                    <TableCell className="py-1.5">
                      {invoice.source_type === "account_invoice" ? (
                        <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0">Annuity</Badge>
                      ) : invoice.source_type === "credit_note" ? (
                        <Badge className="bg-orange-100 text-orange-800 text-[10px] px-1.5 py-0">Credit Note</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Job Card</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 max-w-[120px] truncate text-[10px] text-slate-600">
                      {invoice.created_by_name || "—"}
                    </TableCell>
                    <TableCell className="py-1.5 max-w-[150px] truncate text-[10px] text-slate-500">
                      {invoice.source_type === "credit_note" ? (invoice.decline_reason || "—") : "—"}
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      {invoice.source_type === "credit_note" ? (
                        invoice.approved ? (
                          <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Yes</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 text-[10px] px-1.5 py-0">No</Badge>
                        )
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleOpenInvoice(invoice)}>
                          <Eye className="mr-1 w-3 h-3" />
                          Pdf
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => downloadInvoiceExcel(invoice)}>
                          <FileDown className="mr-1 w-3 h-3" />
                          Excel
                        </Button>
                        {invoice.source_type !== "credit_note" && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => openCreditNoteModal(invoice)}>
                            <FileText className="mr-1 w-3 h-3" />
                            Credit Note
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-7xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice?.source_type === "credit_note"
                ? `${selectedInvoice?.invoice_number || "Credit Note"} — ${selectedInvoice?.invoice_credited || ""}`
                : selectedInvoice?.invoice_number || "Invoice Preview"
              }
            </DialogTitle>
            {viewerOrderNumber ? (
              <p className="text-xs text-slate-500">
                Order Number: <span className="font-medium text-slate-700">{viewerOrderNumber}</span>
              </p>
            ) : null}
          </DialogHeader>
          {selectedInvoice ? (
            <InvoiceReportComponent
              viewOnly
              documentTitle={selectedInvoice.source_type === "credit_note" ? "Tax Credit Note" : "Tax Invoice"}
              documentNumberLabel={selectedInvoice.source_type === "credit_note" ? "TAX CREDIT NOTE" : "TAX INVOICE"}
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
                line_items: selectedInvoice.source_type === "credit_note"
                  ? buildCreditNoteLineItems(selectedInvoice)
                  : Array.isArray(selectedInvoice.line_items) ? selectedInvoice.line_items : [],
                invoice_items: selectedInvoice.source_type === "credit_note"
                  ? buildCreditNoteLineItems(selectedInvoice)
                  : Array.isArray(selectedInvoice.line_items) ? selectedInvoice.line_items : [],
                invoiceItems: selectedInvoice.source_type === "credit_note"
                  ? buildCreditNoteLineItems(selectedInvoice)
                  : Array.isArray(selectedInvoice.line_items) ? selectedInvoice.line_items : [],
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {showCreditNoteModal && creditNoteInvoice && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
          <div className="flex flex-col bg-white shadow-2xl rounded-xl w-full max-w-2xl max-h-[90vh]">
            <div className="flex flex-shrink-0 justify-between items-center px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">Create Credit Note</h3>
                <p className="text-slate-500 text-sm mt-0.5">{creditNoteInvoice.company_name || creditNoteInvoice.account_number}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeCreditNoteModal}
                disabled={processingCreditNote}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 p-6 overflow-y-auto">
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Invoice Being Credited</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500 text-xs">Invoice Number</div>
                    <div className="font-medium text-slate-900">{creditNoteInvoice.invoice_number || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">Account</div>
                    <div className="font-medium text-slate-900">{creditNoteInvoice.account_number}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">Client</div>
                    <div className="font-medium text-slate-900">{creditNoteInvoice.company_name || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">Invoice Amount</div>
                    <div className="font-medium text-slate-900">{formatCurrency(creditNoteInvoice.total_amount)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">Balance Due</div>
                    <div className="font-medium text-slate-900">{formatCurrency(creditNoteInvoice.balance_due)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">Billing Month</div>
                    <div className="font-medium text-slate-900">{creditNoteInvoice.billing_month || "N/A"}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-medium text-slate-700 text-sm">Invoice Credited</label>
                <Input
                  value={creditNoteInvoice.invoice_number || ""}
                  disabled
                  className="bg-slate-50 text-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-medium text-slate-700 text-sm">Credit Note Date</label>
                  <Input
                    type="date"
                    value={creditNoteDate}
                    onChange={(e) => setCreditNoteDate(e.target.value)}
                    disabled={processingCreditNote}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-slate-700 text-sm">Amount (Ex VAT)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={creditNoteAmount}
                    onChange={(e) => setCreditNoteAmount(e.target.value)}
                    disabled={processingCreditNote}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-medium text-slate-700 text-sm">Reference</label>
                  <Input
                    value={creditNoteReference}
                    onChange={(e) => setCreditNoteReference(e.target.value)}
                    disabled={processingCreditNote}
                    placeholder="Invoice number or reference"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-slate-700 text-sm">Reason</label>
                  <Input
                    value={creditNoteReason}
                    onChange={(e) => setCreditNoteReason(e.target.value)}
                    disabled={processingCreditNote}
                    placeholder="Reason for credit note"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-medium text-slate-700 text-sm">Comment</label>
                <textarea
                  value={creditNoteComment}
                  onChange={(e) => setCreditNoteComment(e.target.value)}
                  disabled={processingCreditNote}
                  rows={3}
                  placeholder="Additional comments"
                  className="px-3 py-2 border border-slate-200 rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-blue-700 text-xs font-medium">Current Balance</div>
                  <div className="font-semibold text-slate-900">{formatCurrency(creditNoteInvoice.balance_due)}</div>
                </div>
                <div>
                  <div className="text-blue-700 text-xs font-medium">After Credit</div>
                  <div className="font-semibold text-slate-900">
                    {formatCurrency(
                      Math.max(0, Number(creditNoteInvoice.balance_due || 0) - Number(String(creditNoteAmount || "").replace(/,/g, "")))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <Button variant="outline" onClick={closeCreditNoteModal} disabled={processingCreditNote} className="border-slate-200">
                Cancel
              </Button>
              <Button onClick={handleConfirmCreditNote} disabled={processingCreditNote} className="bg-blue-600 hover:bg-blue-700">
                {processingCreditNote ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying...</>
                ) : (
                  "Apply Credit Note"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
