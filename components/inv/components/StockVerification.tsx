"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, RefreshCw, Loader2, Package, Users, Wrench, Car,
  ChevronDown, ChevronUp, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VehicleMatch {
  vehicle_id: number;
  vehicle_reg: string | null;
  vehicle_fleet: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_account: string | null;
  vehicle_company: string | null;
  column_name: string;
  serial_number: string;
  bucket: "soltrack" | "client" | "technician";
  stock_item: Record<string, unknown>;
}

interface VerificationData {
  soltrackCount: number;
  clientCount: number;
  techCount: number;
  vehicleMatchCount: number;
  bucketBreakdown: { soltrack: number; client: number; technician: number };
  vehicleMatches: VehicleMatch[];
}

const BUCKET_LABELS: Record<string, string> = {
  soltrack: "Soltrack Stock",
  client: "Client Stock",
  technician: "Technician Stock",
};

const BUCKET_COLORS: Record<string, string> = {
  soltrack: "bg-blue-100 text-blue-800",
  client: "bg-purple-100 text-purple-800",
  technician: "bg-amber-100 text-amber-800",
};

const formatColumnLabel = (col: string) =>
  col
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Ip\b/, "IP")
    .replace(/Sim\b/, "SIM")
    .replace(/Vw/, "VW")
    .replace(/Pfk/, "PFK")
    .replace(/Dvr/, "DVR")
    .replace(/Mec/, "MEC")
    .replace(/Ch\b/, "CH");

export default function StockVerification() {
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/inv/stock-verification?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch stock verification data");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching stock verification:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const toggleRow = useCallback((idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const filteredMatches = useMemo(() => {
    if (!data) return [];
    if (bucketFilter === "all") return data.vehicleMatches;
    return data.vehicleMatches.filter((m) => m.bucket === bucketFilter);
  }, [data, bucketFilter]);

  const stats = useMemo(() => {
    if (!data) return null;
    return [
      { label: "Soltrack Items", value: data.soltrackCount, icon: Package, bg: "bg-blue-100 text-blue-700" },
      { label: "Client Items", value: data.clientCount, icon: Users, bg: "bg-purple-100 text-purple-700" },
      { label: "Technician Items", value: data.techCount, icon: Wrench, bg: "bg-amber-100 text-amber-700" },
      { label: "Vehicle Matches", value: data.vehicleMatchCount, icon: Car, bg: "bg-emerald-100 text-emerald-700" },
    ];
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats?.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{m.label}</span>
                  <div className={`flex justify-center items-center rounded-lg w-7 h-7 ${m.bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="mt-1 text-xl font-bold leading-none text-slate-900">{m.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search + Bucket Filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Vehicle Stock Verification
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cross-references vehicle serial numbers/IPs against all stock buckets.
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative min-w-0 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search vehicles, serials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <Button variant="outline" onClick={handleSearch} className="h-10 shrink-0">
            <Search className="mr-1 h-4 w-4" /> Search
          </Button>
          <Button variant="outline" onClick={() => fetchData(true)} disabled={refreshing} className="h-10 shrink-0">
            <RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Bucket Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: "all", label: "All Matches" },
          { id: "soltrack", label: `Soltrack (${data?.bucketBreakdown.soltrack || 0})` },
          { id: "client", label: `Client (${data?.bucketBreakdown.client || 0})` },
          { id: "technician", label: `Technician (${data?.bucketBreakdown.technician || 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setBucketFilter(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              bucketFilter === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-base">
            Vehicle Matches ({filteredMatches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
              Loading stock verification data...
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="py-10 text-center">
              <Car className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-base font-medium text-slate-900">No matches found</p>
              <p className="mt-1 text-sm text-slate-500">
                {search ? "Try a different search term." : "No vehicle serial numbers match any stock items."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Vehicle</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Fleet</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Make / Model</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Account</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Column</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Serial / IP</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Bucket</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Stock Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((match, idx) => {
                    const isExpanded = expandedRows.has(idx);
                    const bucketLabel = BUCKET_LABELS[match.bucket] || match.bucket;
                    const bucketColor = BUCKET_COLORS[match.bucket] || "bg-slate-100 text-slate-800";
                    const stockItem = match.stock_item;

                    return (
                      <tr key={idx} className="border-b border-slate-100 align-top hover:bg-slate-50/60">
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {match.vehicle_reg || "N/A"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {match.vehicle_fleet || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <div>{match.vehicle_make || "—"}</div>
                          <div className="text-[11px] text-slate-500">{match.vehicle_model || ""}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700 font-mono text-[11px]">
                          {match.vehicle_account || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700 text-[11px]">
                          {formatColumnLabel(match.column_name)}
                        </td>
                        <td className="px-3 py-2 text-slate-700 font-mono text-[11px]">
                          {match.serial_number}
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={`text-[10px] px-1.5 py-0 ${bucketColor}`}>
                            {bucketLabel}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleRow(idx)}
                            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800"
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {isExpanded ? "Hide" : "Details"}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] space-y-1">
                              <p><strong>Code:</strong> {String(stockItem?.category_code || stockItem?.code || "—")}</p>
                              <p><strong>Description:</strong> {String(stockItem?.description || "—")}</p>
                              <p><strong>Status:</strong> {String(stockItem?.status || "—")}</p>
                              <p><strong>Company:</strong> {String(stockItem?.company || "—")}</p>
                              {match.bucket === "client" && (
                                <>
                                  <p><strong>Client:</strong> {String(stockItem?.client_code || "—")}</p>
                                  <p><strong>Cost Code:</strong> {String(stockItem?.cost_code || "—")}</p>
                                </>
                              )}
                              {match.bucket === "technician" && (
                                <>
                                  <p><strong>Technician:</strong> {String(stockItem?.technician_email || "—")}</p>
                                  <p><strong>Tech Name:</strong> {String(stockItem?.technician_name || "—")}</p>
                                </>
                              )}
                              {match.bucket === "soltrack" && (
                                <p><strong>Container:</strong> {String(stockItem?.container || "—")}</p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
