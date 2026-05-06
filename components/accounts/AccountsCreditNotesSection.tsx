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

interface AccountCreditNoteRow {
  id: string;
  credit_note_number: string | null;
  account_number: string;
  billing_month_applies_to: string | null;
  credit_note_date: string | null;
  amount: number | string | null;
  applied_amount: number | string | null;
  unapplied_amount: number | string | null;
  status: string | null;
  reference: string | null;
  comment: string | null;
  reason: string | null;
  company_name: string | null;
  customer_vat_number: string | null;
  company_registration_number: string | null;
  client_address: string | null;
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
    case "applied":
      return "bg-green-100 text-green-800";
    case "partial":
      return "bg-yellow-100 text-yellow-800";
    case "unapplied":
      return "bg-blue-100 text-blue-800";
    case "void":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

const buildCreditNoteDescription = (creditNote: AccountCreditNoteRow) => {
  const description = [creditNote.comment, creditNote.reason, creditNote.reference]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" | ");

  return description || `Credit Note ${creditNote.credit_note_number || "N/A"}`;
};

const buildCreditNoteLineItems = (creditNote: AccountCreditNoteRow) => {
  const amountExVat = Number(creditNote.amount || 0);
  return [
    {
      previous_reg: "-",
      new_reg: "-",
      item_code: "CREDIT-NOTE",
      description: buildCreditNoteDescription(creditNote),
      comments: "Credit Note Amount (Excl. VAT)",
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
      company: creditNote.company_name || creditNote.account_number || "",
      category: "Credit Note",
    },
  ];
};

export default function AccountsCreditNotesSection() {
  const [creditNotes, setCreditNotes] = useState<AccountCreditNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCreditNote, setSelectedCreditNote] = useState<AccountCreditNoteRow | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const fetchCreditNotes = async () => {
    try {
      const isRefresh = !loading;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const query = new URLSearchParams();
      query.set("all", "1");

      const response = await fetch(`/api/accounts/credit-notes?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to fetch credit notes");
      }

      const result = await response.json();
      setCreditNotes(Array.isArray(result?.creditNotes) ? result.creditNotes : []);
    } catch (error) {
      console.error("Error fetching credit notes:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load credit notes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCreditNotes();
  }, []);

  const filteredCreditNotes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return creditNotes;
    }

    return creditNotes.filter((creditNote) =>
      [
        creditNote.credit_note_number,
        creditNote.account_number,
        creditNote.company_name,
        creditNote.reference,
        creditNote.comment,
        creditNote.reason,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)),
    );
  }, [creditNotes, searchTerm]);

  const totalCreditValue = useMemo(
    () =>
      filteredCreditNotes.reduce(
        (sum, creditNote) => sum + Number(creditNote.amount || 0),
        0,
      ),
    [filteredCreditNotes],
  );

  const unappliedCreditValue = useMemo(
    () =>
      filteredCreditNotes.reduce(
        (sum, creditNote) => sum + Number(creditNote.unapplied_amount || 0),
        0,
      ),
    [filteredCreditNotes],
  );

  const handleRefresh = async () => {
    await fetchCreditNotes();
  };

  const handleOpenCreditNote = (creditNote: AccountCreditNoteRow) => {
    setSelectedCreditNote(creditNote);
    setShowViewer(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">Credit Notes</h1>
          <p className="mt-2 text-gray-600">
            List and view stored account credit notes from the accounts module
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
            <CardTitle className="text-sm font-medium">Stored Credit Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-blue-600 text-2xl">{filteredCreditNotes.length}</div>
            <p className="text-muted-foreground text-xs">Visible credit note records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-green-600 text-2xl">{formatCurrency(totalCreditValue)}</div>
            <p className="text-muted-foreground text-xs">Amounts are Excl. VAT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unapplied Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-red-600 text-2xl">
              {formatCurrency(unappliedCreditValue)}
            </div>
            <p className="text-muted-foreground text-xs">Credit still available</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Credit Notes</CardTitle>
          <p className="text-gray-600 text-sm">
            Search by credit note number, account number, company, or note text
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
            <Input
              type="text"
              placeholder="Search credit notes..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-blue-600" />
            Credit Note List
          </CardTitle>
          <p className="text-gray-600 text-sm">
            Open any credit note to view the rendered document with the credit note number
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <Loader2 className="mx-auto mb-4 w-6 h-6 animate-spin" />
              Loading credit notes...
            </div>
          ) : filteredCreditNotes.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">No credit notes found</h3>
              <p className="text-gray-500">
                {searchTerm.trim()
                  ? `No credit notes match "${searchTerm.trim()}".`
                  : "No account credit notes are available yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note No</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Billing Month</TableHead>
                    <TableHead className="text-right">Amount (Excl)</TableHead>
                    <TableHead className="text-right">Applied</TableHead>
                    <TableHead className="text-right">Unapplied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreditNotes.map((creditNote) => (
                    <TableRow key={creditNote.id}>
                      <TableCell className="font-medium">
                        {creditNote.credit_note_number || "PENDING"}
                        <div className="text-xs text-gray-500">
                          {formatDate(creditNote.credit_note_date)}
                        </div>
                      </TableCell>
                      <TableCell>{creditNote.account_number || "N/A"}</TableCell>
                      <TableCell>
                        <div className="max-w-[260px] truncate">
                          {creditNote.company_name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(creditNote.billing_month_applies_to)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(creditNote.amount)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(creditNote.applied_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(creditNote.unapplied_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusTone(creditNote.status)}>
                          {String(creditNote.status || "pending")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenCreditNote(creditNote)}
                        >
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
              {selectedCreditNote?.credit_note_number || "Credit Note Preview"}
            </DialogTitle>
          </DialogHeader>
          {selectedCreditNote ? (
            <InvoiceReportComponent
              viewOnly
              documentTitle="Tax Credit Note"
              documentNumberLabel="TAX CREDIT NOTE"
              clientLegalName={
                selectedCreditNote.company_name || selectedCreditNote.account_number
              }
              costCenter={{
                accountNumber: selectedCreditNote.account_number,
                billingMonth: selectedCreditNote.billing_month_applies_to,
              }}
              invoiceData={{
                id: selectedCreditNote.id,
                account_number: selectedCreditNote.account_number,
                billing_month: selectedCreditNote.billing_month_applies_to,
                invoice_number: selectedCreditNote.credit_note_number,
                invoice_date: selectedCreditNote.credit_note_date,
                total_amount: Number(selectedCreditNote.amount || 0),
                paid_amount: Number(selectedCreditNote.applied_amount || 0),
                balance_due: Number(selectedCreditNote.unapplied_amount || 0),
                notes: "",
                customer_vat_number: selectedCreditNote.customer_vat_number,
                company_registration_number: selectedCreditNote.company_registration_number,
                client_address: selectedCreditNote.client_address,
                company_name: selectedCreditNote.company_name,
                line_items: buildCreditNoteLineItems(selectedCreditNote),
                invoice_items: buildCreditNoteLineItems(selectedCreditNote),
                invoiceItems: buildCreditNoteLineItems(selectedCreditNote),
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
