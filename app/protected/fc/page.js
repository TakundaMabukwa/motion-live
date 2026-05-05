"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import DashboardHeader from "@/components/shared/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import GlobalView from "@/components/ui-personal/global-view";
import { useClients } from "@/contexts/ClientsContext";
import { AccountsProvider } from "@/contexts/AccountsContext";
import AccountsClientsSection from "@/components/accounts/AccountsClientsSection";
import RoleEscalationsPanel from "@/components/shared/RoleEscalationsPanel";
import {
  Users,
  Search,
  Plus,
  Loader2,
  Building2,
  Globe,
  Building,
  FileText,
  ExternalLink,
  CheckCircle,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  MessageSquareText,
  Printer,
} from "lucide-react";
import CreateCalibrationJobModal from '@/components/master/CreateCalibrationJobModal';
import { toast } from "sonner";
export default function AccountsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    companyGroups, 
    contactInfo, 
    loading, 
    loadingContacts, 
    totalCount, 
    fetchCompanyGroups, 
    isDataLoaded 
  } = useClients();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('global');
  const [fromRiaPendingCount, setFromRiaPendingCount] = useState(0);
  const [escalationActionJobId, setEscalationActionJobId] = useState(null);
  const [printingEscalationJobId, setPrintingEscalationJobId] = useState(null);
  const lastCompaniesRefreshRef = useRef(0);

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatFieldLabel = (key) =>
    String(key || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const formatJobValue = (key, value) => {
    if (value === null || value === undefined) return "-";

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? String(value) : "-";
    }

    if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
      const safeJson = JSON.stringify(value, null, 2);
      return safeJson && safeJson !== "[]" && safeJson !== "{}" ? safeJson : "-";
    }

    const raw = String(value).trim();
    if (!raw) return "-";

    if (/_at$|_date$|date|time/i.test(String(key || ""))) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleString("en-ZA", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    }

    return raw;
  };

  const buildEscalationPrintHtml = (job) => {
    const parseArrayValue = (value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    const toNumber = (value) => {
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const getText = (...values) =>
      values.map((value) => String(value || "").trim()).find((value) => value.length > 0) || "";

    const quotationProducts = parseArrayValue(job?.quotation_products).filter(
      (item) => item && typeof item === "object",
    );

    const billingStatuses =
      typeof job?.billing_statuses === "string"
        ? (() => {
            try {
              return JSON.parse(job.billing_statuses);
            } catch {
              return null;
            }
          })()
        : job?.billing_statuses;

    const billingInvoice =
      billingStatuses && typeof billingStatuses === "object" && billingStatuses.invoice
        ? billingStatuses.invoice
        : null;

    const invoiceItems = parseArrayValue(
      billingInvoice?.line_items || billingInvoice?.items || billingInvoice?.products || [],
    ).filter((item) => item && typeof item === "object");

    const billedItems = [
      ...quotationProducts.map((item, index) => {
        const quantity = Math.max(1, toNumber(item.quantity) || 1);
        const unitExVat = toNumber(
          item.unit_price_without_vat ||
            item.cash_price ||
            item.rental_price ||
            item.subscription_price ||
            item.installation_price ||
            item.de_installation_price ||
            item.unit_price ||
            item.price,
        );
        const vatAmount = toNumber(item.vat_amount || item.vat);
        const totalInclVat = toNumber(
          item.total_including_vat ||
            item.total_incl_vat ||
            item.total_price ||
            item.total ||
            Number((quantity * unitExVat + vatAmount).toFixed(2)),
        );

        return {
          id: `quote-${index}`,
          source: "Quotation",
          description:
            getText(
              item.description,
              item.name,
              item.item_description,
              item.product_name,
            ) || "Quoted item",
          quantity,
          unitExVat,
          vatAmount,
          totalInclVat,
        };
      }),
      ...invoiceItems.map((item, index) => {
        const quantity = Math.max(1, toNumber(item.quantity) || 1);
        const unitExVat = toNumber(
          item.unit_price_without_vat || item.unit_price || item.price,
        );
        const vatAmount = toNumber(item.vat_amount || item.vat);
        const totalInclVat = toNumber(
          item.total_including_vat ||
            item.total_incl_vat ||
            item.total ||
            Number((quantity * unitExVat + vatAmount).toFixed(2)),
        );

        return {
          id: `invoice-${index}`,
          source: "Invoice",
          description:
            getText(item.description, item.item_description, item.product_name) ||
            "Billed item",
          quantity,
          unitExVat,
          vatAmount,
          totalInclVat,
        };
      }),
    ];

    const billedTotals = billedItems.reduce(
      (summary, item) => ({
        exVat: summary.exVat + item.unitExVat * item.quantity,
        vat: summary.vat + item.vatAmount,
        total: summary.total + item.totalInclVat,
      }),
      { exVat: 0, vat: 0, total: 0 },
    );

    const formatCurrency = (value) =>
      `R ${Number(value || 0).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const billedItemsSection =
      billedItems.length > 0
        ? `
          <h2 class="section-title">Billed Items</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Source</th>
                <th style="text-align:right;">Qty</th>
                <th style="text-align:right;">Unit Ex VAT</th>
                <th style="text-align:right;">VAT</th>
                <th style="text-align:right;">Total Incl</th>
              </tr>
            </thead>
            <tbody>
              ${billedItems
                .map(
                  (item) => `
                    <tr>
                      <td>${escapeHtml(item.description)}</td>
                      <td>${escapeHtml(item.source)}</td>
                      <td style="text-align:right;">${escapeHtml(String(item.quantity))}</td>
                      <td style="text-align:right;">${escapeHtml(formatCurrency(item.unitExVat))}</td>
                      <td style="text-align:right;">${escapeHtml(formatCurrency(item.vatAmount))}</td>
                      <td style="text-align:right;">${escapeHtml(formatCurrency(item.totalInclVat))}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
          <div class="totals">
            <div>Ex VAT: <strong>${escapeHtml(formatCurrency(billedTotals.exVat))}</strong></div>
            <div>VAT: <strong>${escapeHtml(formatCurrency(billedTotals.vat))}</strong></div>
            <div>Total Incl: <strong>${escapeHtml(formatCurrency(billedTotals.total))}</strong></div>
          </div>
        `
        : "";

    const orderedKeys = [
      "job_number",
      "order_number",
      "job_type",
      "job_sub_type",
      "job_status",
      "status",
      "priority",
      "role",
      "escalation_source_role",
      "escalation_role",
      "move_to_role",
      "move_to",
      "new_account_number",
      "account_id",
      "customer_name",
      "customer_email",
      "customer_phone",
      "customer_address",
      "contact_person",
      "vehicle_registration",
      "vehicle_make",
      "vehicle_model",
      "vehicle_year",
      "vin_numer",
      "odormeter",
      "purchase_type",
      "quote_type",
      "quotation_number",
      "quotation_total_amount",
      "estimated_cost",
      "actual_cost",
      "estimated_duration_hours",
      "job_date",
      "due_date",
      "completion_date",
      "created_at",
      "updated_at",
      "job_description",
      "special_instructions",
      "work_notes",
      "completion_notes",
      "fc_note_acknowledged",
      "parts_required",
      "quotation_products",
      "equipment_used",
      "billing_statuses",
      "deinstall_vehicles",
    ];

    const orderedEntries = [];
    const consumed = new Set();
    for (const key of orderedKeys) {
      if (!Object.prototype.hasOwnProperty.call(job || {}, key)) continue;
      const formatted = formatJobValue(key, job[key]);
      if (formatted === "-") continue;
      orderedEntries.push([key, formatted]);
      consumed.add(key);
    }

    const extraEntries = Object.entries(job || {})
      .filter(([key]) => !consumed.has(key))
      .map(([key, value]) => [key, formatJobValue(key, value)])
      .filter(([, value]) => value !== "-");

    const rows = [...orderedEntries, ...extraEntries]
      .map(([key, value]) => {
        const isBlockValue = String(value).includes("\n") || String(value).length > 120;
        const renderedValue = isBlockValue
          ? `<pre>${escapeHtml(value)}</pre>`
          : `<span>${escapeHtml(value)}</span>`;
        return `
          <tr>
            <th>${escapeHtml(formatFieldLabel(key))}</th>
            <td>${renderedValue}</td>
          </tr>
        `;
      })
      .join("");

    const generatedAt = new Date().toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Job ${escapeHtml(job?.job_number || job?.id || "Details")}</title>
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 20px; color: #0f172a; }
            h1 { margin: 0; font-size: 24px; }
            h2.section-title { margin: 18px 0 8px; font-size: 16px; }
            .meta { margin-top: 6px; color: #334155; font-size: 12px; }
            .pill { display: inline-block; margin-top: 8px; padding: 4px 10px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; font-size: 12px; }
            th { width: 28%; text-align: left; background: #f8fafc; color: #1e293b; }
            td { color: #0f172a; white-space: pre-wrap; word-break: break-word; }
            pre { margin: 0; font-family: Consolas, Monaco, monospace; font-size: 11px; white-space: pre-wrap; word-break: break-word; }
            .totals { margin-top: 8px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; font-size: 12px; }
            @media print { body { margin: 12mm; } }
          </style>
        </head>
        <body>
          <h1>FC Escalation Job Report</h1>
          <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
          <div class="pill">Job: ${escapeHtml(job?.job_number || "N/A")}</div>
          <div class="pill">Account: ${escapeHtml(job?.new_account_number || "N/A")}</div>
          <div class="pill">Customer: ${escapeHtml(job?.customer_name || "N/A")}</div>
          ${billedItemsSection}
          <table>
            <tbody>
              ${rows || `<tr><td colspan="2">No job data available.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const handleEscalationPrint = async (job) => {
    if (!job?.id) return;

    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) {
      toast.error("Please allow popups to print job reports.");
      return;
    }

    setPrintingEscalationJobId(job.id);
    printWindow.document.write("<html><body style='font-family:Arial,sans-serif;padding:16px;'>Loading job details...</body></html>");
    printWindow.document.close();

    try {
      const response = await fetch(`/api/job-cards/${job.id}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load full job details for printing");
      }

      const fullJob = await response.json();
      const printHtml = buildEscalationPrintHtml(fullJob || job);

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = function onLoad() {
        printWindow.print();
      };
    } catch (error) {
      console.error("Error printing escalated job:", error);
      toast.error(error instanceof Error ? error.message : "Failed to print escalated job");
      printWindow.close();
    } finally {
      setPrintingEscalationJobId(null);
    }
  };

  const maybeRefreshCompanyGroups = async (force = false) => {
    if (activeTab !== "companies") return;

    const now = Date.now();
    const isFresh = now - lastCompaniesRefreshRef.current < 60000;

    if (!force && isDataLoaded && isFresh) {
      return;
    }

    await fetchCompanyGroups("");
    lastCompaniesRefreshRef.current = Date.now();
  };



  // Initial load
  useEffect(() => {
    if (activeTab === 'companies') {
      maybeRefreshCompanyGroups(true);
    }
  }, [activeTab, pathname]);

  useEffect(() => {
    if (activeTab !== 'companies') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        maybeRefreshCompanyGroups(false);
      }
    };

    const handleWindowFocus = () => {
      maybeRefreshCompanyGroups(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [activeTab, isDataLoaded, fetchCompanyGroups]);

  useEffect(() => {
    const fetchFromRiaPendingCount = async () => {
      try {
        const response = await fetch('/api/fc/from-ria-count', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to fetch From Ria jobs');
        }

        const data = await response.json();
        setFromRiaPendingCount(Number(data?.pendingCount || 0));
      } catch (error) {
        console.error('Error fetching From Ria pending count:', error);
        setFromRiaPendingCount(0);
      }
    };

    fetchFromRiaPendingCount();

    const intervalId = window.setInterval(fetchFromRiaPendingCount, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const visibleCompanyGroups = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return companyGroups;

    return companyGroups.filter((group) => {
      const searchText = [
        group.company_group,
        group.legal_names,
        group.all_new_account_numbers,
        ...(group.legal_names_list || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedSearch);
    });
  }, [companyGroups, searchTerm]);

  const handleNewAccount = () => {
    router.push('/protected/fc/add-account');
  };

  const handleEscalationFinalize = async ({
    job,
    refreshEscalations,
  }) => {
    if (!job?.id) return;

    const loadingToast = toast.loading(
      "Opening Job Card Review finalize flow...",
    );

    try {
      setEscalationActionJobId(job.id);
      const response = await fetch(`/api/job-cards/${job.id}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destination: "fc",
          preserveCompleted: true,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          errorBody?.error ||
            errorBody?.details ||
            "Failed to finalize escalated job",
        );
      }

      toast.dismiss(loadingToast);
      toast.success("Job finalized. Opening Job Card Review...");
      if (typeof refreshEscalations === "function") {
        await refreshEscalations();
      }
      router.push(
        `/protected/fc/completed-jobs?jobId=${encodeURIComponent(job.id)}&openFinalize=1`,
      );
    } catch (error) {
      console.error("Error finalizing escalated job:", error);
      toast.dismiss(loadingToast);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to finalize escalated job",
      );
    } finally {
      setEscalationActionJobId(null);
    }
  };

  const resolveAccountNumbers = (group) => {
    const rawAccountNumbers = [
      group?.all_new_account_numbers,
      group?.all_account_numbers,
    ]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim())
      .find(Boolean);

    return rawAccountNumbers || "";
  };

  const handleViewDetails = (group) => {
    const accountNumbers = resolveAccountNumbers(group);

    if (!accountNumbers) {
      console.log('⚠️ [FC DASHBOARD] No account numbers found for group:', group);
      toast.error("No account numbers found for this client.");
      return;
    }

    const encodedAccountNumbers = encodeURIComponent(accountNumbers);
    router.push(`/protected/fc/clients/cost-centers?accounts=${encodedAccountNumbers}`);
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'global':
        return <GlobalView />;
      

      case 'companies':
        return (
          <>
            {/* Search and Filter */}
            <div className="flex sm:flex-row flex-col gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await maybeRefreshCompanyGroups(true);
                }}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </Button>
            </div>

            {/* Results count */}
            {!loading && (
              <div className="text-sm text-gray-600">
                Showing {visibleCompanyGroups.length} of {totalCount} clients
                {searchTerm && ` matching "${searchTerm}"`}
                {loadingContacts && (
                  <span className="ml-2 text-blue-600">
                    <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                    Loading contact info...
                  </span>
                )}
                {isDataLoaded && (
                  <span className="ml-2 text-green-600">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    Data loaded
                  </span>
                )}
              </div>
            )}

            {/* Clients Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCompanyGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <div className="flex flex-col items-center">
                            <Building2 className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-gray-500">No clients found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleCompanyGroups.map((group) => {
                        const contact = contactInfo[group.id];
                        return (
                          <TableRow key={group.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              <div>
                                <div className="mb-1 flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {group.company_group || 'N/A'}
                                  </Badge>
                                  {group.validate && (
                                    <Badge variant="default" className="text-xs bg-green-600">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Validated
                                    </Badge>
                                  )}
                                </div>
                                <div className="font-semibold text-sm">{group.legal_names || 'N/A'}</div>
                                <div className="text-xs text-gray-500">
                                  {group.legal_names_list && group.legal_names_list.length > 0 
                                    ? `${group.legal_names_list.length} legal entities`
                                    : 'No legal names'
                                  }
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {loadingContacts ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span className="text-sm text-gray-500">Loading...</span>
                                </div>
                              ) : contact ? (
                                <div className="space-y-1">
                                  {contact.cell_no && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Phone className="w-3 h-3 text-gray-400" />
                                      <span>{contact.cell_no}</span>
                                    </div>
                                  )}
                                  {contact.switchboard && !contact.cell_no && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Phone className="w-3 h-3 text-gray-400" />
                                      <span>{contact.switchboard}</span>
                                    </div>
                                  )}
                                  {contact.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Mail className="w-3 h-3 text-gray-400" />
                                      <span className="truncate max-w-[200px]" title={contact.email}>
                                        {contact.email}
                                      </span>
                                    </div>
                                  )}
                                  {contact.branch_person_email && !contact.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Mail className="w-3 h-3 text-gray-400" />
                                      <span className="truncate max-w-[200px]" title={contact.branch_person_email}>
                                        {contact.branch_person_email}
                                      </span>
                                    </div>
                                  )}
                                  {contact.physical_address_1 && (
                                    <div className="flex items-start gap-2 text-sm">
                                      <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                                      <div className="truncate max-w-[200px]">
                                        <div title={`${contact.physical_address_1}${contact.physical_area ? `, ${contact.physical_area}` : ''}${contact.physical_province ? `, ${contact.physical_province}` : ''}`}>
                                          {contact.physical_address_1}
                                          {contact.physical_area && `, ${contact.physical_area}`}
                                          {contact.physical_province && `, ${contact.physical_province}`}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {!contact.cell_no && !contact.switchboard && !contact.email && !contact.branch_person_email && !contact.physical_address_1 && (
                                    <span className="text-sm text-gray-400">No contact info</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No contact info</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const accountNumbers = resolveAccountNumbers(group);
                                    if (!accountNumbers) {
                                      toast.error("No account numbers found for this client.");
                                      return;
                                    }
                                    router.push(`/protected/fc/validate?account=${encodeURIComponent(accountNumbers)}`);
                                  }}
                                  className="text-xs h-8"
                                >
                                  Validate
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleViewDetails(group);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Empty State */}
            {companyGroups.length === 0 && !loading && (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No clients found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchTerm
                        ? "Try adjusting your search criteria."
                        : `Get started by creating your first client.`
                      }
                    </p>
                    {!searchTerm && (
                      <Button onClick={handleNewAccount} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Client
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        );

      case 'client-info':
        return (
          <AccountsProvider>
            <AccountsClientsSection mode="client-info" />
          </AccountsProvider>
        );

      case 'escalations':
        return (
          <RoleEscalationsPanel
            role="fc"
            title="FC Escalations"
            emptyTitle="No FC escalations"
            emptyDescription="Jobs moved into FC will appear here first."
            hideCompletedJobs
            moveOptions={[
              { value: "inv", label: "Inventory", payload: { inventoryPlacement: "assign-parts" } },
              { value: "admin", label: "Admin" },
              { value: "accounts", label: "Accounts" },
            ]}
            renderActions={(job, helpers) => {
              const movingThisJob = helpers?.movingJobId === job.id;
              const isFinalizing = escalationActionJobId === job.id;
              const isPrinting = printingEscalationJobId === job.id;
              const actionBusy = movingThisJob || isFinalizing || isPrinting;

              return (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionBusy}
                    onClick={() => handleEscalationPrint(job)}
                  >
                    {isPrinting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="mr-2 h-4 w-4" />
                    )}
                    Print Job
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionBusy}
                    onClick={() =>
                      handleEscalationFinalize({
                        job,
                        refreshEscalations: helpers?.refresh,
                      })
                    }
                  >
                    {isFinalizing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Edit and Finalize
                  </Button>
                </>
              );
            }}
          />
        );

      default:
        return <GlobalView />;
    }
  };

  if (loading && activeTab === 'companies') {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader
          title="Field Coordinator Dashboard"
          subtitle="Manage clients and view global overview"
          icon={Globe}
          actionContent={
            <div className="flex items-center gap-3">
              <CreateCalibrationJobModal />
              {activeTab === 'companies' ? (
                <Button onClick={handleNewAccount} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  New Account
                </Button>
              ) : null}
            </div>
          }
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></Loader2>
            <p className="text-gray-600">Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Field Coordinator Dashboard"
        subtitle="Manage companies and view global overview"
        icon={Globe}
        actionContent={
          <div className="flex items-center gap-3">
            <CreateCalibrationJobModal />
            {activeTab === 'companies' ? (
              <Button onClick={handleNewAccount} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                New Account
              </Button>
            ) : null}
          </div>
        }
      />

      {/* Combined Navigation */}
      <div className="mb-6 border-gray-200 border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'global', label: 'Global View', icon: Globe, type: 'tab' },
            { id: 'companies', label: 'Clients', icon: Building, type: 'tab' },
            { id: 'client-info', label: 'Client Info', icon: Users, type: 'tab' },
            { id: 'escalations', label: 'Escalations', icon: MessageSquareText, type: 'tab' },
            { id: 'accounts', label: 'Accounts', icon: Building2, href: '/protected/fc', type: 'link', hideOnGlobal: true, hideOnClients: true },
            { id: 'quotes', label: 'Quotes', icon: FileText, href: '/protected/fc/quotes', type: 'link' },
            { id: 'external-quotation', label: 'External Quotation', icon: ExternalLink, href: '/protected/fc/external-quotation', type: 'link' },
            { id: 'completed-jobs', label: 'Job Card Review', icon: CheckCircle, href: '/protected/fc/completed-jobs', type: 'link' }
          ].filter(navItem => 
            !(navItem.hideOnGlobal && activeTab === 'global') &&
            !(navItem.hideOnClients && activeTab === 'companies')
          ).map((navItem) => {
            const Icon = navItem.icon;
            const isActive = (navItem.id === 'global' && activeTab === 'global') || 
                           (navItem.id === 'companies' && activeTab === 'companies') ||
                           (navItem.id === 'client-info' && activeTab === 'client-info') ||
                           (navItem.id === 'escalations' && activeTab === 'escalations') ||
                           (navItem.type === 'link' && pathname === navItem.href);
            
            if (navItem.type === 'tab') {
              return (
                <button
                  key={navItem.id}
                  type="button"
                  onClick={() => setActiveTab(navItem.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{navItem.label}</span>
                  {navItem.id === 'escalations' && fromRiaPendingCount > 0 ? (
                    <Badge className="bg-red-500 hover:bg-red-500 text-white px-2 py-0 text-[10px] min-w-5 h-5 flex items-center justify-center rounded-full">
                      {fromRiaPendingCount}
                    </Badge>
                  ) : null}
                </button>
              );
            }
            
            return (
              <Link
                key={navItem.id}
                href={navItem.href}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{navItem.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content based on active tab */}
      {renderContent()}

    </div>
  );
}
