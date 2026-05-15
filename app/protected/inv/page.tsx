"use client";

import { Fragment, useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

interface Part {
  description: string;
  quantity: number;
  code: string;
  supplier: string;
  cost_per_unit: number;
  total_cost: number;
  stock_id?: string;
  available_stock?: number;
  date_added?: string;
  boot_stock?: string; // Add boot_stock indicator field
  serial_number?: string;
  ip_address?: string;
  serial?: string;
  serialNumber?: string;
}

interface JobCard {
  id: string;
  job_number: string;
  job_date?: string;
  due_date?: string;
  completion_date?: string;
  status?: string;
  job_status?: string;
  job_type?: string;
  job_description?: string;
  priority?: string;
  customer_name?: string;
  customer_address?: string;
  customer_email?: string;
  customer_phone?: string;
  contact_person?: string;
  decommission_date?: string;
  vehicle_registration?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  assigned_technician_id?: string;
  technician_name?: string;
  technician_phone?: string;
  parts_required?: Part[];
  products_required?: Record<string, unknown>[];
  quotation_products?: Record<string, unknown>[];
  equipment_used?: Record<string, unknown>[];
  estimated_duration_hours?: number;
  estimated_cost?: number;
  ip_address?: string;
  qr_code?: string;
  vin_numer?: string;
  odormeter?: string;
  created_at: string;
  updated_at?: string;
  completion_notes?: string;
  quotation_number?: string;
  quotation_products?: Record<string, unknown>[];
  quotation_total_amount?: number;
  [key: string]: unknown;
}

interface StockOrder {
  id: string;
  order_number?: string;
  supplier?: string;
  status?: string;
  order_items?: Record<string, unknown>[];
  created_at: string;
}

interface StockItem {
  id: number | string;
  created_at?: string;
  description?: string;
  code?: string;
  supplier?: string;
  stock_type?: string;
  quantity?: string;
  date_adjusted?: string;
  status?: string;
  serial_number?: string;
  category_code?: string;
  category_description?: string;
  assigned_to_technician?: string;
  assigned_date?: string;
  job_card_id?: string;
  container?: string;
  direction?: string;
  company?: string;
  notes?: string;
}

interface StockUpdate {
  id: number;
  current_quantity: number;
  new_quantity: number;
  difference: number;
}

interface ClientStockClient {
  id: string;
  company: string | null;
  cost_code: string;
  created_at: string;
}

interface ClientStockItem {
  id: number;
  category_code: string;
  serial_number: string;
  status: string | null;
  assigned_to_technician: string | null;
  notes: string | null;
  created_at: string;
  inventory_categories?: {
    description?: string | null;
  } | null;
}

interface TechnicianStockRow {
  id: number | string;
  technician_email: string | null;
  created_at: string | null;
  display_name?: string | null;
}

interface GlobalStockSearchResult {
  result_id: string;
  source: "inventory" | "client_stock" | "technician_stock";
  source_label: string;
  reference: string;
  code: string;
  description: string;
  quantity: number;
  status: string;
  bin: string;
  owner: string;
  serial_number?: string | null;
  supplier?: string | null;
  technician_email?: string | null;
  cost_code?: string | null;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Search,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertCircle,
  FileText,
  Car,
  QrCode,
  Printer,
  // MapPin,
  User,
  Calendar,
  Receipt,
  Download,
  ClipboardList,
  Filter,
  Save,
  Network,
  Eye,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import DashboardHeader from "@/components/shared/DashboardHeader";
import DashboardTabs from "@/components/shared/DashboardTabs";
import RoleEscalationsPanel from "@/components/shared/RoleEscalationsPanel";
import AssignPartsModal from "@/components/ui-personal/assign-parts-modal";
import StockOrderModal from "@/components/accounts/StockOrderModal";
import AssignIPAddressModal from "@/components/inv/components/AssignIPAddressModal";
import CreateRepairJobModal from "@/components/inv/CreateRepairJobModal";
import AssignTechStockModal from "@/components/inv/components/AssignTechStockModal";
import { toast } from "sonner";

const normalizeCategoryCode = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeSearchValue = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const resolveSerialNumber = (value: Record<string, unknown> | null | undefined) =>
  String(
    value?.serial_number ?? value?.serial ?? value?.serialNumber ?? value?.ip_address ?? "",
  ).trim();

const isValidSingleTechnicianEmail = (value: unknown) => {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return false;
  if (email.includes(",") || email.includes(" ")) return false;
  return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email);
};

const isSubsequenceMatch = (needle: string, haystack: string) => {
  if (!needle || !haystack) return false;
  let needleIndex = 0;
  for (let i = 0; i < haystack.length && needleIndex < needle.length; i += 1) {
    if (haystack[i] === needle[needleIndex]) {
      needleIndex += 1;
    }
  }
  return needleIndex === needle.length;
};

const boundedLevenshtein = (
  source: string,
  target: string,
  maxDistance = 2,
) => {
  if (!source || !target) return Number.MAX_SAFE_INTEGER;
  if (Math.abs(source.length - target.length) > maxDistance) {
    return Number.MAX_SAFE_INTEGER;
  }

  const previous = new Array(target.length + 1).fill(0);
  const current = new Array(target.length + 1).fill(0);

  for (let j = 0; j <= target.length; j += 1) {
    previous[j] = j;
  }

  for (let i = 1; i <= source.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];

    for (let j = 1; j <= target.length; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      rowMin = Math.min(rowMin, current[j]);
    }

    if (rowMin > maxDistance) {
      return Number.MAX_SAFE_INTEGER;
    }

    for (let j = 0; j <= target.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[target.length];
};

const getFuzzyScore = (query: string, candidate: string) => {
  const normalizedQuery = normalizeSearchValue(query);
  const normalizedCandidate = normalizeSearchValue(candidate);

  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedCandidate === normalizedQuery) return 100;
  if (normalizedCandidate.startsWith(normalizedQuery)) return 80;
  if (normalizedCandidate.includes(normalizedQuery)) return 65;
  if (isSubsequenceMatch(normalizedQuery, normalizedCandidate)) return 45;

  const distance = boundedLevenshtein(
    normalizedQuery,
    normalizedCandidate.slice(0, normalizedQuery.length + 2),
    2,
  );

  if (distance <= 2) {
    return 30 - distance * 5;
  }

  return 0;
};

export default function InventoryPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignedPartsSearchTerm, setAssignedPartsSearchTerm] = useState("");
  const [completedJobsSearchTerm, setCompletedJobsSearchTerm] = useState("");
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [showAssignParts, setShowAssignParts] = useState(false);
  const [markingNoPartsRequired, setMarkingNoPartsRequired] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRJob, setSelectedQRJob] = useState<JobCard | null>(null);
  const [showCompletedJobDetails, setShowCompletedJobDetails] = useState(false);
  const [selectedCompletedJob, setSelectedCompletedJob] =
    useState<JobCard | null>(null);
  const [loadingCompletedJobDetails, setLoadingCompletedJobDetails] =
    useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedInventoryJob, setSelectedInventoryJob] =
    useState<JobCard | null>(null);
  const [movingDeinstalledItemKey, setMovingDeinstalledItemKey] = useState<
    string | null
  >(null);
  const [movedDeinstalledItems, setMovedDeinstalledItems] = useState<
    Record<string, string>
  >({});
  const [activeTab, setActiveTab] = useState("job-cards");
  const [stockOrders, setStockOrders] = useState<StockOrder[]>([]);
  const [stockOrdersLoading, setStockOrdersLoading] = useState(false);
  const [stockOrdersSearchTerm, setStockOrdersSearchTerm] = useState("");
  const [selectedStockOrder, setSelectedStockOrder] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showOrderItemsModal, setShowOrderItemsModal] = useState(false);
  const [allIpAddresses, setAllIpAddresses] = useState([]);
  const [allStockItems, setAllStockItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemCategorySearchTerm, setAddItemCategorySearchTerm] =
    useState("");
  const [newItemData, setNewItemData] = useState({
    category_code: "",
    serial_number: "",
    quantity: 1,
    new_category_code: "",
    new_category_description: "",
  });
  const [showNewCategoryFields, setShowNewCategoryFields] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [generatedQR, setGeneratedQR] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadOrder, setUploadOrder] = useState(null);
  const [uploadItems, setUploadItems] = useState([]);

  // Stock Take state
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockTakeMode, setStockTakeMode] = useState(false);
  const [updatedItems, setUpdatedItems] = useState<Record<number, StockUpdate>>(
    {},
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [stockTakeSearchTerm, setStockTakeSearchTerm] = useState("");
  const [selectedStockType, setSelectedStockType] = useState("all");
  const [stockTypes, setStockTypes] = useState<
    (string | { code: string; description: string })[]
  >([]);
  const [stockTakeActiveTab, setStockTakeActiveTab] = useState("stock-take");
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const [defaultThreshold, setDefaultThreshold] = useState(10);
  const [expandedStockCategories, setExpandedStockCategories] = useState<
    Record<string, boolean>
  >({});
  const cleanedInstallEquipmentJobsRef = useRef<Set<string>>(new Set());
  const [clientStockClients, setClientStockClients] = useState<
    ClientStockClient[]
  >([]);
  const [clientStockLoading, setClientStockLoading] = useState(false);
  const [clientStockSearchTerm, setClientStockSearchTerm] = useState("");
  const [selectedClientStock, setSelectedClientStock] =
    useState<ClientStockClient | null>(null);
  const [clientStockItems, setClientStockItems] = useState<ClientStockItem[]>(
    [],
  );
  const [clientStockItemsLoading, setClientStockItemsLoading] = useState(false);
  const [clientStockItemSearchTerm, setClientStockItemSearchTerm] =
    useState("");
  const [clientStockStatusFilter, setClientStockStatusFilter] = useState("all");
  const clientStockDetailsRef = useRef<HTMLDivElement | null>(null);
  const [techStockTechnicians, setTechStockTechnicians] = useState<
    TechnicianStockRow[]
  >([]);
  const [techStockLoading, setTechStockLoading] = useState(false);
  const [techStockSearchTerm, setTechStockSearchTerm] = useState("");
  const [globalStockSearchTerm, setGlobalStockSearchTerm] = useState("");
  const [globalStockSearchLoading, setGlobalStockSearchLoading] =
    useState(false);
  const [globalStockSearchResults, setGlobalStockSearchResults] = useState<
    GlobalStockSearchResult[]
  >([]);
  const [globalStockSearchCounts, setGlobalStockSearchCounts] = useState({
    inventory: 0,
    client_stock: 0,
    technician_stock: 0,
    total: 0,
  });
  const [showAssignTechStock, setShowAssignTechStock] = useState(false);
  const [selectedTechForAssign, setSelectedTechForAssign] =
    useState<TechnicianStockRow | null>(null);
  const [showMoveToFcDialog, setShowMoveToFcDialog] = useState(false);
  const [pendingMoveJobId, setPendingMoveJobId] = useState<string | null>(null);
  const [moveToFcNote, setMoveToFcNote] = useState("");
  const router = useRouter();

  // IP address assignment state
  const [showIpAddressModal, setShowIpAddressModal] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(
    null,
  );

  const handleMoveJob = async (jobId: string, destination: string) => {
    const loadingToast = toast.loading(`Moving job to ${destination}...`);
    try {
      const response = await fetch(`/api/job-cards/${jobId}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination,
          preserveCompleted: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to move job to ${destination}`,
        );
      }

      toast.dismiss(loadingToast);
      toast.success(`Job successfully moved to ${destination}`);
      removeJobCardLocally(jobId);
    } catch (error) {
      toast.dismiss(loadingToast);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
      console.error(`Error moving job to ${destination}:`, error);
    }
  };

  const confirmMoveToFc = async () => {
    if (!pendingMoveJobId) return;

    const loadingToast = toast.loading("Moving job to FC...");
    try {
      const response = await fetch(`/api/job-cards/${pendingMoveJobId}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: "fc",
          note: moveToFcNote,
          preserveCompleted: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to move job to FC");
      }

      toast.dismiss(loadingToast);
      toast.success("Job successfully moved to FC");
      removeJobCardLocally(pendingMoveJobId);
      setShowMoveToFcDialog(false);
      setPendingMoveJobId(null);
      setMoveToFcNote("");
    } catch (error) {
      toast.dismiss(loadingToast);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(errorMessage);
      console.error("Error moving job to FC:", error);
    }
  };

  // Reset selected item when stock take mode changes
  useEffect(() => {
    if (stockTakeMode) {
      setSelectedStockItem(null);
    }
  }, [stockTakeMode]);

  useEffect(() => {
    if (!selectedClientStock) return;
    clientStockDetailsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedClientStock]);

  useEffect(() => {
    fetchJobCards();
    fetchAllStockItems();
    // Force fetch stock items on mount
    console.log("Component mounted, forcing fetchStockItems");
    fetchStockItems();
    // Also fetch categories on mount
    fetchCategories();
    fetchTechnicianStockList();
  }, []);

  useEffect(() => {
    console.log("activeTab changed to:", activeTab);
    if (activeTab === "stock-orders") {
      fetchStockOrders();
    }
    if (activeTab === "stock-take") {
      console.log("Calling fetchStockItems because activeTab is stock-take");
      fetchStockItems();
    }
    if (activeTab === "client-stock") {
      fetchClientStockClients();
    }
    if (activeTab === "technician-stock") {
      fetchTechnicianStockList();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "inventory-search") return;

    const query = globalStockSearchTerm.trim();
    if (query.length < 2) {
      setGlobalStockSearchResults([]);
      setGlobalStockSearchCounts({
        inventory: 0,
        client_stock: 0,
        technician_stock: 0,
        total: 0,
      });
      return;
    }

    const controller = new AbortController();
    const debounceTimer = setTimeout(() => {
      fetchGlobalStockSearch(query, {
        silent: true,
        signal: controller.signal,
      });
    }, 220);

    return () => {
      clearTimeout(debounceTimer);
      controller.abort();
    };
  }, [activeTab, globalStockSearchTerm]);

  // Debug: Log current activeTab
  console.log("Current activeTab:", activeTab);

  useEffect(() => {
    if (activeTab === "stock-take") {
      fetchStockItems();
    }
  }, [stockTakeActiveTab]);

  // Debug: Log stockItems changes
  useEffect(() => {
    console.log("stockItems state changed:", stockItems.length, "items");
    if (stockItems.length > 0) {
      console.log("First stockItem:", stockItems[0]);
      console.log("Sample category info:", {
        category_code: stockItems[0].category_code,
        category_description: stockItems[0].category_description,
      });
    }
  }, [stockItems]);

  // Debug: Log stockTypes changes
  useEffect(() => {
    console.log("stockTypes state changed:", stockTypes.length, "categories");
    if (stockTypes.length > 0) {
      console.log("First stockType:", stockTypes[0]);
      console.log("All stockTypes:", stockTypes);
    }
  }, [stockTypes]);

  const fetchStockOrders = async () => {
    try {
      setStockOrdersLoading(true);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data, error } = await supabase
        .from("stock_orders")
        .select("*")
        .eq("approved", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching stock orders:", error);
        toast.error("Failed to fetch stock orders");
        return;
      }

      setStockOrders(data || []);
    } catch (error) {
      console.error("Error fetching stock orders:", error);
      toast.error("Failed to fetch stock orders");
    } finally {
      setStockOrdersLoading(false);
    }
  };

  const fetchClientStockClients = async () => {
    try {
      setClientStockLoading(true);
      const response = await fetch("/api/client-stock/clients");

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Client stock clients API error:",
          response.status,
          errorText,
        );
        throw new Error("Failed to fetch client stock clients");
      }

      const data = await response.json();
      setClientStockClients(data.clients || []);
    } catch (error) {
      console.error("Error fetching client stock clients:", error);
      toast.error("Failed to load client stock clients");
    } finally {
      setClientStockLoading(false);
    }
  };

  const fetchTechnicianStockList = async () => {
    try {
      setTechStockLoading(true);
      const response = await fetch("/api/tech-stock/technicians");

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "Tech stock technicians API error:",
          response.status,
          errorText,
        );
        throw new Error("Failed to fetch technician stock list");
      }

      const data = await response.json();
      const technicians = Array.isArray(data.technicians)
          ? data.technicians.filter((tech: TechnicianStockRow) =>
            isValidSingleTechnicianEmail(tech?.technician_email),
          )
        : [];
      setTechStockTechnicians(technicians);
    } catch (error) {
      console.error("Error fetching technician stock list:", error);
      toast.error("Failed to load technician stock");
    } finally {
      setTechStockLoading(false);
    }
  };

  const fetchGlobalStockSearch = async (
    rawTerm?: string,
    options?: { silent?: boolean; signal?: AbortSignal },
  ) => {
    const searchValue = String(
      rawTerm !== undefined ? rawTerm : globalStockSearchTerm,
    ).trim();

    if (searchValue.length < 2) {
      setGlobalStockSearchResults([]);
      setGlobalStockSearchCounts({
        inventory: 0,
        client_stock: 0,
        technician_stock: 0,
        total: 0,
      });
      return;
    }

    const silent = options?.silent === true;

    try {
      if (!silent) {
        setGlobalStockSearchLoading(true);
      }

      const response = await fetch(
        `/api/inventory-search/global?q=${encodeURIComponent(searchValue)}&limit=220`,
        {
          signal: options?.signal,
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || "Failed to search stock bins");
      }

      const payload = await response.json();
      setGlobalStockSearchResults(
        Array.isArray(payload?.results) ? payload.results : [],
      );
      setGlobalStockSearchCounts({
        inventory: Number(payload?.counts?.inventory || 0),
        client_stock: Number(payload?.counts?.client_stock || 0),
        technician_stock: Number(payload?.counts?.technician_stock || 0),
        total: Number(payload?.counts?.total || 0),
      });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        return;
      }
      console.error("Error searching global stock bins:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to search stock bins",
      );
    } finally {
      if (!silent) {
        setGlobalStockSearchLoading(false);
      }
    }
  };

  const handleViewTechnicianStock = (tech: TechnicianStockRow) => {
    if (!tech?.technician_email) {
      toast.error("Technician email is missing.");
      return;
    }
    router.push(
      `/protected/inv/technician-stock/${encodeURIComponent(tech.technician_email)}`,
    );
  };

  const handleAssignTechnicianStock = (tech: TechnicianStockRow) => {
    if (!tech?.technician_email) {
      toast.error("Technician email is missing.");
      return;
    }
    setSelectedTechForAssign(tech);
    setShowAssignTechStock(true);
  };

  const handleViewClientStock = (client: ClientStockClient) => {
    if (!client?.cost_code) {
      toast.error("Client cost code is missing.");
      return;
    }
    router.push(
      `/protected/inv/client-stock/${encodeURIComponent(client.cost_code)}`,
    );
  };

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      console.log("Fetching job cards...");
      const response = await fetch("/api/job-cards?limit=5000");
      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response not ok:", errorText);
        throw new Error("Failed to fetch job cards");
      }

      const data = await response.json();
      console.log("Job cards data:", data);
      console.log("Job cards array:", data.job_cards);
      console.log("Job cards count:", data.job_cards?.length || 0);

      setJobCards(data.job_cards || []);
      console.log("Set job cards:", data.job_cards?.length || 0, "records");
    } catch (error) {
      console.error("Error fetching job cards:", error);
      toast.error("Failed to load job cards");
    } finally {
      setLoading(false);
    }
  };

  const extractIpAddressesFromStock = (stockItems) => {
    const ipSet = new Set();
    stockItems.forEach((item) => {
      if (item.ip_addresses && Array.isArray(item.ip_addresses)) {
        item.ip_addresses.forEach((ip) => ipSet.add(ip));
      }
    });
    return Array.from(ipSet).map((ip) => ({ ip_address: ip }));
  };

  const fetchAllStockItems = async () => {
    try {
      const response = await fetch("/api/stock");
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Stock API error:", response.status, errorText);
        throw new Error(
          `Failed to fetch stock items: ${response.status} - ${errorText}`,
        );
      }
      const data = await response.json();
      const stockItems = data.stock || [];
      setAllStockItems(stockItems);
      setAllIpAddresses(extractIpAddressesFromStock(stockItems));

      // Also set stockItems for Stock Take tab if it's empty
      if (stockItems.length > 0) {
        console.log("Setting stockItems from fetchAllStockItems");
        setStockItems(stockItems);
      }
    } catch (error) {
      console.error("Error fetching stock items:", error);
    }
  };

  const isCompletedInventoryJob = (job: JobCard) => {
    const normalizedJobStatus = String(job.job_status || "").toLowerCase();
    const normalizedStatus = String(job.status || "").toLowerCase();

    return (
      normalizedJobStatus === "completed" ||
      normalizedStatus === "completed" ||
      normalizedJobStatus === "invoiced" ||
      normalizedStatus === "invoiced"
    );
  };

  const isMovedAwayFromInventory = (job: JobCard) => {
    const normalizedRole = String(job.role || "").toLowerCase();
    const normalizedMoveTo = String(job.move_to || "").toLowerCase();
    const normalizedStatus = String(job.status || "").toLowerCase();

    return (
      ["admin", "accounts", "fc"].includes(normalizedRole) ||
      ["admin", "accounts", "fc"].includes(normalizedMoveTo) ||
      [
        "moved_to_admin",
        "moved_to_accounts",
        "moved_to_fc",
      ].includes(normalizedStatus)
    );
  };

  const isEscalatedToInventory = (job: JobCard) =>
    String(job.escalation_role || "").toLowerCase() === "inv";

  const isAssignedPartsActiveJob = (job: JobCard) => {
    const normalizedStatus = String(job.status || "").trim().toLowerCase();
    const normalizedJobStatus = String(job.job_status || "")
      .trim()
      .toLowerCase();

    return (
      normalizedStatus !== "completed" && normalizedJobStatus !== "completed"
    );
  };

  const removeJobCardLocally = (jobId: string) => {
    setJobCards((current) => current.filter((job) => job.id !== jobId));

    if (selectedJobCard?.id === jobId) {
      setSelectedJobCard(null);
      setShowAssignParts(false);
    }

    if (selectedInventoryJob?.id === jobId) {
      setSelectedInventoryJob(null);
      setShowJobDetails(false);
    }

    if (selectedCompletedJob?.id === jobId) {
      setSelectedCompletedJob(null);
      setShowCompletedJobDetails(false);
    }
  };

  const filteredJobCards = jobCards.filter((job: JobCard) => {
    const matchesSearch =
      job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.vehicle_registration
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      job.job_description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Only show jobs without assigned parts in the main job cards tab
    const hasNoParts =
      !job.parts_required ||
      !Array.isArray(job.parts_required) ||
      job.parts_required.length === 0;

    const isAcknowledgedFcNoteJob = Boolean(job.fc_note_acknowledged);

    return (
      matchesSearch &&
      (hasNoParts || isAcknowledgedFcNoteJob) &&
      !isCompletedInventoryJob(job) &&
      !isMovedAwayFromInventory(job) &&
      !isEscalatedToInventory(job)
    );
  });

  const jobCardsWithParts = jobCards.filter(
    (job: JobCard) =>
      !isMovedAwayFromInventory(job) &&
      !isEscalatedToInventory(job) &&
      isAssignedPartsActiveJob(job) &&
      !Boolean(job.fc_note_acknowledged) &&
      job.parts_required &&
      Array.isArray(job.parts_required) &&
      job.parts_required.length > 0,
  );

  const completedJobs = jobCards.filter((job: JobCard) => {
    const normalizedRole = String(job.role || "").toLowerCase();
    const normalizedMoveTo = String(job.move_to || "").toLowerCase();

    const isInventoryRouted =
      normalizedRole === "inv" || normalizedMoveTo === "inv";

    return isCompletedInventoryJob(job) && isInventoryRouted;
  }).filter((job) => !isEscalatedToInventory(job));

  const filteredJobCardsWithParts = jobCardsWithParts.filter((job: JobCard) => {
    if (!assignedPartsSearchTerm.trim()) return true;

    const searchLower = assignedPartsSearchTerm.toLowerCase();
    return (
      job.job_number?.toLowerCase().includes(searchLower) ||
      job.customer_name?.toLowerCase().includes(searchLower) ||
      job.vehicle_registration?.toLowerCase().includes(searchLower) ||
      job.job_description?.toLowerCase().includes(searchLower) ||
      job.ip_address?.toLowerCase().includes(searchLower)
    );
  });

  const filteredCompletedJobs = completedJobs.filter((job: JobCard) => {
    if (!completedJobsSearchTerm.trim()) return true;

    const searchLower = completedJobsSearchTerm.toLowerCase();
    return (
      job.job_number?.toLowerCase().includes(searchLower) ||
      job.customer_name?.toLowerCase().includes(searchLower) ||
      job.vehicle_registration?.toLowerCase().includes(searchLower) ||
      job.job_description?.toLowerCase().includes(searchLower) ||
      job.completion_notes?.toLowerCase().includes(searchLower)
    );
  });

  interface OrderItem {
    description?: string;
    [key: string]: unknown;
  }

  const filteredStockOrders = stockOrders.filter((order: StockOrder) => {
    if (!stockOrdersSearchTerm) return true;

    const searchLower = stockOrdersSearchTerm.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.supplier?.toLowerCase().includes(searchLower) ||
      order.status?.toLowerCase().includes(searchLower) ||
      (order.order_items &&
        Array.isArray(order.order_items) &&
        order.order_items.some((item: OrderItem) =>
          item.description?.toLowerCase().includes(searchLower),
        ))
    );
  });

  const filteredClientStockClients = clientStockClients.filter((client) => {
    if (!clientStockSearchTerm) return true;

    const query = clientStockSearchTerm.toLowerCase();
    const company = (client.company || "").toLowerCase();

    return company.includes(query);
  });

  const filteredClientStockItems = clientStockItems.filter((item) => {
    const normalizedStatus = (item.status || "").toLowerCase();
    const statusMatch =
      clientStockStatusFilter === "all" ||
      normalizedStatus === clientStockStatusFilter;

    if (!statusMatch) return false;
    if (!clientStockItemSearchTerm) return true;

    const query = clientStockItemSearchTerm.toLowerCase();
    const category = (
      item.inventory_categories?.description ||
      item.category_code ||
      ""
    ).toLowerCase();
    const serial = (item.serial_number || "").toLowerCase();
    const technician = (item.assigned_to_technician || "").toLowerCase();
    const notes = (item.notes || "").toLowerCase();

    return (
      category.includes(query) ||
      serial.includes(query) ||
      technician.includes(query) ||
      notes.includes(query)
    );
  });

  const filteredTechStockTechnicians = techStockTechnicians.filter((tech) => {
    if (!isValidSingleTechnicianEmail(tech?.technician_email)) return false;
    if (!techStockSearchTerm) return true;
    const query = techStockSearchTerm.toLowerCase();
    const email = (tech.technician_email || "").toLowerCase();
    const displayName = (tech.display_name || "").toLowerCase();
    return email.includes(query) || displayName.includes(query);
  });

  const filteredAddItemCategories = useMemo(() => {
    const normalizedOptions = stockTypes.map((type) => {
      const code =
        typeof type === "string" ? normalizeCategoryCode(type) : type.code;
      const description =
        typeof type === "string"
          ? type
          : `${type.code} - ${type.description || type.code}`;

      return {
        code,
        description,
        score: getFuzzyScore(addItemCategorySearchTerm, `${code} ${description}`),
      };
    });

    if (!addItemCategorySearchTerm.trim()) {
      return normalizedOptions.sort((a, b) =>
        a.description.localeCompare(b.description),
      );
    }

    return normalizedOptions
      .filter((option) => option.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.description.localeCompare(b.description);
      });
  }, [addItemCategorySearchTerm, stockTypes]);

  const addItemCategorySuggestions = useMemo(() => {
    if (!addItemCategorySearchTerm.trim()) return [];
    return filteredAddItemCategories.slice(0, 8);
  }, [addItemCategorySearchTerm, filteredAddItemCategories]);

  const getClientStockStatusClasses = (status: string | null) => {
    const normalized = (status || "").toUpperCase();

    if (normalized === "IN STOCK") return "bg-green-100 text-green-700";
    if (normalized === "OUT OF STOCK") return "bg-red-100 text-red-700";
    if (normalized === "ASSIGNED") return "bg-blue-100 text-blue-700";
    if (normalized === "RESERVED") return "bg-amber-100 text-amber-700";

    return "bg-gray-100 text-gray-700";
  };

  const handleAssignParts = (jobCard: JobCard) => {
    setSelectedJobCard(jobCard);
    setShowAssignParts(true);
  };

  const handleOpenJobDetails = (jobCard: JobCard) => {
    setSelectedInventoryJob(jobCard);
    setShowJobDetails(true);
  };

  const handlePartsAssigned = () => {
    fetchJobCards();
    setShowAssignParts(false);
    setSelectedJobCard(null);
  };

  const handleNoPartsRequired = async () => {
    if (!selectedJobCard?.id) return;

    setMarkingNoPartsRequired(true);

    try {
      const response = await fetch(`/api/job-cards/${selectedJobCard.id}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: "admin",
          bypassEscalation: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || "Failed to move job to admin",
        );
      }

      toast.success(
        `Job ${selectedJobCard.job_number} moved to admin with no parts required`,
      );
      removeJobCardLocally(selectedJobCard.id);
      setShowAssignParts(false);
      setSelectedJobCard(null);
    } catch (error) {
      console.error("Error marking no parts required:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to move job to admin",
      );
    } finally {
      setMarkingNoPartsRequired(false);
    }
  };

  const handleBookStock = async (job: JobCard) => {
    // Show loading toast
    const loadingToast = toast.loading(
      `Booking stock for job ${job.job_number}...`,
    );

    try {
      // Update the job status to move it to admin
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      console.log("Booking stock for job:", job.id, job.job_number);

      // Get existing parts or initialize an empty array
      let existingParts = [];

      // Safely handle the existing parts
      if (job.parts_required) {
        try {
          // Check if it's an array and make a clean copy
          if (Array.isArray(job.parts_required)) {
            existingParts = JSON.parse(JSON.stringify(job.parts_required));
          } else {
            console.log(
              "parts_required is not an array:",
              typeof job.parts_required,
              job.parts_required,
            );
            existingParts = [];
          }
        } catch (e) {
          console.error("Error parsing parts_required:", e);
          existingParts = [];
        }
      }

      console.log("Initial parts array:", existingParts);

      // Create a boot stock part entry to indicate this is boot stock
      // Use a simple object structure that's safe for JSONB serialization
      const bootStockPart: Part = {
        description: "Boot Stock",
        quantity: 1,
        code: "BOOT-STOCK",
        supplier: "Internal",
        cost_per_unit: 0,
        total_cost: 0,
        stock_id: `boot-stock-${Date.now()}`, // Use simple timestamp without Date object
        available_stock: 1,
        date_added: new Date().toISOString(),
        boot_stock: "yes", // Mark this part as boot stock - this is the key field
      };

      // Add boot stock part to the array
      existingParts.push(bootStockPart);

      console.log("Updated parts array with boot stock:", existingParts);

      // Create update data with the parts_required array (no parts_booked field)
      const updateData = {
        status: "admin_created",
        updated_at: new Date().toISOString(),
        parts_required: existingParts, // Store boot stock in parts_required as per DB schema
      };

      console.log("Update data:", JSON.stringify(updateData));

      try {
        console.log(`Updating job_cards with id=${job.id}`);

        // Make sure parts_required is properly structured before sending to Supabase
        const cleanPartsData = updateData.parts_required.map((part: Part) => {
          const normalizedSerial = resolveSerialNumber(
            part as unknown as Record<string, unknown>,
          );
          // Create a clean object with only the properties we need
          // Make sure all values are proper JSON-serializable types
          return {
            ...part,
            description: String(part.description || ""),
            quantity: Number(part.quantity || 0),
            code: String(part.code || ""),
            supplier: String(part.supplier || ""),
            cost_per_unit: Number(part.cost_per_unit || 0),
            total_cost: Number(part.total_cost || 0),
            stock_id: String(part.stock_id || ""),
            available_stock: Number(part.available_stock || 0),
            date_added: String(part.date_added || ""),
            boot_stock: String(part.boot_stock || ""), // Ensure boot_stock is included
            serial_number: normalizedSerial,
            ip_address: String(part.ip_address || ""),
          };
        });

        // Use the cleaned data for the update
        const cleanUpdateData = {
          ...updateData,
          parts_required: cleanPartsData,
        };

        console.log("Clean update data:", JSON.stringify(cleanUpdateData));

        // Use a try-catch specifically for the Supabase call
        try {
          // Log the exact API call we're making
          console.log(
            `API call: UPDATE job_cards SET data WHERE id = ${job.id}`,
          );
          console.log("Data being sent:", JSON.stringify(cleanUpdateData));

          const { data, error: updateError } = await supabase
            .from("job_cards")
            .update(cleanUpdateData)
            .eq("id", job.id)
            .select();

          if (updateError) {
            console.error("Update error message:", updateError.message);
            console.error("Update error details:", updateError.details);
            console.error("Update error hint:", updateError.hint);
            console.error("Update error code:", updateError.code);

            // Log more details about the error
            console.error("Full error object:", JSON.stringify(updateError));
            throw new Error(`Database update failed: ${updateError.message}`);
          }

          console.log("Update succeeded with data:", data);
        } catch (supabaseError) {
          console.error("Supabase operation failed:", supabaseError);
          throw supabaseError;
        }

        console.log("Update completed successfully");

        // Success
        toast.dismiss(loadingToast);
        toast.success(
          `Boot stock part added to job ${job.job_number} and moved to admin`,
        );

        // Refresh job cards to show updated status
        fetchJobCards();
      } catch (updateError) {
        console.error("Caught error during update:", updateError);

        // Get a meaningful error message if possible
        let errorMessage = "Failed to update job status";
        if (updateError instanceof Error) {
          errorMessage = updateError.message;
        }

        toast.dismiss(loadingToast);
        toast.error(errorMessage);
        return;
      }
    } catch (error) {
      console.error("Error in booking stock:", error);

      // Get a meaningful error message if possible
      let errorMessage = "Failed to book stock for this job";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.dismiss(loadingToast);
      toast.error(errorMessage);
    }
  };

  const handleShowQRCode = (jobCard: JobCard) => {
    if (!jobCard.qr_code) {
      const qrData = {
        job_number: jobCard.job_number,
        job_id: jobCard.id,
        customer_name: jobCard.customer_name,
        vehicle_registration: jobCard.vehicle_registration,
        job_type: jobCard.job_type,
        parts_required: jobCard.parts_required || [],
        technician: jobCard.technician_name,
        created_at: jobCard.created_at,
      };
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;
      jobCard.qr_code = qrCodeUrl;
    }
    setSelectedQRJob(jobCard);
    setShowQRCode(true);
  };

  const parsePartsRequired = (value: unknown): Part[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value as Part[];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as Part[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const parseEquipmentUsed = (value: unknown): Record<string, unknown>[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? (parsed as Record<string, unknown>[])
          : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const parseQuotationProducts = (
    value: unknown,
  ): Record<string, unknown>[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? (parsed as Record<string, unknown>[])
          : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const extractQuotedItemValue = (item: Record<string, unknown>): string => {
    const directValue = String(
      item.value || item.detail_value || item.detailValue || "",
    ).trim();
    if (directValue) return directValue;

    const description = String(item.description || "");
    const descriptionValueMatch = description.match(/Value:\s*([^-\n\r]+)/i);
    return descriptionValueMatch?.[1]?.trim() || "";
  };

  const isDeInstallJob = (job: JobCard | null): boolean => {
    if (!job) return false;
    const normalizedJobType = String(job.job_type || "").toLowerCase();
    const normalizedQuotationJobType = String(
      job.quotation_job_type || "",
    ).toLowerCase();
    const normalizedSubType = String(job.job_sub_type || "").toLowerCase();

    return (
      normalizedJobType.includes("deinstall") ||
      normalizedJobType.includes("de-install") ||
      normalizedJobType.includes("decommission") ||
      normalizedQuotationJobType.includes("deinstall") ||
      normalizedQuotationJobType.includes("de-install") ||
      normalizedSubType.includes("deinstall") ||
      normalizedSubType.includes("de-install") ||
      normalizedSubType.includes("decommission")
    );
  };

  const isInstallJob = (job: JobCard | null): boolean => {
    if (!job || isDeInstallJob(job)) return false;

    const normalizedJobType = String(job.job_type || "").toLowerCase();
    const normalizedQuotationJobType = String(
      job.quotation_job_type || "",
    ).toLowerCase();
    const normalizedSubType = String(job.job_sub_type || "").toLowerCase();

    return (
      normalizedJobType.includes("install") ||
      normalizedQuotationJobType.includes("install") ||
      normalizedSubType.includes("install") ||
      normalizedJobType.includes("installation") ||
      normalizedQuotationJobType.includes("installation")
    );
  };

  const handleViewCompletedJobDetails = async (jobId: string) => {
    setLoadingCompletedJobDetails(true);
    setShowCompletedJobDetails(true);
    setSelectedCompletedJob(null);
    setMovedDeinstalledItems({});
    setMovingDeinstalledItemKey(null);

    try {
      const response = await fetch(`/api/job-cards/${jobId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch full job details");
      }

      const fullJob = await response.json();
      setSelectedCompletedJob(fullJob);
    } catch (error) {
      console.error("Error fetching completed job details:", error);
      toast.error("Failed to load full completed job details");
      setShowCompletedJobDetails(false);
    } finally {
      setLoadingCompletedJobDetails(false);
    }
  };

  const getMoveItemKey = (
    context: "deinstalled" | "stock-used" | "quotation",
    item: Record<string, unknown>,
    index: number,
  ) => {
    const itemId = String(
      item.id || item.serial_number || item.code || item.name || index,
    );
    const jobId = String(selectedCompletedJob?.id || "job");
    return `${jobId}:${context}:${itemId}:${index}`;
  };

  const handleMoveJobItem = async (
    context: "deinstalled" | "stock-used" | "quotation",
    item: Record<string, unknown>,
    index: number,
    destination: "client" | "soltrack" | "decommission",
  ) => {
    if (!selectedCompletedJob?.id) {
      toast.error("No completed job selected");
      return;
    }

    const itemKey = getMoveItemKey(context, item, index);
    const loadingLabel =
      destination === "client"
        ? "Adding to client stock..."
        : destination === "soltrack"
          ? "Adding to Soltrack stock..."
          : "Decommissioning item...";
    setMovingDeinstalledItemKey(`${itemKey}:${destination}`);

    try {
      const response = await fetch("/api/inventory/deinstalled-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: selectedCompletedJob.id,
          destination,
          cost_code: selectedCompletedJobCostCode || undefined,
          item,
          item_index: index,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to move item to stock");
      }

      setMovedDeinstalledItems((prev) => ({
        ...prev,
        [`${itemKey}:client`]:
          destination === "client" ? "moved" : prev[`${itemKey}:client`] || "",
        [`${itemKey}:soltrack`]:
          destination === "soltrack"
            ? "moved"
            : prev[`${itemKey}:soltrack`] || "",
        [`${itemKey}:decommission`]:
          destination === "decommission"
            ? "moved"
            : prev[`${itemKey}:decommission`] || "",
      }));

      toast.success(
        destination === "client"
          ? "Item added to client stock"
          : destination === "soltrack"
            ? "Item added to Soltrack stock"
            : "Item decommissioned",
      );
    } catch (error) {
      console.error("Error moving item to stock:", error);
      toast.error(error instanceof Error ? error.message : loadingLabel);
    } finally {
      setMovingDeinstalledItemKey(null);
    }
  };

  const handleGenerateJobQR = (jobCard: JobCard) => {
    const qrData = {
      job_number: jobCard.job_number,
      job_id: jobCard.id,
      customer_name: jobCard.customer_name,
      vehicle_registration: jobCard.vehicle_registration,
      job_type: jobCard.job_type,
      parts_required: jobCard.parts_required || [],
      technician: jobCard.technician_name,
      created_at: jobCard.created_at,
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;

    // Update the job with the new QR code
    setSelectedQRJob({ ...jobCard, qr_code: qrCodeUrl });
  };

  const handleDownloadQR = (jobCard: JobCard) => {
    if (!jobCard.qr_code) return;

    const link = document.createElement("a");
    link.href = jobCard.qr_code;
    link.download = `qr-code-${jobCard.job_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintQR = (jobCard: JobCard) => {
    if (!jobCard.qr_code) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Job QR Code - ${jobCard.job_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .qr-container { max-width: 800px; margin: 0 auto; }
            .job-info { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            .job-info h2 { color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            .job-info p { margin: 5px 0; }
            .qr-code { text-align: center; margin: 20px 0; }
            .qr-code img { border: 2px solid #333; border-radius: 8px; }
            .job-details { margin-top: 20px; }
            .section { margin-bottom: 20px; padding: 15px; background: #fff; border: 1px solid #ddd; border-radius: 8px; }
            .section h3 { color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
            .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .section-grid p { margin: 5px 0; }
            .part-item { padding: 10px; background: #f8f9fa; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid #3498db; }
            .part-header { font-weight: bold; margin-bottom: 10px; color: #2c3e50; }
            .total-section { margin-top: 20px; padding-top: 15px; border-top: 2px solid #333; background: #e8f4fd; padding: 15px; border-radius: 5px; }
            .vehicle-info { background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #27ae60; }
            .customer-info { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #f39c12; }
            .quotation-info { background: #f8d7da; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545; }
            @media print {
              body { margin: 10px; }
              .qr-code img { max-width: 250px; }
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="job-info">
              <h2>Job QR Code - ${jobCard.job_number}</h2>
              <div class="section-grid">
                <div>
                  <p><strong>Job Number:</strong> ${jobCard.job_number}</p>
                  <p><strong>Quotation Number:</strong> ${jobCard.quotation_number || "N/A"}</p>
                  <p><strong>Job Type:</strong> ${jobCard.job_type || "Not specified"}</p>
                  <p><strong>Status:</strong> ${jobCard.status || "N/A"}</p>
                  <p><strong>Priority:</strong> ${jobCard.priority || "N/A"}</p>
                  <p><strong>IP Address:</strong> ${jobCard.ip_address || "N/A"}</p>
                </div>
                <div>
                  <p><strong>Created:</strong> ${jobCard.created_at ? new Date(jobCard.created_at).toLocaleDateString() : "N/A"}</p>
                  <p><strong>Updated:</strong> ${jobCard.updated_at ? new Date(jobCard.updated_at).toLocaleDateString() : "N/A"}</p>
                  <p><strong>Job Location:</strong> ${jobCard.job_location || "N/A"}</p>
                  <p><strong>Estimated Duration:</strong> ${jobCard.estimated_duration_hours || "N/A"} hours</p>
                  <p><strong>Estimated Cost:</strong> ${jobCard.estimated_cost ? `R${jobCard.estimated_cost}` : "N/A"}</p>
                </div>
              </div>
            </div>

            <div class="qr-code">
              <img src="${jobCard.qr_code}" alt="Job QR Code" />
              <p style="margin-top: 10px; color: #666; font-size: 12px;">
                Scan this QR code to access complete job information
              </p>
            </div>

            <div class="customer-info">
              <h3>Customer Information</h3>
              <div class="section-grid">
                <div>
                  <p><strong>Customer Name:</strong> ${jobCard.customer_name || "N/A"}</p>
                  <p><strong>Email:</strong> ${jobCard.customer_email || "N/A"}</p>
                  <p><strong>Phone:</strong> ${jobCard.customer_phone || "N/A"}</p>
                </div>
                <div>
                  <p><strong>Address:</strong> ${jobCard.customer_address || "N/A"}</p>
                  <p><strong>Site Contact:</strong> ${jobCard.site_contact_person || "N/A"}</p>
                  <p><strong>Contact Phone:</strong> ${jobCard.site_contact_phone || "N/A"}</p>
                </div>
              </div>
            </div>

            <div class="vehicle-info">
              <h3>Vehicle Information</h3>
              <div class="section-grid">
                <div>
                  <p><strong>Registration:</strong> ${jobCard.vehicle_registration || "Not provided"}</p>
                  <p><strong>Make & Model:</strong> ${jobCard.vehicle_make && jobCard.vehicle_model ? `${jobCard.vehicle_make} ${jobCard.vehicle_model}` : jobCard.vehicle_make || jobCard.vehicle_model || "Not provided"}</p>
                  <p><strong>Year:</strong> ${jobCard.vehicle_year || "Not provided"}</p>
                </div>
                <div>
                  <p><strong>VIN Number:</strong> ${jobCard.vin_numer || "Not provided"}</p>
                  <p><strong>Odometer:</strong> ${jobCard.odormeter || "Not provided"}</p>
                </div>
              </div>
            </div>

            <div class="quotation-info">
              <h3>Quotation Details</h3>
              <div class="section-grid">
                <div>
                  <p><strong>Quote Status:</strong> ${jobCard.quote_status || "N/A"}</p>
                  <p><strong>Quote Date:</strong> ${jobCard.quote_date ? new Date(jobCard.quote_date).toLocaleDateString() : "N/A"}</p>
                  <p><strong>Quote Expiry:</strong> ${jobCard.quote_expiry_date ? new Date(jobCard.quote_expiry_date).toLocaleDateString() : "N/A"}</p>
                </div>
                <div>
                  <p><strong>Total Amount:</strong> ${jobCard.quotation_total_amount ? `R${jobCard.quotation_total_amount}` : "N/A"}</p>
                  <p><strong>Products:</strong> ${jobCard.quotation_products?.length || 0} items</p>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Job Description</h3>
              <p>${jobCard.job_description || "No description provided"}</p>
            </div>

            ${
              jobCard.special_instructions
                ? `
            <div class="section">
              <h3>Special Instructions</h3>
              <p>${jobCard.special_instructions}</p>
            </div>
            `
                : ""
            }

            ${
              jobCard.access_requirements
                ? `
            <div class="section">
              <h3>Access Requirements</h3>
              <p>${jobCard.access_requirements}</p>
            </div>
            `
                : ""
            }

            <div class="section">
              <h3>Assigned Parts</h3>
              <div class="part-list">
                ${
                  jobCard.parts_required
                    ?.map(
                      (part) => `
                  <div class="part-item">
                    <strong>${part.description}</strong> (${part.code})<br>
                    Quantity: ${part.quantity} | Supplier: ${part.supplier || "N/A"}<br>
                    Cost: R${part.cost_per_unit?.toFixed(2) || "0.00"} each | Total: R${part.total_cost || "0.00"}
                  </div>
                `,
                    )
                    .join("") || "No parts assigned"
                }
              </div>
              ${
                jobCard.parts_required && jobCard.parts_required.length > 0
                  ? `
              <div class="total-section">
                <p><strong>Total Parts:</strong> ${jobCard.parts_required.length}</p>
                <p><strong>Total Cost:</strong> R${jobCard.parts_required.reduce((sum, part) => sum + (parseFloat(part.total_cost) || 0), 0).toFixed(2)}</p>
              </div>
              `
                  : ""
              }
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Handle viewing stock order details or PDF
  const handleViewStockOrder = (
    order: StockOrder & { invoice_link?: string; total_amount_ex_vat?: number },
  ) => {
    setSelectedStockOrder(order);
    if (order.invoice_link) {
      setShowPdfViewer(true);
    } else {
      // If no PDF, show order details in a toast
      toast({
        title: "Order Details",
        description: `Order: ${order.order_number}\nSupplier: ${order.supplier || "Custom"}\nAmount: R ${parseFloat(String(order.total_amount_ex_vat || 0)).toFixed(2)}\nStatus: ${order.status || "pending"}`,
      });
    }
  };

  // Handle viewing order items
  const handleViewOrderItems = (order: StockOrder) => {
    setSelectedStockOrder(order);
    setShowOrderItemsModal(true);
  };

  // Handle downloading stock order invoice
  const handleDownloadStockOrderInvoice = (
    order: StockOrder & { invoice_link?: string },
  ) => {
    if (order.invoice_link) {
      const link = document.createElement("a");
      link.href = order.invoice_link;
      link.download = `invoice-${order.order_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getJobTypeColor = (jobType: string | undefined) => {
    switch (jobType?.toLowerCase()) {
      case "installation":
        return "bg-blue-100 text-blue-800";
      case "de-installation":
        return "bg-red-100 text-red-800";
      case "maintenance":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // We've made all Book Stock buttons always clickable
  // This function checks if a job has boot stock assigned
  const hasBootStock = (job: JobCard): boolean => {
    try {
      if (!job || !job.parts_required) {
        return false;
      }

      // Check if parts_required is an array
      if (!Array.isArray(job.parts_required)) {
        console.warn("parts_required is not an array:", job.parts_required);
        return false;
      }

      // Check if any part has boot_stock="yes"
      return job.parts_required.some((part) => {
        // Safely check if part is an object and has boot_stock property
        return part && typeof part === "object" && part.boot_stock === "yes";
      });
    } catch (error) {
      console.error("Error in hasBootStock:", error);
      return false;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const getJobPriorityColor = (priority: string | undefined) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const normalizeStockItem = (
    item: Record<string, unknown>,
    source: "equipment_used" | "parts_required",
  ) => {
    const description = String(
      item.description || item.name || item.item || "Item",
    );
    const code = String(
      item.code || item.item_code || item.serial || item.serial_number || "",
    );
    const quantity = Number(item.quantity ?? 1) || 1;
    const supplier = String(item.supplier || item.source || "");
    const stockType = String(item.stock_type || item.type || "");
    const serialNumber = String(
      item.serial_number || item.serial || item.serialNumber || "",
    );
    const totalCost =
      Number(
        item.total_cost ??
          item.total_price ??
          item.cash_price ??
          item.price ??
          item.cost ??
          0,
      ) || 0;

    return {
      description,
      code,
      quantity,
      supplier,
      stockType,
      serialNumber,
      totalCost,
      source,
      stockId: item.stock_id || item.id || null,
      raw: item,
    };
  };

  const isBootStockItem = (item: Record<string, unknown>) =>
    String(item?.boot_stock || "").toLowerCase() === "yes";

  const mergeStockUsed = (
    equipmentUsed: Record<string, unknown>[],
    partsUsed: Part[],
  ) => {
    const merged = new Map<string, ReturnType<typeof normalizeStockItem>>();

    equipmentUsed.forEach((item) => {
      if (isBootStockItem(item)) return;
      const normalized = normalizeStockItem(item, "equipment_used");
      const key = `${normalized.code}|${normalized.description}|${normalized.stockId || ""}`;
      merged.set(key, normalized);
    });

    partsUsed.forEach((part) => {
      if (isBootStockItem(part as Record<string, unknown>)) return;
      const normalized = normalizeStockItem(
        part as Record<string, unknown>,
        "parts_required",
      );
      const key = `${normalized.code}|${normalized.description}|${normalized.stockId || ""}`;
      if (!merged.has(key)) {
        merged.set(key, normalized);
      }
    });

    return Array.from(merged.values());
  };

  const selectedCompletedJobEquipmentUsed = parseEquipmentUsed(
    selectedCompletedJob?.equipment_used,
  );
  const selectedCompletedJobPartsUsed = parsePartsRequired(
    selectedCompletedJob?.parts_required,
  );
  const selectedCompletedJobStockUsed = mergeStockUsed(
    selectedCompletedJobEquipmentUsed,
    selectedCompletedJobPartsUsed,
  );
  const selectedCompletedJobEquipmentStockUsed =
    selectedCompletedJobEquipmentUsed
      .filter((item) => !isBootStockItem(item))
      .map((item) =>
        normalizeStockItem(item, "equipment_used"),
      );
  const selectedCompletedJobPartsStockUsed = selectedCompletedJobPartsUsed
    .map((part) =>
      normalizeStockItem(part as Record<string, unknown>, "parts_required"),
    )
    .filter((part) => !isBootStockItem(part.raw as Record<string, unknown>));
  const selectedCompletedJobQuotationProducts = parseQuotationProducts(
    selectedCompletedJob?.quotation_products,
  );
  const selectedCompletedJobDeInstalledItems =
    selectedCompletedJobQuotationProducts;
  const selectedCompletedJobDeInstalledGroups = useMemo(() => {
    const groups = new Map<
      string,
      { vehiclePlate: string; items: Record<string, unknown>[] }
    >();

    selectedCompletedJobDeInstalledItems.forEach((item, index) => {
      const vehiclePlate = String(
        item.vehicle_plate ||
          selectedCompletedJob?.vehicle_registration ||
          `Vehicle ${index + 1}`,
      ).trim();

      const existing = groups.get(vehiclePlate);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(vehiclePlate, {
          vehiclePlate,
          items: [item],
        });
      }
    });

    return Array.from(groups.values());
  }, [
    selectedCompletedJob?.vehicle_registration,
    selectedCompletedJobDeInstalledItems,
  ]);
  const selectedCompletedJobIsDeInstall = isDeInstallJob(selectedCompletedJob);
  const selectedCompletedJobIsInstall = isInstallJob(selectedCompletedJob);
  const selectedCompletedJobCostCode = String(
    selectedCompletedJob?.new_account_number || "",
  ).trim();
  const selectedCompletedJobDisplayStockUsed = selectedCompletedJobIsInstall
    ? selectedCompletedJobEquipmentStockUsed.length > 0
      ? selectedCompletedJobEquipmentStockUsed
      : selectedCompletedJobPartsStockUsed
    : selectedCompletedJobStockUsed;

  useEffect(() => {
    const cleanupInstallEquipment = async () => {
      const jobId = String(selectedCompletedJob?.id || "");
      if (!jobId || !selectedCompletedJobIsInstall) return;
      if (selectedCompletedJobEquipmentUsed.length === 0) return;
      if (cleanedInstallEquipmentJobsRef.current.has(jobId)) return;

      cleanedInstallEquipmentJobsRef.current.add(jobId);

      try {
        await fetch("/api/inventory/remove-used-equipment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_id: jobId,
            equipment_used: selectedCompletedJobEquipmentUsed,
          }),
        });
      } catch (error) {
        console.error("Error removing used equipment from Soltrack stock:", error);
      }
    };

    cleanupInstallEquipment();
  }, [
    selectedCompletedJob?.id,
    selectedCompletedJobEquipmentUsed,
    selectedCompletedJobIsInstall,
  ]);

  // Function kept for potential future use with a global refresh button
  // const handleRefresh = () => {
  //   fetchJobCards();
  // };

  const createTestJobCard = async () => {
    try {
      const response = await fetch("/api/job-cards/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create test job card");
      }

      const data = await response.json();
      console.log("Test job card created:", data);
      toast.success("Test job card created successfully");
      fetchJobCards(); // Refresh the list
    } catch (error) {
      console.error("Error creating test job card:", error);
      toast.error("Failed to create test job card");
    }
  };

  const handleUploadToStock = (order) => {
    if (!order.order_items || !Array.isArray(order.order_items)) {
      toast.error("No items found in this order");
      return;
    }

    // Prepare items for serial number entry
    const items = [];
    order.order_items.forEach((item, itemIndex) => {
      const quantity = parseInt(item.quantity) || 1;
      for (let i = 0; i < quantity; i++) {
        items.push({
          id: `${itemIndex}-${i}`,
          description: item.description || "Custom Item",
          serialNumber: "",
          categoryCode:
            item.description
              ?.replace(/[^a-zA-Z0-9]/g, "")
              .toUpperCase()
              .substring(0, 10) || "ORDERED",
        });
      }
    });

    setUploadOrder(order);
    setUploadItems(items);
    setShowUploadModal(true);
  };

  const handleUploadSingle = async (item) => {
    if (!item.serialNumber.trim()) {
      toast.error("Please enter a serial number");
      return;
    }

    try {
      const response = await fetch("/api/stock-orders/upload-to-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: uploadOrder.id,
          items: [item],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload item");
      }

      toast.success(`Successfully uploaded ${item.description}`);
      // Remove uploaded item from list
      setUploadItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      console.error("Error uploading item:", error);
      toast.error(error.message || "Failed to upload item");
    }
  };

  const handleConfirmUpload = async () => {
    const itemsToUpload = uploadItems.filter((item) =>
      item.serialNumber.trim(),
    );
    if (itemsToUpload.length === 0) {
      toast.error("Please enter serial numbers for at least one item");
      return;
    }

    try {
      const response = await fetch("/api/stock-orders/upload-to-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: uploadOrder.id,
          items: itemsToUpload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload to stock");
      }

      const result = await response.json();
      toast.success(
        `Successfully uploaded ${result.itemsCreated} items to stock`,
      );
      setShowUploadModal(false);
      fetchStockOrders();
    } catch (error) {
      console.error("Error uploading to stock:", error);
      toast.error(error.message || "Failed to upload to stock");
    }
  };

  const updateSerialNumber = (itemId, serialNumber) => {
    setUploadItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, serialNumber } : item,
      ),
    );
  };

  const handleAddNewItem = async () => {
    // Validate required fields
    if (showNewCategoryFields) {
      if (
        !newItemData.new_category_code ||
        !newItemData.new_category_description ||
        !newItemData.serial_number
      ) {
        toast.error("Please fill in all required fields");
        return;
      }
    } else {
      if (!newItemData.category_code || !newItemData.serial_number) {
        toast.error("Please fill in all required fields");
        return;
      }
    }

    try {
      let categoryCode = newItemData.category_code;

      // Create new category if needed
      if (showNewCategoryFields) {
        const categoryResponse = await fetch("/api/inventory-categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: newItemData.new_category_code,
            description: newItemData.new_category_description,
          }),
        });

        if (!categoryResponse.ok) {
          const errorData = await categoryResponse.json();
          throw new Error(errorData.error || "Failed to create category");
        }

        categoryCode = newItemData.new_category_code;
        toast.success("New category created successfully");
      }

      // Create the inventory item
      const itemResponse = await fetch("/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_code: categoryCode,
          serial_number: newItemData.serial_number,
          quantity: newItemData.quantity,
        }),
      });

      if (!itemResponse.ok) {
        const errorData = await itemResponse.json();
        throw new Error(errorData.error || "Failed to create item");
      }

      toast.success("New item added successfully");
      setShowAddItemModal(false);
      setAddItemCategorySearchTerm("");
      setNewItemData({
        category_code: "",
        serial_number: "",
        quantity: 1,
        new_category_code: "",
        new_category_description: "",
      });
      setShowNewCategoryFields(false);
      fetchStockItems();
      fetchCategories(); // Refresh categories list
    } catch (error) {
      console.error("Error adding new item:", error);
      toast.error(error.message || "Failed to add new item");
    }
  };

  const fetchCategoriesForModal = async () => {
    try {
      const response = await fetch("/api/inventory-categories");
      if (response.ok) {
        const data = await response.json();
        setStockTypes(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    if (showAddItemModal && stockTypes.length === 0) {
      fetchCategoriesForModal();
    }
  }, [showAddItemModal]);

  const generateQRCode = () => {
    const selectedJob = jobCardsWithParts[0] || filteredJobCards[0];
    if (!selectedJob) {
      toast.error("No job available to generate QR code");
      return;
    }

    const qrData = {
      job_number: selectedJob.job_number,
      job_id: selectedJob.id,
      customer_name: selectedJob.customer_name,
      vehicle_registration: selectedJob.vehicle_registration,
      job_type: selectedJob.job_type,
      parts_required: selectedJob.parts_required || [],
      technician: selectedJob.technician_name,
      created_at: selectedJob.created_at,
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;
    setGeneratedQR(qrCodeUrl);
    setShowQRModal(true);
  };

  const createTestStockItems = async () => {
    try {
      const response = await fetch("/api/stock/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create test stock items");
      }

      const data = await response.json();
      console.log("Test stock items created:", data);
      toast.success("Test stock items created successfully");
    } catch (error) {
      console.error("Error creating test stock items:", error);
      toast.error("Failed to create test stock items");
    }
  };

  const createTestCategories = async () => {
    try {
      const response = await fetch("/api/inventory-categories/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create test categories");
      }

      const data = await response.json();
      console.log("Test categories created:", data);
      toast.success("Test categories created successfully");
      // Refresh categories after creation
      fetchCategories();
    } catch (error) {
      console.error("Error creating test categories:", error);
      toast.error("Failed to create test categories");
    }
  };

  const testCategoriesAPI = async () => {
    try {
      console.log("Testing categories API...");
      const response = await fetch("/api/inventory-categories");
      console.log("Categories API response status:", response.status);
      const data = await response.json();
      console.log("Categories API response data:", data);
      toast.success(`Found ${data.categories?.length || 0} categories`);
    } catch (error) {
      console.error("Error testing categories API:", error);
      toast.error("Failed to test categories API");
    }
  };

  // Stock Take Functions
  const fetchStockItems = async () => {
    console.log(
      "fetchStockItems called, activeTab:",
      activeTab,
      "stockTakeActiveTab:",
      stockTakeActiveTab,
    );
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (selectedStockType !== "all") {
        params.append("category", selectedStockType);
      }

      console.log("Fetching stock with params:", params.toString());
      const response = await fetch(`/api/stock?${params}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Stock API error:", response.status, errorText);
        throw new Error(
          `Failed to fetch stock items: ${response.status} - ${errorText}`,
        );
      }
      const data = await response.json();
      console.log("Stock items received:", data.stock?.slice(0, 2)); // Log first 2 items
      console.log(
        "Setting stockItems state with:",
        data.stock?.length,
        "items",
      );
      setStockItems(data.stock || []);
      console.log("StockItems state updated");

      // Always fetch categories for filter dropdown
      await fetchCategories();
    } catch (error) {
      console.error("Error fetching stock items:", error);
      toast.error("Failed to load stock items");
    }
  };

  // Separate function to fetch categories
  const fetchCategories = async () => {
    try {
      console.log("Fetching categories...");
      const categoriesResponse = await fetch("/api/inventory-categories");
      console.log("Categories response status:", categoriesResponse.status);
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        console.log("Categories API response:", categoriesData);
        console.log("Categories array:", categoriesData.categories);
        console.log(
          "Setting stockTypes with:",
          categoriesData.categories?.length || 0,
          "categories",
        );
        setStockTypes(categoriesData.categories || []);
      } else {
        console.error("Categories API error:", categoriesResponse.status);
        const errorText = await categoriesResponse.text();
        console.error("Categories API error text:", errorText);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleStartStockTake = () => {
    setStockTakeMode(true);
    setUpdatedItems({});
    setHasChanges(false);
    toast.success("Stock take mode activated. You can now update quantities.");
  };

  const handleCancelStockTake = () => {
    setStockTakeMode(false);
    setUpdatedItems({});
    setHasChanges(false);
    toast.info("Stock take cancelled. No changes were saved.");
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    const currentQuantity = parseInt(
      stockItems.find((item) => item.id === itemId)?.quantity || "0",
    );
    const parsedQuantity = parseInt(newQuantity) || 0;

    setUpdatedItems((prev) => ({
      ...prev,
      [itemId]: {
        id: itemId,
        current_quantity: currentQuantity,
        new_quantity: parsedQuantity,
        difference: parsedQuantity - currentQuantity,
      },
    }));

    setHasChanges(true);
  };

  const handlePublishStockTake = async () => {
    if (!hasChanges) {
      toast.error("No changes to publish");
      return;
    }

    try {
      setPublishing(true);
      const response = await fetch("/api/stock/stock-take", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stock_updates: Object.values(updatedItems),
          stock_take_date: new Date().toISOString(),
          notes: `Stock take completed on ${new Date().toLocaleDateString()}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to publish stock take");
      }

      const result = await response.json();
      toast.success(
        `Stock take published successfully! ${result.updated_count} items updated.`,
      );

      // Reset state
      setStockTakeMode(false);
      setUpdatedItems({});
      setHasChanges(false);

      // Refresh stock items
      fetchStockItems();
    } catch (error) {
      console.error("Error publishing stock take:", error);
      toast.error("Failed to publish stock take");
    } finally {
      setPublishing(false);
    }
  };

  // This function is available for potential future reporting features
  // Will be used to display detailed difference information
  // const getQuantityDifference = (itemId) => {
  //   const update = updatedItems[itemId];
  //   if (!update) return null;
  //
  //   if (update.difference > 0) {
  //     return { type: 'increase', value: update.difference };
  //   } else if (update.difference < 0) {
  //     return { type: 'decrease', value: Math.abs(update.difference) };
  //   }
  //   return null;
  // };

  const getQuantityDifferenceColor = (difference) => {
    if (difference > 0) return "text-green-600";
    if (difference < 0) return "text-red-600";
    return "text-gray-600";
  };

  // Handle IP address assignment completion
  const handleIPAddressesAssigned = (itemId: number, ipAddresses: string[]) => {
    // Update the stock item in the local state
    setStockItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            ip_addresses: ipAddresses,
          };
        }
        return item;
      }),
    );
  };

  const getStockTypeColor = (stockType) => {
    const colors = {
      "Tracking Equipment": "bg-blue-100 text-blue-800",
      Accessories: "bg-green-100 text-green-800",
      Hardware: "bg-orange-100 text-orange-800",
      Electronics: "bg-purple-100 text-purple-800",
      Software: "bg-indigo-100 text-indigo-800",
    };
    return colors[stockType] || "bg-gray-100 text-gray-800";
  };

  // Boot stock state
  const [bootStock, setBootStock] = useState([]);
  const [bootStockLoading, setBootStockLoading] = useState(false);

  // Fetch boot stock from tech_stock
  const fetchBootStock = async () => {
    try {
      setBootStockLoading(true);
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: techStock, error } = await supabase
        .from("tech_stock")
        .select("assigned_parts")
        .eq("technician_email", user.email)
        .single();

      if (error) {
        console.error("Error fetching tech stock:", error);
        return;
      }

      const assignedParts = techStock?.assigned_parts || [];
      const bootStockItems = assignedParts.filter(
        (item) => item.boot_stock === "yes",
      );
      setBootStock(bootStockItems);
    } catch (error) {
      console.error("Error fetching boot stock:", error);
    } finally {
      setBootStockLoading(false);
    }
  };

  // Threshold management functions
  const handleThresholdChange = (itemId, newThreshold) => {
    setThresholds((prev) => ({
      ...prev,
      [String(itemId)]: parseInt(newThreshold) || defaultThreshold,
    }));
  };

  const getItemThreshold = (itemId) => {
    return thresholds[String(itemId)] || defaultThreshold;
  };

  const isLowStock = (item) => {
    const thresholdKey = item.category_code || item.id;
    const threshold = getItemThreshold(thresholdKey);
    return parseInt(item.quantity || 0) <= threshold;
  };

  const getLowStockStyle = (item) => {
    return isLowStock(item) ? "bg-red-50 border-red-200" : "";
  };

  const filteredStockItems = stockItems
    .filter((item) => {
      if (item.status === "CATEGORY") return false;

      const query = stockTakeSearchTerm.toLowerCase();
      const matchesSearch =
        !stockTakeSearchTerm ||
        item.serial_number?.toLowerCase().includes(query) ||
        item.category_code?.toLowerCase().includes(query) ||
        item.category_description?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query);

      const matchesType =
        selectedStockType === "all" || item.category_code === selectedStockType;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      // Sort low stock items to the top
      const aIsLow = isLowStock(a);
      const bIsLow = isLowStock(b);
      if (aIsLow && !bIsLow) return -1;
      if (!aIsLow && bIsLow) return 1;
      return 0;
    });

  const groupedStockItems = useMemo(() => {
    const groups = filteredStockItems.reduce(
      (acc, item) => {
        const groupKey = item.category_code || "uncategorized";

        if (!acc[groupKey]) {
          acc[groupKey] = {
            key: groupKey,
            categoryCode: item.category_code || "N/A",
            categoryDescription:
              item.category_description || item.description || "Uncategorized",
            items: [],
            totalQuantity: 0,
            lowCount: 0,
          };
        }

        const quantity = parseInt(item.quantity || "0");

        acc[groupKey].items.push(item);
        acc[groupKey].totalQuantity += quantity;
        if (isLowStock(item)) acc[groupKey].lowCount += 1;

        return acc;
      },
      {} as Record<
        string,
        {
          key: string;
          categoryCode: string;
          categoryDescription: string;
          items: StockItem[];
          totalQuantity: number;
          lowCount: number;
        }
      >,
    );

    return Object.values(groups).sort((a, b) => {
      const aThreshold = getItemThreshold(a.key);
      const bThreshold = getItemThreshold(b.key);
      const aIsLow = a.totalQuantity <= aThreshold;
      const bIsLow = b.totalQuantity <= bThreshold;

      if (aIsLow && !bIsLow) return -1;
      if (!aIsLow && bIsLow) return 1;
      return a.categoryCode.localeCompare(b.categoryCode);
    });
  }, [filteredStockItems, thresholds, defaultThreshold]);

  const toggleStockCategory = (categoryKey: string) => {
    setExpandedStockCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  // Tab content components
  const jobCardsContent = (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder="Search job cards by job number, customer, vehicle, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={fetchJobCards} variant="outline" size="sm">
          <RefreshCw className="mr-2 w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Job Cards */}
      {filteredJobCards.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">
            No job cards found
          </h3>
          <p className="text-gray-500">
            {searchTerm
              ? "No job cards match your search criteria."
              : "No job cards available."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Job Number
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Job Type
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-4 px-6 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredJobCards.map((job) => {
                  return (
                    <tr
                      key={job.id}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50/50"
                      onClick={() => handleOpenJobDetails(job)}
                    >
                      <td
                        className="py-4 px-6 align-middle"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {job.job_number}
                            </span>
                          </div>
                          {job.quotation_number && (
                            <span className="text-xs text-gray-500 font-medium">
                              Quote: {job.quotation_number}
                            </span>
                          )}
                          {job.ip_address && (
                            <span className="text-xs text-gray-500">
                              IP: {job.ip_address}
                            </span>
                          )}
                          {job.contact_person && (
                            <span className="text-xs text-blue-600 font-medium">
                              Contact: {job.contact_person}
                            </span>
                          )}
                          {job.decommission_date && (
                            <span className="text-xs text-amber-600 font-medium">
                              Decommission:{" "}
                              {new Date(
                                job.decommission_date,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-900">
                            {job.customer_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-gray-400" />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-gray-700">
                              {job.vehicle_registration || "No vehicle"}
                            </span>
                            {job.vehicle_make && job.vehicle_model && (
                              <span className="text-xs text-gray-500">
                                {job.vehicle_make} {job.vehicle_model}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        {job.job_type && (
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${getJobTypeColor(job.job_type)}`}
                          >
                            {job.job_type}
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <Badge
                          className={`${getStatusColor(job.job_status || job.status)} font-medium`}
                        >
                          {job.job_status || job.status || "NOT STARTED"}
                        </Badge>
                      </td>
                      <td
                        className="py-4 px-6 align-middle"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleAssignParts(job);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="mr-1 w-3 h-3" />
                            Assign Parts
                          </Button>
                          <Button
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleBookStock(job);
                            }}
                            className={
                              hasBootStock(job)
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-amber-600 hover:bg-amber-700 text-white"
                            }
                            title={
                              hasBootStock(job)
                                ? "Boot stock already assigned"
                                : "Book boot stock and move to admin"
                            }
                          >
                            <Package className="mr-1 w-3 h-3" />
                            Boot Stock
                          </Button>
                          <Select
                            onValueChange={(value) =>
                              handleMoveJob(job.id, value)
                            }
                          >
                            <SelectTrigger className="w-[140px] h-9 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                              <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent className="z-[9999] bg-white border border-gray-200 shadow-lg rounded-md">
                              <SelectItem
                                value="admin"
                                className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 font-medium text-sm py-2 px-3"
                              >
                                Admin
                              </SelectItem>
                              <SelectItem
                                value="accounts"
                                className="cursor-pointer hover:bg-green-50 focus:bg-green-50 font-medium text-sm py-2 px-3"
                              >
                                Accounts
                              </SelectItem>
                              <SelectItem
                                value="fc"
                                className="cursor-pointer hover:bg-purple-50 focus:bg-purple-50 font-medium text-sm py-2 px-3"
                              >
                                FC
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const assignedPartsContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Jobs with Assigned Parts</h2>
        <Badge variant="outline">{filteredJobCardsWithParts.length} jobs</Badge>
      </div>

      <div className="relative">
        <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
        <Input
          placeholder="Search assigned parts jobs by job number, customer, vehicle, IP, or description..."
          value={assignedPartsSearchTerm}
          onChange={(e) => setAssignedPartsSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredJobCardsWithParts.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">
            No jobs with assigned parts
          </h3>
          <p className="text-gray-500">
            Jobs will appear here once parts are assigned.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Job Number
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Job Type
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Parts
                  </th>
                  <th className="py-4 px-6 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredJobCardsWithParts.map((job) => (
                  <tr
                    key={job.id}
                    className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-green-50/50"
                    onClick={() => handleOpenJobDetails(job)}
                  >
                    <td className="py-4 px-6 align-middle">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-gray-900">
                          {job.job_number}
                        </span>
                        {job.ip_address && (
                          <span className="text-xs text-gray-500">
                            IP: {job.ip_address}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <span className="font-medium text-gray-900">
                        {job.customer_name}
                      </span>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">
                          {job.vehicle_registration || "No vehicle"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      {job.job_type && (
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium ${getJobTypeColor(job.job_type)}`}
                        >
                          {job.job_type}
                        </Badge>
                      )}
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <div className="space-y-1">
                        {job.parts_required?.slice(0, 2).map((part, index) => (
                          <div
                            key={index}
                            className="flex flex-col gap-0.5 text-gray-600 text-xs"
                          >
                            <div className="flex justify-between gap-2">
                              <span className="font-medium">
                                - {part.description}
                              </span>
                              <span className="text-green-600 ml-2 font-medium">
                                Qty: {part.quantity}
                              </span>
                            </div>
                            {resolveSerialNumber(part as Record<string, unknown>) && (
                              <span className="text-[11px] text-gray-500">
                                S/N: {resolveSerialNumber(part as Record<string, unknown>)}
                              </span>
                            )}
                          </div>
                        ))}
                        {job.parts_required?.length > 2 && (
                          <div className="text-gray-500 text-xs font-medium">
                            +{job.parts_required.length - 2} more parts
                          </div>
                        )}
                      </div>
                    </td>
                    <td
                      className="py-4 px-6 align-middle"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleShowQRCode(job);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <QrCode className="mr-1 w-3 h-3" />
                          View QR
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAssignParts(job);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="mr-1 w-3 h-3" />
                          Assign Parts
                        </Button>
                        <Select
                          onValueChange={(value) =>
                            handleMoveJob(job.id, value)
                          }
                        >
                          <SelectTrigger className="w-[140px] h-9 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                            <SelectValue placeholder="Move to..." />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] bg-white border border-gray-200 shadow-lg rounded-md">
                            <SelectItem
                              value="admin"
                              className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 font-medium text-sm py-2 px-3"
                            >
                              Admin
                            </SelectItem>
                            <SelectItem
                              value="accounts"
                              className="cursor-pointer hover:bg-green-50 focus:bg-green-50 font-medium text-sm py-2 px-3"
                            >
                              Accounts
                            </SelectItem>
                            <SelectItem
                              value="fc"
                              className="cursor-pointer hover:bg-purple-50 focus:bg-purple-50 font-medium text-sm py-2 px-3"
                            >
                              FC
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const completedJobsContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Completed Jobs</h2>
        <Badge variant="outline">{filteredCompletedJobs.length} jobs</Badge>
      </div>

      <div className="relative">
        <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
        <Input
          placeholder="Search completed jobs by job number, customer, vehicle, notes, or description..."
          value={completedJobsSearchTerm}
          onChange={(e) => setCompletedJobsSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredCompletedJobs.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">
            No completed jobs
          </h3>
          <p className="text-gray-500">Completed jobs will appear here.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Job Number
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Completion Date
                  </th>
                  <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="py-4 px-6 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCompletedJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50/50"
                  >
                    <td className="py-4 px-6 align-middle">
                      <div className="font-semibold text-gray-900">
                        {job.job_number}
                      </div>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <span className="font-medium text-gray-900">
                        {job.customer_name}
                      </span>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-700">
                          {job.vehicle_registration || "No vehicle"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">
                          {formatDate(job.completion_date)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      {job.completion_notes ? (
                        <div className="truncate max-w-[200px] text-gray-700">
                          {job.completion_notes}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No notes</span>
                      )}
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <div className="flex justify-end items-center gap-2">
                        {parsePartsRequired(job.parts_required).length > 0 && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShowQRCode(job)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <QrCode className="mr-1 w-3 h-3" />
                              View QR: 1
                            </Button>
                            <Badge variant="outline" className="text-xs">
                              {parsePartsRequired(job.parts_required).length}{" "}
                              stock used
                            </Badge>
                          </>
                        )}
                        {isDeInstallJob(job) &&
                          parseQuotationProducts(job.quotation_products)
                            .length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {
                                parseQuotationProducts(job.quotation_products)
                                  .length
                              }{" "}
                              de-installed
                            </Badge>
                          )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewCompletedJobDetails(job.id)}
                          className="text-gray-700 hover:text-gray-900"
                        >
                          <Eye className="mr-1 w-3 h-3" />
                          View Details
                        </Button>
                        <Select
                          onValueChange={(value) =>
                            handleMoveJob(job.id, value)
                          }
                        >
                          <SelectTrigger className="w-[140px] h-9 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
                            <SelectValue placeholder="Move to..." />
                          </SelectTrigger>
                          <SelectContent className="z-[9999] bg-white border border-gray-200 shadow-lg rounded-md">
                            <SelectItem
                              value="admin"
                              className="cursor-pointer hover:bg-blue-50 focus:bg-blue-50 font-medium text-sm py-2 px-3"
                            >
                              Admin
                            </SelectItem>
                            <SelectItem
                              value="accounts"
                              className="cursor-pointer hover:bg-green-50 focus:bg-green-50 font-medium text-sm py-2 px-3"
                            >
                              Accounts
                            </SelectItem>
                            <SelectItem
                              value="fc"
                              className="cursor-pointer hover:bg-purple-50 focus:bg-purple-50 font-medium text-sm py-2 px-3"
                            >
                              FC
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const stockOrdersContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Items on Order</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{filteredStockOrders.length} orders</Badge>
          <Button onClick={fetchStockOrders} variant="outline" size="sm">
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder="Search orders by order number, supplier, status, or item description..."
            value={stockOrdersSearchTerm}
            onChange={(e) => setStockOrdersSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {stockOrdersLoading ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span>Loading orders...</span>
        </div>
      ) : filteredStockOrders.length === 0 ? (
        <div className="py-12 text-center">
          <Receipt className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">
            {stockOrdersSearchTerm
              ? "No orders match your search criteria."
              : "No orders found"}
          </h3>
          <p className="text-gray-500">
            {stockOrdersSearchTerm
              ? "Try adjusting your search terms."
              : "Orders will appear here once submitted."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border border-gray-200 w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Order Number
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Supplier
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Status
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Order Date
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Total Amount
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Items Count
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredStockOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border border-gray-200 text-sm">
                    <div className="font-medium text-gray-900">
                      {order.order_number}
                    </div>
                    {order.notes && (
                      <div className="mt-1 text-gray-500 text-xs">
                        {order.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm">
                    {order.supplier || "Custom"}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                    <Badge
                      className={`text-xs ${
                        order.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : order.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.status || "pending"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm text-center">
                    {formatDate(order.order_date)}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                    <div className="font-medium">
                      {parseFloat(order.total_amount_ex_vat || 0).toFixed(2)}
                    </div>
                    {order.total_amount_usd && (
                      <div className="text-gray-500 text-xs">
                        {parseFloat(order.total_amount_usd).toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                    <Badge variant="outline" className="text-xs">
                      {order.order_items?.length || 0} items
                    </Badge>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                    <div className="flex flex-col gap-2">
                      {order.invoice_link ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewStockOrder(order)}
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            <FileText className="mr-1 w-3 h-3" />
                            View PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDownloadStockOrderInvoice(order)
                            }
                            className="text-green-600 hover:text-green-700 text-xs"
                          >
                            <Download className="mr-1 w-3 h-3" />
                            Download
                          </Button>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">No PDF</span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOrderItems(order)}
                        className="text-purple-600 hover:text-purple-700 text-xs"
                      >
                        <Package className="mr-1 w-3 h-3" />
                        View Items
                      </Button>
                      {order.status === "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUploadToStock(order)}
                          className="text-orange-600 hover:text-orange-700 text-xs"
                        >
                          <Package className="mr-1 w-3 h-3" />
                          Upload to Stock
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Stock Take Content
  // Ready to render stock take content

  const stockTakeContent = (
    <div className="space-y-6">
      {/* IP Address Assignment Modal */}
      <AssignIPAddressModal
        isOpen={showIpAddressModal && !!selectedStockItem}
        onClose={() => setShowIpAddressModal(false)}
        item={selectedStockItem || { id: 0 }} // Provide a fallback item to prevent errors
        onAssigned={handleIPAddressesAssigned}
      />

      {/* Stock Take Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">Stock Take</h3>
          <p className="text-gray-600 text-sm">
            Perform physical stock counts and update inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={
              stockTakeMode ? handleCancelStockTake : handleStartStockTake
            }
            variant={stockTakeMode ? "outline" : "default"}
            className={stockTakeMode ? "text-red-600 hover:text-red-700" : ""}
          >
            {stockTakeMode ? (
              <>
                <AlertCircle className="mr-2 w-4 h-4" />
                Cancel Stock Take
              </>
            ) : (
              <>
                <ClipboardList className="mr-2 w-4 h-4" />
                Start Stock Take
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowAddItemModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 w-4 h-4" />
            Add New Item
          </Button>
        </div>
      </div>

      {/* Stock Take Tabs */}
      <div className="border-gray-200 border-b">
        <nav className="flex space-x-8 -mb-px">
          <button
            onClick={() => {
              console.log("Stock Take sub-tab clicked");
              setStockTakeActiveTab("stock-take");
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              stockTakeActiveTab === "stock-take"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Stock Take
          </button>
          <button
            onClick={() => {
              console.log("Thresholds sub-tab clicked");
              setStockTakeActiveTab("thresholds");
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              stockTakeActiveTab === "thresholds"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Thresholds
          </button>
        </nav>
      </div>

      {/* Conditional Content Based on Active Tab */}
      {stockTakeActiveTab === "stock-take" ? (
        <>
          {/* Stock Take Controls */}
          {stockTakeMode && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      Stock Take Mode Active
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePublishStockTake}
                      disabled={!hasChanges || publishing}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="mr-2 w-4 h-4" />
                      {publishing ? "Publishing..." : "Publish Changes"}
                    </Button>
                  </div>
                </div>
                {hasChanges && (
                  <div className="mt-2 text-blue-700 text-sm">
                    {Object.keys(updatedItems).length} items have been modified
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
              <Input
                placeholder="Search stock items by serial number..."
                value={stockTakeSearchTerm}
                onChange={(e) => setStockTakeSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedStockType}
                onChange={(e) => setSelectedStockType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                {stockTypes.map((type) => {
                  console.log("Rendering category option:", type);
                  return (
                    <option key={type.code} value={type.code}>
                      {type.code} - {type.description}
                    </option>
                  );
                })}
              </select>
            </div>
            <Button onClick={fetchStockItems} variant="outline" size="sm">
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Thresholds Tab Content */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="font-medium text-gray-700 text-sm">
                  Default Threshold:
                </label>
                <Input
                  type="number"
                  min="1"
                  value={defaultThreshold}
                  onChange={(e) =>
                    setDefaultThreshold(parseInt(e.target.value) || 10)
                  }
                  className="w-20"
                />
              </div>
              <p className="text-gray-600 text-sm">
                Items at or below this threshold will be highlighted in red
              </p>
            </div>

            <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800 text-sm">
                  Set individual thresholds below or use the default threshold
                  of {defaultThreshold}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stock Items Table */}
      {groupedStockItems.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">
            No stock items found
          </h3>
          <p className="text-gray-500">
            {stockTakeSearchTerm || selectedStockType !== "all"
              ? "No stock items match your search criteria."
              : "No stock items available."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Description
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Total Count
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Serials
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Threshold
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {groupedStockItems.map((group) => {
                  const isExpanded =
                    expandedStockCategories[group.key] ?? false;
                  const threshold = getItemThreshold(group.key);
                  const groupIsLow = group.totalQuantity <= threshold;
                  const groupRowKey = `group-row-${group.key}`;
                  const groupSubtableKey = `group-subtable-${group.key}`;

                  return (
                    <Fragment key={groupRowKey}>
                      <tr
                        className={`${groupIsLow ? "bg-red-50" : "bg-white"} border-t hover:bg-slate-50`}
                      >
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleStockCategory(group.key)}
                              className="rounded p-1 hover:bg-white"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-500" />
                              )}
                            </button>
                            <span className="font-semibold text-slate-900">
                              {group.categoryCode}
                            </span>
                            {groupIsLow && (
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">
                          {group.categoryDescription}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <span
                            className={`font-medium ${groupIsLow ? "text-red-600" : "text-slate-900"}`}
                          >
                            {group.totalQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-900">
                          {group.items.length}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {stockTakeActiveTab === "thresholds" ? (
                            <Input
                              type="number"
                              min="1"
                              value={threshold}
                              onChange={(e) =>
                                handleThresholdChange(group.key, e.target.value)
                              }
                              className="mx-auto w-24 text-center"
                            />
                          ) : (
                            <span className="font-medium text-slate-900">
                              {threshold}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStockCategory(group.key)}
                          >
                            {isExpanded ? "Hide Items" : "View Items"}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr
                          key={groupSubtableKey}
                          className="bg-slate-50"
                        >
                          <td colSpan={7} className="p-0">
                            <table className="w-full border-collapse">
                              <thead className="bg-slate-100">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-600">
                                    Serial Number
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {group.items.map((item) => {
                                  const isLow = isLowStock(item);
                                  const isSelected =
                                    selectedStockItem?.id === item.id;
                                  const itemRowKey = [
                                    group.key,
                                    item.id ?? "no-id",
                                    item.serial_number ?? "no-serial",
                                    item.category_code ?? "no-category",
                                  ].join("-");

                                  return (
                                    <tr
                                      key={itemRowKey}
                                      className={`cursor-pointer border-t hover:bg-gray-50 ${getLowStockStyle(item)} ${isSelected ? "bg-blue-50" : ""}`}
                                      onClick={() => setSelectedStockItem(item)}
                                    >
                                      <td className="px-6 py-3 text-sm">
                                        <div className="font-medium text-gray-900">
                                          {item.serial_number || "N/A"}
                                        </div>
                                        {item.description &&
                                          item.description !==
                                            "No description" && (
                                            <div className="mt-1 text-xs text-gray-600">
                                              {item.description}
                                            </div>
                                          )}
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {isLow && (
                                            <Badge className="bg-red-100 text-red-800 text-xs">
                                              Low Stock
                                            </Badge>
                                          )}
                                          {isSelected && (
                                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                                              Selected
                                            </Badge>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {stockTakeMode && hasChanges && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-green-800">
                  Stock Take Summary
                </h3>
                <p className="text-green-700 text-sm">
                  {Object.keys(updatedItems).length} items modified
                </p>
              </div>
              <div className="text-right">
                <div className="text-green-700 text-sm">
                  Total Changes:{" "}
                  {Object.values(updatedItems).reduce(
                    (sum, item) => sum + Math.abs(item.difference),
                    0,
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Boot stock content
  const bootStockContent = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Boot Stock</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{bootStock.length} items</Badge>
          <Button onClick={fetchBootStock} variant="outline" size="sm">
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {bootStockLoading ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span>Loading boot stock...</span>
        </div>
      ) : bootStock.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">
            No boot stock assigned
          </h3>
          <p className="text-gray-500">
            Boot stock items will appear here when assigned to your technician
            account.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border border-gray-200 w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Description
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Code
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Quantity
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                  Supplier
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Date Added
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {bootStock.map((item, index) => (
                <tr
                  key={`${item.code || item.description || "boot-stock"}-${item.date_added || index}`}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3 border border-gray-200 text-sm">
                    <div className="font-medium text-gray-900">
                      {item.description}
                    </div>
                    <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                      Boot Stock
                    </Badge>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm">
                    {item.code}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                    <Badge variant="outline" className="text-xs">
                      {item.quantity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm">
                    {item.supplier}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm text-center">
                    {item.date_added
                      ? new Date(item.date_added).toLocaleDateString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const inventorySearchContent = (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900">
            Inventory Search
          </h3>
          <p className="text-sm text-gray-600">
            Global lookup across Soltrack stock, client stock, and technician
            stock bins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {globalStockSearchCounts.total} matches
          </Badge>
          <Button
            onClick={() => fetchGlobalStockSearch()}
            variant="outline"
            size="sm"
            disabled={globalStockSearchLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${globalStockSearchLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
        <Input
          placeholder="Search serial, code, description, supplier, bin, account, or technician..."
          value={globalStockSearchTerm}
          onChange={(event) => setGlobalStockSearchTerm(event.target.value)}
          className="bg-white pl-10"
        />
      </div>

      {globalStockSearchTerm.trim().length < 2 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-600">
          Type at least 2 characters to search all stock bins.
        </div>
      ) : globalStockSearchLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">
            Searching stock bins...
          </span>
        </div>
      ) : globalStockSearchResults.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-10 text-center text-sm text-gray-600">
          No stock matches found.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Card className="border-blue-100">
              <CardContent className="p-4">
                <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
                  Soltrack Inventory
                </p>
                <p className="mt-1 text-2xl font-semibold text-blue-900">
                  {globalStockSearchCounts.inventory}
                </p>
              </CardContent>
            </Card>
            <Card className="border-indigo-100">
              <CardContent className="p-4">
                <p className="text-xs font-medium tracking-wide text-indigo-700 uppercase">
                  Client Stock
                </p>
                <p className="mt-1 text-2xl font-semibold text-indigo-900">
                  {globalStockSearchCounts.client_stock}
                </p>
              </CardContent>
            </Card>
            <Card className="border-purple-100">
              <CardContent className="p-4">
                <p className="text-xs font-medium tracking-wide text-purple-700 uppercase">
                  Technician Stock
                </p>
                <p className="mt-1 text-2xl font-semibold text-purple-900">
                  {globalStockSearchCounts.technician_stock}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Serial / IP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Item
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Bin / Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {globalStockSearchResults.map((item) => (
                  <tr
                    key={item.result_id}
                    className="border-b border-gray-100 align-top hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          item.source === "client_stock"
                            ? "border-indigo-200 text-indigo-700"
                            : item.source === "technician_stock"
                              ? "border-purple-200 text-purple-700"
                              : "border-blue-200 text-blue-700"
                        }
                      >
                        {item.source_label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.reference}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {item.serial_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium text-gray-900">{item.code}</div>
                      <div className="text-xs text-gray-600">
                        {item.description || "No description"}
                      </div>
                      {item.supplier ? (
                        <div className="text-xs text-gray-500">
                          Supplier: {item.supplier}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {item.quantity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{item.bin}</div>
                      <div className="text-xs text-gray-500">{item.owner}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.status || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const clientStockContent = (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-2xl">Client Stock</h3>
          <p className="text-gray-600 text-sm">
            Clients loaded from cost centers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {filteredClientStockClients.length} clients
          </Badge>
          <Button
            onClick={fetchClientStockClients}
            variant="outline"
            size="sm"
            disabled={clientStockLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${clientStockLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
        <Input
          placeholder="Search client list..."
          value={clientStockSearchTerm}
          onChange={(e) => setClientStockSearchTerm(e.target.value)}
          className="pl-10 bg-white"
        />
      </div>

      {clientStockLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2 text-sm text-gray-600">Loading clients...</span>
        </div>
      ) : filteredClientStockClients.length === 0 ? (
        <div className="py-12 border border-gray-200 rounded-lg text-center">
          <User className="mx-auto mb-3 w-10 h-10 text-gray-400" />
          <p className="text-gray-700">
            {clientStockSearchTerm
              ? "No clients match your search."
              : "No clients found in cost_centers."}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-3 border-b border-blue-100 font-semibold text-gray-700 text-sm text-left">
                  Client Name
                </th>
                <th className="px-4 py-3 border-b border-blue-100 font-semibold text-gray-700 text-sm text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredClientStockClients.map((client) => (
                <tr
                  key={client.cost_code}
                  className={`hover:bg-gray-50 ${selectedClientStock?.cost_code === client.cost_code ? "bg-indigo-50" : ""}`}
                >
                  <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-900">
                    {client.company || "N/A"}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-center">
                    <Button
                      size="sm"
                      variant={
                        selectedClientStock?.cost_code === client.cost_code
                          ? "default"
                          : "outline"
                      }
                      onClick={() => handleViewClientStock(client)}
                      className={
                        selectedClientStock?.cost_code === client.cost_code
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : ""
                      }
                    >
                      <Eye className="mr-2 w-4 h-4" />
                      View Stock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedClientStock && (
        <div
          ref={clientStockDetailsRef}
          className="border border-gray-200 rounded-xl bg-white shadow-sm"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 border-b border-gray-100">
            <div>
              <h4 className="font-semibold text-gray-900 text-xl">
                Inventory Stock
              </h4>
              <p className="text-gray-600 text-sm">
                {selectedClientStock.company || "Selected Client"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  filteredClientStockItems.length > 0
                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                }
              >
                {filteredClientStockItems.length > 0
                  ? "Stock Available"
                  : "No Stock"}
              </Badge>
              <Badge variant="outline">
                {filteredClientStockItems.length} items
              </Badge>
            </div>
          </div>

          <div className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
              <Select
                value={clientStockStatusFilter}
                onValueChange={setClientStockStatusFilter}
              >
                <SelectTrigger className="w-full lg:w-52">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in stock">In Stock</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="out of stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search stock list..."
                  value={clientStockItemSearchTerm}
                  onChange={(e) => setClientStockItemSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {clientStockItemsLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="border-b-2 border-blue-600 rounded-full w-6 h-6 animate-spin"></div>
                <span className="ml-2 text-sm text-gray-600">
                  Loading stock...
                </span>
              </div>
            ) : filteredClientStockItems.length === 0 ? (
              <div className="py-10 text-center text-gray-600 text-sm">
                No stock items found for this client.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 border-b border-blue-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Reference
                      </th>
                      <th className="px-4 py-3 border-b border-blue-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 border-b border-blue-100 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 border-b border-blue-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th className="px-4 py-3 border-b border-blue-100 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClientStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-800 font-medium">
                          {item.serial_number}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-700">
                          {item.inventory_categories?.description ||
                            item.category_code}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 text-center">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold ${getClientStockStatusClasses(item.status)}`}
                          >
                            {item.status || "UNKNOWN"}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-700">
                          {item.assigned_to_technician || "Unassigned"}
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            Action
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const technicianStockContent = (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-2xl">
            Technician Stock
          </h3>
          <p className="text-gray-600 text-sm">Assigned parts by technician</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {filteredTechStockTechnicians.length} technicians
          </Badge>
          <Button
            onClick={fetchTechnicianStockList}
            variant="outline"
            size="sm"
            disabled={techStockLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${techStockLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
        <Input
          placeholder="Search technician list..."
          value={techStockSearchTerm}
          onChange={(e) => setTechStockSearchTerm(e.target.value)}
          className="pl-10 bg-white"
        />
      </div>

      {techStockLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2 text-sm text-gray-600">
            Loading technicians...
          </span>
        </div>
      ) : filteredTechStockTechnicians.length === 0 ? (
        <div className="py-12 border border-gray-200 rounded-lg text-center">
          <User className="mx-auto mb-3 w-10 h-10 text-gray-400" />
          <p className="text-gray-700">
            {techStockSearchTerm
              ? "No technicians match your search."
              : "No technicians found in tech_stock."}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-3 border-b border-blue-100 font-semibold text-gray-700 text-sm text-left">
                  Technician
                </th>
                <th className="px-4 py-3 border-b border-blue-100 font-semibold text-gray-700 text-sm text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTechStockTechnicians.map((tech) => (
                <tr
                  key={tech.technician_email || tech.id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-900">
                    <div className="font-medium">
                      {tech.display_name || tech.technician_email || "N/A"}
                    </div>
                    {tech.display_name && tech.technician_email ? (
                      <div className="text-xs text-gray-500">
                        {tech.technician_email}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewTechnicianStock(tech)}
                      >
                        <Eye className="mr-2 w-4 h-4" />
                        View Stock
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAssignTechnicianStock(tech)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Package className="mr-2 w-4 h-4" />
                        Assign Stock
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const tabs = [
    {
      value: "job-cards",
      label: "Job Cards",
      icon: FileText,
      content: jobCardsContent,
    },
    {
      value: "assigned-parts",
      label: "Assigned Parts",
      icon: Package,
      content: assignedPartsContent,
    },
    {
      value: "escalations",
      label: "Escalations",
      icon: AlertCircle,
      content: (
        <RoleEscalationsPanel
          role="inv"
          title="Inventory Escalations"
          emptyTitle="No inventory escalations"
          emptyDescription="Jobs moved into inventory will appear here first."
          moveOptions={[
            { value: "admin", label: "Admin" },
            { value: "fc", label: "FC" },
            { value: "accounts", label: "Accounts" },
          ]}
          renderActions={(job) => (
            <>
              <Button
                size="sm"
                onClick={() => handleAssignParts(job as JobCard)}
              >
                Assign Parts
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenJobDetails(job as JobCard)}
              >
                View Parts
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleViewCompletedJobDetails(String(job.id))}
              >
                Stock Modal
              </Button>
            </>
          )}
        />
      ),
    },
    {
      value: "completed-jobs",
      label: "Completed Jobs",
      icon: CheckCircle,
      content: completedJobsContent,
    },
    {
      value: "stock-orders",
      label: "Items on Order",
      icon: Package,
      content: stockOrdersContent,
    },
    {
      value: "stock-take",
      label: "Stock Take",
      icon: ClipboardList,
      content: stockTakeContent,
    },
    {
      value: "inventory-search",
      label: "Inventory Search",
      icon: Search,
      content: inventorySearchContent,
    },
    {
      value: "client-stock",
      label: "Client Stock",
      icon: User,
      content: clientStockContent,
    },
    {
      value: "technician-stock",
      label: "Technician Stock",
      icon: User,
      content: technicianStockContent,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader
          title="Inventory Management"
          subtitle="Manage job cards, assign parts, and track inventory"
          icon={Package}
        />

        {/* Create Order Button */}
        <div className="flex justify-end">
          <StockOrderModal onOrderSubmitted={fetchStockOrders} />
        </div>
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading job cards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <DashboardHeader
          title="Inventory Management"
          subtitle="Manage job cards, assign parts, and track inventory"
          icon={Package}
        />
      </div>

      {/* Create Order and Repair Job Buttons */}
      <div className="flex justify-end gap-3">
        <CreateRepairJobModal onJobCreated={fetchJobCards} />
        <StockOrderModal onOrderSubmitted={fetchStockOrders} />
      </div>

      {/* Assign Parts Modal */}
      {selectedJobCard && (
        <AssignPartsModal
          isOpen={showAssignParts}
          onClose={() => {
            setShowAssignParts(false);
            setSelectedJobCard(null);
          }}
          jobCard={selectedJobCard}
          onPartsAssigned={handlePartsAssigned}
          onNoPartsRequired={handleNoPartsRequired}
          processingNoPartsRequired={markingNoPartsRequired}
          allIpAddresses={allIpAddresses}
          allStockItems={allStockItems}
          technicianOptions={techStockTechnicians}
        />
      )}

      <Dialog
        open={showJobDetails}
        onOpenChange={(open) => {
          setShowJobDetails(open);
          if (!open) {
            setSelectedInventoryJob(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl font-bold">
              <FileText className="mr-2 h-5 w-5" />
              Job Details
            </DialogTitle>
          </DialogHeader>

          {selectedInventoryJob && (
            <div className="space-y-8">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Job Number
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedInventoryJob.job_number}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Created:{" "}
                      {selectedInventoryJob.created_at
                        ? new Date(
                            selectedInventoryJob.created_at,
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <Badge
                      className={getStatusColor(
                        selectedInventoryJob.job_status ||
                          selectedInventoryJob.status,
                      )}
                    >
                      {(
                        selectedInventoryJob.job_status ||
                        selectedInventoryJob.status ||
                        "pending"
                      )
                        .replace("_", " ")
                        .toUpperCase()}
                    </Badge>
                    <Badge
                      className={getJobPriorityColor(
                        selectedInventoryJob.priority,
                      )}
                    >
                      {(
                        selectedInventoryJob.priority || "medium"
                      ).toUpperCase()}
                    </Badge>
                    {selectedInventoryJob.parts_required &&
                      selectedInventoryJob.parts_required.length > 0 && (
                        <Badge className="bg-purple-100 text-purple-800">
                          PARTS ASSIGNED
                        </Badge>
                      )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-1">
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                      <h3 className="flex items-center text-md font-semibold text-gray-800">
                        <User className="mr-2 h-4 w-4 text-gray-500" />
                        Customer Information
                      </h3>
                    </div>
                    <div className="space-y-3 p-5">
                      <h4 className="font-semibold text-gray-900">
                        {selectedInventoryJob.customer_name || "N/A"}
                      </h4>
                      {selectedInventoryJob.contact_person && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Contact:</span>{" "}
                          {selectedInventoryJob.contact_person}
                        </div>
                      )}
                      {selectedInventoryJob.customer_email && (
                        <div className="text-sm text-gray-600">
                          {selectedInventoryJob.customer_email}
                        </div>
                      )}
                      {selectedInventoryJob.customer_phone && (
                        <div className="text-sm text-gray-600">
                          {selectedInventoryJob.customer_phone}
                        </div>
                      )}
                      {selectedInventoryJob.customer_address && (
                        <div className="whitespace-pre-wrap text-sm text-gray-600">
                          {selectedInventoryJob.customer_address}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                      <h3 className="flex items-center text-md font-semibold text-gray-800">
                        <Car className="mr-2 h-4 w-4 text-gray-500" />
                        Vehicle Information
                      </h3>
                    </div>
                    <div className="space-y-3 p-5">
                      <h4 className="font-semibold text-gray-900">
                        {selectedInventoryJob.vehicle_registration ||
                          "No Registration"}
                      </h4>
                      {(selectedInventoryJob.vehicle_make ||
                        selectedInventoryJob.vehicle_model) && (
                        <div className="text-sm text-gray-600">
                          {[
                            selectedInventoryJob.vehicle_make,
                            selectedInventoryJob.vehicle_model,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                      )}
                      {selectedInventoryJob.vehicle_year && (
                        <div className="text-sm text-gray-600">
                          Year: {selectedInventoryJob.vehicle_year}
                        </div>
                      )}
                      {selectedInventoryJob.vin_numer && (
                        <div className="text-sm text-gray-600">
                          VIN: {selectedInventoryJob.vin_numer}
                        </div>
                      )}
                      {selectedInventoryJob.odormeter && (
                        <div className="text-sm text-gray-600">
                          Odometer: {selectedInventoryJob.odormeter}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 lg:col-span-2">
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                      <h3 className="flex items-center text-md font-semibold text-gray-800">
                        <ClipboardList className="mr-2 h-4 w-4 text-gray-500" />
                        Job Details
                      </h3>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3">
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-500">
                            Job Type
                          </p>
                          <p className="font-medium">
                            {selectedInventoryJob.job_type?.toUpperCase() ||
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-500">
                            Job Date
                          </p>
                          <p className="font-medium">
                            {formatDate(selectedInventoryJob.job_date)}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-500">
                            Due Date
                          </p>
                          <p className="font-medium">
                            {formatDate(selectedInventoryJob.due_date)}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-500">
                            Technician
                          </p>
                          <p className="font-medium">
                            {selectedInventoryJob.technician_name ||
                              "Not assigned"}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-500">
                            Quotation
                          </p>
                          <p className="font-medium">
                            {selectedInventoryJob.quotation_number || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-500">
                            IP Address
                          </p>
                          <p className="font-medium">
                            {selectedInventoryJob.ip_address || "N/A"}
                          </p>
                        </div>
                      </div>

                      {selectedInventoryJob.job_description && (
                        <div className="mt-6 border-t border-gray-100 pt-6">
                          <p className="mb-2 text-xs font-medium text-gray-500">
                            Description
                          </p>
                          <p className="whitespace-pre-wrap text-sm text-gray-700">
                            {selectedInventoryJob.job_description}
                          </p>
                        </div>
                      )}

                      {selectedInventoryJob.special_instructions && (
                        <div className="mt-6 border-t border-gray-100 pt-6">
                          <p className="mb-2 text-xs font-medium text-gray-500">
                            Special Instructions
                          </p>
                          <p className="whitespace-pre-wrap text-sm text-gray-700">
                            {selectedInventoryJob.special_instructions}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedInventoryJob.parts_required &&
                    selectedInventoryJob.parts_required.length > 0 && (
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                          <h3 className="flex items-center text-md font-semibold text-gray-800">
                            <Package className="mr-2 h-4 w-4 text-gray-500" />
                            Parts Assigned
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b border-gray-200 bg-gray-50">
                              <tr>
                                <th className="px-5 py-3 text-left font-medium text-gray-500">
                                  Description
                                </th>
                                <th className="px-5 py-3 text-left font-medium text-gray-500">
                                  Quantity
                                </th>
                                <th className="px-5 py-3 text-left font-medium text-gray-500">
                                  Code
                                </th>
                                <th className="px-5 py-3 text-left font-medium text-gray-500">
                                  Supplier
                                </th>
                                <th className="px-5 py-3 text-right font-medium text-gray-500">
                                  Cost
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedInventoryJob.parts_required.map(
                                (part, index) => (
                                  <tr
                                    key={`${part.code || part.description || "part"}-${index}`}
                                    className="border-b border-gray-100"
                                  >
                                    <td className="px-5 py-3">
                                      {part.description}
                                    </td>
                                    <td className="px-5 py-3">
                                      {part.quantity}
                                    </td>
                                    <td className="px-5 py-3">{part.code}</td>
                                    <td className="px-5 py-3">
                                      {part.supplier}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                      R{part.total_cost}
                                    </td>
                                  </tr>
                                ),
                              )}
                              <tr className="bg-gray-50">
                                <td
                                  colSpan={4}
                                  className="px-5 py-3 text-right font-medium"
                                >
                                  Total:
                                </td>
                                <td className="px-5 py-3 text-right font-bold">
                                  R
                                  {selectedInventoryJob.parts_required
                                    .reduce(
                                      (sum, part) =>
                                        sum + (Number(part.total_cost) || 0),
                                      0,
                                    )
                                    .toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowJobDetails(false)}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!selectedInventoryJob) return;
                    setShowJobDetails(false);
                    handleShowQRCode(selectedInventoryJob);
                  }}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  View QR
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedInventoryJob) return;
                    setShowJobDetails(false);
                    handleAssignParts(selectedInventoryJob);
                  }}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Parts
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedInventoryJob) return;
                    setShowJobDetails(false);
                    handleBookStock(selectedInventoryJob);
                  }}
                  className={
                    hasBootStock(selectedInventoryJob)
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-amber-600 text-white hover:bg-amber-700"
                  }
                >
                  <Package className="mr-2 h-4 w-4" />
                  Boot Stock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Stock to Technician Modal */}
      {showAssignTechStock && (
        <AssignTechStockModal
          isOpen={showAssignTechStock}
          onClose={() => {
            setShowAssignTechStock(false);
            setSelectedTechForAssign(null);
          }}
          technician={selectedTechForAssign}
          onAssigned={() => {
            fetchTechnicianStockList();
          }}
        />
      )}

      {/* Completed Job Details Modal */}
      <Dialog
        open={showCompletedJobDetails}
        onOpenChange={(open) => {
          setShowCompletedJobDetails(open);
          if (!open) {
            setSelectedCompletedJob(null);
            setMovedDeinstalledItems({});
            setMovingDeinstalledItemKey(null);
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCompletedJob?.job_number
                ? `Completed Job Details - ${selectedCompletedJob.job_number}`
                : "Completed Job Details"}
            </DialogTitle>
          </DialogHeader>

          {loadingCompletedJobDetails ? (
            <div className="flex items-center gap-3 py-10 text-gray-600">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading full job information...</span>
            </div>
          ) : !selectedCompletedJob ? (
            <div className="py-10 text-center text-gray-500">
              No job details available.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg border p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Job Summary
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div>
                      <strong>Job Number:</strong>{" "}
                      {selectedCompletedJob.job_number || "N/A"}
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      {selectedCompletedJob.job_status ||
                        selectedCompletedJob.status ||
                        "N/A"}
                    </div>
                    <div>
                      <strong>Job Type:</strong>{" "}
                      {selectedCompletedJob.job_type || "N/A"}
                    </div>
                    <div>
                      <strong>Completion Date:</strong>{" "}
                      {formatDate(selectedCompletedJob.completion_date)}
                    </div>
                    <div>
                      <strong>Technician:</strong>{" "}
                      {selectedCompletedJob.technician_name || "N/A"}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg border p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Vehicle Summary
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div>
                      <strong>Registration:</strong>{" "}
                      {selectedCompletedJob.vehicle_registration || "N/A"}
                    </div>
                    <div>
                      <strong>Make:</strong>{" "}
                      {selectedCompletedJob.vehicle_make || "N/A"}
                    </div>
                    <div>
                      <strong>Model:</strong>{" "}
                      {selectedCompletedJob.vehicle_model || "N/A"}
                    </div>
                    <div>
                      <strong>Year:</strong>{" "}
                      {selectedCompletedJob.vehicle_year || "N/A"}
                    </div>
                    <div>
                      <strong>VIN:</strong>{" "}
                      {selectedCompletedJob.vin_numer || "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-blue-900">
                    {selectedCompletedJobIsInstall
                      ? "Parts Required Used"
                      : "Stock Used"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">
                      {selectedCompletedJobDisplayStockUsed.length} item
                      {selectedCompletedJobDisplayStockUsed.length === 1 ? "" : "s"}
                    </Badge>
                    <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                      Parts Required: {selectedCompletedJobPartsUsed.length}
                    </Badge>
                    {selectedCompletedJobEquipmentUsed.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        Equipment Used: {selectedCompletedJobEquipmentUsed.length}
                      </Badge>
                    )}
                  </div>
                </div>
                {selectedCompletedJobDisplayStockUsed.length === 0 ? (
                  <p className="text-sm text-blue-800">
                    {selectedCompletedJobIsInstall
                      ? "No parts required recorded on this installation job."
                      : "No stock used recorded on this job."}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedCompletedJobDisplayStockUsed.map((part, index) => (
                      <div
                        key={`${part.code || part.description || "part"}-${index}`}
                        className="rounded-lg border border-blue-100 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {part.description || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {part.code || "No code"}
                            </p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            Qty {part.quantity ?? 1}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="font-medium text-gray-700">
                              Type:
                            </span>{" "}
                            {part.stockType || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Cost:
                            </span>{" "}
                            {part.totalCost
                              ? `R ${Number(part.totalCost).toFixed(2)}`
                              : "N/A"}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium text-gray-700">
                              Serial Number:
                            </span>{" "}
                            {part.serialNumber || "N/A"}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              movingDeinstalledItemKey ===
                                `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:client` ||
                              movedDeinstalledItems[
                                `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:client`
                              ] === "moved"
                            }
                            onClick={() =>
                              handleMoveJobItem(
                                "stock-used",
                                part.raw as Record<string, unknown>,
                                index,
                                "client",
                              )
                            }
                            className="text-xs"
                          >
                            {movingDeinstalledItemKey ===
                            `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:client`
                              ? "Adding..."
                              : movedDeinstalledItems[
                                    `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:client`
                                  ] === "moved"
                                ? "Added to Client Stock"
                                : "Add to Client Stock"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              movingDeinstalledItemKey ===
                                `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:soltrack` ||
                              movedDeinstalledItems[
                                `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:soltrack`
                              ] === "moved"
                            }
                            onClick={() =>
                              handleMoveJobItem(
                                "stock-used",
                                part.raw as Record<string, unknown>,
                                index,
                                "soltrack",
                              )
                            }
                            className="text-xs"
                          >
                            {movingDeinstalledItemKey ===
                            `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:soltrack`
                              ? "Adding..."
                              : movedDeinstalledItems[
                                    `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:soltrack`
                                  ] === "moved"
                                ? "Added to Soltrack Stock"
                                : "Add to Soltrack Stock"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              movingDeinstalledItemKey ===
                                `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:decommission` ||
                              movedDeinstalledItems[
                                `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:decommission`
                              ] === "moved"
                            }
                            onClick={() =>
                              handleMoveJobItem(
                                "stock-used",
                                part.raw as Record<string, unknown>,
                                index,
                                "decommission",
                              )
                            }
                            className="text-xs"
                          >
                            {movingDeinstalledItemKey ===
                            `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:decommission`
                              ? "Decommissioning..."
                              : movedDeinstalledItems[
                                    `${getMoveItemKey("stock-used", part.raw as Record<string, unknown>, index)}:decommission`
                                  ] === "moved"
                                ? "Decommissioned"
                                : "Decommission"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCompletedJobIsDeInstall && (
                <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-red-900">
                      Items De-installed
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {selectedCompletedJobCostCode
                        ? `Client Cost Code: ${selectedCompletedJobCostCode}`
                        : "No Client Cost Code on Job"}
                    </Badge>
                  </div>
                  {selectedCompletedJobDeInstalledItems.length === 0 ? (
                    <p className="text-sm text-red-800">
                      No de-installed items recorded in quotation products.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {selectedCompletedJobDeInstalledGroups.map((group) => (
                        <div
                          key={`deinstalled-group-${group.vehiclePlate}`}
                          className="rounded border border-red-200 bg-white p-3"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {group.vehiclePlate}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {group.items.length} de-installed item
                                {group.items.length === 1 ? "" : "s"}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Vehicle Plate
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {group.items.map((item, index) => {
                              const itemIndex =
                                selectedCompletedJobDeInstalledItems.indexOf(
                                  item,
                                );
                              const itemName = String(
                                item.name ||
                                  item.product ||
                                  item.description ||
                                  item.category ||
                                  `Item ${index + 1}`,
                              );
                              const itemValue = extractQuotedItemValue(item);

                              return (
                                <div
                                  key={`deinstalled-${group.vehiclePlate}-${itemIndex}`}
                                  className="rounded border border-red-100 bg-red-50/40 p-3"
                                >
                                  <div className="font-medium text-gray-900">
                                    {itemName}
                                  </div>
                                  <div className="mt-1 text-sm text-gray-700">
                                    Qty: {String(item.quantity ?? 1)}
                                    {item.type
                                      ? ` | Type: ${String(item.type)}`
                                      : ""}
                                    {item.category
                                      ? ` | Category: ${String(item.category)}`
                                      : ""}
                                  </div>
                                  {itemValue && (
                                    <div className="mt-1 text-sm text-gray-700">
                                      <span className="font-medium text-gray-900">
                                        Serial Number:
                                      </span>{" "}
                                      <span className="font-mono rounded bg-amber-50 px-1 py-0.5 text-amber-700">
                                        {itemValue}
                                      </span>
                                    </div>
                                  )}
                                  <div className="mt-1 text-sm text-gray-600">
                                    {String(item.description || "No description")}
                                  </div>
                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        movingDeinstalledItemKey ===
                                          `${getMoveItemKey("deinstalled", item, itemIndex)}:client` ||
                                        movedDeinstalledItems[
                                          `${getMoveItemKey("deinstalled", item, itemIndex)}:client`
                                        ] === "moved"
                                      }
                                      onClick={() =>
                                        handleMoveJobItem(
                                          "deinstalled",
                                          item,
                                          itemIndex,
                                          "client",
                                        )
                                      }
                                      className="text-xs"
                                    >
                                      {movingDeinstalledItemKey ===
                                      `${getMoveItemKey("deinstalled", item, itemIndex)}:client`
                                        ? "Adding..."
                                        : movedDeinstalledItems[
                                              `${getMoveItemKey("deinstalled", item, itemIndex)}:client`
                                            ] === "moved"
                                          ? "Added to Client Stock"
                                          : "Add to Client Stock"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        movingDeinstalledItemKey ===
                                          `${getMoveItemKey("deinstalled", item, itemIndex)}:soltrack` ||
                                        movedDeinstalledItems[
                                          `${getMoveItemKey("deinstalled", item, itemIndex)}:soltrack`
                                        ] === "moved"
                                      }
                                      onClick={() =>
                                        handleMoveJobItem(
                                          "deinstalled",
                                          item,
                                          itemIndex,
                                          "soltrack",
                                        )
                                      }
                                      className="text-xs"
                                    >
                                      {movingDeinstalledItemKey ===
                                      `${getMoveItemKey("deinstalled", item, itemIndex)}:soltrack`
                                        ? "Adding..."
                                        : movedDeinstalledItems[
                                              `${getMoveItemKey("deinstalled", item, itemIndex)}:soltrack`
                                            ] === "moved"
                                          ? "Added to Soltrack Stock"
                                          : "Add to Soltrack Stock"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        movingDeinstalledItemKey ===
                                          `${getMoveItemKey("deinstalled", item, itemIndex)}:decommission` ||
                                        movedDeinstalledItems[
                                          `${getMoveItemKey("deinstalled", item, itemIndex)}:decommission`
                                        ] === "moved"
                                      }
                                      onClick={() =>
                                        handleMoveJobItem(
                                          "deinstalled",
                                          item,
                                          itemIndex,
                                          "decommission",
                                        )
                                      }
                                      className="text-xs"
                                    >
                                      {movingDeinstalledItemKey ===
                                      `${getMoveItemKey("deinstalled", item, itemIndex)}:decommission`
                                        ? "Decommissioning..."
                                        : movedDeinstalledItems[
                                              `${getMoveItemKey("deinstalled", item, itemIndex)}:decommission`
                                            ] === "moved"
                                          ? "Decommissioned"
                                          : "Decommission"}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Customer & Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>
                    <span className="font-medium text-gray-900">Customer:</span>{" "}
                    {selectedCompletedJob.customer_name || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Contact Person:
                    </span>{" "}
                    {selectedCompletedJob.contact_person ||
                      selectedCompletedJob.site_contact_person ||
                      "N/A"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Email:</span>{" "}
                    {selectedCompletedJob.customer_email || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Phone:</span>{" "}
                    {selectedCompletedJob.customer_phone ||
                      selectedCompletedJob.site_contact_phone ||
                      "N/A"}
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-900">Address:</span>{" "}
                    {selectedCompletedJob.customer_address || "N/A"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Job Notes</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <div>
                    <span className="font-medium text-gray-900">
                      Job Description:
                    </span>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedCompletedJob.job_description || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Work Notes:
                    </span>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedCompletedJob.work_notes || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Completion Notes:
                    </span>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedCompletedJob.completion_notes || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Special Instructions:
                    </span>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedCompletedJob.special_instructions || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Access Requirements:
                    </span>
                    <p className="mt-1 whitespace-pre-wrap">
                      {selectedCompletedJob.access_requirements || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {!selectedCompletedJobIsInstall && (
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Quotation Products
                </h3>
                {selectedCompletedJobQuotationProducts.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No quotation products found for this job.
                  </p>
                ) : (
                  <div>
                    <table className="w-full text-sm table-fixed">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 pr-2 font-semibold text-gray-700 w-1/5">
                            Item
                          </th>
                          <th className="text-left py-2 pr-2 font-semibold text-gray-700 w-2/5">
                            Description
                          </th>
                          <th className="text-left py-2 pr-2 font-semibold text-gray-700 w-1/5">
                            Vehicle
                          </th>
                          <th className="text-right py-2 pr-2 font-semibold text-gray-700 w-1/10">
                            Qty
                          </th>
                          <th className="text-right py-2 pr-2 font-semibold text-gray-700 w-1/10">
                            Amount
                          </th>
                          <th className="text-right py-2 pr-2 font-semibold text-gray-700 w-[220px]">
                            Move
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCompletedJobQuotationProducts.map(
                          (item, index) => {
                            const qty = Number(item.quantity ?? 1) || 1;
                            const amount =
                              Number(
                                item.total_price ??
                                  item.cash_price ??
                                  item.subscription_price ??
                                  item.rental_price ??
                                  item.installation_price ??
                                  item.de_installation_price ??
                                  0,
                              ) || 0;
                            return (
                              <tr
                                key={`quote-${index}`}
                                className="border-b border-gray-100"
                              >
                                <td className="py-2 pr-2 font-medium text-gray-900 break-words">
                                  {String(
                                    item.name || item.item_code || "Item",
                                  )}
                                </td>
                                <td className="py-2 pr-2 text-gray-600 break-words">
                                  {String(
                                    item.description || item.category || "—",
                                  )}
                                </td>
                                <td className="py-2 pr-2 text-gray-600 break-words">
                                  {String(
                                    item.vehicle_plate ||
                                      selectedCompletedJob.vehicle_registration ||
                                      "N/A",
                                  )}
                                </td>
                                <td className="py-2 pr-2 text-right">{qty}</td>
                                <td className="py-2 pr-2 text-right">
                                  {amount ? `R ${amount.toFixed(2)}` : "R 0.00"}
                                </td>
                                <td className="py-3 pr-2 text-right align-top">
                                  <div className="flex flex-wrap justify-end gap-2 min-w-[210px]">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        movingDeinstalledItemKey ===
                                          `${getMoveItemKey("quotation", item, index)}:client` ||
                                        movedDeinstalledItems[
                                          `${getMoveItemKey("quotation", item, index)}:client`
                                        ] === "moved"
                                      }
                                      onClick={() =>
                                        handleMoveJobItem(
                                          "quotation",
                                          item,
                                          index,
                                          "client",
                                        )
                                      }
                                      className="min-w-[72px] text-xs"
                                    >
                                      {movingDeinstalledItemKey ===
                                      `${getMoveItemKey("quotation", item, index)}:client`
                                        ? "Adding..."
                                        : movedDeinstalledItems[
                                              `${getMoveItemKey("quotation", item, index)}:client`
                                            ] === "moved"
                                          ? "Added"
                                          : "Client"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        movingDeinstalledItemKey ===
                                          `${getMoveItemKey("quotation", item, index)}:soltrack` ||
                                        movedDeinstalledItems[
                                          `${getMoveItemKey("quotation", item, index)}:soltrack`
                                        ] === "moved"
                                      }
                                      onClick={() =>
                                        handleMoveJobItem(
                                          "quotation",
                                          item,
                                          index,
                                          "soltrack",
                                        )
                                      }
                                      className="min-w-[80px] text-xs"
                                    >
                                      {movingDeinstalledItemKey ===
                                      `${getMoveItemKey("quotation", item, index)}:soltrack`
                                        ? "Adding..."
                                        : movedDeinstalledItems[
                                              `${getMoveItemKey("quotation", item, index)}:soltrack`
                                            ] === "moved"
                                          ? "Added"
                                          : "Soltrack"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        movingDeinstalledItemKey ===
                                          `${getMoveItemKey("quotation", item, index)}:decommission` ||
                                        movedDeinstalledItems[
                                          `${getMoveItemKey("quotation", item, index)}:decommission`
                                        ] === "moved"
                                      }
                                      onClick={() =>
                                        handleMoveJobItem(
                                          "quotation",
                                          item,
                                          index,
                                          "decommission",
                                        )
                                      }
                                      className="min-w-[112px] text-xs"
                                    >
                                      {movingDeinstalledItemKey ===
                                      `${getMoveItemKey("quotation", item, index)}:decommission`
                                        ? "Decommissioning..."
                                        : movedDeinstalledItems[
                                              `${getMoveItemKey("quotation", item, index)}:decommission`
                                            ] === "moved"
                                          ? "Decommissioned"
                                          : "Decommission"}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      {selectedQRJob && showQRCode && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-xl">
                Job QR Code - {selectedQRJob.job_number}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowQRCode(false);
                  setSelectedQRJob(null);
                }}
              >
                Close
              </Button>
            </div>
            <div className="space-y-4">
              {selectedQRJob.qr_code ? (
                <>
                  {/* QR Code */}
                  <div className="mb-6 text-center">
                    <img
                      src={selectedQRJob.qr_code}
                      alt="Job QR Code"
                      className="mx-auto border rounded-lg"
                      style={{ width: "200px", height: "200px" }}
                    />
                    <p className="mt-2 text-gray-500 text-xs">
                      Scan this QR code to access complete job information
                    </p>
                  </div>

                  {/* Job Information Grid */}
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                    {/* Basic Job Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="mb-3 font-medium text-gray-900">
                        Job Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Job Number:</strong>{" "}
                          {selectedQRJob.job_number}
                        </div>
                        <div>
                          <strong>Quotation:</strong>{" "}
                          {selectedQRJob.quotation_number || "N/A"}
                        </div>
                        <div>
                          <strong>Type:</strong>{" "}
                          {selectedQRJob.job_type || "N/A"}
                        </div>
                        <div>
                          <strong>Status:</strong>{" "}
                          {selectedQRJob.status || "N/A"}
                        </div>
                        <div>
                          <strong>Priority:</strong>{" "}
                          {selectedQRJob.priority || "N/A"}
                        </div>
                        <div>
                          <strong>IP Address:</strong>{" "}
                          {selectedQRJob.ip_address || "N/A"}
                        </div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="mb-3 font-medium text-gray-900">
                        Customer Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Name:</strong>{" "}
                          {selectedQRJob.customer_name || "N/A"}
                        </div>
                        <div>
                          <strong>Email:</strong>{" "}
                          {selectedQRJob.customer_email || "N/A"}
                        </div>
                        <div>
                          <strong>Phone:</strong>{" "}
                          {selectedQRJob.customer_phone || "N/A"}
                        </div>
                        <div>
                          <strong>Address:</strong>{" "}
                          {selectedQRJob.customer_address || "N/A"}
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="mb-3 font-medium text-gray-900">
                        Vehicle Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Registration:</strong>{" "}
                          {selectedQRJob.vehicle_registration || "Not provided"}
                        </div>
                        <div>
                          <strong>Make:</strong>{" "}
                          {selectedQRJob.vehicle_make || "Not provided"}
                        </div>
                        <div>
                          <strong>Model:</strong>{" "}
                          {selectedQRJob.vehicle_model || "Not provided"}
                        </div>
                        <div>
                          <strong>Year:</strong>{" "}
                          {selectedQRJob.vehicle_year || "Not provided"}
                        </div>
                        <div>
                          <strong>VIN:</strong>{" "}
                          {selectedQRJob.vin_numer || "Not provided"}
                        </div>
                        <div>
                          <strong>Odometer:</strong>{" "}
                          {selectedQRJob.odormeter || "Not provided"}
                        </div>
                      </div>
                    </div>

                    {/* Quotation Info */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="mb-3 font-medium text-gray-900">
                        Quotation Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Total Amount:</strong>{" "}
                          {selectedQRJob.quotation_total_amount
                            ? `R${selectedQRJob.quotation_total_amount}`
                            : "N/A"}
                        </div>
                        <div>
                          <strong>Products:</strong>{" "}
                          {selectedQRJob.quotation_products?.length || 0} items
                        </div>
                        <div>
                          <strong>Quote Status:</strong>{" "}
                          {selectedQRJob.quote_status || "N/A"}
                        </div>
                        <div>
                          <strong>Created:</strong>{" "}
                          {selectedQRJob.created_at
                            ? new Date(
                                selectedQRJob.created_at,
                              ).toLocaleDateString()
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Job Description */}
                  {selectedQRJob.job_description && (
                    <div className="bg-white p-4 border rounded-lg">
                      <h3 className="mb-2 font-medium text-gray-900">
                        Job Description
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {selectedQRJob.job_description}
                      </p>
                    </div>
                  )}

                  {/* Special Instructions */}
                  {selectedQRJob.special_instructions && (
                    <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
                      <h3 className="mb-2 font-medium text-gray-900">
                        Special Instructions
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {selectedQRJob.special_instructions}
                      </p>
                    </div>
                  )}

                  {/* Assigned Parts */}
                  {selectedQRJob.parts_required &&
                    Array.isArray(selectedQRJob.parts_required) &&
                    selectedQRJob.parts_required.length > 0 && (
                      <div className="bg-white p-4 border rounded-lg">
                        <h3 className="mb-3 font-medium text-gray-900">
                          Assigned Parts
                        </h3>
                        <div className="space-y-2">
                          {selectedQRJob.parts_required.map((part, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center bg-gray-50 p-2 rounded"
                            >
                              <div>
                                <span className="font-medium">
                                  {part.description}
                                </span>
                                <span className="ml-2 text-gray-500 text-sm">
                                  ({part.code})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Qty: {part.quantity}
                                </Badge>
                                {part.total_cost && (
                                  <Badge variant="outline" className="text-xs">
                                    R{part.total_cost}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-2 pt-4">
                    <Button
                      onClick={() => handlePrintQR(selectedQRJob)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Printer className="mr-2 w-4 h-4" />
                      Print Complete Job Details
                    </Button>
                    <Button
                      onClick={() => handleDownloadQR(selectedQRJob)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="mr-2 w-4 h-4" />
                      Download QR
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <QrCode className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                  <p className="text-gray-500">
                    No QR code available for this job.
                  </p>
                  <p className="mt-2 text-gray-400 text-sm">
                    QR codes are generated when parts are assigned.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <DashboardTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(newTab) => {
          console.log("Tab change requested:", newTab);
          setActiveTab(newTab);
        }}
      />

      {/* PDF Viewer Modal for Stock Orders */}
      <Dialog open={showPdfViewer} onOpenChange={setShowPdfViewer}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Invoice PDF: {selectedStockOrder?.order_number}</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    selectedStockOrder &&
                    handleDownloadStockOrderInvoice(selectedStockOrder)
                  }
                >
                  <Download className="mr-2 w-4 h-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPdfViewer(false)}
                >
                  Close
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {selectedStockOrder?.invoice_link ? (
              <iframe
                src={selectedStockOrder.invoice_link}
                className="border-0 rounded-lg w-full h-[80vh]"
                title={`Invoice for Order ${selectedStockOrder.order_number}`}
                onError={() => {
                  toast({
                    title: "Error",
                    description:
                      "Failed to load PDF. Please try downloading instead.",
                    variant: "destructive",
                  });
                }}
              />
            ) : (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <AlertCircle className="mx-auto w-12 h-12 text-gray-400" />
                  <h3 className="mt-2 font-medium text-gray-900 text-sm">
                    No PDF Available
                  </h3>
                  <p className="mt-1 text-gray-500 text-sm">
                    This order doesn&apos;t have an invoice PDF attached.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Items Modal */}
      <Dialog open={showOrderItemsModal} onOpenChange={setShowOrderItemsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Order Items: {selectedStockOrder?.order_number}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOrderItemsModal(false)}
              >
                Close
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {selectedStockOrder && (
              <div className="space-y-6">
                {/* Order Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="gap-4 grid grid-cols-2 md:grid-cols-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">
                        Supplier:
                      </span>
                      <p className="text-gray-900">
                        {selectedStockOrder.supplier || "Custom"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <p className="text-gray-900">
                        {selectedStockOrder.status || "pending"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Order Date:
                      </span>
                      <p className="text-gray-900">
                        {formatDate(selectedStockOrder.order_date)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Total Amount:
                      </span>
                      <p className="text-gray-900">
                        R{" "}
                        {parseFloat(
                          selectedStockOrder.total_amount_ex_vat || 0,
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {selectedStockOrder.notes && (
                    <div className="mt-3 pt-3 border-gray-200 border-t">
                      <span className="font-medium text-gray-700">Notes:</span>
                      <p className="text-gray-900 text-sm">
                        {selectedStockOrder.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Order Items Table */}
                {selectedStockOrder.order_items &&
                Array.isArray(selectedStockOrder.order_items) &&
                selectedStockOrder.order_items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="border border-gray-200 w-full border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                            Item Description
                          </th>
                          <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                            Quantity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {selectedStockOrder.order_items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 border border-gray-200 text-sm">
                              <div className="font-medium text-gray-900">
                                {item.description || "Custom Item"}
                              </div>
                              {item.supplier && (
                                <div className="mt-1 text-gray-500 text-xs">
                                  Supplier: {item.supplier}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                              <Badge variant="outline" className="text-xs">
                                {item.quantity || 0}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                    <h3 className="mb-2 font-medium text-gray-900 text-lg">
                      No Order Items
                    </h3>
                    <p className="text-gray-500">
                      This order doesn&apos;t have any items listed.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload to Stock Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Upload Order Items to Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Enter serial numbers for {uploadItems.length} items:
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmUpload}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Upload All (
                  {
                    uploadItems.filter((item) => item.serialNumber.trim())
                      .length
                  }
                  )
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {uploadItems.filter((item) => item.serialNumber.trim()).length} of{" "}
              {uploadItems.length} items ready
            </div>
            <div className="bg-white rounded border max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      #
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      Description
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      Category
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      Serial Number
                    </th>
                    <th className="text-center p-3 text-sm font-medium text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uploadItems.map((item, index) => (
                    <tr key={item.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-600">{index + 1}</td>
                      <td className="p-3">
                        <div className="font-medium text-sm text-gray-900">
                          {item.description}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {item.categoryCode}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.serialNumber}
                          onChange={(e) =>
                            updateSerialNumber(item.id, e.target.value)
                          }
                          placeholder="Enter serial number"
                          className="w-full"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleUploadSingle(item)}
                          disabled={!item.serialNumber.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-xs"
                        >
                          Upload
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generated QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {generatedQR && (
              <div className="p-4 bg-white border rounded-lg">
                <img src={generatedQR} alt="QR Code" className="w-64 h-64" />
              </div>
            )}
            <p className="text-sm text-gray-600 text-center">
              Scan this QR code to access inventory information
            </p>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setShowQRModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Item Modal */}
      <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
        <DialogContent className="w-[99vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!showNewCategoryFields ? (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Category
                </label>
                <Input
                  value={addItemCategorySearchTerm}
                  onChange={(e) => setAddItemCategorySearchTerm(e.target.value)}
                  placeholder="Search category code or description"
                  className="mt-1"
                />
                {addItemCategorySuggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium text-blue-600">
                      Closest
                    </p>
                    <div className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
                      {addItemCategorySuggestions.map((type) => {
                        const isSelected =
                          normalizeCategoryCode(newItemData.category_code) ===
                          normalizeCategoryCode(type.code);

                        return (
                          <button
                            key={`suggestion-${type.code}`}
                            type="button"
                            onClick={() => {
                              setNewItemData({
                                ...newItemData,
                                category_code: type.code,
                              });
                              setAddItemCategorySearchTerm(type.description);
                            }}
                            className={`flex w-full items-start justify-between px-3 py-2 text-left text-sm transition-colors ${
                              isSelected
                                ? "bg-blue-50 text-blue-700"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <span>{type.description}</span>
                            {isSelected && (
                              <span className="ml-3 text-xs font-medium">
                                Selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-1">
                  <select
                    value={newItemData.category_code}
                    onChange={(e) =>
                      setNewItemData({
                        ...newItemData,
                        category_code: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select category...</option>
                    {filteredAddItemCategories.map((type) => (
                      <option
                        key={type.code}
                        value={type.code}
                      >
                        {type.description}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewCategoryFields(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {newItemData.category_code && (
                  <p className="mt-2 text-xs text-gray-500">
                    Selected category: {newItemData.category_code}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700">
                    Create New Category
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewCategoryFields(false)}
                  >
                    Back to existing
                  </Button>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Category Code
                  </label>
                  <Input
                    value={newItemData.new_category_code}
                    onChange={(e) =>
                      setNewItemData({
                        ...newItemData,
                        new_category_code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. GPS, CABLE, SENSOR"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Category Description
                  </label>
                  <Input
                    value={newItemData.new_category_description}
                    onChange={(e) =>
                      setNewItemData({
                        ...newItemData,
                        new_category_description: e.target.value,
                      })
                    }
                    placeholder="e.g. GPS Tracking Devices"
                    className="mt-1"
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Serial Number
              </label>
              <Input
                value={newItemData.serial_number}
                onChange={(e) =>
                  setNewItemData({
                    ...newItemData,
                    serial_number: e.target.value,
                  })
                }
                placeholder="Enter serial number"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Quantity
              </label>
              <Input
                type="number"
                min="1"
                value={newItemData.quantity}
                onChange={(e) =>
                  setNewItemData({
                    ...newItemData,
                    quantity: parseInt(e.target.value) || 1,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddItemModal(false);
                setAddItemCategorySearchTerm("");
                setShowNewCategoryFields(false);
                setNewItemData({
                  category_code: "",
                  serial_number: "",
                  quantity: 1,
                  new_category_code: "",
                  new_category_description: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNewItem}
              className="bg-green-600 hover:bg-green-700"
            >
              Add Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveToFcDialog} onOpenChange={setShowMoveToFcDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Move Job Back to FC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Add an optional note for FC before moving this job back.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Note for FC
              </label>
              <Textarea
                value={moveToFcNote}
                onChange={(e) => setMoveToFcNote(e.target.value)}
                placeholder="Optional note for Fleet Consultant..."
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMoveToFcDialog(false);
                  setPendingMoveJobId(null);
                  setMoveToFcNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmMoveToFc}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Move to FC
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


