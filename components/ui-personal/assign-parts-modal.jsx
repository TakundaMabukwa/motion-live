"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Search,
  X,
  CheckCircle,
  Printer,
  FileText,
  Wrench,
  User,
  Car,
  Calendar,
  ClipboardList,
  AlertTriangle,
  MessageSquare,
  DollarSign,
  MapPin,
  Clock,
  Phone,
  Mail,
  Info,
} from "lucide-react";
import { toast } from "sonner";

const normalizeCategoryCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();
const normalizeSearchValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isValidSingleTechnicianEmail = (value) => {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return false;
  if (email.includes(",") || email.includes(" ")) return false;
  if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)) return false;
  const [localPart] = email.split("@");
  if (!localPart) return false;
  return !localPart.includes(".");
};

const resolveSerialNumber = (item) =>
  String(
    item?.serial_number ||
      item?.serial ||
      item?.serialNumber ||
      item?.ip_address ||
      "",
  ).trim();

const resolveUniqueItemToken = (item) =>
  String(item?.serial_number || item?.stock_id || item?.id || item?.row_id || "").trim();

const hasSerialOrUniqueItemIdentity = (item) =>
  Boolean(resolveSerialNumber(item)) || Boolean(resolveUniqueItemToken(item));

const toRecurringMultiplier = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(1, Math.floor(parsed));
};

const buildSelectionKey = (source, owner, item) => {
  const normalizedSource = String(source || "soltrack").trim().toLowerCase();
  const normalizedOwner = String(owner || "").trim().toLowerCase();
  const candidateId = String(
    normalizedSource === "technician"
      ? item?.serial_number || item?.stock_id || item?.id || ""
      : item?.id || item?.stock_id || item?.row_id || "",
  ).trim();
  return `${normalizedSource}|${normalizedOwner}|${candidateId}`;
};

const isSubsequenceMatch = (needle, haystack) => {
  if (!needle || !haystack) return false;
  let needleIndex = 0;
  for (let i = 0; i < haystack.length && needleIndex < needle.length; i += 1) {
    if (haystack[i] === needle[needleIndex]) {
      needleIndex += 1;
    }
  }
  return needleIndex === needle.length;
};

