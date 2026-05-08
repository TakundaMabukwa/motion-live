"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Hash,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface CostCenter {
  id: string;
  created_at: string;
  cost_code: string;
  company: string;
  operational?: boolean;
  cost_center_code?: string | null;
  effective_cost_code?: string | null;
  site_allocated?: string | null;
}

interface VehicleSummary {
  id: string | number;
  reg?: string | null;
  fleet_number?: string | null;
  make?: string | null;
  model?: string | null;
  new_account_number?: string | null;
}

interface DeleteModalState {
  open: boolean;
  cost_code: string;
  company: string;
}

const normalizeCode = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase();

const getCenterCode = (center: CostCenter) => {
  const operationalCode = normalizeCode(center?.cost_center_code);
  if (center?.operational && operationalCode) {
    return operationalCode;
  }

  const effective = normalizeCode(center?.effective_cost_code);
  if (effective) return effective;

  return normalizeCode(center?.cost_code);
};

const getCenterDisplayLabel = (center: CostCenter) => {
  const siteName = String(center?.site_allocated || "").trim();
  if (center?.operational && siteName) {
    const code = getCenterCode(center);
    return code ? `${siteName} (${code})` : siteName;
  }

  return getCenterCode(center);
};

const resolveOperationalAwareCenters = (rows: CostCenter[]) => {
  const grouped = new Map<string, CostCenter[]>();
  for (const row of rows || []) {
    const accountCode = normalizeCode(row?.cost_code);
    if (!accountCode) continue;
    const bucket = grouped.get(accountCode) || [];
    bucket.push(row);
    grouped.set(accountCode, bucket);
  }

  const resolved: CostCenter[] = [];
  for (const [accountCode, groupRows] of grouped.entries()) {
    const operationalRows = groupRows.filter(
      (row) => Boolean(row?.operational) && normalizeCode(row?.cost_center_code),
    );

    if (operationalRows.length > 0) {
      const seenOperationalCodes = new Set<string>();
      const sortedOperational = operationalRows
        .slice()
        .sort((a, b) => getCenterCode(a).localeCompare(getCenterCode(b)));

      for (const row of sortedOperational) {
        const code = getCenterCode(row);
        if (!code || seenOperationalCodes.has(code)) continue;
        seenOperationalCodes.add(code);
        resolved.push({
          ...row,
          effective_cost_code: code,
        });
      }
      continue;
    }

    const first = groupRows
      .slice()
      .sort((a, b) => {
        const aTime = new Date(String(a?.created_at || 0)).getTime();
        const bTime = new Date(String(b?.created_at || 0)).getTime();
        return aTime - bTime;
      })[0];

    if (first) {
      resolved.push({
        ...first,
        effective_cost_code: getCenterCode(first) || accountCode,
      });
    }
  }

  return resolved.sort((a, b) => getCenterCode(a).localeCompare(getCenterCode(b)));
};

function ClientCostCentersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountsParam = searchParams.get("accounts");

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [filteredCostCenters, setFilteredCostCenters] = useState<CostCenter[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [accountNumbers, setAccountNumbers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [creatingCostCenter, setCreatingCostCenter] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCostCenterCompany, setNewCostCenterCompany] = useState("");
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    open: false,
    cost_code: "",
    company: "",
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteVehiclesLoading, setDeleteVehiclesLoading] = useState(false);
  const [deleteVehicles, setDeleteVehicles] = useState<VehicleSummary[]>([]);
  const [deleteAction, setDeleteAction] = useState("none");

  const itemsPerPage = 50;

  useEffect(() => {
    if (accountsParam) {
      const decodedAccounts = decodeURIComponent(accountsParam);
      const accounts = decodedAccounts
        .split(",")
        .map((acc) => acc.trim())
        .filter((acc) => acc);
      console.log("🔍 [COST CENTERS] URL accounts param:", accountsParam);
      console.log("🔍 [COST CENTERS] Decoded accounts:", decodedAccounts);
      console.log("🔍 [COST CENTERS] Parsed accounts array:", accounts);
      setAccountNumbers(accounts);
      if (accounts[0]) {
        const derivedPrefix = accounts[0].split("-")[0]?.trim() || "";
        setClientInfo({ company_group: derivedPrefix || accounts[0] });
        fetchClientGroupInfo(accounts[0]);
      }
      fetchCostCenters(decodedAccounts);
    }
  }, [accountsParam]);

  const fetchClientGroupInfo = async (account: string) => {
    try {
      const response = await fetch(
        `/api/customers-grouped/by-account/${encodeURIComponent(account)}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch grouped client info");
      }

      const payload = await response.json();
      setClientInfo((prev: any) => ({
        ...prev,
        ...payload,
      }));
    } catch (error) {
      console.error("Error fetching grouped client info:", error);
    }
  };

  // Filter cost centers based on search term (company only)
  useEffect(() => {
    console.log(
      "🔍 [COST CENTERS] Filtering cost centers. Search term:",
      searchTerm,
    );
    console.log("🔍 [COST CENTERS] Total cost centers:", costCenters.length);
    console.log("🔍 [COST CENTERS] Cost centers data:", costCenters);

    if (searchTerm.trim() === "") {
      console.log("✅ [COST CENTERS] No search term, showing all cost centers");
      setFilteredCostCenters(costCenters);
    } else {
      const filtered = costCenters.filter((center) =>
        center.company?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      console.log("🔍 [COST CENTERS] Filtered results:", filtered.length);
      console.log("🔍 [COST CENTERS] Filtered data:", filtered);
      setFilteredCostCenters(filtered);
    }
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, costCenters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCostCenters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCostCenters = filteredCostCenters.slice(startIndex, endIndex);

  const fetchCostCenters = async (allNewAccountNumbers: string) => {
    if (isRequestInProgress) {
      console.log(
        "⏳ [COST CENTERS] Request already in progress, skipping duplicate call",
      );
      return;
    }

    try {
      setIsRequestInProgress(true);
      setLoading(true);
      console.log(
        "🔍 [COST CENTERS] Fetching cost centers from database for account numbers:",
        allNewAccountNumbers,
      );

      // Parse account numbers
      const accounts = allNewAccountNumbers
        .split(",")
        .map((acc) => acc.trim())
        .filter((acc) => acc);
      console.log("🔢 [COST CENTERS] Parsed account numbers:", accounts);

      if (accounts.length === 0) {
        console.log("⚠️ [COST CENTERS] No account numbers provided");
        setCostCenters([]);
        return;
      }

      // Fetch cost centers from the database where cost_code matches account numbers
      const normalizedAccounts = accounts.map((acc) => acc.toUpperCase());
      const isSingleAccount = normalizedAccounts.length === 1;
      const singleAccount = normalizedAccounts[0] || "";
      const prefix = singleAccount.split("-")[0]?.trim();
      const apiUrl =
        isSingleAccount && prefix
          ? `/api/cost-centers?prefix=${encodeURIComponent(prefix)}`
          : `/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(allNewAccountNumbers)}`;
      console.log("🌐 [COST CENTERS] API call:", apiUrl);

      const response = await fetch(apiUrl, { cache: "no-store" });

      console.log("📡 [COST CENTERS] Response status:", response.status);
      console.log(
        "📡 [COST CENTERS] Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [COST CENTERS] Response not ok:", errorText);
        throw new Error(
          `Failed to fetch cost centers: ${response.status} ${errorText}`,
        );
      }

      const data = await response.json();
      console.log("✅ [COST CENTERS] Data received from database:", data);
      console.log(
        "📊 [COST CENTERS] Cost centers count:",
        data.costCenters?.length || 0,
      );
      console.log("📋 [COST CENTERS] Cost centers data:", data.costCenters);

      const fetchedCenters: CostCenter[] = Array.isArray(data?.costCenters)
        ? (data.costCenters as CostCenter[])
        : Array.isArray(data)
          ? (data as CostCenter[])
          : [];

      const prefixScopedCenters =
        isSingleAccount && prefix
          ? fetchedCenters.filter((center) =>
              String(center?.cost_code || "")
                .trim()
                .toUpperCase()
                .startsWith(`${prefix}-`),
            )
          : fetchedCenters;

      const resolvedCenters = resolveOperationalAwareCenters(prefixScopedCenters);
      setCostCenters(resolvedCenters);

      if (isSingleAccount && resolvedCenters.length > 0) {
        const expandedAccounts = [
          ...new Set(
            resolvedCenters
              .map((center) => normalizeCode(center?.cost_code))
              .filter(Boolean),
          ),
        ];

        if (expandedAccounts.length > 0) {
          setAccountNumbers(expandedAccounts);

          const currentJoined = accounts.join(",");
          const expandedJoined = expandedAccounts.join(",");
          if (expandedJoined && expandedJoined !== currentJoined) {
            router.replace(
              `/protected/fc/clients/cost-centers?accounts=${encodeURIComponent(expandedJoined)}`,
            );
          }
        }
      }
    } catch (error) {
      console.error(
        "💥 [COST CENTERS] Error fetching cost centers from database:",
        error,
      );
      toast.error("Failed to load cost centers from database");
    } finally {
      setLoading(false);
      setIsRequestInProgress(false);
    }
  };

  const handleBack = () => {
    router.push("/protected/fc");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCreateCostCenter = async () => {
    const clientCompanyName = clientInfo?.company_group?.trim();
    const costCenterCompany = newCostCenterCompany.trim();

    if (!clientCompanyName) {
      toast.error(
        "Client company name is missing, so a cost center could not be created.",
      );
      return;
    }

    if (!costCenterCompany) {
      toast.error("Enter the cost center company name before creating it.");
      return;
    }

    try {
      setCreatingCostCenter(true);
      const response = await fetch("/api/cost-centers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company: costCenterCompany,
          prefix_source: clientCompanyName,
          customers_grouped_id: clientInfo?.id || null,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create cost center");
      }

      const newCostCenter = payload?.costCenter;
      const updatedAccountNumbers = (payload?.all_new_account_numbers || "")
        .split(",")
        .map((acc: string) => acc.trim())
        .filter((acc: string) => acc);

      if (newCostCenter) {
        setCostCenters((prev) => {
          const next = [...prev, newCostCenter];
          return next.sort((a, b) =>
            (a.cost_code || "").localeCompare(b.cost_code || ""),
          );
        });
      }

      if (updatedAccountNumbers.length > 0) {
        setAccountNumbers(updatedAccountNumbers);
        router.replace(
          `/protected/fc/clients/cost-centers?accounts=${encodeURIComponent(updatedAccountNumbers.join(","))}`,
        );
      }

      toast.success(
        `Cost center ${newCostCenter?.cost_code || ""} created successfully`,
      );
      setCreateDialogOpen(false);
      setNewCostCenterCompany("");
    } catch (error: any) {
      console.error("Error creating cost center:", error);
      toast.error(error?.message || "Failed to create cost center");
    } finally {
      setCreatingCostCenter(false);
    }
  };

  const openDeleteModal = async (costCenter: CostCenter) => {
    setDeleteModal({
      open: true,
      cost_code: costCenter.cost_code,
      company: costCenter.company || costCenter.cost_code,
    });
    setDeleteAction("none");
    setDeleteVehicles([]);
    setDeleteVehiclesLoading(true);

    try {
      const response = await fetch(
        `/api/cost-centers/check-vehicles?cost_code=${encodeURIComponent(costCenter.cost_code)}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to check vehicles");
      }

      setDeleteVehicles(payload?.vehicles || []);
    } catch (error: any) {
      console.error("Error checking vehicles for delete:", error);
      toast.error(error?.message || "Failed to check linked vehicles");
    } finally {
      setDeleteVehiclesLoading(false);
    }
  };

  const handleDeleteCostCenter = async () => {
    if (!deleteModal.cost_code) {
      return;
    }

    try {
      setDeleteLoading(true);

      const response = await fetch("/api/cost-centers/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cost_code: deleteModal.cost_code,
          vehicleAction: deleteAction,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete cost center");
      }

      const updatedAccountNumbers = accountNumbers.filter(
        (account) => account !== deleteModal.cost_code,
      );

      setCostCenters((prev) =>
        prev.filter((center) => center.cost_code !== deleteModal.cost_code),
      );

      setDeleteModal({ open: false, cost_code: "", company: "" });
      setDeleteVehicles([]);
      setDeleteAction("none");

      if (updatedAccountNumbers.length > 0) {
        router.replace(
          `/protected/fc/clients/cost-centers?accounts=${encodeURIComponent(updatedAccountNumbers.join(","))}`,
        );
      }

      toast.success(`Cost center ${deleteModal.cost_code} deleted successfully`);
    } catch (error: any) {
      console.error("Error deleting cost center:", error);
      toast.error(error?.message || "Failed to delete cost center");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="bg-gray-50 shadow-sm border border-gray-300 rounded-lg overflow-hidden">
      {/* Table Header Skeleton */}
      <div className="gap-4 grid grid-cols-3 bg-blue-50 shadow-sm px-6 py-2 border-gray-200 border-b">
        <div className="flex justify-center">
          <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
        </div>
        <div className="flex items-center">
          <div className="bg-gray-200 rounded w-20 h-4 animate-pulse"></div>
        </div>
        <div className="flex justify-end">
          <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
        </div>
      </div>

      {/* Table Body Skeleton */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="gap-4 grid grid-cols-3 bg-white px-6 py-2"
          >
            {/* Cost Center Column Skeleton */}
            <div className="flex items-center">
              <div className="bg-gray-200 rounded-full w-24 h-6 animate-pulse"></div>
            </div>

            {/* Cost Code Column Skeleton */}
            <div className="flex justify-center items-center">
              <div>
                <div className="bg-gray-200 rounded w-20 h-4 animate-pulse"></div>
              </div>
            </div>

            {/* Actions Column Skeleton */}
            <div className="flex justify-end items-center">
              <div className="bg-gray-200 rounded w-12 h-8 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        {/* Top Navigation */}
        <div className="bg-white border-gray-200 border-b">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="p-0"
                >
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  FC Dashboard
                </Button>
                <span className="text-gray-400">›</span>
                <span className="text-gray-600">Cost Centers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex justify-center items-center bg-blue-100 rounded-full w-8 h-8">
                  <span className="font-medium text-blue-600 text-sm">FC</span>
                </div>
                <span className="font-medium text-gray-900 text-sm">
                  Field Coordinator
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="mb-2 font-bold text-gray-900 text-3xl">
              Cost Centers
            </h1>
            <p className="text-gray-600">
              Manage cost centers and their account permissions for{" "}
              {clientInfo?.company_group || "this client"}.
            </p>
          </div>

          {/* Controls Skeleton */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gray-200 rounded w-32 h-4 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-gray-200 rounded-lg w-64 h-10 animate-pulse"></div>
              <div className="bg-gray-200 rounded w-24 h-10 animate-pulse"></div>
              <div className="bg-gray-200 rounded w-16 h-10 animate-pulse"></div>
            </div>
          </div>

          {/* Loading Skeleton */}
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!accountsParam) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="mb-4 font-semibold text-xl">
            No Account Numbers Provided
          </h2>
          <p className="mb-4 text-gray-600">
            Please select a client from the main dashboard.
          </p>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Top Navigation */}
      <div className="bg-white border-gray-200 border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-0"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                FC Dashboard
              </Button>
              <span className="text-gray-400">›</span>
              <span className="text-gray-600">Cost Centers</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-full w-8 h-8">
                <span className="font-medium text-blue-600 text-sm">FC</span>
              </div>
              <span className="font-medium text-gray-900 text-sm">
                Field Coordinator
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-gray-900 text-3xl">
            Cost Centers
          </h1>
          <p className="text-gray-600">
            Manage cost centers and their account permissions for{" "}
            {clientInfo?.company_group || "this client"}.
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm">
              All cost centers {filteredCostCenters.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
              <input
                type="text"
                placeholder="Search by company"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-2 pr-4 pl-10 border border-gray-300 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            <Button
              onClick={() => {
                if (accountsParam) {
                  const decodedAccounts = decodeURIComponent(accountsParam);
                  fetchCostCenters(decodedAccounts);
                }
              }}
              className="bg-black hover:bg-gray-800 text-white"
            >
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setNewCostCenterCompany(clientInfo?.company_group || "");
                setCreateDialogOpen(true);
              }}
              disabled={!clientInfo?.company_group}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="mr-2 w-4 h-4" />
              Create Cost Center
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="ml-2"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-50 shadow-sm border border-gray-300 rounded-lg overflow-hidden">
          {(() => {
            console.log(
              "🎨 [COST CENTERS] Rendering table. Filtered count:",
              filteredCostCenters.length,
            );
            console.log(
              "🎨 [COST CENTERS] Total cost centers:",
              costCenters.length,
            );
            console.log(
              "🎨 [COST CENTERS] Paginated cost centers:",
              paginatedCostCenters.length,
            );
            console.log(
              "🎨 [COST CENTERS] Paginated data:",
              paginatedCostCenters,
            );

            return filteredCostCenters.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <h3 className="mb-2 font-medium text-gray-900 text-lg">
                  {costCenters.length === 0
                    ? "No cost centers found"
                    : "No matching cost centers"}
                </h3>
                <p className="mb-4 text-gray-500">
                  {costCenters.length === 0
                    ? `No cost centers found for the provided account numbers`
                    : `No cost centers match your search "${searchTerm}"`}
                </p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="gap-4 grid grid-cols-3 bg-blue-50 shadow-sm px-6 py-2 border-gray-200 border-b">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-700 text-sm">
                      Cost Center
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="font-medium text-gray-700 text-sm">
                      Cost Code
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-gray-700 text-sm">
                      Actions
                    </span>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-200">
                  {paginatedCostCenters.map((costCenter) => (
                    <div
                      key={costCenter.id}
                      className="gap-4 grid grid-cols-3 bg-white hover:bg-gray-50 px-6 py-2 transition-colors"
                    >
                      {/* Cost Center Column */}
                      <div className="flex items-center">
                        <span className="inline-flex items-center bg-green-100 px-2 py-1 rounded-full font-medium text-green-800 text-xs">
                          {costCenter.company || "N/A"}
                        </span>
                      </div>

                      {/* Cost Code Column */}
                      <div className="flex justify-center items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {getCenterDisplayLabel(costCenter)}
                          </div>
                        </div>
                      </div>

                      {/* Actions Column */}
                      <div className="flex justify-end items-center">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const effectiveCode = getCenterCode(costCenter);
                              const siteName = String(
                                costCenter?.site_allocated || "",
                              ).trim();
                              if (costCenter.operational) {
                                const params = new URLSearchParams({
                                  lookup: "cost_center_code",
                                });
                                if (siteName) {
                                  params.set("site", siteName);
                                }
                                const accountCode = normalizeCode(costCenter?.cost_code);
                                if (accountCode) {
                                  params.set("account", accountCode);
                                }
                                router.push(
                                  `/protected/fc/accounts/${effectiveCode}?${params.toString()}`,
                                );
                                return;
                              }

                              router.push(`/protected/fc/accounts/${effectiveCode}`);
                            }}
                            className="hover:bg-blue-50 text-blue-600 hover:text-blue-700"
                          >
                            View
                          </Button>
                          {!costCenter.operational && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(costCenter)}
                              className="hover:bg-red-50 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="mr-1 w-4 h-4" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        {/* Pagination */}
        {filteredCostCenters.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-gray-700 text-sm">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredCostCenters.length)} of{" "}
              {filteredCostCenters.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {/* Show page numbers */}
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNum = i + 1;

                  // Show first 3 pages, current page, and last 3 pages
                  const shouldShow =
                    pageNum <= 3 ||
                    pageNum >= totalPages - 2 ||
                    Math.abs(pageNum - currentPage) <= 1;

                  if (!shouldShow) {
                    // Show ellipsis for gaps
                    if (pageNum === 4 && currentPage > 5) {
                      return (
                        <span
                          key={`ellipsis-${pageNum}`}
                          className="px-2 text-gray-500"
                        >
                          ...
                        </span>
                      );
                    }
                    if (
                      pageNum === totalPages - 3 &&
                      currentPage < totalPages - 4
                    ) {
                      return (
                        <span
                          key={`ellipsis-${pageNum}`}
                          className="px-2 text-gray-500"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="p-0 w-8 h-8"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!creatingCostCenter) {
            setCreateDialogOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Cost Center</DialogTitle>
            <DialogDescription>
              Set the cost center company name. The cost code will still use the
              client prefix from {clientInfo?.company_group || "this client"}{" "}
              and automatically increment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cost-center-company">Cost Center Company</Label>
              <Input
                id="cost-center-company"
                value={newCostCenterCompany}
                onChange={(e) => setNewCostCenterCompany(e.target.value)}
                placeholder="Enter cost center company name"
                disabled={creatingCostCenter}
              />
            </div>
            <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
              Code prefix source:{" "}
              <span className="font-medium text-slate-900">
                {clientInfo?.company_group || "N/A"}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creatingCostCenter}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCostCenter}
              disabled={creatingCostCenter || !clientInfo?.company_group}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {creatingCostCenter ? (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <Plus className="mr-2 w-4 h-4" />
              )}
              {creatingCostCenter ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteModal.open}
        onOpenChange={(open) => {
          if (!deleteLoading) {
            setDeleteModal((prev) => ({ ...prev, open }));
            if (!open) {
              setDeleteVehicles([]);
              setDeleteAction("none");
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delete Cost Center</DialogTitle>
            <DialogDescription>
              Review attached vehicles before deleting{" "}
              <span className="font-medium text-slate-900">
                {deleteModal.company || deleteModal.cost_code}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
              <div className="font-medium text-slate-900">
                {deleteModal.cost_code || "N/A"}
              </div>
              <div>{deleteModal.company || "No company name"}</div>
            </div>

            {deleteVehiclesLoading ? (
              <div className="flex items-center text-slate-600 text-sm">
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Checking linked vehicles...
              </div>
            ) : deleteVehicles.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-sm">
                  {deleteVehicles.length} vehicle(s) are linked to this cost center.
                </div>

                <div className="space-y-2 max-h-56 overflow-auto rounded-lg border p-3">
                  {deleteVehicles.map((vehicle) => (
                    <div
                      key={String(vehicle.id)}
                      className="border-slate-200 border-b last:border-b-0 pb-2 last:pb-0 text-sm"
                    >
                      <div className="font-medium text-slate-900">
                        {vehicle.reg || vehicle.fleet_number || `Vehicle ${vehicle.id}`}
                      </div>
                      <div className="text-slate-600">
                        {[vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-vehicle-action">Vehicle Action</Label>
                  <select
                    id="delete-vehicle-action"
                    value={deleteAction}
                    onChange={(e) => setDeleteAction(e.target.value)}
                    className="border border-gray-300 rounded-md w-full h-10"
                  >
                    <option value="none">Leave vehicles unchanged</option>
                    <option value="delete">Delete linked vehicles too</option>
                    {costCenters
                      .filter((center) => center.cost_code !== deleteModal.cost_code)
                      .map((center) => (
                        <option key={center.cost_code} value={center.cost_code}>
                          Move vehicles to {center.cost_code} - {center.company}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-900 text-sm">
                No vehicles are linked to this cost center.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModal({ open: false, cost_code: "", company: "" });
                setDeleteVehicles([]);
                setDeleteAction("none");
              }}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteCostCenter}
              disabled={deleteLoading || deleteVehiclesLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? (
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 w-4 h-4" />
              )}
              {deleteLoading ? "Deleting..." : "Delete Cost Center"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loading fallback component
function CostCentersLoading() {
  return (
    <div className="bg-white min-h-screen">
      {/* Top Navigation */}
      <div className="bg-white border-gray-200 border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-gray-200 rounded w-20 h-8 animate-pulse"></div>
              <span className="text-gray-400">›</span>
              <span className="text-gray-600">Cost Centers</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-full w-8 h-8">
                <span className="font-medium text-blue-600 text-sm">FC</span>
              </div>
              <span className="font-medium text-gray-900 text-sm">
                Field Coordinator
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="mb-8">
          <div className="bg-gray-200 mb-2 rounded w-48 h-8 animate-pulse"></div>
          <div className="bg-gray-200 rounded w-96 h-4 animate-pulse"></div>
        </div>
        <div className="bg-gray-200 rounded-lg w-full h-96 animate-pulse"></div>
      </div>
    </div>
  );
}

export default function ClientCostCentersPage() {
  return (
    <Suspense fallback={<CostCentersLoading />}>
      <ClientCostCentersContent />
    </Suspense>
  );
}
