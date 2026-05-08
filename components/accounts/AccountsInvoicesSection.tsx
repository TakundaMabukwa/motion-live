"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Eye, FileText, Loader2, RefreshCw, Search } from "lucide-react";
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
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<AccountInvoiceRow | null>(null);
  const [showViewer, setShowViewer] = useState(false);

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
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return invoices;
    }

    return invoices.filter((invoice) =>
      [
        invoice.invoice_number,
        invoice.account_number,
        invoice.company_name,
        invoice.customer_vat_number,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)),
    );
  }, [invoices, searchTerm]);

  const totalInvoiceValue = useMemo(
    () => filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0),
    [filteredInvoices],
  );

  const handleRefresh = async () => {
    await fetchInvoices(searchTerm, selectedMonth);
  };

  const handleOpenInvoice = (invoice: AccountInvoiceRow) => {
    setSelectedInvoice(invoice);
    setShowViewer(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">Invoices</h1>
          <p className="mt-2 text-gray-600">
            List and view stored account invoices from the accounts module
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing || loading} variant="outline">
          {refreshing || loading ? (
            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 w-4 h-4" />
          )}
          {refreshing || loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stored Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-blue-600 text-2xl">{filteredInvoices.length}</div>
            <p className="text-muted-foreground text-xs">Visible invoice records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoice Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-green-600 text-2xl">{formatCurrency(totalInvoiceValue)}</div>
            <p className="text-muted-foreground text-xs">Across filtered invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-red-600 text-2xl">
              {formatCurrency(
                filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.balance_due || 0), 0),
              )}
            </div>
            <p className="text-muted-foreground text-xs">Balance still due</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Invoices</CardTitle>
          <p className="text-gray-600 text-sm">
            Search by invoice number, account number, company, or VAT number, and filter by month
          </p>
        </CardHeader>
        <CardContent>
          <div className="gap-3 grid grid-cols-1 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
              <Input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              max={new Date().toISOString().slice(0, 7)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedMonth("")}
              disabled={!selectedMonth}
            >
              Clear Month
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-blue-600" />
            Invoice List
          </CardTitle>
          <p className="text-gray-600 text-sm">
            Open any invoice to view the rendered tax invoice with current customer data
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <Loader2 className="mx-auto mb-4 w-6 h-6 animate-spin" />
              Loading invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">No invoices found</h3>
              <p className="text-gray-500">
                {searchTerm.trim()
                  ? `No invoices match "${searchTerm.trim()}".`
                  : "No account invoices are available yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Billing Month</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number || "PENDING"}
                        <div className="text-xs text-gray-500">{formatDate(invoice.invoice_date)}</div>
                      </TableCell>
                      <TableCell>{invoice.account_number || "N/A"}</TableCell>
                      <TableCell>
                        <div className="max-w-[260px] truncate">
                          {invoice.company_name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.billing_month)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.balance_due)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusTone(invoice.payment_status)}>
                          {String(invoice.payment_status || "pending")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline" onClick={() => handleOpenInvoice(invoice)}>
                          <Eye className="mr-1 w-4 h-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        <DialogContent className="max-w-7xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInvoice?.invoice_number || "Invoice Preview"}
            </DialogTitle>
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