const boundedLevenshtein = (source, target, maxDistance = 2) => {
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

const getFuzzyScore = (query, candidate) => {
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

export default function AssignPartsModal({
  isOpen,
  onClose,
  jobCard,
  onPartsAssigned,
  onNoPartsRequired,
  processingNoPartsRequired = false,
  stockSource = "soltrack",
  stockOwner = "",
  clientOptions = [],
  technicianOptions = [],
}) {
  const [selectedParts, setSelectedParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const [selectedStockType, setSelectedStockType] = useState("all");
  const [stockTypes, setStockTypes] = useState([]);
  const [allStockItems, setAllStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [modalStockSource, setModalStockSource] = useState(stockSource);
  const [modalStockOwner, setModalStockOwner] = useState(stockOwner);
  const [visibleCount, setVisibleCount] = useState(120);
  const [localClientOptions, setLocalClientOptions] = useState(clientOptions);
  const [returnPartKey, setReturnPartKey] = useState(null);
  const [returnBucket, setReturnBucket] = useState("");
  const [returnOwner, setReturnOwner] = useState("");
  const [returning, setReturning] = useState(false);
  const dedupedTechnicianOptions = useMemo(() => {
    const map = new Map();
    technicianOptions.forEach((tech) => {
      const email = String(tech?.technician_email || "").trim().toLowerCase();
      if (!isValidSingleTechnicianEmail(email)) return;
      if (!email) return;
      if (!map.has(email)) {
        map.set(email, {
          ...tech,
          technician_email: email,
        });
      }
    });
    return Array.from(map.values());
  }, [technicianOptions]);

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      let stockArray = [];

      if (modalStockSource === "client") {
        if (!modalStockOwner) {
          setAllStockItems([]);
          setStockTypes([]);
          return;
        }
        const response = await fetch(
          `/api/client-stock/items?cost_code=${encodeURIComponent(modalStockOwner)}`,
        );
        if (!response.ok) throw new Error("Failed to fetch client stock");
        const data = await response.json();
        stockArray = Array.isArray(data.items)
          ? data.items.map((item) => ({
              id: item.id,
              description:
                item.inventory_categories?.description || item.category_code,
              code: item.category_code,
              supplier: "Client Stock",
              stock_type:
                item.inventory_categories?.description || item.category_code,
              quantity: "1",
              serial_number: item.serial_number,
              status: item.status,
              category_code: item.category_code,
              category_description:
                item.inventory_categories?.description || item.category_code,
              client_code: item.client_code || "",
              cost_code: item.cost_code || "",
            }))
          : [];
      } else if (modalStockSource === "technician") {
        if (!modalStockOwner) {
          setAllStockItems([]);
          setStockTypes([]);
          return;
        }
        const response = await fetch(
          `/api/tech-stock/items?technician_email=${encodeURIComponent(modalStockOwner)}`,
        );
        if (!response.ok) throw new Error("Failed to fetch technician stock");
        const data = await response.json();
        stockArray = Array.isArray(data.items)
          ? data.items
              .map((item) => ({
                id: item.id || item.stock_id || "",
                stock_id: item.stock_id || item.id || "",
                description: item.description || item.code || "Item",
                code: item.code || "",
                supplier: item.supplier || "Technician Stock",
                stock_type: item.stock_type || item.code || "",
                quantity: item.quantity || 1,
                serial_number:
                  item.serial_number ||
                  item.serial ||
                  item.serialNumber ||
                  item.ip_address ||
                  "",
                status: "IN STOCK",
                category_code: item.code || "",
                category_description: item.description || item.code || "",
              }))
              .filter((item) => Boolean(String(item.serial_number || item.stock_id || "").trim()))
          : [];
      } else {
        const response = await fetch("/api/stock");
        if (!response.ok) throw new Error("Failed to fetch stock");
        const data = await response.json();
        stockArray = Array.isArray(data.stock) ? data.stock : [];
      }

      setAllStockItems(stockArray);

      const stockCategoryMap = new Map();
      stockArray.forEach((item) => {
        const normalizedCode = normalizeCategoryCode(
          item?.category_code || item?.category?.code || item?.code,
        );
        if (!normalizedCode) return;
        const existing = stockCategoryMap.get(normalizedCode);
        if (existing) {
          existing.count += 1;
          return;
        }
        stockCategoryMap.set(normalizedCode, {
          code: normalizedCode,
          description:
            item?.category?.description ||
            item?.category_description ||
            item?.description ||
            normalizedCode,
          count: 1,
        });
      });

      setStockTypes(
        Array.from(stockCategoryMap.values()).sort((a, b) =>
          String(a.description || a.code).localeCompare(
            String(b.description || b.code),
          ),
        ),
      );
    } catch (error) {
      toast.error("Failed to load stock items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelectedParts([]);
    setSearchTerm("");
    setShowQRCode(false);
    setQrCodeUrl("");
    setSelectedStockType("all");
    setIpAddress("");
    setCategorySearchTerm("");
    setModalStockSource(stockSource);
    setModalStockOwner(stockOwner);
    setLocalClientOptions(clientOptions);
    setVisibleCount(120);

    // Pre-populate with existing parts and IP address
    if (jobCard?.parts_required && Array.isArray(jobCard.parts_required)) {
      const existingParts = jobCard.parts_required.map((part, idx) => {
        const source = String(part.source || "existing").trim().toLowerCase();
        const sourceOwner = String(part.source_owner || "").trim().toLowerCase();
        const selectionKey =
          String(part.selection_key || "").trim() ||
          `${source}|${sourceOwner}|${String(part.row_id || part.stock_id || part.id || idx).trim()}`;

        return {
          stock_id: part.stock_id || part.id,
          row_id: part.row_id || "",
          description: String(part.description || ""),
          serial_number: resolveSerialNumber(part),
          code: String(part.code || ""),
          supplier: String(part.supplier || ""),
          quantity: part.quantity || 1,
          cost_per_unit: parseFloat(part.cost_per_unit || "0"),
          total_cost: parseFloat(part.total_cost || "0"),
          ip_address: part.ip_address || "",
          source,
          source_owner: sourceOwner,
          client_code: String(part.client_code || ""),
          cost_code: String(part.cost_code || ""),
          recurring_multiplier: toRecurringMultiplier(
            part.recurring_multiplier || part.recurringMultiplier || 1,
          ),
          recurring_multiplier_label: `${toRecurringMultiplier(
            part.recurring_multiplier || part.recurringMultiplier || 1,
          )}x`,
          is_new_assignment: false,
          selection_key: selectionKey,
        };
      });
      setSelectedParts(existingParts);

      if (existingParts.length > 0 && existingParts[0].ip_address) {
        setIpAddress(existingParts[0].ip_address);
      }
    }
  }, [isOpen, jobCard, stockSource, stockOwner]);

  useEffect(() => {
    if (!isOpen) return;
    fetchInventoryItems();
  }, [isOpen, modalStockSource, modalStockOwner]);

  useEffect(() => {
    if (!isOpen) return;
    setVisibleCount(120);
  }, [
    isOpen,
    modalStockSource,
    modalStockOwner,
    selectedStockType,
    searchTerm,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (modalStockSource !== "client") return;
    if (clientOptions.length > 0) {
      setLocalClientOptions(clientOptions);
      return;
    }
    const loadClients = async () => {
      try {
        const response = await fetch("/api/client-stock/clients");
        if (!response.ok) return;
        const data = await response.json();
        setLocalClientOptions(data.clients || []);
      } catch {
        // ignore
      }
    };
    loadClients();
  }, [isOpen, modalStockSource, clientOptions]);

  useEffect(() => {
    if (selectedStockType === "all") return;
    const exists = stockTypes.some((type) => type.code === selectedStockType);
    if (!exists) {
      setSelectedStockType("all");
    }
  }, [stockTypes, selectedStockType]);

  const categorySuggestions = useMemo(() => {
    const query = String(categorySearchTerm || "").trim();
    if (!query) return [];

    return stockTypes
      .map((type) => {
        const label = `${type.code} ${type.description || ""}`;
        return {
          ...type,
          score: Math.max(
            getFuzzyScore(query, type.code),
            getFuzzyScore(query, type.description || ""),
            getFuzzyScore(query, label),
          ),
        };
      })
      .filter((type) => type.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          String(a.description || a.code).localeCompare(
            String(b.description || b.code),
          ),
      )
      .slice(0, 8);
  }, [categorySearchTerm, stockTypes]);

  useEffect(() => {
    if (!categorySearchTerm.trim()) return;
    const bestMatch = categorySuggestions[0];
    if (bestMatch && bestMatch.score >= 45) {
      setSelectedStockType(bestMatch.code);
    }
  }, [categorySuggestions, categorySearchTerm]);

  const stockSearchSuggestions = useMemo(() => {
    const query = String(searchTerm || ipAddress || "").trim();
    if (!query) return [];

    return allStockItems
      .map((item) => {
        const candidates = [
          item.serial_number,
          item.ip_address,
          item.description,
          item.category_description,
          item.category_code,
          item.code,
        ].filter(Boolean);

        const score = Math.max(
          ...candidates.map((candidate) => getFuzzyScore(query, candidate)),
        );
        const suggestionValue =
          item.serial_number ||
          item.ip_address ||
          item.category_code ||
          item.code ||
          item.description;

        return {
          item,
          score,
          suggestionValue: String(suggestionValue || ""),
        };
      })
      .filter((entry) => entry.score > 0 && entry.suggestionValue)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [allStockItems, ipAddress, searchTerm]);

  const filteredAvailableParts = useMemo(() => {
    const selectedKeys = new Set(
      selectedParts
        .map((part) => String(part.selection_key || "").trim())
        .filter(Boolean),
    );

    const rankedItems = allStockItems.map((item) => {
      const itemSelectionKey = buildSelectionKey(
        modalStockSource,
        modalStockOwner,
        item,
      );
      const isSelected = selectedKeys.has(itemSelectionKey);
      if (isSelected) return null;
      if (
        (modalStockSource === "client" || modalStockSource === "technician") &&
        !modalStockOwner
      ) {
        return null;
      }

      const searchRaw = String(searchTerm || "")
        .toLowerCase()
        .trim();

      const serial = resolveSerialNumber(item);
      const categoryDescription = String(item.category?.description || "");
      const categoryCode = String(
        item.category_code || item.category?.code || "",
      );
      const notes = String(item.notes || "");
      const description = String(item.description || "");
      const ipValue = String(item.ip_address || "");

      const searchScore = !searchRaw
        ? 1
        : Math.max(
            getFuzzyScore(searchRaw, serial),
            getFuzzyScore(searchRaw, ipValue),
            getFuzzyScore(searchRaw, categoryDescription),
            getFuzzyScore(searchRaw, categoryCode),
            getFuzzyScore(searchRaw, notes),
            getFuzzyScore(searchRaw, description),
          );

      const itemCategoryCode = normalizeCategoryCode(
        item.category_code || item.category?.code,
      );
      const matchesType =
        selectedStockType === "all" || itemCategoryCode === selectedStockType;

      if (searchScore <= 0 || !matchesType) {
        return null;
      }

      return {
        item,
        searchScore,
      };
    });

    return rankedItems
      .filter(Boolean)
      .sort((a, b) => b.searchScore - a.searchScore)
      .map((entry) => entry.item);
  }, [
    allStockItems,
    selectedParts,
    modalStockSource,
    modalStockOwner,
    searchTerm,
    selectedStockType,
  ]);

  const visibleAvailableParts = useMemo(
    () => filteredAvailableParts.slice(0, visibleCount),
    [filteredAvailableParts, visibleCount],
  );

  const addPart = async (item) => {
    if (modalStockSource === "technician" && !String(item?.serial_number || item?.stock_id || "").trim()) {
      toast.error("Selected technician stock item has no serial or stock ID. Please refresh and try again.");
      return;
    }
    const selectedKey = buildSelectionKey(modalStockSource, modalStockOwner, item);
    const serialNumber = resolveSerialNumber(item);
    const alreadySelected = selectedParts.find(
      (part) => {
        const partKey = String(part.selection_key || "").trim();
        if (partKey && partKey === selectedKey) return true;
        const partSerial = String(part.serial_number || "").trim().toLowerCase();
        const itemSerial = String(serialNumber || "").trim().toLowerCase();
        if (partSerial && itemSerial && partSerial === itemSerial) return true;
        return false;
      },
    );
    if (alreadySelected) {
      toast.error("This item is already selected");
      return;
    }

    if (!hasSerialOrUniqueItemIdentity(item)) {
      toast.error(
        `No serial or unique item ID found for selected stock item (${item?.code || item?.category_code || item?.description || "item"}).`,
      );
      return;
    }

    setSelectedParts((prev) => [
      ...prev,
      {
        stock_id: item.stock_id || item.id,
        row_id: item.row_id || "",
        description: String(
          item.category?.description || item.description || "",
        ),
        serial_number: String(serialNumber),
        unique_item_id: resolveUniqueItemToken(item),
        code: String(item.category_code || item.code || ""),
        supplier: String(item.supplier || ""),
        quantity: 1,
        cost_per_unit: parseFloat(item.cost_excl_vat_zar || "0"),
        total_cost: parseFloat(item.cost_excl_vat_zar || "0"),
        ip_address: ipAddress || "",
        source: modalStockSource,
        source_owner: modalStockOwner,
        client_code: String(item.client_code || ""),
        cost_code: String(item.cost_code || ""),
        recurring_multiplier: 1,
        recurring_multiplier_label: "1x",
        is_new_assignment: true,
        selection_key: selectedKey,
      },
    ]);

    setAllStockItems((prev) =>
      prev.filter(
        (stockItem) => {
          if (buildSelectionKey(modalStockSource, modalStockOwner, stockItem) === selectedKey) return false;
          const stockSerial = String(resolveSerialNumber(stockItem) || "").trim().toLowerCase();
          const itemSerial = String(serialNumber || "").trim().toLowerCase();
          if (stockSerial && itemSerial && stockSerial === itemSerial) return false;
          return true;
        },
      ),
    );
  };

  const removePart = async (selectionKey) => {
    const normalizedKey = String(selectionKey || "").trim();
    const part = selectedParts.find(
      (p) => String(p.selection_key || "").trim() === normalizedKey,
    );
    if (!part) return;

    // Just return it to the available list in the UI.
    setSelectedParts((prev) =>
      prev.filter(
        (p) => String(p.selection_key || "").trim() !== normalizedKey,
      ),
    );
    const sourceMatchesCurrentView =
      String(part.source || "").trim().toLowerCase() ===
        String(modalStockSource || "").trim().toLowerCase() &&
      String(part.source_owner || "").trim().toLowerCase() ===
        String(modalStockOwner || "").trim().toLowerCase();

    if (sourceMatchesCurrentView) {
      setAllStockItems((prev) => {
        const restoredItem = {
          id: part.serial_number || part.stock_id || part.row_id || "",
          stock_id: part.stock_id,
          row_id: part.row_id || "",
          description: part.description || "",
          code: part.code || "",
          supplier: part.supplier || "",
          quantity: part.quantity || 1,
          serial_number: part.serial_number || "",
          category_code: part.code || "",
          category_description: part.description || part.code || "",
          status: "IN STOCK",
        };
        const restoredKey = buildSelectionKey(
          modalStockSource,
          modalStockOwner,
          restoredItem,
        );
        const exists = prev.some(
          (stockItem) =>
            buildSelectionKey(modalStockSource, modalStockOwner, stockItem) ===
            restoredKey,
        );
        if (exists) return prev;
        return [...prev, restoredItem];
      });
    }
  };

  const handleReturnPart = async () => {
    const part = selectedParts.find(
      (p) => String(p.selection_key || "").trim() === String(returnPartKey || "").trim(),
    );
    if (!part || !returnBucket) return;

    setReturning(true);
    try {
      let ownerPayload = {};
      if (returnBucket === "client") {
        const selected = localClientOptions.find(
          (c) => String(c.cost_code || "").trim() === String(returnOwner || "").trim(),
        );
        ownerPayload = {
          client_code: selected?.client_code || "",
          cost_code: selected?.cost_code || returnOwner,
        };
      } else if (returnBucket === "technician") {
        ownerPayload = { technician_email: returnOwner };
      }

      const response = await fetch(`/api/job-cards/${jobCard.id}/return-part`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part: {
            serial_number: part.serial_number,
            stock_id: part.stock_id,
            code: part.code,
            description: part.description,
            supplier: part.supplier,
            quantity: part.quantity,
          },
          target_bucket: returnBucket,
          owner: ownerPayload,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to return part");
      }

      // Remove from selectedParts
      setSelectedParts((prev) =>
        prev.filter(
          (p) => String(p.selection_key || "").trim() !== String(returnPartKey || "").trim(),
        ),
      );

      // Restore to available list if source matches current view
      const source = String(part.source || "").trim().toLowerCase();
      if (source === String(modalStockSource || "").trim().toLowerCase()) {
        setAllStockItems((prev) => {
          const restoredItem = {
            id: part.serial_number || part.stock_id || "",
            stock_id: part.stock_id,
            row_id: part.row_id || "",
            description: part.description || "",
            code: part.code || "",
            supplier: part.supplier || "",
            quantity: part.quantity || 1,
            serial_number: part.serial_number || "",
            category_code: part.code || "",
            category_description: part.description || part.code || "",
            status: "IN STOCK",
          };
          const exists = prev.some(
            (item) => (item.serial_number || item.stock_id) === (restoredItem.serial_number || restoredItem.stock_id),
          );
          if (exists) return prev;
          return [...prev, restoredItem];
        });
      }

      toast.success(`Part returned to ${returnBucket} stock`);
      setReturnPartKey(null);
      setReturnBucket("");
      setReturnOwner("");
    } catch (error) {
      toast.error(error.message || "Failed to return part");
    } finally {
      setReturning(false);
    }
  };

  const updatePartQuantity = (stockId, newQuantity) => {
    const quantity = Math.max(1, parseInt(newQuantity) || 1);
    setSelectedParts((prev) =>
      prev.map((part) =>
        part.stock_id === stockId
          ? {
              ...part,
              quantity,
              total_cost: (part.cost_per_unit * quantity).toFixed(2),
            }
          : part,
      ),
    );
  };

  const handleSubmit = async () => {
    if (
      (modalStockSource === "client" || modalStockSource === "technician") &&
      !modalStockOwner
    ) {
      toast.error("Select a client or technician first.");
      return;
    }
    if (selectedParts.length === 0) {
      toast.error("Please select at least one part");
      return;
    }
    const missingIdentityPart = selectedParts.find(
      (part) => !hasSerialOrUniqueItemIdentity(part),
    );
    if (missingIdentityPart) {
      toast.error(
        `No serial or unique item ID found for selected stock item (${missingIdentityPart?.code || missingIdentityPart?.description || "item"}).`,
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `/api/job-cards/${jobCard.id}/assign-parts`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inventory_items: selectedParts,
            ipAddress: ipAddress,
            source: modalStockSource,
            source_owner: modalStockOwner,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign parts");
      }

      const result = await response.json();

      // Remove assigned items from the available list
      const assignedIds = selectedParts.map((p) =>
        String(p.selection_key || "").trim(),
      );
      setAllStockItems((prev) =>
        prev.filter((item) => {
          const itemKey = buildSelectionKey(
            modalStockSource,
            modalStockOwner,
            item,
          );
          return !assignedIds.includes(itemKey);
        }),
      );

      if (result.qr_code) {
        setQrCodeUrl(result.qr_code);
        setShowQRCode(true);
      } else {
        toast.success("Parts assigned successfully!");
        if (onPartsAssigned) {
          onPartsAssigned();
        }
        onClose();
      }
    } catch (error) {
      toast.error(error.message || "Failed to assign parts");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[99vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Assign Parts to Job #{jobCard?.job_number}
          </DialogTitle>
          <DialogDescription>
            Select inventory items to assign to this job card
          </DialogDescription>
        </DialogHeader>

        {/* Clean Single Page Job Information */}
        {jobCard && (
          <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
            {/* Compact Header Bar */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">
                    #{jobCard.job_number}
                  </span>
                  <span className="text-blue-200">•</span>
                  <span>{jobCard.customer_name || "No Customer"}</span>
                  <span className="text-blue-200">•</span>
                  <span className="font-mono">
                    {jobCard.vehicle_registration ||
                      jobCard.quotation_products?.[0]?.vehicle_plate ||
                      "No Reg"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={`text-xs ${
                      jobCard.job_type === "deinstall"
                        ? "bg-red-500 text-white"
                        : jobCard.job_type === "install"
                          ? "bg-green-500 text-white"
                          : "bg-blue-200 text-blue-800"
                    }`}
                  >
                    {jobCard.job_type?.toUpperCase() || "N/A"}
                  </Badge>
                  <Badge className="bg-white/20 text-white text-xs font-bold">
                    R{" "}
                    {(jobCard.quotation_total_amount || 0).toLocaleString(
                      "en-ZA",
                      { minimumFractionDigits: 2 },
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Single Page Content Grid */}
            <div className="bg-gray-50 p-3">
              <div className="grid grid-cols-12 gap-3">
                {/* Left - Info Cards (Compact) */}
                <div className="col-span-3 space-y-2">
                  {/* Customer & Vehicle Combined */}
                  <div className="bg-white p-2 rounded border text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase">
                          Customer
                        </span>
                        <p className="font-semibold text-gray-900 truncate">
                          {jobCard.customer_name || "N/A"}
                        </p>
                        {jobCard.customer_phone && (
                          <p className="text-gray-500 text-[10px]">
                            {jobCard.customer_phone}
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase">
                          Vehicle
                        </span>
                        <p className="font-semibold text-gray-900">
                          {jobCard.vehicle_registration || "N/A"}
                        </p>
                        {jobCard.vehicle_make && (
                          <p className="text-gray-500 text-[10px]">
                            {jobCard.vehicle_make} {jobCard.vehicle_model}
                          </p>
                        )}
                      </div>
                    </div>
                    {jobCard.ip_address && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-gray-400 text-[10px] uppercase">
                          IP Address
                        </span>
                        <p className="font-mono font-semibold text-blue-600">
                          {jobCard.ip_address}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notes - If Any */}
                  {(jobCard.special_instructions ||
                    jobCard.quote_notes ||
                    jobCard.job_description) && (
                    <div className="bg-amber-50 p-2 rounded border border-amber-200 text-xs">
                      <div className="flex items-center gap-1 text-amber-700 mb-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="font-semibold text-[10px] uppercase">
                          Notes
                        </span>
                      </div>
                      <p className="text-gray-700 text-[11px] leading-tight">
                        {jobCard.special_instructions ||
                          jobCard.quote_notes ||
                          jobCard.job_description}
                      </p>
                    </div>
                  )}

                  {/* Already Assigned Parts */}
                  {jobCard.parts_required &&
                    jobCard.parts_required.length > 0 && (
                      <div className="bg-blue-50 p-2 rounded border border-blue-200 text-xs">
                        <div className="flex items-center gap-1 text-blue-700 mb-1">
                          <Package className="w-3 h-3" />
                          <span className="font-semibold text-[10px] uppercase">
                            Assigned ({jobCard.parts_required.length})
                          </span>
                        </div>
                        <div className="space-y-1 max-h-20 overflow-y-auto">
                          {jobCard.parts_required.map((part, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1 text-[10px]"
                            >
                              <span className="text-gray-600 truncate flex-1">
                                {part.description || part.name}
                              </span>
                              {resolveSerialNumber(part) && (
                                <span className="font-mono text-blue-600">
                                  {resolveSerialNumber(part)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {/* Right - Quotation Products Table */}
                <div className="col-span-9">
                  <div className="bg-white rounded border h-full flex flex-col">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-purple-50 border-b">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                        <span className="font-semibold text-purple-800 text-sm">
                          Quotation Products
                        </span>
                        <Badge className="bg-purple-600 text-white text-[10px] px-1.5">
                          {jobCard.quotation_products?.length || 0}
                        </Badge>
                      </div>
                    </div>

                    {/* Products Table */}
                    <div className="flex-1 overflow-y-auto max-h-40">
                      {jobCard.quotation_products &&
                      jobCard.quotation_products.length > 0 ? (
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-left text-gray-500 text-[10px] uppercase">
                              <th className="px-2 py-1.5 font-medium">
                                Product
                              </th>
                              <th className="px-2 py-1.5 font-medium">
                                Value
                              </th>
                              <th className="px-2 py-1.5 font-medium">Type</th>
                              <th className="px-2 py-1.5 font-medium">
                                Vehicle
                              </th>
                              <th className="px-2 py-1.5 font-medium">S/N</th>
                              <th className="px-2 py-1.5 font-medium">IP</th>
                              <th className="px-2 py-1.5 font-medium text-center">
                                Qty
                              </th>
                              <th className="px-2 py-1.5 font-medium text-right">
                                Price
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {jobCard.quotation_products.map(
                              (product, index) => {
                                const snMatch =
                                  product.description?.match(/S\/N:\s*(\w+)/i);
                                const ipMatch =
                                  product.description?.match(/IP:\s*([\d.]+)/i);
                                const descriptionValueMatch =
                                  product.description?.match(
                                    /Value:\s*([^-\n\r]+)/i,
                                  );
                                const detailValue =
                                  product.value ||
                                  product.detail_value ||
                                  product.detailValue ||
                                  descriptionValueMatch?.[1]?.trim() ||
                                  null;
                                const serialNumber = snMatch
                                  ? snMatch[1]
                                  : null;
                                const ipAddr = ipMatch ? ipMatch[1] : null;

                                return (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-2 py-1.5">
                                      <span className="font-medium text-gray-900">
                                        {product.name ||
                                          product.product_name ||
                                          "N/A"}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {detailValue && (
                                        <span className="font-mono text-amber-700 bg-amber-50 px-1 rounded">
                                          {detailValue}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <Badge className="bg-blue-100 text-blue-800 text-[9px] px-1">
                                        {product.type || "N/A"}
                                      </Badge>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {product.vehicle_plate && (
                                        <span className="font-mono font-semibold text-green-700">
                                          {product.vehicle_plate}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {serialNumber && (
                                        <span className="font-mono text-purple-700 bg-purple-50 px-1 rounded">
                                          {serialNumber}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {ipAddr && (
                                        <span className="font-mono text-blue-700 bg-blue-50 px-1 rounded">
                                          {ipAddr}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                      <span className="text-gray-600">
                                        {product.quantity || 1}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1.5 text-right">
                                      <span className="font-semibold text-green-700">
                                        R{" "}
                                        {(
                                          product.cash_price ||
                                          product.total_price ||
                                          0
                                        ).toLocaleString("en-ZA", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t">
                            <tr>
                              <td
                                colSpan="7"
                                className="px-2 py-1.5 text-right font-semibold text-gray-700"
                              >
                                Total:
                              </td>
                              <td className="px-2 py-1.5 text-right font-bold text-green-700">
                                R{" "}
                                {(
                                  jobCard.quotation_total_amount || 0
                                ).toLocaleString("en-ZA", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-gray-400">
                          <Package className="w-6 h-6 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">No quotation products</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!showQRCode ? (
          <div className="h-[75vh] flex flex-col">
            {/* Controls */}
            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Stock Source
                  </label>
                  <select
                    value={modalStockSource}
                    onChange={(e) => {
                      const next = e.target.value;
                      setModalStockSource(next);
                      setModalStockOwner("");
                      setSelectedStockType("all");
                    }}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="soltrack">Soltrack Stock</option>
                    <option value="client">Client Stock</option>
                    <option value="technician">Technician Stock</option>
                  </select>
                </div>
                {modalStockSource === "client" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Client
                    </label>
                    <select
                      value={modalStockOwner}
                      onChange={(e) => {
                        setModalStockOwner(e.target.value);
                        setSelectedStockType("all");
                      }}
                      className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select client</option>
                      {localClientOptions.map((client) => (
                        <option key={client.cost_code} value={client.cost_code}>
                          {client.company || "Client"} ({client.cost_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {modalStockSource === "technician" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Technician
                    </label>
                    <select
                      value={modalStockOwner}
                      onChange={(e) => {
                        setModalStockOwner(e.target.value);
                        setSelectedStockType("all");
                      }}
                      className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select technician</option>
                      {dedupedTechnicianOptions.map((tech) => (
                        <option
                          key={tech.technician_email || tech.id}
                          value={tech.technician_email || ""}
                        >
                          {tech.display_name && tech.technician_email
                            ? `${tech.display_name} (${tech.technician_email})`
                            : tech.display_name || tech.technician_email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Search Category
                </label>
                <Input
                  type="text"
                  list="assign-parts-category-suggestions"
                  placeholder="Type category code or description..."
                  value={categorySearchTerm}
                  onChange={(e) => setCategorySearchTerm(e.target.value)}
                  className="h-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <datalist id="assign-parts-category-suggestions">
                  {categorySuggestions.map((type) => (
                    <option
                      key={type.code}
                      value={`${type.code} - ${type.description}`}
                    />
                  ))}
                </datalist>
                {categorySuggestions[0] && categorySearchTerm.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCategorySearchTerm(
                        `${categorySuggestions[0].code} - ${categorySuggestions[0].description}`,
                      );
                      setSelectedStockType(categorySuggestions[0].code);
                    }}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Closest match: {categorySuggestions[0].code} -{" "}
                    {categorySuggestions[0].description}
                  </button>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Filter by Type
                </label>
                <select
                  value={selectedStockType}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setSelectedStockType(
                      nextValue === "all"
                        ? "all"
                        : normalizeCategoryCode(nextValue),
                    );
                  }}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  {stockTypes.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.code} - {type.description} ({type.count || 0})
                    </option>
                  ))}
                </select>
              </div>
              {jobCard?.job_type !== "deinstall" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    IP Address / Serial Number
                  </label>
                  <Input
                    type="text"
                    list="assign-parts-stock-suggestions"
                    placeholder="Enter IP address or serial number..."
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="h-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Search (IP Address / Serial Number)
                </label>
                <Input
                  type="text"
                  list="assign-parts-stock-suggestions"
                  placeholder="Search by IP address, serial number, description, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <datalist id="assign-parts-stock-suggestions">
                  {stockSearchSuggestions.map(
                    ({ item, suggestionValue }, index) => (
                      <option
                        key={`${item.id || suggestionValue}-${index}`}
                        value={suggestionValue}
                      />
                    ),
                  )}
                </datalist>
                {stockSearchSuggestions[0] && searchTerm.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm(stockSearchSuggestions[0].suggestionValue);
                    }}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Closest stock match:{" "}
                    {stockSearchSuggestions[0].suggestionValue}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Two Panel Layout */}
            <div className="flex-1 flex gap-3">
              {/* Available Parts */}
              <div className="w-3/5 bg-gray-50 rounded-lg p-3">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Available Parts
                </h3>
                <div className="h-full overflow-y-auto">
                  <div className="bg-white rounded border">
                    {filteredAvailableParts.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500">
                        No matching parts found for this filter/search.
                      </div>
                    ) : (
                      visibleAvailableParts.map((item, index) => (
                        <div
                          key={`${item.id}-${index}`}
                          className="p-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center"
                          onClick={() => addPart(item)}
                        >
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {item.category?.description ||
                                item.category_description ||
                                item.description ||
                                "No description"}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {resolveSerialNumber(item) ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  S/N: {resolveSerialNumber(item)}
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  Auto-assign S/N
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                {item.category_code || item.code || "N/A"}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-xs px-2 py-1 ${
                              item.status === "ASSIGNED" ||
                              item.status === "OUT OF STOCK"
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {item.status || "IN STOCK"}
                          </Badge>
                        </div>
                      ))
                    )}
                    {filteredAvailableParts.length >
                      visibleAvailableParts.length && (
                      <div className="p-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVisibleCount((prev) => prev + 120)}
                        >
                          Load more (
                          {filteredAvailableParts.length -
                            visibleAvailableParts.length}{" "}
                          remaining)
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Parts */}
              <div className="w-2/5 flex flex-col">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">
                      Selected Parts
                    </h3>
                    <Badge variant="default" className="text-sm">
                      {selectedParts.length}
                    </Badge>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    {selectedParts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Package className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">Click parts to add them</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded border">
                        {selectedParts.map((part, index) => (
                          <div
                            key={`${String(part.selection_key || part.stock_id || index)}`}
                            className="p-3 border-b last:border-b-0 flex justify-between items-center"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">
                                {part.description}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {resolveSerialNumber(part) ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    S/N: {resolveSerialNumber(part)}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                    No Serial
                                  </Badge>
                                )}
                                {part.code && (
                                  <span className="text-xs text-gray-500">
                                    {part.code}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {part.quantity}
                              </span>
                              <Popover
                                open={returnPartKey === part.selection_key}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setReturnPartKey(null);
                                    setReturnBucket("");
                                    setReturnOwner("");
                                  } else {
                                    setReturnPartKey(part.selection_key);
                                    setReturnBucket("");
                                    setReturnOwner("");
                                  }
                                }}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 p-0 h-6 w-6"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-3" align="end">
                                  {!returnBucket ? (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-gray-700">Return to:</p>
                                      <div className="flex flex-col gap-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="justify-start text-xs h-7"
                                          onClick={() => setReturnBucket("soltrack")}
                                        >
                                          <Package className="w-3 h-3 mr-1" />
                                          Soltrack Stock
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="justify-start text-xs h-7"
                                          onClick={() => setReturnBucket("client")}
                                        >
                                          <User className="w-3 h-3 mr-1" />
                                          Client Stock
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="justify-start text-xs h-7"
                                          onClick={() => setReturnBucket("technician")}
                                        >
                                          <Wrench className="w-3 h-3 mr-1" />
                                          Technician Stock
                                        </Button>
                                      </div>
                                    </div>
                                  ) : returnBucket === "soltrack" ? (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-gray-700">
                                        Return to Soltrack stock?
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        S/N: {part.serial_number}
                                      </p>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs flex-1"
                                          disabled={returning}
                                          onClick={handleReturnPart}
                                        >
                                          {returning ? "Returning..." : "Confirm"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() => { setReturnBucket(""); setReturnOwner(""); }}
                                        >
                                          Back
                                        </Button>
                                      </div>
                                    </div>
                                  ) : returnBucket === "client" && !returnOwner ? (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-gray-700">Select client:</p>
                                      <select
                                        className="w-full border rounded px-2 py-1 text-xs"
                                        value=""
                                        onChange={(e) => setReturnOwner(e.target.value)}
                                      >
                                        <option value="">Choose client...</option>
                                        {localClientOptions.map((c) => (
                                          <option key={c.cost_code} value={c.cost_code}>
                                            {c.client_name || c.cost_code}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() => { setReturnBucket(""); setReturnOwner(""); }}
                                        >
                                          Back
                                        </Button>
                                      </div>
                                    </div>
                                  ) : returnBucket === "client" && returnOwner ? (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-gray-700">
                                        Return to client stock?
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {returnOwner} — S/N: {part.serial_number}
                                      </p>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs flex-1"
                                          disabled={returning}
                                          onClick={handleReturnPart}
                                        >
                                          {returning ? "Returning..." : "Confirm"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() => { setReturnBucket(""); setReturnOwner(""); }}
                                        >
                                          Back
                                        </Button>
                                      </div>
                                    </div>
                                  ) : returnBucket === "technician" && !returnOwner ? (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-gray-700">Select technician:</p>
                                      <select
                                        className="w-full border rounded px-2 py-1 text-xs"
                                        value=""
                                        onChange={(e) => setReturnOwner(e.target.value)}
                                      >
                                        <option value="">Choose technician...</option>
                                        {dedupedTechnicianOptions.map((t) => (
                                          <option key={t.technician_email} value={t.technician_email}>
                                            {t.technician_name || t.technician_email}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() => { setReturnBucket(""); setReturnOwner(""); }}
                                        >
                                          Back
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-gray-700">
                                        Return to technician stock?
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {returnOwner} — S/N: {part.serial_number}
                                      </p>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs flex-1"
                                          disabled={returning}
                                          onClick={handleReturnPart}
                                        >
                                          {returning ? "Returning..." : "Confirm"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() => { setReturnBucket(""); setReturnOwner(""); }}
                                        >
                                          Back
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-4">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onNoPartsRequired?.()}
                    disabled={submitting || processingNoPartsRequired}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    {processingNoPartsRequired
                      ? "Moving to Admin..."
                      : "No Parts Required"}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || selectedParts.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting
                      ? "Assigning..."
                      : `Assign ${selectedParts.length} Parts`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 w-12 h-12 text-green-600" />
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">
                Parts Assigned Successfully!
              </h3>
              <p className="text-gray-600">
                QR code has been generated and stored for this job.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">
                Job Information
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Job Number:</span>
                  <p className="font-medium">{jobCard?.job_number}</p>
                </div>
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <p className="font-medium">{jobCard?.customer_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Vehicle:</span>
                  <p className="font-medium">
                    {jobCard?.vehicle_registration || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Job Type:</span>
                  <p className="font-medium">
                    {jobCard?.job_type?.toUpperCase() || "N/A"}
                  </p>
                </div>
                {ipAddress && (
                  <div className="col-span-2">
                    <span className="text-gray-500">IP Address:</span>
                    <p className="font-medium">{ipAddress}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">
                Assigned Parts ({selectedParts.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedParts.map((part, index) => (
                  <div
                    key={index}
                    className="bg-white p-2 rounded border flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {part.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        {resolveSerialNumber(part)}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Qty: {part.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <img
                src={qrCodeUrl}
                alt="Job QR Code"
                className="mx-auto border rounded-lg"
                style={{ maxWidth: "200px" }}
              />
              <Button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 w-full mt-4"
              >
                <Printer className="mr-2 w-4 h-4" />
                Print QR Code
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
