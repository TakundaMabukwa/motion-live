"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Search, Pencil, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface CostCenter {
  id: string | null;
  cost_code: string;
  company: string | null;
  legal_name: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  vat_number?: string | null;
  registration_number?: string | null;
  physical_address_1?: string | null;
  physical_address_2?: string | null;
  physical_address_3?: string | null;
  physical_area?: string | null;
  physical_province?: string | null;
  physical_code?: string | null;
  postal_address_1?: string | null;
  postal_address_2?: string | null;
  postal_address_3?: string | null;
  validated: boolean | null;
  created_at: string | null;
  effective_cost_code?: string;
  total_amount_locked?: boolean;
  total_amount_locked_value?: number | null;
  total_amount_locked_by_email?: string | null;
}

interface FormData {
  company: string;
  legal_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  vat_number: string;
  registration_number: string;
  physical_address_1: string;
  physical_address_2: string;
  physical_address_3: string;
  physical_area: string;
  physical_province: string;
  physical_code: string;
  postal_address_1: string;
  postal_address_2: string;
  postal_address_3: string;
}

const emptyForm: FormData = {
  company: "",
  legal_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  vat_number: "",
  registration_number: "",
  physical_address_1: "",
  physical_address_2: "",
  physical_address_3: "",
  physical_area: "",
  physical_province: "",
  physical_code: "",
  postal_address_1: "",
  postal_address_2: "",
  postal_address_3: "",
};

