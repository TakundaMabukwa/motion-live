"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw } from "lucide-react";
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

const formatDateTime = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const hasAssignedParts = (partsRequired: unknown) =>
  Array.isArray(partsRequired) && partsRequired.length > 0;

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
        limit: "5000",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search escalations..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {formatRoleLabel(role)} Escalations ({filteredJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Job
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      From
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Escalated
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Details
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {job.job_number || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {job.customer_name || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {job.vehicle_registration || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {formatRoleLabel(job.escalation_source_role)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDateTime(job.escalated_at || job.updated_at || job.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {job.job_status || job.status || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="max-w-[360px] space-y-1 text-xs">
                          <div className="whitespace-pre-wrap break-words text-gray-800">
                            {job.job_description || "No description"}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">Account:</span>{" "}
                            {String(
                              (job as Record<string, unknown>)?.new_account_number ||
                                (job as Record<string, unknown>)?.account_id ||
                                "N/A",
                            )}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">Job Type:</span>{" "}
                            {String(
                              (job as Record<string, unknown>)?.job_type ||
                                (job as Record<string, unknown>)?.job_sub_type ||
                                "N/A",
                            )}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">Contact:</span>{" "}
                            {String(
                              (job as Record<string, unknown>)?.contact_person ||
                                (job as Record<string, unknown>)?.customer_phone ||
                                (job as Record<string, unknown>)?.customer_email ||
                                "N/A",
                            )}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">Order:</span>{" "}
                            {String(
                              (job as Record<string, unknown>)?.order_number || "N/A",
                            )}
                          </div>
                          {hasAssignedParts(job.parts_required) ? (
                            <div className="mt-1 text-amber-700">
                              Assigned parts included
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
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
                              <SelectTrigger className="w-[140px]">
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
