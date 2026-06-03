"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { buildTemporaryRegistration } from "@/lib/temp-registration";

const VAT_RATE = 0.15;
const BILLING_STATUS_KEYS = ["invoice"];

const toNumber = (value) => {
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (v) =>
  `R ${Number(v || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeBillingToken = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const parseQuotationProducts = (products) => {
  if (!products) return [];
  if (Array.isArray(products)) return products;
  if (typeof products === "string") {
    try {
      const parsed = JSON.parse(products);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
};

const isAdminOrRepairFallbackJob = (job) => {
  const normalizedJobType = normalizeBillingToken(job?.job_type || job?.quotation_job_type);
  const normalizedStatus = normalizeBillingToken(job?.status);
  return normalizedJobType === "repair" || normalizedJobType === "admincreated" || normalizedStatus === "admincreated";
};

const getAdminOrRepairFallbackSubtotal = (job) => {
  const candidates = [job?.quotation_total_amount, job?.actual_cost, job?.estimated_cost, job?.quotation_subtotal];
  for (const candidate of candidates) {
    const amount = toNumber(candidate);
    if (amount > 0) return amount;
  }
  return 0;
};

const isLabourProduct = (p) => {
  if (toNumber(p?.is_labour)) return true;
  const name = String(p?.name || "").toLowerCase();
  return name.includes("labour") || name.includes("labor");
};

const isAnnuityProduct = (product) =>
  !isLabourProduct(product) &&
  (toNumber(product?.rental_price) > 0 || toNumber(product?.rental_gross) > 0 ||
   toNumber(product?.subscription_price) > 0 || toNumber(product?.subscription_gross) > 0);

const getRecurringChargeAmount = (product, priceKey, grossKey) => {
  const priceAmount = toNumber(product?.[priceKey]);
  if (priceAmount > 0) return priceAmount;
  const grossAmount = toNumber(product?.[grossKey]);
  if (grossAmount > 0) return grossAmount;
  return 0;
};

const getRecurringMultiplier = (product) => {
  const raw = toNumber(product?.recurring_multiplier ?? product?.recurringMultiplier ?? 1);
  if (raw <= 0) return 1;
  return Math.max(1, Math.floor(raw));
};

const getAnnuitySelectionKey = (product) => {
  const parts = [product?.id, product?.code, product?.item_code, product?.name, product?.description, product?.type, product?.category, product?.vehicle_plate, product?.vehicle_id, product?.rental_price, product?.rental_gross, product?.subscription_price, product?.subscription_gross, product?.quantity];
  return parts.map((value) => String(value ?? "").trim().toLowerCase()).join("|");
};

const getAnnuitySelectionItems = (job, overrideProducts) => {
  const products = overrideProducts || parseQuotationProducts(job?.quotation_products);
  return products.map((product, index) => {
    if (isLabourProduct(product)) return null;
    const rentalAmount = getRecurringChargeAmount(product, "rental_price", "rental_gross");
    const subscriptionAmount = getRecurringChargeAmount(product, "subscription_price", "subscription_gross");
    if (rentalAmount <= 0 && subscriptionAmount <= 0) return null;
    const quantity = Math.max(1, toNumber(product?.quantity) || 1);
    return {
      key: getAnnuitySelectionKey(product),
      product,
      quantity,
      rentalAmount,
      subscriptionAmount,
      name: product?.name || product?.product || product?.description || `Item ${index + 1}`,
      vehiclePlate: product?.vehicle_plate || job?.vehicle_registration || job?.temporary_registration || "N/A",
    };
  }).filter(Boolean);
};

const getProductUnitPrice = (product, options = {}) => {
  const { includeRecurring = true } = options;
  const directPriceCandidates = includeRecurring
    ? [product?.unit_price, product?.subscription_price, product?.cash_price, product?.rental_price, product?.installation_price, product?.de_installation_price, product?.price]
    : [product?.unit_price, product?.cash_price, product?.installation_price, product?.de_installation_price, product?.price];
  const directUnitPrice = directPriceCandidates.map(toNumber).find((price) => price > 0);
  if (directUnitPrice) return directUnitPrice;
  const totalPriceCandidates = includeRecurring
    ? [product?.subscription_gross, product?.cash_gross, product?.rental_gross, product?.installation_gross, product?.de_installation_gross]
    : [product?.cash_gross, product?.installation_gross, product?.de_installation_gross];
  const totalPrice = totalPriceCandidates.map(toNumber).find((amount) => amount > 0) || 0;
  if (totalPrice > 0) {
    const qty = Math.max(1, toNumber(product?.quantity) || 1);
    return totalPrice / qty;
  }
  return 0;
};

const getProductChargeLines = (product, job, options = {}) => {
  const { includeRecurring = true, includeRecurringWhenMultiplierNotOne = false } = options;
  const qty = Math.max(1, toNumber(product?.quantity) || 1);
  const recurringMultiplier = getRecurringMultiplier(product);
  const shouldIncludeRecurring = includeRecurring || (includeRecurringWhenMultiplierNotOne && recurringMultiplier !== 1);
  const jobType = String(job?.job_type || job?.quotation_job_type || "").toLowerCase();
  const lines = [];
  const addLine = (grossKey, priceKey, label, multiplier = 1) => {
    const amount = toNumber(product?.[grossKey]) || toNumber(product?.[priceKey]);
    if (amount <= 0) return;
    const unitPrice = amount * Math.max(1, toNumber(multiplier) || 1);
    lines.push({ key: priceKey, label, qty, unitPrice, subtotal: unitPrice * qty });
  };
  const isDeinstall = jobType.includes("deinstall") || jobType.includes("de-install") || jobType.includes("decomm");
  if (isDeinstall && !isLabourProduct(product)) return [];
  if (shouldIncludeRecurring && !isLabourProduct(product)) {
    const recurringLabelSuffix = recurringMultiplier !== 1 ? ` (${recurringMultiplier}x)` : "";
    addLine("subscription_gross", "subscription_price", `Subscription${recurringLabelSuffix}`, recurringMultiplier);
    addLine("rental_gross", "rental_price", `Rental${recurringLabelSuffix}`, recurringMultiplier);
  }
  const hasRecurringCharge = toNumber(product?.rental_price) > 0 || toNumber(product?.rental_gross) > 0 || toNumber(product?.subscription_price) > 0 || toNumber(product?.subscription_gross) > 0;
  if (!hasRecurringCharge) addLine("cash_gross", "cash_price", "Cash");
  if (!isDeinstall) addLine("installation_gross", "installation_price", "Installation");
  if (isDeinstall) addLine("de_installation_gross", "de_installation_price", "De-Installation");
  if (lines.length === 0 && isLabourProduct(product)) {
    const amount = toNumber(product?.total_price) || toNumber(product?.subscription_gross) || toNumber(product?.subscription_price) || toNumber(product?.rental_gross) || toNumber(product?.rental_price);
    if (amount > 0) lines.push({ key: "labour", label: "Labour", qty, unitPrice: amount, subtotal: amount * qty });
  }
  if (lines.length === 0) { addLine("price", "price", "Price"); addLine("unit_price", "unit_price", "Unit Price"); }
  if (lines.length === 0) {
    const fallbackUnitPrice = getProductUnitPrice(product, { includeRecurring: true });
    lines.push({ key: "fallback", label: "Charge", qty, unitPrice: fallbackUnitPrice, subtotal: fallbackUnitPrice * qty });
  }
  return lines;
};

const getInvoiceVehicles = (job) => {
  const products = parseQuotationProducts(job?.quotation_products);
  const plates = products.map((product) => product?.vehicle_plate).filter((plate) => typeof plate === "string" && plate.trim().length > 0).map((plate) => plate.trim());
  const fallbackReg = getInvoiceRegistrationFallback(job);
  const regs = Array.from(new Set([...plates, fallbackReg].filter(Boolean)));
  const make = (job?.vehicle_make || "").trim();
  const model = (job?.vehicle_model || "").trim();
  return regs.map((reg) => ({ reg, make: make || null, model: model || null, year: job?.vehicle_year || null, company: job?.customer_name || null }));
};

const getInvoiceTotals = (job, overrideProducts) => {
  const products = overrideProducts || parseQuotationProducts(job?.quotation_products);
  const computedSubtotal = products.reduce((sum, product) => {
    const chargeLines = getProductChargeLines(product, job, { includeRecurring: false, includeRecurringWhenMultiplierNotOne: true }).filter((chargeLine) => toNumber(chargeLine?.unitPrice) >= 0);
    if (chargeLines.length > 0) {
      return sum + chargeLines.reduce((lineSum, chargeLine) => lineSum + toNumber(chargeLine.subtotal), 0);
    }
    const qty = Math.max(1, toNumber(product?.quantity) || 1);
    const unitPrice = getProductUnitPrice(product, { includeRecurring: false });
    return sum + unitPrice * qty;
  }, 0);
  const subtotal = products.length > 0 ? computedSubtotal : toNumber(job?.quotation_subtotal);
  const vat = Number((subtotal * VAT_RATE).toFixed(2));
  const total = Number((subtotal + vat).toFixed(2));
  return { products, subtotal, vat, total };
};

const getInvoiceRegistrationFallback = (job) =>
  String(job?.vehicle_registration?.trim() || job?.temporary_registration?.trim() || buildTemporaryRegistration(job?.id, job?.job_number, job?.quotation_number, job?.new_account_number) || "N/A").trim();

const getLocalDateInputValue = (dateValue = new Date()) => {
  const localDate = new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const fetchLatestJobCard = async (job) => {
  if (!job?.id) return job;
  try {
    const response = await fetch(`/api/job-cards/${encodeURIComponent(job.id)}`, { cache: "no-store" });
    if (!response.ok) return job;
    const latestJob = await response.json();
    return latestJob?.id ? { ...job, ...latestJob } : job;
  } catch { return job; }
};

const resolveAccountNumber = async (job) => {
  if (!job) return "";
  const existing = String(job?.new_account_number || "").trim();
  if (existing) return existing;
  const reg = String(job?.vehicle_registration || "").trim();
  if (!reg) return "";
  try {
    const response = await fetch("/api/vehicles/find-account", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reg }),
    });
    if (!response.ok) return "";
    const result = await response.json();
    if (result?.found && result?.new_account_number) {
      const accountNumber = String(result.new_account_number).trim();
      try {
        await fetch(`/api/job-cards/${job.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_account_number: accountNumber, ...(result.company ? { customer_name: result.company } : {}) }),
        });
      } catch { /* ignore */ }
      return accountNumber;
    }
  } catch { /* ignore */ }
  return "";
};

