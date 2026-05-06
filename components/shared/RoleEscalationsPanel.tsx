"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EscalationJob = {
  id: string;
  job_number?: string | null;
  customer_name?: string | null;
  vehicle_registration?: string | null;
  job_description?: string | null;
  status?: string | null;
  job_status?: string | null;
  escalation_role?: string | null;
  escalation_source_role?: string | null;
  escalated_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  parts_required?: unknown;
  [key: string]: unknown;
};

type RoleEscalationsPanelProps = {
  role: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  hideCompletedJobs?: boolean;
  renderActions?: (
    job: EscalationJob,
    helpers: {
      refresh: () => Promise<void>;
      movingJobId: string | null;
    },
  ) => ReactNode;
  moveOptions?: Array<{
    value: string;
    label: string;
    payload?: Record<string, unknown>;
  }>;
};

const formatRoleLabel = (value: unknown) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  if (normalized === "inv") return "Inventory";
  if (normalized === "fc") return "FC";
  if (normalized === "admin") return "Admin";
  if (normalized === "tech") return "Tech";
  if (normalized === "accounts") return "Accounts";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const hasAssignedParts = (partsRequired: unknown) =>
  Array.isArray(partsRequired) && partsRequired.length > 0;

const normalizeStatus = (job: EscalationJob) =>
  String(job.job_status || job.status || "").trim().toLowerCase();

