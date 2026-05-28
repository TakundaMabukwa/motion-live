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
import { Eye, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
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
  const [searchTerm, setSearchTerm] = useState("");
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedInvoice, setSelectedInvoice] = useState<AccountInvoiceRow | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerOrderNumber, setViewerOrderNumber] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"invoice_number" | "company_name">("invoice_number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sourceFilter, setSourceFilter] = useState<"all" | "annuity" | "job_card">("all");

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
      if (search.trim()) {
        query.set("search", search.trim());
      }
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
    fetchInvoices(searchTerm, selectedMonth);
  }, [selectedMonth]);

  const filteredInvoices = useMemo(() => {
    let list = invoices;

    if (sourceFilter !== "all") {
      list = list.filter((inv) =>
        sourceFilter === "annuity"
          ? inv.source_type === "account_invoice"
          : inv.source_type === "job_card_invoice",
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

  const totalInvoiceValue = useMemo(
    () => filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0),
    [filteredInvoices],
  );

  const handleRefresh = async () => {
    await fetchInvoices(searchTerm, selectedMonth);
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
          {(["all", "annuity", "job_card"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSourceFilter(opt)}
              className={`px-2.5 h-7 text-[11px] font-medium transition-colors ${
                sourceFilter === opt
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {opt === "all" ? "All" : opt === "annuity" ? "Annuity" : "Job Card"}
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
          <strong className="text-slate-700">{filteredInvoices.length}</strong> invoices
        </span>
        <span className="text-slate-500">
          Total: <strong className="text-green-600">{formatCurrency(totalInvoiceValue)}</strong>
        </span>
        <span className="text-slate-500">
          Balance: <strong className="text-red-600">
            {formatCurrency(filteredInvoices.reduce((sum, i) => sum + Number(i.balance_due || 0), 0))}
          </strong>
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
              ) : sortedInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-xs text-slate-400 py-8">
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
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleOpenInvoice(invoice)}>
                        <Eye className="mr-1 w-3 h-3" />
                        View
                      </Button>
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
