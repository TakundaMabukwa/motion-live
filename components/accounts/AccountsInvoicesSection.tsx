"use client";

import { useEffect, useRef, useState } from "react";
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
import { Eye, FileDown, Loader2, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import InvoiceReportComponent from "@/components/inv/components/invoice-report";

interface AccountInvoiceRow {
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

export default function AccountsInvoicesSection() {
  const [invoices, setInvoices] = useState<AccountInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedInvoice, setSelectedInvoice] = useState<AccountInvoiceRow | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerOrderNumber, setViewerOrderNumber] = useState<string | null>(null);
  const [lookupInvoiceNumber, setLookupInvoiceNumber] = useState("");
  const [lookupSearching, setLookupSearching] = useState(false);
  const originalInvoicesRef = useRef<AccountInvoiceRow[] | null>(null);

  const fetchInvoices = async (month = selectedMonth) => {
    try {
      const isRefresh = !loading;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const query = new URLSearchParams();
      query.set("all", "1");
      if (month.trim()) {
        query.set("month", month.trim());
      }

      const response = await fetch(`/api/accounts/invoices?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to fetch invoices");
      }

      const result = await response.json();
      setInvoices(Array.isArray(result?.invoices) ? result.invoices : []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load invoices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices(selectedMonth);
  }, [selectedMonth]);

  const totalInvoiceValue = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  const handleRefresh = async () => {
    await fetchInvoices(selectedMonth);
  };

  const handleLookupSearch = async () => {
    const invoiceNumber = lookupInvoiceNumber.trim();
    if (!invoiceNumber) {
      toast.error("Please enter an invoice number to search");
      return;
    }

    if (originalInvoicesRef.current === null) {
      originalInvoicesRef.current = [...invoices];
    }

    setLookupSearching(true);
    try {
      const res = await fetch(
        `/api/accounts/invoices/lookup?invoice_number=${encodeURIComponent(invoiceNumber)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "Lookup failed");
      }
      const data = await res.json();
      const lookupResults: AccountInvoiceRow[] = Array.isArray(data?.invoices) ? data.invoices : [];

      if (lookupResults.length === 0) {
        toast.info("No invoices found matching that number");
        return;
      }

      setInvoices(lookupResults);
      toast.success(`Found ${lookupResults.length} invoice(s)`);
    } catch (error) {
      console.error("Lookup search error:", error);
      toast.error(error instanceof Error ? error.message : "Lookup failed");
    } finally {
      setLookupSearching(false);
    }
  };

  const handleLookupClear = () => {
    originalInvoicesRef.current = null;
    setLookupInvoiceNumber("");
    fetchInvoices(selectedMonth);
  };

  const downloadInvoiceExcel = async (invoice: AccountInvoiceRow) => {
    const items = Array.isArray(invoice.line_items) ? invoice.line_items : [];

    const toNumber = (value: unknown): number => {
      const amount = Number.parseFloat(String(value ?? "").replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(amount) ? amount : 0;
    };
    const formatAmt = (v: number) => v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatTotalAmount = (v: number) => `R ${formatAmt(v)}`;
    const formatDate = (value: string | null | undefined): string => {
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
    const invoiceDate = formatDate(invoice.invoice_date);
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

  const handleOpenInvoice = async (invoice: AccountInvoiceRow) => {
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
          <p className="text-xs text-gray-500">Stored account invoices</p>
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

      <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
        <div className="relative flex-1 max-w-xs">
          <Search className="top-1/2 left-2.5 absolute w-3.5 h-3.5 text-gray-400 -translate-y-1/2 transform" />
          <Input
            type="text"
            placeholder="Lookup invoice number..."
            value={lookupInvoiceNumber}
            onChange={(e) => setLookupInvoiceNumber(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleLookupSearch(); }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleLookupSearch}
          disabled={lookupSearching}
        >
          {lookupSearching ? (
            <Loader2 className="mr-1 w-3 h-3 animate-spin" />
          ) : (
            <Search className="mr-1 w-3 h-3" />
          )}
          {lookupSearching ? "Searching..." : "Search"}
        </Button>
        {originalInvoicesRef.current !== null && (
          <Button type="button" variant="outline" size="sm" onClick={handleLookupClear}>
            <X className="mr-1 w-3 h-3" />
            Clear
          </Button>
        )}
        <span className="text-[11px] text-slate-400">
          Searches both annuity and job card invoices
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="text-slate-500">
          <strong className="text-slate-700">{invoices.length}</strong> invoices
        </span>
        <span className="text-slate-500">
          Total: <strong className="text-green-600">{formatCurrency(totalInvoiceValue)}</strong>
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="max-h-[65vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="py-2 text-xs">Invoice No</TableHead>
                <TableHead className="py-2 text-xs">Order No</TableHead>
                <TableHead className="py-2 text-xs">Account</TableHead>
                <TableHead className="py-2 text-xs">Company</TableHead>
                <TableHead className="py-2 text-xs">Billing Month</TableHead>
                <TableHead className="py-2 text-xs text-right">Total</TableHead>
                <TableHead className="py-2 text-xs text-right">Balance</TableHead>
                <TableHead className="py-2 text-xs">Status</TableHead>
                <TableHead className="py-2 text-xs">Source</TableHead>
                <TableHead className="py-2 text-xs">Created By</TableHead>
                <TableHead className="py-2 text-xs text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-xs text-slate-400 py-8">
                    <Loader2 className="mx-auto mb-2 w-4 h-4 animate-spin" />
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-xs text-slate-400 py-8">
                    No invoices found{selectedMonth ? ` for ${selectedMonth}` : ""}
                  </TableCell>
                </TableRow>
              ) : (
                [...invoices].sort((a, b) => String(a.invoice_number || "").localeCompare(String(b.invoice_number || ""))).map((invoice) => (
                  <TableRow key={invoice.id} className="text-xs">
                    <TableCell className="py-1.5 font-medium">
                      {invoice.invoice_number || "PENDING"}
                      <div className="text-[10px] text-gray-400">{formatDate(invoice.invoice_date)}</div>
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
                      <Badge className={`${getStatusTone(invoice.payment_status)} text-[10px] px-1.5 py-0`}>
                        {String(invoice.payment_status || "pending")}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      {invoice.source_type === "account_invoice" ? (
                        <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0">Annuity</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Job Card</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 max-w-[120px] truncate text-[10px] text-slate-600">
                      {invoice.created_by_name || "—"}
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleOpenInvoice(invoice)}>
                          <Eye className="mr-1 w-3 h-3" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => downloadInvoiceExcel(invoice)}>
                          <FileDown className="mr-1 w-3 h-3" />
                          Excel
                        </Button>
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
              {selectedInvoice?.invoice_number || "Invoice Preview"}
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
