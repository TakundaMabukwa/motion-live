"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Circle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ROLE_COLUMNS = [
  { key: "fc", label: "FC" },
  { key: "inv", label: "INV" },
  { key: "admin", label: "ADMIN" },
  { key: "tech", label: "TECH" },
  { key: "accounts", label: "ACCOUNTS" },
];

const getAgeTone = (days) => {
  if (days <= 3) {
    return {
      accent: "bg-emerald-500",
      text: "text-emerald-600",
      soft: "bg-emerald-50",
      status: "ACTIVE",
      bar: "bg-emerald-500",
      ring: "border-emerald-100",
    };
  }

  if (days <= 7) {
    return {
      accent: "bg-orange-500",
      text: "text-orange-500",
      soft: "bg-orange-50",
      status: "PENDING",
      bar: "bg-orange-500",
      ring: "border-orange-100",
    };
  }

  return {
    accent: "bg-rose-600",
    text: "text-rose-600",
    soft: "bg-rose-50",
    status: "OVERDUE",
    bar: "bg-rose-600",
    ring: "border-rose-100",
  };
};

const formatRoleLabel = (role) => {
  const raw = String(role || "").trim().toLowerCase();
  if (raw === "tech" || raw === "technician") return "TECH";
  if (raw === "fc") return "FC";
  if (raw === "inv") return "INV";
  if (raw === "admin") return "ADMIN";
  if (raw === "accounts") return "ACCOUNTS";
  return raw ? raw.toUpperCase() : "UNASSIGNED";
};

const buildAgeBucketSummary = (jobs) =>
  jobs.reduce(
    (summary, job) => {
      const days = Number(job.role_age_days || 0);
      if (days <= 3) {
        summary.green += 1;
      } else if (days <= 7) {
        summary.orange += 1;
      } else {
        summary.red += 1;
      }
      return summary;
    },
    { green: 0, orange: 0, red: 0 },
  );

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
    fc: 0,
    inv: 0,
    admin: 0,
    tech: 0,
    accounts: 0,
  });
  const [totals, setTotals] = useState({
    fc: 0,
    inv: 0,
    admin: 0,
    tech: 0,
    accounts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

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
        result?.counts || {
          fc: 0,
          inv: 0,
          admin: 0,
          tech: 0,
          accounts: 0,
        },
      );
      setTotals(
        result?.totals || {
          fc: 0,
          inv: 0,
          admin: 0,
          tech: 0,
          accounts: 0,
        },
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

    ROLE_COLUMNS.forEach((role) => {
      grouped[role.key].sort(
        (left, right) => Number(right.role_age_days || 0) - Number(left.role_age_days || 0),
      );
    });

    return grouped;
  }, [jobs]);

  const overallBuckets = useMemo(() => buildAgeBucketSummary(jobs), [jobs]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Job Pool
          </h2>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
            Live Repository Status
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

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm xl:col-span-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Open Jobs
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {String(jobs.length).padStart(2, "0")}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Active across FC, Inventory, Admin, Tech, and Accounts
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            0-3 Days
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {overallBuckets.green}
          </div>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            4-7 Days
          </div>
          <div className="mt-2 text-3xl font-bold text-orange-600">
            {overallBuckets.orange}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
            8+ Days
          </div>
          <div className="mt-2 text-3xl font-bold text-rose-600">
            {overallBuckets.red}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-50">
            {ROLE_COLUMNS.map((role) => {
              const roleJobs = groupedJobs[role.key] || [];
              const bucketSummary = buildAgeBucketSummary(roleJobs);

              return (
                <div
                  key={role.key}
                  className="border-r border-slate-200 px-4 py-3 last:border-r-0"
                >
                  <div className="space-y-3">
                    <div>
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
                    <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
                      <div className="rounded-lg bg-slate-50 px-1 py-1">
                        <div className="text-[10px] font-semibold uppercase text-slate-400">
                          3
                        </div>
                        <div className="text-xs font-bold text-emerald-600">
                          {bucketSummary.green}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-1 py-1">
                        <div className="text-[10px] font-semibold uppercase text-slate-400">
                          7
                        </div>
                        <div className="text-xs font-bold text-orange-500">
                          {bucketSummary.orange}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-1 py-1">
                        <div className="text-[10px] font-semibold uppercase text-slate-400">
                          7+
                        </div>
                        <div className="text-xs font-bold text-rose-600">
                          {bucketSummary.red}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-5 border-b border-slate-200 bg-white">
            {ROLE_COLUMNS.map((role) => (
              <div
                key={`${role.key}-subheader`}
                className="border-r border-slate-200 px-4 py-2 last:border-r-0"
              >
                <div className="grid grid-cols-[1.1fr_0.9fr] text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <span>Job / Client</span>
                  <span>Age</span>
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
                                    <div className="grid grid-cols-[1.08fr_0.92fr] gap-2.5">
                                      <div className="min-w-0">
                                        <div className="truncate text-[14px] font-bold text-slate-900">
                                          {job.job_number}
                                        </div>
                                        <div className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-slate-500">
                                          {role.key === "tech"
                                            ? job.technician_name || "No technician"
                                            : job.customer_name || "Unknown client"}
                                        </div>
                                      </div>

                                      <div className="text-right">
                                        <span
                                          className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${tone.soft} ${tone.text}`}
                                        >
                                          {tone.status}
                                        </span>
                                        <div className="mt-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                          Age Analysis
                                        </div>
                                        <div className="mt-1 flex items-end justify-end gap-2">
                                          <div className="w-16">
                                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                              <div
                                                className={`h-full rounded-full ${tone.bar}`}
                                                style={{
                                                  width: `${Math.min(
                                                    100,
                                                    Math.max(18, ageDays * 10),
                                                  )}%`,
                                                }}
                                              />
                                            </div>
                                          </div>
                                          <div className={`text-right ${tone.text}`}>
                                            <div className="text-[16px] font-bold leading-none">
                                              {ageDays}
                                            </div>
                                            <div className="text-[9px] font-semibold uppercase tracking-[0.18em]">
                                              {ageDays === 1 ? "Day" : "Days"}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
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

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Aging is measured from the job card&apos;s current-role `updated_at`
        timestamp so the board stays fast and consistent with the live dataset.
      </div>
    </div>
  );
}
