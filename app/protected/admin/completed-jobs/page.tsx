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
  Label,
} from "@/components/ui/label";
import {
  Textarea,
} from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Upload,
  X,
  Image,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import AdminSubnav from "@/components/admin/AdminSubnav";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface CompletedJob {
  id: string;
  job_number: string;
  job_date: string;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  status: string;
  job_status?: string;
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
  vehicle_chassis?: string;
  vehicle_colour?: string;
  vin_number?: string;
  technician_name: string;
  technician_phone: string;
  estimated_duration_hours: number;
  actual_duration_hours: number;
  created_at: string;
  updated_at: string;
  repair: boolean;
  is_invoiced?: boolean;
  role: string;
  move_to?: string;
  parts_required?: unknown;
  quotation_products?: unknown;
  equipment_used?: unknown;
  before_photos?: unknown;
  after_photos?: unknown;
  work_notes?: string;
  completion_notes?: string;
  special_instructions?: string;
  admin_notes?: string;
  screenshots?: unknown;
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

const jobTypeOptions = [
  "install",
  "deinstall",
  "maintenance",
  "repair",
  "calibration",
  "admin_created",
] as const;

const statusOptions = [
  "pending",
  "assigned",
  "completed",
  "invoiced",
  "on_hold",
  "cancelled",
] as const;

const priorityOptions = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

const SectionProps = {
  job: {} as CompletedJob,
  formData: {} as Record<string, any>,
  setFormData: (() => {}) as (data: Record<string, any>) => void,
};

function JobInfoSection({
  job,
  formData,
  setFormData,
}: {
  job: CompletedJob;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label className="block text-sm font-medium text-gray-700 mb-1">Job Number</Label>
            <Input
              value={formData.job_number || ""}
              onChange={(e) => setFormData({ ...formData, job_number: e.target.value })}
              className="font-mono text-lg font-bold"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Status</Label>
            <Badge className={`border text-sm px-3 py-1 ${getStatusColor(formData.status || job.status)}`}>
              {(formData.status || job.status || "pending").charAt(0).toUpperCase() + (formData.status || job.status || "pending").slice(1)}
            </Badge>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Job Type</Label>
            <Badge className={`border text-sm px-3 py-1 ${getJobTypeColor(formData.job_type || job.job_type)}`}>
              {(formData.job_type || job.job_type || "install").charAt(0).toUpperCase() + (formData.job_type || job.job_type || "install").slice(1)}
            </Badge>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Label className="block text-sm font-medium text-gray-700 mb-1">Description</Label>
        <Textarea
          value={formData.job_description || ""}
          onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
        />
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">Job Date</Label>
          <Input
            type="date"
            value={formData.job_date || ""}
            onChange={(e) => setFormData({ ...formData, job_date: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">Due Date</Label>
          <Input
            type="date"
            value={formData.due_date || ""}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          />
        </div>
        <div className="sm:col-span-1">
          <Label className="block text-sm font-medium text-gray-700 mb-1">Start Time</Label>
          <Input
            type="time"
            value={formData.start_time || ""}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>
        <div className="sm:col-span-1">
          <Label className="block text-sm font-medium text-gray-700 mb-1">End Time</Label>
          <Input
            type="time"
            value={formData.end_time || ""}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Est. Duration (hrs)</Label>
          <Input
            type="number"
            step="0.5"
            value={formData.estimated_duration_hours || ""}
            onChange={(e) => setFormData({ ...formData, estimated_duration_hours: e.target.value })}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Actual Duration (hrs)</Label>
          <Input
            type="number"
            step="0.5"
            value={formData.actual_duration_hours || ""}
            onChange={(e) => setFormData({ ...formData, actual_duration_hours: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="block text-sm font-medium text-gray-700 mb-1">Repair Job</Label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.repair || false}
              disabled
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">{formData.repair ? "Yes" : "No"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerSection({
  job,
  formData,
  setFormData,
}: {
  job: CompletedJob;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <User className="h-4 w-4 text-gray-500" />
        Customer
      </div>
      <div className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Name</Label>
            <Input
              value={formData.customer_name || ""}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Email</Label>
            <Input
              type="email"
              value={formData.customer_email || ""}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Phone</Label>
            <Input
              value={formData.customer_phone || ""}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Address</Label>
          <Textarea
            value={formData.customer_address || ""}
            onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function VehicleSection({
  job,
  formData,
  setFormData,
}: {
  job: CompletedJob;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Car className="h-4 w-4 text-gray-500" />
        Vehicle
      </div>
      <div className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Registration</Label>
            <Input
              value={formData.vehicle_registration || ""}
              onChange={(e) => setFormData({ ...formData, vehicle_registration: e.target.value })}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">VIN / Chassis</Label>
            <Input
              value={formData.vin_number || formData.vehicle_chassis || ""}
              onChange={(e) => setFormData({ ...formData, vin_number: e.target.value, vehicle_chassis: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Make</Label>
            <Input
              value={formData.vehicle_make || ""}
              onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Model</Label>
            <Input
              value={formData.vehicle_model || ""}
              onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Year</Label>
            <Input
              type="number"
              value={formData.vehicle_year || ""}
              onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Colour</Label>
            <Input
              value={formData.vehicle_colour || ""}
              onChange={(e) => setFormData({ ...formData, vehicle_colour: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TechnicianSection({
  job,
  formData,
  setFormData,
}: {
  job: CompletedJob;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Settings className="h-4 w-4 text-gray-500" />
        Technician
      </div>
      <div className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Name</Label>
            <Input
              value={formData.technician_name || ""}
              onChange={(e) => setFormData({ ...formData, technician_name: e.target.value })}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Email / Phone</Label>
            <Input
              value={formData.technician_phone || ""}
              onChange={(e) => setFormData({ ...formData, technician_phone: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-xs text-gray-500">
          <div>
            <span className="font-medium">Created:</span> {formatDate(job.created_at)}
          </div>
          <div>
            <span className="font-medium">Updated:</span> {formatDate(job.updated_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotesSection({
  job,
  formData,
  setFormData,
}: {
  job: CompletedJob;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <ClipboardList className="h-4 w-4 text-gray-500" />
        Notes
      </div>
      <div className="space-y-4 text-sm">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Work Notes</Label>
          <Textarea
            value={formData.work_notes || ""}
            onChange={(e) => setFormData({ ...formData, work_notes: e.target.value })}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Completion Notes</Label>
          <Textarea
            value={formData.completion_notes || ""}
            onChange={(e) => setFormData({ ...formData, completion_notes: e.target.value })}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</Label>
          <Textarea
            value={formData.special_instructions || ""}
            onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
          />
        </div>
        <div className="border-t pt-4">
          <Label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</Label>
          <Textarea
            value={formData.admin_notes || ""}
            onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
            placeholder="Internal admin notes for testing review..."
            className="bg-amber-50 border-amber-200"
          />
        </div>
      </div>
    </div>
  );
}

function PartsUsedSection({
  job,
  formData,
  setFormData,
}: {
  job: CompletedJob;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}) {
  const parts = parseArrayField(job.parts_required);
  const equipment = parseArrayField(job.equipment_used);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Wrench className="h-4 w-4 text-gray-500" />
        Parts Used / Equipment Used
      </div>
      <div className="space-y-3">
        {parts.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Parts Required</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {parts.map((item, index) => {
                const summary = extractPartSummary(item);
                return (
                  <div
                    key={`part-${job.id}-${index}`}
                    className="rounded-lg border bg-slate-50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-gray-900">{summary.title}</p>
                    {summary.subtitle && (
                      <p className="text-xs text-gray-500">{summary.subtitle}</p>
                    )}
                    {summary.quantity !== null && (
                      <p className="mt-1 text-xs text-gray-600">Qty: {summary.quantity}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No parts captured</p>
        )}
        {equipment.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Equipment Used</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {equipment.map((item, index) => {
                const summary = extractPartSummary(item);
                return (
                  <div
                    key={`equip-${job.id}-${index}`}
                    className="rounded-lg border bg-blue-50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-gray-900">{summary.title}</p>
                    {summary.subtitle && (
                      <p className="text-xs text-gray-500">{summary.subtitle}</p>
                    )}
                    {summary.quantity !== null && (
                      <p className="mt-1 text-xs text-gray-600">Qty: {summary.quantity}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No equipment used captured</p>
        )}
      </div>
    </div>
  );
}

function QuotedItemsSection({
  job,
  formData,
  setFormData,
}: {
  job: CompletedJob;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
}) {
  const quoteItems = parseArrayField(job.quotation_products);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <FileText className="h-4 w-4 text-gray-500" />
        Quoted / Selected Items
      </div>
      <div className="space-y-3">
        {quoteItems.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {quoteItems.map((item, index) => {
              const summary = extractPartSummary(item);
              return (
                <div
                  key={`quote-${job.id}-${index}`}
                  className="rounded-lg border bg-slate-50 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-gray-900">{summary.title}</p>
                  {summary.subtitle && (
                    <p className="text-xs text-gray-500">{summary.subtitle}</p>
                  )}
                  {summary.quantity !== null && (
                    <p className="mt-1 text-xs text-gray-600">Qty: {summary.quantity}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No quote items captured</p>
        )}
      </div>
    </div>
  );
}

function ScreenshotsSection({
  job,
  formData,
  setFormData,
  screenshots,
  uploadingImages,
  onUpload,
  onRemove,
  fileInputRef,
}: {
  job: CompletedJob;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  screenshots: string[];
  uploadingImages: string[];
  onUpload: (files: FileList) => void;
  onRemove: (url: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Image className="h-4 w-4 text-gray-500" />
          Testing Screenshots
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => e.target.files && onUpload(e.target.files)}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploadingImages.length > 0}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Add Images
          </Button>
        </div>
      </div>
      {uploadingImages.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading {uploadingImages.length} image(s)...
          </div>
          <div className="mt-1 text-xs">
            {uploadingImages.join(", ")}
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {screenshots.length === 0 && (
          <div className="col-span-full py-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
            <Image className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No testing screenshots uploaded</p>
            <p className="text-xs">Click &quot;Add Images&quot; to upload screenshots from testing</p>
          </div>
        )}
        {screenshots.map((url, index) => (
          <div
            key={url}
            className="relative group overflow-hidden rounded-lg border bg-slate-100"
          >
            <a href={url} target="_blank" rel="noreferrer" className="block">
              <img
                src={url}
                alt={`Screenshot ${index + 1}`}
                className="h-32 w-full object-cover"
              />
            </a>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-white hover:text-blue-200"
                title="Open full size"
              >
                <span className="sr-only">Open</span>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </a>
              <button
                onClick={() => onRemove(url)}
                className="text-white hover:text-red-200"
                title="Remove"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotosSection({
  job,
}: {
  job: CompletedJob;
}) {
  const beforePhotos = parseArrayField(job.before_photos)
    .map(extractPhotoUrl)
    .filter(Boolean) as string[];
  const afterPhotos = parseArrayField(job.after_photos)
    .map(extractPhotoUrl)
    .filter(Boolean) as string[];

  return (
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
                key={`before-${job.id}-${index}`}
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
          <p className="text-sm text-gray-500 py-8 text-center">No before photos</p>
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
                key={`after-${job.id}-${index}`}
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
          <p className="text-sm text-gray-500 py-8 text-center">No after photos</p>
        )}
      </div>
    </div>
  );
}

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
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [pendingMoveJob, setPendingMoveJob] = useState<CompletedJob | null>(null);
  const [moveNote, setMoveNote] = useState("");

  const fetchCompletedJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/jobs/awaiting-testing");
      if (!response.ok) throw new Error("Failed to fetch completed jobs");
      const data = await response.json();
      setJobs(data.jobs || []);
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

  const handleSendToInventory = async (job: CompletedJob, note: string) => {
    setSendingJobId(job.id);
    try {
      const response = await fetch(`/api/job-cards/${job.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: "inv",
          inventoryPlacement: "completed-jobs",
          note,
        }),
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

  const handleViewJob = (job: CompletedJob) => {
    setSelectedJob(job);
    setViewJobOpen(true);
  };

  const handleJobSaved = (updatedJob: CompletedJob) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === updatedJob.id ? { ...job, ...updatedJob } : job))
    );
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
                            {job.customer_email || job.customer_phone || "No contact info"}
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
                              onClick={() => {
                                setPendingMoveJob(job);
                                setMoveNote("");
                                setShowMoveDialog(true);
                              }}
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

      <JobDetailDialog
        job={selectedJob}
        open={viewJobOpen}
        onOpenChange={setViewJobOpen}
        onSaved={handleJobSaved}
      />

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Job to Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Note *</Label>
              <Textarea
                value={moveNote}
                onChange={(e) => setMoveNote(e.target.value)}
                placeholder="Why are you sending this job to inventory?"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMoveDialog(false);
                  setPendingMoveJob(null);
                  setMoveNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!moveNote.trim()}
                onClick={() => {
                  if (pendingMoveJob && moveNote.trim()) {
                    handleSendToInventory(pendingMoveJob, moveNote.trim());
                    setShowMoveDialog(false);
                    setPendingMoveJob(null);
                    setMoveNote("");
                  }
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Send to Inventory
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobDetailDialog({
  job,
  open,
  onOpenChange,
  onSaved,
}: {
  job: CompletedJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (job: CompletedJob) => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (job && open) {
      const parsedScreenshots = parseArrayField(job.screenshots)
        .map(extractPhotoUrl)
        .filter(Boolean) as string[];
      setScreenshots(parsedScreenshots);
      setFormData({
        job_number: job.job_number,
        job_date: job.job_date ? job.job_date.split("T")[0] : "",
        due_date: job.due_date ? job.due_date.split("T")[0] : "",
        start_time: job.start_time ? job.start_time.split("T")[1]?.substring(0, 5) : "",
        end_time: job.end_time ? job.end_time.split("T")[1]?.substring(0, 5) : "",
        status: job.status || "pending",
        job_type: job.job_type || "install",
        job_description: job.job_description || "",
        customer_name: job.customer_name || "",
        customer_email: job.customer_email || "",
        customer_phone: job.customer_phone || "",
        customer_address: job.customer_address || "",
        vehicle_registration: job.vehicle_registration || "",
        vehicle_make: job.vehicle_make || "",
        vehicle_model: job.vehicle_model || "",
        vehicle_year: job.vehicle_year || "",
        vehicle_chassis: job.vehicle_chassis || "",
        vehicle_colour: job.vehicle_colour || "",
        vin_number: job.vin_number || "",
        technician_name: job.technician_name || "",
        technician_phone: job.technician_phone || "",
        estimated_duration_hours: job.estimated_duration_hours || "",
        actual_duration_hours: job.actual_duration_hours || "",
        work_notes: job.work_notes || "",
        completion_notes: job.completion_notes || "",
        special_instructions: job.special_instructions || "",
        admin_notes: job.admin_notes || "",
        repair: job.repair || false,
      });
    }
  }, [job, open]);

  const uploadScreenshot = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from("testing")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("testing")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleScreenshotUpload = async (files: FileList) => {
    const newFiles = Array.from(files);
    setUploadingImages((prev) => [...prev, ...newFiles.map((f) => f.name)]);

    try {
      for (const file of newFiles) {
        const url = await uploadScreenshot(file);
        setScreenshots((prev) => [...prev, url]);
      }
    } catch (error) {
      console.error("Error uploading screenshot:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload one or more images",
        variant: "destructive",
      });
    } finally {
      setUploadingImages([]);
    }
  };

  const removeScreenshot = async (url: string) => {
    setScreenshots((prev) => prev.filter((u) => u !== url));
    try {
      const path = url.split("/testing/")[1];
      if (path) {
        await supabase.storage.from("testing").remove([path]);
      }
    } catch {
      // File may already be deleted or was never uploaded
    }
  };

  const handleSave = async () => {
    if (!job) return;
    setSaving(true);

    const SAVEABLE_COLUMNS: Record<string, string> = {
      job_number: "job_number",
      job_date: "job_date",
      due_date: "due_date",
      start_time: "start_time",
      end_time: "end_time",
      status: "status",
      job_type: "job_type",
      job_description: "job_description",
      customer_name: "customer_name",
      customer_email: "customer_email",
      customer_phone: "customer_phone",
      customer_address: "customer_address",
      vehicle_registration: "vehicle_registration",
      vehicle_make: "vehicle_make",
      vehicle_model: "vehicle_model",
      vehicle_year: "vehicle_year",
      vehicle_chassis: "vehicle_chassis",
      vehicle_colour: "vehicle_colour",
      vin_number: "vin_numer",
      technician_name: "technician_name",
      technician_phone: "technician_phone",
      estimated_duration_hours: "estimated_duration_hours",
      actual_duration_hours: "actual_duration_hours",
      work_notes: "work_notes",
      completion_notes: "completion_notes",
      special_instructions: "special_instructions",
      admin_notes: "admin_notes",
      repair: "repair",
    };

    const payload: Record<string, any> = {};
    for (const [formKey, dbCol] of Object.entries(SAVEABLE_COLUMNS)) {
      if (formKey in formData) {
        payload[dbCol] = formData[formKey];
      }
    }
    payload.screenshots = screenshots;
    delete payload.parts_required;
    delete payload.equipment_used;

    for (const key of ["estimated_duration_hours", "actual_duration_hours", "vehicle_year"]) {
      if (key in payload) {
        const val = payload[key];
        if (val === "" || val === null || val === undefined || !Number.isFinite(Number(val))) {
          delete payload[key];
        }
      }
    }

    if (payload.start_time && !payload.start_time.includes("T")) {
      const datePart = payload.job_date || job.job_date?.split("T")[0] || new Date().toISOString().split("T")[0];
      payload.start_time = `${datePart}T${payload.start_time}:00`;
    }
    if (payload.end_time && !payload.end_time.includes("T")) {
      const datePart = payload.job_date || job.job_date?.split("T")[0] || new Date().toISOString().split("T")[0];
      payload.end_time = `${datePart}T${payload.end_time}:00`;
    }

    try {
      const response = await fetch(`/api/job-cards/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save job");
      }

      const updatedJob = await response.json();
      onSaved({ ...job, ...updatedJob });

      toast({
        title: "Saved successfully",
        description: `Job ${job.job_number} has been updated`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving job:", error);
      toast({
        title: "Save failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col" showCloseButton={false}>
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileText className="h-5 w-5 text-blue-600" />
            {job ? `Job ${job.job_number}` : "Job Details"}
          </DialogTitle>
        </DialogHeader>
        {job && (
          <div className="flex-1 overflow-y-auto space-y-6 p-4">
            <JobInfoSection job={job} formData={formData} setFormData={setFormData} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <CustomerSection job={job} formData={formData} setFormData={setFormData} />
              <VehicleSection job={job} formData={formData} setFormData={setFormData} />
              <TechnicianSection job={job} formData={formData} setFormData={setFormData} />
              <NotesSection job={job} formData={formData} setFormData={setFormData} />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <PartsUsedSection job={job} formData={formData} setFormData={setFormData} />
              <QuotedItemsSection job={job} formData={formData} setFormData={setFormData} />
            </div>
            <ScreenshotsSection
              job={job}
              formData={formData}
              setFormData={setFormData}
              screenshots={screenshots}
              uploadingImages={uploadingImages}
              onUpload={handleScreenshotUpload}
              onRemove={removeScreenshot}
              fileInputRef={fileInputRef}
            />
            <PhotosSection job={job} />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
