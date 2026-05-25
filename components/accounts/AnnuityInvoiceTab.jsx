"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  FileText,
  Download,
  Save,
  ChevronsUpDown,
  Check,
  Eye,
  Pencil,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import InvoiceReportComponent from "@/components/inv/components/invoice-report";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getMonthEndInvoiceDate = (billingMonth) => {
  if (!billingMonth) return new Date().toISOString();
  const parts = String(billingMonth).split("-");
  if (parts.length < 2) return new Date().toISOString();
  const year = Number.parseInt(parts[0], 10);
  const month = Number.parseInt(parts[1], 10) - 1;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const invoiceDay = Math.min(30, lastDay);
  return new Date(year, month, invoiceDay, 23, 59, 59, 999).toISOString();
};

export default function AnnuityInvoiceTab({ costCenters = [] }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [costCenterPickerOpen, setCostCenterPickerOpen] = useState(false);
  const [costCenterSearch, setCostCenterSearch] = useState("");
  const [selectedCostCenterCode, setSelectedCostCenterCode] = useState("");
  const [selectedBillingMonth, setSelectedBillingMonth] = useState(currentMonth);
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [existingInvoicesLoading, setExistingInvoicesLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editedVehicles, setEditedVehicles] = useState({});
  const [selectedExistingInvoice, setSelectedExistingInvoice] = useState(null);
  const [previewMode, setPreviewMode] = useState("pdf");
  const [editableCompany, setEditableCompany] = useState("");
  const [editableVat, setEditableVat] = useState("");
  const [editableAddress, setEditableAddress] = useState("");
  const [editableRegNumber, setEditableRegNumber] = useState("");
  const [editableNotes, setEditableNotes] = useState("");

  const filteredCostCenters = costCenters.filter((cc) => {
    const query = costCenterSearch.toLowerCase().trim();
    if (!query) return true;
    const code = String(cc.cost_code || "").toLowerCase();
    const company = String(cc.company || "").toLowerCase();
    const legal = String(cc.legal_name || "").toLowerCase();
    return code.includes(query) || company.includes(query) || legal.includes(query);
  });

  const selectedCostCenter = costCenters.find(
    (cc) => String(cc.cost_code || "").trim().toUpperCase() === selectedCostCenterCode,
  );

  const fetchExistingInvoices = useCallback(async (costCode) => {
    if (!costCode) return;
    setExistingInvoicesLoading(true);
    try {
      const res = await fetch(
        `/api/invoices/account/history?accountNumber=${encodeURIComponent(costCode)}`,
      );
      if (res.ok) {
        const data = await res.json();
        const allInvoices = Array.isArray(data?.invoices) ? data.invoices : [];
        const accountInvoices = allInvoices.filter(
          (inv) => inv.source_type === "account_invoice",
        );
        setExistingInvoices(accountInvoices);
      } else {
        setExistingInvoices([]);
      }
    } catch {
      setExistingInvoices([]);
    } finally {
      setExistingInvoicesLoading(false);
    }
  }, []);

  const fetchVehicles = useCallback(async (costCode) => {
    if (!costCode) return;
    setVehiclesLoading(true);
    try {
      const res = await fetch(
        `/api/vehicles/invoice?accountNumber=${encodeURIComponent(costCode)}&billingMonth=${encodeURIComponent(currentMonth)}`,
      );
      if (res.ok) {
        const data = await res.json();
        const vehicleList = Array.isArray(data?.invoiceData?.invoiceItems)
          ? data.invoiceData.invoiceItems
          : Array.isArray(data?.invoiceData?.invoice_items)
            ? data.invoiceData.invoice_items
            : [];
        setVehicles(vehicleList);
        setInvoiceData(data?.invoiceData || null);
      } else {
        setVehicles([]);
        setInvoiceData(null);
      }
    } catch {
      setVehicles([]);
      setInvoiceData(null);
    } finally {
      setVehiclesLoading(false);
    }
  }, [currentMonth]);

  const handleCostCenterSelect = (code) => {
    setSelectedCostCenterCode(code);
    setCostCenterPickerOpen(false);
    setInvoiceData(null);
    setVehicles([]);
    setShowPreview(false);
    setSavedInvoice(null);
    setSelectedExistingInvoice(null);
    setEditedVehicles({});
    setEditingVehicleId(null);
    fetchExistingInvoices(code);
    fetchVehicles(code);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedCostCenterCode) return;
    setInvoiceLoading(true);
    try {
      const billingMonth = `${selectedBillingMonth}-01`;
      const res = await fetch(
        `/api/vehicles/invoice?accountNumber=${encodeURIComponent(selectedCostCenterCode)}&billingMonth=${encodeURIComponent(billingMonth)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch invoice data");
      const data = await res.json();
      if (!data?.invoiceData) throw new Error("No invoice data returned");
      const mergedInvoiceData = {
        ...data.invoiceData,
        ...(selectedExistingInvoice && {
          company_name: selectedExistingInvoice.company_name || data.invoiceData.company_name,
          company_registration_number: selectedExistingInvoice.company_registration_number || data.invoiceData.company_registration_number,
          client_address: selectedExistingInvoice.client_address || data.invoiceData.client_address,
          customer_vat_number: selectedExistingInvoice.customer_vat_number || data.invoiceData.customer_vat_number,
          notes: selectedExistingInvoice.notes || data.invoiceData.notes,
        }),
      };
      setInvoiceData(mergedInvoiceData);
      setEditableCompany(mergedInvoiceData.company_name || selectedCostCenter?.company || "");
      setEditableVat(mergedInvoiceData.customer_vat_number || "");
      setEditableAddress(mergedInvoiceData.client_address || "");
      setEditableRegNumber(mergedInvoiceData.company_registration_number || "");
      setEditableNotes(mergedInvoiceData.notes || "");
      setVehicles(
        Array.isArray(data.invoiceData?.invoiceItems)
          ? data.invoiceData.invoiceItems
          : Array.isArray(data.invoiceData?.invoice_items)
            ? data.invoiceData.invoice_items
            : [],
      );
      setShowPreview(true);
      setSavedInvoice(null);
    } catch (err) {
      toast.error(err.message || "Failed to generate invoice");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleStartEdit = (vehicle) => {
    const key = vehicle.reg || vehicle.fleetNumber || vehicle.item_code || Math.random().toString();
    setEditingVehicleId(key);
    setEditedVehicles((prev) => ({
      ...prev,
      [key]: { ...vehicle },
    }));
  };

  const handleEditChange = (vehicleKey, field, value) => {
    setEditedVehicles((prev) => ({
      ...prev,
      [vehicleKey]: { ...(prev[vehicleKey] || {}), [field]: value },
    }));
  };

  const handleSaveEdit = (vehicleKey) => {
    setEditingVehicleId(null);
    setVehicles((prev) =>
      prev.map((v) => {
        const key = v.reg || v.fleetNumber || v.item_code || "";
        return key === vehicleKey ? { ...v, ...(editedVehicles[vehicleKey] || {}) } : v;
      }),
    );
    if (invoiceData) {
      const updatedItems = vehicles.map((v) => {
        const key = v.reg || v.fleetNumber || v.item_code || "";
        return key === vehicleKey ? { ...v, ...(editedVehicles[vehicleKey] || {}) } : v;
      });
      setInvoiceData((prev) => ({
        ...prev,
        invoiceItems: updatedItems,
        invoice_items: updatedItems,
      }));
    }
    toast.success("Vehicle updated");
  };

  const handleCancelEdit = (vehicleKey) => {
    setEditingVehicleId(null);
    setEditedVehicles((prev) => {
      const next = { ...prev };
      delete next[vehicleKey];
      return next;
    });
  };

  const handleSaveInvoice = async () => {
    if (!selectedCostCenterCode || !invoiceData) return;
    setSaving(true);
    try {
      const lineItems = Array.isArray(invoiceData?.invoiceItems)
        ? invoiceData.invoiceItems
        : Array.isArray(invoiceData?.invoice_items)
          ? invoiceData.invoice_items
          : vehicles;
      const billingMonth = `${selectedBillingMonth}-01`;
      const body = {
        accountNumber: selectedCostCenterCode,
        billingMonth,
        invoiceDate: invoiceDate ? `${invoiceDate}T23:59:59.999Z` : getMonthEndInvoiceDate(billingMonth),
        companyName: editableCompany || selectedCostCenter?.company || null,
        companyRegistrationNumber: editableRegNumber || null,
        clientAddress: editableAddress || null,
        customerVatNumber: editableVat || null,
        subtotal: toNumber(invoiceData.subtotal),
        vatAmount: toNumber(invoiceData.vat_amount || 0),
        discountAmount: toNumber(invoiceData.discount_amount || 0),
        totalAmount: toNumber(invoiceData.total_amount),
        lineItems,
        notes: editableNotes || "",
        ...(selectedExistingInvoice && { forceNewInvoice: true }),
      };

      const res = await fetch("/api/invoices/bulk-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "Failed to save invoice");
      }

      const result = await res.json();
      setSavedInvoice(result?.invoice || result);
      toast.success("Invoice saved successfully");
      await fetchExistingInvoices(selectedCostCenterCode);
    } catch (err) {
      toast.error(err.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!savedInvoice && !selectedExistingInvoice) {
      toast.error("No invoice to download");
      return;
    }
    const invoiceDataForPreview = savedInvoice || selectedExistingInvoice || {};
    if (!invoiceDataForPreview?.invoice_number) {
      toast.error("Invoice must be saved before downloading");
      return;
    }
    try {
      const { createRoot } = await import("react-dom/client");
      const printWindow = window.open("", "_blank", "width=900,height=1000");
      if (!printWindow) {
        toast.error("Pop-up blocked. Please allow pop-ups for this site.");
        return;
      }
      printWindow.document.write(
        '<html><head><title>Invoice</title><style>body{margin:0;padding:20px;font-family:Arial,sans-serif}@media print{body{padding:0}}</style></head><body><div id="invoice-root"></div></body></html>',
      );
      printWindow.document.close();
      const container = printWindow.document.getElementById("invoice-root");
      const root = createRoot(container);
      root.render(
        <InvoiceReportComponent
          viewOnly
          clientLegalName={selectedCostCenter?.company || selectedCostCenterCode}
          costCenter={{
            accountNumber: selectedCostCenterCode,
            billingMonth: `${selectedBillingMonth}-01`,
          }}
          invoiceData={{
            ...(invoiceData || {}),
            ...invoiceDataForPreview,
            account_number: selectedCostCenterCode,
            billing_month: `${selectedBillingMonth}-01`,
            invoice_number: invoiceDataForPreview.invoice_number,
            invoice_date: invoiceDataForPreview.invoice_date,
            total_amount: toNumber(invoiceDataForPreview.total_amount),
            company_name: invoiceDataForPreview.company_name || selectedCostCenter?.company,
            client_address: invoiceDataForPreview.client_address,
            customer_vat_number: invoiceDataForPreview.customer_vat_number,
            company_registration_number: invoiceDataForPreview.company_registration_number,
            line_items: Array.isArray(invoiceDataForPreview.line_items) ? invoiceDataForPreview.line_items : vehicleList,
            invoice_items: Array.isArray(invoiceDataForPreview.line_items) ? invoiceDataForPreview.line_items : vehicleList,
            invoiceItems: Array.isArray(invoiceDataForPreview.line_items) ? invoiceDataForPreview.line_items : vehicleList,
          }}
        />,
      );
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    } catch (err) {
      toast.error("Failed to open invoice for printing");
    }
  };

  const vehicleList = Array.isArray(invoiceData?.invoiceItems)
    ? invoiceData.invoiceItems
    : Array.isArray(invoiceData?.invoice_items)
      ? invoiceData.invoice_items
      : vehicles;

  return (
    <div className="space-y-5">
      {/* Cost Center Selection */}
      <div className="space-y-2 max-w-[420px]">
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Cost Center
        </Label>
        <Popover open={costCenterPickerOpen} onOpenChange={setCostCenterPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="h-12 w-full justify-between text-left font-normal"
            >
              <span className="truncate">
                {selectedCostCenter
                  ? `${selectedCostCenter.company || selectedCostCenter.legal_name || "Unnamed"} - ${selectedCostCenter.cost_code}`
                  : "Select cost center"}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="start">
            <div className="border-b p-3">
              <Input
                value={costCenterSearch}
                onChange={(e) => setCostCenterSearch(e.target.value)}
                placeholder="Search cost center or company..."
                className="h-11"
              />
            </div>
            <ScrollArea className="h-72">
              <div className="p-2">
                {filteredCostCenters.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-slate-500 text-center">
                    No cost centers found.
                  </div>
                ) : (
                  filteredCostCenters.map((cc, idx) => {
                    const value = String(cc.cost_code || "").trim().toUpperCase();
                    const isSelected = value === selectedCostCenterCode;
                    return (
                      <button
                        key={`annuity-cc-${value}-${idx}`}
                        type="button"
                        onClick={() => handleCostCenterSelect(value)}
                        className="flex w-full items-start justify-between gap-3 rounded-md px-3 py-3 text-left hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {cc.company || cc.legal_name || "Unnamed"}
                          </div>
                          <div className="text-xs text-slate-500">{value}</div>
                        </div>
                        {isSelected ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Billing Month */}
      <div className="flex gap-4 flex-wrap">
        <div className="space-y-2 max-w-[220px]">
          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Billing Month
          </Label>
          <Input
            type="month"
            value={selectedBillingMonth}
            onChange={(e) => {
              setSelectedBillingMonth(e.target.value);
              const parts = e.target.value.split("-");
              if (parts.length === 2) {
                const year = Number.parseInt(parts[0], 10);
                const month = Number.parseInt(parts[1], 10) - 1;
                const lastDay = new Date(year, month + 1, 0).getDate();
                const invoiceDay = Math.min(30, lastDay);
                const d = new Date(year, month, invoiceDay);
                setInvoiceDate(d.toISOString().slice(0, 10));
              }
            }}
            max={new Date().toISOString().slice(0, 7)}
            className="h-10"
          />
        </div>
        <div className="space-y-2 max-w-[220px]">
          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Invoice Date
          </Label>
          <Input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="h-10"
          />
        </div>
      </div>

      {selectedCostCenterCode && (
        <>
          {/* Existing Invoices */}
          <div className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Existing Invoices
              {selectedExistingInvoice && (
                <span className="ml-2 text-xs font-normal text-blue-600">
                  (reference selected)
                </span>
              )}
            </h3>
            {existingInvoicesLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading invoices...
              </div>
            ) : existingInvoices.length > 0 ? (
              <div className="space-y-2">
                {existingInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className={`rounded-md border p-3 cursor-pointer transition-colors ${
                      selectedExistingInvoice?.id === inv.id
                        ? "border-blue-500 bg-blue-50"
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedExistingInvoice(inv)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">
                          {inv.invoice_number || "No number"}
                        </span>
                        <span className="text-xs text-slate-500 ml-2">
                          {formatCurrency(inv.total_amount)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvoiceData((prev) => ({
                            ...prev,
                            ...inv,
                            line_items: Array.isArray(inv.line_items) ? inv.line_items : [],
                            invoice_items: Array.isArray(inv.line_items) ? inv.line_items : [],
                            invoiceItems: Array.isArray(inv.line_items) ? inv.line_items : [],
                          }));
                          setEditableCompany(inv.company_name || "");
                          setEditableVat(inv.customer_vat_number || "");
                          setEditableAddress(inv.client_address || "");
                          setEditableRegNumber(inv.company_registration_number || "");
                          setEditableNotes(inv.notes || "");
                          setShowPreview(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex gap-2">
                      <span>{inv.billing_month ? inv.billing_month.slice(0, 7) : ""}</span>
                      {inv.invoice_date ? (
                        <span>| {new Date(inv.invoice_date).toLocaleDateString()}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-3">
                No previous invoices found for this client. Generate one below.
              </p>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleGenerateInvoice}
              disabled={invoiceLoading || vehiclesLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {invoiceLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  {selectedExistingInvoice
                    ? "Generate New from Reference"
                    : "Generate Invoice from Vehicles"}
                </>
              )}
            </Button>
            {savedInvoice && (
              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>

          {/* Editable Invoice Details */}
          {showPreview && (
            <div className="rounded-xl border bg-white p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Company Name</Label>
                  <Input
                    value={editableCompany}
                    onChange={(e) => setEditableCompany(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">VAT Number</Label>
                  <Input
                    value={editableVat}
                    onChange={(e) => setEditableVat(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Registration Number</Label>
                  <Input
                    value={editableRegNumber}
                    onChange={(e) => setEditableRegNumber(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Client Address</Label>
                  <Input
                    value={editableAddress}
                    onChange={(e) => setEditableAddress(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Notes</Label>
                <textarea
                  value={editableNotes}
                  onChange={(e) => setEditableNotes(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[60px]"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {showPreview && (
            <div className="rounded-xl border bg-white">
              <div className="border-b px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-baseline gap-2 flex-wrap">
                  <span>{previewMode === "pdf" ? "Invoice PDF Preview" : "Edit Invoice Lines"}</span>
                  <span className="font-mono text-base text-blue-700">
                    #{savedInvoice?.invoice_number || invoiceData?.invoice_number || "PENDING"}
                  </span>
                  {selectedExistingInvoice && (
                    <span className="text-xs font-normal text-amber-600">
                      (ref: {selectedExistingInvoice.invoice_number || "prior invoice"})
                    </span>
                  )}
                </h3>
                <div className="flex gap-2">
                  {savedInvoice && (
                    <Button size="sm" variant="outline" onClick={handleDownload}>
                      <Download className="w-3 h-3 mr-1" />Download
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewMode(previewMode === "pdf" ? "table" : "pdf")}
                  >
                    {previewMode === "pdf" ? (
                      <><Pencil className="w-3 h-3 mr-1" />Edit Lines</>
                    ) : (
                      <><Eye className="w-3 h-3 mr-1" />View PDF</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveInvoice}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3 mr-1" />
                        {savedInvoice ? "Save Again" : "Save Invoice"}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-4">
                {previewMode === "pdf" ? (
                  <InvoiceReportComponent
                    viewOnly
                    clientLegalName={selectedCostCenter?.company || selectedCostCenterCode}
                    costCenter={{
                      accountNumber: selectedCostCenterCode,
                      billingMonth: `${selectedBillingMonth}-01`,
                    }}
                    invoiceData={{
                      ...(invoiceData || {}),
                      company_name: editableCompany || invoiceData?.company_name,
                      client_address: editableAddress || invoiceData?.client_address,
                      customer_vat_number: editableVat || invoiceData?.customer_vat_number,
                      company_registration_number: editableRegNumber || invoiceData?.company_registration_number,
                      notes: editableNotes || invoiceData?.notes,
                      ...(savedInvoice || {}),
                      account_number: selectedCostCenterCode,
                      billing_month: `${selectedBillingMonth}-01`,
                      invoice_number: savedInvoice?.invoice_number || invoiceData?.invoice_number || "PENDING",
                      invoice_date: savedInvoice?.invoice_date || (invoiceDate ? `${invoiceDate}T23:59:59.999Z` : invoiceData?.invoice_date),
                      total_amount: toNumber(savedInvoice?.total_amount || invoiceData?.total_amount),
                      line_items: Array.isArray(savedInvoice?.line_items) ? savedInvoice.line_items : vehicleList,
                      invoice_items: Array.isArray(savedInvoice?.line_items) ? savedInvoice.line_items : vehicleList,
                      invoiceItems: Array.isArray(savedInvoice?.line_items) ? savedInvoice.line_items : vehicleList,
                      notes: savedInvoice?.notes || editableNotes || invoiceData?.notes || "",
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    {vehicleList.length === 0 ? (
                      <p className="text-sm text-slate-500">No vehicle billing lines found.</p>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Registration</TableHead>
                                <TableHead className="text-xs">Fleet No</TableHead>
                                <TableHead className="text-xs">Item</TableHead>
                                <TableHead className="text-xs">Description</TableHead>
                                <TableHead className="text-xs text-right">Units</TableHead>
                                <TableHead className="text-xs text-right">Unit Price</TableHead>
                                <TableHead className="text-xs text-right">Total Excl</TableHead>
                                <TableHead className="text-xs text-center">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {vehicleList.map((item, idx) => {
                                const key = item.reg || item.fleetNumber || item.item_code || `item-${idx}`;
                                return (
                                  <TableRow key={key}>
                                    <TableCell className="py-1 text-xs">{item.reg || item.vehicle_registration || "-"}</TableCell>
                                    <TableCell className="py-1 text-xs">{item.fleetNumber || item.fleet_number || "-"}</TableCell>
                                    <TableCell className="py-1 text-xs">{item.item_code || item.itemCode || "-"}</TableCell>
                                    <TableCell className="py-1 text-xs max-w-[200px] truncate">{item.description || item.item_name || "-"}</TableCell>
                                    <TableCell className="py-1 text-xs text-right">{item.quantity || item.units || 1}</TableCell>
                                    <TableCell className="py-1 text-xs text-right">{formatCurrency(item.unit_price_without_vat ?? item.amountExcludingVat ?? 0)}</TableCell>
                                    <TableCell className="py-1 text-xs text-right font-medium">
                                      {formatCurrency(
                                        (toNumber(item.unit_price_without_vat ?? item.amountExcludingVat ?? 0)) *
                                          (toNumber(item.quantity || item.units || 1)),
                                      )}
                                    </TableCell>
                                    <TableCell className="py-1 text-center">
                                      <button
                                        onClick={() => handleStartEdit(item)}
                                        className="p-1 hover:bg-slate-100 rounded"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                      </button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Vehicle detail editor */}
                        {editingVehicleId && (() => {
                          const editKey = editingVehicleId;
                          const editData = editedVehicles[editKey] || {};
                          const allFields = Object.keys(editData).filter(
                            (k) => typeof editData[k] !== "object" || editData[k] === null,
                          );
                          return (
                            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h5 className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                  Editing: {editData.reg || editData.vehicle_registration || editData.item_code || "Vehicle"}
                                </h5>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleCancelEdit(editKey)}
                                    className="px-3 py-1.5 text-xs rounded-md border hover:bg-white"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveEdit(editKey)}
                                    className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                  >
                                    Save Changes
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {allFields.map((field) => {
                                  const value = editData[field];
                                  const label = field
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (c) => c.toUpperCase());
                                  const isNumeric = typeof value === "number" || !Number.isNaN(Number(value));
                                  return (
                                    <div key={field} className="space-y-0.5">
                                      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate block">
                                        {label}
                                      </label>
                                      <Input
                                        type={isNumeric ? "number" : "text"}
                                        step={isNumeric ? "0.01" : undefined}
                                        value={value ?? ""}
                                        onChange={(e) => handleEditChange(editKey, field, isNumeric ? Number(e.target.value) : e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}

                    {/* Totals */}
                    <div className="flex justify-end pt-3 border-t">
                      <div className="space-y-1 text-sm w-64">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Subtotal</span>
                          <span className="font-medium">
                            {formatCurrency(invoiceData?.subtotal || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">VAT</span>
                          <span className="font-medium">
                            {formatCurrency(invoiceData?.vat_amount || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base font-bold border-t pt-1">
                          <span>Total</span>
                          <span>{formatCurrency(invoiceData?.total_amount || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}