function FormField({ label, field, placeholder, type = "text", value, onChange, disabled }: { label: string; field: string; placeholder?: string; type?: string; value: string; onChange: (val: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium text-gray-500">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="h-7 text-xs"
        disabled={disabled}
      />
    </div>
  );
}

function FCCostCentersSection({ costCodes, customersGroupId }: { costCodes: string; customersGroupId: string | null }) {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchCostCenters = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("all_new_account_numbers", costCodes);
      params.set("skip_lock_info", "true");

      const res = await fetch(`/api/cost-centers/client?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch cost centers");
      const data = await res.json();
      setCostCenters(Array.isArray(data?.costCenters) ? data.costCenters : []);
    } catch {
      toast.error("Failed to load cost centers");
    } finally {
      setLoading(false);
    }
  }, [costCodes]);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const filtered = costCenters
    .filter((cc) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        cc.cost_code?.toLowerCase().includes(q) ||
        cc.company?.toLowerCase().includes(q) ||
        cc.legal_name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.cost_code || "").localeCompare(b.cost_code || ""));

  const handleStartEdit = (cc: CostCenter) => {
    setEditingId(cc.id);
    setEditValue(cc.company || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSave = async (cc: CostCenter) => {
    if (!cc.id) {
      toast.error("Cannot save: missing cost center ID");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/cost-centers/editable", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cc.id, company: editValue.trim() || null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update");
      }

      setCostCenters((prev) =>
        prev.map((c) => (c.id === cc.id ? { ...c, company: editValue.trim() || null } : c))
      );
      setEditingId(null);
      setEditValue("");
      toast.success("Cost center name updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!customersGroupId) {
      toast.error("Missing client ID");
      return;
    }
    if (!form.company.trim() && !form.legal_name.trim()) {
      toast.error("Company or Legal Name is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/cost-centers/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customers_grouped_id: customersGroupId,
          company: form.company.trim(),
          legal_name: form.legal_name.trim(),
          contact_name: form.contact_name.trim(),
          contact_email: form.contact_email.trim(),
          contact_phone: form.contact_phone.trim(),
          vat_number: form.vat_number.trim() || null,
          registration_number: form.registration_number.trim() || null,
          physical_address_1: form.physical_address_1.trim() || null,
          physical_address_2: form.physical_address_2.trim() || null,
          physical_address_3: form.physical_address_3.trim() || null,
          physical_area: form.physical_area.trim() || null,
          physical_province: form.physical_province.trim() || null,
          physical_code: form.physical_code.trim() || null,
          postal_address_1: form.postal_address_1.trim() || null,
          postal_address_2: form.postal_address_2.trim() || null,
          postal_address_3: form.postal_address_3.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create cost center");
      }

      const data = await res.json();
      setCostCenters((prev) => [...prev, data.costCenter]);
      setForm(emptyForm);
      setShowForm(false);
      toast.success(`Cost center ${data.newCostCode} created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create cost center");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Cost Centers</h2>
          <p className="text-[10px] text-gray-500">
            {costCenters.length} cost center{costCenters.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowForm(!showForm)}
            disabled={!customersGroupId}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Cost Center
          </Button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-40 text-xs pl-7"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchCostCenters} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="shrink-0 mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700">New Cost Center</h3>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setShowForm(false); setForm(emptyForm); }} disabled={submitting}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <FormField label="Cost Center Name *" field="company" value={form.company} onChange={(v) => setForm((p) => ({ ...p, company: v }))} disabled={submitting} />
            <FormField label="Legal Name" field="legal_name" value={form.legal_name} onChange={(v) => setForm((p) => ({ ...p, legal_name: v }))} disabled={submitting} />
            <FormField label="Contact Name" field="contact_name" value={form.contact_name} onChange={(v) => setForm((p) => ({ ...p, contact_name: v }))} disabled={submitting} />
            <FormField label="Contact Email" field="contact_email" type="email" value={form.contact_email} onChange={(v) => setForm((p) => ({ ...p, contact_email: v }))} disabled={submitting} />
            <FormField label="Contact Phone" field="contact_phone" value={form.contact_phone} onChange={(v) => setForm((p) => ({ ...p, contact_phone: v }))} disabled={submitting} />
            <FormField label="VAT Number" field="vat_number" value={form.vat_number} onChange={(v) => setForm((p) => ({ ...p, vat_number: v }))} disabled={submitting} />
            <FormField label="Registration Number" field="registration_number" value={form.registration_number} onChange={(v) => setForm((p) => ({ ...p, registration_number: v }))} disabled={submitting} />
            <FormField label="Area" field="physical_area" value={form.physical_area} onChange={(v) => setForm((p) => ({ ...p, physical_area: v }))} disabled={submitting} />
            <FormField label="Province" field="physical_province" value={form.physical_province} onChange={(v) => setForm((p) => ({ ...p, physical_province: v }))} disabled={submitting} />
            <FormField label="Code" field="physical_code" value={form.physical_code} onChange={(v) => setForm((p) => ({ ...p, physical_code: v }))} disabled={submitting} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <FormField label="Physical Address 1" field="physical_address_1" value={form.physical_address_1} onChange={(v) => setForm((p) => ({ ...p, physical_address_1: v }))} disabled={submitting} />
            <FormField label="Physical Address 2" field="physical_address_2" value={form.physical_address_2} onChange={(v) => setForm((p) => ({ ...p, physical_address_2: v }))} disabled={submitting} />
            <FormField label="Physical Address 3" field="physical_address_3" value={form.physical_address_3} onChange={(v) => setForm((p) => ({ ...p, physical_address_3: v }))} disabled={submitting} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <FormField label="Postal Address 1" field="postal_address_1" value={form.postal_address_1} onChange={(v) => setForm((p) => ({ ...p, postal_address_1: v }))} disabled={submitting} />
            <FormField label="Postal Address 2" field="postal_address_2" value={form.postal_address_2} onChange={(v) => setForm((p) => ({ ...p, postal_address_2: v }))} disabled={submitting} />
            <FormField label="Postal Address 3" field="postal_address_3" value={form.postal_address_3} onChange={(v) => setForm((p) => ({ ...p, postal_address_3: v }))} disabled={submitting} />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowForm(false); setForm(emptyForm); }} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={submitting}>
              {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Create Cost Center
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 mt-2 bg-white border border-gray-200 rounded-lg overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-gray-500 py-12">No cost centers found</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">Cost Code</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">Company Name</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500">Legal Name</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-500">Validated</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((cc) => {
                const isEditing = editingId === cc.id;
                return (
                  <tr key={cc.id || cc.cost_code} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-900">{cc.cost_code}</span>
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(cc);
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          className="h-6 text-xs w-full max-w-[250px]"
                          autoFocus
                          disabled={saving}
                        />
                      ) : (
                        <span className="text-gray-700">{cc.company || "-"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-[180px]">{cc.legal_name || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge
                        className={`text-[9px] px-1.5 py-0 ${
                          cc.validated ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {cc.validated ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {cc.id ? (
                        isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={() => handleSave(cc)}
                              disabled={saving}
                            >
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                              onClick={handleCancelEdit}
                              disabled={saving}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2"
                            onClick={() => handleStartEdit(cc)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        )
                      ) : (
                        <span className="text-[9px] text-gray-400">No ID</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default memo(FCCostCentersSection);
