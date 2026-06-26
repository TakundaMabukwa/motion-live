"use client";

import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";

interface ClientRow {
  cost_code: string;
  company: string;
  annuity_flag: boolean;
  invoice_number: string | null;
  invoice_count: number;
  total_amount: number;
  subtotal: number;
  vat_amount: number;

}

interface FcGroup {
  fc_id: string;
  fc_email: string;
  clients: ClientRow[];
  total_invoiced: number;
  total_ex_vat: number;
  total_vat: number;
  client_count: number;
  invoiced_client_count: number;
  all_annuity_done: boolean;
}

interface OverviewSummary {
  totalExVat: number;
  totalVat: number;
  totalInclVat: number;
  fcsDone: number;
  fcsTotal: number;
}

const fmt = (v: unknown) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 }).format(Number(v || 0));



export default function FcAnnuityPage() {
  const [fcGroups, setFcGroups] = useState<FcGroup[]>([]);
  const [summary, setSummary] = useState<OverviewSummary>({ totalExVat: 0, totalVat: 0, totalInclVat: 0, fcsDone: 0, fcsTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleFc = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const fetchData = async (month = selectedMonth) => {
    try {
      if (!loading) setRefreshing(true);
      const q = new URLSearchParams();
      if (month) q.set("month", month);
      const res = await fetch(`/api/master/fc-annuity-overview?${q}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFcGroups(data.fcGroups || []);
      setSummary({
        totalExVat: data.totalExVat || 0,
        totalVat: data.totalVat || 0,
        totalInclVat: data.totalInclVat || 0,
        fcsDone: data.fcsDone || 0,
        fcsTotal: data.fcsTotal || 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(selectedMonth); }, [selectedMonth]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-xl">FC Annuity Overview</h1>
          <p className="text-xs text-gray-500">All FC clients, annuity flagged items with invoice amounts</p>
        </div>
        <Button onClick={() => fetchData(selectedMonth)} disabled={refreshing} variant="outline" size="sm">
          {refreshing ? <Loader2 className="mr-1 w-3 h-3 animate-spin" /> : <RefreshCw className="mr-1 w-3 h-3" />}
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Total Ex VAT</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{fmt(summary.totalExVat)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Total VAT</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{fmt(summary.totalVat)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">Total Incl VAT</div>
            <div className="text-xl font-bold text-green-600 mt-1">{fmt(summary.totalInclVat)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
        <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="h-8 w-40 text-sm" />
        <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectedMonth(currentMonth)}>Current</Button>
        <div className="flex-1" />
        <div className="text-xs text-slate-500 space-x-3">
          <span><strong className="text-slate-700">{summary.fcsTotal}</strong> FCs</span>
          <span>&middot;</span>
          <span>Done: <strong className="text-green-600">{summary.fcsDone}</strong> / <strong className="text-slate-700">{summary.fcsTotal}</strong></span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          <Loader2 className="mr-2 w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : fcGroups.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No data found.</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-left uppercase tracking-wider">Account</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-left uppercase tracking-wider">Company</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-center uppercase tracking-wider">Annuity Ran</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-center uppercase tracking-wider">Invoice #</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-right uppercase tracking-wider">Ex VAT</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-right uppercase tracking-wider">VAT</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-right uppercase tracking-wider">Incl VAT</th>

              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fcGroups.map((fc) => {
                const isUnallocated = fc.fc_id === "unallocated";
                const isOpen = expanded.has(fc.fc_id);
                return (
                  <Fragment key={fc.fc_id}>
                    {/* FC group header row — clickable */}
                    <tr
                      className={`${isUnallocated ? "bg-orange-50" : "bg-slate-100"} cursor-pointer hover:brightness-95`}
                      onClick={() => toggleFc(fc.fc_id)}
                    >
                      <td colSpan={7} className="px-4 py-2 text-[11px] font-semibold text-slate-700">
                        <span className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                          {fc.fc_email}
                          {isUnallocated ? (
                            <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">No FC Assigned</Badge>
                          ) : fc.all_annuity_done ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Done
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                              <XCircle className="w-2.5 h-2.5" /> Not Done
                            </Badge>
                          )}
                          <span className="font-normal text-slate-400">
                            {fc.client_count} clients &middot; {fc.invoiced_client_count} invoiced &middot; {fmt(fc.total_invoiced)} incl VAT
                          </span>
                        </span>
                      </td>
                    </tr>
                    {/* Client rows — only when expanded */}
                    {isOpen && fc.clients.map((c, i) => (
                      <tr key={`${fc.fc_id}-${c.cost_code}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-4 py-2 text-[11px] font-mono text-gray-700">{c.cost_code}</td>
                        <td className="px-4 py-2 text-[11px] text-gray-600 truncate max-w-[200px]">{c.company}</td>
                        <td className="px-4 py-2 text-[11px] text-center">
                          {c.annuity_flag && c.invoice_number ? (
                            <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0">Yes</Badge>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-center font-mono text-gray-700">
                          {c.invoice_number || "—"}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-right text-gray-600">
                          {c.invoice_number ? fmt(c.subtotal) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-right text-gray-600">
                          {c.invoice_number ? fmt(c.vat_amount) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-right font-semibold">
                          {c.invoice_number ? (
                            <span className="text-gray-900">{fmt(c.total_amount)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
