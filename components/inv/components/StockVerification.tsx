"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, RefreshCw, Loader2, Package, Users, Wrench, Car,
  ChevronDown, ChevronUp, Eye, Trash2, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface StockItem {
  id: number;
  serial_number: string;
  category_code: string;
  status: string;
  company: string | null;
  container: string | null;
  direction: string | null;
  assigned_to_technician: string | null;
  job_card_id: string | null;
  notes: string | null;
  client_code?: string;
  cost_code?: string;
  technician_email?: string;
  technician_name?: string;
  code?: string;
  description?: string;
}

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
  normalized_value: string;
  bucket: "soltrack" | "client" | "technician";
  stock_item: StockItem;
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

  const [verifyModal, setVerifyModal] = useState<{
    open: boolean;
    match: VehicleMatch | null;
    verifying: boolean;
    verified: boolean;
    verifiedItem: StockItem | null;
    deleting: boolean;
  }>({
    open: false,
    match: null,
    verifying: false,
    verified: false,
    verifiedItem: null,
    deleting: false,
  });

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
      toast.error("Failed to load stock verification data");
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

  const openVerifyModal = useCallback((match: VehicleMatch) => {
    setVerifyModal({
      open: true,
      match,
      verifying: true,
      verified: false,
      verifiedItem: null,
      deleting: false,
    });
  }, []);

  const closeVerifyModal = useCallback(() => {
    setVerifyModal((prev) => ({ ...prev, open: false }));
  }, []);

  useEffect(() => {
    if (!verifyModal.open || !verifyModal.match) return;

    const match = verifyModal.match;

    const verifyItem = async () => {
      try {
        const params = new URLSearchParams({
          bucket: match.bucket,
          serial_number: match.serial_number,
        });
        if (match.bucket === "technician" && match.stock_item.technician_email) {
          params.set("technician_email", match.stock_item.technician_email);
        }

        const res = await fetch(`/api/inv/stock-verify?${params.toString()}`, { cache: "no-store" });
        if (res.ok) {
          const result = await res.json();
          setVerifyModal((prev) => ({
            ...prev,
            verifying: false,
            verified: result.found === true,
            verifiedItem: result.item || null,
          }));
        } else {
          setVerifyModal((prev) => ({ ...prev, verifying: false, verified: false }));
        }
      } catch {
        setVerifyModal((prev) => ({ ...prev, verifying: false, verified: false }));
      }
    };

    verifyItem();
  }, [verifyModal.open, verifyModal.match]);

  const handleDelete = useCallback(async () => {
    if (!verifyModal.match || !verifyModal.verifiedItem) return;

    const match = verifyModal.match;
    const item = verifyModal.verifiedItem;

    if (!window.confirm(`Delete item ${item.serial_number} from ${BUCKET_LABELS[match.bucket]}?`)) return;

    setVerifyModal((prev) => ({ ...prev, deleting: true }));

    try {
      const body: Record<string, unknown> = {
        bucket: match.bucket,
        stock_id: item.id,
        serial_number: item.serial_number,
      };
      if (match.bucket === "technician" && match.stock_item.technician_email) {
        body.technician_email = match.stock_item.technician_email;
      }

      const res = await fetch("/api/inv/stock-verify", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete item");
      }

      toast.success(`Item ${item.serial_number} deleted from ${BUCKET_LABELS[match.bucket]}`);
      closeVerifyModal();
      fetchData(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setVerifyModal((prev) => ({ ...prev, deleting: false }));
    }
  }, [verifyModal.match, verifyModal.verifiedItem, closeVerifyModal, fetchData]);

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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Vehicle Stock Verification</h2>
          <p className="mt-1 text-sm text-slate-600">Cross-references vehicle serial numbers/IPs against all stock buckets. Click View to verify and manage.</p>
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

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-base">Vehicle Matches ({filteredMatches.length})</CardTitle>
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
              <table className="w-full min-w-[1100px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Vehicle</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Fleet</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Make / Model</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Account</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Column</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Serial / IP</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Bucket</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Stock Category</th>
                    <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((match, idx) => {
                    const isExpanded = expandedRows.has(idx);
                    const bucketLabel = BUCKET_LABELS[match.bucket] || match.bucket;
                    const bucketColor = BUCKET_COLORS[match.bucket] || "bg-slate-100 text-slate-800";

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
                        <td className="px-3 py-2 text-slate-700 text-[11px]">
                          {match.stock_item.category_code || match.stock_item.code || "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleRow(idx)}
                              className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800"
                            >
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              {isExpanded ? "Hide" : "Details"}
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              onClick={() => openVerifyModal(match)}
                            >
                              <Eye className="mr-1 h-3 w-3" /> View
                            </Button>
                          </div>
                          {isExpanded && (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] space-y-1">
                              <p><strong>Code:</strong> {match.stock_item.category_code || match.stock_item.code || "—"}</p>
                              <p><strong>Description:</strong> {match.stock_item.description || "—"}</p>
                              <p><strong>Status:</strong> {match.stock_item.status || "—"}</p>
                              <p><strong>Company:</strong> {match.stock_item.company || "—"}</p>
                              <p><strong>Vehicle Company:</strong> {match.vehicle_company || "—"}</p>
                              {match.bucket === "client" && (
                                <>
                                  <p><strong>Client:</strong> {match.stock_item.client_code || "—"}</p>
                                  <p><strong>Cost Code:</strong> {match.stock_item.cost_code || "—"}</p>
                                </>
                              )}
                              {match.bucket === "technician" && (
                                <>
                                  <p><strong>Technician:</strong> {match.stock_item.technician_email || "—"}</p>
                                  <p><strong>Tech Name:</strong> {match.stock_item.technician_name || "—"}</p>
                                </>
                              )}
                              {match.bucket === "soltrack" && (
                                <p><strong>Container:</strong> {match.stock_item.container || "—"}</p>
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

      <Dialog open={verifyModal.open} onOpenChange={(open) => { if (!open) closeVerifyModal(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Verify Stock Item
            </DialogTitle>
          </DialogHeader>

          {verifyModal.match && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Vehicle Information</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p><strong>Reg:</strong> {verifyModal.match.vehicle_reg || "N/A"}</p>
                  <p><strong>Fleet:</strong> {verifyModal.match.vehicle_fleet || "N/A"}</p>
                  <p><strong>Make:</strong> {verifyModal.match.vehicle_make || "N/A"}</p>
                  <p><strong>Model:</strong> {verifyModal.match.vehicle_model || "N/A"}</p>
                  <p><strong>Account:</strong> {verifyModal.match.vehicle_account || "N/A"}</p>
                  <p><strong>Company:</strong> {verifyModal.match.vehicle_company || "N/A"}</p>
                </div>
                <div className="mt-2 text-xs">
                  <p><strong>Column:</strong> {formatColumnLabel(verifyModal.match.column_name)}</p>
                  <p><strong>Serial/IP:</strong> <span className="font-mono">{verifyModal.match.serial_number}</span></p>
                </div>
              </div>

              <div className={`rounded-lg border p-4 ${
                verifyModal.verifying
                  ? "border-blue-200 bg-blue-50"
                  : verifyModal.verified
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
              }`}>
                {verifyModal.verifying ? (
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying item in {BUCKET_LABELS[verifyModal.match.bucket]}...
                  </div>
                ) : verifyModal.verified ? (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 mb-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Match Confirmed — Item Found
                    </div>
                    {verifyModal.verifiedItem && (
                      <div className="text-xs space-y-1 text-emerald-900">
                        <p><strong>Serial:</strong> <span className="font-mono">{verifyModal.verifiedItem.serial_number}</span></p>
                        <p><strong>Category:</strong> {verifyModal.verifiedItem.category_code || verifyModal.verifiedItem.code || "—"}</p>
                        <p><strong>Status:</strong> {verifyModal.verifiedItem.status || "—"}</p>
                        <p><strong>Description:</strong> {verifyModal.verifiedItem.description || "—"}</p>
                        {verifyModal.match.bucket === "technician" && (
                          <p><strong>Assigned To:</strong> {verifyModal.verifiedItem.technician_name || verifyModal.verifiedItem.technician_email || "—"}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <XCircle className="h-4 w-4" />
                    Item not found in {BUCKET_LABELS[verifyModal.match.bucket]}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeVerifyModal}>Close</Button>
                {verifyModal.verified && verifyModal.verifiedItem && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={verifyModal.deleting}
                  >
                    {verifyModal.deleting ? (
                      <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Deleting...</>
                    ) : (
                      <><Trash2 className="mr-1 h-3 w-3" /> Delete from {BUCKET_LABELS[verifyModal.match.bucket]}</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
