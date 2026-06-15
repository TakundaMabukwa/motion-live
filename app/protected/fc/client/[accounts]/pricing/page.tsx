"use client";

import { useState, useEffect, useMemo } from "react";
import { useFCSidebar } from "@/components/fc/FCSidebarLayout";
import { StatsCard, PageHeader } from "@/components/fc/FCTableComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCw, DollarSign, Save, Check, Package } from "lucide-react";
import { toast } from "sonner";

const BILLING_FIELDS = [
  "consultancy", "roaming", "maintenance", "after_hours", "controlroom",
  "fm_unit_rental", "fm_unit_sub",
  "beame_1_rental", "beame_1_sub", "beame_2_rental", "beame_2_sub",
  "beame_3_rental", "beame_3_sub", "beame_4_rental", "beame_4_sub",
  "beame_5_rental", "beame_5_sub",
  "single_probe_rental", "single_probe_sub", "dual_probe_rental", "dual_probe_sub",
  "_4ch_mdvr_rental", "_4ch_mdvr_sub", "_5ch_mdvr_rental", "_5ch_mdvr_sub",
  "_8ch_mdvr_rental", "_8ch_mdvr_sub",
  "a2_dash_cam_rental", "a2_dash_cam_sub",
  "pfk_main_unit_rental", "pfk_main_unit_sub",
  "skylink_pro_rental", "skylink_pro_sub",
  "skylink_trailer_unit_rental", "skylink_trailer_sub",
  "sky_on_batt_ign_rental", "sky_on_batt_sub",
  "skylink_voice_kit_rental", "skylink_voice_kit_sub",
  "sky_scout_12v_rental", "sky_scout_12v_sub",
  "sky_scout_24v_rental", "sky_scout_24v_sub",
  "skyspy_rental", "skyspy_sub", "bidtrack_rental", "bidtrack_sub",
  "driver_app", "additional_data",
  "eps_routing", "eps_dashboard",
  "eps_software_development", "yotg_software_development",
  "maysene_software_development", "waterford_software_development",
  "klaver_software_development", "advatrans_software_development",
  "tt_linehaul_software_development", "tt_express_software_development",
  "tt_fmcg_software_development", "rapid_freight_software_development",
  "remco_freight_software_development", "vt_logistics_software_development",
  "epilite_software_development",
  "calibration",
];

const isAnnuity = (f) => f.includes("rental") || f.includes("sub");

const fmtCurrency = (v) => {
  const n = Number(v);
  if (isNaN(n)) return "R 0.00";
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatLabel = (f) => f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function FCPricingPage() {
  const { selectedCostCenter, accounts } = useFCSidebar();
  const isAll = selectedCostCenter?.cost_code === "all";
  const costCode = isAll ? accounts : selectedCostCenter?.cost_code || accounts;

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedField, setSavedField] = useState(null);

  useEffect(() => {
    if (!costCode) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/vehicles/get?cost_code=${encodeURIComponent(costCode)}`, { cache: "no-store" });
        const data = await res.json().catch(() => []);
        if (active) setVehicles(Array.isArray(data) ? data : Array.isArray(data?.vehicles) ? data.vehicles : []);
      } catch {
        if (active) { setVehicles([]); toast.error("Failed to load vehicles"); }
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [costCode]);

  const pricingItems = useMemo(() => {
    const items = [];
    for (const field of BILLING_FIELDS) {
      const vehiclesWithValue = vehicles.filter((v) => {
        const val = Number(v[field]) || 0;
        return val > 0;
      });
      if (vehiclesWithValue.length === 0) continue;

      const prices = vehiclesWithValue.map((v) => Number(v[field]) || 0);
      const uniquePrices = [...new Set(prices)];
      const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const allSame = uniquePrices.length === 1;

      items.push({
        field,
        label: formatLabel(field),
        annuity: isAnnuity(field),
        vehicleCount: vehiclesWithValue.length,
        totalVehicles: vehicles.length,
        currentPrice: uniquePrices[0] || 0,
        allSame,
        min,
        max,
        avg,
        uniquePrices,
      });
    }
    return items;
  }, [vehicles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return pricingItems;
    return pricingItems.filter((item) => item.label.toLowerCase().includes(q) || item.field.toLowerCase().includes(q));
  }, [pricingItems, search]);

  const totalMonthly = useMemo(() => filtered.reduce((s, item) => s + (item.currentPrice * item.vehicleCount), 0), [filtered]);

  const handleSave = async (field) => {
    const value = parseFloat(editValue);
    if (isNaN(value)) {
      toast.error("Invalid price value");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vehicles/pricing-batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costCode, field, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update");

      setVehicles((prev) => prev.map((v) => ({ ...v, [field]: value })));
      setEditingField(null);
      setEditValue("");
      setSavedField(field);
      setTimeout(() => setSavedField(null), 2000);
      toast.success(`Updated ${formatLabel(field)} to ${fmtCurrency(value)} across ${data.updated} vehicles`);
    } catch (err) {
      toast.error(err.message || "Failed to update pricing");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedCostCenter) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Client Pricing"
        subtitle={`Item pricing for ${selectedCostCenter.trading_name || selectedCostCenter.company || selectedCostCenter.cost_code}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => setLoading(true)} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mt-3 shrink-0">
        <StatsCard title="Total Items" value={pricingItems.length} icon={<Package className="h-4 w-4" />} valueColor="text-blue-700" subtitle="Active billing items" />
        <StatsCard title="Total Vehicles" value={vehicles.length} icon={<Package className="h-4 w-4" />} valueColor="text-green-600" subtitle="Vehicles in fleet" />
        <StatsCard title="Total Monthly" value={fmtCurrency(totalMonthly)} icon={<DollarSign className="h-4 w-4" />} valueColor="text-purple-700" subtitle="Combined pricing" />
        <StatsCard title="Annuity Items" value={pricingItems.filter((i) => i.annuity).length} icon={<DollarSign className="h-4 w-4" />} valueColor="text-orange-600" subtitle="Rental / Subscription" />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mt-3 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs pl-7" />
        </div>
        <span className="text-[10px] text-gray-500">{filtered.length} items</span>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 mt-2 bg-white border border-gray-200 rounded-lg overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-gray-500 py-12">No billing items found for this client.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Vehicles</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.field} className={`hover:bg-gray-50 transition-colors ${savedField === item.field ? "bg-green-50" : ""}`}>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900">{item.label}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{item.field}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    {item.annuity ? (
                      <Badge className="text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700">Annuity</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">Service</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-semibold text-gray-900">{item.vehicleCount}</span>
                    <span className="text-gray-400"> / {item.totalVehicles}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {editingField === item.field ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSave(item.field); if (e.key === "Escape") setEditingField(null); }}
                          className="h-7 w-28 text-xs text-right"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleSave(item.field)} disabled={saving} className="h-7 px-1.5">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <span className="font-semibold text-gray-900">{fmtCurrency(item.currentPrice)}</span>
                        {!item.allSame && (
                          <div className="text-[9px] text-amber-600">
                            Range: {fmtCurrency(item.min)} - {fmtCurrency(item.max)}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                    {fmtCurrency(item.currentPrice * item.vehicleCount)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {editingField === item.field ? (
                      <Button size="sm" variant="ghost" onClick={() => setEditingField(null)} className="h-7 text-xs">
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingField(item.field); setEditValue(String(item.currentPrice)); }}
                        className="h-7 text-xs"
                      >
                        {savedField === item.field ? <Check className="h-3 w-3 mr-1 text-green-600" /> : null}
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
