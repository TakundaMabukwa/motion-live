"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CostCenterData {
  id: string;
  company: string | null;
  cost_code: string | null;
  legal_name: string | null;
  contact_name: string | null;
  vat_number: string | null;
  email: string | null;
  registration_number: string | null;
  physical_address_1: string | null;
  physical_address_2: string | null;
  physical_address_3: string | null;
  physical_area: string | null;
  physical_code: string | null;
  postal_address_1: string | null;
  postal_address_2: string | null;
  postal_address_3: string | null;
  validated: boolean | null;
  operational: boolean | null;
  cost_center_code: string | null;
  site_allocated: string | null;
  fc_id: string | null;
  annuity_flag: boolean | null;
}

interface ClientInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCode: string;
  companyName?: string;
  multipleSelected?: boolean;
}

export default function ClientInfoModal({ open, onOpenChange, costCode, companyName, multipleSelected }: ClientInfoModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CostCenterData | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const isAllSelected = costCode === "all";

  const fetchData = useCallback(async () => {
    if (!costCode || !open || isAllSelected) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ all_new_account_numbers: costCode });
      const res = await fetch(`/api/cost-centers/client?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch client info");
      const result = await res.json();
      const cc = result.costCenters?.[0] || result.costCenter || result;
      setData(cc);
      setFormData({
        company: cc.company || "",
        legal_name: cc.legal_name || "",
        contact_name: cc.contact_name || "",
        email: cc.email || "",
        vat_number: cc.vat_number || "",
        registration_number: cc.registration_number || "",
        physical_address_1: cc.physical_address_1 || "",
        physical_address_2: cc.physical_address_2 || "",
        physical_address_3: cc.physical_address_3 || "",
        physical_area: cc.physical_area || "",
        physical_code: cc.physical_code || "",
        postal_address_1: cc.postal_address_1 || "",
        postal_address_2: cc.postal_address_2 || "",
        postal_address_3: cc.postal_address_3 || "",
      });
    } catch {
      toast.error("Failed to load client info");
    } finally {
      setLoading(false);
    }
  }, [costCode, open]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!data?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/cost-centers/editable", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.id, ...formData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Client info updated");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[50vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Billing Info — {companyName || costCode}</DialogTitle>
        </DialogHeader>

        {isAllSelected ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-sm text-gray-600">Please select a single cost center before editing cost center details.</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* General */}
            <Section title="General">
              <Field label="Company" value={formData.company} onChange={(v) => updateField("company", v)} />
              <Field label="Legal Name" value={formData.legal_name} onChange={(v) => updateField("legal_name", v)} />
              <Field label="Cost Code" value={data?.cost_code || ""} readOnly />
              <Field label="Contact Name" value={formData.contact_name} onChange={(v) => updateField("contact_name", v)} />
              <Field label="Email" value={formData.email} onChange={(v) => updateField("email", v)} type="email" />
            </Section>

            {/* Tax & Registration */}
            <Section title="Tax & Registration">
              <Field label="VAT Number" value={formData.vat_number} onChange={(v) => updateField("vat_number", v)} />
              <Field label="Registration Number" value={formData.registration_number} onChange={(v) => updateField("registration_number", v)} />
            </Section>

            {/* Postal Address */}
            <Section title="Postal Address" subtitle="Used for info on invoice">
              <Field label="Address Line 1" value={formData.postal_address_1} onChange={(v) => updateField("postal_address_1", v)} />
              <Field label="Address Line 2" value={formData.postal_address_2} onChange={(v) => updateField("postal_address_2", v)} />
              <Field label="Address Line 3" value={formData.postal_address_3} onChange={(v) => updateField("postal_address_3", v)} />
            </Section>

            {/* Physical Address */}
            <Section title="Physical Address" subtitle="Used for private clients">
              <Field label="Address Line 1" value={formData.physical_address_1} onChange={(v) => updateField("physical_address_1", v)} />
              <Field label="Address Line 2" value={formData.physical_address_2} onChange={(v) => updateField("physical_address_2", v)} />
              <Field label="Address Line 3" value={formData.physical_address_3} onChange={(v) => updateField("physical_address_3", v)} />
              <Field label="Area" value={formData.physical_area} onChange={(v) => updateField("physical_area", v)} />
              <Field label="Postal Code" value={formData.physical_code} onChange={(v) => updateField("physical_code", v)} />
            </Section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="border-b border-gray-200 pb-1">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  type = "text",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-gray-500">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        className={`h-8 text-xs ${readOnly ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
      />
    </div>
  );
}
