"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2, Edit, Car,
} from "lucide-react";
import { toast } from "sonner";
import InvoiceJobModal from "./InvoiceJobModal";

const PRICE_FIELDS = ["cash_price","rental_price","subscription_price","installation_price","de_installation_price"];

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
const getProductLineTotal = (p) => {
  const t = toFiniteNumber(p.total_price);
  if (t > 0) return t;
  return calcProductTotal(p);
};

export default function EditFinalizeModal({ job, open, onOpenChange, onComplete }) {
  const router = useRouter();
  const [editingJob, setEditingJob] = useState(job);
  const [editableProducts, setEditableProducts] = useState([]);
  const [formData, setFormData] = useState({});
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);
  const [showFinalInvoiceModal, setShowFinalInvoiceModal] = useState(false);

  useEffect(() => {
    if (job) setEditingJob(job);
  }, [job]);

  useEffect(() => {
    if (!open || !job) return;
    const products = parseProducts(job.quotation_products).map((p) => ({ ...p }));
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
    setFinalizeError(null);
  }, [open, job]);

  useEffect(() => {
    if (!open || !editingJob?.new_account_number) return;
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
  }, [open, editingJob?.new_account_number]);

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
    setShowFinalInvoiceModal(true);
    setFinalizing(false);
  }, [formData, editingJob?.id, editableProducts]);

  const handleRefreshJobsAfterInvoice = useCallback(() => {
    setShowFinalInvoiceModal(false);
    onOpenChange(false);
    if (onComplete) onComplete();
  }, [onComplete, onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
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
                    <Label htmlFor="ef_vehicle_registration">Vehicle Registration *</Label>
                    <Input id="ef_vehicle_registration" value={formData.vehicle_registration} onChange={(e) => updateFormField("vehicle_registration", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ef_vehicle_make">Vehicle Make</Label>
                    <Input id="ef_vehicle_make" value={formData.vehicle_make} onChange={(e) => updateFormField("vehicle_make", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ef_vehicle_model">Vehicle Model</Label>
                    <Input id="ef_vehicle_model" value={formData.vehicle_model} onChange={(e) => updateFormField("vehicle_model", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ef_vehicle_year">Vehicle Year</Label>
                    <Input id="ef_vehicle_year" type="number" value={formData.vehicle_year} onChange={(e) => updateFormField("vehicle_year", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ef_vin_number">VIN Number</Label>
                    <Input id="ef_vin_number" value={formData.vin_number} onChange={(e) => updateFormField("vin_number", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ef_odormeter">Odometer</Label>
                    <Input id="ef_odormeter" value={formData.odormeter} onChange={(e) => updateFormField("odormeter", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ef_job_location">Job Location</Label>
                    <Input id="ef_job_location" value={formData.job_location} onChange={(e) => updateFormField("job_location", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ef_site_contact_person">Site Contact Person</Label>
                    <Input id="ef_site_contact_person" value={formData.site_contact_person} onChange={(e) => updateFormField("site_contact_person", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ef_site_contact_phone">Site Contact Phone</Label>
                    <Input id="ef_site_contact_phone" value={formData.site_contact_phone} onChange={(e) => updateFormField("site_contact_phone", e.target.value)} />
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
                    <Label htmlFor="ef_quotation_subtotal">Quotation Subtotal</Label>
                    <Input id="ef_quotation_subtotal" type="number" step="0.01" value={formData.quotation_subtotal} onChange={(e) => handleSubtotalChange(e.target.value)} readOnly={editableProducts.length > 0} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ef_quotation_total_amount">Quotation Total *</Label>
                    <Input id="ef_quotation_total_amount" type="number" step="0.01" value={formData.quotation_total_amount} readOnly />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="ef_job_description">Job Description</Label>
                    <Textarea id="ef_job_description" value={formData.job_description} onChange={(e) => updateFormField("job_description", e.target.value)} rows={3} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="ef_work_notes">Work Notes</Label>
                    <Textarea id="ef_work_notes" value={formData.work_notes} onChange={(e) => updateFormField("work_notes", e.target.value)} rows={3} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="ef_completion_notes">Completion Notes</Label>
                    <Textarea id="ef_completion_notes" value={formData.completion_notes} onChange={(e) => updateFormField("completion_notes", e.target.value)} rows={3} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="ef_special_instructions">Special Instructions</Label>
                    <Textarea id="ef_special_instructions" value={formData.special_instructions} onChange={(e) => updateFormField("special_instructions", e.target.value)} rows={3} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="ef_customer_feedback">Customer Feedback</Label>
                    <Textarea id="ef_customer_feedback" value={formData.customer_feedback} onChange={(e) => updateFormField("customer_feedback", e.target.value)} rows={2} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="w-5 h-5 text-green-600" /> Finalize and Invoice</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ef_order_number">Order Number</Label>
                    <Input id="ef_order_number" value={formData.order_number} onChange={(e) => updateFormField("order_number", e.target.value)} placeholder="Order number (Optional)" />
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
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={finalizing}>Cancel</Button>
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

      <InvoiceJobModal
        job={editingJob}
        open={showFinalInvoiceModal}
        onOpenChange={setShowFinalInvoiceModal}
        onComplete={handleRefreshJobsAfterInvoice}
      />
    </>
  );
}
