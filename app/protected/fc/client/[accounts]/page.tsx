"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useFCSidebar } from "@/components/fc/FCSidebarLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  Search,
  Briefcase,
  FileText,
  Eye,
  History,
  FileDown,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import InvoiceReportComponent from "@/components/inv/components/invoice-report";
import ClientInfoModal from "@/components/fc/ClientInfoModal";
import FCAnnuityInvoicesSection from "@/components/fc/FCAnnuityInvoicesSection";
import FCJobCardInvoicesSection from "@/components/fc/FCJobCardInvoicesSection";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (value: string | null | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ROLE_COLUMNS = [
  { key: "fc", label: "FC" },
  { key: "inv", label: "INV" },
  { key: "admin", label: "ADMIN" },
  { key: "tech", label: "TECH" },
  { key: "unassigned", label: "UNASSIGNED" },
];

const ROLE_ALIASES: Record<string, string> = {
  fc: "fc",
  "field coordinator": "fc",
  field_coordinator: "fc",
  "field-coordinator": "fc",
  inv: "inv",
  inventory: "inv",
  admin: "admin",
  administrator: "admin",
  tech: "tech",
  technician: "tech",
  unassigned: "unassigned",
};

const CLOSED_STATUSES = new Set([
  "completed",
  "invoiced",
  "closed",
  "cancelled",
  "canceled",
]);

const normalizeRole = (role: string | null | undefined) =>
  ROLE_ALIASES[String(role || "").trim().toLowerCase()] || null;

const isClosedJob = (job: Record<string, any>) =>
  CLOSED_STATUSES.has(String(job.job_status || "").toLowerCase()) ||
  CLOSED_STATUSES.has(String(job.status || "").toLowerCase());

const deriveBoardRole = (job: Record<string, any>) =>
  normalizeRole(job.escalation_role) ||
  normalizeRole(job.move_to) ||
  (["admin_created", "moved_to_admin"].includes(
    String(job.status || "").toLowerCase()
  )
    ? "admin"
    : null) ||
  normalizeRole(job.role) ||
  "unassigned";

const getAgeDays = (value: string | null | undefined) => {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
};

const getAgeTone = (days: number) => {
  if (days <= 3) return "bg-emerald-500";
  if (days <= 7) return "bg-orange-500";
  return "bg-rose-600";
};

const getJobValue = (job: Record<string, any>) => {
  let products: any[] = [];
  try {
    if (typeof job.quotation_products === "string") {
      products = JSON.parse(job.quotation_products);
    } else if (Array.isArray(job.quotation_products)) {
      products = job.quotation_products;
    }
  } catch {}

  const productTotal = products.reduce(
    (sum: number, p: any) => sum + Number(p?.total_price || 0),
    0
  );
  if (productTotal > 0) return productTotal;

  for (const key of ["quotation_total_amount", "estimated_cost", "actual_cost"]) {
    const val = Number(job[key] || 0);
    if (val > 0) return val;
  }
  return 0;
};

// ============================================================
// JOB POOL TAB
// ============================================================
function ClientJobPoolSection({ costCodes }: { costCodes: string }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (costCodes) params.set("cost_codes", costCodes);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/accounts/job-pool?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch job pool");
      const data = await res.json();
      setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
    } catch (err) {
      toast.error("Failed to load job pool");
    } finally {
      setLoading(false);
    }
  }, [costCodes, search]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const groupedJobs = useMemo(() => {
    const grouped: Record<string, any[]> = ROLE_COLUMNS.reduce((acc, role) => {
      acc[role.key] = [];
      return acc;
    }, {} as Record<string, any[]>);

    const openJobs = jobs.filter((j: any) => !isClosedJob(j));

    openJobs.forEach((job: any) => {
      const role = deriveBoardRole(job);
      const hasTech =
        String(job.technician_name || "").trim().length > 0 ||
        String(job.assigned_technician_id || "").trim().length > 0;

      if (grouped[role]) {
        grouped[role].push(job);
      }
      if (hasTech && role !== "tech") {
        grouped.tech.push(job);
      }
    });

    return grouped;
  }, [jobs]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const role of ROLE_COLUMNS) {
      t[role.key] = groupedJobs[role.key].reduce(
        (sum: number, j: any) => sum + getJobValue(j),
        0
      );
    }
    return t;
  }, [groupedJobs]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Job Pool</h2>
          <p className="text-[10px] text-gray-500">
            {jobs.filter((j) => !isClosedJob(j)).length} open job{jobs.filter((j) => !isClosedJob(j)).length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-40 text-xs pl-7"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchJobs} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 mt-2 shrink-0">
        {ROLE_COLUMNS.map((role) => (
          <div key={role.key} className="flex items-center gap-1.5 text-[10px]">
            <span className="font-medium text-gray-600">{role.label}:</span>
            <span className="font-bold text-gray-900">{groupedJobs[role.key].length}</span>
            <span className="text-gray-400">({formatCurrency(totals[role.key])})</span>
          </div>
        ))}
      </div>

      {/* Columns */}
      <div className="flex-1 min-h-0 mt-2 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="flex gap-2 h-full">
            {ROLE_COLUMNS.map((role) => (
              <div
                key={role.key}
                className="flex-1 min-w-[200px] bg-gray-50 rounded-lg border border-gray-200 p-2 overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold text-gray-600 uppercase">
                    {role.label}
                  </h3>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {groupedJobs[role.key].length}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {groupedJobs[role.key].map((job) => {
                    const age = getAgeDays(job.updated_at || job.created_at);
                    const dotColor = getAgeTone(age);
                    return (
                      <div
                        key={job.id}
                        className="bg-white rounded-md border border-gray-200 p-2 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${dotColor}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-medium text-gray-900 truncate">
                              {job.job_number || "No number"}
                            </p>
                            <p className="text-[9px] text-gray-500 truncate">
                              {job.customer_name || "No customer"}
                            </p>
                            <p className="text-[9px] text-gray-400 truncate">
                              {job.vehicle_registration || "No reg"}
                            </p>
                          </div>
                          <span className="text-[8px] text-gray-400 shrink-0">
                            {age}d
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[9px] font-medium text-gray-700">
                            {formatCurrency(job.job_value)}
                          </span>
                          <span className="text-[8px] text-gray-400">
                            {job.new_account_number || ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {groupedJobs[role.key].length === 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-4">
                      No jobs
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ACCOUNTS TAB
// ============================================================
function ClientAccountsSection({ costCodes, costCode }: { costCodes: string; costCode: string }) {
  const [activeSubTab, setActiveSubTab] = useState("invoices");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerOrderNumber, setViewerOrderNumber] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ all: "1", cost_codes: costCodes });
      if (selectedMonth) params.set("month", selectedMonth);

      const res = await fetch(`/api/accounts/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data = await res.json();
      setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
    } catch (err) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [costCodes, selectedMonth]);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ cost_codes: costCodes });
      const res = await fetch(`/api/accounts/job-pool?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(Array.isArray(data?.jobs) ? data.jobs : []);
    } catch (err) {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [costCodes]);

  useEffect(() => {
    if (activeSubTab === "invoices") fetchInvoices();
    else if (activeSubTab === "jobs") fetchJobs();
  }, [activeSubTab, fetchInvoices, fetchJobs]);

  const filteredInvoices = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.company_name?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      const aDate = a.invoice_date || a.created_at || "";
      const bDate = b.invoice_date || b.created_at || "";
      return bDate.localeCompare(aDate);
    });
  }, [filteredInvoices]);

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(
      (job) =>
        job.job_number?.toLowerCase().includes(q) ||
        job.customer_name?.toLowerCase().includes(q) ||
        job.vehicle_registration?.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  const handleOpenInvoice = async (invoice: any) => {
    setSelectedInvoice(invoice);
    setViewerOrderNumber(null);
    setShowViewer(true);
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

  const downloadInvoiceExcel = async (invoice: any) => {
    const items = Array.isArray(invoice.line_items) ? invoice.line_items : [];
    const ExcelJS = (await import("exceljs")).default;

    const toNumber = (value: unknown): number => {
      const amount = Number.parseFloat(String(value ?? "").replace(/[^0-9.\-]/g, ""));
      return Number.isFinite(amount) ? amount : 0;
    };
    const formatAmt = (v: number) => v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatTotalAmount = (v: number) => `R ${formatAmt(v)}`;
    const formatDateExcel = (value: string | null | undefined): string => {
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
    const invoiceDate = formatDateExcel(invoice.invoice_date);
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sub tabs */}
      <div className="flex items-center gap-1 shrink-0">
        {[
          { key: "invoices", label: "Invoices", icon: FileText },
          { key: "jobs", label: "Job Cards", icon: Briefcase },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveSubTab(tab.key);
              setSearch("");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSubTab === tab.key
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + month filter */}
      <div className="flex items-center gap-2 mt-2 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs pl-7"
          />
        </div>
        {activeSubTab === "invoices" && (
          <>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-7 text-xs border border-gray-200 rounded px-2"
            />
            <Button variant="outline" size="sm" onClick={() => setSelectedMonth(currentMonth)} className="h-7 text-xs">
              Current
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={activeSubTab === "invoices" ? fetchInvoices : fetchJobs} className="h-7 text-xs">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 mt-2 bg-white border border-gray-200 rounded-lg overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        ) : activeSubTab === "invoices" ? (
          sortedInvoices.length === 0 ? (
            <div className="text-center text-xs text-gray-500 py-12">No invoices found</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">Invoice #</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">Company</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">Date</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">Month</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500">Amount</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-900">{inv.invoice_number || "PENDING"}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[180px]">{inv.company_name || "-"}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{inv.billing_month || "-"}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(inv.total_amount)}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleOpenInvoice(inv)}>
                          <Eye className="mr-1 h-3 w-3" />
                          View PDF
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => downloadInvoiceExcel(inv)}>
                          <FileDown className="mr-1 h-3 w-3" />
                          Download Excel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          filteredJobs.length === 0 ? (
            <div className="text-center text-xs text-gray-500 py-12">No jobs found</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">Job #</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">Customer</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">Vehicle</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500">Value</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredJobs.map((job) => {
                  const role = deriveBoardRole(job);
                  const closed = isClosedJob(job);
                  return (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{job.job_number || "-"}</td>
                      <td className="px-3 py-2 text-gray-700 truncate max-w-[150px]">{job.customer_name || "-"}</td>
                      <td className="px-3 py-2 text-gray-500">{job.vehicle_registration || "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge className={`text-[9px] px-1.5 py-0 ${
                          closed ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"
                        }`}>
                          {closed ? "Closed" : "Open"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCurrency(job.job_value)}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{role}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Invoice viewer dialog */}
      {showViewer && selectedInvoice && (
        <Dialog open={showViewer} onOpenChange={setShowViewer}>
          <DialogContent className="max-w-7xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedInvoice.invoice_number || "Invoice Preview"}</DialogTitle>
              {viewerOrderNumber && (
                <p className="text-xs text-gray-500">
                  Order: <span className="font-medium text-gray-700">{viewerOrderNumber}</span>
                </p>
              )}
            </DialogHeader>
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
              onInvoiceGenerated={() => {}}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function FCDashboardPage() {
  const { accounts, selectedCostCenter, loading: ctxLoading } = useFCSidebar();
  const costCode = selectedCostCenter?.cost_code === "all" 
    ? accounts.split(",")[0] || "" 
    : selectedCostCenter?.cost_code || accounts.split(",")[0] || "";
  const costCodes = selectedCostCenter?.cost_code === "all" 
    ? accounts 
    : selectedCostCenter?.cost_code || accounts;

  const [activeTab, setActiveTab] = useState("annuity");
  const [showClientInfo, setShowClientInfo] = useState(false);

  if (ctxLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top tabs */}
      <div className="flex items-center gap-1 shrink-0 border-b border-gray-200 pb-2">
        {[
          { key: "annuity", label: "Annuity", icon: FileText },
          { key: "job-cards", label: "Job Cards", icon: Briefcase },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowClientInfo(true)}
          className="h-8 text-xs gap-1.5"
          title="Update client billing info"
        >
          <Info className="h-3.5 w-3.5" />
          Customer Billing Info
        </Button>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 mt-2">
        {activeTab === "annuity" ? (
          <FCAnnuityInvoicesSection costCodes={costCodes} />
        ) : (
          <FCJobCardInvoicesSection costCodes={costCodes} />
        )}
      </div>

      <ClientInfoModal
        open={showClientInfo}
        onOpenChange={setShowClientInfo}
        costCode={costCode}
        companyName={selectedCostCenter?.trading_name || selectedCostCenter?.company || selectedCostCenter?.company_name}
        multipleSelected={accounts.includes(",")}
      />
    </div>
  );
}
