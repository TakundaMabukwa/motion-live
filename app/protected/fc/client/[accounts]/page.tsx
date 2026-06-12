"use client";

import { useState, useEffect } from "react";
import { useFCSidebar } from "@/components/fc/FCSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  ChevronRight,
  RefreshCw,
  Loader2,
  Users,
  Car,
} from "lucide-react";

interface CostCenterDetail {
  cost_code: string;
  company?: string;
  trading_name?: string;
  legal_names?: string;
  operational?: boolean;
  fc_id?: string | null;
  fc_email?: string | null;
}

export default function FCDashboardPage() {
  const { accounts, selectedCostCenter, setSelectedCostCenter, loading: ctxLoading } = useFCSidebar();
  const [costCenterDetails, setCostCenterDetails] = useState<CostCenterDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accounts) return;
    let cancelled = false;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("all_new_account_numbers", accounts);
        const res = await fetch(`/api/cost-centers/client?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setCostCenterDetails(Array.isArray(data?.costCenters) ? data.costCenters : []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDetails();
    return () => { cancelled = true; };
  }, [accounts]);

  if (ctxLoading || loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Cost Centers</h1>
          <p className="text-xs text-gray-500">{costCenterDetails.length} cost center{costCenterDetails.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLoading(true)} className="h-7 text-xs">
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-2 p-2 rounded bg-white border border-gray-200">
          <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{costCenterDetails.length}</p>
            <p className="text-[10px] text-gray-500">Cost Centers</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-white border border-gray-200">
          <div className="w-7 h-7 rounded bg-green-100 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{costCenterDetails.filter((cc) => cc.fc_id).length}</p>
            <p className="text-[10px] text-gray-500">Assigned FCs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-white border border-gray-200">
          <div className="w-7 h-7 rounded bg-purple-100 flex items-center justify-center">
            <Car className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{costCenterDetails.filter((cc) => cc.operational).length}</p>
            <p className="text-[10px] text-gray-500">Sites</p>
          </div>
        </div>
      </div>

      {/* Cost Center List */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xs font-semibold text-gray-700">All Cost Centers</h2>
        </div>
        {costCenterDetails.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-gray-500">No cost centers found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {costCenterDetails.map((cc) => {
              const isSelected = selectedCostCenter?.cost_code === cc.cost_code;
              return (
                <button
                  key={cc.cost_code}
                  onClick={() => setSelectedCostCenter(cc as any)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                    isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      <Building2 className="h-3 w-3" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-900 truncate">
                          {cc.trading_name || cc.company || cc.cost_code}
                        </span>
                        {cc.operational && <Badge variant="outline" className="text-[9px] px-1 py-0">Site</Badge>}
                        {isSelected && <Badge className="text-[9px] px-1 py-0 bg-blue-600">Selected</Badge>}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {cc.cost_code}{cc.fc_email ? ` \u00B7 ${cc.fc_email}` : ""}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
