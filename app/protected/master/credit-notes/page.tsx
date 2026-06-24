"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const [declineModalCn, setDeclineModalCn] = useState<CreditNote | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [processingDecline, setProcessingDecline] = useState(false);

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

  const handleApprove = async (cn: CreditNote) => {
    try {
      const response = await fetch(`/api/credit-notes/${cn.id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Failed to approve");
      toast.success(`${cn.credit_note_number} approved.`);
      fetchCreditNotes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve credit note.");
    }
  };

  const openDeclineModal = (cn: CreditNote) => {
    setDeclineModalCn(cn);
    setDeclineReason("");
  };

  const handleDecline = async () => {
    if (!declineModalCn) return;
    if (!declineReason.trim()) {
      toast.error("Please enter a decline reason.");
      return;
    }
    setProcessingDecline(true);
    try {
      const response = await fetch(`/api/credit-notes/${declineModalCn.id}/decline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declineReason: declineReason.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Failed to decline");
      toast.success(`${declineModalCn.credit_note_number} declined.`);
      setDeclineModalCn(null);
      setDeclineReason("");
      fetchCreditNotes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to decline credit note.");
    } finally {
      setProcessingDecline(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Credit Notes</h1>
        <p className="text-xs text-gray-500 mt-1">Manage and approve credit notes</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-blue-400"
          >
            <option value="all">All Status</option>
            <option value="applied">Applied</option>
            <option value="unapplied">Unapplied</option>
            <option value="partial">Partial</option>
            <option value="declined">Declined</option>
          </select>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 w-full sm:w-48 border-gray-200 pl-8 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </div>
      ) : creditNotes.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500">No credit notes found.</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-gray-500">CN #</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-500">Account</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-500">Client</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-500">Billing</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-500">Amount</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-500">Status</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-500">Approved</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-500">Decline Reason</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-500">Ref</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-500">Created By</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 font-medium text-gray-900 whitespace-nowrap">{cn.credit_note_number}</td>
                  <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{cn.account_number}</td>
                  <td className="px-2 py-1.5 text-gray-700 max-w-[120px] truncate" title={cn.client_name || ""}>{cn.client_name || "N/A"}</td>
                  <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{formatDate(cn.billing_month_applies_to)}</td>
                  <td className="px-2 py-1.5 text-right font-medium text-gray-900 whitespace-nowrap">{formatCurrency(cn.amount)}</td>
                  <td className="px-2 py-1.5">{getStatusBadge(cn.status)}</td>
                  <td className="px-2 py-1.5 text-center">
                    {cn.approved ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Yes</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-gray-400">No</Badge>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 max-w-[120px] truncate text-[10px]" title={cn.decline_reason || ""}>
                    {cn.decline_reason || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 max-w-[80px] truncate" title={cn.reference || ""}>{cn.reference || "—"}</td>
                  <td className="px-2 py-1.5 text-gray-600 max-w-[120px] truncate" title={cn.created_by_email || ""}>{cn.created_by_email || "—"}</td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    {!cn.approved ? (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-1.5 text-green-600 hover:bg-green-50"
                          onClick={() => handleApprove(cn)}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-1.5 text-red-600 hover:bg-red-50"
                          onClick={() => openDeclineModal(cn)}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {declineModalCn && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="flex flex-col bg-white shadow-xl rounded-lg w-full max-w-md">
            <div className="flex flex-shrink-0 justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-gray-900 text-sm">
                Decline: {declineModalCn.credit_note_number}
              </h3>
              <button
                onClick={() => setDeclineModalCn(null)}
                disabled={processingDecline}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-slate-50 p-3 rounded text-xs">
                <div className="text-slate-500">Account</div>
                <div className="font-medium">{declineModalCn.account_number} — {declineModalCn.client_name || "N/A"}</div>
                <div className="text-slate-500 mt-1">Amount</div>
                <div className="font-medium">{formatCurrency(declineModalCn.amount)}</div>
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700 text-sm">Decline Reason *</label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  disabled={processingDecline}
                  rows={3}
                  placeholder="Enter reason for declining..."
                  className="px-3 py-2 border rounded-md w-full text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setDeclineModalCn(null)} disabled={processingDecline}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDecline} disabled={processingDecline}>
                {processingDecline ? "Declining..." : "Decline"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
