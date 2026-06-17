"use client";

import { useState, useCallback } from "react";
import { useFCSidebar } from "@/components/fc/FCSidebarLayout";
import { StatsCard, PageHeader } from "@/components/fc/FCTableComponents";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Clock, DollarSign, Plus, RefreshCw } from "lucide-react";
import ClientJobCards from "@/components/ui-personal/client-job-cards";
import ClientQuoteForm from "@/components/ui-personal/client-quote-form";
import CreateBOIModal from "@/components/fc/CreateBOIModal";

export default function FCQuotesPage() {
  const { selectedCostCenter, accounts } = useFCSidebar();
  const isAll = selectedCostCenter?.cost_code === "all";
  const accountNumber = isAll ? accounts : selectedCostCenter?.cost_code || accounts;
  const firstAccount = accounts?.split(",")[0]?.trim() || "";

  const [stats, setStats] = useState({ total: 0, pending: 0, draft: 0, totalValue: 0 });
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataLoaded = useCallback((quotes: any[]) => {
    setStats({
      total: quotes.length,
      pending: quotes.filter((q) => q.status === "pending").length,
      draft: quotes.filter((q) => q.status === "draft").length,
      totalValue: quotes.reduce((s, q) => s + (parseFloat(q.quotation_total_amount) || 0), 0),
    });
  }, []);

  if (!selectedCostCenter) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>;
  }

  const fmtVal = (v) => v >= 1000000 ? `R${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `R${(v / 1000).toFixed(1)}K` : `R${v.toFixed(0)}`;

  return (
    <div className="flex flex-col h-full">
      <style>{`
        .fc-quotes .space-y-6 { display: flex; flex-direction: column; gap: 0.5rem !important; }
        .fc-quotes [class*="grid-cols-1"][class*="md:grid-cols-4"] { display: none !important; }
        .fc-quotes [data-slot="card"] {
          border: 1px solid #e5e7eb !important; border-radius: 0.5rem !important; overflow: hidden !important;
        }
        .fc-quotes [data-slot="card-header"] {
          padding: 0.5rem 0.75rem !important; display: flex !important; flex-direction: row !important;
          justify-content: space-between !important; align-items: center !important;
        }
        .fc-quotes [data-slot="card-header"] [data-slot="card-title"] {
          font-size: 0.625rem !important; font-weight: 500 !important; color: #6b7280 !important;
        }
        .fc-quotes [data-slot="card-header"] svg { width: 0.875rem !important; height: 0.875rem !important; }
        .fc-quotes [data-slot="card-content"] { padding: 0.25rem 0.75rem 0.5rem !important; }
        .fc-quotes .font-bold.text-2xl { font-size: 1rem !important; line-height: 1.2 !important; }
        .fc-quotes .text-muted-foreground { font-size: 0.5625rem !important; color: #9ca3af !important; }
        .fc-quotes input[type="text"] { height: 1.75rem !important; font-size: 0.6875rem !important; border-radius: 0.375rem !important; }
        .fc-quotes button { height: 1.5rem !important; font-size: 0.625rem !important; padding: 0 0.5rem !important; border-radius: 0.375rem !important; }
        .fc-quotes button svg { width: 0.75rem !important; height: 0.75rem !important; }
        .fc-quotes table { width: 100% !important; font-size: 0.6875rem !important; border-collapse: collapse !important; }
        .fc-quotes thead { position: sticky !important; top: 0 !important; z-index: 10 !important; background: #f9fafb !important; }
        .fc-quotes th {
          padding: 0.5rem 0.625rem !important; text-align: left !important; font-size: 0.5625rem !important;
          font-weight: 600 !important; color: #6b7280 !important; text-transform: uppercase !important;
          letter-spacing: 0.05em !important; border-bottom: 1px solid #e5e7eb !important;
        }
        .fc-quotes td { padding: 0.5rem 0.625rem !important; border-bottom: 1px solid #f3f4f6 !important; vertical-align: middle !important; }
        .fc-quotes tbody tr:hover { background: #f9fafb !important; }
        .fc-quotes .overflow-x-auto { overflow-x: hidden !important; overflow-y: auto !important; }
        .fc-quotes select { height: 1.75rem !important; font-size: 0.6875rem !important; }
        .fc-quotes .text-sm { font-size: 0.6875rem !important; }
        .fc-quotes .max-w-5xl { max-width: 56rem !important; }
      `}</style>

      <PageHeader
        title="Quotes Management"
        subtitle={`Manage quotes for ${selectedCostCenter.trading_name || selectedCostCenter.company || selectedCostCenter.cost_code}`}
        actions={
          <div className="flex items-center gap-1.5">
            <CreateBOIModal />
            <Button onClick={() => setShowQuoteForm(true)} className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
              <Plus className="h-3 w-3 mr-1" />New Quote
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRefreshKey((p) => p + 1)} className="h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />Refresh
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-3 mt-3 shrink-0">
        <StatsCard title="Total Quotes" value={stats.total} icon={<FileText className="h-4 w-4" />} valueColor="text-blue-700" subtitle="All time quotes" />
        <StatsCard title="Pending" value={stats.pending} icon={<Clock className="h-4 w-4" />} valueColor="text-orange-600" subtitle="Awaiting approval" />
        <StatsCard title="Draft" value={stats.draft} icon={<FileText className="h-4 w-4" />} valueColor="text-gray-600" subtitle="Draft quotes" />
        <StatsCard title="Total Value" value={fmtVal(stats.totalValue)} icon={<DollarSign className="h-4 w-4" />} valueColor="text-purple-700" subtitle="Combined value" />
      </div>

      <div className="fc-quotes flex-1 min-h-0 mt-3 overflow-y-auto">
        <ClientJobCards
          key={refreshKey}
          accountNumber={accountNumber}
          companyName={selectedCostCenter?.trading_name || selectedCostCenter?.company_name || selectedCostCenter?.company}
          strictAccount={!isAll && !!accountNumber}
          onDataLoaded={handleDataLoaded}
          onQuoteCreated={() => { setShowQuoteForm(false); setRefreshKey((p) => p + 1); }}
        />
      </div>

      {showQuoteForm && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50">
          <div className="bg-white p-4 rounded-lg w-full max-w-4xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-sm">New Quote</h2>
              <Button variant="outline" size="sm" onClick={() => setShowQuoteForm(false)} className="h-7 text-xs">Close</Button>
            </div>
            <ClientQuoteForm
              customer={selectedCostCenter}
              vehicles={[]}
              accountInfo={isAll ? { ...selectedCostCenter, cost_code: firstAccount, cost_center_code: firstAccount } : selectedCostCenter}
              onQuoteCreated={() => { setShowQuoteForm(false); setRefreshKey((p) => p + 1); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
