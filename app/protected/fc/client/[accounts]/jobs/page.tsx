"use client";

import { useState, useCallback } from "react";
import { useFCSidebar } from "@/components/fc/FCSidebarLayout";
import { StatsCard, PageHeader } from "@/components/fc/FCTableComponents";
import { Button } from "@/components/ui/button";
import { Loader2, Briefcase, CheckCircle, Clock, DollarSign, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";

const CustomerJobCards = dynamic(
  () => import("@/components/ui-personal/customer-job-cards"),
  { loading: () => <div className="py-4 text-center text-xs text-gray-500">Loading table...</div>, ssr: false },
);

export default function FCJobsPage() {
  const { selectedCostCenter, accounts } = useFCSidebar();
  const accountNumber = selectedCostCenter?.cost_code || accounts.split(",")[0] || "";

  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, revenue: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataLoaded = useCallback((jobs: any[]) => {
    setStats({
      total: jobs.length,
      active: jobs.filter((j) => j.status === "in_progress" || j.status === "active").length,
      pending: jobs.filter((j) => j.status === "pending").length,
      revenue: jobs.reduce((s, j) => s + (parseFloat(j.total_amount || j.quotation_total_amount) || 0), 0),
    });
  }, []);

  if (!selectedCostCenter) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>;
  }

  const fmtVal = (v) => v >= 1000000 ? `R${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `R${(v / 1000).toFixed(1)}K` : `R${v.toFixed(0)}`;

  return (
    <div className="flex flex-col h-full">
      <style>{`
        .fc-jobs .space-y-6 { display: flex; flex-direction: column; gap: 0.5rem !important; }
        .fc-jobs [class*="grid-cols-1"][class*="md:grid-cols-4"] { display: none !important; }
        .fc-jobs [data-slot="card"] {
          border: 1px solid #e5e7eb !important; border-radius: 0.5rem !important; overflow: hidden !important;
        }
        .fc-jobs [data-slot="card-header"] {
          padding: 0.5rem 0.75rem !important; display: flex !important; flex-direction: row !important;
          justify-content: space-between !important; align-items: center !important;
        }
        .fc-jobs [data-slot="card-header"] [data-slot="card-title"] {
          font-size: 0.625rem !important; font-weight: 500 !important; color: #6b7280 !important;
        }
        .fc-jobs [data-slot="card-header"] svg { width: 0.875rem !important; height: 0.875rem !important; }
        .fc-jobs [data-slot="card-content"] { padding: 0.25rem 0.75rem 0.5rem !important; }
        .fc-jobs .font-bold.text-2xl { font-size: 1rem !important; line-height: 1.2 !important; }
        .fc-jobs .text-muted-foreground { font-size: 0.5625rem !important; color: #9ca3af !important; }
        .fc-jobs input[type="text"] { height: 1.75rem !important; font-size: 0.6875rem !important; border-radius: 0.375rem !important; }
        .fc-jobs button { height: 1.5rem !important; font-size: 0.625rem !important; padding: 0 0.5rem !important; border-radius: 0.375rem !important; }
        .fc-jobs button svg { width: 0.75rem !important; height: 0.75rem !important; }
        .fc-jobs table { width: 100% !important; font-size: 0.6875rem !important; border-collapse: collapse !important; }
        .fc-jobs thead { position: sticky !important; top: 0 !important; z-index: 10 !important; background: #f9fafb !important; }
        .fc-jobs th {
          padding: 0.5rem 0.625rem !important; text-align: left !important; font-size: 0.5625rem !important;
          font-weight: 600 !important; color: #6b7280 !important; text-transform: uppercase !important;
          letter-spacing: 0.05em !important; border-bottom: 1px solid #e5e7eb !important;
        }
        .fc-jobs td { padding: 0.5rem 0.625rem !important; border-bottom: 1px solid #f3f4f6 !important; vertical-align: middle !important; }
        .fc-jobs tbody tr:hover { background: #f9fafb !important; }
        .fc-jobs .overflow-x-auto { overflow-x: hidden !important; overflow-y: auto !important; }
        .fc-jobs select { height: 1.75rem !important; font-size: 0.6875rem !important; }
        .fc-jobs .text-sm { font-size: 0.6875rem !important; }
      `}</style>

      <PageHeader
        title="Jobs Management"
        subtitle={`Job cards for ${selectedCostCenter.trading_name || selectedCostCenter.cost_code}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((p) => p + 1)} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-4 gap-3 mt-3 shrink-0">
        <StatsCard title="Total Jobs" value={stats.total} icon={<Briefcase className="h-4 w-4" />} valueColor="text-blue-700" subtitle="All time records" />
        <StatsCard title="Active" value={stats.active} icon={<CheckCircle className="h-4 w-4" />} valueColor="text-green-600" subtitle="In progress" />
        <StatsCard title="Pending" value={stats.pending} icon={<Clock className="h-4 w-4" />} valueColor="text-orange-600" subtitle="Awaiting technician" />
        <StatsCard title="Revenue" value={fmtVal(stats.revenue)} icon={<DollarSign className="h-4 w-4" />} valueColor="text-purple-700" subtitle="Confirmed billing" />
      </div>

      <div className="fc-jobs flex-1 min-h-0 mt-3 overflow-y-auto">
        <CustomerJobCards
          key={refreshKey}
          accountNumber={accountNumber}
          strictAccount
          onDataLoaded={handleDataLoaded}
        />
      </div>
    </div>
  );
}