const getStatusClasses = (status: string) => {
  if (status.includes("urgent") || status.includes("critical")) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (
    status.includes("processing") ||
    status.includes("assigned") ||
    status.includes("in progress")
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status.includes("pending") || status.includes("new")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (
    status.includes("resolved") ||
    status.includes("complete") ||
    status.includes("closed")
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const formatEscalatedDate = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return { date: "N/A", time: "" };

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { date: raw, time: "" };

  return {
    date: parsed.toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: parsed.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

export default function RoleEscalationsPanel({
  role,
  title = "Escalations",
  description = "Jobs moved into this role appear here first.",
  emptyTitle = "No escalations",
  emptyDescription = "Escalated jobs will appear here when they are moved into this role.",
  hideCompletedJobs = true,
  renderActions,
  moveOptions = [],
}: RoleEscalationsPanelProps) {
  const [jobs, setJobs] = useState<EscalationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [movingJobId, setMovingJobId] = useState<string | null>(null);

  const fetchEscalations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        escalation_role: role,
        view: "fc-list",
        include_count: "false",
        limit: "1000",
      });
      if (hideCompletedJobs) {
        params.set("exclude_completed", "true");
      }

      const response = await fetch(`/api/job-cards?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch escalations");
      }

      const payload = await response.json();
      setJobs(Array.isArray(payload?.job_cards) ? payload.job_cards : []);
    } catch (error) {
      console.error("Error fetching escalations:", error);
      toast.error("Failed to load escalations");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [hideCompletedJobs, role]);

  useEffect(() => {
    fetchEscalations();
  }, [fetchEscalations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEscalations();
    setRefreshing(false);
  };

  const handleMoveJob = async (
    job: EscalationJob,
    destination: string,
    payload: Record<string, unknown> = {},
  ) => {
    if (!job?.id || !destination) return;

    setMovingJobId(job.id);
    const loadingToast = toast.loading(`Moving job to ${formatRoleLabel(destination)}...`);

    try {
      const response = await fetch(`/api/job-cards/${job.id}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination,
          ...payload,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result?.error || `Failed to move job to ${formatRoleLabel(destination)}`,
        );
      }

      toast.dismiss(loadingToast);
      toast.success(
        destination === "accounts"
          ? "Job moved to Accounts completed flow"
          : `Job moved to ${formatRoleLabel(destination)} escalations`,
      );
      await fetchEscalations();
    } catch (error) {
      console.error("Error moving escalated job:", error);
      toast.dismiss(loadingToast);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to move job to ${formatRoleLabel(destination)}`,
      );
    } finally {
      setMovingJobId(null);
    }
  };

  const filteredJobs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return jobs;

    return jobs.filter((job) =>
      [
        job.job_number,
        job.customer_name,
        job.vehicle_registration,
        job.job_description,
        job.escalation_source_role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [jobs, searchTerm]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const activeEscalations = jobs.length;
    let totalWaitHours = 0;
    let waitSamples = 0;
    let pending = 0;
    let processing = 0;
    let flagged = 0;
    let resolvedToday = 0;

    for (const job of jobs) {
      const status = normalizeStatus(job);
      if (status.includes("pending") || status.includes("new")) pending += 1;
      if (
        status.includes("processing") ||
        status.includes("assigned") ||
        status.includes("in progress")
      ) {
        processing += 1;
      }

      const priority = String((job as Record<string, unknown>)?.priority || "")
        .trim()
        .toLowerCase();
      const description = String(job.job_description || "").toLowerCase();
      if (
        priority.includes("high") ||
        priority.includes("urgent") ||
        priority.includes("critical") ||
        description.includes("urgent") ||
        description.includes("critical")
      ) {
        flagged += 1;
      }

      const escalatedAt = new Date(
        String(job.escalated_at || job.updated_at || job.created_at || ""),
      );
      if (!Number.isNaN(escalatedAt.getTime())) {
        totalWaitHours += (now - escalatedAt.getTime()) / (1000 * 60 * 60);
        waitSamples += 1;
      }

      if (
        status.includes("resolved") ||
        status.includes("complete") ||
        status.includes("closed")
      ) {
        const statusDate = new Date(String(job.updated_at || job.created_at || ""));
        if (!Number.isNaN(statusDate.getTime()) && statusDate >= startOfToday) {
          resolvedToday += 1;
        }
      }
    }

    const avgWaitHours = waitSamples > 0 ? totalWaitHours / waitSamples : 0;

    return {
      activeEscalations,
      avgWaitHours,
      pending,
      processing,
      flagged,
      resolvedToday,
    };
  }, [jobs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search escalations..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 border-slate-200 pl-10 text-sm"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 border-slate-200"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Active</span>
              <Activity className="h-3.5 w-3.5" />
            </div>
            <p className="text-xl font-bold leading-none text-slate-900">
              {metrics.activeEscalations}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Avg Wait</span>
              <Clock3 className="h-3.5 w-3.5" />
            </div>
            <p className="text-xl font-bold leading-none text-slate-900">
              {metrics.avgWaitHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Pending
            </div>
            <p className="text-xl font-bold leading-none text-slate-900">
              {metrics.pending}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Processing
            </div>
            <p className="text-xl font-bold leading-none text-slate-900">
              {metrics.processing}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Flagged</span>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p className="text-xl font-bold leading-none text-amber-700">
              {metrics.flagged}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Resolved Today</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-xl font-bold leading-none text-emerald-700">
              {metrics.resolvedToday}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-base">
            {formatRoleLabel(role)} Escalations ({filteredJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Loading escalations...
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-base font-medium text-gray-900">{emptyTitle}</p>
              <p className="mt-1 text-sm text-gray-500">{emptyDescription}</p>
            </div>
          ) : (
            <div className="overflow-x-hidden">
              <table className="w-full table-fixed border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="w-[12%] px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        Job ID <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </th>
                    <th className="w-[14%] px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>
                    <th className="w-[11%] px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                      Vehicle
                    </th>
                    <th className="w-[8%] px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                      From
                    </th>
                    <th className="w-[11%] px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                      Escalated
                    </th>
                    <th className="w-[10%] px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="w-[19%] px-2 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                      Details
                    </th>
                    <th className="w-[15%] px-2 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-slate-100 align-top hover:bg-slate-50/60"
                    >
                      <td className="px-2 py-2">
                        <div className="font-semibold text-slate-900">
                          {job.job_number || "N/A"}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-500">
                          {String(
                            (job as Record<string, unknown>)?.new_account_number ||
                              (job as Record<string, unknown>)?.account_id ||
                              "No account",
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        <div className="truncate font-medium text-slate-900">
                          {job.customer_name || "N/A"}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {String(
                            (job as Record<string, unknown>)?.contact_person ||
                              (job as Record<string, unknown>)?.customer_phone ||
                              (job as Record<string, unknown>)?.customer_email ||
                              "No contact",
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        <div className="font-medium text-slate-900">
                          {job.vehicle_registration || "N/A"}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {String(
                            (job as Record<string, unknown>)?.vehicle_make || "",
                          )}{" "}
                          {String(
                            (job as Record<string, unknown>)?.vehicle_model || "",
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <Badge
                          variant="outline"
                          className="h-5 rounded-sm px-1.5 text-[10px] font-semibold uppercase tracking-wide"
                        >
                          {formatRoleLabel(job.escalation_source_role)}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {(() => {
                          const dateInfo = formatEscalatedDate(
                            job.escalated_at || job.updated_at || job.created_at,
                          );
                          return (
                            <>
                              <div className="font-medium text-slate-900">
                                {dateInfo.date}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {dateInfo.time}
                              </div>
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        {(() => {
                          const label = String(
                            job.job_status || job.status || "N/A",
                          );
                          const tone = getStatusClasses(label.toLowerCase());
                          return (
                            <Badge
                              variant="outline"
                              className={`h-5 rounded-sm border px-1.5 text-[10px] font-semibold ${tone}`}
                            >
                              {label}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        <div className="space-y-0.5 text-[11px] leading-4">
                          <div className="truncate font-medium text-slate-900">
                            {String(
                              (job as Record<string, unknown>)?.job_type ||
                                (job as Record<string, unknown>)?.job_sub_type ||
                                "General",
                            )}
                          </div>
                          <div className="truncate text-slate-600">
                            {job.job_description || "No description"}
                          </div>
                          <div className="truncate text-slate-500">
                            Order:{" "}
                            {String(
                              (job as Record<string, unknown>)?.order_number || "N/A",
                            )}
                          </div>
                          {hasAssignedParts(job.parts_required) ? (
                            <div className="text-amber-700">
                              Parts assigned
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {moveOptions.length > 0 ? (
                            <Select
                              disabled={movingJobId === job.id}
                              onValueChange={(value) => {
                                const selectedOption = moveOptions.find(
                                  (option) => option.value === value,
                                );
                                handleMoveJob(job, value, selectedOption?.payload || {});
                              }}
                            >
                              <SelectTrigger className="h-8 w-full max-w-[148px] text-[11px]">
                                <SelectValue
                                  placeholder={
                                    movingJobId === job.id ? "Moving..." : "Move to"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {moveOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}
                          {renderActions
                            ? renderActions(job, {
                                refresh: fetchEscalations,
                                movingJobId,
                              })
                            : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
