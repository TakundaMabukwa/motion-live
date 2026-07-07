"use client";

import { useState, useEffect, useCallback } from "react";
import { useFCSidebar } from "@/components/fc/FCSidebarLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Search, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface CostCenter {
  id: string | null;
  cost_code: string;
  company: string | null;
  legal_name: string | null;
  validated: boolean | null;
  created_at: string | null;
  effective_cost_code?: string;
  total_amount_locked?: boolean;
  total_amount_locked_value?: number | null;
  total_amount_locked_by_email?: string | null;
}

export default function FCCostCentersSection({ costCodes }: { costCodes: string }) {
  const { selectedCostCenter } = useFCSidebar();
  const isAll = selectedCostCenter?.cost_code === "all";

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCostCenters = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("all_new_account_numbers", costCodes);

      const res = await fetch(`/api/cost-centers/client?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch cost centers");
      const data = await res.json();
      setCostCenters(Array.isArray(data?.costCenters) ? data.costCenters : []);
    } catch (err) {
      toast.error("Failed to load cost centers");
    } finally {
      setLoading(false);
    }
  }, [costCodes]);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const filteredCostCenters = costCenters
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
    setEditingId(cc.id || cc.cost_code);
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Cost Centers</h2>
          <p className="text-[10px] text-gray-500">
            {costCenters.length} cost center{costCenters.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Table */}
      <div className="flex-1 min-h-0 mt-2 bg-white border border-gray-200 rounded-lg overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          </div>
        ) : filteredCostCenters.length === 0 ? (
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
              {filteredCostCenters.map((cc) => {
                const isEditing = editingId === (cc.id || cc.cost_code);
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
                      {isEditing ? (
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
