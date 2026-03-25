"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Car,
  Wrench,
  Calendar,
  Clock,
  ClipboardList,
  Camera,
  FileText,
  User,
  Settings,
} from "lucide-react";
import AdminSubnav from "@/components/admin/AdminSubnav";

interface CompletedJob {
  id: string;
  job_number: string;
  job_date: string;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  status: string;
  job_type: string;
  job_description: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  technician_name: string;
  technician_phone: string;
  estimated_duration_hours: number;
  actual_duration_hours: number;
  created_at: string;
  updated_at: string;
  repair: boolean;
  role: string;
  move_to?: string;
  parts_required?: unknown;
  quotation_products?: unknown;
  before_photos?: unknown;
  after_photos?: unknown;
  work_notes?: string;
  completion_notes?: string;
  special_instructions?: string;
}

type GenericRecord = Record<string, unknown>;

const parseArrayField = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const extractPhotoUrl = (item: unknown): string | null => {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const record = item as GenericRecord;
    const candidate =
      record.url || record.publicUrl || record.path || record.src;
    return typeof candidate === "string" ? candidate : null;
  }
  return null;
};

const extractPartSummary = (item: unknown) => {
  if (!item || typeof item !== "object") {
    return { title: "Unknown item", subtitle: "", quantity: null };
  }

  const record = item as GenericRecord;
  const title = String(
    record.description ||
      record.name ||
      record.product ||
      record.item_code ||
      record.code ||
      "Unknown item",
  );
  const subtitle = String(
    record.supplier || record.type || record.category || "",
  ).trim();
  const quantityValue = record.quantity;
  const quantity =
    typeof quantityValue === "number"
      ? quantityValue
      : typeof quantityValue === "string" && quantityValue.trim() !== ""
        ? Number(quantityValue)
        : null;

  return {
    title,
    subtitle,
    quantity: Number.isFinite(quantity as number) ? quantity : null,
  };
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "Not set";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

const getStatusColor = (status: string) => {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "assigned":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getJobTypeColor = (jobType: string) => {
  switch ((jobType || "").toLowerCase()) {
    case "install":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "deinstall":
      return "bg-red-100 text-red-800 border-red-200";
    case "maintenance":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "repair":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export function AwaitingTestingContent({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CompletedJob | null>(null);
  const [viewJobOpen, setViewJobOpen] = useState(false);
  const [sendingJobId, setSendingJobId] = useState<string | null>(null);

  const fetchCompletedJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/jobs?status=completed");
      if (!response.ok) throw new Error("Failed to fetch completed jobs");
      const data = await response.json();
      const completedJobs = (data.jobs || []).filter(
        (job: CompletedJob) =>
          !["fc", "inv", "accounts"].includes(
            String(job.role || "").toLowerCase(),
          ) &&
          !["fc", "inv", "accounts"].includes(
            String(job.move_to || "").toLowerCase(),
          ),
      );
      setJobs(completedJobs);
    } catch (error) {
      console.error("Error fetching completed jobs:", error);
      toast({
        title: "Failed to load completed jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompletedJobs();
  }, []);

  const refreshJobs = async () => {
    setRefreshing(true);
    await fetchCompletedJobs();
  };

  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return jobs;

    return jobs.filter((job) => {
      const haystack = [
        job.customer_name,
        job.customer_email,
        job.customer_phone,
        job.job_number,
        job.vehicle_registration,
        job.vehicle_make,
        job.vehicle_model,
        job.technician_name,
        job.technician_phone,
        job.job_description,
        job.work_notes,
        job.completion_notes,
        job.special_instructions,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [jobs, searchTerm]);

  const handleSendToInventory = async (job: CompletedJob) => {
    setSendingJobId(job.id);
    try {
      const response = await fetch(`/api/job-cards/${job.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: "inv" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send job to inventory");
      }

      toast({
        title: "Sent successfully",
        description: `Job ${job.job_number} was sent successfully.`,
      });
      setJobs((prev) => prev.filter((item) => item.id !== job.id));
      if (selectedJob?.id === job.id) {
        setViewJobOpen(false);
      }
    } catch (error) {
      console.error("Error sending job to inventory:", error);
      toast({
        title: "Failed to send",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSendingJobId(null);
    }
  };

  const handleSendToRia = async (job: CompletedJob) => {
    setSendingJobId(job.id);
    try {
      const response = await fetch(`/api/job-cards/${job.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: "accounts" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send job to Ria");
      }

      toast({
        title: "Sent successfully",
        description: `Job ${job.job_number} was sent to Ria successfully.`,
      });
      setJobs((prev) => prev.filter((item) => item.id !== job.id));
      if (selectedJob?.id === job.id) {
        setViewJobOpen(false);
      }
    } catch (error) {
      console.error("Error sending job to Ria:", error);
      toast({
        title: "Failed to send",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSendingJobId(null);
    }
  };

  const handleViewJob = (job: CompletedJob) => {
    setSelectedJob(job);
    setViewJobOpen(true);
  };

  return (
    <div className={embedded ? "p-4 md:p-6" : "container mx-auto p-6"}>
      {!embedded && (
        <div className="mb-4">
          <AdminSubnav />
        </div>
      )}

      <div
        className={`flex items-center justify-between ${embedded ? "mb-4" : "mb-6"}`}
      >
        <div>
          {!embedded && (
            <h1 className="text-3xl font-bold text-gray-900">
              Awaiting Testing
            </h1>
          )}
          {!embedded && (
            <p className="text-gray-600">
              Review completed jobs, technician evidence, notes, and parts
              before handoff
            </p>
          )}
        </div>
        <Button
          onClick={refreshJobs}
          disabled={refreshing}
          className={embedded ? "h-9" : ""}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Card className="mb-6 border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by job, customer, vehicle, technician, notes, or instructions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-green-700">
                <CheckCircle className="h-4 w-4" />
                {filteredJobs.length} awaiting testing
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                <Wrench className="h-4 w-4" />
                {filteredJobs.filter((job) => job.repair).length} repair jobs
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                <Camera className="h-4 w-4" />
                {filteredJobs.reduce(
                  (sum, job) =>
                    sum +
                    parseArrayField(job.before_photos).length +
                    parseArrayField(job.after_photos).length,
                  0,
                )}{" "}
                photos
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900"></div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            {searchTerm
              ? "No jobs matched your search"
              : "No completed jobs found"}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Awaiting Testing Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Job Number
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Job Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Technician
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Completion
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Evidence
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => {
                    const parts = parseArrayField(job.parts_required);
                    const quoteItems = parseArrayField(job.quotation_products);
                    const photoCount =
                      parseArrayField(job.before_photos).length +
                      parseArrayField(job.after_photos).length;
                    return (
                      <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 align-middle">
                          <div>
                            <div className="font-medium text-gray-900">
                              {job.job_number}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge
                                className={`border ${getStatusColor(job.status)}`}
                              >
                                {job.status || "Completed"}
                              </Badge>
                              {job.repair && (
                                <Badge className="border border-purple-200 bg-purple-100 text-purple-800">
                                  Repair
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="font-medium text-gray-900">
                            {job.customer_name || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {job.customer_email ||
                              job.customer_phone ||
                              "No contact info"}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="font-medium text-gray-900">
                            {job.vehicle_registration || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {[
                              job.vehicle_make,
                              job.vehicle_model,
                              job.vehicle_year,
                            ]
                              .filter(Boolean)
                              .join(" ") || "No vehicle details"}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <Badge
                            className={`border ${getJobTypeColor(job.job_type)}`}
                          >
                            {job.job_type || "Job"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="font-medium text-gray-900">
                            {job.technician_name || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {job.technician_phone || "No contact"}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-sm text-gray-700">
                          <div>{formatDate(job.job_date)}</div>
                          <div className="text-xs text-gray-500">
                            {job.actual_duration_hours ||
                              job.estimated_duration_hours ||
                              "N/A"}
                            h
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-sm text-gray-700">
                          <div>{photoCount} photos</div>
                          <div className="text-xs text-gray-500">
                            {parts.length} parts, {quoteItems.length} items
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => handleViewJob(job)}
                              variant="outline"
                              size="sm"
                              disabled={sendingJobId === job.id}
                              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            >
                              View
                            </Button>
                            <Button
                              onClick={() => handleSendToInventory(job)}
                              size="sm"
                              disabled={sendingJobId === job.id}
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              {sendingJobId === job.id
                                ? "Sending..."
                                : "Send to Inventory"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={viewJobOpen} onOpenChange={setViewJobOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FileText className="h-5 w-5 text-blue-600" />
              {selectedJob ? `Job ${selectedJob.job_number}` : "Job Details"}
            </DialogTitle>
          </DialogHeader>
          {selectedJob &&
            (() => {
              const beforePhotos = parseArrayField(selectedJob.before_photos)
                .map(extractPhotoUrl)
                .filter(Boolean) as string[];
              const afterPhotos = parseArrayField(selectedJob.after_photos)
                .map(extractPhotoUrl)
                .filter(Boolean) as string[];
              const parts = parseArrayField(selectedJob.parts_required);
              const quoteItems = parseArrayField(
                selectedJob.quotation_products,
              );

              return (
                <div className="space-y-6">
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selectedJob.job_number}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                          {selectedJob.job_description ||
                            "No description provided"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={`border ${getStatusColor(selectedJob.status)}`}
                        >
                          {selectedJob.status || "Completed"}
                        </Badge>
                        <Badge
                          className={`border ${getJobTypeColor(selectedJob.job_type)}`}
                        >
                          {selectedJob.job_type || "Job"}
                        </Badge>
                        {selectedJob.repair && (
                          <Badge className="border border-purple-200 bg-purple-100 text-purple-800">
                            Repair
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <User className="h-4 w-4 text-gray-500" />
                        Customer
                      </div>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p className="font-medium text-gray-900">
                          {selectedJob.customer_name || "N/A"}
                        </p>
                        <p>{selectedJob.customer_email || "No email"}</p>
                        <p>{selectedJob.customer_phone || "No phone"}</p>
                        {selectedJob.customer_address && (
                          <p>{selectedJob.customer_address}</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Car className="h-4 w-4 text-gray-500" />
                        Vehicle
                      </div>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p className="font-medium text-gray-900">
                          {selectedJob.vehicle_registration || "N/A"}
                        </p>
                        <p>
                          {[
                            selectedJob.vehicle_make,
                            selectedJob.vehicle_model,
                            selectedJob.vehicle_year,
                          ]
                            .filter(Boolean)
                            .join(" ") || "No details"}
                        </p>
                        <p>Job Date: {formatDate(selectedJob.job_date)}</p>
                        <p>Due: {formatDate(selectedJob.due_date)}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Settings className="h-4 w-4 text-gray-500" />
                        Technician
                      </div>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p className="font-medium text-gray-900">
                          {selectedJob.technician_name || "N/A"}
                        </p>
                        <p>{selectedJob.technician_phone || "No contact"}</p>
                        <p>Created: {formatDate(selectedJob.created_at)}</p>
                        <p>Updated: {formatDate(selectedJob.updated_at)}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <ClipboardList className="h-4 w-4 text-gray-500" />
                        Notes
                      </div>
                      <div className="space-y-3 text-sm text-gray-700">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Work Notes
                          </p>
                          <p>
                            {selectedJob.work_notes || "No work notes captured"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Completion Notes
                          </p>
                          <p>
                            {selectedJob.completion_notes ||
                              "No completion notes captured"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Instructions
                          </p>
                          <p>
                            {selectedJob.special_instructions ||
                              "No special instructions"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={() => handleSendToInventory(selectedJob)}
                      disabled={sendingJobId === selectedJob.id}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {sendingJobId === selectedJob.id
                        ? "Sending..."
                        : "Send to Inventory"}
                    </Button>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Wrench className="h-4 w-4 text-gray-500" />
                        Parts Used
                      </div>
                      {parts.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {parts.map((item, index) => {
                            const summary = extractPartSummary(item);
                            return (
                              <div
                                key={`part-${selectedJob.id}-${index}`}
                                className="rounded-lg border bg-slate-50 px-3 py-2 text-sm"
                              >
                                <p className="font-medium text-gray-900">
                                  {summary.title}
                                </p>
                                {summary.subtitle && (
                                  <p className="text-xs text-gray-500">
                                    {summary.subtitle}
                                  </p>
                                )}
                                {summary.quantity !== null && (
                                  <p className="mt-1 text-xs text-gray-600">
                                    Qty: {summary.quantity}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No parts captured
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FileText className="h-4 w-4 text-gray-500" />
                        Quoted / Selected Items
                      </div>
                      {quoteItems.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {quoteItems.map((item, index) => {
                            const summary = extractPartSummary(item);
                            return (
                              <div
                                key={`quote-${selectedJob.id}-${index}`}
                                className="rounded-lg border bg-slate-50 px-3 py-2 text-sm"
                              >
                                <p className="font-medium text-gray-900">
                                  {summary.title}
                                </p>
                                {summary.subtitle && (
                                  <p className="text-xs text-gray-500">
                                    {summary.subtitle}
                                  </p>
                                )}
                                {summary.quantity !== null && (
                                  <p className="mt-1 text-xs text-gray-600">
                                    Qty: {summary.quantity}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No quote items captured
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Camera className="h-4 w-4 text-gray-500" />
                        Before Photos
                      </div>
                      {beforePhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          {beforePhotos.map((url, index) => (
                            <a
                              key={`before-${selectedJob.id}-${index}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-lg border bg-slate-100"
                            >
                              <img
                                src={url}
                                alt={`Before ${index + 1}`}
                                className="h-32 w-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No before photos
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Camera className="h-4 w-4 text-gray-500" />
                        After Photos
                      </div>
                      {afterPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          {afterPhotos.map((url, index) => (
                            <a
                              key={`after-${selectedJob.id}-${index}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-lg border bg-slate-100"
                            >
                              <img
                                src={url}
                                alt={`After ${index + 1}`}
                                className="h-32 w-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No after photos</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompletedJobsPageContent() {
  const searchParams = useSearchParams();
  const embedded = searchParams.get("embedded") === "1";

  return <AwaitingTestingContent embedded={embedded} />;
}

export default function CompletedJobsPage() {
  return (
    <Suspense fallback={<AwaitingTestingContent embedded={false} />}>
      <CompletedJobsPageContent />
    </Suspense>
  );
}