const hasStoredInvoice = (job) => {
  const topLevelInvoiceNumber = String(job?.invoice_number || "").trim();
  if (topLevelInvoiceNumber) return true;
  const inlineInvoiceNumber = String(job?.invoice?.invoice_number || "").trim();
  if (inlineInvoiceNumber) return true;
  const invoiceStatus = job?.billing_statuses?.invoice;
  return Boolean(invoiceStatus && typeof invoiceStatus === "object" && (invoiceStatus.invoice_id || invoiceStatus.invoice_number));
};

const isOnceOffItemJob = (job) => {
  const normalizeJobToken = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const jobType = normalizeJobToken(job?.job_type);
  const quotationJobType = normalizeJobToken(job?.quotation_job_type);
  if (jobType.includes("itembilling") || quotationJobType.includes("itembilling") || jobType.includes("onceoffitem") || quotationJobType.includes("onceoffitem")) return true;
  const products = parseQuotationProducts(job?.quotation_products);
  if (!products.length) return false;
  return products.some((product) => {
    const normalizedId = normalizeJobToken(product?.id);
    const normalizedCode = normalizeJobToken(product?.code || product?.item_code);
    const normalizedName = normalizeJobToken(product?.name);
    const normalizedDescription = normalizeJobToken(product?.description);
    const normalizedCategory = normalizeJobToken(product?.category);
    const normalizedType = normalizeJobToken(product?.type);
    const hasOnceOffMarker = normalizedId.includes("itembilling") || normalizedId.includes("itembilled") || normalizedCode.includes("itembilled") || normalizedName.includes("onceoffitem") || normalizedDescription.includes("onceoffitem");
    if (hasOnceOffMarker) return true;
    return normalizedCategory === "billing" && normalizedType === "service" && Boolean(product?.is_labour);
  });
};

