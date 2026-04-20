"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Eye, RefreshCw, Search } from "lucide-react";
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
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMonthInputValue = (value) => {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw.slice(0, 7) : /^\d{4}-\d{2}$/.test(raw) ? raw : "";
};

const monthValueToBillingMonth = (value) => {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : "";
};

const renderSkeletonRow = (key) => (
  <tr key={key} className="border-b border-slate-200 even:bg-slate-50/60">
    {Array.from({ length: 8 }).map((_, index) => (
      <td key={`${key}-${index}`} className="border-r border-slate-200 px-3 py-3 last:border-r-0">
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
      </td>
    ))}
  </tr>
);

export default function AccountJobCardsSection({ accountNumber }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stateFilter, setStateFilter] = useState("open");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState({
    openCount: 0,
    openValue: 0,
    closedCount: 0,
    closedValue: 0,
    invoiceCount: 0,
    invoiceValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    const state = String(searchParams.get("jobState") || "open").trim().toLowerCase();
    const billingMonth = formatMonthInputValue(searchParams.get("billingMonth"));
    setStateFilter(state === "closed" ? "closed" : "open");
    if (billingMonth) {
      setSelectedMonth(billingMonth);
    }
  }, [searchParams]);

  const fetchJobs = useCallback(async (targetState, targetMonth) => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        accountNumber: String(accountNumber || ""),
        state: String(targetState || "open"),
      });

      const billingMonth = monthValueToBillingMonth(targetMonth);
      if (billingMonth) {
        query.set("billingMonth", billingMonth);
      }

      const response = await fetch(`/api/accounts/job-cards?${query.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch account job cards");
      }

      const result = await response.json();
      setJobs(Array.isArray(result?.jobs) ? result.jobs : []);
      setSummary(
        result?.summary || {
          openCount: 0,
          openValue: 0,
          closedCount: 0,
          closedValue: 0,
          invoiceCount: 0,
          invoiceValue: 0,
        },
      );
      setHasLoadedOnce(true);
    } catch (error) {
      console.error("Error fetching account job cards:", error);
      toast.error("Failed to load client job cards");
    } finally {
      setLoading(false);
    }
  }, [accountNumber]);

  useEffect(() => {
    if (!accountNumber) return;
    fetchJobs(stateFilter, selectedMonth);
  }, [accountNumber, fetchJobs, selectedMonth, stateFilter]);

  const filteredJobs = useMemo(() => {
    const search = String(searchTerm || "").trim().toUpperCase();
    if (!search) return jobs;

    return jobs.filter((job) =>
      [
        job.job_number,
        job.customer_name,
        job.customer_email,
        job.vehicle_registration,
        job.job_description,
        job.technician_name,
        job.invoice?.invoice_number,
      ]
        .map((value) => String(value || "").toUpperCase())
        .some((value) => value.includes(search)),
    );
  }, [jobs, searchTerm]);

  const changeState = (nextState) => {
    setStateFilter(nextState);
    const url = new URL(window.location.href);
    url.searchParams.set("section", "job-cards");
    url.searchParams.set("jobState", nextState);
    if (selectedMonth) {
      url.searchParams.set("billingMonth", selectedMonth);
    }
    window.history.replaceState({}, "", url.toString());
  };

  const changeMonth = (value) => {
    setSelectedMonth(value);
    const url = new URL(window.location.href);
    url.searchParams.set("section", "job-cards");
    url.searchParams.set("jobState", stateFilter);
    if (value) {
      url.searchParams.set("billingMonth", value);
    } else {
      url.searchParams.delete("billingMonth");
    }
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Client Job Cards</h2>
          <div className="text-sm text-slate-500">
            Client-only open and closed jobs with linked invoices for {accountNumber}.
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fetchJobs(stateFilter, selectedMonth)}
          disabled={loading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Open Jobs</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{String(summary.openCount).padStart(2, "0")}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Open Value</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(summary.openValue)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Closed Jobs</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{String(summary.closedCount).padStart(2, "0")}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Closed Value</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(summary.closedValue)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Invoices</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{String(summary.invoiceCount).padStart(2, "0")}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Invoice Value</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(summary.invoiceValue)}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={stateFilter === "open" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => changeState("open")}
            >
              Open
            </Button>
            <Button
              type="button"
              variant={stateFilter === "closed" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => changeState("closed")}
            >
              Closed
            </Button>
          </div>

          <div className="flex w-full flex-col gap-3 md:flex-row xl:w-auto">
            <div className="relative w-full md:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search job, client, invoice..."
                className="pl-9"
              />
            </div>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => changeMonth(event.target.value)}
              className="w-full md:w-[180px]"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1180px] w-full table-fixed border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left">
                <th className="w-[170px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600">Job Number</th>
                <th className="w-[250px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600">Client / Vehicle</th>
                <th className="w-[170px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600">Role / Status</th>
                <th className="w-[120px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600">Job Date</th>
                <th className="w-[120px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600">Value</th>
                <th className="w-[180px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600">Invoice</th>
                <th className="w-[120px] border-r border-slate-200 px-3 py-3 font-semibold text-slate-600">Invoice Date</th>
                <th className="w-[120px] px-3 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading && !hasLoadedOnce
                ? Array.from({ length: 6 }).map((_, index) => renderSkeletonRow(`account-job-cards-${index}`))
                : filteredJobs.map((job) => (
                    <tr
                      key={job.id || job.job_number}
                      className="border-b border-slate-200 align-top odd:bg-white even:bg-slate-50/60 hover:bg-blue-50/40"
                    >
                      <td className="border-r border-slate-200 px-3 py-3">
                        <div className="font-semibold text-slate-900">{job.job_number || "-"}</div>
                        <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{job.new_account_number}</div>
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3">
                        <div className="truncate font-medium text-slate-900">{job.customer_name || "Unknown client"}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {job.vehicle_registration || "No vehicle"}{job.technician_name ? ` • ${job.technician_name}` : ""}
                        </div>
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3">
                        <div className="text-sm font-medium text-slate-900">{String(job.role || "-").toUpperCase()}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {job.job_status || job.status || "pending"}
                        </div>
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3 text-slate-700">
                        {formatDate(job.completion_date || job.end_time || job.job_date || job.created_at)}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3 font-semibold text-slate-900">
                        {formatCurrency(job.job_value)}
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3">
                        <div className="truncate font-medium text-slate-900">
                          {job.invoice?.invoice_number || "No invoice"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {job.invoice ? formatCurrency(job.invoice.total_amount) : "-"}
                        </div>
                      </td>
                      <td className="border-r border-slate-200 px-3 py-3 text-slate-700">
                        {job.invoice?.invoice_date ? formatDate(job.invoice.invoice_date) : "-"}
                      </td>
                      <td className="px-3 py-3">
                        {job.invoice ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => {
                              setSelectedInvoice({
                                ...job.invoice,
                                account_number: job.new_account_number,
                                company_name: job.customer_name,
                              });
                              setShowViewer(true);
                            }}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                            onClick={() => router.push(`/protected/accounts?section=completed-jobs`)}
                          >
                            Completed Jobs
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

              {!loading && hasLoadedOnce && filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No {stateFilter} jobs found for this client in the selected month.
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
                billingMonth: selectedMonth ? monthValueToBillingMonth(selectedMonth) : null,
              }}
              invoiceData={{
                ...selectedInvoice,
                billing_month: selectedMonth ? monthValueToBillingMonth(selectedMonth) : null,
                total_amount: Number(selectedInvoice.total_amount || 0),
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
