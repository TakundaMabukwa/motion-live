"use client";

import React, { useEffect, useState } from "react";
import { X, Clock, ArrowRight, User } from "lucide-react";

interface HistoryEntry {
  id: number;
  created_at: string;
  vehicle_unique_id: string;
  reg: string | null;
  fleet_number: string | null;
  new_account_number: string | null;
  operation: string;
  changed_by: string | null;
  changed_fields: Record<string, any>;
}

interface VehicleHistoryDrawerProps {
  vehicle: { unique_id: string; reg?: string; fleet_number?: string };
  onClose: () => void;
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bSub\b/g, "Subscription")
    .replace(/\bRental\b/g, "Rental")
    .replace(/\bFm\b/g, "FM")
    .replace(/\bGps\b/g, "GPS")
    .replace(/\bGsm\b/g, "GSM")
    .replace(/\bVin\b/g, "VIN")
    .replace(/\bId\b/g, "ID")
    .replace(/\bIp\b/g, "IP");
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string" && val === "") return "—";
  if (typeof val === "string" && val.startsWith("[")) {
    try {
      const arr = JSON.parse(val);
      if (Array.isArray(arr) && arr.length > 0) {
        return `${arr.length} item(s)`;
      }
    } catch {}
  }
  if (typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)) && val !== "")) {
    const num = Number(val);
    if (num === 0) return "R 0.00";
    return `R ${num.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return String(val);
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOperationLabel(op: string): string {
  switch (op) {
    case "INSERT":
      return "Vehicle Added";
    case "UPDATE":
      return "Information Updated";
    case "DELETE":
      return "Vehicle Removed";
    default:
      return "Change";
  }
}

function getOperationDotColor(op: string): string {
  switch (op) {
    case "INSERT":
      return "bg-green-500";
    case "UPDATE":
      return "bg-blue-500";
    case "DELETE":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function SkeletonCard() {
  return (
    <div className="animate-pulse border-l-2 border-gray-200 pl-4">
      <div className="mb-1 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-gray-200" />
        <div className="h-3 w-32 rounded bg-gray-200" />
      </div>
      <div className="mb-2 h-3 w-20 rounded bg-gray-200" />
      <div className="space-y-1.5 pl-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="h-3 w-4 rounded bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-28 rounded bg-gray-200" />
          <div className="h-3 w-4 rounded bg-gray-200" />
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export default function VehicleHistoryDrawer({
  vehicle,
  onClose,
}: VehicleHistoryDrawerProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchHistory(0);
  }, [vehicle.unique_id]);

  async function fetchHistory(newOffset: number) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/vehicles/history?unique_id=${encodeURIComponent(vehicle.unique_id)}&limit=${limit}&offset=${newOffset}`,
      );
      const data = await res.json();
      if (newOffset === 0) {
        setHistory(data.history || []);
      } else {
        setHistory((prev) => [...prev, ...(data.history || [])]);
      }
      setHasMore(data.hasMore || false);
      setOffset(newOffset);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  }

  // Group entries by date
  const groupedByDate = history.reduce((acc, entry) => {
    const date = new Date(entry.created_at).toLocaleDateString("en-ZA", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, HistoryEntry[]>);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto flex h-full w-full max-w-[480px] flex-col border-l border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Change History
              </h3>
              <p className="text-xs text-gray-500">
                {vehicle.reg || vehicle.fleet_number || vehicle.unique_id}
                {vehicle.reg && vehicle.fleet_number
                  ? ` · ${vehicle.fleet_number}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && history.length === 0 ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No changes recorded</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedByDate).map(([date, entries]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      {date}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  {/* Entries for this date */}
                  <div className="space-y-3">
                    {entries.map((entry) => {
                      const fields = entry.changed_fields || {};
                      const fieldKeys = Object.keys(fields).filter(
                        (k) => k !== "operation",
                      );

                      return (
                        <div
                          key={entry.id}
                          className="border-l-2 border-gray-200 pl-4"
                        >
                          {/* Entry header */}
                          <div className="mb-1 flex items-center gap-2">
                            <div
                              className={`h-2 w-2 rounded-full ${getOperationDotColor(entry.operation)}`}
                            />
                            <span className="text-xs font-semibold text-gray-800">
                              {getOperationLabel(entry.operation)}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              · {formatTimestamp(entry.created_at)}
                            </span>
                          </div>

                          {/* Changed by */}
                          {entry.changed_by && (
                            <div className="mb-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                              <User className="h-3 w-3" />
                              <span>{entry.changed_by}</span>
                            </div>
                          )}

                          {/* Field changes */}
                          <div className="space-y-1 rounded-md bg-gray-50 p-2.5">
                            {fieldKeys.slice(0, 10).map((key) => {
                              const change = fields[key];
                              const isInsert = entry.operation === "INSERT";
                              const isDelete = entry.operation === "DELETE";

                              if (isInsert) {
                                return (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-gray-600">
                                      {formatFieldName(key)}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {formatValue(change)}
                                    </span>
                                  </div>
                                );
                              }

                              if (isDelete) {
                                return (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-gray-600">
                                      {formatFieldName(key)}
                                    </span>
                                    <span className="text-gray-500 line-through">
                                      {formatValue(change)}
                                    </span>
                                  </div>
                                );
                              }

                              // UPDATE - show old → new
                              const oldVal = change?.old;
                              const newVal = change?.new;
                              return (
                                <div
                                  key={key}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-gray-600">
                                    {formatFieldName(key)}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-gray-400 line-through">
                                      {formatValue(oldVal)}
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-gray-300" />
                                    <span className="font-medium text-gray-900">
                                      {formatValue(newVal)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {fieldKeys.length > 10 && (
                              <p className="pt-1 text-center text-[10px] text-gray-400">
                                + {fieldKeys.length - 10} more fields
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <button
                  type="button"
                  onClick={() => fetchHistory(offset + limit)}
                  disabled={loading}
                  className="w-full rounded-md border border-gray-200 bg-white py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load more changes"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
