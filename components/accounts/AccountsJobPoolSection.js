"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const ROLE_COLUMNS = [
  { key: "fc", label: "FC" },
  { key: "inv", label: "INV" },
  { key: "admin", label: "ADMIN" },
  { key: "tech", label: "TECH" },
  { key: "unassigned", label: "UNASSIGNED" },
];

const getAgeTone = (days) => {
  if (days <= 3) return { accent: "bg-emerald-500", ring: "border-emerald-100" };
  if (days <= 7) return { accent: "bg-orange-500", ring: "border-orange-100" };
  return { accent: "bg-rose-600", ring: "border-rose-100" };
};

const renderColumnSkeleton = (roleKey) => (
  <div key={`job-pool-skeleton-${roleKey}`} className="min-w-[240px] border-r border-slate-200 bg-slate-50/60 p-3 last:border-r-0">
    <div className="h-5 w-20 rounded bg-slate-200 animate-pulse" />
    <div className="mt-3 space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`job-pool-skeleton-${roleKey}-${index}`}
          className="rounded-lg border border-white bg-white p-3 shadow-sm"
        >
          <div className="h-4 w-20 rounded bg-slate-100 animate-pulse" />
          <div className="mt-2 h-3 w-24 rounded bg-slate-100 animate-pulse" />
          <div className="mt-3 h-2 w-16 rounded bg-slate-100 animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

export default function AccountsJobPoolSection() {
  const [jobs, setJobs] = useState([]);
  const [counts, setCounts] = useState({
    fc: 0, inv: 0, admin: 0, tech: 0, unassigned: 0,
  });
  const [totals, setTotals] = useState({
    fc: 0, inv: 0, admin: 0, tech: 0, unassigned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [moveHistoryJob, setMoveHistoryJob] = useState(null);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

  const fetchJobPool = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/accounts/job-pool");

      if (!response.ok) {
        throw new Error("Failed to fetch job pool");
      }

      const result = await response.json();
      setJobs(Array.isArray(result?.jobs) ? result.jobs : []);
      setCounts(
        result?.counts || { fc: 0, inv: 0, admin: 0, tech: 0, unassigned: 0 },
      );
      setTotals(
        result?.totals || { fc: 0, inv: 0, admin: 0, tech: 0, unassigned: 0 },
      );
      setHasLoadedOnce(true);
    } catch (error) {
      console.error("Error fetching accounts job pool:", error);
      toast.error("Failed to load job pool");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobPool();
  }, [fetchJobPool]);

  const groupedJobs = useMemo(() => {
    const grouped = ROLE_COLUMNS.reduce((accumulator, role) => {
      accumulator[role.key] = [];
      return accumulator;
    }, {});

    jobs.forEach((job) => {
      const normalizedRole = String(job.normalized_role || "").toLowerCase();
      const hasTechnician = Boolean(job.is_tech_assigned);

      if (hasTechnician) {
        grouped.tech.push(job);
      }

      if (normalizedRole !== "tech" && grouped[normalizedRole]) {
        grouped[normalizedRole].push(job);
      }
    });

    return grouped;
  }, [jobs]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Job Pool
          </h2>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Live Repository — {jobs.length} open jobs
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchJobPool}
          disabled={loading}
          className="rounded-xl"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="min-w-[1150px]">
          <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-50">
            {ROLE_COLUMNS.map((role) => (
              <div
                key={role.key}
                className="border-r border-slate-200 px-4 py-3 last:border-r-0"
              >
                <div className="text-2xl font-bold leading-none text-slate-900">
                  {role.label}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {String(counts[role.key] || 0).padStart(2, "0")} jobs
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-600">
                  {formatCurrency(totals[role.key] || 0)}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5">
            {loading && !hasLoadedOnce
              ? ROLE_COLUMNS.map((role) => renderColumnSkeleton(role.key))
              : ROLE_COLUMNS.map((role) => {
                  const roleJobs = groupedJobs[role.key] || [];

                  return (
                    <div
                      key={role.key}
                      className="min-w-[236px] border-r border-slate-200 bg-slate-50/60 p-2.5 last:border-r-0"
                    >
                      <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                        {roleJobs.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-400">
                            No open jobs
                          </div>
                        ) : (
                          roleJobs.map((job) => {
                            const ageDays = Number(job.role_age_days || 0);
                            const tone = getAgeTone(ageDays);

                            return (
                              <article
                                key={job.id}
                                className={`rounded-lg border ${tone.ring} bg-white shadow-sm overflow-hidden`}
                              >
                                <div className="flex">
                                  <div className={`w-1 ${tone.accent}`} />
                                  <div className="flex-1 p-2.5">
                                    <div className="truncate text-[14px] font-bold text-slate-900">
                                      {job.job_number}
                                    </div>
                                    <div className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-slate-500">
                                      {role.key === "tech"
                                        ? (job.technician_name ? `${job.technician_name} — ${job.customer_name || "No client"}` : job.customer_name || "No technician")
                                        : job.customer_name || "Unknown client"}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setMoveHistoryJob(job)}
                                      className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                    >
                                      <History className="h-3 w-3" />
                                      Move History
                                    </button>
                                  </div>
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
      <Dialog open={Boolean(moveHistoryJob)} onOpenChange={(open) => { if (!open) setMoveHistoryJob(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Move History — {moveHistoryJob?.job_number || ""}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const history = Array.isArray(moveHistoryJob?.move_history) ? moveHistoryJob.move_history : [];
            if (history.length === 0) {
              return (
                <div className="py-8 text-center text-sm text-slate-500">
                  No move history recorded for this job.
                </div>
              );
            }
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2 text-left">From</th>
                      <th className="px-3 py-2 text-left">To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {history.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                          {entry.moved_at ? new Date(entry.moved_at).toLocaleString("en-ZA") : "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{entry.user_email || entry.moved_by || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{(entry.from_role || "—").toUpperCase()}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{(entry.to_role || "—").toUpperCase()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
