"use client";

import { useState, useEffect, useMemo } from "react";
import { useFCSidebar } from "@/components/fc/FCSidebarLayout";
import { StatsCard, PageHeader } from "@/components/fc/FCTableComponents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye, RefreshCw, Receipt, Calendar, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import InvoiceReportComponent from "@/components/inv/components/invoice-report";

const getCurrentBillingMonth = () => {
  const now = new Date();
  const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return `${d.toISOString().slice(0, 7)}-01`;
};

const norm = (v) => {
  const r = String(v || "").trim();
  if (!r) return "";
  if (/^\d{4}-\d{2}$/.test(r)) return `${r}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(r)) return `${r.slice(0, 7)}-01`;
  const p = new Date(r);
  if (isNaN(p.getTime())) return "";
  return `${p.getUTCFullYear()}-${String(p.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

const fmtDate = (v) => {
  if (!v) return "N/A";
  const p = new Date(v);
  return isNaN(p.getTime()) ? "N/A" : p.toLocaleDateString("en-GB");
};

const fmtMonth = (v) => {
  const n = norm(v);
  if (!n) return "N/A";
  const p = new Date(`${n}T00:00:00Z`);
  return isNaN(p.getTime()) ? n : p.toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
};

const fmtCurrency = (v) => {
  const n = Number(v);
  if (isNaN(n)) return "R 0";
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const statusBadge = (inv) => {
  const amt = Number(inv?.amount || inv?.total_incl) || 0;
  if (amt > 10000) return <Badge className="text-[9px] px-1.5 py-0 bg-red-100 text-red-700">Overdue</Badge>;
  return <Badge className="text-[9px] px-1.5 py-0 bg-green-100 text-green-700">Paid</Badge>;
};

export default function FCInvoicesPage() {
  const { selectedCostCenter, accounts } = useFCSidebar();
  const costCode = selectedCostCenter?.cost_code || accounts.split(",")[0] || "";

  const [billingMonth, setBillingMonth] = useState(norm(getCurrentBillingMonth()));
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!costCode) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const bm = norm(billingMonth) || getCurrentBillingMonth();
        const q = new URLSearchParams({ accountNumber: costCode, billingMonth: bm });
        const res = await fetch(`/api/invoices/account/history?${q}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (active) setInvoices(Array.isArray(data?.invoices) ? data.invoices : []);
      } catch {
        if (active) { setInvoices([]); toast.error("Failed to load invoices"); }
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [costCode, billingMonth]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return invoices;
    return invoices.filter((i) =>
      String(i?.job_number || "").toLowerCase().includes(q) ||
      String(i?.invoice_number || "").toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const totalAmount = useMemo(() => filtered.reduce((s, i) => s + (Number(i?.amount || i?.total_incl) || 0), 0), [filtered]);
  const pendingCount = useMemo(() => filtered.filter((i) => {
    const amt = Number(i?.amount || i?.total_incl) || 0;
    return amt > 0 && amt <= 10000;
  }).length, [filtered]);
  const overdueCount = useMemo(() => filtered.filter((i) => {
    const amt = Number(i?.amount || i?.total_incl) || 0;
    return amt > 10000;
  }).length, [filtered]);

  if (!selectedCostCenter) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>;
  }

  const columns = [
    { key: "invoice_date", label: "Date", render: (v, row) => <span className="text-gray-600">{fmtDate(row?.invoice_date || row?.created_at)}</span> },
    { key: "billing_month", label: "Billing Month", render: (v) => <span className="text-gray-600">{fmtMonth(v)}</span> },
    { key: "invoice_number", label: "Invoice #", className: "font-semibold text-blue-600" },
    { key: "order_number", label: "Order #", render: (v) => <span className="text-gray-600">{v || "N/A"}</span> },
    { key: "job_number", label: "Job #", render: (v) => <span className="text-gray-600">{v || "N/A"}</span> },
    { key: "job_type", label: "Type", render: (v) => <Badge variant="outline" className="text-[9px] px-1 py-0">{v || "N/A"}</Badge> },
    { key: "vehicle_reg", label: "Reg", render: (v) => <span className="text-gray-600">{v || "N/A"}</span> },
    { key: "customer", label: "Customer", className: "truncate max-w-[100px]" },
    { key: "amount", label: "Amount", className: "text-right font-semibold", render: (v, row) => fmtCurrency(row?.amount || row?.total_incl) },
    { key: "status", label: "Status", render: (_, row) => statusBadge(row) },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="Invoices Management"
        subtitle={`Manage billing periods and invoices for ${selectedCostCenter.trading_name || selectedCostCenter.cost_code}`}
        actions={
          <>
            <Input type="month" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} className="w-28 h-7 text-xs" />
            <Button variant="outline" size="sm" onClick={() => setLoading(true)} className="h-7 text-xs"><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mt-3 shrink-0">
        <StatsCard title={`Total Invoiced (${fmtMonth(billingMonth)})`} value={fmtCurrency(totalAmount)} icon={<Receipt className="h-4 w-4" />} valueColor="text-blue-700" />
        <StatsCard title="Pending Approval" value={pendingCount} icon={<Clock className="h-4 w-4" />} valueColor="text-yellow-600" subtitle="Requires Review" />
        <StatsCard title="Overdue Invoices" value={overdueCount} icon={<AlertTriangle className="h-4 w-4" />} valueColor="text-red-600" subtitle="Action required" trend={`${overdueCount} items`} trendColor="text-red-500" />
        <div className="bg-blue-600 text-white rounded-lg p-3 flex flex-col justify-between min-h-[80px]">
          <span className="text-[10px] font-medium text-blue-200 uppercase tracking-wider">Current Billing Month</span>
          <div className="text-xl font-bold">{fmtMonth(billingMonth)}</div>
          <span className="text-[9px] text-blue-300">Closes in {new Date(new Date(billingMonth).getFullYear(), new Date(billingMonth).getMonth() + 1, 0).getDate() - new Date().getDate()} days</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mt-3 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search by Invoice or Job Number..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs pl-7" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 mt-2 bg-white border border-gray-200 rounded-lg overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-gray-500 py-12">No invoices found for {fmtMonth(billingMonth)}.</div>
        ) : (
          <div className="">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200">
                  {columns.map((col) => (
                    <th key={col.key} className={`px-2.5 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider ${col.headerClassName || ""}`}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((inv, idx) => (
                  <tr key={`${inv?.id || idx}`} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setPreview(inv)}>
                    <td className="px-2.5 py-2.5 text-gray-600">{fmtDate(inv?.invoice_date || inv?.created_at)}</td>
                    <td className="px-2.5 py-2.5 text-gray-600">{fmtMonth(inv?.billing_month)}</td>
                    <td className="px-2.5 py-2.5 font-semibold text-blue-600">{inv?.invoice_number || "N/A"}</td>
                    <td className="px-2.5 py-2.5 text-gray-600">{inv?.order_number || "N/A"}</td>
                    <td className="px-2.5 py-2.5 text-gray-600">{inv?.job_number || "N/A"}</td>
                    <td className="px-2.5 py-2.5"><Badge variant="outline" className="text-[9px] px-1.5 py-0">{inv?.job_type || "N/A"}</Badge></td>
                    <td className="px-2.5 py-2.5 text-gray-600">{inv?.vehicle_reg || "N/A"}</td>
                    <td className="px-2.5 py-2.5 text-gray-700"><div className="truncate max-w-[120px]" title={inv?.customer}>{inv?.customer || "N/A"}</div></td>
                    <td className="px-2.5 py-2.5 text-right font-semibold text-gray-900">{fmtCurrency(inv?.amount || inv?.total_incl)}</td>
                    <td className="px-2.5 py-2.5">{statusBadge(inv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50">
          <div className="bg-white p-4 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-sm">Invoice {preview.invoice_number || "Preview"}</h2>
              <Button variant="outline" size="sm" onClick={() => setPreview(null)} className="h-7 text-xs">Close</Button>
            </div>
            <InvoiceReportComponent invoice={preview} />
          </div>
        </div>
      )}
    </div>
  );
}
