"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, RefreshCw, Loader2,
  Briefcase, CheckCircle2, Clock, AlertTriangle, Users,
  History, Eye, FileEdit, Edit, Car, Ban,
  ArrowUpDown, FileText, Filter,
} from "lucide-react";
import { toast } from "sonner";
import InvoiceJobModal from "./InvoiceJobModal";

const JOB_TABS = [
  { id: "job-pool", label: "Job Pool" },
  { id: "not-completed", label: "Not Ready For Invoicing" },
  { id: "completed", label: "Ready For Invoicing" },
  { id: "completed-old", label: "Ready for Invoicing (old)" },
];

const parseProducts = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return []; } }
  return [];
};

const toFiniteNumber = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const formatCurrency = (v) => {
  const n = toFiniteNumber(v);
  return n === 0 ? "N/A" : `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const formatMoney = (v) => toFiniteNumber(v).toFixed(2);
const toStringSafe = (v) => (v === null || v === undefined ? "" : String(v));
const getPreferredPriceField = (p) => {
  const type = (p.purchase_type || "").toLowerCase();
  const fields = type === "cash" ? ["cash_price","rental_price","subscription_price","installation_price","de_installation_price"]
    : type === "rental" ? ["rental_price","subscription_price","cash_price","installation_price","de_installation_price"]
    : type === "subscription" ? ["subscription_price","rental_price","cash_price","installation_price","de_installation_price"]
    : type === "installation" ? ["installation_price","cash_price","rental_price","subscription_price","de_installation_price"]
    : type === "de_installation" || type === "de-installation"
      ? ["de_installation_price","installation_price","cash_price","rental_price","subscription_price"]
      : ["cash_price","rental_price","subscription_price","installation_price","de_installation_price"];
  return fields.find((f) => toFiniteNumber(p[f]) > 0) || fields[0];
};
const calcProductTotal = (p) => {
  const qty = Math.max(1, toFiniteNumber(p.quantity) || 1);
  const sumPrices = PRICE_FIELDS.reduce((sum, field) => sum + toFiniteNumber(p[field]), 0);
  return Number((qty * sumPrices).toFixed(2));
};

const normalizeProductPrices = (p) => {
  const result = { ...p };
  for (const field of PRICE_FIELDS) {
    if (toFiniteNumber(result[field]) === 0) {
      const grossKey = field.replace("_price", "_gross");
      if (toFiniteNumber(result[grossKey]) > 0) {
        result[field] = result[grossKey];
      }
    }
  }
  result.total_price = calcProductTotal(result);
  return result;
};

const getProductLineTotal = (p) => {
  const t = toFiniteNumber(p.total_price);
  if (t > 0) return t;
  return calcProductTotal(p);
};
const PRICE_FIELDS = ["cash_price","rental_price","subscription_price","installation_price","de_installation_price"];

const formatRoleLabel = (role) => {
  if (!role) return "—";
  const r = String(role).toLowerCase().trim();
  if (r === "inv") return "Stock Control";
  return role.toUpperCase();
};

const getJobTypeDisplay = (jobType) => {
  const t = String(jobType || "").toLowerCase().trim();
  if (t === "admin_created") return "Repair";
  return jobType || "N/A";
};

const getCompletionLabel = (jobType) => {
  const t = String(jobType || "").toLowerCase().trim();
  if (t === "installation") return "Installation Not Done";
  if (t === "de_installation" || t === "de-installation") return "De-Installation Not Done";
  if (t === "repair" || t === "admin_created") return "Repair Not Done";
  return "Not Done";
};

const getStageInfo = (job) => {
  const stages = [];
  const hasTech = !!(job.technician_name || job.technician_phone || job.assigned_technician_id);
  const partsRaw = job.parts_required;
  let hasParts = false;
  if (Array.isArray(partsRaw)) hasParts = partsRaw.length > 0;
  else if (typeof partsRaw === "string") { try { const p = JSON.parse(partsRaw); hasParts = Array.isArray(p) ? p.length > 0 : !!p; } catch { hasParts = !!partsRaw.trim(); } }
  else if (partsRaw && typeof partsRaw === "object") hasParts = Object.keys(partsRaw).length > 0;
  const hasProducts = !!(job.quotation_products && (
    (Array.isArray(job.quotation_products) && job.quotation_products.length > 0) ||
    (typeof job.quotation_products === "string" && job.quotation_products.trim().length > 2)
  ));
  const isCompleted = String(job.status || "").toLowerCase() === "completed" || String(job.job_status || "").toLowerCase() === "completed";

  stages.push({ label: hasTech ? "Tech Assigned" : "Awaiting Tech", done: hasTech });
  stages.push({ label: hasParts ? "Parts Assigned" : "Awaiting Parts", done: hasParts });
  stages.push({ label: hasProducts ? "Stock Control Added" : "Awaiting Stock Control", done: hasProducts });
  stages.push({ label: isCompleted ? getJobTypeDisplay(job.job_type) + " Done" : getCompletionLabel(job.job_type), done: isCompleted });

  return stages;
};

function StageBadges({ job, onClick }) {
  if (job.ready_for_invoicing) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(job); }}
        className="flex flex-wrap items-center gap-1 text-left"
      >
        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Job Card Finalised/Completed
        </span>
      </button>
    );
  }

  const stages = getStageInfo(job);
  const doneStages = stages.filter((s) => s.done);
  const pendingStages = stages.filter((s) => !s.done);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(job); }}
      className="flex flex-wrap items-center gap-1 text-left"
    >
      {doneStages.map((s, i) => (
        <span key={`done-${i}`} className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-2.5 w-2.5" />
          {s.label}
        </span>
      ))}
      {pendingStages.map((s, i) => (
        <span key={`pend-${i}`} className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
          {s.label}
        </span>
      ))}
    </button>
  );
}

function ProgressDialog({ job, onClose }) {
  if (!job) return null;
  const stages = getStageInfo(job);
  return (
    <Dialog open={Boolean(job)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Job Progress — {job.job_number || ""}
          </DialogTitle>
        </DialogHeader>
        {job.ready_for_invoicing ? (
          <div className="py-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">Job Card Finalised/Completed</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {stages.map((stage, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                  stage.done
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                  stage.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {stage.done ? "✓" : "○"}
                </div>
                <span className={`text-sm font-medium ${stage.done ? "text-emerald-700" : "text-slate-600"}`}>
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function JobsTab() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [jobTab, setJobTab] = useState("job-pool");
  const [showAllJobs, setShowAllJobs] = useState(true);
  // Edit & Finalize dialog
  const [editingJob, setEditingJob] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Invoice modal
  const [showFinalInvoiceModal, setShowFinalInvoiceModal] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_registration: "", order_number: "", vehicle_make: "", vehicle_model: "",
    vehicle_year: "", vin_number: "", odormeter: "", job_location: "",
    site_contact_person: "", site_contact_phone: "",
    quotation_subtotal: "0.00", quotation_vat_amount: "0.00", quotation_total_amount: "0.00",
    estimated_cost: "", actual_cost: "", work_notes: "", completion_notes: "",
    special_instructions: "", customer_feedback: "", job_description: "",
  });
  const [editableProducts, setEditableProducts] = useState([]);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);
  const [movingJobId, setMovingJobId] = useState(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [pendingMoveJob, setPendingMoveJob] = useState(null);
  const [pendingMoveDestination, setPendingMoveDestination] = useState("");
  const [pendingMovePayload, setPendingMovePayload] = useState(null);
  const [moveNote, setMoveNote] = useState("");
  const [moveHistoryJob, setMoveHistoryJob] = useState(null);
  const [progressJob, setProgressJob] = useState(null);


  // Invoiced tab state
  const [invFcFilter, setInvFcFilter] = useState("");
  const [invFcUserOptions, setInvFcUserOptions] = useState([]);
  const [invCostCenters, setInvCostCenters] = useState([]);
  const [invInvoices, setInvInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invBillingMonth, setInvBillingMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [invSearch, setInvSearch] = useState("");

  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchJobs = useCallback(async (search = "", all = true) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("allJobs", all ? "true" : "false");
      const response = await fetch(`/api/fc/jobs?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch jobs");
      const data = await response.json();
      if (isMounted.current) setJobs(data.jobs || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      toast.error("Failed to load jobs");
    } finally {
      if (isMounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => { fetchJobs(debouncedSearch, showAllJobs); }, [debouncedSearch, showAllJobs, fetchJobs]);

  // Load FC users and cost centers for invoiced tab
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [usersRes, ccRes] = await Promise.all([
          fetch("/api/fc/users", { cache: "no-store" }),
          fetch("/api/cost-centers?all=1", { cache: "no-store" }),
        ]);
        if (!active) return;
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setInvFcUserOptions(usersData.fcUsers || []);
          if (usersData.currentUserRole === "fc" && !invFcFilter) {
            setInvFcFilter(usersData.currentUserId);
          }
        }
        if (ccRes.ok) {
          const ccData = await ccRes.json();
          setInvCostCenters(Array.isArray(ccData?.costCenters) ? ccData.costCenters : Array.isArray(ccData) ? ccData : []);
        }
      } catch (err) {
        console.error("Error loading FC users/cost centers:", err);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  // Fetch invoices when invoiced tab is active
  useEffect(() => {
    if (jobTab !== "invoiced") return;
    let active = true;
    const fetchInvoices = async () => {
      setInvLoading(true);
      try {
        let costCodeList = [];
        if (invFcFilter) {
          costCodeList = invCostCenters
            .filter((cc) => String(cc.fc_id || "").trim().toLowerCase() === String(invFcFilter).trim().toLowerCase())
            .map((cc) => String(cc.cost_code || "").trim())
            .filter(Boolean);
        } else {
          costCodeList = invCostCenters
            .map((cc) => String(cc.cost_code || "").trim())
            .filter(Boolean);
        }
        costCodeList = [...new Set(costCodeList)];
        if (costCodeList.length === 0) {
          if (active) setInvInvoices([]);
          return;
        }
        const [first, ...rest] = costCodeList;
        const params = new URLSearchParams({ accountNumber: first, billingMonth: invBillingMonth + "-01" });
        if (rest.length > 0) params.set("accountNumbers", rest.join(","));
        const res = await fetch(`/api/invoices/account/history?${params.toString()}`, { cache: "no-store" });
        if (!active) return;
        if (!res.ok) { setInvInvoices([]); return; }
        const result = await res.json();
        const jobCardOnly = (Array.isArray(result?.invoices) ? result.invoices : [])
          .filter((inv) => String(inv?.source_type || "").trim() === "job_card_invoice")
          .sort((a, b) => {
            const aD = new Date(a?.invoice_date || a?.created_at || 0).getTime();
            const bD = new Date(b?.invoice_date || b?.created_at || 0).getTime();
            return bD - aD;
          });
        if (active) setInvInvoices(jobCardOnly);
      } catch (err) {
        console.error("Error fetching invoiced data:", err);
        if (active) setInvInvoices([]);
      } finally {
        if (active) setInvLoading(false);
      }
    };
    fetchInvoices();
    return () => { active = false; };
  }, [jobTab, invFcFilter, invCostCenters, invBillingMonth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs(debouncedSearch, showAllJobs);
  };

  const handleMoveJob = useCallback(async (job, destination, note, extraPayload) => {
    if (!job?.id || !destination) return;
    setMovingJobId(job.id);
    const destLabel = destination === "inv" ? "Stock Control" : destination === "fc" ? "FC" : "Helpdesk";
    const loadingToast = toast.loading(`Moving job to ${destLabel}...`);
    try {
      const response = await fetch(`/api/job-cards/${job.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          note,
          ...extraPayload,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Failed to move job to ${destLabel}`);
      }
      toast.dismiss(loadingToast);
      toast.success(`Job moved to ${destLabel}`);
      await fetchJobs(debouncedSearch, showAllJobs);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.message || `Failed to move job to ${destLabel}`);
    } finally {
      setMovingJobId(null);
    }
  }, [fetchJobs, debouncedSearch, showAllJobs]);

  const getJobStatus = useCallback((job) => {
    const s = String(job.status || "").toLowerCase().trim();
    const js = String(job.job_status || "").toLowerCase().trim();
    const completed = s === "completed" || js === "completed";
    const invoiced = s === "invoiced" || js === "invoiced";
    if (invoiced) return "invoiced";
    if (completed) return "completed";
    return js || s || "pending";
  }, []);

  const isCompletedNotInvoiced = useCallback((job) => {
    const completed = String(job.status || "").toLowerCase() === "completed" || String(job.job_status || "").toLowerCase() === "completed";
    if (!completed) return false;
    
    if ('has_invoice' in job && job.has_invoice) return false;
    return true;
  }, []);

  const filteredJobsSearch = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return filteredJobs;
    return filteredJobs.filter((j) =>
      [j.job_number, j.customer_name, j.vehicle_registration, j.job_description, j.new_account_number]
        .filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [filteredJobs, searchTerm]);

  const metrics = useMemo(() => {
    const list = filteredJobsSearch;
    const total = list.length;
    let completed = 0, inProgress = 0, pending = 0, unassigned = 0;
    for (const j of list) {
      const s = getJobStatus(j);
      if (s === "completed") completed++;
      else if (s === "in progress" || s === "processing") inProgress++;
      else if (s === "pending" || s === "new") pending++;
      if (!j.assigned_technician_id) unassigned++;
    }
    return { total, completed, inProgress, pending, unassigned };
  }, [filteredJobsSearch]);

  const handleViewJob = (job) => router.push(`/protected/fc/jobs/${job.id}/edit?source=jobs`);

  const handleCancelJob = useCallback(async (job) => {
    if (!window.confirm(`Cancel job ${job.job_number || job.id}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/job-cards/${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", job_status: "cancelled", role: "cancelled" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to cancel job");
      }
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "cancelled", job_status: "cancelled", role: "cancelled" } : j));
      toast.success(`Job ${job.job_number || job.id} cancelled`);
    } catch (err) {
      toast.error(err.message || "Failed to cancel job");
    }
  }, []);

  const handleEditAndFinalize = useCallback((job) => {
    setEditingJob(job);
    setFinalizeError(null);
    const products = parseProducts(job.quotation_products).map((p) => normalizeProductPrices(p));
    const prods = products.map((p) => {
      const qty = Math.max(1, Number(p.quantity) || 1);
      return { ...p, quantity: qty, total_price: calcProductTotal({ ...p, quantity: qty }) };
    });
    setEditableProducts(prods);
    const sub = prods.reduce((s, p) => s + Number(p.total_price || 0), 0);
    setFormData({
      vehicle_registration: String(job.vehicle_registration || ""),
      order_number: String(job.order_number || ""),
      vehicle_make: String(job.vehicle_make || ""),
      vehicle_model: String(job.vehicle_model || ""),
      vehicle_year: String(job.vehicle_year ?? ""),
      vin_number: String(job.vin_numer || ""),
      odormeter: String(job.odormeter || ""),
      job_location: String(job.job_location || ""),
      site_contact_person: String(job.site_contact_person || ""),
      site_contact_phone: String(job.site_contact_phone || ""),
      quotation_subtotal: sub.toFixed(2),
      quotation_vat_amount: "0.00",
      quotation_total_amount: sub.toFixed(2),
      estimated_cost: String(job.estimated_cost ?? ""),
      actual_cost: String(job.actual_cost ?? ""),
      work_notes: String(job.work_notes || ""),
      completion_notes: String(job.completion_notes || ""),
      special_instructions: String(job.special_instructions || ""),
      customer_feedback: String(job.customer_feedback || ""),
      job_description: String(job.job_description || ""),
    });
    setShowEditDialog(true);
  }, []);

  useEffect(() => {
    if (!showEditDialog || !editingJob?.new_account_number) return;
    const account = editingJob.new_account_number;
    if (!formData.site_contact_person && !formData.site_contact_phone) {
      fetch(`/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(account)}`)
        .then((r) => r.json())
        .then((d) => {
          const cc = d.costCenters?.[0];
          if (cc) {
            setFormData((prev) => ({
              ...prev,
              site_contact_person: prev.site_contact_person || cc.contact_name || "",
              site_contact_phone: prev.site_contact_phone || cc.contact_phone || "",
            }));
          }
        })
        .catch(() => {});
    }
  }, [showEditDialog, editingJob?.new_account_number]);

  const updateFormField = useCallback((field, value) => {
    setFinalizeError(null);
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubtotalChange = useCallback((value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) { updateFormField("quotation_subtotal", value); return; }
    setFormData((prev) => ({ ...prev, quotation_subtotal: value, quotation_vat_amount: "0.00", quotation_total_amount: n.toFixed(2) }));
  }, [updateFormField]);

  const syncTotalsFromProducts = useCallback((products) => {
    const subtotal = products.reduce((s, p) => s + getProductLineTotal(p), 0);
    setFormData((prev) => ({
      ...prev,
      quotation_subtotal: formatMoney(subtotal),
      quotation_vat_amount: "0.00",
      quotation_total_amount: formatMoney(subtotal),
    }));
  }, []);

  const handleProductFieldChange = useCallback((index, field, value) => {
    setEditableProducts((prev) => {
      const next = [...prev];
      const current = { ...next[index] };
      if (!current) return prev;
      if (field === "quantity") {
        current.quantity = Math.max(0, toFiniteNumber(value));
        current.total_price = calcProductTotal(current);
      } else if (PRICE_FIELDS.includes(field)) {
        current[field] = Math.max(0, toFiniteNumber(value));
        current.total_price = calcProductTotal(current);
      } else if (field === "total_price") {
        current.total_price = Math.max(0, toFiniteNumber(value));
      } else {
        current[field] = value;
      }
      next[index] = current;
      syncTotalsFromProducts(next);
      return next;
    });
  }, [syncTotalsFromProducts]);

  const handleFinalizeClick = useCallback(async () => {
    const jobId = editingJob?.id;
    if (!jobId) return;
    setFinalizing(true);
    try {
      const notesSections = [
        formData.job_description && `Job Description: ${formData.job_description}`,
        formData.work_notes && `Work Notes: ${formData.work_notes}`,
        formData.completion_notes && `Completion Notes: ${formData.completion_notes}`,
        formData.special_instructions && `Special Instructions: ${formData.special_instructions}`,
        formData.customer_feedback && `Customer Feedback: ${formData.customer_feedback}`,
      ].filter(Boolean).join("\n");

      const patchBody = { invoice_notes: notesSections };
      for (const key of ["quotation_subtotal", "quotation_total_amount", "work_notes", "completion_notes", "special_instructions", "customer_feedback", "order_number", "vehicle_registration", "vehicle_make", "vehicle_model", "job_description"]) {
        if (formData[key] !== undefined) patchBody[key] = formData[key];
      }
      if (editableProducts.length > 0) {
        const syncedProducts = editableProducts.map((p) => ({
          ...p,
          vehicle_plate: formData.vehicle_registration || p.vehicle_plate || "",
        }));
        patchBody.quotation_products = syncedProducts;
      }
      const res = await fetch(`/api/job-cards/${encodeURIComponent(jobId)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patchBody),
      });
      if (!res.ok) throw new Error("Failed to save job data");

      const freshRes = await fetch(`/api/job-cards/${encodeURIComponent(jobId)}`, { cache: "no-store" });
      if (freshRes.ok) {
        const freshJob = await freshRes.json();
        if (freshJob?.id) setEditingJob(freshJob);
      }
    } catch (err) {
      setFinalizing(false);
      toast.error(err.message || "Failed to save data before finalizing");
      return;
    }
    setShowEditDialog(false);
    setShowFinalInvoiceModal(true);
    setFinalizing(false);
  }, [formData, editingJob?.id, editableProducts]);

  const handleRefreshJobsAfterInvoice = useCallback(() => {
    setEditingJob(null);
    setShowFinalInvoiceModal(false);
    handleRefresh();
  }, [handleRefresh]);

  return (
    <div className="min-w-0 w-full space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {JOB_TABS.map((tab) => (
          <button
            key={tab.id} type="button" onClick={() => setJobTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              jobTab === tab.id ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total", value: metrics.total, icon: Briefcase, bg: "bg-blue-100 text-blue-700" },
          { label: "Completed", value: metrics.completed, icon: CheckCircle2, bg: "bg-green-100 text-green-700" },
          { label: "In Progress", value: metrics.inProgress, icon: Clock, bg: "bg-amber-100 text-amber-700" },
          { label: "Pending", value: metrics.pending, icon: AlertTriangle, bg: "bg-purple-100 text-purple-700" },
          { label: "Unassigned", value: metrics.unassigned, icon: Users, bg: "bg-slate-100 text-slate-700" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{m.label}</span>
                  <div className={`flex justify-center items-center rounded-lg w-7 h-7 ${m.bg}`}><Icon className="w-4 h-4" /></div>
                </div>
                <p className="mt-1 text-xl font-bold leading-none text-slate-900">{m.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search + Refresh */}
      {jobTab === "invoiced" ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              Invoiced Job Cards ({invInvoices.length})
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Job card invoices for the selected period.
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto">
            <div className="relative min-w-0 w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={invFcFilter}
                onChange={(e) => setInvFcFilter(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              >
                <option value="">All FCs</option>
                {invFcUserOptions.map((fc) => (
                  <option key={fc.id} value={fc.id}>{fc.email}</option>
                ))}
              </select>
            </div>
            <Input
              type="month"
              value={invBillingMonth}
              onChange={(e) => setInvBillingMonth(e.target.value)}
              className="h-10 w-44 border-slate-200 text-sm"
            />
            <Input
              placeholder="Search invoices..."
              value={invSearch}
              onChange={(e) => setInvSearch(e.target.value)}
              className="h-10 w-full sm:w-48 border-slate-200 text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {jobTab === "completed" ? "Ready For Invoicing" : jobTab === "completed-old" ? "Ready for Invoicing (old)" : jobTab === "job-pool" ? "Job Pool" : "Not Ready For Invoicing"} ({filteredJobsSearch.length})
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {jobTab === "completed" ? "Jobs marked ready for invoicing by inventory." : jobTab === "completed-old" ? "Completed jobs that haven't been invoiced yet." : jobTab === "job-pool" ? "All open jobs across roles." : "Jobs in progress or pending."}
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <div className="relative min-w-0 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full border-slate-200 pl-10 text-sm"
              />
            </div>
            <Button
              variant={showAllJobs ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllJobs((v) => !v)}
              className="h-10 shrink-0 whitespace-nowrap"
            >
              {showAllJobs ? "All Jobs" : "My Jobs"}
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="h-10 w-full shrink-0 border-slate-200 sm:w-auto">
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Job Pool tab */}
      {jobTab === "job-pool" && (
        <>
      {/* Mobile card layout */}
      <div className="divide-y divide-slate-100 lg:hidden">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500"><Loader2 className="mx-auto mb-2 w-6 h-6 animate-spin" />Loading jobs...</div>
        ) : filteredJobsSearch.length === 0 ? (
          <div className="py-10 text-center"><p className="text-base font-medium text-gray-900">No jobs</p><p className="mt-1 text-sm text-gray-500">No open jobs found.</p></div>
        ) : filteredJobsSearch.map((job) => {
          const sb = ((st) => {
            if (st === "completed") return { label: "Completed", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" };
            if (st === "in progress" || st === "processing") return { label: "In Progress", cls: "border-blue-200 bg-blue-50 text-blue-700" };
            if (st === "pending" || st === "new") return { label: "Pending", cls: "border-amber-200 bg-amber-50 text-amber-700" };
            return { label: st || "N/A", cls: "border-slate-200 bg-slate-50 text-slate-700" };
          })(getJobStatus(job));

          return (
            <div key={job.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base text-slate-900">{job.job_number || "N/A"}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{job.new_account_number || "No account"}</p>
                  <p className="mt-2 font-medium text-slate-900">{job.customer_name || "N/A"}</p>
                </div>
                <Badge variant="outline" className={`shrink-0 border px-2 py-0.5 text-xs font-semibold ${sb.cls}`}>{sb.label}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vehicle</p>
                  <p className="mt-1 font-medium text-slate-900">{job.vehicle_registration || "N/A"}</p>
                  <p className="truncate text-xs text-slate-500">{job.vehicle_make || ""} {job.vehicle_model || ""}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Date</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {new Date(job.completion_date || job.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-xs text-slate-500">{getJobTypeDisplay(job.job_type)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleViewJob(job)} className="h-8 text-xs flex-1">
                  <Eye className="mr-1 w-3.5 h-3.5" /> View
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleCancelJob(job)} className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Ban className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <Card className="hidden lg:block">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-base">Job Pool ({filteredJobsSearch.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500"><Loader2 className="mx-auto mb-2 w-6 h-6 animate-spin" />Loading jobs...</div>
          ) : filteredJobsSearch.length === 0 ? (
          <div className="py-10 text-center"><p className="text-base font-medium text-gray-900">No jobs</p><p className="mt-1 text-sm text-gray-500">No open jobs found.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500"><span className="inline-flex items-center gap-1">Job # <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Customer</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Vehicle</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Account</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Type</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobsSearch.map((job) => {
                    const sb = ((st) => {
                      if (st === "completed") return { label: "Completed", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" };
                      if (st === "in progress" || st === "processing") return { label: "In Progress", cls: "border-blue-200 bg-blue-50 text-blue-700" };
                      if (st === "pending" || st === "new") return { label: "Pending", cls: "border-amber-200 bg-amber-50 text-amber-700" };
                      return { label: st || "N/A", cls: "border-slate-200 bg-slate-50 text-slate-700" };
                    })(getJobStatus(job));

                    return (
                      <tr key={job.id} className="border-b border-slate-100 align-top hover:bg-slate-50/60">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-900">{job.job_number || "N/A"}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <div className="max-w-[180px] truncate font-medium text-slate-900">{job.customer_name || "N/A"}</div>
                          <div className="max-w-[180px] truncate text-[11px] text-slate-500">{job.customer_email || job.customer_phone || ""}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <div className="font-medium text-slate-900">{job.vehicle_registration || "N/A"}</div>
                          <div className="truncate text-[11px] text-slate-500">{job.vehicle_make || ""} {job.vehicle_model || ""}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <span className="font-mono text-[11px]">{job.new_account_number || "N/A"}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 text-[11px]">{getJobTypeDisplay(job.job_type)}</td>
                        <td className="px-3 py-2 text-slate-700">
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={`h-5 rounded-sm border px-1.5 text-[10px] font-semibold w-fit ${sb.cls}`}>{sb.label}</Badge>
                            {job.escalation_role && String(job.escalation_role).toLowerCase() === "fc" && (
                              <Badge variant="outline" className="h-5 rounded-sm border border-orange-200 bg-orange-50 px-1.5 text-[10px] font-semibold text-orange-700 w-fit">Escalated</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-700 text-[11px]">
                          {new Date(job.completion_date || job.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleViewJob(job)} className="hover:bg-blue-50 text-blue-600 hover:text-blue-700 h-7 px-2 text-[11px]">
                              <Eye className="mr-1 w-3 h-3" /> View
                            </Button>
                            <Select disabled={movingJobId === job.id} onValueChange={(value) => {
                              const extraPayload = value === "fc" ? { preserveCompleted: true } : value === "inv" ? { inventoryPlacement: "assign-parts" } : undefined;
                              setPendingMoveJob(job);
                              setPendingMoveDestination(value);
                              setPendingMovePayload(extraPayload || null);
                              setMoveNote("");
                              setShowMoveDialog(true);
                            }}>
                              <SelectTrigger className="h-7 w-[100px] text-[11px]">
                                <SelectValue placeholder={movingJobId === job.id ? "Moving..." : "Move to"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fc">FC</SelectItem>
                                <SelectItem value="inv">Stock Control</SelectItem>
                                <SelectItem value="admin">Helpdesk</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" onClick={() => handleCancelJob(job)} className="hover:bg-red-50 text-red-500 hover:text-red-600 h-7 px-2 text-[11px]">
                              <Ban className="w-3 h-3" /> Cancel
                            </Button>
                          </div>
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
        </>
      )}

      {/* Invoiced tab: invoice table */}
      {jobTab === "invoiced" ? (
        <Card className="mt-4 border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {invLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading invoices...
              </div>
            ) : invInvoices.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-base font-medium text-slate-900">No job card invoices</p>
                <p className="mt-1 text-sm text-slate-500">No invoiced job cards found for {invBillingMonth}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Invoice #</th>
                      <th className="px-3 py-2 text-left">Job #</th>
                      <th className="px-3 py-2 text-left">Customer</th>
                      <th className="px-3 py-2 text-left">Vehicle</th>
                      <th className="px-3 py-2 text-left">Account</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {(invSearch.trim()
                      ? invInvoices.filter((inv) => {
                          const q = invSearch.trim().toLowerCase();
                          return [inv.invoice_number, inv.job_number, inv.customer_name, inv.vehicle_registration, inv.account_number]
                            .filter(Boolean).join(" ").toLowerCase().includes(q);
                        })
                      : invInvoices
                    ).map((inv, idx) => (
                      <tr key={inv.id || idx} className="border-b border-slate-100 hover:bg-slate-50/60">
                        <td className="px-3 py-2 font-medium text-slate-900">{inv.invoice_number || "N/A"}</td>
                        <td className="px-3 py-2 text-slate-700">{inv.job_number || "N/A"}</td>
                        <td className="px-3 py-2 text-slate-700">{inv.customer_name || inv.company_name || "N/A"}</td>
                        <td className="px-3 py-2 text-slate-700">{inv.vehicle_registration || "N/A"}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{inv.account_number || "N/A"}</td>
                        <td className="px-3 py-2 text-slate-600 text-[11px]">
                          {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900">
                          R {Number(inv.total_amount || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
      {/* Mobile card layout */}
      <div className="divide-y divide-slate-100 lg:hidden">
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500"><Loader2 className="mx-auto mb-2 w-6 h-6 animate-spin" />Loading jobs...</div>
        ) : filteredJobsSearch.length === 0 ? (
          <div className="py-10 text-center"><p className="text-base font-medium text-gray-900">No jobs</p><p className="mt-1 text-sm text-gray-500">No {jobTab === "completed" ? "ready for invoicing" : "not ready for invoicing"} jobs found.</p></div>
        ) : filteredJobsSearch.map((job) => {
          const sb = ((st) => {
            if (st === "completed") return { label: "Completed", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" };
            if (st === "in progress" || st === "processing") return { label: "In Progress", cls: "border-blue-200 bg-blue-50 text-blue-700" };
            if (st === "pending" || st === "new") return { label: "Pending", cls: "border-amber-200 bg-amber-50 text-amber-700" };
            return { label: st || "N/A", cls: "border-slate-200 bg-slate-50 text-slate-700" };
          })(getJobStatus(job));

          return (
            <div key={job.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base text-slate-900">{job.job_number || "N/A"}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{job.new_account_number || "No account"}</p>
                  <p className="mt-2 font-medium text-slate-900">{job.customer_name || "N/A"}</p>
                </div>
                <Badge variant="outline" className={`shrink-0 border px-2 py-0.5 text-xs font-semibold ${sb.cls}`}>{sb.label}</Badge>
              </div>
              <div className="mt-1">
                <StageBadges job={job} onClick={setProgressJob} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vehicle</p>
                  <p className="mt-1 font-medium text-slate-900">{job.vehicle_registration || "N/A"}</p>
                  <p className="truncate text-xs text-slate-500">{job.vehicle_make || ""} {job.vehicle_model || ""}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Date</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {new Date(job.completion_date || job.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-xs text-slate-500">{getJobTypeDisplay(job.job_type)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleViewJob(job)} className="h-8 text-xs flex-1">
                  <Eye className="mr-1 w-3.5 h-3.5" /> View
                </Button>
                {jobTab === "completed" && (
                <Button variant="secondary" size="sm" onClick={() => handleEditAndFinalize(job)} className="h-8 text-xs flex-1">
                  <FileEdit className="mr-1 w-3.5 h-3.5" /> Edit &amp; Finalize
                </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleCancelJob(job)} className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Ban className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <Card className="hidden lg:block">
        <CardHeader className="border-b border-slate-100 pb-3">
          <CardTitle className="text-base">{jobTab === "completed" ? "Ready For Invoicing" : "Not Ready For Invoicing"} ({filteredJobsSearch.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500"><Loader2 className="mx-auto mb-2 w-6 h-6 animate-spin" />Loading jobs...</div>
          ) : filteredJobsSearch.length === 0 ? (
          <div className="py-10 text-center"><p className="text-base font-medium text-gray-900">No jobs</p><p className="mt-1 text-sm text-gray-500">No {jobTab === "completed" ? "ready for invoicing" : "not ready for invoicing"} jobs found.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500"><span className="inline-flex items-center gap-1">Job # <ArrowUpDown className="h-3 w-3" /></span></th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Customer</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Vehicle</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Account</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Type</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500 max-w-[160px]">Notes</th>
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobsSearch.map((job) => {
                    return (
                      <tr key={job.id} className="border-b border-slate-100 align-top hover:bg-slate-50/60">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-900">{job.job_number || "N/A"}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <div className="max-w-[180px] truncate font-medium text-slate-900">{job.customer_name || "N/A"}</div>
                          <div className="max-w-[180px] truncate text-[11px] text-slate-500">{job.customer_email || job.customer_phone || ""}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <div className="font-medium text-slate-900">{job.vehicle_registration || "N/A"}</div>
                          <div className="truncate text-[11px] text-slate-500">{job.vehicle_make || ""} {job.vehicle_model || ""}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <span className="font-mono text-[11px]">{job.new_account_number || "N/A"}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 text-[11px]">{getJobTypeDisplay(job.job_type)}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-[160px]">
                          <div className="truncate text-[11px] text-slate-600" title={(() => { const h = job.move_history; if (!Array.isArray(h) || !h.length) return ""; const last = h[h.length - 1]; return last.note || ""; })()}>
                            {(() => { const h = job.move_history; if (!Array.isArray(h) || !h.length) return "—"; const last = h[h.length - 1]; return last.note || "—"; })()}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-700 text-[11px]">
                          {new Date(job.completion_date || job.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleViewJob(job)} className="hover:bg-blue-50 text-blue-600 hover:text-blue-700 h-7 px-2 text-[11px]">
                              <Eye className="mr-1 w-3 h-3" /> View
                            </Button>
                            {jobTab === "completed" && (
                            <Button variant="ghost" size="sm" onClick={() => handleEditAndFinalize(job)} className="hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 h-7 px-2 text-[11px]">
                              <FileEdit className="mr-1 w-3 h-3" /> Edit &amp; Finalize
                            </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setMoveHistoryJob(job)} className="hover:bg-slate-50 text-slate-500 hover:text-slate-700 h-7 px-2 text-[11px]">
                              <History className="mr-1 w-3 h-3" /> History
                            </Button>
                            <Select disabled={movingJobId === job.id} onValueChange={(value) => {
                              const extraPayload = value === "fc" ? { preserveCompleted: true } : value === "inv" ? { inventoryPlacement: "assign-parts" } : undefined;
                              setPendingMoveJob(job);
                              setPendingMoveDestination(value);
                              setPendingMovePayload(extraPayload || null);
                              setMoveNote("");
                              setShowMoveDialog(true);
                            }}>
                              <SelectTrigger className="h-7 w-[100px] text-[11px]">
                                <SelectValue placeholder={movingJobId === job.id ? "Moving..." : "Move to"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fc">FC</SelectItem>
                                <SelectItem value="inv">Stock Control</SelectItem>
                                <SelectItem value="admin">Helpdesk</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" onClick={() => handleCancelJob(job)} className="hover:bg-red-50 text-red-500 hover:text-red-600 h-7 px-2 text-[11px]">
                              <Ban className="mr-1 w-3 h-3" /> Cancel
                            </Button>
                          </div>
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
        </>
      )}

      {/* ===== EDIT & FINALIZE DIALOG ===== */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingJob(null); } }}>
        <DialogContent className="max-h-[92vh] max-w-[96vw] overflow-y-auto xl:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5" /> Edit &amp; Finalize - {editingJob?.job_number || editingJob?.id || ""}</DialogTitle>
          </DialogHeader>
          {editingJob && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Job Snapshot</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <p><strong>Job Number:</strong> {editingJob.job_number || "N/A"}</p>
                  <p><strong>Client:</strong> {editingJob.customer_name || "N/A"}</p>
                  <p><strong>Account:</strong> {editingJob.new_account_number || "N/A"}</p>
                  <p><strong>Job Type:</strong> {editingJob.job_type || "N/A"}</p>
                  <p><strong>Quote:</strong> {editingJob.quotation_number || "N/A"}</p>
                  <p><strong>Quote Status:</strong> {editingJob.quote_status || "N/A"}</p>
                  <p><strong>Current Total:</strong> {formatCurrency(formData.quotation_total_amount)}</p>
                  <p><strong>Products:</strong> {editableProducts.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Quotation Products</CardTitle></CardHeader>
                <CardContent>
                  {editableProducts.length === 0 ? (
                    <p className="text-sm text-gray-500">No quotation products available</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Item</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Qty</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Purchase Type</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Subscription</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Install</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {editableProducts.map((p, i) => (
                            <tr key={p.id || i}>
                              <td className="px-3 py-2 text-sm text-gray-900">{p.name || p.description || `Item ${i + 1}`}</td>
                              <td className="px-3 py-2 text-sm text-gray-700">{toStringSafe(p.quantity) || "N/A"}</td>
                              <td className="px-3 py-2 text-sm text-gray-700">{p.purchase_type || "N/A"}</td>
                              <td className="px-3 py-2 text-sm text-gray-700">{toStringSafe(p.subscription_price) || "N/A"}</td>
                              <td className="px-3 py-2 text-sm text-gray-700">{toStringSafe(p.installation_price) || "N/A"}</td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">{toStringSafe(p.total_price) || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Car className="w-5 h-5" /> Vehicle and Site Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_registration">Vehicle Registration *</Label>
                    <Input id="vehicle_registration" value={formData.vehicle_registration} onChange={(e) => updateFormField("vehicle_registration", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_make">Vehicle Make</Label>
                    <Input id="vehicle_make" value={formData.vehicle_make} onChange={(e) => updateFormField("vehicle_make", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_model">Vehicle Model</Label>
                    <Input id="vehicle_model" value={formData.vehicle_model} onChange={(e) => updateFormField("vehicle_model", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_year">Vehicle Year</Label>
                    <Input id="vehicle_year" type="number" value={formData.vehicle_year} onChange={(e) => updateFormField("vehicle_year", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vin_number">VIN Number</Label>
                    <Input id="vin_number" value={formData.vin_number} onChange={(e) => updateFormField("vin_number", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="odormeter">Odometer</Label>
                    <Input id="odormeter" value={formData.odormeter} onChange={(e) => updateFormField("odormeter", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_location">Job Location</Label>
                    <Input id="job_location" value={formData.job_location} onChange={(e) => updateFormField("job_location", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="site_contact_person">Site Contact Person</Label>
                    <Input id="site_contact_person" value={formData.site_contact_person} onChange={(e) => updateFormField("site_contact_person", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="site_contact_phone">Site Contact Phone</Label>
                    <Input id="site_contact_phone" value={formData.site_contact_phone} onChange={(e) => updateFormField("site_contact_phone", e.target.value)} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg">Pricing, Quote and Notes</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {editableProducts.length > 0 && (
                    <div className="md:col-span-2 space-y-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
                      <div>
                        <h4 className="font-medium text-gray-900">Quotation Items</h4>
                        <p className="text-sm text-gray-600">Update the item pricing fields below. Totals above will roll up from all items automatically.</p>
                      </div>
                      <div className="space-y-4">
                        {editableProducts.map((p, i) => {
                          const activeField = getPreferredPriceField(p);
                          return (
                            <div key={p.id || i} className="rounded-lg border bg-white p-4">
                              <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{p.name || `Item ${i + 1}`}</p>
                                  <p className="text-sm text-gray-600">{p.description || "No description"}</p>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <p><strong>Purchase Type:</strong> {p.purchase_type || "N/A"}</p>
                                  <p><strong>Category:</strong> {p.category || "N/A"}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="space-y-2">
                                  <Label>Quantity</Label>
                                  <Input type="number" min="0" step="1" value={toStringSafe(p.quantity || 1)} onChange={(e) => handleProductFieldChange(i, "quantity", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Active Price ({activeField.replace(/_/g, " ")})</Label>
                                  <Input type="number" min="0" step="0.01" value={toStringSafe(p[activeField] ?? "")} onChange={(e) => handleProductFieldChange(i, activeField, e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Total Price</Label>
                                  <Input type="number" min="0" step="0.01" value={toStringSafe(p.total_price ?? "")} readOnly className="bg-gray-50" />
                                </div>
                                <div className="space-y-2">
                                  <Label>Subscription Price</Label>
                                  <Input type="number" min="0" step="0.01" value={toStringSafe(p.subscription_price ?? "")} onChange={(e) => handleProductFieldChange(i, "subscription_price", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Rental Price</Label>
                                  <Input type="number" min="0" step="0.01" value={toStringSafe(p.rental_price ?? "")} onChange={(e) => handleProductFieldChange(i, "rental_price", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Cash Price</Label>
                                  <Input type="number" min="0" step="0.01" value={toStringSafe(p.cash_price ?? "")} onChange={(e) => handleProductFieldChange(i, "cash_price", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Installation Price</Label>
                                  <Input type="number" min="0" step="0.01" value={toStringSafe(p.installation_price ?? "")} onChange={(e) => handleProductFieldChange(i, "installation_price", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>De-installation Price</Label>
                                  <Input type="number" min="0" step="0.01" value={toStringSafe(p.de_installation_price ?? "")} onChange={(e) => handleProductFieldChange(i, "de_installation_price", e.target.value)} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="quotation_subtotal">Quotation Subtotal</Label>
                    <Input id="quotation_subtotal" type="number" step="0.01" value={formData.quotation_subtotal} onChange={(e) => handleSubtotalChange(e.target.value)} readOnly={editableProducts.length > 0} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quotation_total_amount">Quotation Total *</Label>
                    <Input id="quotation_total_amount" type="number" step="0.01" value={formData.quotation_total_amount} readOnly />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="job_description">Job Description</Label>
                    <Textarea id="job_description" value={formData.job_description} onChange={(e) => updateFormField("job_description", e.target.value)} rows={3} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="work_notes">Work Notes</Label>
                    <Textarea id="work_notes" value={formData.work_notes} onChange={(e) => updateFormField("work_notes", e.target.value)} rows={3} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="completion_notes">Completion Notes</Label>
                    <Textarea id="completion_notes" value={formData.completion_notes} onChange={(e) => updateFormField("completion_notes", e.target.value)} rows={3} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="special_instructions">Special Instructions</Label>
                    <Textarea id="special_instructions" value={formData.special_instructions} onChange={(e) => updateFormField("special_instructions", e.target.value)} rows={3} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="customer_feedback">Customer Feedback</Label>
                    <Textarea id="customer_feedback" value={formData.customer_feedback} onChange={(e) => updateFormField("customer_feedback", e.target.value)} rows={2} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="w-5 h-5 text-green-600" /> Finalize and Invoice</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="order_number">Order Number</Label>
                    <Input id="order_number" value={formData.order_number} onChange={(e) => updateFormField("order_number", e.target.value)} placeholder="Order number (Optional)" />
                    <p className="text-sm text-gray-500">Optional. Leave blank if there is no order number yet.</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-2 font-medium text-blue-900">Final Review</h4>
                    <div className="grid grid-cols-1 gap-1 text-sm text-blue-900 md:grid-cols-2">
                      <p><strong>Job:</strong> {editingJob.job_number || editingJob.id}</p>
                      <p><strong>Client:</strong> {editingJob.customer_name || "N/A"}</p>
                      <p><strong>Account Code:</strong> {editingJob.new_account_number || "N/A"}</p>
                      <p><strong>Order Number:</strong> {formData.order_number || "Not set"}</p>
                      <p><strong>Vehicle:</strong> {formData.vehicle_registration || "Not set"}</p>
                      <p><strong>Total:</strong> {formData.quotation_total_amount ? `R ${formData.quotation_total_amount}` : "Not set"}</p>
                      <p><strong>Products:</strong> {editableProducts.length}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-900">
                    <p>This will update the job card details and generate an invoice using the document sequence.</p>
                  </div>
                  {finalizeError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                      <p className="font-medium">Error</p>
                      <p>{finalizeError}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditingJob(null); }} disabled={finalizing}>Cancel</Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button onClick={handleFinalizeClick} disabled={finalizing} className="bg-green-600 hover:bg-green-700">
                            {finalizing ? (
                              <><div className="mr-2 w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Finalizing...</>
                            ) : (
                              <><CheckCircle2 className="mr-2 w-4 h-4" /> Finalize and Invoice</>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Saves all job card changes and generates an invoice using the document sequence. The job will move to Invoiced status.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== INVOICE MODAL ===== */}
      <InvoiceJobModal
        job={editingJob}
        open={showFinalInvoiceModal}
        onOpenChange={setShowFinalInvoiceModal}
        onComplete={handleRefreshJobsAfterInvoice}
      />

      {/* ===== MOVE HISTORY DIALOG ===== */}
      <Dialog open={Boolean(moveHistoryJob)} onOpenChange={(open) => { if (!open) setMoveHistoryJob(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Move History — {moveHistoryJob?.job_number || ""}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const history = Array.isArray(moveHistoryJob?.move_history) ? moveHistoryJob.move_history : [];
            if (history.length === 0) {
              return (
                <div className="py-8 text-center text-sm text-slate-500">
                  No move history recorded for this job.
                </div>
              );
            }
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2 text-left">From</th>
                      <th className="px-3 py-2 text-left">To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {history.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                          {entry.moved_at ? new Date(entry.moved_at).toLocaleString("en-ZA") : "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{entry.user_email || entry.moved_by || "—"}</td>
                        <td className="px-3 py-2 text-slate-700">{formatRoleLabel(entry.from_role)}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{formatRoleLabel(entry.to_role)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Move Job to {pendingMoveDestination === "inv" ? "Stock Control" : pendingMoveDestination === "fc" ? "FC" : "Helpdesk"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Note *</Label>
              <Textarea
                value={moveNote}
                onChange={(e) => setMoveNote(e.target.value)}
                placeholder="Why are you moving this job?"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMoveDialog(false);
                  setPendingMoveJob(null);
                  setPendingMoveDestination("");
                  setPendingMovePayload(null);
                  setMoveNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!moveNote.trim()}
                onClick={() => {
                  if (pendingMoveJob && moveNote.trim()) {
                    handleMoveJob(pendingMoveJob, pendingMoveDestination, moveNote.trim(), pendingMovePayload || undefined);
                    setShowMoveDialog(false);
                    setPendingMoveJob(null);
                    setPendingMoveDestination("");
                    setPendingMovePayload(null);
                    setMoveNote("");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Move
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== JOB PROGRESS DIALOG ===== */}
      <ProgressDialog job={progressJob} onClose={() => setProgressJob(null)} />
    </div>
  );
}