export default function InvoiceJobModal({ job, open, onOpenChange, onComplete, editedProducts: externalEditedProducts }) {
  const latestJobRef = useRef(null);
  const [billingInvoiceDate, setBillingInvoiceDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [invoiceFormData, setInvoiceFormData] = useState({
    clientName: "", clientEmail: "", clientPhone: "", clientAddress: "", paymentTerms: "30 days", dueDate: "", notes: "",
  });
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [storedInvoiceRecord, setStoredInvoiceRecord] = useState(null);
  const [selectedCostCenterInfo, setSelectedCostCenterInfo] = useState(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [annuitySelectableItems, setAnnuitySelectableItems] = useState([]);
  const [selectedAnnuityItemKeys, setSelectedAnnuityItemKeys] = useState([]);

  const resetInvoiceForm = useCallback(() => {
    setInvoiceFormData({ clientName: "", clientEmail: "", clientPhone: "", clientAddress: "", paymentTerms: "30 days", dueDate: "", notes: "" });
    setGeneratedInvoice(null);
    setStoredInvoiceRecord(null);
    setSelectedCostCenterInfo(null);
    setAnnuitySelectableItems([]);
    setSelectedAnnuityItemKeys([]);
    setBillingInvoiceDate(new Date().toLocaleDateString("en-CA"));
  }, []);

  useEffect(() => {
    if (open && job) {
      (async () => {
        const latestJob = await fetchLatestJobCard(job);
        if (isAdminOrRepairFallbackJob(latestJob) && latestJob.vehicle_registration) {
          try {
            const regRaw = String(latestJob.vehicle_registration).trim();
            const regEnc = encodeURIComponent(regRaw);
            let foundAccountNumber = "";
            let foundCompany = "";
            let foundEmail = "";
            let foundPhone = "";
            let foundAddress = "";
            const vipResp = await fetch(`/api/vehicles-ip?registration=${regEnc}`);
            if (vipResp.ok) {
              const vipData = await vipResp.json();
              if (vipData.vehicles && vipData.vehicles.length > 0) {
                const v = vipData.vehicles[0];
                foundAccountNumber = v.new_account_number || "";
                foundCompany = v.company || "";
                foundEmail = v.email || "";
                foundPhone = v.cell_no || v.switchboard || "";
                foundAddress = v.physical_address || "";
              }
            }
            if (!foundAccountNumber) {
              const faResp = await fetch("/api/vehicles/find-account", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reg: regRaw }),
              });
              if (faResp.ok) {
                const faData = await faResp.json();
                if (faData?.found && faData?.new_account_number) {
                  foundAccountNumber = faData.new_account_number;
                  foundCompany = faData.company || "";
                  const custResp = await fetch(`/api/customers/${encodeURIComponent(foundAccountNumber)}`);
                  if (custResp.ok) {
                    const custData = await custResp.json();
                    const c = custData?.customer;
                    if (c) {
                      foundCompany = c.company || foundCompany;
                      foundEmail = c.email || "";
                      foundPhone = c.cell_no || c.landline_no || c.switchboard || "";
                      foundAddress = c.physical_address || c.address || "";
                    }
                  }
                }
              }
            }
            if (foundAccountNumber) {
              try {
                const ccResp = await fetch(`/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(foundAccountNumber)}`);
                if (ccResp.ok) {
                  const ccData = await ccResp.json();
                  const costCenter = Array.isArray(ccData?.costCenters) && ccData.costCenters.find((c) => String(c?.cost_code || "").trim().toUpperCase() === foundAccountNumber.toUpperCase());
                  if (costCenter) {
                    foundCompany = costCenter.company || costCenter.legal_name || foundCompany;
                    foundAddress = [costCenter.physical_address_1, costCenter.physical_address_2, costCenter.physical_address_3, costCenter.physical_area, costCenter.physical_code].map((v) => String(v || "").trim()).filter(Boolean).join("\n") || foundAddress;
                  }
                }
              } catch { /* ignore */ }
            }
            if (foundAccountNumber) latestJob.new_account_number = foundAccountNumber;
            if (foundCompany) latestJob.customer_name = foundCompany;
            if (foundEmail) latestJob.customer_email = foundEmail;
            if (foundPhone) latestJob.customer_phone = foundPhone;
            if (foundAddress) latestJob.customer_address = foundAddress;
          } catch { /* ignore */ }
        }
        latestJobRef.current = latestJob;
        const annuityItems = getAnnuitySelectionItems(latestJob, externalEditedProducts);
        setGeneratedInvoice(null);
        setStoredInvoiceRecord(null);
        setSelectedCostCenterInfo(null);
        setAnnuitySelectableItems(annuityItems);
        setSelectedAnnuityItemKeys(annuityItems.map((item) => item.key));
        setBillingInvoiceDate(new Date().toLocaleDateString("en-CA"));
        setInvoiceFormData({
          clientName: latestJob.customer_name || "",
          clientEmail: latestJob.customer_email || "",
          clientPhone: latestJob.customer_phone || "",
          clientAddress: "",
          paymentTerms: "30 days",
          dueDate: getLocalDateInputValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          notes: [latestJob.quote_notes, latestJob.work_notes, latestJob.completion_notes].filter(Boolean).join("\n"),
        });
      })();
    }
  }, [open, job]);

  useEffect(() => {
    if (!open || !job) return;
    let cancelled = false;
    const accountNumber = String(job?.new_account_number || "").trim();
    if (!accountNumber) return;
    (async () => {
      try {
        const response = await fetch(`/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(accountNumber)}`);
        if (!response.ok) throw new Error("Failed to fetch cost center info");
        const result = await response.json();
        const matchedCostCenter = Array.isArray(result?.costCenters) ? result.costCenters.find((item) => String(item?.cost_code || "").trim().toUpperCase() === accountNumber.toUpperCase()) : null;
        if (!cancelled) setSelectedCostCenterInfo(matchedCostCenter || null);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [open, job]);

  const toggleAnnuityItemSelection = (itemKey) => {
    setSelectedAnnuityItemKeys((prev) => prev.includes(itemKey) ? prev.filter((v) => v !== itemKey) : [...prev, itemKey]);
  };

  const selectAllAnnuityItems = () => {
    setSelectedAnnuityItemKeys(annuitySelectableItems.map((item) => item.key));
  };

  const clearAllAnnuityItems = () => {
    setSelectedAnnuityItemKeys([]);
  };

  const getSelectedInvoiceAccountNumber = () =>
    String(job?.new_account_number || storedInvoiceRecord?.account_number || selectedCostCenterInfo?.cost_code || "").trim();

  const buildClientAddress = (costCenterInfo, fallbackAddress) => {
    const addressParts = [costCenterInfo?.physical_address_1, costCenterInfo?.physical_address_2, costCenterInfo?.physical_address_3, costCenterInfo?.physical_area, costCenterInfo?.physical_province, costCenterInfo?.physical_code]
      .map((value) => String(value || "").trim()).filter(Boolean);
    return addressParts.length > 0 ? addressParts.join("\n") : fallbackAddress || "No address provided";
  };

  const buildCompletedJobInvoiceView = () => {
    const effectiveJob = latestJobRef.current || job;
    if (!effectiveJob) return null;
    const isOnceOffItemInvoice = isOnceOffItemJob(effectiveJob);
    const hideRegistrationColumns = isOnceOffItemInvoice;
    const hideItemCodeColumn = isOnceOffItemInvoice;
    const hideAccountColumn = isOnceOffItemInvoice;
    const rawTotals = getInvoiceTotals(effectiveJob, externalEditedProducts);
    const invoiceVehicles = getInvoiceVehicles(effectiveJob);
    const vehicleSummary = invoiceVehicles.length > 0 ? invoiceVehicles.map((vehicle) => vehicle.reg).filter(Boolean).join(", ") : "N/A";
    const invoiceNumber = storedInvoiceRecord?.invoice_number || generatedInvoice?.invoiceNumber || "PENDING";
    const invoiceDate = storedInvoiceRecord?.invoice_date || generatedInvoice?.generatedAt || billingInvoiceDate || new Date().toISOString();
    const orderNumber = latestJobRef.current?.order_number || job.order_number || "N/A";
    const defaultClientName = selectedCostCenterInfo?.company || selectedCostCenterInfo?.legal_name || storedInvoiceRecord?.client_name || invoiceFormData.clientName || effectiveJob.customer_name || "N/A";
    const effectiveClientName = defaultClientName;
    const isDeinstallJob = (() => {
      const raw = String(effectiveJob?.job_type || effectiveJob?.quotation_job_type || "").toLowerCase();
      return raw.includes("deinstall") || raw.includes("de-install") || raw.includes("decomm");
    })();
    const productRows = rawTotals.products.length > 0
      ? rawTotals.products.flatMap((product, index) => {
          const chargeLines = getProductChargeLines(product, effectiveJob, { includeRecurring: false, includeRecurringWhenMultiplierNotOne: true });
          const validLines = chargeLines.filter((chargeLine) => toNumber(chargeLine?.unitPrice) >= 0);
          if (validLines.length > 0) {
            return validLines.map((chargeLine) => {
              const lineVat = Number((chargeLine.subtotal * VAT_RATE).toFixed(2));
              const lineTotal = Number((chargeLine.subtotal + lineVat).toFixed(2));
              const productName = String(product?.name || product?.item_code || "").trim();
              const lineLabel = productName ? `${productName} - ${chargeLine.label}` : chargeLine.label;
              const productDescription = String(product?.description || "").trim();
              const resolvedDescription = productDescription || productName || lineLabel || product?.category || "-";
              return {
                key: `${product?.id || product?.name || product?.item_code || "item"}-${chargeLine.key}-${index}`,
                previousReg: hideRegistrationColumns ? "" : product?.vehicle_plate || vehicleSummary || "N/A",
                newReg: hideRegistrationColumns ? "" : product?.vehicle_plate || vehicleSummary || "N/A",
                itemCode: chargeLine.label,
                description: resolvedDescription,
                comments: lineLabel,
                qty: chargeLine.qty,
                unitPrice: chargeLine.unitPrice,
                vatPercent: "15.00%",
                vatAmount: lineVat,
                totalIncl: lineTotal,
              };
            });
          }
          if (isAnnuityProduct(product) && !isDeinstallJob) {
            const productName = String(product?.name || product?.item_code || "").trim();
            const productDescription = String(product?.description || "").trim();
            const resolvedDescription = productDescription || productName || "-";
            const qty = Math.max(1, toNumber(product?.quantity) || 1);
            return {
              key: `${product?.id || product?.name || product?.item_code || "item"}-annuity-${index}`,
              previousReg: hideRegistrationColumns ? "" : product?.vehicle_plate || vehicleSummary || "N/A",
              newReg: hideRegistrationColumns ? "" : product?.vehicle_plate || vehicleSummary || "N/A",
              itemCode: "Annuity",
              description: resolvedDescription,
              comments: `Annuity - ${productName}`,
              qty,
              unitPrice: 0,
              vatPercent: "0.00%",
              vatAmount: 0,
              totalIncl: 0,
            };
          }
          return [];
        })
      : Array.isArray(storedInvoiceRecord?.line_items) && storedInvoiceRecord.line_items.length > 0
        ? storedInvoiceRecord.line_items.filter((item) => toNumber(item?.unit_price) >= 0).map((item, index) => ({
            key: `${item?.item_code || item?.description || "item"}-${index}`,
            previousReg: hideRegistrationColumns ? "" : item?.previous_reg || vehicleSummary || "N/A",
            newReg: hideRegistrationColumns ? "" : item?.new_reg || item?.previous_reg || vehicleSummary || "N/A",
            itemCode: item?.item_code || "Item",
            description: item?.description || item?.item_code || "-",
            comments: item?.comments || "",
            qty: Math.max(1, toNumber(item?.quantity) || 1),
            unitPrice: toNumber(item?.unit_price),
            vatPercent: item?.vat_percent || "0.00%",
            vatAmount: toNumber(item?.vat_amount),
            totalIncl: toNumber(item?.total_incl),
          }))
        : [{
            key: "fallback-row",
            previousReg: hideRegistrationColumns ? "" : vehicleSummary || "N/A",
            newReg: hideRegistrationColumns ? "" : vehicleSummary || "N/A",
            itemCode: isAdminOrRepairFallbackJob(effectiveJob) && normalizeBillingToken(effectiveJob?.job_type || effectiveJob?.quotation_job_type) === "repair" ? "REPAIR" : isAdminOrRepairFallbackJob(effectiveJob) ? "ADMIN" : effectiveJob.job_type || "Service",
            description: isAdminOrRepairFallbackJob(effectiveJob) ? (() => {
              const normalizedType = normalizeBillingToken(effectiveJob?.job_type || effectiveJob?.quotation_job_type);
              return normalizedType === "repair" || normalizedType === "admincreated" ? "Repair Job Charge" : "Admin Job Charge";
            })() : effectiveJob.job_description || "Job completion",
            comments: effectiveJob.completion_notes || effectiveJob.work_notes || "",
            qty: 1,
            unitPrice: rawTotals.subtotal,
            vatPercent: "15.00%",
            vatAmount: rawTotals.vat,
            totalIncl: rawTotals.total,
          }];
    const annuityRows = (annuitySelectableItems || [])
      .filter((item) => selectedAnnuityItemKeys.includes(item.key))
      .map((item, idx) => ({
        key: `annuity-item-${idx}`,
        previousReg: hideRegistrationColumns ? "" : item.vehiclePlate || vehicleSummary || "N/A",
        newReg: hideRegistrationColumns ? "" : item.vehiclePlate || vehicleSummary || "N/A",
        itemCode: "Annuity",
        description: item.name || "Annuity Item",
        comments: `Annuity - ${item.name}`,
        qty: item.quantity || 1,
        unitPrice: 0,
        vatPercent: "0.00%",
        vatAmount: 0,
        totalIncl: 0,
      }));
    const rows = [...productRows, ...annuityRows];
    const totals = rows.reduce((acc, row) => {
      acc.subtotal += row.unitPrice * row.qty;
      acc.vat += row.vatAmount;
      acc.total += row.totalIncl;
      return acc;
    }, { subtotal: 0, vat: 0, total: 0, discount: 0 });
    const displayTotals = rawTotals.subtotal > 0
      ? { subtotal: rawTotals.subtotal, vat: rawTotals.vat, total: rawTotals.total, discount: 0 }
      : totals;
    return {
      invoiceNumber, invoiceDate: formatDate(invoiceDate), orderNumber, clientName: effectiveClientName,
      clientEmail: storedInvoiceRecord?.client_email || invoiceFormData.clientEmail || effectiveJob.customer_email || "No email provided",
      clientPhone: storedInvoiceRecord?.client_phone || invoiceFormData.clientPhone || effectiveJob.customer_phone || "No phone provided",
      clientAddress: buildClientAddress(selectedCostCenterInfo, storedInvoiceRecord?.client_address || invoiceFormData.clientAddress || effectiveJob.customer_address),
      accountNumber: getSelectedInvoiceAccountNumber() || "N/A",
      customerVatNumber: selectedCostCenterInfo?.vat_number || selectedCostCenterInfo?.vat_exempt_number || storedInvoiceRecord?.customer_vat_number || "-",
      companyRegistrationNumber: selectedCostCenterInfo?.registration_number || storedInvoiceRecord?.company_registration_number || "-",
      notes: storedInvoiceRecord?.notes || invoiceFormData.notes || effectiveJob.special_instructions || "No special instructions.",
      hideAccountColumn, hideRegistrationColumns, hideItemCodeColumn, totals: displayTotals, rows,
    };
  };

  const buildCompletedJobInvoiceHtml = (invoiceView) => {
    if (!invoiceView) return "";
    const includeAccountColumn = !invoiceView.hideAccountColumn;
    const includeRegistrationColumns = !invoiceView.hideRegistrationColumns;
    const includeItemCodeColumn = !invoiceView.hideItemCodeColumn;
    const boxTableColgroup = includeAccountColumn
      ? '<col style="width:12.5%" /><col style="width:40.5%" /><col style="width:14%" /><col style="width:33%" />'
      : '<col style="width:57%" /><col style="width:18%" /><col style="width:25%" />';

    let lineTableColgroup;
    if (includeRegistrationColumns && includeItemCodeColumn) {
      lineTableColgroup = '<col style="width:10%" /><col style="width:13%" /><col style="width:15%" /><col style="width:16%" /><col style="width:10%" /><col style="width:5%" /><col style="width:8.5%" /><col style="width:7%" /><col style="width:5%" /><col style="width:10.5%" />';
    } else if (includeRegistrationColumns) {
      lineTableColgroup = '<col style="width:11%" /><col style="width:14%" /><col style="width:20%" /><col style="width:14%" /><col style="width:6.5%" /><col style="width:10.5%" /><col style="width:8.5%" /><col style="width:5.5%" /><col style="width:10%" />';
    } else if (includeItemCodeColumn) {
      lineTableColgroup = '<col style="width:17%" /><col style="width:23%" /><col style="width:16%" /><col style="width:8%" /><col style="width:14%" /><col style="width:10%" /><col style="width:6%" /><col style="width:10%" />';
    } else {
      lineTableColgroup = '<col style="width:28%" /><col style="width:24%" /><col style="width:8%" /><col style="width:14%" /><col style="width:10%" /><col style="width:6%" /><col style="width:10%" />';
    }

    const spacerColspan = 7 + (includeRegistrationColumns ? 2 : 0) + (includeItemCodeColumn ? 1 : 0);

    const rowsHtml = invoiceView.rows.map((row) =>
      `<tr>${includeRegistrationColumns ? `<td>${escapeHtml(row.previousReg)}</td><td>${escapeHtml(row.newReg)}</td>` : ""}${includeItemCodeColumn ? `<td>${escapeHtml(row.itemCode)}</td>` : ""}<td>${escapeHtml(row.description)}</td><td>${escapeHtml(row.comments)}</td><td class="text-center">${escapeHtml(row.qty)}</td><td class="text-right">${escapeHtml(row.unitPrice.toFixed(2))}</td><td class="text-right">${escapeHtml(row.vatAmount.toFixed(2))}</td><td class="text-center">${escapeHtml(row.vatPercent)}</td><td class="text-right">${escapeHtml(row.totalIncl.toFixed(2))}</td></tr>`
    ).join("");

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Invoice</title><style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      html,body{margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#000}
      body{padding:0}
      .page{width:100%;max-width:980px;margin:0 auto;padding:0 18px 26px;background:#fff}
      .top{display:grid;grid-template-columns:1fr 1fr;align-items:start;margin-top:2px}
      .logo{width:210px;height:auto;margin-top:18px}
      .company-right{text-align:center;font-size:18px;line-height:1.35;font-weight:700}
      .company-right div{margin-top:10px;font-weight:400}
      .rule{border-top:2px solid #bcbcbc;margin:12px 24px 8px}
      .title{text-align:center;font-size:21px;font-weight:700;margin:6px 0 34px}
      .invoice-party-row{display:grid;grid-template-columns:1.45fr 0.85fr;gap:24px;min-height:150px;margin-bottom:26px}
      .invoice-client-block{display:flex;flex-direction:column;gap:14px}
      .invoice-client-name{font-weight:700;font-size:18px}
      .invoice-client-address{white-space:pre-line;font-size:15px;line-height:1.5}
      .invoice-meta{display:grid;grid-template-columns:auto 1fr;gap:18px 14px;align-content:start}
      .invoice-meta-label,.invoice-meta-value{font-weight:700;font-size:18px}
      .box-table,.line-table,.totals-table,.footer-table{width:calc(100% - 48px);margin:0 24px;border-collapse:collapse;table-layout:fixed}
      .box-table th,.box-table td,.totals-table td,.footer-table td{border:2px solid #505050}
      .box-table{margin-top:8px}
      .box-table th{font-size:12px;font-weight:700;text-align:center;padding:4px 4px}
      .box-table td{font-size:14px;text-align:center;padding:6px 4px}
      .line-table{margin-top:16px}
      .line-table thead{border-top:2px solid #505050;border-bottom:2px solid #505050}
      .line-table th{background:#d6d6d6;font-size:11px;font-weight:700;text-align:left;padding:4px 3px;white-space:nowrap;border:0}
      .line-table td{font-size:11px;padding:3px 3px;vertical-align:top;border:0}
      .line-table tbody tr:nth-child(even) td{background:#dcdcdc}
      .line-table .text-right{text-align:right}
      .line-table .text-center{text-align:center}
      .line-table .spacer td{height:168px;background:#fff!important;border-bottom:0}
      .bottom-row{display:grid;grid-template-columns:1.15fr 0.85fr;gap:24px;align-items:start;margin:16px 24px 0}
      .notes{font-size:14px;white-space:pre-line}
      .notes strong{font-size:16px}
      .totals-table td{font-size:14px;padding:8px 8px}
      .totals-table .label{font-weight:700;width:58%}
      .totals-table .value{text-align:right;width:42%}
      .totals-table .grand td{font-size:16px;font-weight:700}
      .footer-table{margin-top:86px}
      .footer-table td{vertical-align:top;height:136px;padding:8px 10px;font-size:12px;line-height:1.5}
      .footer-table strong{display:block;margin-bottom:18px;font-size:12px}
      .powered{text-align:right;color:#777;font-size:12px;margin:56px 36px 0 0}
      @page{size:A4 portrait;margin:0}
    </style></head><body>
    <div class="page">
      <div class="top">
        <div><img class="logo" src="${origin}/soltrack_logo.png" alt="Soltrack" /></div>
        <div class="company-right">Soltrack (PTY) LTD<div>Reg No: 2018/095975/07</div><div>VAT No.: 4580161802</div></div>
      </div>
      <div class="rule"></div>
      <div class="title">TAX INVOICE</div>
      <div class="invoice-party-row">
        <div class="invoice-client-block">
          <div class="invoice-client-name">${escapeHtml(invoiceView.clientName)}</div>
          <div class="invoice-client-address"><strong>Company Reg:</strong> ${escapeHtml(invoiceView.companyRegistrationNumber)}</div>
          <div class="invoice-client-address">${escapeHtml(invoiceView.clientAddress)}</div>
        </div>
        <div class="invoice-meta">
          <div class="invoice-meta-label">TAX INVOICE :</div>
          <div class="invoice-meta-value">${escapeHtml(invoiceView.invoiceNumber)}</div>
          <div class="invoice-meta-label">Date:</div>
          <div class="invoice-meta-value">${escapeHtml(invoiceView.invoiceDate)}</div>
          <div class="invoice-meta-label">Order Number:</div>
          <div class="invoice-meta-value">${escapeHtml(invoiceView.orderNumber)}</div>
        </div>
      </div>
      <table class="box-table"><colgroup>${boxTableColgroup}</colgroup>
        <thead><tr>${includeAccountColumn ? "<th>Account</th>" : ""}<th>Your Reference</th><th>VAT %</th><th>Customer Vat Number</th></tr></thead>
        <tbody><tr>${includeAccountColumn ? `<td>${escapeHtml(invoiceView.accountNumber)}</td>` : ""}<td>${escapeHtml(invoiceView.clientName)}</td><td>VAT 15%</td><td>${escapeHtml(invoiceView.customerVatNumber)}</td></tr></tbody>
      </table>
      <table class="line-table"><colgroup>${lineTableColgroup}</colgroup>
        <thead><tr>${includeRegistrationColumns ? "<th>Previous Reg</th><th>New Reg</th>" : ""}${includeItemCodeColumn ? "<th>Item Code</th>" : ""}<th>Description</th><th>Comments</th><th class=\"text-center\">Units</th><th class=\"text-right\">Unit Price</th><th class=\"text-right\">Vat</th><th class=\"text-center\">Vat%</th><th class=\"text-right\">Total Incl</th></tr></thead>
        <tbody>${rowsHtml}<tr class="spacer"><td colspan="${spacerColspan}"></td></tr></tbody>
      </table>
      <div class="bottom-row">
        <div class="notes"><strong>Notes:</strong> ${escapeHtml(invoiceView.notes)}</div>
        <table class="totals-table"><tbody>
          <tr><td class="label">Total Ex. VAT</td><td class="value">R ${escapeHtml(invoiceView.totals.subtotal.toFixed(2))}</td></tr>
          <tr><td class="label">Discount</td><td class="value">R ${escapeHtml(invoiceView.totals.discount.toFixed(2))}</td></tr>
          <tr><td class="label">VAT</td><td class="value">R ${escapeHtml(invoiceView.totals.vat.toFixed(2))}</td></tr>
          <tr class="grand"><td class="label">Total Incl. VAT</td><td class="value">R ${escapeHtml(invoiceView.totals.total.toFixed(2))}</td></tr>
        </tbody></table>
      </div>
      <table class="footer-table"><colgroup><col style="width:35%" /><col style="width:19%" /><col style="width:26%" /><col style="width:20%" /></colgroup>
        <tbody><tr>
          <td><strong>Head Office:</strong><div>8 Viscount Road</div><div>Viscount office park, Block C unit 4 & 5</div><div>Bedfordview, 2008</div></td>
          <td><strong>Postal Address:</strong><div>P.O Box 95603</div><div>Grant Park 2051</div></td>
          <td><strong>Contact Details</strong><div><strong style="display:inline;margin:0;font-size:12px;">Phone:</strong> 011 824 0066</div><div><strong style="display:inline;margin:0;font-size:12px;">Email:</strong> accounts@soltrack.co.za</div><div><strong style="display:inline;margin:0;font-size:12px;">Website:</strong> www.soltrack.co.za</div></td>
          <td><strong>Soltrack (PTY) LTD</strong><div>Nedbank Northrand</div><div>Code - 146905</div><div>A/C No. - 1469109069</div></td>
        </tr></tbody>
      </table>
    </div></body></html>`;
  };

  const getInvoiceVehicleRegistrationDisplay = (job) => getInvoiceRegistrationFallback(job);

  const generateInvoice = async () => {
    const effectiveJob = latestJobRef.current || job;
    if (!effectiveJob) return;
    setIsGeneratingInvoice(true);
    try {
      let effectiveAccountNumber = String(effectiveJob?.new_account_number || selectedCostCenterInfo?.cost_code || "").trim();
      if (!effectiveAccountNumber) {
        const reg = String(effectiveJob?.vehicle_registration || "").trim();
        if (!reg) {
          toast.error("Job has no vehicle registration to look up a cost center");
          return;
        }
        effectiveAccountNumber = await resolveAccountNumber(effectiveJob);
        if (!effectiveAccountNumber) {
          toast.error("Vehicle not found, please add it.");
          return;
        }
      }
      const jobForVehicleSync = effectiveAccountNumber ? { ...effectiveJob, new_account_number: effectiveAccountNumber } : effectiveJob;
      const invoicePreview = buildCompletedJobInvoiceView();
      const lineItems = (invoicePreview?.rows || []).map((row) => ({
        previous_reg: row.previousReg, new_reg: row.newReg, item_code: row.itemCode,
        description: row.description, comments: row.comments, quantity: row.qty,
        unit_price: row.unitPrice, vat_percent: row.vatPercent, vat_amount: row.vatAmount, total_incl: row.totalIncl,
      }));
      const invoiceCreateResponse = await fetch("/api/invoices/job-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobCardId: effectiveJob.id, jobNumber: effectiveJob.job_number, quotationNumber: effectiveJob.quotation_number,
          accountNumber: effectiveAccountNumber, invoiceDate: billingInvoiceDate,
          clientName: invoiceFormData.clientName || effectiveJob.customer_name,
          clientEmail: invoiceFormData.clientEmail || effectiveJob.customer_email,
          clientPhone: invoiceFormData.clientPhone || effectiveJob.customer_phone,
          clientAddress: invoiceFormData.clientAddress || effectiveJob.customer_address,
          dueDate: invoiceFormData.dueDate, paymentTerms: invoiceFormData.paymentTerms,
          notes: invoiceFormData.notes || effectiveJob.special_instructions || "No special instructions.",
          subtotal: invoicePreview?.totals?.subtotal || 0, vatAmount: invoicePreview?.totals?.vat || 0,
          discountAmount: invoicePreview?.totals?.discount || 0, totalAmount: invoicePreview?.totals?.total || 0, lineItems,
        }),
      });
      const invoiceCreateResult = await invoiceCreateResponse.json().catch(() => ({}));
      if (!invoiceCreateResponse.ok) throw new Error(invoiceCreateResult?.details || invoiceCreateResult?.error || "Failed to create invoice");
      const invoiceRecord = invoiceCreateResult?.invoice;
      const invoiceNumber = invoiceRecord?.invoice_number;
      if (!invoiceRecord || !invoiceNumber) throw new Error("Invoice record was not returned");
      const invoiceData = {
        invoiceNumber, jobNumber: effectiveJob.job_number, clientInfo: invoiceFormData, jobDetails: effectiveJob,
        generatedAt: invoiceRecord.invoice_date || new Date().toISOString(),
        pdfUrl: invoiceRecord.pdf_url || `#invoice-${invoiceNumber}`, invoiceId: invoiceRecord.id,
      };
      setGeneratedInvoice(invoiceData);
      setStoredInvoiceRecord(invoiceRecord);
      const deferredActions = [];
      const syncWarnings = [];
      if (effectiveAccountNumber) {
        const products = parseQuotationProducts(effectiveJob.quotation_products);
        const selectedAnnuityKeys = new Set(selectedAnnuityItemKeys);
        const selectedAnnuityProducts = annuitySelectableItems.filter((item) => selectedAnnuityKeys.has(item.key)).map((item) => item.product);
        if (products.length > 0) {
          const billingResponse = await fetch("/api/vehicles/apply-quote-billing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cost_code: effectiveAccountNumber, job_card_id: effectiveJob.id, job_number: effectiveJob.job_number,
              job_type: effectiveJob.job_type || effectiveJob.quotation_job_type, quotation_number: effectiveJob.quotation_number,
              invoice_number: invoiceNumber, quotation_products: products,
              selected_annuity_products: selectedAnnuityProducts,
              selected_annuity_item_keys: Array.from(selectedAnnuityKeys),
              vehicle_registration: effectiveJob.vehicle_registration, vehicle_make: effectiveJob.vehicle_make,
              vehicle_model: effectiveJob.vehicle_model, vehicle_year: effectiveJob.vehicle_year, customer_name: effectiveJob.customer_name,
            }),
          });
          if (!billingResponse.ok) {
            const billingError = await billingResponse.json().catch(() => ({}));
            throw new Error(billingError?.details || billingError?.error || "Failed to apply quotation billing");
          }
          const billingResult = await billingResponse.json().catch(() => ({}));
          if (billingResult?.queued) deferredActions.push("quotation billing");
          const noColumnMatches = Array.isArray(billingResult?.skipped) ? billingResult.skipped.filter((entry) => entry?.reason === "no_column_match") : [];
          if (noColumnMatches.length > 0) {
            const labels = Array.from(new Set(noColumnMatches.map((entry) => entry?.item?.name || entry?.item?.product || entry?.item?.item_code || entry?.item?.code || "Item").filter(Boolean)));
            const preview = labels.slice(0, 4).join(", ");
            const remainder = labels.length > 4 ? ` +${labels.length - 4} more` : "";
            syncWarnings.push(`Unmapped annuity items (${noColumnMatches.length}): ${preview}${remainder}`);
          }
        }
      }
      const jobTypeRaw = String(effectiveJob?.job_type || effectiveJob?.quotation_job_type || "").toLowerCase();
      const isDeinstall = jobTypeRaw.includes("deinstall") || jobTypeRaw.includes("de-install") || jobTypeRaw.includes("decomm");
      if (isDeinstall && effectiveAccountNumber) {
        const zeroRes = await fetch("/api/vehicles/deinstall-zero-out", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: effectiveJob.id, accountNumber: effectiveAccountNumber, vehicleReg: effectiveJob.vehicle_registration }),
        });
        if (!zeroRes.ok) {
          const zeroErr = await zeroRes.json().catch(() => ({}));
          syncWarnings.push(zeroErr.error || "De-install zero-out returned an error");
        }
      }
      const equipmentResponse = await fetch("/api/vehicles/sync-job-equipment", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: jobForVehicleSync }),
      });
      if (!equipmentResponse.ok) {
        const equipmentError = await equipmentResponse.json().catch(() => ({}));
        throw new Error(equipmentError?.details || equipmentError?.error || "Failed to update vehicle equipment");
      }
      const equipmentResult = await equipmentResponse.json();
      if (equipmentResult?.queued) deferredActions.push("vehicle equipment sync");
      if (equipmentResult?.warnings?.length) syncWarnings.push(...equipmentResult.warnings);

      // Update billing status
      if (effectiveJob?.id) {
        try {
          const currentStatuses = effectiveJob?.billing_statuses && typeof effectiveJob.billing_statuses === "object" ? effectiveJob.billing_statuses : {};
          const nextStatuses = { ...currentStatuses, invoice: { done: true, at: new Date().toISOString(), invoice_number: invoiceNumber, invoice_id: invoiceRecord.id, invoice_date: invoiceData.generatedAt, subtotal: invoiceRecord.subtotal || 0, vat_amount: invoiceRecord.vat_amount || 0, total_amount: invoiceRecord.total_amount || 0 } };
          await fetch(`/api/job-cards/${effectiveJob.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ billing_statuses: nextStatuses, job_status: "invoiced", status: "completed" }),
          });
        } catch { /* non-critical */ }
      }

      if (deferredActions.length > 0) {
        toast.success(`Invoice generated successfully. ${deferredActions.join(" and ")} will be applied after unlock.`);
      } else if (syncWarnings.length > 0) {
        toast.success(`Invoice generated. Vehicle equipment updated with ${syncWarnings.length} warning(s).`);
      } else {
        toast.success("Invoice generated successfully!");
      }
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error(error?.message || "Failed to generate invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const openInvoicePdf = (mode = "view") => {
    const invoiceView = buildCompletedJobInvoiceView();
    if (!invoiceView) { toast.error("Invoice preview not available"); return; }
    const invoiceHtml = buildCompletedJobInvoiceHtml(invoiceView);
    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) { toast.error("Popup blocked. Please allow popups to view the invoice."); return; }
    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    printWindow.focus();
    if (mode === "download") printWindow.onload = () => setTimeout(() => printWindow.print(), 150);
  };

  const sendInvoiceEmail = async () => {
    const effectiveJob = latestJobRef.current || job;
    if (!effectiveJob) { toast.error("No job data available"); return; }
    if (!generatedInvoice || !invoiceFormData.clientEmail) { toast.error("Please provide client email address"); return; }
    setIsSendingEmail(true);
    try {
      const totals = getInvoiceTotals(effectiveJob, externalEditedProducts);
      const items = totals.products.length > 0
        ? totals.products.map((product) => {
            const qty = Math.max(1, toNumber(product?.quantity) || 1);
            const unitPrice = getProductUnitPrice(product);
            return { description: product?.description || product?.name || "Item", quantity: qty, unitPrice, total: unitPrice * qty, vehicleRegistration: getInvoiceVehicleRegistrationDisplay(effectiveJob) };
          })
        : [{ description: `${effectiveJob.job_type || "Service"} - ${effectiveJob.job_description || "Job completion"}`, quantity: 1, unitPrice: totals.subtotal, total: totals.subtotal, vehicleRegistration: getInvoiceVehicleRegistrationDisplay(effectiveJob) }];
      const invoiceEmailData = {
        invoiceNumber: generatedInvoice.invoiceNumber, clientName: invoiceFormData.clientName,
        clientEmail: invoiceFormData.clientEmail, clientPhone: invoiceFormData.clientPhone,
        clientAddress: invoiceFormData.clientAddress, invoiceDate: generatedInvoice.generatedAt,
        dueDate: invoiceFormData.dueDate, totalAmount: totals.total, vatAmount: totals.vat,
        subtotal: totals.subtotal, items, paymentTerms: invoiceFormData.paymentTerms, notes: invoiceFormData.notes,
      };
      const response = await fetch("/api/send-invoice-email", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invoiceEmailData),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Invoice sent successfully to ${invoiceFormData.clientEmail}`);
        onOpenChange(false);
        resetInvoiceForm();
      } else throw new Error(result.error || "Failed to send invoice email");
    } catch (error) {
      toast.error(`Failed to send invoice email: ${error.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const invoiceView = buildCompletedJobInvoiceView();
  const invoiceHtml = buildCompletedJobInvoiceHtml(invoiceView);
  const totals = getInvoiceTotals(job, externalEditedProducts);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetInvoiceForm(); onOpenChange(o); }}>
      <DialogContent className="w-[96vw] max-w-6xl max-h-[94vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Generate Invoice - {job?.job_number || ""}
          </DialogTitle>
        </DialogHeader>
        {job && (
          <div className="space-y-6 overflow-y-auto max-h-[80vh] pr-2">
            {/* Job Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Job Number:</span>
                  <p className="font-medium">{job.job_number}</p>
                </div>
                <div>
                  <span className="text-gray-600">Vehicle:</span>
                  <p className="font-medium">{getInvoiceVehicleRegistrationDisplay(job)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Total Cost:</span>
                  <p className="font-medium text-green-600">{formatCurrency(totals.total)}</p>
                </div>
              </div>
            </div>

            {/* Annuity Items */}
            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Annuity Items (Rental / Subscription)</h3>
                {annuitySelectableItems.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAllAnnuityItems} disabled={!!generatedInvoice}>Select All</Button>
                    <Button type="button" variant="outline" size="sm" onClick={clearAllAnnuityItems} disabled={!!generatedInvoice}>Clear</Button>
                  </div>
                ) : null}
              </div>
              {annuitySelectableItems.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">No rental/subscription quotation items found on this job.</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-gray-600">
                    Selected {selectedAnnuityItemKeys.length} of {annuitySelectableItems.length} item(s) to add to annuity
                    in <strong>vehicles</strong> and <strong>vehicles_duplicate</strong>. Recurring items are
                    synced to vehicle billing. Invoice line items include recurring charges only when the product multiplier is above 1x.
                  </p>
                  <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                    {annuitySelectableItems.map((item) => {
                      const isSelected = selectedAnnuityItemKeys.includes(item.key);
                      return (
                        <label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-md border bg-white p-3">
                          <input type="checkbox" className="mt-1 h-4 w-4" checked={isSelected} disabled={!!generatedInvoice} onChange={() => toggleAnnuityItemSelection(item.key)} />
                          <div className="flex-1 text-sm">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-gray-600">Vehicle: {item.vehiclePlate} | Qty: {item.quantity}</p>
                            <p className="text-gray-600">Subscription: {formatCurrency(item.subscriptionAmount)} | Rental: {formatCurrency(item.rentalAmount)}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Client Information Form */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client-name" className="text-sm font-medium text-gray-700">Client Name</Label>
                  <Input id="client-name" value={invoiceFormData.clientName} onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, clientName: e.target.value }))} placeholder="Enter client name" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="client-email" className="text-sm font-medium text-gray-700">Email Address</Label>
                  <Input id="client-email" type="email" value={invoiceFormData.clientEmail} onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, clientEmail: e.target.value }))} placeholder="client@example.com" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="client-phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                  <Input id="client-phone" value={invoiceFormData.clientPhone} onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, clientPhone: e.target.value }))} placeholder="+27 12 345 6789" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="payment-terms" className="text-sm font-medium text-gray-700">Payment Terms</Label>
                  <select id="payment-terms" value={invoiceFormData.paymentTerms} onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="7 days">7 days</option>
                    <option value="14 days">14 days</option>
                    <option value="30 days">30 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="due-date" className="text-sm font-medium text-gray-700">Due Date</Label>
                  <Input id="due-date" type="date" value={invoiceFormData.dueDate} onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, dueDate: e.target.value }))} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="client-address" className="text-sm font-medium text-gray-700">Client Address</Label>
                  <textarea id="client-address" value={invoiceFormData.clientAddress} onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, clientAddress: e.target.value }))} placeholder="Enter full client address" rows={3} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="invoice-notes" className="text-sm font-medium text-gray-700">Invoice Notes</Label>
                  <textarea id="invoice-notes" value={invoiceFormData.notes} onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Additional notes for the invoice..." rows={3} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Invoice Preview */}
            <div id="invoice-preview" className="rounded-lg border bg-white p-2">
              <iframe key={`${job?.id || "job"}-${invoiceView?.invoiceNumber || "pending"}-${invoiceView?.invoiceDate || "date"}`} title="Invoice Preview" srcDoc={invoiceHtml} scrolling="auto" className="h-[1380px] w-full rounded-md border-0" />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              {!generatedInvoice && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Invoice Date</Label>
                  <Input type="date" value={billingInvoiceDate} onChange={(e) => setBillingInvoiceDate(e.target.value)} className="h-9 w-44" />
                </div>
              )}
              {!generatedInvoice ? (
                <Button onClick={generateInvoice} disabled={isGeneratingInvoice} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {isGeneratingInvoice ? (
                    <><div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin mr-2"></div>Generating Invoice...</>
                  ) : (
                    <>Generate Invoice PDF</>
                  )}
                </Button>
              ) : (
                <>
                  <Button onClick={() => openInvoicePdf("view")} variant="outline" className="flex-1">View Invoice PDF</Button>
                  <Button onClick={() => openInvoicePdf("download")} variant="outline" className="flex-1">Download PDF</Button>
                  <Button onClick={sendInvoiceEmail} disabled={!invoiceFormData.clientEmail || isSendingEmail} className="flex-1 bg-green-600 hover:bg-green-700">
                    {isSendingEmail ? (
                      <><div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin mr-2"></div>Sending Email...</>
                    ) : (
                      <>Send Invoice via Email</>
                    )}
                  </Button>
                </>
              )}
            </div>
            {generatedInvoice ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Rebuild review shows the latest quotation-product line items in the preview only. It does not refresh the stored invoice.
              </div>
            ) : null}
          </div>
        )}
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetInvoiceForm(); }}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
