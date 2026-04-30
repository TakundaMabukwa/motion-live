"use client";

import {
  useState,
  useEffect,
  useMemo,
  memo,
  useRef,
  useDeferredValue,
} from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import InvoiceReportComponent from "@/components/inv/components/invoice-report";
import {
  Loader2,
  ArrowLeft,
  Save,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit,
  Plus,
  Trash2,
  Check,
  Search,
  Lock,
  FileText,
  X,
} from "lucide-react";
import DashboardHeader from "@/components/shared/DashboardHeader";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const getCurrentBillingMonth = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return `${localDate.toISOString().slice(0, 7)}-01`;
};

const FC_BILLING_MONTH = getCurrentBillingMonth();

const normalizeBillingMonthValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw.slice(0, 7)}-01`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

const toMonthInputValue = (value) => {
  const normalized = normalizeBillingMonthValue(value);
  return normalized ? normalized.slice(0, 7) : "";
};

const formatInvoiceDate = (value) => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-GB");
};

const formatBillingMonthLabel = (value) => {
  const normalized = normalizeBillingMonthValue(value);
  if (!normalized) return "N/A";
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
};

const parseBillingMonthsInput = (value) => {
  const tokens = String(value || "")
    .split(/[,;\n]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const uniqueMonths = [];
  const seen = new Set();
  for (const token of tokens) {
    const normalized = normalizeBillingMonthValue(token);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    uniqueMonths.push(normalized);
  }
  return uniqueMonths;
};

const buildPreviousBillingMonths = (anchorMonth, monthsCount) => {
  const normalizedAnchor = normalizeBillingMonthValue(anchorMonth);
  const count = Math.max(1, Number.parseInt(String(monthsCount || 1), 10) || 1);
  if (!normalizedAnchor) return [];
  const anchorDate = new Date(`${normalizedAnchor}T00:00:00.000Z`);
  if (Number.isNaN(anchorDate.getTime())) return [normalizedAnchor];

  const output = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const current = new Date(
      Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() - offset, 1),
    );
    output.push(
      `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}-01`,
    );
  }
  return output;
};

const AddItemSearch = memo(function AddItemSearch({
  vehicleFieldsToAdd,
  billingFieldsToAdd,
  onAddField,
}) {
  const [fieldSearch, setFieldSearch] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const valueInputRef = useRef(null);
  const normalizedSearch = fieldSearch
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  const queryTokens = normalizedSearch ? normalizedSearch.split(" ") : [];
  const matchesSearch = (field) => {
    if (queryTokens.length === 0) return true;
    const fieldText = field.toLowerCase().replace(/_/g, " ");
    return queryTokens.every((token) => fieldText.includes(token));
  };
  const filteredVehicleFields = useMemo(
    () => vehicleFieldsToAdd.filter(matchesSearch),
    [vehicleFieldsToAdd, normalizedSearch],
  );
  const filteredBillingFields = useMemo(
    () => billingFieldsToAdd.filter(matchesSearch),
    [billingFieldsToAdd, normalizedSearch],
  );
  const firstMatch = filteredBillingFields[0] || filteredVehicleFields[0] || "";
  const resolvedField =
    (selectedField &&
    (filteredBillingFields.includes(selectedField) ||
      filteredVehicleFields.includes(selectedField))
      ? selectedField
      : "") || firstMatch;

  const handleSelectField = (field) => {
    setSelectedField(field);
    setFieldSearch(field.replace(/_/g, " "));
    setIsDropdownOpen(false);
    requestAnimationFrame(() => valueInputRef.current?.focus());
  };

  const handleAdd = () => {
    if (!resolvedField) return;
    onAddField(resolvedField, fieldValue);
    setSelectedField("");
    setFieldValue("");
    setFieldSearch("");
    setIsDropdownOpen(false);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsDropdownOpen(false);
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    setIsDropdownOpen(true);
    if (!resolvedField && firstMatch) {
      handleSelectField(firstMatch);
      return;
    }
    if (resolvedField) {
      if (!selectedField && resolvedField) {
        setSelectedField(resolvedField);
      }
      requestAnimationFrame(() => valueInputRef.current?.focus());
    }
  };

  const handleValueKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    handleAdd();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex gap-2 items-start">
      <div className="min-w-[320px] relative" ref={dropdownRef}>
        <Input
          ref={searchInputRef}
          value={fieldSearch}
          onChange={(e) => {
            setFieldSearch(e.target.value);
            setSelectedField("");
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search fields..."
          className="h-9 text-sm"
        />
        {isDropdownOpen && (
          <div className="absolute z-20 mt-1 w-full border rounded-md bg-white p-2 shadow-md">
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredVehicleFields.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 px-1 mb-1">
                    Vehicle Fields
                  </p>
                  {filteredVehicleFields.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleSelectField(f)}
                      className={`w-full text-left text-xs px-2 py-1 rounded ${selectedField === f ? "bg-slate-200" : "hover:bg-slate-100"}`}
                    >
                      {f.replace(/_/g, " ").toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              {filteredBillingFields.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 px-1 mb-1">
                    Billing Fields
                  </p>
                  {filteredBillingFields.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleSelectField(f)}
                      className={`w-full text-left text-xs px-2 py-1 rounded ${selectedField === f ? "bg-slate-200" : "hover:bg-slate-100"}`}
                    >
                      {f.replace(/_/g, " ").toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              {filteredVehicleFields.length === 0 &&
                filteredBillingFields.length === 0 && (
                  <p className="text-xs text-gray-500 px-1 py-2">
                    No matching fields
                  </p>
                )}
            </div>
          </div>
        )}
      </div>
      <Input
        value={fieldValue}
        onChange={(e) => setFieldValue(e.target.value)}
        onKeyDown={handleValueKeyDown}
        placeholder="Enter value..."
        className="h-9 text-sm w-[180px]"
        disabled={!resolvedField}
        ref={valueInputRef}
      />
      <Button size="sm" onClick={handleAdd} disabled={!resolvedField}>
        <Plus className="h-3 w-3 mr-1" />
        Add Item
      </Button>
    </div>
  );
});

export default function ValidateVehiclesPage() {
  const router = useRouter();
  const params = useParams();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVehicles, setExpandedVehicles] = useState({});
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const initialTotalValues = {
    total_rental: "0.00",
    total_sub: "0.00",
    total_rental_sub: "0.00",
  };
  const [newVehicleData, setNewVehicleData] = useState(initialTotalValues);
  const [validationMode, setValidationMode] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [lockingCostCenterTotal, setLockingCostCenterTotal] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [isLoadingInvoicePreview, setIsLoadingInvoicePreview] = useState(false);
  const [invoicePreviewCostCenter, setInvoicePreviewCostCenter] = useState(null);
  const [loggedInUserEmail, setLoggedInUserEmail] = useState("");
  const invoicePreviewCacheRef = useRef(new Map());
  const [addItemState, setAddItemState] = useState({});
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [costCenterOptions, setCostCenterOptions] = useState([]);
  const [targetCostCenterByVehicle, setTargetCostCenterByVehicle] = useState(
    {},
  );
  const [costCenterSearch, setCostCenterSearch] = useState("");
  const [costCenterDropdownOpen, setCostCenterDropdownOpen] = useState(false);
  const [invoiceViewTab, setInvoiceViewTab] = useState("annuity");
  const [invoiceMonthFilter, setInvoiceMonthFilter] = useState(
    toMonthInputValue(FC_BILLING_MONTH),
  );
  const [billingCycleMultiplier, setBillingCycleMultiplier] = useState("1");
  const [billingMonthsCoveredInput, setBillingMonthsCoveredInput] = useState("");
  const [invoiceHistoryRows, setInvoiceHistoryRows] = useState([]);
  const [loadingInvoiceHistory, setLoadingInvoiceHistory] = useState(false);
  const [showJobCardInvoicePreview, setShowJobCardInvoicePreview] = useState(false);
  const [jobCardInvoicePreview, setJobCardInvoicePreview] = useState(null);
  const deferredVehicleSearch = useDeferredValue(vehicleSearch);
  const deferredCostCenterSearch = useDeferredValue(costCenterSearch);
  const costCode = params?.costCode ? decodeURIComponent(params.costCode) : "";
  const lastVehiclesFetchKeyRef = useRef(null);
  const lastInitialCostCenterFetchRef = useRef(null);
  const hasLoadedPrefixCostCentersRef = useRef(false);

  const excludeKeys = [
    "id",
    "created_at",
    "unique_id",
    "new_account_number",
    "vehicle_validated",
    "amount_locked",
    "amount_locked_by",
    "amount_locked_at",
  ];
  const defaultVehicleInfoFields = ["reg", "fleet_number", "vin", "colour"];
  const billingFields = [
    "consultancy",
    "roaming",
    "maintenance",
    "after_hours",
    "controlroom",
    "yotg_software_development",
    "eps_routing",
    "eps_dashboard",
    "eps_software_development",
    "maysene_software_development",
    "waterford_software_development",
    "klaver_software_development",
    "advatrans_software_development",
    "tt_linehaul_software_development",
    "tt_express_software_development",
    "tt_fmcg_software_development",
    "rapid_freight_software_development",
    "remco_freight_software_development",
    "vt_logistics_software_development",
    "epilite_software_development",
    "driver_app",
    "additional_data",
  ];
  const specialBillingFields = billingFields;
  const allPossibleBillingFields = [
    "bidtrack_rental",
    "bidtrack_sub",
    "skyspy_rental",
    "skyspy_sub",
    "skylink_trailer_unit_rental",
    "skylink_trailer_sub",
    "sky_on_batt_ign_rental",
    "sky_on_batt_sub",
    "skylink_voice_kit_rental",
    "skylink_voice_kit_sub",
    "sky_scout_12v_rental",
    "sky_scout_12v_sub",
    "sky_scout_24v_rental",
    "sky_scout_24v_sub",
    "skylink_pro_rental",
    "skylink_pro_sub",
    "fm_unit_rental",
    "fm_unit_sub",
    "beame_1_rental",
    "beame_1_sub",
    "beame_2_rental",
    "beame_2_sub",
    "beame_3_rental",
    "beame_3_sub",
    "beame_4_rental",
    "beame_4_sub",
    "beame_5_rental",
    "beame_5_sub",
    "single_probe_rental",
    "single_probe_sub",
    "dual_probe_rental",
    "dual_probe_sub",
    "_4ch_mdvr_rental",
    "_4ch_mdvr_sub",
    "_5ch_mdvr_rental",
    "_5ch_mdvr_sub",
    "_8ch_mdvr_rental",
    "_8ch_mdvr_sub",
    "a2_dash_cam_rental",
    "a2_dash_cam_sub",
    "pfk_main_unit_rental",
    "pfk_main_unit_sub",
    ...specialBillingFields,
  ];
  const allVehicleFieldKeys = useMemo(() => {
    const keysFromVehicles = vehicles.flatMap((v) => Object.keys(v || {}));
    return Array.from(
      new Set([...keysFromVehicles, ...allPossibleBillingFields]),
    ).filter((k) => !excludeKeys.includes(k));
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const query = deferredVehicleSearch
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (!query) return vehicles;

    return vehicles.filter((vehicle) => {
      const reg = String(vehicle?.reg || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const fleet = String(vehicle?.fleet_number || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      return reg.includes(query) || fleet.includes(query);
    });
  }, [vehicles, deferredVehicleSearch]);

  const filteredVehiclesGrandTotal = useMemo(
    () =>
      filteredVehicles.reduce((sum, vehicle) => {
        const amount = Number.parseFloat(String(vehicle?.total_rental_sub ?? '').trim());
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [filteredVehicles],
  );
  const billingCycleMultiplierValue = useMemo(() => {
    const parsed = Number.parseInt(String(billingCycleMultiplier || "").trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 1;
    return Math.min(12, parsed);
  }, [billingCycleMultiplier]);
  const lockAmountForSelectedMonth = useMemo(
    () => Number((filteredVehiclesGrandTotal * billingCycleMultiplierValue).toFixed(2)),
    [filteredVehiclesGrandTotal, billingCycleMultiplierValue],
  );


  const matchingCostCenters = useMemo(() => {
    const deduped = new Map();
    for (const option of costCenterOptions) {
      const code = option?.cost_code;
      if (!code) continue;
      if (!deduped.has(code)) {
        deduped.set(code, {
          cost_code: code,
          company: option?.company || "",
          validated: option?.validated || false,
          total_amount_locked: option?.total_amount_locked || false,
          total_amount_locked_value: option?.total_amount_locked_value ?? null,
          total_amount_locked_by: option?.total_amount_locked_by || null,
          total_amount_locked_by_email: option?.total_amount_locked_by_email || null,
          total_amount_locked_at: option?.total_amount_locked_at || null,
          total_amount_locked_multiplier:
            Number.parseInt(String(option?.total_amount_locked_multiplier || "1"), 10) || 1,
          total_amount_locked_billing_months: Array.isArray(option?.total_amount_locked_billing_months)
            ? option.total_amount_locked_billing_months
            : [],
        });
      }
    }
    return Array.from(deduped.values()).sort((a, b) =>
      a.cost_code.localeCompare(b.cost_code),
    );
  }, [costCenterOptions]);

  const formatCostCenterOption = (item) => {
    if (!item) return "";
    return item.company
      ? `${item.cost_code} - ${item.company}`
      : item.cost_code;
  };

  const filteredCostCenters = useMemo(() => {
    const query = deferredCostCenterSearch.trim().toLowerCase();
    if (!query) return matchingCostCenters.slice(0, 60);

    const scored = matchingCostCenters
      .map((item) => {
        const code = String(item.cost_code || "").toLowerCase();
        const company = String(item.company || "").toLowerCase();
        const label = `${code} ${company}`.trim();

        let score = 0;
        if (code.startsWith(query)) score += 4;
        if (company.startsWith(query)) score += 3;
        if (code.includes(query)) score += 2;
        if (company.includes(query)) score += 1;
        if (!label.includes(query)) score = 0;

        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.item.cost_code.localeCompare(b.item.cost_code);
      });

    return scored.slice(0, 60).map((entry) => entry.item);
  }, [matchingCostCenters, deferredCostCenterSearch]);

  const currentCostCenter = useMemo(() => {
    if (!costCode) return null;
    return (
      matchingCostCenters.find((item) => item.cost_code === costCode) || null
    );
  }, [matchingCostCenters, costCode]);

  const currentCostCenterName = currentCostCenter?.company || costCode || "";
  const invoicePreviewTitle = currentCostCenterName || costCode || "";
  const selectedBillingMonth = useMemo(() => {
    const normalized = normalizeBillingMonthValue(
      invoiceMonthFilter ? `${invoiceMonthFilter}-01` : FC_BILLING_MONTH,
    );
    return normalized || FC_BILLING_MONTH;
  }, [invoiceMonthFilter]);
  const defaultCoveredBillingMonths = useMemo(
    () =>
      buildPreviousBillingMonths(
        selectedBillingMonth || FC_BILLING_MONTH,
        billingCycleMultiplierValue,
      ),
    [selectedBillingMonth, billingCycleMultiplierValue],
  );
  const selectedCoveredBillingMonths = useMemo(() => {
    const parsedMonths = parseBillingMonthsInput(billingMonthsCoveredInput);
    if (parsedMonths.length > 0) return parsedMonths;
    return defaultCoveredBillingMonths;
  }, [billingMonthsCoveredInput, defaultCoveredBillingMonths]);
  const selectedCoveredBillingMonthsLabel = useMemo(
    () =>
      selectedCoveredBillingMonths
        .map((month) => formatBillingMonthLabel(month))
        .join(", "),
    [selectedCoveredBillingMonths],
  );
  const canLockForSelectedMonths = useMemo(() => {
    const normalizedMonths = selectedCoveredBillingMonths
      .map((month) => normalizeBillingMonthValue(month))
      .filter(Boolean);
    return (
      normalizedMonths.length === billingCycleMultiplierValue &&
      normalizedMonths.includes(selectedBillingMonth)
    );
  }, [
    selectedCoveredBillingMonths,
    billingCycleMultiplierValue,
    selectedBillingMonth,
  ]);
  const costCenterLockedMonth = normalizeBillingMonthValue(
    currentCostCenter?.total_amount_locked_at,
  );
  const isCostCenterLockedForSelectedMonth =
    Boolean(currentCostCenter?.total_amount_locked) &&
    Boolean(costCenterLockedMonth) &&
    costCenterLockedMonth === selectedBillingMonth;

  const selectedMonthInvoices = useMemo(() => {
    const matchesBillingMonth = (invoice) => {
      const invoiceMonth = normalizeBillingMonthValue(
        invoice?.billing_month || invoice?.invoice_date || invoice?.created_at,
      );
      return invoiceMonth === selectedBillingMonth;
    };

    return (Array.isArray(invoiceHistoryRows) ? invoiceHistoryRows : [])
      .filter(matchesBillingMonth)
      .sort((left, right) => {
        const leftTime = new Date(
          String(left?.invoice_date || left?.created_at || left?.billing_month || 0),
        ).getTime();
        const rightTime = new Date(
          String(right?.invoice_date || right?.created_at || right?.billing_month || 0),
        ).getTime();
        return rightTime - leftTime;
      });
  }, [invoiceHistoryRows, selectedBillingMonth]);

  const jobCardInvoices = useMemo(
    () =>
      selectedMonthInvoices.filter(
        (invoice) => String(invoice?.source_type || "").trim() === "job_card_invoice",
      ),
    [selectedMonthInvoices],
  );

  useEffect(() => {
    const loadLoggedInUserEmail = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setLoggedInUserEmail(String(user?.email || "").trim().toLowerCase());
      } catch (error) {
        console.error("Error loading logged-in user email:", error);
      }
    };

    loadLoggedInUserEmail();
  }, []);

  useEffect(() => {
    setInvoiceMonthFilter(
      toMonthInputValue(currentCostCenter?.billing_month || FC_BILLING_MONTH),
    );
  }, [costCode, currentCostCenter?.billing_month]);

  useEffect(() => {
    const defaultInput = defaultCoveredBillingMonths
      .map((month) => toMonthInputValue(month))
      .filter(Boolean)
      .join(", ");
    setBillingMonthsCoveredInput(defaultInput);
  }, [selectedBillingMonth, billingCycleMultiplierValue, defaultCoveredBillingMonths]);

  useEffect(() => {
    let active = true;

    const fetchInvoiceHistory = async () => {
      if (!costCode) {
        if (active) {
          setInvoiceHistoryRows([]);
          setLoadingInvoiceHistory(false);
        }
        return;
      }

      try {
        if (active) setLoadingInvoiceHistory(true);
        const query = new URLSearchParams({
          accountNumber: costCode,
          billingMonth: selectedBillingMonth,
        });
        const response = await fetch(`/api/invoices/account/history?${query.toString()}`, {
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result?.error || "Failed to fetch invoice history");
        }

        if (active) {
          setInvoiceHistoryRows(Array.isArray(result?.invoices) ? result.invoices : []);
        }
      } catch (error) {
        console.error("Error fetching FC invoice history:", error);
        if (active) {
          setInvoiceHistoryRows([]);
          toast.error(error?.message || "Failed to load invoices");
        }
      } finally {
        if (active) setLoadingInvoiceHistory(false);
      }
    };

    fetchInvoiceHistory();
    return () => {
      active = false;
    };
  }, [costCode, selectedBillingMonth]);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        if (!costCode) {
          console.error("No cost code provided");
          toast.error("No cost center provided");
          return;
        }

        const billingMonth = selectedBillingMonth || FC_BILLING_MONTH;
        const requestKey = `${costCode}::${billingMonth}`;
        if (lastVehiclesFetchKeyRef.current === requestKey) {
          return;
        }
        lastVehiclesFetchKeyRef.current = requestKey;
        const response = await fetch(
          `/api/vehicles/get?cost_code=${encodeURIComponent(costCode)}&billingMonth=${encodeURIComponent(billingMonth)}`,
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch vehicles");
        }

        const data = await response.json();
        setVehicles(Array.isArray(data) ? data : []);
      } catch (error) {
        lastVehiclesFetchKeyRef.current = null;
        console.error("Error fetching vehicles:", error);
        toast.error("Failed to load vehicles: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [costCode, selectedBillingMonth]);

  useEffect(() => {
    const fetchCurrentCostCenter = async () => {
      try {
        if (!costCode) return;
        if (lastInitialCostCenterFetchRef.current === costCode) {
          return;
        }
        lastInitialCostCenterFetchRef.current = costCode;
        const requestUrl = `/api/cost-centers?accounts=${encodeURIComponent(costCode)}`;
        const response = await fetch(requestUrl);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error || "Failed to fetch cost centers");
        }
        const data = await response.json();
        const options = Array.isArray(data) ? data : [];
        setCostCenterOptions(options);
        hasLoadedPrefixCostCentersRef.current = false;
      } catch (error) {
        lastInitialCostCenterFetchRef.current = null;
        console.error("Error fetching cost centers:", error);
        toast.error(`Failed to load cost centers: ${error.message}`);
      }
    };

    fetchCurrentCostCenter();
  }, [costCode]);

  const loadPrefixCostCenters = async () => {
    const prefix = String(costCode || "")
      .trim()
      .split("-")[0]
      .trim();

    if (!prefix || hasLoadedPrefixCostCentersRef.current) {
      return;
    }

    const response = await fetch(
      `/api/cost-centers?prefix=${encodeURIComponent(prefix)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || "Failed to fetch cost centers");
    }

    const data = await response.json();
    const options = Array.isArray(data) ? data : [];
    setCostCenterOptions(options);
    hasLoadedPrefixCostCentersRef.current = true;
  };

  const toggleVehicle = (vehicleId) => {
    setExpandedVehicles((prev) => ({
      ...prev,
      [vehicleId]: !prev[vehicleId],
    }));
  };

  const calculateTotals = (data) => {
    const allKeys = Object.keys(data);

    // All rental fields ending with _rental (excluding total_rental)
    const rentalKeys = allKeys.filter(
      (k) => k.endsWith("_rental") && k !== "total_rental",
    );

    // All sub fields: those ending with _sub (excluding totals) + special billing fields
    const subKeys = allKeys.filter(
      (k) =>
        (k.endsWith("_sub") &&
          !["total_sub", "total_rental_sub"].includes(k)) ||
        specialBillingFields.includes(k),
    );

    const totalRental = rentalKeys.reduce((sum, k) => {
      const val = data[k];
      if (val === null || val === undefined || val === "") return sum;
      const numVal = parseFloat(val);
      return Number.isFinite(numVal) ? sum + numVal : sum;
    }, 0);

    const totalSub = subKeys.reduce((sum, k) => {
      const val = data[k];
      if (val === null || val === undefined || val === "") return sum;
      const numVal = parseFloat(val);
      return Number.isFinite(numVal) ? sum + numVal : sum;
    }, 0);

    return {
      total_rental: totalRental.toFixed(2),
      total_sub: totalSub.toFixed(2),
      total_rental_sub: (totalRental + totalSub).toFixed(2),
    };
  };

  const parseAmount = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatCurrency = (value) => `R ${parseAmount(value).toFixed(2)}`;

  const formatFieldLabel = (field) => field.replace(/_/g, " ").toUpperCase();

  const getBillingEntries = (data) => {
    if (!data) return [];

    return Object.entries(data)
      .filter(([key, value]) => {
        if (
          key === "total_rental" ||
          key === "total_sub" ||
          key === "total_rental_sub"
        ) {
          return false;
        }

        const isBillingField =
          (key.endsWith("_rental") && key !== "total_rental") ||
          (key.endsWith("_sub") &&
            !["total_sub", "total_rental_sub"].includes(key)) ||
          specialBillingFields.includes(key);

        if (!isBillingField) return false;

        return parseAmount(value) > 0;
      })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        key,
        label: formatFieldLabel(key),
        value: parseAmount(value),
      }));
  };

  const getBillingSummary = (data) => {
    const entries = getBillingEntries(data);
    const total = parseAmount(data?.total_rental_sub);

    return {
      entries,
      total,
      hasManualTotalOnly: entries.length === 0 && total > 0,
    };
  };

  const affectsTotals = (field) =>
    (field.endsWith("_rental") && field !== "total_rental") ||
    (field.endsWith("_sub") &&
      !["total_sub", "total_rental_sub"].includes(field)) ||
    specialBillingFields.includes(field);

  const startEdit = (vehicle) => {
    setEditingVehicle(vehicle.id);
    const totals = calculateTotals(vehicle);
    setEditedData({ ...vehicle, ...totals });
    setAddItemState((prev) => ({
      ...prev,
      [`vehicle-${vehicle.id}`]: prev[`vehicle-${vehicle.id}`] || { added: [] },
    }));
    const currentCostCenter = vehicle.new_account_number || costCode || "";
    const currentOption = matchingCostCenters.find(
      (item) => item.cost_code === currentCostCenter,
    );
    setTargetCostCenterByVehicle((prev) => ({
      ...prev,
      [vehicle.id]: prev[vehicle.id] || currentCostCenter,
    }));
    setCostCenterSearch(
      formatCostCenterOption(currentOption) || currentCostCenter,
    );
    setCostCenterDropdownOpen(false);
    loadPrefixCostCenters().catch((error) => {
      console.error("Error loading cost centers:", error);
      toast.error(`Failed to load cost centers: ${error.message}`);
    });
  };

  const cancelEdit = () => {
    if (editingVehicle !== null) {
      setAddItemState((prev) => {
        const next = { ...prev };
        delete next[`vehicle-${editingVehicle}`];
        return next;
      });
    }
    setEditingVehicle(null);
    setEditedData({});
    setCostCenterSearch("");
    setCostCenterDropdownOpen(false);
  };

  const handleFieldChange = (field, value) => {
    setEditedData((prev) => {
      if (field === "total_rental_sub") {
        return prev;
      }
      const updated = { ...prev, [field]: value === "" ? null : value };
      if (field === "total_rental" || field === "total_sub") {
        const totalRental = parseAmount(
          field === "total_rental" ? value : updated.total_rental,
        );
        const totalSub = parseAmount(
          field === "total_sub" ? value : updated.total_sub,
        );
        return {
          ...updated,
          total_rental_sub: (totalRental + totalSub).toFixed(2),
        };
      }
      if (!affectsTotals(field)) {
        return updated;
      }
      const totals = calculateTotals(updated);
      return { ...updated, ...totals };
    });
  };

  const confirmField = (field) => {
    if (
      (field.endsWith("_rental") && field !== "total_rental") ||
      (field.endsWith("_sub") &&
        !["total_sub", "total_rental_sub"].includes(field)) ||
      specialBillingFields.includes(field)
    ) {
      setEditedData((prev) => {
        const allKeys = Object.keys(prev);
        const rentalKeys = allKeys.filter(
          (k) => k.endsWith("_rental") && k !== "total_rental",
        );
        const subKeys = allKeys.filter(
          (k) =>
            (k.endsWith("_sub") &&
              k !== "total_sub" &&
              k !== "total_rental_sub") ||
            specialBillingFields.includes(k),
        );

        const totalRental = rentalKeys.reduce(
          (sum, k) => sum + (parseFloat(prev[k]) || 0),
          0,
        );
        const totalSub = subKeys.reduce(
          (sum, k) => sum + (parseFloat(prev[k]) || 0),
          0,
        );

        return {
          ...prev,
          total_rental: totalRental.toFixed(2),
          total_sub: totalSub.toFixed(2),
          total_rental_sub: (totalRental + totalSub).toFixed(2),
        };
      });
    }
    toast.success("Field confirmed");
  };

  const normalizeForCompare = (value) =>
    value === "" || value === undefined ? null : value;

  const saveVehicle = async () => {
    const currentVehicle = vehicles.find((v) => v.id === editedData.id);
    if (!currentVehicle) {
      toast.error("Vehicle not found");
      return;
    }

    const selectedTargetCostCenter =
      targetCostCenterByVehicle[currentVehicle.id] || "";
    const currentCostCenter =
      currentVehicle.new_account_number || costCode || "";
    const isMovingCostCenter = Boolean(
      selectedTargetCostCenter &&
      selectedTargetCostCenter !== currentCostCenter,
    );
    const selectedCostCenter = isMovingCostCenter
      ? matchingCostCenters.find(
          (item) => item.cost_code === selectedTargetCostCenter,
        )
      : null;

    const changedFields = Object.keys(editedData).reduce((acc, key) => {
      if (key === "id" || key === "unique_id") return acc;
      const before = normalizeForCompare(currentVehicle[key]);
      const after = normalizeForCompare(editedData[key]);
      if (before !== after) {
        acc[key] = editedData[key];
      }
      return acc;
    }, {});

    if (isMovingCostCenter) {
      changedFields.cost_code = selectedTargetCostCenter;
      changedFields.new_account_number = selectedTargetCostCenter;
      const nextCompany =
        selectedCostCenter?.company || currentVehicle.company || null;
      if (
        normalizeForCompare(currentVehicle.company) !==
        normalizeForCompare(nextCompany)
      ) {
        changedFields.company = nextCompany;
      }
    }

    // Mark row as validated on save only when the DB row exposes this column.
    // This avoids failing updates if migration has not been applied yet.
    const supportsValidationFlag = Object.prototype.hasOwnProperty.call(
      currentVehicle,
      "vehicle_validated",
    );
    if (supportsValidationFlag && currentVehicle.vehicle_validated !== true) {
      changedFields.vehicle_validated = true;
    }

    if (Object.keys(changedFields).length === 0) {
      toast.info("No changes to save");
      setEditingVehicle(null);
      return;
    }

    const previousVehicles = vehicles;
    const optimisticVehicle = { ...currentVehicle, ...changedFields };
    setVehicles((prev) =>
      prev.map((v) => (v.id === editedData.id ? optimisticVehicle : v)),
    );
    setEditingVehicle(null);
    setSaving(true);
    try {
      const payload = {
        id: editedData.id,
        ...(editedData.unique_id ? { unique_id: editedData.unique_id } : {}),
        ...changedFields,
      };
      const response = await fetch("/api/vehicles/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = "Failed to update vehicle";
        try {
          const errorData = await response.json();
          errorMessage = errorData?.details || errorData?.error || errorMessage;
        } catch {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (isMovingCostCenter) {
        setVehicles((prev) => prev.filter((v) => v.id !== editedData.id));
        toast.success(
          `Vehicle updated and moved to ${selectedTargetCostCenter}`,
        );
      } else {
        setVehicles((prev) =>
          prev.map((v) => (v.id === editedData.id ? result : v)),
        );
        toast.success("Vehicle updated successfully");
      }
      setEditedData({});
    } catch (error) {
      setVehicles(previousVehicles);
      setEditingVehicle(editedData.id);
      toast.error("Failed to update vehicle: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleShowInvoicePreview = async () => {
    if (!costCode) {
      toast.error("No cost center provided");
      return;
    }

    const billingMonth = String(selectedBillingMonth || FC_BILLING_MONTH).trim();
    const cacheKey = [String(costCode).trim().toUpperCase(), billingMonth || "current"].join("::");

    try {
      setIsLoadingInvoicePreview(true);

      const query = new URLSearchParams({
        accountNumber: costCode,
      });
      if (billingMonth) {
        query.set("billingMonth", billingMonth);
      }

      const response = await fetch(`/api/invoices/bulk-account?${query.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      const storedInvoice = result?.invoice || null;

      if (!response.ok) {
        throw new Error(result?.error || "Failed to load stored invoice data");
      }

      const previewTitle = currentCostCenterName || costCode;
      let systemLock = null;
      const systemLockResponse = await fetch("/api/system-lock", {
        cache: "no-store",
      });
      if (systemLockResponse.ok) {
        const lockPayload = await systemLockResponse.json();
        systemLock = lockPayload?.lock || null;
      }

      const systemLockMonth = String(systemLock?.lock_date || "").slice(0, 7);
      const billingMonthKey = String(billingMonth || "").slice(0, 7);
      const isSystemLockedForMonth =
        Boolean(systemLock?.is_locked) &&
        Boolean(systemLockMonth) &&
        Boolean(billingMonthKey) &&
        systemLockMonth === billingMonthKey;

      const liveResponse = await fetch(
        `/api/vehicles/invoice?accountNumber=${encodeURIComponent(costCode)}&billingMonth=${encodeURIComponent(
          billingMonth,
        )}`,
        { cache: "no-store" },
      );
      const liveResult = await liveResponse.json();
      const liveInvoice = liveResult?.invoiceData || null;

      if (!liveResponse.ok || !liveInvoice) {
        throw new Error(liveResult?.error || "Failed to build live invoice preview");
      }

      const liveLineItems = Array.isArray(
        liveInvoice?.invoiceItems || liveInvoice?.invoice_items,
      )
        ? liveInvoice.invoiceItems || liveInvoice.invoice_items
        : [];

      let invoiceData = {
        ...liveInvoice,
        invoice_number:
          storedInvoice?.invoice_number || liveInvoice?.invoice_number || "PENDING",
        invoice_date:
          liveInvoice?.invoice_date ||
          storedInvoice?.invoice_date ||
          `${billingMonth}T00:00:00.000Z`,
        notes: storedInvoice?.notes || liveInvoice?.notes || null,
        invoice_locked:
          Boolean(storedInvoice?.invoice_locked) || Boolean(isSystemLockedForMonth),
        invoice_locked_at:
          storedInvoice?.invoice_locked_at || systemLock?.locked_at || null,
        invoice_locked_by:
          storedInvoice?.invoice_locked_by || systemLock?.locked_by || null,
        invoice_locked_by_email:
          storedInvoice?.invoice_locked_by_email ||
          systemLock?.locked_by_email ||
          null,
        billing_month:
          String(
            storedInvoice?.billing_month ||
              liveInvoice?.billing_month ||
              billingMonth,
          ).trim() || null,
        company_name:
          storedInvoice?.company_name || liveInvoice?.company_name || previewTitle,
        invoiceItems: liveLineItems,
        invoice_items: liveLineItems,
      };

      const previewPayload = {
        accountNumber: costCode,
        accountName: previewTitle,
        company: previewTitle,
        billingMonth: String(invoiceData?.billing_month || billingMonth).trim() || null,
        costCenterInfo: currentCostCenter || null,
        invoiceData,
      };

      invoicePreviewCacheRef.current.set(cacheKey, previewPayload);
      setInvoicePreviewCostCenter(previewPayload);
      setShowInvoicePreview(true);

      try {
        const persistResponse = await fetch("/api/invoices/bulk-account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountNumber: costCode,
            billingMonth:
              String(
                liveInvoice?.billing_month ||
                  storedInvoice?.billing_month ||
                  billingMonth,
              ).trim() || null,
            companyName:
              liveInvoice?.company_name ||
              storedInvoice?.company_name ||
              previewTitle,
            companyRegistrationNumber:
              liveInvoice?.company_registration_number ||
              storedInvoice?.company_registration_number ||
              null,
            clientAddress:
              liveInvoice?.client_address ||
              storedInvoice?.client_address ||
              null,
            customerVatNumber:
              liveInvoice?.customer_vat_number ||
              storedInvoice?.customer_vat_number ||
              null,
            invoiceDate:
              liveInvoice?.invoice_date ||
              storedInvoice?.invoice_date ||
              `${billingMonth}T00:00:00.000Z`,
            subtotal: Number(liveInvoice?.subtotal || 0),
            vatAmount: Number(liveInvoice?.vat_amount || 0),
            discountAmount: Number(liveInvoice?.discount_amount || 0),
            totalAmount: Number(liveInvoice?.total_amount || 0),
            lineItems: liveLineItems,
            notes: storedInvoice?.notes || liveInvoice?.notes || null,
            allowLockedRebuild: false,
          }),
        });

        if (persistResponse.ok) {
          const persistResult = await persistResponse.json();
          const persistedInvoice = persistResult?.invoice || null;

          if (persistedInvoice) {
            invoiceData = {
              ...invoiceData,
              ...persistedInvoice,
              invoice_number:
                persistedInvoice?.invoice_number ||
                invoiceData?.invoice_number ||
                "PENDING",
              invoice_date:
                persistedInvoice?.invoice_date ||
                invoiceData?.invoice_date ||
                `${billingMonth}T00:00:00.000Z`,
              invoice_locked: Boolean(persistedInvoice?.invoice_locked),
              invoice_locked_at:
                persistedInvoice?.invoice_locked_at ||
                invoiceData?.invoice_locked_at ||
                null,
              invoice_locked_by:
                persistedInvoice?.invoice_locked_by ||
                invoiceData?.invoice_locked_by ||
                null,
              invoice_locked_by_email:
                persistedInvoice?.invoice_locked_by_email ||
                invoiceData?.invoice_locked_by_email ||
                null,
              invoiceItems: Array.isArray(persistedInvoice?.line_items)
                ? persistedInvoice.line_items
                : liveLineItems,
              invoice_items: Array.isArray(persistedInvoice?.line_items)
                ? persistedInvoice.line_items
                : liveLineItems,
            };

            const persistedPreviewPayload = {
              ...previewPayload,
              billingMonth:
                String(invoiceData?.billing_month || billingMonth).trim() || null,
              invoiceData,
            };
            invoicePreviewCacheRef.current.set(cacheKey, persistedPreviewPayload);
            setInvoicePreviewCostCenter(persistedPreviewPayload);
          }
        } else {
          const persistResult = await persistResponse.json().catch(() => ({}));
          console.warn(
            "Failed to persist live invoice preview for FC validate page:",
            persistResult?.error || persistResponse.statusText,
          );
        }
      } catch (persistError) {
        console.warn(
          "Failed to persist live invoice preview for FC validate page:",
          persistError,
        );
      }
    } catch (error) {
      console.error("Invoice preview error:", error);
      toast.error(error?.message || "Failed to load invoice preview");
    } finally {
      setIsLoadingInvoicePreview(false);
    }
  };

  const lockCostCenterTotal = async () => {
    if (!costCode) {
      toast.error("No cost center provided");
      return;
    }
    const coveredMonths = selectedCoveredBillingMonths
      .map((month) => normalizeBillingMonthValue(month))
      .filter(Boolean);
    const selectedMonthIsIncluded = coveredMonths.includes(selectedBillingMonth);
    if (coveredMonths.length !== billingCycleMultiplierValue) {
      toast.error(
        `Specify exactly ${billingCycleMultiplierValue} billing month${billingCycleMultiplierValue > 1 ? "s" : ""} before locking`,
      );
      return;
    }
    if (!selectedMonthIsIncluded) {
      toast.error("Covered billing months must include the selected Billing Month");
      return;
    }

    try {
      setLockingCostCenterTotal(true);
      const response = await fetch("/api/cost-centers/validate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cost_code: costCode,
          validated: Boolean(currentCostCenter?.validated),
          billing_month: selectedBillingMonth,
          total_amount_locked: true,
          total_amount_locked_value: lockAmountForSelectedMonth,
          total_amount_locked_multiplier: billingCycleMultiplierValue,
          total_amount_locked_billing_months: coveredMonths,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.details || result?.error || "Failed to lock total amount",
        );
      }

      setCostCenterOptions((prev) =>
        prev.map((option) =>
          option.cost_code === costCode ? { ...option, ...result } : option,
        ),
      );
      const coveredMonthsLabel = coveredMonths
        .map((month) => formatBillingMonthLabel(month))
        .join(", ");
      toast.success(
        `Locked ${formatCurrency(lockAmountForSelectedMonth)} (${billingCycleMultiplierValue}x) for ${coveredMonthsLabel}`,
      );
    } catch (error) {
      toast.error("Failed to lock total amount: " + error.message);
    } finally {
      setLockingCostCenterTotal(false);
    }
  };

  const openJobCardInvoicePreview = (invoice) => {
    const lineItems = Array.isArray(invoice?.invoice_items)
      ? invoice.invoice_items
      : Array.isArray(invoice?.line_items)
        ? invoice.line_items
        : [];
    const resolvedBillingMonth =
      normalizeBillingMonthValue(
        invoice?.billing_month ||
          selectedBillingMonth ||
          invoice?.invoice_date ||
          invoice?.created_at,
      ) || selectedBillingMonth || FC_BILLING_MONTH;

    const previewInvoice = {
      ...invoice,
      account_number: invoice?.account_number || costCode || null,
      company_name:
        invoice?.company_name ||
        invoice?.client_name ||
        currentCostCenterName ||
        costCode ||
        "N/A",
      billing_month: resolvedBillingMonth,
      invoice_date:
        invoice?.invoice_date ||
        invoice?.created_at ||
        `${resolvedBillingMonth}T00:00:00.000Z`,
      total_amount: Number(invoice?.total_amount || 0),
      notes: "",
      note: "",
      quote_notes: "",
      line_items: lineItems,
      invoice_items: lineItems,
      invoiceItems: lineItems,
    };

    setJobCardInvoicePreview(previewInvoice);
    setShowJobCardInvoicePreview(true);
  };

  const handleNewVehicleChange = (field, value) => {
    setNewVehicleData((prev) => {
      if (field === "total_rental_sub") {
        return prev;
      }
      const updated = { ...prev, [field]: value === "" ? null : value };
      if (field === "total_rental" || field === "total_sub") {
        const totalRental = parseAmount(
          field === "total_rental" ? value : updated.total_rental,
        );
        const totalSub = parseAmount(
          field === "total_sub" ? value : updated.total_sub,
        );
        return {
          ...updated,
          total_rental_sub: (totalRental + totalSub).toFixed(2),
        };
      }
      if (!affectsTotals(field)) {
        return updated;
      }
      const totals = calculateTotals(updated);
      return { ...updated, ...totals };
    });
  };

  const addVehicle = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/vehicles/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newVehicleData,
          new_account_number: costCode,
          vehicle_validated: true,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create vehicle";
        try {
          const errorData = await response.json();
          errorMessage = errorData?.details || errorData?.error || errorMessage;
        } catch {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      const newVehicle = await response.json();
      const normalizedNewVehicle = {
        ...newVehicle,
        vehicle_validated: newVehicle?.vehicle_validated ?? true,
      };
      setVehicles((prev) => [...prev, normalizedNewVehicle]);
      toast.success("Vehicle added successfully");
      setShowAddForm(false);
      setNewVehicleData(initialTotalValues);
      setAddItemState((prev) => {
        const next = { ...prev };
        delete next.new;
        return next;
      });
    } catch (error) {
      toast.error("Failed to add vehicle: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteVehicle = async (vehicleId) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const response = await fetch("/api/vehicles/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vehicleId }),
      });

      if (!response.ok) throw new Error("Failed to delete vehicle");

      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      toast.success("Vehicle deleted successfully");
    } catch (error) {
      toast.error("Failed to delete vehicle: " + error.message);
    }
  };

  const renderField = (label, value) => {
    if (!value && value !== 0) return null;
    return (
      <div>
        <Label className="text-xs text-gray-500">{label}</Label>
        <p className="text-sm">{value}</p>
      </div>
    );
  };

  const renderAllFields = (vehicle, isEditing, isNew = false) => {
    const data = isNew ? newVehicleData : isEditing ? editedData : vehicle;
    const onChange = isNew ? handleNewVehicleChange : handleFieldChange;
    const totalFieldOrder = ["total_rental", "total_sub", "total_rental_sub"];
    const contextKey = isNew ? "new" : `vehicle-${vehicle.id}`;
    const addedFields = addItemState[contextKey]?.added || [];
    const hasValue = (value) =>
      value !== null && value !== "" && value !== undefined;
    const allKnownKeys = Array.from(
      new Set([
        ...allVehicleFieldKeys,
        ...(isNew ? defaultVehicleInfoFields : []),
        ...Object.keys(data || {}),
        ...addedFields,
      ]),
    );
    const allFieldKeys = allKnownKeys.filter((k) => !excludeKeys.includes(k));
    const visibleKeys = allFieldKeys.filter(
      (k) =>
        hasValue(data?.[k]) ||
        addedFields.includes(k) ||
        (isNew && defaultVehicleInfoFields.includes(k)) ||
        (isEditing && hasValue(vehicle?.[k])),
    );
    const totalBillingKeys = totalFieldOrder.filter(
      (k) =>
        allFieldKeys.includes(k) && (isEditing || isNew || hasValue(data?.[k])),
    );
    const visibleNonTotalKeys = visibleKeys.filter(
      (k) => !totalFieldOrder.includes(k),
    );
    const billingKeys = visibleNonTotalKeys.filter(
      (k) =>
        k.endsWith("_rental") ||
        k.endsWith("_sub") ||
        billingFields.includes(k),
    );
    const infoKeys = visibleNonTotalKeys.filter(
      (k) =>
        !k.endsWith("_rental") &&
        !k.endsWith("_sub") &&
        !billingFields.includes(k),
    );
    const orderedInfoKeys = isNew
      ? [
          ...defaultVehicleInfoFields.filter((k) => infoKeys.includes(k)),
          ...infoKeys.filter((k) => !defaultVehicleInfoFields.includes(k)),
        ]
      : infoKeys;
    const availableFieldsToAdd = allFieldKeys.filter(
      (f) => !visibleKeys.includes(f) && !totalFieldOrder.includes(f),
    );
    const billingFieldsToAdd = availableFieldsToAdd
      .filter(
        (f) =>
          f.endsWith("_rental") ||
          f.endsWith("_sub") ||
          billingFields.includes(f),
      )
      .sort((a, b) => a.localeCompare(b));
    const vehicleFieldsToAdd = availableFieldsToAdd
      .filter(
        (f) =>
          !f.endsWith("_rental") &&
          !f.endsWith("_sub") &&
          !billingFields.includes(f),
      )
      .sort((a, b) => a.localeCompare(b));
    const billingSummary = getBillingSummary(data);

    const handleAddField = (fieldToAdd, initialValue = "") => {
      if (!fieldToAdd) return;
      setAddItemState((prev) => {
        const current = prev[contextKey] || { added: [] };
        return {
          ...prev,
          [contextKey]: {
            added: current.added.includes(fieldToAdd)
              ? current.added
              : [...current.added, fieldToAdd],
          },
        };
      });
      onChange(fieldToAdd, initialValue);
    };

    return (
      <>
        <div className="col-span-full mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">
            Vehicle Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {orderedInfoKeys.map((key, idx) => {
              const displayLabel = key.replace(/_/g, " ").toUpperCase();
              return (
                <div key={idx} className="text-sm">
                  <Label className="text-xs text-gray-500">
                    {displayLabel}
                  </Label>
                  {isEditing || isNew ? (
                    <Input
                      value={data[key] ?? ""}
                      onChange={(e) => onChange(key, e.target.value)}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm mt-1">{data[key] || "N/A"}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-full">
          {(isEditing || isNew) && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">
                Add Item
              </h3>
              <AddItemSearch
                vehicleFieldsToAdd={vehicleFieldsToAdd}
                billingFieldsToAdd={billingFieldsToAdd}
                onAddField={handleAddField}
              />
            </div>
          )}
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">
            Billing Details
          </h3>
          {!isNew && billingSummary.hasManualTotalOnly && (
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              This vehicle currently has a manual total saved, but no itemized
              billing lines yet.
            </div>
          )}
          {!isEditing && !isNew && billingSummary.entries.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {billingSummary.entries.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {item.label}: {formatCurrency(item.value)}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            {billingKeys.map((key, idx) => {
              const displayLabel = formatFieldLabel(key);
              return (
                <div key={idx} className="text-sm">
                  <Label className="text-xs text-gray-500">
                    {displayLabel}
                  </Label>
                  {isEditing || isNew ? (
                    <div className="flex gap-1">
                      <Input
                        value={data[key] ?? ""}
                        onChange={(e) => onChange(key, e.target.value)}
                        className="h-8 text-sm"
                      />
                      {!isNew && data[key] !== vehicle[key] && (
                        <button
                          onClick={() => confirmField(key)}
                          className="px-1 hover:bg-green-100 rounded"
                        >
                          <Check className="h-3 w-3 text-green-600" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm mt-1">{data[key] || "N/A"}</p>
                  )}
                </div>
              );
            })}
          </div>
          {(isEditing || isNew) && totalBillingKeys.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Note: Total fields below are manual overrides. You can enter
                your own total amounts if needed.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {totalBillingKeys.map((key, idx) => {
                  const displayLabel = formatFieldLabel(key);
                  const isReadOnlyTotal = key === "total_rental_sub";
                  return (
                    <div key={`${key}-${idx}`} className="text-sm">
                      <Label className="text-xs text-gray-500">
                        {displayLabel}
                      </Label>
                      <Input
                        value={data[key] ?? ""}
                        onChange={(e) => onChange(key, e.target.value)}
                        className={`h-8 text-sm ${isReadOnlyTotal ? "bg-slate-100 text-slate-700" : ""}`}
                        readOnly={isReadOnlyTotal}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-3 gap-4 flex-1">
                <div>
                  <Label className="text-xs font-medium text-slate-600">
                    TOTAL RENTAL
                  </Label>
                  <p className="text-lg font-bold mt-1">
                    {formatCurrency(data.total_rental)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">
                    TOTAL SUB
                  </Label>
                  <p className="text-lg font-bold mt-1">
                    {formatCurrency(data.total_sub)}
                  </p>
                </div>
                <div className="bg-slate-800 text-white rounded-lg p-3 -m-1">
                  <Label className="text-xs font-medium text-slate-300">
                    TOTAL
                  </Label>
                  <p className="text-xl font-bold mt-1">
                    {formatCurrency(data.total_rental_sub)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {!isNew && !validationMode && (
            <div className="flex justify-end gap-2 mt-4">
              {editingVehicle === vehicle.id ? (
                <>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveVehicle} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteVehicle(vehicle.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button size="sm" onClick={() => startEdit(vehicle)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader title="Validate Vehicles" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {invoiceViewTab === "annuity"
                  ? `${validationMode ? "Validation Mode" : "Validate Vehicles"} - ${currentCostCenterName}`
                  : `Job Card Invoices - ${currentCostCenterName}`}
              </h1>
              {invoiceViewTab === "annuity" && (
                <Button
                  size="sm"
                  variant={validationMode ? "default" : "outline"}
                  onClick={() => setValidationMode(!validationMode)}
                >
                  {validationMode ? "ON" : "OFF"}
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {invoiceViewTab === "annuity"
                ? "Minimal vehicle information"
                : "Billing month filtered invoices linked to job cards"}
            </p>
          </div>
        </div>
        {invoiceViewTab === "annuity" && !validationMode && (
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          value={invoiceViewTab}
          onValueChange={setInvoiceViewTab}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-2 sm:w-[280px]">
            <TabsTrigger value="annuity">Annuity</TabsTrigger>
            <TabsTrigger value="job_cards">Job Cards</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="w-full sm:w-[180px]">
            <Label htmlFor="invoiceMonthFilter" className="text-xs text-gray-500">
              Billing Month
            </Label>
            <Input
              id="invoiceMonthFilter"
              type="month"
              value={invoiceMonthFilter}
              onChange={(event) => setInvoiceMonthFilter(event.target.value)}
              className="mt-1 h-9 text-sm"
            />
          </div>
          {invoiceViewTab === "annuity" && (
            <>
              <div className="w-full sm:w-[130px]">
                <Label htmlFor="billingCycleMultiplier" className="text-xs text-gray-500">
                  Billing X
                </Label>
                <Input
                  id="billingCycleMultiplier"
                  type="number"
                  min="1"
                  max="12"
                  step="1"
                  value={billingCycleMultiplier}
                  onChange={(event) => {
                    const digitsOnly = String(event.target.value || "").replace(/[^\d]/g, "");
                    setBillingCycleMultiplier(digitsOnly);
                  }}
                  onBlur={() =>
                    setBillingCycleMultiplier(String(billingCycleMultiplierValue))
                  }
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div className="w-full sm:w-[300px]">
                <Label htmlFor="billingMonthsCovered" className="text-xs text-gray-500">
                  Billing Months Covered
                </Label>
                <Input
                  id="billingMonthsCovered"
                  value={billingMonthsCoveredInput}
                  onChange={(event) =>
                    setBillingMonthsCoveredInput(event.target.value)
                  }
                  className="mt-1 h-9 text-sm"
                  placeholder="YYYY-MM, YYYY-MM"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {invoiceViewTab === "annuity" ? (
        <>

      {!validationMode && showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {renderAllFields({}, false, true)}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewVehicleData(initialTotalValues);
                  setAddItemState((prev) => {
                    const next = { ...prev };
                    delete next.new;
                    return next;
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={addVehicle} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Add Vehicle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Label htmlFor="vehicleSearch" className="text-xs text-gray-500">
                Search by Reg or Fleet Number
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="vehicleSearch"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="Type registration or fleet number..."
                  className="h-10 pl-9 text-sm"
                />
              </div>
            </div>
            <div className="min-w-[90px] pt-6 text-right text-sm text-gray-500">
              <div>
                <span className="font-semibold text-gray-700">
                  {filteredVehicles.length}
                </span>{" "}
                /{" "}
                <span className="font-semibold text-gray-700">
                  {vehicles.length}
                </span>
              </div>
              <div className="text-xs text-gray-400">showing</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">
              No vehicles found for this cost center
            </p>
          </CardContent>
        </Card>
      ) : filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No vehicles match your search</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredVehicles.map((vehicle) => (
            <Collapsible
              key={vehicle.id}
              open={expandedVehicles[vehicle.id]}
              onOpenChange={() => toggleVehicle(vehicle.id)}
            >
              {(() => {
                const billingSummary = getBillingSummary(vehicle);

                return (
                  <Card
                    className={
                      vehicle.vehicle_validated
                        ? "border-green-500 bg-green-50"
                        : ""
                    }
                  >
                    <CollapsibleTrigger className="w-full">
                      <CardHeader
                        className={`cursor-pointer ${vehicle.vehicle_validated ? "bg-green-100 hover:bg-green-100" : "hover:bg-gray-50"}`}
                      >
                        <div className="flex items-start gap-4 overflow-hidden">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-4">
                              <div className="w-[14%] min-w-[120px] text-left">
                                <Label className="text-xs text-gray-500">
                                  Registration
                                </Label>
                                <p className="text-sm font-medium truncate">
                                  {vehicle.reg || "N/A"}
                                </p>
                              </div>
                              <div className="w-[14%] min-w-[120px] text-left">
                                <Label className="text-xs text-gray-500">
                                  Fleet Number
                                </Label>
                                <p className="text-sm font-medium truncate">
                                  {vehicle.fleet_number || "N/A"}
                                </p>
                              </div>
                              <div className="w-[18%] min-w-[140px] text-left">
                                <Label className="text-xs text-gray-500">
                                  VIN
                                </Label>
                                <p className="text-sm font-medium truncate">
                                  {vehicle.vin || "N/A"}
                                </p>
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <Label className="text-xs text-gray-500">
                                  Items Being Billed
                                </Label>
                                {billingSummary.entries.length > 0 ? (
                                  <div className="mt-1 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
                                    {billingSummary.entries.map((item) => (
                                      <span
                                        key={item.key}
                                        className="inline-flex w-full min-w-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                                      >
                                        <span className="truncate">
                                          {item.label}:{" "}
                                          {formatCurrency(item.value)}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-1 text-sm text-gray-600 truncate">
                                    {billingSummary.hasManualTotalOnly
                                      ? "Manual total only"
                                      : "No billed items"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-4">
                            <div className="text-right">
                              <Label className="text-xs text-gray-500">
                                Total Value
                              </Label>
                              <p className="text-sm font-semibold text-slate-900">
                                {formatCurrency(Number(vehicle?.total_rental_sub || 0))}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {vehicle.vehicle_validated && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                  <Check className="h-3 w-3" />
                                  Done
                                </span>
                              )}
                              {expandedVehicles[vehicle.id] ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {editingVehicle === vehicle.id &&
                          (() => {
                            const currentCostCenter =
                              vehicle.new_account_number || costCode || "";

                            return (
                              <div className="mb-4 p-3 border rounded-md bg-slate-50">
                                <div className="flex flex-col md:flex-row md:items-end gap-3">
                                  <div className="flex-1">
                                    <Label className="text-xs text-gray-500">
                                      Current Cost Center
                                    </Label>
                                    <p className="text-sm font-medium text-gray-900">
                                      {currentCostCenter || "N/A"}
                                    </p>
                                  </div>
                                  <div className="flex-1">
                                    <Label
                                      htmlFor={`move-cc-${vehicle.id}`}
                                      className="text-xs text-gray-500"
                                    >
                                      Cost Center
                                    </Label>
                                    <Input
                                      id={`move-cc-${vehicle.id}`}
                                      value={costCenterSearch}
                                      onChange={(e) => {
                                        setCostCenterSearch(e.target.value);
                                        setCostCenterDropdownOpen(true);
                                      }}
                                      onFocus={() => {
                                        setCostCenterDropdownOpen(true);
                                        loadPrefixCostCenters().catch((error) => {
                                          console.error("Error loading cost centers:", error);
                                          toast.error(`Failed to load cost centers: ${error.message}`);
                                        });
                                      }}
                                      placeholder="Search any cost center..."
                                      className="mt-1 h-9 text-sm bg-white"
                                    />
                                    {costCenterDropdownOpen && (
                                      <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm">
                                        {filteredCostCenters.length > 0 ? (
                                          filteredCostCenters.map((item) => (
                                            <button
                                              key={item.cost_code}
                                              type="button"
                                              onClick={() => {
                                                setTargetCostCenterByVehicle(
                                                  (prev) => ({
                                                    ...prev,
                                                    [vehicle.id]:
                                                      item.cost_code,
                                                  }),
                                                );
                                                setCostCenterSearch(
                                                  formatCostCenterOption(item),
                                                );
                                                setCostCenterDropdownOpen(
                                                  false,
                                                );
                                              }}
                                              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                                                targetCostCenterByVehicle[
                                                  vehicle.id
                                                ] === item.cost_code
                                                  ? "bg-slate-100"
                                                  : ""
                                              }`}
                                            >
                                              {formatCostCenterOption(item)}
                                            </button>
                                          ))
                                        ) : (
                                          <p className="px-3 py-2 text-sm text-gray-500">
                                            No matching cost centers
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {renderAllFields(
                            vehicle,
                            editingVehicle === vehicle.id,
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                );
              })()}
            </Collapsible>
          ))}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="px-6 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Grand Total
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {formatCurrency(filteredVehiclesGrandTotal)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Total total_rental_sub for the currently visible vehicles.
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Lock amount ({billingCycleMultiplierValue}x):{" "}
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(lockAmountForSelectedMonth)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Covered months:{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedCoveredBillingMonthsLabel || "None"}
                    </span>
                  </p>
                  {!canLockForSelectedMonths && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Covered months must include {formatBillingMonthLabel(selectedBillingMonth)} and match {billingCycleMultiplierValue} month{billingCycleMultiplierValue > 1 ? "s" : ""}.
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <Button
                    onClick={handleShowInvoicePreview}
                    disabled={isLoadingInvoicePreview}
                    variant="outline"
                    className="min-w-[170px]"
                  >
                    {isLoadingInvoicePreview ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    {isLoadingInvoicePreview ? "Loading Invoice..." : "View Invoice"}
                  </Button>
                  {isCostCenterLockedForSelectedMonth && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                      <div className="font-semibold">Total locked</div>
                      <div className="mt-1 text-base font-semibold text-blue-950">
                        {currentCostCenter?.total_amount_locked_value != null
                          ? formatCurrency(currentCostCenter.total_amount_locked_value)
                          : formatCurrency(filteredVehiclesGrandTotal)}
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-blue-700">
                        <div>
                          <span className="font-semibold">Locked By:</span>{" "}
                          {currentCostCenter?.total_amount_locked_by_email || currentCostCenter?.total_amount_locked_by || "Current user"}
                        </div>
                        <div>
                          <span className="font-semibold">Locked At:</span>{" "}
                          {currentCostCenter?.total_amount_locked_at
                            ? new Date(currentCostCenter.total_amount_locked_at).toLocaleString("en-ZA")
                            : "Pending"}
                        </div>
                        <div>
                          <span className="font-semibold">Billing X:</span>{" "}
                          {Number.parseInt(
                            String(currentCostCenter?.total_amount_locked_multiplier || "1"),
                            10,
                          ) || 1}
                          x
                        </div>
                        <div>
                          <span className="font-semibold">Covered Months:</span>{" "}
                          {Array.isArray(currentCostCenter?.total_amount_locked_billing_months) &&
                          currentCostCenter.total_amount_locked_billing_months.length > 0
                            ? currentCostCenter.total_amount_locked_billing_months
                                .map((month) => formatBillingMonthLabel(month))
                                .join(", ")
                            : formatBillingMonthLabel(selectedBillingMonth)}
                        </div>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={lockCostCenterTotal}
                    disabled={lockingCostCenterTotal || !canLockForSelectedMonths}
                    variant={isCostCenterLockedForSelectedMonth ? "secondary" : "default"}
                    className="min-w-[170px]"
                  >
                    {lockingCostCenterTotal ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isCostCenterLockedForSelectedMonth ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Lock className="mr-2 h-4 w-4" />
                    )}
                    Lock Total ({billingCycleMultiplierValue}x)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
        </>
      ) : (
        <div className="space-y-3">
          {loadingInvoiceHistory ? (
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading job card invoices...
            </div>
          ) : jobCardInvoices.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-600">
              No job card invoices found for {formatBillingMonthLabel(selectedBillingMonth)}.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Billing Month</th>
                    <th className="px-3 py-2 text-left">Invoice Number</th>
                    <th className="px-3 py-2 text-left">Account</th>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {jobCardInvoices.map((invoice) => (
                    <tr key={`${invoice?.id || "row"}-${invoice?.invoice_number || "no-number"}`}>
                      <td className="px-3 py-2">
                        {formatInvoiceDate(invoice?.invoice_date || invoice?.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        {formatBillingMonthLabel(
                          invoice?.billing_month || invoice?.invoice_date || invoice?.created_at,
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {invoice?.invoice_number || "N/A"}
                      </td>
                      <td className="px-3 py-2">{invoice?.account_number || costCode || "N/A"}</td>
                      <td className="px-3 py-2">{invoice?.company_name || invoice?.client_name || "N/A"}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(Number(invoice?.total_amount || 0))}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => openJobCardInvoicePreview(invoice)}
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          View / Print
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {invoiceViewTab === "annuity" && showInvoicePreview && invoicePreviewCostCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[95vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 p-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Invoice Preview - {invoicePreviewTitle}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  FC view-only invoice preview for {costCode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowInvoicePreview(false);
                    setInvoicePreviewCostCenter(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <InvoiceReportComponent
                costCenter={invoicePreviewCostCenter}
                clientLegalName={invoicePreviewTitle}
                invoiceData={{
                  ...invoicePreviewCostCenter.invoiceData,
                  notes: "",
                  note: "",
                  quote_notes: "",
                }}
                viewOnly
                extraActions={
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={lockCostCenterTotal}
                      disabled={lockingCostCenterTotal || !canLockForSelectedMonths}
                      variant={isCostCenterLockedForSelectedMonth ? "secondary" : "default"}
                      className="flex items-center gap-2"
                    >
                      {lockingCostCenterTotal ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCostCenterLockedForSelectedMonth ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      Lock Total ({billingCycleMultiplierValue}x)
                    </Button>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}

      {showJobCardInvoicePreview && jobCardInvoicePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[95vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 p-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Job Card Invoice - {jobCardInvoicePreview?.invoice_number || "N/A"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  View and print invoice for {jobCardInvoicePreview?.account_number || costCode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowJobCardInvoicePreview(false);
                    setJobCardInvoicePreview(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <InvoiceReportComponent
                viewOnly
                clientLegalName={
                  jobCardInvoicePreview?.company_name ||
                  currentCostCenterName ||
                  jobCardInvoicePreview?.account_number
                }
                costCenter={{
                  accountNumber: jobCardInvoicePreview?.account_number || costCode,
                  billingMonth:
                    jobCardInvoicePreview?.billing_month ||
                    selectedBillingMonth ||
                    FC_BILLING_MONTH,
                }}
                invoiceData={{
                  ...jobCardInvoicePreview,
                  notes: "",
                  note: "",
                  quote_notes: "",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





