'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  AlertTriangle,
  RefreshCw,
  Loader2,
  Eye,
  FileText,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/contexts/AccountsContext';
// Dynamic import for XLSX to avoid build issues

type BulkPreviewRow = {
  accountNumber: string;
  companyName: string;
  billingMonth: string;
  vehicleCount: number;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  selected: boolean;
  invoiceData: Record<string, unknown>;
};

type PreviewLineItem = {
  key: string;
  regFleet: string;
  itemCode: string;
  description: string;
  exVat: number;
  vatAmount: number;
  totalInclVat: number;
  quantity: number;
  addedAtRaw: unknown;
  addedAtLabel: string;
  isRecent: boolean;
};

export default function AccountsClientsSection({ mode = 'clients' }: { mode?: 'clients' | 'client-info' }) {
  const { 
    companyGroups, 
    loading, 
    fetchCompanyGroups, 
    isDataLoaded 
  } = useAccounts();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [isGeneratingBulkInvoice, setIsGeneratingBulkInvoice] = useState(false);
  const [isGeneratingAllInvoicesExcel, setIsGeneratingAllInvoicesExcel] = useState(false);
  const [isGeneratingAllInvoicesPdf, setIsGeneratingAllInvoicesPdf] = useState(false);
  const [showAllInvoicesDialog, setShowAllInvoicesDialog] = useState(false);
  const [allInvoicesPreviewStage, setAllInvoicesPreviewStage] = useState<'options' | 'preview'>('options');
  const [allInvoicesPreviewRows, setAllInvoicesPreviewRows] = useState<BulkPreviewRow[]>([]);
  const [expandedAllInvoicesPreviewRows, setExpandedAllInvoicesPreviewRows] = useState<Record<string, boolean>>({});
  const [isLoadingAllInvoicesPreview, setIsLoadingAllInvoicesPreview] = useState(false);
  const [isGeneratingSelectedInvoices, setIsGeneratingSelectedInvoices] = useState(false);
  const [showInvoiceNumberDialog, setShowInvoiceNumberDialog] = useState(false);
  const [showSystemLockDialog, setShowSystemLockDialog] = useState(false);
  const [systemLock, setSystemLock] = useState<Record<string, unknown> | null>(null);
  const [loadingSystemLock, setLoadingSystemLock] = useState(false);
  const [savingSystemLock, setSavingSystemLock] = useState(false);
  const [systemLockDate, setSystemLockDate] = useState('');
  const [bulkInvoiceRows, setBulkInvoiceRows] = useState<Array<Record<string, unknown>>>([]);
  const [loadingBulkInvoiceRows, setLoadingBulkInvoiceRows] = useState(false);
  const [savingBulkInvoiceNumber, setSavingBulkInvoiceNumber] = useState<string | null>(null);
  const [editableCostCenters, setEditableCostCenters] = useState<Array<Record<string, unknown>>>([]);
  const [loadingEditableCostCenters, setLoadingEditableCostCenters] = useState(false);
  const [savingCostCenterId, setSavingCostCenterId] = useState<string | null>(null);
  const [savingAllCostCenters, setSavingAllCostCenters] = useState(false);
  const [dirtyCostCenterIds, setDirtyCostCenterIds] = useState<string[]>([]);
  const tableInputClass = 'w-full bg-white text-sm';
  const standardCellClass = 'min-w-[220px]';
  const compactCellClass = 'min-w-[140px]';
  const addressCellClass = 'min-w-[280px]';

  useEffect(() => {
    setSearchTerm('');
  }, [mode]);

  useEffect(() => {
    if (mode !== 'clients') return;
    const fetchSystemLock = async () => {
      try {
        setLoadingSystemLock(true);
        const response = await fetch('/api/system-lock', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load system lock');
        }
        const result = await response.json();
        setSystemLock(result?.lock || null);
        const lockDate = result?.lock?.lock_date;
        setSystemLockDate(lockDate ? String(lockDate) : '');
      } catch (error) {
        console.error('Error fetching system lock:', error);
        setSystemLock(null);
      } finally {
        setLoadingSystemLock(false);
      }
    };

    fetchSystemLock();
  }, [mode]);

  useEffect(() => {
    if (!showAllInvoicesDialog) {
      setAllInvoicesPreviewStage('options');
      setAllInvoicesPreviewRows([]);
      setExpandedAllInvoicesPreviewRows({});
      setIsLoadingAllInvoicesPreview(false);
      setIsGeneratingSelectedInvoices(false);
    }
  }, [showAllInvoicesDialog]);

  const COMPANY_INFO = {
    name: 'Soltrack (PTY) LTD',
    regNo: '2018/095975/07',
    vatNo: '4580161802',
    headOffice: [
      '8 Viscount Road',
      'Viscount Office Park, Block C Unit 4 & 5',
      'Bedfordview, 2008',
    ],
    postal: ['P.O Box 95603', 'Grant Park', '2051'],
    contact: ['011 824 0066', 'accounts@soltrack.co.za', 'www.soltrack.co.za'],
    banking: ['Nedbank Northrand', 'Code - 146905', 'A/C No. - 1469109069'],
  };

  const VAT_RATE = 0.15;

  const toNumber = (value: unknown) => {
    const parsed = Number.parseFloat(String(value ?? '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const formatTotalAmount = (amount: number) => `R ${formatAmount(amount)}`;

  const formatDate = (value: unknown) => {
    if (!value) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getBillingInvoiceDate = (billingMonth: unknown) => {
    if (!billingMonth) return new Date().toISOString();
    const normalized = String(billingMonth).slice(0, 7) + '-01T00:00:00';
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
    const year = parsed.getFullYear();
    const month = parsed.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const invoiceDay = Math.min(30, lastDay);
    return new Date(year, month, invoiceDay).toISOString();
  };

  const buildInvoiceStyles = () => `
    body {
      margin: 0;
      padding: 0;
      background: #f4f4f5;
      font-family: Arial, sans-serif;
      color: #111827;
    }
    .invoice-page {
      page-break-after: always;
      padding: 14mm 10mm;
      box-sizing: border-box;
    }
    .invoice-page:last-child {
      page-break-after: auto;
    }
    .invoice-sheet {
      background: white;
      width: 100%;
      max-width: 1120px;
      margin: 0 auto;
    }
    .invoice-toolbar {
      position: sticky;
      top: 12px;
      z-index: 1000;
      max-width: 1120px;
      margin: 0 auto 16px;
      display: flex;
      justify-content: flex-end;
      pointer-events: none;
    }
    .invoice-print-btn {
      padding: 10px 16px;
      border: 1px solid #111827;
      border-radius: 6px;
      background: #111827;
      color: white;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      pointer-events: auto;
    }
    .invoice-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .invoice-logo {
      width: 180px;
      height: auto;
      object-fit: contain;
    }
    .invoice-company {
      text-align: right;
      font-size: 12px;
      line-height: 1.5;
    }
    .invoice-rule {
      border-top: 2px solid #111827;
      margin: 10px 0 16px;
    }
    .invoice-title {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 18px;
    }
    .invoice-party-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      gap: 18px;
    }
    .invoice-client-block {
      flex: 1;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-line;
    }
    .invoice-client-name {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .invoice-client-edit-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }
    .invoice-client-name-row {
      display: block;
      width: 100%;
      margin-bottom: 6px;
    }
    .invoice-meta {
      min-width: 230px;
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 4px 10px;
      font-size: 12px;
    }
    .invoice-editable-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .invoice-inline-input {
      flex: 1 1 260px;
      width: 100%;
      min-width: 150px;
      padding: 6px 8px;
      border: 1px solid #111827;
      border-radius: 4px;
      font-size: 12px;
      box-sizing: border-box;
      background: white;
    }
    .invoice-inline-input-name {
      display: block;
      width: 100%;
      min-width: 0;
      font-size: 16px;
      font-weight: 700;
    }
    .invoice-inline-save {
      padding: 6px 10px;
      border: 1px solid #111827;
      border-radius: 4px;
      background: white;
      color: #111827;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    .invoice-inline-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .invoice-inline-status {
      font-size: 11px;
      color: #047857;
    }
    .invoice-meta-label {
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .invoice-summary-table,
    .invoice-table,
    .invoice-footer-table,
    .invoice-totals-table {
      border: 1px solid #111827;
    }
    .invoice-summary-table th,
    .invoice-summary-table td,
    .invoice-footer-table td,
    .invoice-totals-table td {
      border: 1px solid #111827;
      padding: 7px 8px;
      font-size: 12px;
      vertical-align: top;
    }
    .invoice-table th,
    .invoice-table td {
      border: none;
      padding: 7px 8px;
      font-size: 12px;
      vertical-align: top;
    }
    .invoice-summary-table th,
    .invoice-table th {
      background: #efefef;
      font-weight: 700;
      text-align: left;
    }
    .invoice-table tbody tr:nth-child(even) td {
      background: #fafafa;
    }
    .col-center {
      text-align: center;
    }
    .col-right {
      text-align: right;
    }
    .invoice-body-spacer td {
      height: 24px;
      background: white !important;
      border-left: 1px solid #111827;
      border-right: 1px solid #111827;
      border-top: none;
      border-bottom: none;
    }
    .invoice-notes-totals {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 18px;
      margin-top: 16px;
      align-items: start;
    }
    .invoice-notes {
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-line;
      min-height: 110px;
    }
    .invoice-totals-table .label {
      font-weight: 700;
      width: 58%;
    }
    .invoice-totals-table .value {
      text-align: right;
      width: 42%;
    }
    .invoice-totals-table .grand-total td {
      font-size: 14px;
      font-weight: 700;
    }
    .invoice-footer-table {
      margin-top: 18px;
    }
    .invoice-footer-table td {
      font-size: 11px;
      line-height: 1.45;
    }
    @media print {
      body {
        background: white;
      }
      .invoice-page {
        padding: 0;
      }
      .invoice-inline-save,
      .invoice-inline-status {
        display: none !important;
      }
      .invoice-inline-input {
        border: none !important;
        padding: 0 !important;
        min-width: 0 !important;
        width: auto !important;
        background: transparent !important;
        box-shadow: none !important;
      }
      .invoice-toolbar,
      .invoice-print-btn {
        display: none !important;
      }
    }
  `;

  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  // Initial load
  useEffect(() => {
    if (!isDataLoaded) {
      fetchCompanyGroups('', { startMonth, endMonth });
    }
  }, [fetchCompanyGroups, isDataLoaded, startMonth, endMonth]);

  useEffect(() => {
    if (mode === 'client-info' && editableCostCenters.length === 0) {
      fetchEditableCostCenters();
    }
  }, [mode, editableCostCenters.length]);

  const filteredCompanyGroups = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const locallyFilteredGroups =
      normalizedSearch.length === 0
        ? companyGroups
        : companyGroups.filter((group) => {
            const haystacks = [
              group.company_group,
              group.legal_names,
              group.all_account_numbers,
              group.all_new_account_numbers,
              Array.isArray(group.legal_names_list) ? group.legal_names_list.join(' ') : '',
              group.prefix,
            ];

            return haystacks.some((value) =>
              String(value || '').toLowerCase().includes(normalizedSearch),
            );
          });

    return [...locallyFilteredGroups].sort((a, b) => {
      const left = String(a.company_group || a.legal_names || '').trim().toLowerCase();
      const right = String(b.company_group || b.legal_names || '').trim().toLowerCase();
      return left.localeCompare(right);
    });
  }, [companyGroups, searchTerm]);

  const selectedAllInvoicesPreviewRows = useMemo(
    () => allInvoicesPreviewRows.filter((row) => row.selected),
    [allInvoicesPreviewRows],
  );

  const allInvoicesPreviewTotals = useMemo(
    () =>
      selectedAllInvoicesPreviewRows.reduce(
        (acc, row) => ({
          subtotal: acc.subtotal + row.subtotal,
          vatAmount: acc.vatAmount + row.vatAmount,
          totalAmount: acc.totalAmount + row.totalAmount,
          vehicleCount: acc.vehicleCount + row.vehicleCount,
        }),
        {
          subtotal: 0,
          vatAmount: 0,
          totalAmount: 0,
          vehicleCount: 0,
        },
      ),
    [selectedAllInvoicesPreviewRows],
  );

  const handleRefresh = async () => {
    try {
      await fetchCompanyGroups('', { startMonth, endMonth });
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };

  const handleSystemLockToggle = async () => {
    try {
      if (!systemLockDate) {
        toast.error('Select a lock date first.');
        return;
      }
      setSavingSystemLock(true);
      const shouldLock = !Boolean(systemLock?.is_locked);
      const response = await fetch('/api/system-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isLocked: shouldLock,
          lockDate: systemLockDate,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || 'Failed to update system lock');
      }

      const result = await response.json();
      setSystemLock(result?.lock || null);
      toast.success(
        shouldLock
          ? `System locked for ${result?.lock?.lock_date || systemLockDate}`
          : 'System unlocked',
      );
      setShowSystemLockDialog(false);
    } catch (error) {
      console.error('Error updating system lock:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update system lock');
    } finally {
      setSavingSystemLock(false);
    }
  };

  const fetchEditableCostCenters = async () => {
    try {
      setLoadingEditableCostCenters(true);
      const response = await fetch('/api/cost-centers/editable');
      if (!response.ok) {
        throw new Error('Failed to fetch cost centers');
      }
      const result = await response.json();
      setEditableCostCenters(Array.isArray(result?.costCenters) ? result.costCenters : []);
      setDirtyCostCenterIds([]);
    } catch (error) {
      console.error('Error fetching editable cost centers:', error);
      toast.error('Failed to load client info');
    } finally {
      setLoadingEditableCostCenters(false);
    }
  };

  const updateEditableCostCenter = (id: string, field: string, value: unknown) => {
    setEditableCostCenters((prev) =>
      prev.map((row) => (String(row.id) === id ? { ...row, [field]: value } : row)),
    );
    setDirtyCostCenterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleSaveCostCenter = async (row: Record<string, unknown>) => {
    const id = String(row.id || '');
    if (!id) {
      toast.error('Missing cost center id');
      return;
    }

    try {
      setSavingCostCenterId(id);
      const response = await fetch('/api/cost-centers/editable', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(row),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save cost center');
      }

      const result = await response.json();
      setEditableCostCenters((prev) =>
        prev.map((item) => (String(item.id) === id ? (result?.costCenter || item) : item)),
      );
      setDirtyCostCenterIds((prev) => prev.filter((itemId) => itemId !== id));
      toast.success(`Saved ${String(row.cost_code || 'cost center')}`);
    } catch (error) {
      console.error('Error saving cost center:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save cost center');
    } finally {
      setSavingCostCenterId(null);
    }
  };

  const handleSaveAllCostCenters = async () => {
    if (dirtyCostCenterIds.length === 0) {
      toast.success('No changes to save');
      return;
    }

    try {
      setSavingAllCostCenters(true);
      const rowsToSave = editableCostCenters.filter((row) => dirtyCostCenterIds.includes(String(row.id || '')));
      const response = await fetch('/api/cost-centers/editable', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: rowsToSave,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save all cost centers');
      }

      const result = await response.json();
      const savedRows = Array.isArray(result?.costCenters) ? result.costCenters : [];
      const savedRowsById = new Map(savedRows.map((row: Record<string, unknown>) => [String(row.id || ''), row]));

      setEditableCostCenters((prev) =>
        prev.map((row) => savedRowsById.get(String(row.id || '')) || row),
      );
      setDirtyCostCenterIds([]);
      toast.success(`Saved ${rowsToSave.length} cost centers`);
    } catch (error) {
      console.error('Error saving all cost centers:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save all cost centers');
    } finally {
      setSavingAllCostCenters(false);
    }
  };

  const handleViewClients = async (group: Record<string, unknown>) => {
    console.log('handleViewClients called with group:', group);
    console.log('Group all_new_account_numbers:', group.all_new_account_numbers);
    
    if (!group.all_new_account_numbers) {
      console.error('No account numbers found for this client:', group);
      toast.error('No account numbers found for this client');
      return;
    }

    try {
      // Parse comma-separated account numbers for payments_ table search
      const accountNumbers = group.all_new_account_numbers
        .split(',')
        .map((num: string) => num.trim().toUpperCase())
        .filter((num: string) => num.length > 0);

      console.log('Searching payments_ table for account numbers:', accountNumbers);

      // Fetch payment data directly from payments_ table using cost_code
      const response = await fetch(`/api/payments/by-client-accounts?all_new_account_numbers=${encodeURIComponent(group.all_new_account_numbers)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch payment data from payments_ table');
      }

      const data = await response.json();
      
      console.log('API response data:', data);
      console.log('Payments found:', data.payments?.length || 0);
      console.log('Summary:', data.summary);
      
      console.log('Payments_ table data retrieved:', {
        paymentsCount: data.payments?.length || 0,
        summary: data.summary,
        accountNumbers: data.accountNumbers
      });

      // Store payment data in sessionStorage for the next page
      sessionStorage.setItem('clientPaymentData', JSON.stringify({
        clientInfo: {
          companyGroup: group.company_group,
          legalNames: group.legal_names_list,
          accountNumbers: group.all_new_account_numbers,
          searchMethod: 'payments_table_focus'
        },
        payments: data.payments,
        summary: data.summary,
        searchDetails: {
          searchedAccountNumbers: accountNumbers,
          paymentsTableRecords: data.payments?.length || 0,
          totalDueAmount: data.summary?.totalDueAmount || 0,
          totalBalanceDue: data.summary?.totalBalanceDue || 0
        }
      }));

      // Navigate to the client cost centers page using the all_new_account_numbers
      const url = `/protected/client-cost-centers/${encodeURIComponent(group.all_new_account_numbers)}`;
      window.location.href = url;
      
    } catch (error) {
      console.error('Error fetching payment data from payments_ table:', error);
      toast.error('Failed to load payment data from payments_ table. Please try again.');
    }
  };

  const extractInvoiceItems = (invoiceData: Record<string, unknown>) => {
    if (Array.isArray(invoiceData?.invoiceItems)) {
      return invoiceData.invoiceItems as Array<Record<string, unknown>>;
    }
    if (Array.isArray(invoiceData?.invoice_items)) {
      return invoiceData.invoice_items as Array<Record<string, unknown>>;
    }
    return [] as Array<Record<string, unknown>>;
  };

  const countInvoiceVehicles = (invoiceItems: Array<Record<string, unknown>>) => {
    const regs = new Set<string>();
    for (const item of invoiceItems) {
      const values = [
        item?.new_reg,
        item?.previous_reg,
        item?.reg,
        item?.fleetNumber,
      ];
      for (const value of values) {
        const normalized = String(value || '').trim().toUpperCase();
        if (!normalized || normalized === '-' || normalized === 'N/A') continue;
        regs.add(normalized);
      }
    }
    return regs.size > 0 ? regs.size : invoiceItems.length > 0 ? 1 : 0;
  };

  const mapInvoiceItemsToBulkLineItems = (
    invoiceItems: Array<Record<string, unknown>>,
  ) =>
    invoiceItems.map((item) => ({
      previous_reg: item.previous_reg || item.reg || '-',
      new_reg: item.new_reg || item.fleetNumber || item.reg || '-',
      item_code: item.item_code || '-',
      description: item.description || '-',
      comments: item.company || '',
      units: item.units || item.quantity || 1,
      quantity: item.quantity || item.units || 1,
      unit_price_without_vat:
        item.unit_price_without_vat ??
        item.amountExcludingVat ??
        item.total_excl_vat ??
        item.unit_price ??
        0,
      amountExcludingVat:
        item.amountExcludingVat ??
        item.unit_price_without_vat ??
        item.total_excl_vat ??
        item.unit_price ??
        0,
      vat_amount: item.vat_amount ?? 0,
      total_incl_vat:
        item.total_incl_vat ??
        item.total_including_vat ??
        item.totalRentalSub ??
        0,
      total_including_vat:
        item.total_including_vat ??
        item.total_incl_vat ??
        item.totalRentalSub ??
        0,
      reg: item.reg || null,
      fleetNumber: item.fleetNumber || null,
      company: item.company || '',
      vehicle_created_at: item.vehicle_created_at || null,
      item_added_at:
        item.item_added_at || item.vehicle_created_at || item.created_at || null,
    }));

  const normalizeBulkPreviewRows = (
    invoices: Array<{ accountNumber: string; invoiceData: Record<string, unknown> }>,
  ) => {
    const rows = invoices.map(({ accountNumber, invoiceData }) => {
      const invoiceItems = extractInvoiceItems(invoiceData);
      const subtotal = toNumber(invoiceData?.subtotal);
      const vatAmount = toNumber(invoiceData?.vat_amount);
      const totalAmount = toNumber(invoiceData?.total_amount);
      const vehicleCount = countInvoiceVehicles(invoiceItems);

      return {
        accountNumber: String(accountNumber || '').trim().toUpperCase(),
        companyName: String(invoiceData?.company_name || accountNumber || '').trim(),
        billingMonth: String(invoiceData?.billing_month || '').trim(),
        vehicleCount,
        subtotal,
        vatAmount,
        totalAmount,
        selected: true,
        invoiceData,
      } as BulkPreviewRow;
    });

    rows.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
    return rows;
  };

  const parseDateValue = (value: unknown) => {
    if (!value) return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatCompactDate = (value: unknown) => {
    const parsed = parseDateValue(value);
    if (!parsed) return '-';
    return parsed.toLocaleDateString('en-GB');
  };

  const getPreviewBillingDate = (row: BulkPreviewRow) => {
    const invoiceDate = parseDateValue(row.invoiceData?.invoice_date);
    if (invoiceDate) return invoiceDate;

    const fallbackBillingDate = parseDateValue(
      getBillingInvoiceDate(String(row.billingMonth || '').trim()),
    );
    return fallbackBillingDate || new Date();
  };

  const buildPreviewLineItems = (row: BulkPreviewRow): PreviewLineItem[] => {
    const billingDate = getPreviewBillingDate(row);
    const recentCutoff = new Date(billingDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const items = extractInvoiceItems(row.invoiceData);

    return items.map((item, index) => {
      const exVat = toNumber(
        item?.amountExcludingVat ??
          item?.unit_price_without_vat ??
          item?.total_excl_vat ??
          item?.unit_price,
      );
      const vatAmount = toNumber(item?.vat_amount ?? item?.vatAmount) || exVat * VAT_RATE;
      const totalInclVat =
        toNumber(item?.total_including_vat ?? item?.total_incl_vat ?? item?.totalRentalSub) ||
        exVat + vatAmount;
      const quantity = Math.max(1, Number(item?.quantity ?? item?.units ?? 1) || 1);
      const addedAtRaw =
        item?.item_added_at ??
        item?.vehicle_created_at ??
        item?.created_at ??
        item?.amount_locked_at ??
        null;
      const addedAtDate = parseDateValue(addedAtRaw);
      const isRecent = Boolean(
        addedAtDate &&
          addedAtDate.getTime() >= recentCutoff.getTime() &&
          addedAtDate.getTime() <= billingDate.getTime(),
      );

      return {
        key: `${row.accountNumber}-${index}-${String(item?.reg || item?.fleetNumber || item?.item_code || 'item')}`,
        regFleet: String(item?.new_reg || item?.reg || item?.fleetNumber || item?.previous_reg || '-'),
        itemCode: String(item?.item_code || '-'),
        description: String(item?.description || '-'),
        exVat,
        vatAmount,
        totalInclVat,
        quantity,
        addedAtRaw,
        addedAtLabel: formatCompactDate(addedAtRaw),
        isRecent,
      };
    });
  };

  const toggleBulkPreviewExpansion = (accountNumber: string) => {
    setExpandedAllInvoicesPreviewRows((prev) => ({
      ...prev,
      [accountNumber]: !prev[accountNumber],
    }));
  };

  const renderInvoicesToPreviewWindow = (
    invoices: Array<{ accountNumber: string; invoiceData: Record<string, unknown> }>,
  ) => {
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      throw new Error('Please allow popups to preview the invoices');
    }

    previewWindow.document.write('<html><head><title>Preparing invoices...</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">Preparing invoice preview...</body></html>');
    previewWindow.document.close();

    const logoUrl = `${window.location.origin}/soltrack_logo.png`;
    const invoicePages = invoices
      .map(({ accountNumber, invoiceData }) => {
        const items = extractInvoiceItems(invoiceData);

        const rows = items.map((item: Record<string, unknown>) => {
          const exVat = toNumber(
            item.unit_price_without_vat ??
              item.amountExcludingVat ??
              item.total_excl_vat ??
              item.unit_price,
          );
          const vatAmount = toNumber(item.vat_amount) || exVat * VAT_RATE;
          const totalIncl =
            toNumber(item.total_including_vat ?? item.total_incl_vat ?? item.totalRentalSub) ||
            exVat + vatAmount;

          return {
            previousReg: String(item.previous_reg || item.reg || '-'),
            newReg: String(item.new_reg || item.fleetNumber || item.reg || '-'),
            itemCode: String(item.item_code || '-'),
            description: String(item.description || '-'),
            comments: String(item.company || ''),
            units: String(item.units || item.quantity || 1),
            unitPrice: formatAmount(exVat),
            vatAmount: formatAmount(vatAmount),
            totalIncl: formatAmount(totalIncl),
            exVat,
            vat: vatAmount,
            incl: totalIncl,
          };
        });

        const totals = rows.reduce(
          (acc, row) => ({
            subtotal: acc.subtotal + row.exVat,
            vat: acc.vat + row.vat,
            total: acc.total + row.incl,
          }),
          { subtotal: 0, vat: 0, total: 0 },
        );

        const rowMarkup =
          rows
            .map(
              (row) => `
                  <tr>
                    <td>${escapeHtml(row.previousReg)}</td>
                    <td>${escapeHtml(row.newReg)}</td>
                    <td>${escapeHtml(row.itemCode)}</td>
                    <td>${escapeHtml(row.description)}</td>
                    <td>${escapeHtml(row.comments)}</td>
                    <td class="col-center">${escapeHtml(row.units)}</td>
                    <td class="col-right">${escapeHtml(row.unitPrice)}</td>
                    <td class="col-right">${escapeHtml(row.vatAmount)}</td>
                    <td class="col-center">15%</td>
                    <td class="col-right">${escapeHtml(row.totalIncl)}</td>
                  </tr>
                `,
            )
            .join('') || '<tr><td colspan="10">No invoice rows available</td></tr>';

        return `
            <div class="invoice-page" data-account-number="${escapeHtml(accountNumber)}" data-billing-month="${escapeHtml(String(invoiceData?.billing_month || ''))}" data-company-name="${escapeHtml(invoiceData?.company_name || accountNumber)}">
              <div class="invoice-sheet">
                <div class="invoice-top">
                  <div>
                    <img src="${escapeHtml(logoUrl)}" alt="Soltrack Logo" class="invoice-logo" />
                  </div>
                  <div class="invoice-company">
                    <strong>${escapeHtml(COMPANY_INFO.name)}</strong>
                    <div>Reg No: ${escapeHtml(COMPANY_INFO.regNo)}</div>
                    <div>VAT No.: ${escapeHtml(COMPANY_INFO.vatNo)}</div>
                  </div>
                </div>
                <div class="invoice-rule"></div>
                <div class="invoice-title">Tax Invoice</div>
                <div class="invoice-party-row">
                  <div class="invoice-client-block">
                    <div class="invoice-client-name-row">
                      <div class="invoice-client-name">${escapeHtml(invoiceData?.company_name || accountNumber)}</div>
                    </div>
                    <div class="invoice-client-edit-row">
                      <strong>Company Reg:</strong>
                      <input
                        class="invoice-inline-input"
                        value="${escapeHtml(invoiceData?.company_registration_number || '')}"
                        data-role="company-registration-number"
                        placeholder="Enter company registration number"
                      />
                      <button class="invoice-inline-save" type="button" data-role="save-company-details">Save</button>
                      <span class="invoice-inline-status" data-role="company-save-status"></span>
                    </div>
                    <div>${escapeHtml(String(invoiceData?.client_address || '')).replace(/\n/g, '<br />')}</div>
                  </div>
                  <div class="invoice-meta">
                    <div class="invoice-meta-label">TAX INVOICE :</div>
                    <div class="invoice-meta-value">${escapeHtml(invoiceData?.invoice_number || 'PENDING')}</div>
                    <div class="invoice-meta-label">Date:</div>
                    <div class="invoice-meta-value">${escapeHtml(formatDate(invoiceData?.invoice_date || getBillingInvoiceDate(invoiceData?.billing_month)))}</div>
                  </div>
                </div>
                <table class="invoice-summary-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Your Reference</th>
                      <th>VAT %</th>
                      <th>Customer Vat Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${escapeHtml(accountNumber)}</td>
                      <td>${escapeHtml(invoiceData?.company_name || accountNumber)}</td>
                      <td>VAT 15%</td>
                      <td>
                        <div class="invoice-editable-cell">
                          <input
                            class="invoice-inline-input"
                            value="${escapeHtml(invoiceData?.customer_vat_number || '')}"
                            data-role="vat-number"
                          />
                          <button class="invoice-inline-save" type="button" data-role="save-vat-number">Save</button>
                          <span class="invoice-inline-status" data-role="vat-save-status"></span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table class="invoice-table">
                  <thead>
                    <tr>
                      <th>Previous Reg</th>
                      <th>New Reg</th>
                      <th>Item Code</th>
                      <th>Description</th>
                      <th>Comments</th>
                      <th class="col-center">Units</th>
                      <th class="col-right">Unit Price</th>
                      <th class="col-right">Vat</th>
                      <th class="col-center">Vat%</th>
                      <th class="col-right">Total Incl</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowMarkup}
                    <tr class="invoice-body-spacer"><td colspan="10"></td></tr>
                  </tbody>
                </table>
                <div class="invoice-notes-totals">
                  <div class="invoice-notes"><strong>Notes:</strong> ${escapeHtml(invoiceData?.notes || '').replace(/\n/g, '<br />')}</div>
                  <table class="invoice-totals-table">
                    <tbody>
                      <tr>
                        <td class="label">Total Ex. VAT</td>
                        <td class="value">${escapeHtml(formatTotalAmount(toNumber(invoiceData?.subtotal) || totals.subtotal))}</td>
                      </tr>
                      <tr>
                        <td class="label">Discount</td>
                        <td class="value">R 0.00</td>
                      </tr>
                      <tr>
                        <td class="label">VAT</td>
                        <td class="value">${escapeHtml(formatTotalAmount(toNumber(invoiceData?.vat_amount) || totals.vat))}</td>
                      </tr>
                      <tr class="grand-total">
                        <td class="label">Total Incl. VAT</td>
                        <td class="value">${escapeHtml(formatTotalAmount(toNumber(invoiceData?.total_amount) || totals.total))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <table class="invoice-footer-table">
                  <tbody>
                    <tr>
                      <td><strong>Head Office:</strong>${COMPANY_INFO.headOffice.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}</td>
                      <td><strong>Postal Address:</strong>${COMPANY_INFO.postal.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}</td>
                      <td><strong>Contact Details</strong>${COMPANY_INFO.contact.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}</td>
                      <td><strong>${escapeHtml(COMPANY_INFO.name)}</strong>${COMPANY_INFO.banking.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          `;
      })
      .join('');

    previewWindow.document.open();
    previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>All Client Invoices</title>
            <style>${buildInvoiceStyles()}</style>
          </head>
          <body>
            <div class="invoice-toolbar">
              <button class="invoice-print-btn" type="button" data-role="print-invoices">Print</button>
            </div>
            ${invoicePages}
            <script>
              (function () {
                const printButton = document.querySelector('[data-role="print-invoices"]');
                if (printButton) {
                  printButton.addEventListener('click', function() {
                    window.print();
                  });
                }

                async function saveVatNumber(page) {
                  const input = page.querySelector('[data-role="vat-number"]');
                  const button = page.querySelector('[data-role="save-vat-number"]');
                  const status = page.querySelector('[data-role="vat-save-status"]');
                  const accountNumber = page.getAttribute('data-account-number') || '';
                  const billingMonth = page.getAttribute('data-billing-month') || '';
                  const customerVatNumber = input && input.value ? input.value.trim() : '';

                  if (!accountNumber || !billingMonth) {
                    if (status) status.textContent = 'Missing account or month';
                    return;
                  }

                  if (button) button.disabled = true;
                  if (status) status.textContent = 'Saving...';

                  try {
                    const response = await fetch('/api/invoices/bulk-account', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        accountNumber,
                        billingMonth,
                        customerVatNumber,
                      }),
                    });

                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.error || 'Failed to save VAT number');
                    }

                    if (status) status.textContent = 'Saved';
                  } catch (error) {
                    if (status) status.textContent = error && error.message ? error.message : 'Save failed';
                  } finally {
                    if (button) button.disabled = false;
                  }
                }

                async function saveCompanyDetails(page) {
                  const companyRegistrationInput = page.querySelector('[data-role="company-registration-number"]');
                  const button = page.querySelector('[data-role="save-company-details"]');
                  const status = page.querySelector('[data-role="company-save-status"]');
                  const accountNumber = page.getAttribute('data-account-number') || '';
                  const billingMonth = page.getAttribute('data-billing-month') || '';
                  const companyName = page.getAttribute('data-company-name') || '';
                  const companyRegistrationNumber =
                    companyRegistrationInput && companyRegistrationInput.value
                      ? companyRegistrationInput.value.trim()
                      : '';

                  if (!accountNumber || !billingMonth) {
                    if (status) status.textContent = 'Missing account or month';
                    return;
                  }

                  if (!companyName) {
                    if (status) status.textContent = 'Enter a client name';
                    return;
                  }

                  if (button) button.disabled = true;
                  if (status) status.textContent = 'Saving...';

                  try {
                    const response = await fetch('/api/invoices/bulk-account', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        accountNumber,
                        billingMonth,
                        companyName,
                        companyRegistrationNumber,
                      }),
                    });

                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}));
                      throw new Error(errorData.error || 'Failed to save company details');
                    }

                    if (status) status.textContent = 'Saved';
                  } catch (error) {
                    if (status) status.textContent = error && error.message ? error.message : 'Save failed';
                  } finally {
                    if (button) button.disabled = false;
                  }
                }

                document.querySelectorAll('.invoice-page').forEach(function(page) {
                  const companyButton = page.querySelector('[data-role="save-company-details"]');
                  if (companyButton) {
                    companyButton.addEventListener('click', function() {
                      saveCompanyDetails(page);
                    });
                  }
                  const vatButton = page.querySelector('[data-role="save-vat-number"]');
                  if (vatButton) {
                    vatButton.addEventListener('click', function() {
                      saveVatNumber(page);
                    });
                  }
                });
              })();
            </script>
          </body>
        </html>
      `);
    previewWindow.document.close();
    previewWindow.focus();
    previewWindow.onload = () => {
      setTimeout(() => previewWindow.print(), 200);
    };
  };

  // Handle invoice export for all cost centers grouped by new_account_number
  const handleAllInvoicesExcel = async () => {
    try {
      setIsGeneratingAllInvoicesExcel(true);
      toast.success('Generating all client invoices Excel...');

      const excelParams = new URLSearchParams();
      if (startMonth) excelParams.set('startMonth', startMonth);
      if (endMonth) excelParams.set('endMonth', endMonth);
      const response = await fetch(`/api/vehicles/bulk-client-invoices-excel?${excelParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to generate client invoices Excel');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch?.[1] || `All_Client_Invoices_${new Date().toISOString().split('T')[0]}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);

      toast.success('All client invoices Excel downloaded');
    } catch (error) {
      console.error('Error generating all client invoices Excel:', error);
      toast.error('Failed to generate all client invoices Excel');
    } finally {
      setIsGeneratingAllInvoicesExcel(false);
    }
  };

  const handleAllInvoicesPdf = async () => {
    try {
      setIsLoadingAllInvoicesPreview(true);
      toast.success('Preparing invoice preview...');

      const pdfParams = new URLSearchParams();
      pdfParams.set('persist', 'false');
      if (startMonth) pdfParams.set('startMonth', startMonth);
      if (endMonth) pdfParams.set('endMonth', endMonth);
      const response = await fetch(`/api/vehicles/bulk-client-invoices-pdf-data?${pdfParams.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to prepare client invoices preview');
      }

      const result = await response.json();
      const invoices = Array.isArray(result?.invoices) ? result.invoices : [];

      if (invoices.length === 0) {
        toast.error('No invoice preview data found');
        return;
      }

      setAllInvoicesPreviewRows(normalizeBulkPreviewRows(invoices));
      setAllInvoicesPreviewStage('preview');
    } catch (error) {
      console.error('Error preparing all client invoice preview:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to prepare invoice preview');
    } finally {
      setIsLoadingAllInvoicesPreview(false);
    }
  };

  const toggleBulkPreviewSelection = (accountNumber: string) => {
    setAllInvoicesPreviewRows((prev) =>
      prev.map((row) =>
        row.accountNumber === accountNumber
          ? { ...row, selected: !row.selected }
          : row,
      ),
    );
  };

  const setAllBulkPreviewSelections = (selected: boolean) => {
    setAllInvoicesPreviewRows((prev) => prev.map((row) => ({ ...row, selected })));
  };

  const handleGenerateSelectedInvoicesPdf = async () => {
    const selectedRows = allInvoicesPreviewRows.filter((row) => row.selected);
    if (selectedRows.length === 0) {
      toast.error('Select at least one cost center');
      return;
    }

    try {
      setIsGeneratingSelectedInvoices(true);
      setIsGeneratingAllInvoicesPdf(true);
      toast.success(`Generating ${selectedRows.length} invoices...`);

      const generatedInvoices: Array<{
        accountNumber: string;
        invoiceData: Record<string, unknown>;
      }> = [];
      const errors: string[] = [];
      const CONCURRENCY = 5;

      const generateOne = async (row: Record<string, unknown>) => {
        const invoiceItems = extractInvoiceItems(row.invoiceData);
        const lineItems = mapInvoiceItemsToBulkLineItems(invoiceItems);
        const subtotal = toNumber(row.invoiceData?.subtotal);
        const vatAmount = toNumber(row.invoiceData?.vat_amount);
        const totalAmount = toNumber(row.invoiceData?.total_amount);
        const billingMonth = String(row.billingMonth || row.invoiceData?.billing_month || '').trim();

        const persistResponse = await fetch('/api/invoices/bulk-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountNumber: row.accountNumber,
            billingMonth: billingMonth || null,
            companyName: row.invoiceData?.company_name || row.companyName || row.accountNumber,
            companyRegistrationNumber: row.invoiceData?.company_registration_number || null,
            clientAddress: row.invoiceData?.client_address || null,
            customerVatNumber: row.invoiceData?.customer_vat_number || null,
            invoiceDate: row.invoiceData?.invoice_date || getBillingInvoiceDate(billingMonth),
            subtotal,
            vatAmount,
            discountAmount: 0,
            totalAmount,
            lineItems,
            notes: row.invoiceData?.notes || null,
          }),
        });

        if (!persistResponse.ok) {
          const errorPayload = await persistResponse.json().catch(() => ({}));
          throw new Error(errorPayload?.error || `Failed to generate invoice for ${row.accountNumber}`);
        }

        const persistResult = await persistResponse.json().catch(() => ({}));
        const persistedInvoice = persistResult?.invoice;
        const persistedLineItems = Array.isArray(persistedInvoice?.line_items)
          ? persistedInvoice.line_items
          : invoiceItems;

        if (!persistedInvoice || !String(persistedInvoice?.invoice_number || '').trim()) {
          throw new Error(`Missing invoice number for ${row.accountNumber}`);
        }

        return {
          accountNumber: row.accountNumber,
          invoiceData: {
            ...row.invoiceData,
            ...persistedInvoice,
            invoiceItems: persistedLineItems,
            invoice_items: persistedLineItems,
          },
        };
      };

      for (let i = 0; i < selectedRows.length; i += CONCURRENCY) {
        const batch = selectedRows.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(batch.map(generateOne));

        for (const result of results) {
          if (result.status === 'fulfilled') {
            generatedInvoices.push(result.value);
          } else {
            errors.push(result.reason?.message || 'Unknown error');
          }
        }
      }

      if (errors.length > 0) {
        console.error('Invoice generation errors:', errors);
        toast.error(`${errors.length} invoice(s) failed. ${generatedInvoices.length} succeeded.`);
      }

      if (generatedInvoices.length > 0) {
        await renderInvoicesToPreviewWindow(generatedInvoices);
        toast.success(`Generated and stored ${generatedInvoices.length} invoices`);
        setShowAllInvoicesDialog(false);
      }
    } catch (error) {
      console.error('Error generating selected client invoices:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate selected invoices');
    } finally {
      setIsGeneratingSelectedInvoices(false);
      setIsGeneratingAllInvoicesPdf(false);
    }
  };

  const handleOpenInvoiceNumberDialog = async () => {
    try {
      setLoadingBulkInvoiceRows(true);
      setShowInvoiceNumberDialog(true);

      const invoiceNumberParams = new URLSearchParams();
      invoiceNumberParams.set('persist', 'false');
      if (startMonth) invoiceNumberParams.set('startMonth', startMonth);
      if (endMonth) invoiceNumberParams.set('endMonth', endMonth);
      const response = await fetch(`/api/vehicles/bulk-client-invoices-pdf-data?${invoiceNumberParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load bulk invoices');
      }

      const result = await response.json();
      const invoices = Array.isArray(result?.invoices) ? result.invoices : [];
      const rows = invoices
        .map(({ accountNumber, invoiceData }: { accountNumber: string; invoiceData: Record<string, unknown> }) => ({
          accountNumber,
          companyName: String(invoiceData?.company_name || accountNumber),
          billingMonth: String(invoiceData?.billing_month || ''),
          invoiceNumber: String(invoiceData?.invoice_number || ''),
        }))
        .sort((a, b) => String(a.companyName).localeCompare(String(b.companyName)));

      setBulkInvoiceRows(rows);
    } catch (error) {
      console.error('Error loading bulk invoice numbers:', error);
      toast.error('Failed to load bulk invoice numbers');
      setShowInvoiceNumberDialog(false);
    } finally {
      setLoadingBulkInvoiceRows(false);
    }
  };

  const handleBulkInvoiceNumberChange = (accountNumber: string, value: string) => {
    setBulkInvoiceRows((prev) =>
      prev.map((row) =>
        String(row.accountNumber) === accountNumber
          ? { ...row, invoiceNumber: value }
          : row,
      ),
    );
  };

  const handleSaveBulkInvoiceNumber = async (row: Record<string, unknown>) => {
    const accountNumber = String(row.accountNumber || '').trim();
    const billingMonth = String(row.billingMonth || '').trim();
    const invoiceNumber = String(row.invoiceNumber || '').trim();

    if (!accountNumber || !billingMonth || !invoiceNumber) {
      toast.error('Account, billing month, and invoice number are required');
      return;
    }

    try {
      setSavingBulkInvoiceNumber(accountNumber);
      const response = await fetch('/api/invoices/bulk-account', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountNumber,
          billingMonth,
          invoiceNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update invoice number');
      }

      toast.success(`Invoice number updated for ${accountNumber}`);
    } catch (error) {
      console.error('Error updating bulk invoice number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update invoice number');
    } finally {
      setSavingBulkInvoiceNumber(null);
    }
  };

  // Handle Bulk Invoice Generation - Database with Storage
  const handleBulkInvoice = async () => {
    try {
      setIsGeneratingBulkInvoice(true);
      toast.success('Generating Excel file in database...');
      
      // Call database-based Excel generation
      const response = await fetch('/api/vehicles/bulk-invoice-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'all' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate Excel file');
      }
      
      const result = await response.json();
      
      if (result.success && result.downloadUrl) {
        // Download the file from Supabase Storage
        const downloadResponse = await fetch(result.downloadUrl);
        const blob = await downloadResponse.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(`Excel file generated! ${result.recordCount} records processed.`);
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      console.error('Error generating bulk invoice:', error);
      toast.error('Failed to generate bulk invoice. Please try again.');
    } finally {
      setIsGeneratingBulkInvoice(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === null || amount === undefined || amount === 0) {
      return 'R 0.00';
    }
    
    return `R ${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading clients...</span>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'client-info') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">Client Info</h1>
          <p className="mt-2 text-gray-600">All cost centers in a clean editable table. Save any row to update the database.</p>
        </div>
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-lg">Client Info</CardTitle>
              <p className="text-gray-600 text-sm">All cost centers in an editable table. Save any row to update the database.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveAllCostCenters} disabled={savingAllCostCenters || loadingEditableCostCenters}>
                {savingAllCostCenters ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {savingAllCostCenters ? 'Saving All...' : `Save All${dirtyCostCenterIds.length > 0 ? ` (${dirtyCostCenterIds.length})` : ''}`}
              </Button>
              <Button onClick={fetchEditableCostCenters} disabled={loadingEditableCostCenters || savingAllCostCenters} variant="outline">
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingEditableCostCenters ? 'animate-spin' : ''}`} />
                {loadingEditableCostCenters ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingEditableCostCenters ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <span>Loading client info...</span>
              </div>
            ) : (
              <div className="overflow-auto border rounded-lg max-h-[70vh]">
                <Table className="min-w-[3200px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cost Code</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Legal Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>VAT Number</TableHead>
                      <TableHead>Registration</TableHead>
                      <TableHead>Physical 1</TableHead>
                      <TableHead>Physical 2</TableHead>
                      <TableHead>Physical 3</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Postal 1</TableHead>
                      <TableHead>Postal 2</TableHead>
                      <TableHead>Postal 3</TableHead>
                      <TableHead>Validated</TableHead>
                      <TableHead className="text-right">Save</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editableCostCenters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={17} className="py-8 text-center text-sm text-gray-500">
                          No cost centers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      editableCostCenters.map((row) => {
                        const id = String(row.id || '');
                        return (
                          <TableRow key={id}>
                            <TableCell className={compactCellClass}><Input className={tableInputClass} value={String(row.cost_code || '')} onChange={(e) => updateEditableCostCenter(id, 'cost_code', e.target.value)} /></TableCell>
                            <TableCell className={standardCellClass}><Input className={tableInputClass} value={String(row.company || '')} onChange={(e) => updateEditableCostCenter(id, 'company', e.target.value)} /></TableCell>
                            <TableCell className={standardCellClass}><Input className={tableInputClass} value={String(row.legal_name || '')} onChange={(e) => updateEditableCostCenter(id, 'legal_name', e.target.value)} /></TableCell>
                            <TableCell className={standardCellClass}><Input className={tableInputClass} value={String(row.contact_name || '')} onChange={(e) => updateEditableCostCenter(id, 'contact_name', e.target.value)} /></TableCell>
                            <TableCell className={standardCellClass}><Input className={tableInputClass} value={String(row.email || '')} onChange={(e) => updateEditableCostCenter(id, 'email', e.target.value)} /></TableCell>
                            <TableCell className={compactCellClass}><Input className={tableInputClass} value={String(row.vat_number || '')} onChange={(e) => updateEditableCostCenter(id, 'vat_number', e.target.value)} /></TableCell>
                            <TableCell className={compactCellClass}><Input className={tableInputClass} value={String(row.registration_number || '')} onChange={(e) => updateEditableCostCenter(id, 'registration_number', e.target.value)} /></TableCell>
                            <TableCell className={addressCellClass}><Input className={tableInputClass} value={String(row.physical_address_1 || '')} onChange={(e) => updateEditableCostCenter(id, 'physical_address_1', e.target.value)} /></TableCell>
                            <TableCell className={addressCellClass}><Input className={tableInputClass} value={String(row.physical_address_2 || '')} onChange={(e) => updateEditableCostCenter(id, 'physical_address_2', e.target.value)} /></TableCell>
                            <TableCell className={addressCellClass}><Input className={tableInputClass} value={String(row.physical_address_3 || '')} onChange={(e) => updateEditableCostCenter(id, 'physical_address_3', e.target.value)} /></TableCell>
                            <TableCell className={compactCellClass}><Input className={tableInputClass} value={String(row.physical_area || '')} onChange={(e) => updateEditableCostCenter(id, 'physical_area', e.target.value)} /></TableCell>
                            <TableCell className={compactCellClass}><Input className={tableInputClass} value={String(row.physical_code || '')} onChange={(e) => updateEditableCostCenter(id, 'physical_code', e.target.value)} /></TableCell>
                            <TableCell className={addressCellClass}><Input className={tableInputClass} value={String(row.postal_address_1 || '')} onChange={(e) => updateEditableCostCenter(id, 'postal_address_1', e.target.value)} /></TableCell>
                            <TableCell className={addressCellClass}><Input className={tableInputClass} value={String(row.postal_address_2 || '')} onChange={(e) => updateEditableCostCenter(id, 'postal_address_2', e.target.value)} /></TableCell>
                            <TableCell className={addressCellClass}><Input className={tableInputClass} value={String(row.postal_address_3 || '')} onChange={(e) => updateEditableCostCenter(id, 'postal_address_3', e.target.value)} /></TableCell>
                            <TableCell className={compactCellClass}>
                              <select
                                value={String(Boolean(row.validated))}
                                onChange={(e) => updateEditableCostCenter(id, 'validated', e.target.value === 'true')}
                                className="border rounded-md h-10 px-3 w-full bg-white text-sm"
                              >
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            </TableCell>
                            <TableCell className="text-right min-w-[90px]">
                              <Button size="sm" onClick={() => handleSaveCostCenter(row)} disabled={savingCostCenterId === id || !dirtyCostCenterIds.includes(id)}>
                                {savingCostCenterId === id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">View Clients</h1>
          <p className="mt-2 text-gray-600">Manage and view all client information with legal names and vehicle amounts</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowAllInvoicesDialog(true)}
            disabled={isGeneratingAllInvoicesExcel || isGeneratingAllInvoicesPdf}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileText className={`w-4 h-4 mr-2 ${(isGeneratingAllInvoicesExcel || isGeneratingAllInvoicesPdf) ? 'animate-pulse' : ''}`} />
            {(isGeneratingAllInvoicesExcel || isGeneratingAllInvoicesPdf) ? 'Preparing Invoices...' : 'All Invoices'}
          </Button>
          <Button
            onClick={handleOpenInvoiceNumberDialog}
            disabled={loadingBulkInvoiceRows}
            variant="outline"
          >
            <FileText className={`w-4 h-4 mr-2 ${loadingBulkInvoiceRows ? 'animate-spin' : ''}`} />
            {loadingBulkInvoiceRows ? 'Loading Numbers...' : 'Edit Invoice Numbers'}
          </Button>
          <Button 
            onClick={handleBulkInvoice}
            disabled={isGeneratingBulkInvoice}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileText className={`w-4 h-4 mr-2 ${isGeneratingBulkInvoice ? 'animate-pulse' : ''}`} />
            {isGeneratingBulkInvoice ? 'Generating Excel...' : 'Bulk Invoice (Excel)'}
          </Button>
          <Button 
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

       <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
         <Card className="hover:shadow-lg transition-shadow duration-200">
           <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
             <CardTitle className="font-medium text-sm">Total Clients</CardTitle>
             <Users className="w-4 h-4 text-muted-foreground" />
           </CardHeader>
           <CardContent>
             <div className="font-bold text-blue-600 text-2xl">{filteredCompanyGroups.length}</div>
             <p className="text-muted-foreground text-xs">Active company groups</p>
           </CardContent>
         </Card>

         <Card className="hover:shadow-lg transition-shadow duration-200">
           <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
             <CardTitle className="font-medium text-sm">Total Amount Due Now</CardTitle>
             <AlertTriangle className="w-4 h-4 text-red-500" />
           </CardHeader>
           <CardContent>
             <div className="font-bold text-red-600 text-2xl">
               {formatCurrency(filteredCompanyGroups.reduce((sum, group) => sum + (group.totalAmountDue || 0), 0))}
             </div>
             <p className="text-muted-foreground text-xs">Overdue amounts after 21st of month</p>
           </CardContent>
         </Card>
       </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Clients</CardTitle>
          <p className="text-gray-600 text-sm">Search by company group, legal names, or account numbers</p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
            <Input
              type="text"
              placeholder="Search by company group or legal names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              className="h-8 w-40 text-xs"
              placeholder="From"
            />
            <span className="text-xs text-gray-400">to</span>
            <Input
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              className="h-8 w-40 text-xs"
              placeholder="To"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchCompanyGroups(searchTerm, { startMonth, endMonth })}
              className="h-8 text-xs"
            >
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="text-lg">Client Company Groups</CardTitle>
          <p className="text-gray-600 text-sm">All clients with their legal names, account information, and vehicle amounts</p>

        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                             <TableHeader>
                                           <TableRow>
                            <TableHead>Company Group</TableHead>
                            <TableHead>Legal Names</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                          </TableRow>
               </TableHeader>
              <TableBody>
                {filteredCompanyGroups.map((group, index) => {
                  return (
                    <TableRow 
                      key={group.id} 
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <TableCell>
                        <div className="font-medium text-sm text-gray-900">
                          {group.company_group || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {group.legal_names_list?.slice(0, 2).join(', ') || 'N/A'}
                          {group.legal_names_list?.length > 2 && (
                            <span className="text-gray-500 text-xs"> +{group.legal_names_list.length - 2} more</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            onClick={() => handleViewClients(group)}
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="mr-1 w-4 h-4" />
                            View Clients
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {filteredCompanyGroups.length === 0 && (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">
                {loading ? 'Loading clients...' : 'No clients found'}
              </h3>
              <p className="text-gray-500">
                {loading 
                  ? 'Please wait while we load the client data...'
                  : searchTerm 
                    ? `No clients match your search "${searchTerm}"`
                    : 'No client data available at the moment.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAllInvoicesDialog} onOpenChange={setShowAllInvoicesDialog}>
        <DialogContent
          className={
            allInvoicesPreviewStage === 'preview'
              ? 'w-[96vw] max-w-[96vw] h-[92vh] max-h-[92vh] p-0'
              : 'max-w-md'
          }
        >
          {allInvoicesPreviewStage === 'options' ? (
            <>
              <DialogHeader>
                <DialogTitle>Export All Invoices</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Select a billing period and choose how to export.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="month"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="h-8 w-40 text-xs"
                    placeholder="From"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <Input
                    type="month"
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="h-8 w-40 text-xs"
                    placeholder="To"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleAllInvoicesPdf}
                    disabled={isGeneratingAllInvoicesPdf || isGeneratingAllInvoicesExcel || isLoadingAllInvoicesPreview}
                    className="h-24 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <div className="flex flex-col items-center">
                      <FileText className="mb-2 w-5 h-5" />
                      <span>PDF</span>
                      <span className="text-xs font-normal opacity-90">
                        {isLoadingAllInvoicesPreview ? 'Loading preview...' : 'Preview and print'}
                      </span>
                    </div>
                  </Button>
                  {/* <Button
                    onClick={handleAllInvoicesExcel}
                    disabled={isGeneratingAllInvoicesPdf || isGeneratingAllInvoicesExcel || isLoadingAllInvoicesPreview}
                    className="h-24 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <div className="flex flex-col items-center">
                      <FileText className="mb-2 w-5 h-5" />
                      <span>Excel</span>
                      <span className="text-xs font-normal opacity-90">Current export</span>
                    </div>
                  </Button> */}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col">
              <DialogHeader className="px-6 pt-5 pb-3 border-b">
                <DialogTitle>Invoice Generation Preview</DialogTitle>
                <p className="text-sm text-gray-600">
                  No invoice numbers are allocated here. Expand a cost center row to inspect billed vehicles/items.
                </p>
              </DialogHeader>

              <div className="flex-1 min-h-0 p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-gray-600">
                    Light green rows indicate items added in the last 30 days from the billing date.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setAllBulkPreviewSelections(true)}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setAllBulkPreviewSelections(false)}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border flex-1 min-h-0 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead className="w-[42px] text-center text-[11px] px-2">Open</TableHead>
                        <TableHead className="w-[54px] text-center text-[11px] px-2">Use</TableHead>
                        <TableHead className="text-[11px] px-2">Cost Center</TableHead>
                        <TableHead className="text-[11px] px-2">Client</TableHead>
                        <TableHead className="text-right text-[11px] px-2">Vehicles</TableHead>
                        <TableHead className="text-right text-[11px] px-2">Total Ex VAT</TableHead>
                        <TableHead className="text-right text-[11px] px-2">VAT</TableHead>
                        <TableHead className="text-right text-[11px] px-2">Total Incl VAT</TableHead>
                        <TableHead className="text-right text-[11px] px-2">New (30d)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allInvoicesPreviewRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-sm text-gray-500">
                            No cost centers found for invoice preview.
                          </TableCell>
                        </TableRow>
                      ) : (
                        allInvoicesPreviewRows.map((row) => {
                          const isExpanded = Boolean(expandedAllInvoicesPreviewRows[row.accountNumber]);
                          const lineItems = buildPreviewLineItems(row);
                          const recentItems = lineItems.filter((item) => item.isRecent);

                          return [
                            <TableRow key={`preview-${row.accountNumber}`} className="h-8 text-xs">
                                <TableCell className="text-center px-2 py-1">
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-300 hover:bg-gray-100"
                                    onClick={() => toggleBulkPreviewExpansion(row.accountNumber)}
                                    aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                                  >
                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </button>
                                </TableCell>
                                <TableCell className="text-center px-2 py-1">
                                  <input
                                    type="checkbox"
                                    checked={row.selected}
                                    onChange={() => toggleBulkPreviewSelection(row.accountNumber)}
                                    disabled={isGeneratingSelectedInvoices}
                                  />
                                </TableCell>
                                <TableCell className="font-medium px-2 py-1">{row.accountNumber}</TableCell>
                                <TableCell className="px-2 py-1">{row.companyName || row.accountNumber}</TableCell>
                                <TableCell className="text-right px-2 py-1">{row.vehicleCount}</TableCell>
                                <TableCell className="text-right px-2 py-1">{formatCurrency(row.subtotal)}</TableCell>
                                <TableCell className="text-right px-2 py-1">{formatCurrency(row.vatAmount)}</TableCell>
                                <TableCell className="text-right px-2 py-1">{formatCurrency(row.totalAmount)}</TableCell>
                                <TableCell className="text-right px-2 py-1">
                                  {recentItems.length > 0 ? (
                                    <span className="inline-flex items-center rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-[10px] font-semibold">
                                      {recentItems.length}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">0</span>
                                  )}
                                </TableCell>
                              </TableRow>,
                              isExpanded ? (
                                <TableRow key={`preview-details-${row.accountNumber}`}>
                                  <TableCell colSpan={9} className="bg-gray-50 px-2 py-2">
                                    <div className="rounded border bg-white overflow-hidden">
                                      <div className="px-2 py-1 text-[11px] text-gray-600 border-b">
                                        Billing Date: {formatCompactDate(row.invoiceData?.invoice_date || getBillingInvoiceDate(row.billingMonth))}
                                      </div>
                                      <div className="max-h-[28vh] overflow-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="h-7">
                                              <TableHead className="text-[10px] px-2 py-1">Vehicle (Reg/Fleet)</TableHead>
                                              <TableHead className="text-[10px] px-2 py-1">Item Code</TableHead>
                                              <TableHead className="text-[10px] px-2 py-1">Description</TableHead>
                                              <TableHead className="text-right text-[10px] px-2 py-1">Qty</TableHead>
                                              <TableHead className="text-right text-[10px] px-2 py-1">Added</TableHead>
                                              <TableHead className="text-right text-[10px] px-2 py-1">Ex VAT</TableHead>
                                              <TableHead className="text-right text-[10px] px-2 py-1">VAT</TableHead>
                                              <TableHead className="text-right text-[10px] px-2 py-1">Incl VAT</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {lineItems.length === 0 ? (
                                              <TableRow>
                                                <TableCell colSpan={8} className="text-center py-3 text-[11px] text-gray-500">
                                                  No line items available.
                                                </TableCell>
                                              </TableRow>
                                            ) : (
                                              lineItems.map((item) => (
                                                <TableRow key={item.key} className={`h-7 text-[11px] ${item.isRecent ? 'bg-green-50' : ''}`}>
                                                  <TableCell className="px-2 py-1">{item.regFleet}</TableCell>
                                                  <TableCell className="px-2 py-1">{item.itemCode}</TableCell>
                                                  <TableCell className="px-2 py-1">{item.description}</TableCell>
                                                  <TableCell className="text-right px-2 py-1">{item.quantity}</TableCell>
                                                  <TableCell className="text-right px-2 py-1">{item.addedAtLabel}</TableCell>
                                                  <TableCell className="text-right px-2 py-1">{formatCurrency(item.exVat)}</TableCell>
                                                  <TableCell className="text-right px-2 py-1">{formatCurrency(item.vatAmount)}</TableCell>
                                                  <TableCell className="text-right px-2 py-1">{formatCurrency(item.totalInclVat)}</TableCell>
                                                </TableRow>
                                              ))
                                            )}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : null,
                            ];
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-md bg-gray-50 border px-4 py-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Selected Cost Centers</div>
                      <div className="font-semibold text-gray-900">{selectedAllInvoicesPreviewRows.length}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Vehicles</div>
                      <div className="font-semibold text-gray-900">{allInvoicesPreviewTotals.vehicleCount}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Ex VAT (Annuity)</div>
                      <div className="font-semibold text-gray-900">{formatCurrency(allInvoicesPreviewTotals.subtotal)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Total Incl VAT</div>
                      <div className="font-semibold text-gray-900">{formatCurrency(allInvoicesPreviewTotals.totalAmount)}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-700">
                    VAT: {formatCurrency(allInvoicesPreviewTotals.vatAmount)}
                  </div>
                </div>

                <div className="flex flex-wrap justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAllInvoicesPreviewStage('options')}
                    disabled={isGeneratingSelectedInvoices}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={isGeneratingSelectedInvoices || selectedAllInvoicesPreviewRows.length === 0}
                    onClick={handleGenerateSelectedInvoicesPdf}
                  >
                    {isGeneratingSelectedInvoices ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Sequentially...
                      </>
                    ) : (
                      <>Generate PDF Invoices</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showInvoiceNumberDialog} onOpenChange={setShowInvoiceNumberDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Bulk Invoice Numbers</DialogTitle>
          </DialogHeader>
          {loadingBulkInvoiceRows ? (
            <div className="py-10 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading current month bulk invoices...</p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Billing Month</TableHead>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkInvoiceRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-8">
                        No bulk invoices found for the current month.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bulkInvoiceRows.map((row) => {
                      const accountNumber = String(row.accountNumber || '');
                      return (
                        <TableRow key={accountNumber}>
                          <TableCell>{String(row.companyName || '')}</TableCell>
                          <TableCell>{accountNumber}</TableCell>
                          <TableCell>{String(row.billingMonth || '')}</TableCell>
                          <TableCell>
                            <Input
                              value={String(row.invoiceNumber || '')}
                              onChange={(event) => handleBulkInvoiceNumberChange(accountNumber, event.target.value)}
                              placeholder="INV200000"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleSaveBulkInvoiceNumber(row)}
                              disabled={savingBulkInvoiceNumber === accountNumber}
                            >
                              {savingBulkInvoiceNumber === accountNumber ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSystemLockDialog} onOpenChange={setShowSystemLockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {systemLock?.is_locked ? 'Unlock Billing System' : 'Lock Billing System'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {systemLock?.is_locked
                ? 'Unlocking will allow invoices to rebuild normally and will process queued job card invoices.'
                : 'Locking freezes invoices for the selected billing month.'}
            </p>
            <div className="space-y-2">
              <Label htmlFor="system-lock-date">Billing month to lock</Label>
              <Input
                id="system-lock-date"
                type="date"
                value={systemLockDate}
                onChange={(event) => setSystemLockDate(event.target.value)}
                disabled={savingSystemLock}
              />
              {systemLock?.is_locked && systemLock?.lock_date ? (
                <p className="text-xs text-gray-500">
                  Currently locked for {String(systemLock.lock_date)}.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowSystemLockDialog(false)} disabled={savingSystemLock}>
              Cancel
            </Button>
            <Button onClick={handleSystemLockToggle} disabled={savingSystemLock}>
              {savingSystemLock ? <Loader2 className="w-4 h-4 animate-spin" /> : systemLock?.is_locked ? 'Unlock' : 'Lock'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
