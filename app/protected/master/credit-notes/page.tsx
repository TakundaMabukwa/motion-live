"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Eye, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface CreditNote {
  id: string;
  credit_note_number: string;
  account_number: string;
  client_name: string | null;
  billing_month_applies_to: string;
  credit_note_date: string;
  amount: number;
  applied_amount: number;
  unapplied_amount: number;
  reference: string | null;
  comment: string | null;
  reason: string | null;
  status: string;
  account_invoice_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  created_by_email: string | null;
  approved: boolean | null;
  decline_reason: string | null;
}

export default function CreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchCreditNotes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/credit-notes?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch credit notes");
      const data = await response.json();
      setCreditNotes(data.credit_notes || []);
    } catch (error) {
      console.error("Error fetching credit notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditNotes();
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchCreditNotes(), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatDate = (date: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `R ${Number(amount || 0).toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "applied":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Applied</Badge>;
      case "unapplied":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Unapplied</Badge>;
      case "partial":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Partial</Badge>;
      case "declined":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Declined</Badge>;
      default:
        return <Badge variant="outline">{status || "N/A"}</Badge>;
    }
  };

  const handleViewPdf = (cn: CreditNote) => {
    const params = new URLSearchParams({
      credit_note_number: cn.credit_note_number,
      account_number: cn.account_number,
      client_name: cn.client_name || "",
      amount: String(cn.amount),
      billing_month: cn.billing_month_applies_to,
      date: cn.credit_note_date,
      reason: cn.reason || "",
      reference: cn.reference || "",
    });
    window.open(`/api/credit-notes/pdf?${params.toString()}`, "_blank");
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Credit Notes</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and view all credit notes</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          >
            <option value="all">All Status</option>
            <option value="applied">Applied</option>
            <option value="unapplied">Unapplied</option>
            <option value="partial">Partial</option>
            <option value="declined">Declined</option>
          </select>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search credit notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full sm:w-64 border-gray-200 pl-10 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading credit notes...</span>
        </div>
      ) : creditNotes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No credit notes found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">CN #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Account</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Billing Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Applied</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Unapplied</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Approved</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Created By</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cn.credit_note_number}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{cn.account_number}</td>
                  <td className="px-4 py-3 text-gray-700">{cn.client_name || "N/A"}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(cn.billing_month_applies_to)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(cn.credit_note_date)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(cn.amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(cn.applied_amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(cn.unapplied_amount)}</td>
                  <td className="px-4 py-3">{getStatusBadge(cn.status)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold ${cn.approved ? "text-green-600" : "text-gray-500"}`}>
                      {cn.approved ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate" title={cn.reason || ""}>
                    {cn.reason || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{cn.reference || "N/A"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{cn.created_by_email || "N/A"}</td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPdf(cn)}
                      className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" /> View PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
