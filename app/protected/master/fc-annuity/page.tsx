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
  annuity_invoice_number: string | null;
  annuity_invoice_count: number;
  annuity_subtotal: number;
  annuity_total: number;
  job_card_invoice_number: string | null;
  job_card_invoice_count: number;
  job_card_subtotal: number;
  job_card_total: number;
  credit_note_count: number;
  credit_note_number: string | null;
  credit_total: number;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
}

interface FcGroup {
  fc_id: string;
  fc_email: string;
  clients: ClientRow[];
  total_invoiced: number;
  total_ex_vat: number;
  total_vat: number;
  annuity_total: number;
  job_card_total: number;
  credit_total: number;
  client_count: number;
  invoiced_client_count: number;
  all_annuity_done: boolean;
}

interface OverviewSummary {
  totalExVat: number;
  totalVat: number;
  totalInclVat: number;
  totalAnnuity: number;
  totalJobCards: number;
  totalCreditNotes: number;
  fcsDone: number;
  fcsTotal: number;
}

type SourceFilter = "all" | "annuity" | "job_card" | "credit_notes";

const fmt = (v: unknown) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 }).format(Number(v || 0));

const creditExVat = (inclVat: number) => inclVat / 1.15;
const creditVat = (inclVat: number) => inclVat - inclVat / 1.15;

const SOURCE_TABS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "annuity", label: "Annuity" },
  { value: "job_card", label: "Job Card" },
  { value: "credit_notes", label: "Credit Notes" },
];

export default function FcAnnuityPage() {
  const [fcGroups, setFcGroups] = useState<FcGroup[]>([]);
  const [summary, setSummary] = useState<OverviewSummary>({ totalExVat: 0, totalVat: 0, totalInclVat: 0, totalAnnuity: 0, totalJobCards: 0, totalCreditNotes: 0, fcsDone: 0, fcsTotal: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

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
        totalAnnuity: data.totalAnnuity || 0,
        totalJobCards: data.totalJobCards || 0,
        totalCreditNotes: data.totalCreditNotes || 0,
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

  const hasSource = (c: ClientRow, filter: SourceFilter) => {
    switch (filter) {
      case "annuity": return c.annuity_invoice_count > 0;
      case "job_card": return c.job_card_invoice_count > 0;
      case "credit_notes": return c.credit_note_count > 0;
      default: return true;
    }
  };

  const getFcFilteredTotals = (fc: FcGroup) => {
    if (sourceFilter === "all") {
      return { annuity: fc.annuity_total, jobCards: fc.job_card_total, credit: fc.credit_total, net: fc.total_invoiced, exVat: fc.total_ex_vat, vat: fc.total_vat, clientCount: fc.client_count, invoicedCount: fc.invoiced_client_count };
    }
    const filtered = fc.clients.filter((c) => hasSource(c, sourceFilter));
    let exVat = 0, net = 0;
    for (const c of filtered) {
      if (sourceFilter === "annuity") { exVat += c.annuity_subtotal; net += c.annuity_total; }
      else if (sourceFilter === "job_card") { exVat += c.job_card_subtotal; net += c.job_card_total; }
      else if (sourceFilter === "credit_notes") { exVat += creditExVat(c.credit_total); net += c.credit_total; }
    }
    return {
      annuity: filtered.reduce((s, c) => s + c.annuity_total, 0),
      jobCards: filtered.reduce((s, c) => s + c.job_card_total, 0),
      credit: filtered.reduce((s, c) => s + c.credit_total, 0),
      net,
      exVat,
      vat: net - exVat,
      clientCount: filtered.length,
      invoicedCount: filtered.filter((c) => c.annuity_invoice_count > 0 || c.job_card_invoice_count > 0).length,
    };
  };

  const filteredSummary = (() => {
    if (sourceFilter === "all") return summary;
    let annuity = 0, jobCards = 0, credit = 0, inclVat = 0, exVat = 0;
    for (const fc of fcGroups) {
      const filtered = fc.clients.filter((c) => hasSource(c, sourceFilter));
      for (const c of filtered) {
        if (sourceFilter === "annuity") {
          annuity += c.annuity_total;
          exVat += c.annuity_subtotal;
          inclVat += c.annuity_total;
        } else if (sourceFilter === "job_card") {
          jobCards += c.job_card_total;
          exVat += c.job_card_subtotal;
          inclVat += c.job_card_total;
        } else if (sourceFilter === "credit_notes") {
          credit += c.credit_total;
          exVat += creditExVat(c.credit_total);
          inclVat += c.credit_total;
        }
      }
    }
    return { totalAnnuity: annuity, totalJobCards: jobCards, totalCreditNotes: credit, totalExVat: exVat, totalVat: inclVat - exVat, totalInclVat: inclVat, fcsDone: summary.fcsDone, fcsTotal: summary.fcsTotal };
  })();

  const totalClients = fcGroups.reduce((sum, fc) => sum + fc.client_count, 0);
  const clientsNotRan = fcGroups.reduce((sum, fc) =>
    sum + fc.clients.filter((c) => c.annuity_flag && !c.annuity_invoice_number).length, 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-xl">FC Annuity Overview</h1>
          <p className="text-xs text-gray-500">Annuity, job card invoices &amp; credit notes per FC</p>
        </div>
        <Button onClick={() => fetchData(selectedMonth)} disabled={refreshing} variant="outline" size="sm">
          {refreshing ? <Loader2 className="mr-1 w-3 h-3 animate-spin" /> : <RefreshCw className="mr-1 w-3 h-3" />}
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Annuity</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{fmt(filteredSummary.totalAnnuity)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Job Cards</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">{fmt(filteredSummary.totalJobCards)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Credit Notes</div>
            <div className="text-lg font-bold text-red-600 mt-0.5">-{fmt(filteredSummary.totalCreditNotes)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Annuity Not Ran</div>
            <div className="text-lg font-bold text-red-600 mt-0.5">{clientsNotRan}</div>
            <div className="text-[10px] text-gray-400">of {totalClients} clients</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Total Incl VAT</div>
            <div className="text-lg font-bold text-green-600 mt-0.5">{fmt(filteredSummary.totalInclVat)}</div>
            <div className="text-[10px] text-gray-400">VAT: {fmt(filteredSummary.totalVat)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
        <Input type="month" value={selectedMonth} min="2026-04" onChange={(e) => setSelectedMonth(e.target.value)} className="h-8 w-40 text-sm" />
        <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectedMonth(currentMonth)}>Current</Button>
        <div className="flex-1" />
        <div className="flex rounded-lg border bg-white overflow-hidden">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSourceFilter(tab.value)}
              className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                sourceFilter === tab.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-left uppercase tracking-wider">Client</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-center uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-center uppercase tracking-wider">Annuity</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-center uppercase tracking-wider">Invoice #</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-center uppercase tracking-wider">Job Cards</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-center uppercase tracking-wider">Credit Note</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-right uppercase tracking-wider">Ex VAT</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-right uppercase tracking-wider">VAT</th>
                <th className="px-4 py-2.5 font-medium text-gray-500 text-[11px] text-right uppercase tracking-wider">Incl VAT</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fcGroups.map((fc) => {
                const isUnallocated = fc.fc_id === "unallocated";
                const isOpen = expanded.has(fc.fc_id);
                const ft = getFcFilteredTotals(fc);
                const displayClients = sourceFilter === "all" ? fc.clients : fc.clients.filter((c) => hasSource(c, sourceFilter));

                return (
                  <Fragment key={fc.fc_id}>
                    <tr
                      className={`${isUnallocated ? "bg-orange-50" : "bg-slate-100"} cursor-pointer hover:brightness-95`}
                      onClick={() => toggleFc(fc.fc_id)}
                    >
                      <td className="px-4 py-2 text-[11px] font-semibold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          {isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                          {fc.fc_email.split("@")[0]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[11px] text-slate-500">
                        {ft.clientCount} clients &middot; {ft.invoicedCount} invoiced
                      </td>
                      <td className="px-4 py-2 text-[11px] text-center">
                        {isUnallocated ? (
                          <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">No FC</Badge>
                        ) : fc.all_annuity_done ? (
                          <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Done
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                            <XCircle className="w-2.5 h-2.5" /> Not Done
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-[11px] text-right font-medium text-slate-700">
                        {sourceFilter === "all" || sourceFilter === "annuity" ? fmt(ft.annuity) : fmt(0)}
                      </td>
                      <td className="px-4 py-2 text-[11px] text-center text-slate-400">—</td>
                      <td className="px-4 py-2 text-[11px] text-right font-medium text-slate-700">
                        {sourceFilter === "all" || sourceFilter === "job_card" ? fmt(ft.jobCards) : fmt(0)}
                      </td>
                      <td className="px-4 py-2 text-[11px] text-right font-medium">
                        {(sourceFilter === "all" || sourceFilter === "credit_notes") && ft.credit > 0 ? (
                          <span className="text-red-600">-{fmt(ft.credit)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-[11px] text-right text-slate-500">
                        {fmt(ft.exVat)}
                      </td>
                      <td className="px-4 py-2 text-[11px] text-right text-slate-500">
                        {fmt(ft.vat)}
                      </td>
                      <td className="px-4 py-2 text-[11px] text-right font-semibold text-slate-800">
                        {fmt(ft.net)}
                      </td>
                    </tr>
                    {isOpen && displayClients.map((c, i) => {
                      const exVat = sourceFilter === "annuity" ? c.annuity_subtotal : sourceFilter === "job_card" ? c.job_card_subtotal : sourceFilter === "credit_notes" ? creditExVat(c.credit_total) : c.subtotal;
                      const vat = sourceFilter === "annuity" ? c.annuity_total - c.annuity_subtotal : sourceFilter === "job_card" ? c.job_card_total - c.job_card_subtotal : sourceFilter === "credit_notes" ? creditVat(c.credit_total) : c.vat_amount;
                      const inclVat = sourceFilter === "annuity" ? c.annuity_total : sourceFilter === "job_card" ? c.job_card_total : sourceFilter === "credit_notes" ? c.credit_total : c.total_amount;
                      return (
                      <tr key={`${fc.fc_id}-${c.cost_code}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-4 py-2 text-[11px] font-mono text-gray-700">{c.cost_code}</td>
                        <td className="px-4 py-2 text-[11px] text-gray-600 truncate max-w-[200px]">{c.company}</td>
                        <td className="px-4 py-2 text-[11px] text-center">
                          {c.annuity_flag && c.annuity_invoice_number ? (
                            <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">Yes</Badge>
                          ) : c.annuity_flag ? (
                            <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">No</Badge>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-center font-mono text-gray-700">
                          {c.annuity_invoice_number || c.job_card_invoice_number || "—"}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-center">
                          {c.job_card_invoice_count > 0 ? (
                            <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">{c.job_card_invoice_count}</Badge>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-center">
                          {c.credit_note_number ? (
                            <span className="text-[10px] font-mono text-red-700">{c.credit_note_number}</span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-right text-gray-600">
                          {inclVat !== 0 ? fmt(exVat) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-right text-gray-600">
                          {inclVat !== 0 ? fmt(vat) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-right font-semibold">
                          {inclVat !== 0 ? (
                            <span className={inclVat < 0 ? "text-red-600" : "text-gray-900"}>{fmt(inclVat)}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
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
