'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Search, DollarSign, Car, AlertTriangle, CreditCard, Users, X, Calendar, FileText, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import DueReportComponent, { StatementDocument, buildStatementView } from '@/components/inv/components/due-report';
import InvoiceReportComponent, { buildInvoicePrintableHtml, buildInvoiceView } from '@/components/inv/components/invoice-report';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/client';

const getOperationalBillingMonthKey = () => {
  const operationalDate = new Date();
  if (operationalDate.getDate() <= 7) {
    operationalDate.setMonth(operationalDate.getMonth() - 1);
  }
  operationalDate.setDate(1);
  return `${operationalDate.getFullYear()}-${String(operationalDate.getMonth() + 1).padStart(2, '0')}-01`;
};


export default function ClientCostCentersPage() {
  const EPS_SPECIAL_SOURCE_ACCOUNT = 'EPSC-0001';
  const params = useParams();
  const router = useRouter();
  const { code } = params;
  const decodedCode = useMemo(() => {
    if (!code) return '';
    try {
      return decodeURIComponent(String(code));
    } catch {
      return String(code);
    }
  }, [code]);
  
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showVehicleSearchDrawer, setShowVehicleSearchDrawer] = useState(false);
  const [filteredCostCenters, setFilteredCostCenters] = useState([]);
  const [costCentersWithPayments, setCostCentersWithPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPayAllModal, setShowPayAllModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [enteredAmount, setEnteredAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [openInvoicesForPayment, setOpenInvoicesForPayment] = useState([]);
  const [loadingOpenInvoices, setLoadingOpenInvoices] = useState(false);
  const [selectedPaymentInvoiceId, setSelectedPaymentInvoiceId] = useState(null);
  const [selectedPaymentTab, setSelectedPaymentTab] = useState('current');
  const [clientLegalName, setClientLegalName] = useState('');
  const [selectedCostCenters, setSelectedCostCenters] = useState([]);
  const [payAllReference, setPayAllReference] = useState('');
  const [bulkInvoiceSelections, setBulkInvoiceSelections] = useState({});
  const [selectedBulkPaymentTab, setSelectedBulkPaymentTab] = useState('current');
  const [generatingReport, setGeneratingReport] = useState({});
  const [showDueReport, setShowDueReport] = useState(false);
  const [selectedCostCenterForReport, setSelectedCostCenterForReport] = useState(null);
  const [selectedStatementVariant, setSelectedStatementVariant] = useState('summary');
  const [showInvoiceReport, setShowInvoiceReport] = useState(false);
  const [selectedCostCenterForInvoice, setSelectedCostCenterForInvoice] = useState(null);
  const [isGeneratingBulkInvoice, setIsGeneratingBulkInvoice] = useState(false);
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  const [reportDeliveryModal, setReportDeliveryModal] = useState({
    open: false,
    loading: false,
    request: null,
  });
  const [emailPreviewModal, setEmailPreviewModal] = useState({
    open: false,
    loading: false,
    recipientEmail: '',
    subject: '',
    bodyText: '',
    html: '',
    fileName: '',
    contentType: '',
    blob: null,
    format: 'pdf',
    documentLabel: '',
    clientName: '',
    accountNumber: '',
  });
  const [loggedInUserEmail, setLoggedInUserEmail] = useState('');
  const showCostCenterTotalColumn = true;
  const showPaidAndBalanceColumns = true;
  const currentBillingMonthKey = useMemo(() => {
    return getOperationalBillingMonthKey();
  }, []);

  useEffect(() => {
    let active = true;

    const loadLoggedInUserEmail = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (active) {
          setLoggedInUserEmail(user?.email || '');
        }
      } catch (error) {
        console.error('Error loading logged-in user email:', error);
      }
    };

    loadLoggedInUserEmail();

    return () => {
      active = false;
    };
  }, []);

  const isRealInvoiceNumber = (value) =>
    /^(INV|SOL)-\d+$/i.test(String(value || '').trim());

  const isEpsSpecialClientView = useMemo(() => {
    return String(decodedCode || '')
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
      .includes(EPS_SPECIAL_SOURCE_ACCOUNT);
  }, [decodedCode]);

  const expandSpecialCostCenters = async (costCenters) => {
    if (!Array.isArray(costCenters) || costCenters.length === 0) {
      return costCenters;
    }

    const specialCenter = costCenters.find(
      (center) => String(center?.accountNumber || '').trim().toUpperCase() === EPS_SPECIAL_SOURCE_ACCOUNT,
    );

    if (!specialCenter) {
      return costCenters;
    }

    try {
      const query = new URLSearchParams({
        accountNumber: EPS_SPECIAL_SOURCE_ACCOUNT,
        sourceAccountNumber: EPS_SPECIAL_SOURCE_ACCOUNT,
        includeGroupSummaries: 'true',
      });

      if (specialCenter.billingMonth) {
        query.set('billingMonth', specialCenter.billingMonth);
      }

      const response = await fetch(`/api/vehicles/invoice?${query.toString()}`);
      if (!response.ok) {
        return costCenters;
      }

      const payload = await response.json();
      const groupSummaries = Array.isArray(payload?.groupSummaries) ? payload.groupSummaries : [];

      if (groupSummaries.length === 0) {
        return costCenters;
      }

      const groupedCenters = groupSummaries.map((group) => ({
        ...specialCenter,
        accountNumber: group.accountNumber,
        sourceAccountNumber: EPS_SPECIAL_SOURCE_ACCOUNT,
        invoiceGroup: group.groupCode,
        accountName: group.accountName,
        dueAmount: Number(group.totalAmount || 0),
        paidAmount: Number(group.paidAmount || 0),
        balanceDue: Number(group.balanceDue ?? group.totalAmount ?? 0),
        paymentStatus: group.paymentStatus || 'pending',
        accountInvoiceId: group.accountInvoiceId || null,
        reference: isRealInvoiceNumber(group.reference) ? group.reference : '',
        billingMonth: group.billingMonth || specialCenter.billingMonth,
        vehicleCount: Number(group.vehicleCount || 0),
        vehicles: Array.isArray(group.invoiceItems) ? group.invoiceItems : [],
      }));

      if (isEpsSpecialClientView) {
        return groupedCenters;
      }

      const insertIndex = costCenters.findIndex(
        (center) => String(center?.accountNumber || '').trim().toUpperCase() === EPS_SPECIAL_SOURCE_ACCOUNT,
      );
      const remainingCenters = costCenters.filter(
        (center) => String(center?.accountNumber || '').trim().toUpperCase() !== EPS_SPECIAL_SOURCE_ACCOUNT,
      );

      if (insertIndex < 0) {
        return [...remainingCenters, ...groupedCenters];
      }

      return [
        ...remainingCenters.slice(0, insertIndex),
        ...groupedCenters,
        ...remainingCenters.slice(insertIndex),
      ];
    } catch (error) {
      console.error('Error expanding EPS grouped cost centers:', error);
      return costCenters;
    }
  };

  const buildCostCenterInfoMap = async (accountNumbers) => {
    if (!Array.isArray(accountNumbers) || accountNumbers.length === 0) {
      return new Map();
    }

    const response = await fetch(
      `/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(accountNumbers.join(', '))}`,
    );

    if (!response.ok) {
      throw new Error('Failed to fetch cost center details');
    }

    const payload = await response.json();
    const costCenters = Array.isArray(payload?.costCenters) ? payload.costCenters : [];

    return new Map(
      costCenters.map((center) => [
        String(center?.cost_code || '').trim().toUpperCase(),
        center,
      ]),
    );
  };

  const mapPaymentsToVehicles = (payments, fallbackCompany) => {
    return (payments || []).map((payment) => ({
      doc_no: payment.id,
      stock_code: payment.cost_code,
      stock_description: `${payment.company || fallbackCompany || 'N/A'} - ${payment.cost_code}`,
      account_number: payment.cost_code,
      account_invoice_id: payment.account_invoice_id || null,
      company: payment.company || fallbackCompany,
      total_ex_vat: Number(payment.due_amount || 0),
      total_vat: 0,
      total_incl_vat: Number(payment.due_amount || 0),
      one_month: Number((payment.current_due ?? payment.due_amount) || 0),
      '2nd_month': 0,
      '3rd_month': 0,
      amount_due: Number((payment.outstanding_balance ?? payment.balance_due) || 0),
      monthly_amount: Number(payment.due_amount || 0),
      payment_status: payment.payment_status,
      billing_month: payment.billing_month,
      reference: payment.reference,
      current_due: Number(payment.current_due || 0),
      overdue_30_days: Number(payment.overdue_30_days || 0),
      overdue_60_days: Number(payment.overdue_60_days || 0),
      overdue_90_days: Number(payment.overdue_90_days || 0),
      overdue_120_plus_days: Number(payment.overdue_120_plus_days || 0),
    }));
  };

  const buildSummaryFromPayments = (payments) => {
    const summary = {
      totalDueAmount: 0,
      totalPaidAmount: 0,
      totalBalanceDue: 0,
      totalCurrentDue: 0,
      totalOverdue30: 0,
      totalOverdue60: 0,
      totalOverdue90: 0,
      totalOverdue120Plus: 0,
      paymentCount: payments?.length || 0
    };

    (payments || []).forEach((payment) => {
      summary.totalDueAmount += Number(payment.due_amount || 0);
      summary.totalPaidAmount += Number(payment.paid_amount || 0);
      summary.totalBalanceDue += Number((payment.outstanding_balance ?? payment.balance_due) || 0);
      summary.totalCurrentDue += Number(payment.current_due || 0);
      summary.totalOverdue30 += Number(payment.overdue_30_days || 0);
      summary.totalOverdue60 += Number(payment.overdue_60_days || 0);
      summary.totalOverdue90 += Number(payment.overdue_90_days || 0);
      summary.totalOverdue120Plus += Number(payment.overdue_120_plus_days || 0);
    });

    return summary;
  };

  const buildCostCenterAmounts = (payment, invoice) => {
    const invoiceDueAmount = Number(invoice?.total_amount || 0);
    const invoicePaidAmount = Number(invoice?.paid_amount || 0);
    const invoiceBalanceDue =
      Number(invoice?.balance_due ?? Math.max(0, invoiceDueAmount - invoicePaidAmount));
    const hasInvoiceAmounts =
      invoiceDueAmount > 0 || invoicePaidAmount > 0 || invoiceBalanceDue > 0;

    if (hasInvoiceAmounts) {
      return {
        dueAmount: invoiceDueAmount,
        paidAmount: invoicePaidAmount,
        balanceDue: invoiceBalanceDue,
        paymentStatus: invoice?.payment_status || 'pending',
      };
    }

    const dueAmount = Number(payment?.due_amount || 0);
    const paidAmount = Number(payment?.paid_amount || 0);
    const balanceDue = Number(payment?.balance_due || 0);
    const hasPaymentAmounts = dueAmount > 0 || paidAmount > 0 || balanceDue > 0;

    if (hasPaymentAmounts) {
      return {
        dueAmount,
        paidAmount,
        balanceDue,
        paymentStatus: payment?.payment_status || 'pending',
      };
    }

    return {
      dueAmount: 0,
      paidAmount: 0,
      balanceDue: 0,
      paymentStatus: payment?.payment_status || 'pending',
    };
  };

  const loadFromPaymentsData = ({ clientInfo, payments, summary, searchDetails, searchMethod, costCenterInfoMap = new Map() }) => {
    const vehicles = mapPaymentsToVehicles(payments, clientInfo.companyGroup || code);
    setClientLegalName(clientInfo.companyGroup || code);

    setClientData({
      code: code,
      customers: [{
        company: clientInfo.companyGroup,
        legal_name: clientInfo.legalNames?.[0] || clientInfo.companyGroup,
        vehicles
      }],
      vehicles,
      totalMonthlyAmount: summary?.totalDueAmount || 0,
      totalAmountDue: summary?.totalBalanceDue || 0,
        totalOverdue:
          (summary?.totalOverdue30 || 0) +
          (summary?.totalOverdue60 || 0) +
          (summary?.totalOverdue90 || 0) +
          (summary?.totalOverdue120Plus || 0),
      vehicleCount: vehicles.length,
      paymentsTotalAmount: summary?.totalPaidAmount || 0,
      paymentsAmountDue: summary?.totalBalanceDue || 0,
      summary,
      searchMethod,
      searchDetails
    });

    setFilteredCostCenters(vehicles);
  };

  const fetchPaymentsByAccountsList = async () => {
    const rawCodes = (decodedCode || code || '').toString();
    const accountNumbers = rawCodes
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length > 0);

    if (accountNumbers.length === 0) {
      return false;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/billing/by-client-accounts?all_new_account_numbers=${encodeURIComponent(accountNumbers.join(', '))}`);
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const payments = Array.isArray(data?.payments) ? data.payments : [];
      const summary = data?.summary || null;
      const costCenterInfoMap = await buildCostCenterInfoMap(accountNumbers);

      loadFromPaymentsData({
        clientInfo: {
          companyGroup: accountNumbers[0]?.split('-')[0] || accountNumbers[0],
          legalNames: [],
          accountNumbers: accountNumbers.join(', '),
          searchMethod: 'payments_table_focus'
        },
        payments,
        summary,
        searchDetails: {
          searchedAccountNumbers: accountNumbers,
          paymentsTableRecords: payments.length,
          totalDueAmount: summary?.totalDueAmount || 0,
          totalBalanceDue: summary?.totalBalanceDue || 0
        },
        searchMethod: 'payments_table_focus',
        costCenterInfoMap
      });

      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error fetching payments by accounts list:', error);
      setLoading(false);
      return false;
    }
  };

  const fetchCostCentersWithPayments = async () => {
    setLoading(true);
    const rawCode = String(decodedCode || '');
    const firstAccount = rawCode.split(',')[0]?.trim() || rawCode;
    const prefix = firstAccount.split('-')[0] || firstAccount;
    if (!prefix) return false;

    try {
      const response = await fetch(`/api/cost-centers/with-payments?prefix=${encodeURIComponent(prefix)}`);
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const centers = Array.isArray(data?.costCenters) ? data.costCenters : [];
      if (centers.length === 0) {
        return false;
      }

      const payments = centers.map((center) => {
        const amounts = buildCostCenterAmounts(center.payment, center.invoice);
      const reference = isRealInvoiceNumber(center.invoice?.invoice_number)
          ? center.invoice.invoice_number
          : isRealInvoiceNumber(center.payment?.reference)
            ? center.payment.reference
            : (center.payment?.source === 'vehicles_draft' ? 'PENDING' : '');
        return {
          id: center.payment?.id || center.invoice?.id || null,
          account_invoice_id: center.invoice?.id || center.payment?.account_invoice_id || null,
          accountInvoiceId: center.invoice?.id || center.payment?.account_invoice_id || null,
          company: center.legal_name || center.company || center.payment?.company || center.invoice?.company_name || prefix,
          cost_code: center.cost_code,
          reference,
          due_amount: amounts.dueAmount,
          paid_amount: amounts.paidAmount,
          balance_due: amounts.balanceDue,
          credit_amount: Number(center.payment?.credit_amount || 0),
          invoice_date: center.payment?.invoice_date || center.invoice?.invoice_date || null,
          due_date: center.payment?.due_date || null,
          payment_status: amounts.paymentStatus,
          amountSource: center.payment?.source || (center.invoice ? 'account_invoice' : 'payments'),
          overdue_30_days: center.payment?.overdue_30_days || 0,
          overdue_60_days: center.payment?.overdue_60_days || 0,
          overdue_90_days: center.payment?.overdue_90_days || 0,
          last_updated: center.payment?.last_updated || center.invoice?.created_at || null,
          billing_month: center.payment?.billing_month || center.invoice?.billing_month || null
        };
      });

      const summary = buildSummaryFromPayments(payments);

      loadFromPaymentsData({
        clientInfo: {
          companyGroup: centers[0]?.legal_name || centers[0]?.company || prefix,
          legalNames: centers.map((center) => center.legal_name).filter(Boolean),
          accountNumbers: centers.map((center) => center.cost_code).join(', '),
          searchMethod: 'cost_centers_with_payments'
        },
        payments,
        summary,
        searchDetails: {
          searchedAccountNumbers: centers.map((center) => center.cost_code),
          paymentsTableRecords: payments.length,
          totalDueAmount: summary.totalDueAmount,
          totalBalanceDue: summary.totalBalanceDue
        },
        searchMethod: 'cost_centers_with_payments',
        costCenterInfoMap: new Map(
          centers.map((center) => [
            String(center?.cost_code || '').trim().toUpperCase(),
            center,
          ]),
        )
      });

      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error fetching cost centers with payments:', error);
      setLoading(false);
      return false;
    }
  };

  const refreshVisibleClientData = async () => {
    if ((decodedCode || '').includes(',')) {
      return fetchPaymentsByAccountsList();
    }

    const loaded = await fetchCostCentersWithPayments();
    if (!loaded) {
      await fetchClientDataWithPaymentsFocus();
    }
  };

  useEffect(() => {
    if (code) {
      console.log('Client cost centers page loaded with code:', code);
      console.log('Decoded code:', decodedCode);
      if (!clientLegalName) {
        setClientLegalName(decodedCode || String(code));
      }

      // Fast path for comma-separated account numbers
      if ((decodedCode || '').includes(',')) {
        fetchPaymentsByAccountsList().then((loaded) => {
          if (loaded) return;
        });
        return;
      }
      
      // Prefer cost_centers table joined to payments_ table when available
      fetchCostCentersWithPayments().then((loaded) => {
        if (loaded) {
          return;
        }

      // Check if we have sessionStorage data from Accounts role (payments_ table focus)
      const sessionData = sessionStorage.getItem('clientPaymentData');
      console.log('SessionStorage data:', sessionData);
      
      if (sessionData) {
        try {
          const parsedData = JSON.parse(sessionData);
          console.log('Parsed sessionStorage data:', parsedData);
          
          if (parsedData.searchMethod === 'payments_table_focus') {
            console.log('Using sessionStorage data from payments_ table search:', parsedData);
            console.log('About to call loadFromSessionStorage...');
            try {
              loadFromSessionStorage(parsedData);
              console.log('loadFromSessionStorage called successfully, returning from useEffect');
            } catch (error) {
              console.error('Error calling loadFromSessionStorage:', error);
            }
            return;
          } else {
            console.log('SessionStorage data found but not payments_table_focus method:', parsedData.searchMethod);
          }
        } catch (error) {
          console.error('Error parsing sessionStorage data:', error);
        }
      } else {
        console.log('No sessionStorage data found');
      }
      
      // Fallback to enhanced API fetch with payments_ table focus
      console.log('Falling back to enhanced API fetch with payments_ table focus for code:', code);
      fetchClientDataWithPaymentsFocus();
      });
    }
  }, [code, decodedCode]);

  useEffect(() => {
    if (clientData?.vehicles) {
      filterCostCenters();
    }
  }, [searchTerm, clientData]);

  const overviewTotals = useMemo(() => {
    const totals = {
      due: 0,
      paid: 0,
      balance: 0,
      credit: 0,
      costCenters: costCentersWithPayments.length,
      paidCount: 0,
      partialCount: 0,
      pendingCount: 0,
      overdueCount: 0,
    };

    costCentersWithPayments.forEach((costCenter) => {
      totals.due += Number(costCenter?.dueAmount || 0);
      totals.paid += Number(costCenter?.paidAmount || 0);
      totals.balance += Number(costCenter?.balanceDue || 0);
      totals.credit += Number(costCenter?.creditAmount || 0);
      const status = String(costCenter?.paymentStatus || 'pending').toLowerCase();
      if (status === 'paid') totals.paidCount += 1;
      else if (status === 'partial') totals.partialCount += 1;
      else if (status === 'overdue') totals.overdueCount += 1;
      else totals.pendingCount += 1;
    });

    return totals;
  }, [costCentersWithPayments]);

  const displayBillingMonth = useMemo(() => {
    const selectedMonth =
      costCentersWithPayments.find((item) => item?.billingMonth)?.billingMonth ||
      currentBillingMonthKey;
    const date = new Date(selectedMonth);
    if (Number.isNaN(date.getTime())) return selectedMonth;
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' });
  }, [costCentersWithPayments, currentBillingMonthKey]);

  // Handle amount input changes - allow decimals and better formatting
  const handleAmountChange = (e) => {
    let value = e.target.value;
    
    // Remove all non-digit and non-decimal characters except the first decimal point
    value = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    setEnteredAmount(value);
  };

  const loadLogoDataUrl = async () => {
    const response = await fetch('/soltrack_logo.png');
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const getOverdueValue = (costCenter, key) => {
    return (
      Number(costCenter?.[key]) ||
      Number(costCenter?.[key.replace(/_/g, '')]) ||
      0
    );
  };

  const handleDownloadStatement = async (variant = 'summary') => {
    if (!costCentersWithPayments.length) {
      toast({
        variant: "destructive",
        title: "No data",
        description: "No cost centers available for statement."
      });
      return;
    }

    setIsGeneratingStatement(true);
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      setIsGeneratingStatement(false);
      toast({
        variant: "destructive",
        title: "Popup blocked",
        description: "Please allow popups for this site and try again.",
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Preparing statement...</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              color: #1f2937;
              background: #ffffff;
            }
          </style>
        </head>
        <body>Preparing statement...</body>
      </html>
    `);
    printWindow.document.close();

    try {
      const includeItems = variant === 'items';
      const clientLabel = clientLegalName || decodedCode || code;
      const formatStatementDate = (value) =>
        value ? new Date(value).toLocaleDateString('en-GB') : '-';

      const resolveStatementInvoice = async (row) => {
        const invoiceQuery = new URLSearchParams({
          accountNumber: row.accountNumber,
        });

        if (row.sourceAccountNumber) {
          invoiceQuery.set('sourceAccountNumber', row.sourceAccountNumber);
        }
        if (row.invoiceGroup) {
          invoiceQuery.set('billingGroup', row.invoiceGroup);
        }
        if (row.billingMonth) {
          invoiceQuery.set('billingMonth', row.billingMonth);
        }

        try {
          const [bulkInvoiceResponse, invoiceResponse, paymentResponse, historyResponse] = await Promise.all([
            fetch(
              `/api/invoices/bulk-account?accountNumber=${encodeURIComponent(row.accountNumber)}${row.billingMonth ? `&billingMonth=${encodeURIComponent(row.billingMonth)}` : ''}`,
            ),
            fetch(`/api/vehicles/invoice?${invoiceQuery.toString()}`),
            fetch(
              `/api/payments/by-account?accountNumber=${encodeURIComponent(row.accountNumber)}${row.billingMonth ? `&billingMonth=${encodeURIComponent(row.billingMonth)}` : ''}`,
            ),
            fetch(`/api/invoices/account/history?accountNumber=${encodeURIComponent(row.accountNumber)}`),
          ]);

          let bulkInvoice = null;
          if (bulkInvoiceResponse.ok) {
            const bulkPayload = await bulkInvoiceResponse.json();
            bulkInvoice = bulkPayload?.invoice || null;
          }

          let invoiceData = null;
          if (invoiceResponse.ok) {
            const invoicePayload = await invoiceResponse.json();
            invoiceData = invoicePayload?.invoiceData || null;
          }

          let paymentData = null;
          if (paymentResponse.ok) {
            const paymentPayload = await paymentResponse.json();
            paymentData = paymentPayload?.payment || null;
          }

          let invoiceHistory = [];
          let paymentHistory = [];
          if (historyResponse.ok) {
            const historyPayload = await historyResponse.json();
            invoiceHistory = Array.isArray(historyPayload?.invoices) ? historyPayload.invoices : [];
            paymentHistory = Array.isArray(historyPayload?.payments) ? historyPayload.payments : [];
          }

          return {
            activeInvoice: bulkInvoice || invoiceData || null,
            paymentData,
            invoiceHistory,
            paymentHistory,
            items: Array.isArray(invoiceData?.invoiceItems)
              ? invoiceData.invoiceItems
              : Array.isArray(invoiceData?.invoice_items)
                ? invoiceData.invoice_items
                : [],
          };
        } catch (statementInvoiceError) {
          console.error('Error resolving statement invoice for', row.accountNumber, statementInvoiceError);
          return { activeInvoice: null, paymentData: null, invoiceHistory: [], paymentHistory: [], items: [] };
        }
      };

      const statementRows = costCentersWithPayments
        .map(cc => ({
          date: cc.invoiceDate || cc.dueDate || cc.billingMonth || '',
          client: cc.accountName || clientLabel,
          invoiceNo: cc.reference || cc.accountNumber,
          totalInvoiced: cc.dueAmount || 0,
          paid: cc.paidAmount || 0,
          credited: cc.creditAmount || 0,
          outstanding: cc.balanceDue || 0,
          accountNumber: cc.accountNumber,
          sourceAccountNumber: cc.sourceAccountNumber,
          invoiceGroup: cc.invoiceGroup,
          billingMonth: cc.billingMonth,
          items: [],
          costCenter: cc,
        }));

      const statementViews = [];
      let sharedPartyDetails = null;

      for (const row of statementRows) {
        const { activeInvoice, paymentData, invoiceHistory, paymentHistory: accountPaymentHistory, items } = await resolveStatementInvoice(row);
        const structuredAddress = [
          row.costCenter?.costCenterInfo?.physical_address_1,
          row.costCenter?.costCenterInfo?.physical_address_2,
          row.costCenter?.costCenterInfo?.physical_address_3,
          row.costCenter?.costCenterInfo?.physical_area,
          row.costCenter?.costCenterInfo?.physical_code,
        ]
          .filter(Boolean)
          .join('\n');

        if (activeInvoice) {
          row.invoiceNo = activeInvoice.invoice_number || row.invoiceNo;
          row.totalInvoiced = Number(
            activeInvoice.total_amount ??
              paymentData?.due_amount ??
              row.totalInvoiced ??
              0,
          );
          row.paid = statementPaidAmount;
          row.outstanding = Number(
            paymentData?.outstanding_balance ??
              activeInvoice.balance_due ??
              row.outstanding ??
              0,
          );
          row.client = activeInvoice.company_name || row.client;
          row.credited = Number(
            paymentData?.credit_amount ??
              activeInvoice?.credit_amount ??
              row.costCenter?.creditAmount ??
              row.credited ??
              0,
          );
          row.date =
            activeInvoice.invoice_date ||
            activeInvoice.created_at ||
            row.date;
        }
        if (includeItems) {
          row.items = items;
        }

        const rowClientName =
          activeInvoice?.company_name ||
          paymentData?.company_name ||
          row.client ||
          clientLabel;
        const rowClientAddress =
          activeInvoice?.client_address ||
          paymentData?.client_address ||
          structuredAddress ||
          '-';
        const rowCompanyRegistrationNumber =
          activeInvoice?.company_registration_number ||
          paymentData?.company_registration_number ||
          row.costCenter?.costCenterInfo?.registration_number ||
          '-';
        const rowCustomerVatNumber =
          activeInvoice?.customer_vat_number ||
          paymentData?.customer_vat_number ||
          row.costCenter?.costCenterInfo?.vat_number ||
          '-';

        if (!sharedPartyDetails) {
          sharedPartyDetails = {
            clientName: rowClientName,
            clientAddress: rowClientAddress,
            companyRegistrationNumber: rowCompanyRegistrationNumber,
            customerVatNumber: rowCustomerVatNumber,
          };
        }

        const bucketSource = {
          balanceDue: row.outstanding,
          dueDate:
            activeInvoice?.due_date ||
            paymentData?.due_date ||
            row.costCenter?.dueDate ||
            row.date,
        };
        const buckets = getAgingBuckets(bucketSource);
        const currentDue = Number(paymentData?.current_due ?? buckets.current ?? 0);
        const overdue30 = Number(paymentData?.overdue_30_days ?? buckets.days30 ?? 0);
        const overdue60 = Number(paymentData?.overdue_60_days ?? buckets.days60 ?? 0);
        const overdue90 = Number(paymentData?.overdue_90_days ?? buckets.days90 ?? 0);
        const overdue120Plus = Number(
          paymentData?.overdue_120_plus_days ??
            paymentData?.overdue_91_plus_days ??
            buckets.days91Plus ??
            0,
        );

        const statementPaidAmount = Number(paymentData?.statement_paid_amount ?? paymentData?.paid_amount ?? row.paid ?? 0);
        const statementCreditedAmount = Number(paymentData?.statement_credit_amount ?? paymentData?.credit_amount ?? row.credited ?? 0);
        const statementOutstandingAmount = Number(paymentData?.outstanding_balance ?? row.outstanding ?? 0);
        const statementTotalInvoicedAmount = Math.max(
          Number(paymentData?.statement_total_invoiced ?? 0),
          Number(row.totalInvoiced || 0),
          statementOutstandingAmount + statementPaidAmount + statementCreditedAmount,
        );

        const statementRowsForAccount = [
          {
            date: formatStatementDate(row.date),
            client: rowClientName,
            invoiceNumber: row.invoiceNo || '-',
            totalInvoiced: formatCurrency(statementTotalInvoicedAmount),
            paid: formatCurrency(statementPaidAmount),
            credited: formatCurrency(statementCreditedAmount),
            outstanding: formatCurrency(statementOutstandingAmount),
            totalValue: statementTotalInvoicedAmount,
            paidValue: statementPaidAmount,
            creditedValue: statementCreditedAmount,
            outstandingValue: statementOutstandingAmount,
          },
        ];

        const totalsFromRows = statementRowsForAccount.reduce(
          (summary, statementRow) => ({
            totalInvoiced: summary.totalInvoiced + Number(statementRow.totalValue || 0),
            paid: summary.paid + Number(statementRow.paidValue || 0),
            credited: summary.credited + Number(statementRow.creditedValue || 0),
            outstanding: summary.outstanding + Number(statementRow.outstandingValue || 0),
          }),
          { totalInvoiced: 0, paid: 0, credited: 0, outstanding: 0 },
        );
        const totalCredited = Math.max(
          totalsFromRows.credited,
          Number(paymentData?.credit_amount || row.credited || 0),
        );

        statementViews.push({
          clientName: sharedPartyDetails?.clientName || rowClientName,
          clientAddress: sharedPartyDetails?.clientAddress || rowClientAddress,
          companyRegistrationNumber:
            sharedPartyDetails?.companyRegistrationNumber || rowCompanyRegistrationNumber,
          statementNumber: '',
          statementDate: formatStatementDate(
            activeInvoice?.invoice_date ||
              activeInvoice?.created_at ||
              paymentData?.invoice_date ||
              paymentData?.created_at ||
              row.date ||
              new Date().toISOString(),
          ),
          accountNumber: row.accountNumber || 'N/A',
          customerVatNumber:
            sharedPartyDetails?.customerVatNumber || rowCustomerVatNumber,
          rows: statementRowsForAccount.map((statementRow, index) => ({
            date: statementRow.date,
            client: statementRow.client,
            invoiceNumber: statementRow.invoiceNumber,
            totalInvoiced: statementRow.totalInvoiced,
            paid: statementRow.paid,
            credited:
              totalCredited > 0 && index === statementRowsForAccount.length - 1
                ? formatCurrency(totalCredited)
                : statementRow.credited,
            outstanding: statementRow.outstanding,
          })),
          agingRows: [
            formatCurrency(currentDue),
            formatCurrency(overdue30),
            formatCurrency(overdue60),
            formatCurrency(overdue90),
            formatCurrency(overdue120Plus),
          ],
          itemRows: includeItems
            ? row.items.map((item, index) => ({
                id: `${item?.reg || 'row'}-${item?.fleetNumber || item?.fleet_number || index}-${index}`,
                reg: item?.reg || '-',
                fleetNumber: item?.fleetNumber || item?.fleet_number || '-',
                description: item?.description || item?.item_description || item?.itemCode || 'Billed Item',
                unitPrice: formatCurrency(item?.unit_price_without_vat || item?.unitPrice || 0),
                vatAmount: formatCurrency(item?.vat_amount || item?.vatAmount || 0),
                totalIncl: formatCurrency(item?.total_including_vat || item?.totalIncl || 0),
              }))
            : [],
          totals: {
            currentInvoice: formatCurrency(Number(row.totalInvoiced || 0)),
            paymentsReceived: formatCurrency(statementPaidAmount),
            totalInvoiced: formatCurrency(totalsFromRows.totalInvoiced),
            paid: formatCurrency(totalsFromRows.paid),
            credited: formatCurrency(totalCredited),
            amountDue: formatCurrency(statementOutstandingAmount),
            outstanding: formatCurrency(
              Math.max(statementOutstandingAmount, totalsFromRows.outstanding),
            ),
          },
        });
      }

      if (statementViews.length === 0) {
        printWindow.close();
        toast({
          variant: "destructive",
          title: "No data",
          description: "No outstanding cost center statements available.",
        });
        return;
      }

      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${includeItems ? 'Client All' : 'Client Statement'} - ${clientLabel}</title>
            <style>
              body {
                margin: 0;
                padding: 24px;
                background: #ffffff;
              }
              .statement-batch-page {
                break-before: page;
                page-break-before: always;
              }
              .statement-batch-page:first-child {
                break-before: auto;
                page-break-before: auto;
              }
            </style>
          </head>
          <body>
            ${statementViews
              .map(
                (statementView, index) => `
                  <div class="statement-batch-page">
                    ${StatementDocument({ statementView, showItemBreakdown: includeItems })}
                  </div>
                `,
              )
              .join('')}
          </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.onload = function onLoad() {
        printWindow.print();
      };
    } catch (error) {
      printWindow.close();
      console.error('Error generating statement:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate statement."
      });
    } finally {
      setIsGeneratingStatement(false);
    }
  };

  // Get the numeric amount from entered string
  const getNumericAmount = () => {
    return parseFloat(enteredAmount) || 0;
  };

  // Load data from sessionStorage when coming from Accounts role with payments_ table focus
  const loadFromSessionStorage = (sessionData) => {
    console.log('loadFromSessionStorage called with:', sessionData);
    try {
      setLoading(true);
      
      const { clientInfo, payments, summary, searchDetails } = sessionData;
      const costCenterInfoLookup = new Map();
      
      console.log('Loading from sessionStorage - payments_ table data:', {
        clientInfo,
        paymentsCount: payments?.length || 0,
        summary,
        searchDetails,
        code: code
      });

      // Set client legal name
      setClientLegalName(clientInfo.companyGroup || code);

      // Convert payments_ table data to cost centers format
      const costCentersFromPayments = payments?.map(payment => {
        const matchedCostCenter =
          costCenterInfoLookup.get(String(payment.cost_code || '').trim().toUpperCase()) || null;
        const reference = isRealInvoiceNumber(payment.reference) ? payment.reference : '';

        return {
        accountNumber: payment.cost_code,
        accountName: matchedCostCenter?.legal_name || matchedCostCenter?.company || payment.company || payment.cost_code,
        company: matchedCostCenter?.company || payment.company || payment.cost_code,
        accountInvoiceId: payment.account_invoice_id || null,
        dueAmount: payment.due_amount || 0,
        paidAmount: payment.paid_amount || 0,
        balanceDue: (payment.outstanding_balance ?? payment.balance_due) || 0,
        creditAmount: Number(payment.credit_amount || 0),
        paymentStatus: payment.payment_status || 'pending',
        reference,
        billingMonth: payment.billing_month,
        currentDue: payment.current_due || 0,
        overdue30Days: payment.overdue_30_days || 0,
        overdue60Days: payment.overdue_60_days || 0,
        overdue90Days: payment.overdue_90_days || 0,
        overdue120PlusDays: payment.overdue_120_plus_days || 0,
        lastUpdated: payment.last_updated,
        invoiceDate: payment.invoice_date,
        dueDate: payment.due_date,
        costCenterInfo: matchedCostCenter,
        vehicleCount: 1, // Each payment record represents one cost center
        vehicles: [{
          doc_no: payment.id,
          stock_code: payment.cost_code,
          stock_description: `${matchedCostCenter?.company || payment.company || 'N/A'} - ${payment.cost_code}`,
          account_number: payment.cost_code,
          account_invoice_id: payment.account_invoice_id || null,
          company: matchedCostCenter?.company || payment.company || clientInfo.companyGroup,
          total_ex_vat: Number(payment.due_amount || 0),
          total_vat: 0,
          total_incl_vat: Number(payment.due_amount || 0),
          one_month: Number((payment.current_due ?? payment.due_amount) || 0),
          '2nd_month': 0,
          '3rd_month': 0,
          amount_due: Number((payment.outstanding_balance ?? payment.balance_due) || 0),
          credit_amount: Number(payment.credit_amount || 0),
          monthly_amount: Number(payment.due_amount || 0),
          payment_status: payment.payment_status,
          billing_month: payment.billing_month,
          reference,
          current_due: Number(payment.current_due || 0),
          overdue_30_days: Number(payment.overdue_30_days || 0),
          overdue_60_days: Number(payment.overdue_60_days || 0),
          overdue_90_days: Number(payment.overdue_90_days || 0),
          overdue_120_plus_days: Number(payment.overdue_120_plus_days || 0)
        }]
      };
      }) || [];

      console.log('Converted cost centers from payments:', costCentersFromPayments);

      setClientData({
        code: code,
        customers: [{
          company: clientInfo.companyGroup,
          legal_name: clientInfo.legalNames?.[0] || clientInfo.companyGroup,
          vehicles: costCentersFromPayments.flatMap(cc => cc.vehicles)
        }],
        vehicles: costCentersFromPayments.flatMap(cc => cc.vehicles),
        totalMonthlyAmount: summary?.totalDueAmount || 0,
        totalAmountDue: summary?.totalBalanceDue || 0,
        totalOverdue:
          (summary?.totalOverdue30 || 0) +
          (summary?.totalOverdue60 || 0) +
          (summary?.totalOverdue90 || 0) +
          (summary?.totalOverdue120Plus || 0),
        vehicleCount: costCentersFromPayments.length,
        paymentsTotalAmount: summary?.totalPaidAmount || 0,
        paymentsAmountDue: summary?.totalBalanceDue || 0,
        summary: summary,
        searchMethod: 'payments_table_focus',
        searchDetails: searchDetails
      });

      // Set filtered cost centers directly from payments_ table data
      const vehiclesFromPayments = costCentersFromPayments.flatMap(cc => cc.vehicles);
      setFilteredCostCenters(vehiclesFromPayments);
      
      console.log('Set filtered cost centers from payments:', vehiclesFromPayments.length, 'vehicles');
      
      console.log('Successfully loaded payments_ table data:', {
        costCentersCount: costCentersFromPayments.length,
        totalDueAmount: summary?.totalDueAmount || 0,
        totalBalanceDue: summary?.totalBalanceDue || 0,
        vehiclesCount: costCentersFromPayments.flatMap(cc => cc.vehicles).length
      });

      console.log('loadFromSessionStorage completed successfully');

    } catch (error) {
      console.error('Error loading from sessionStorage:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load payment data from session. Falling back to API fetch."
      });
      // Fallback to regular fetch
      fetchClientData();
    } finally {
      setLoading(false);
    }
  };

  // Enhanced fetchClientData with payments_ table focus
  const fetchClientDataWithPaymentsFocus = async () => {
    try {
      setLoading(true);
      console.log('Fetching client data with payments_ table focus for all_new_account_numbers:', code);
      
      const response = await fetch(`/api/client-payments?all_new_account_numbers=${code}&includeLegalNames=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch client data');
      }

      const data = await response.json();
      console.log('API response for client with payments focus:', data);

      if (data.customers && data.customers.length > 0) {
        // Get the first customer to extract client legal name
        const firstCustomer = data.customers[0];
        const legalName = firstCustomer.legal_name || firstCustomer.company || code;
        setClientLegalName(legalName);
        
        // Get all vehicles from all matching customers
        const allVehicles = data.customers.reduce((vehicles, customer) => {
          if (customer.vehicles && Array.isArray(customer.vehicles)) {
            return vehicles.concat(customer.vehicles);
          }
          return vehicles;
        }, []);

        setClientData({
          code: code,
          customers: data.customers,
          vehicles: allVehicles,
          totalMonthlyAmount: allVehicles.reduce((sum, v) => sum + (v.monthly_amount || 0), 0),
          totalAmountDue: allVehicles.reduce((sum, v) => sum + (v.amount_due || 0), 0),
          totalOverdue: allVehicles.reduce(
            (sum, v) =>
              sum +
              (v.overdue_30_days || 0) +
              (v.overdue_60_days || 0) +
              (v.overdue_90_days || 0) +
              (v.overdue_120_plus_days || 0),
            0,
          ),
          vehicleCount: allVehicles.length,
          paymentsTotalAmount: data.customers[0]?.paymentsTotalAmount || 0,
          paymentsAmountDue: data.customers[0]?.paymentsAmountDue || 0,
          summary: data.customers[0]?.summary || null,
          searchMethod: 'payments_table_focus_api'
        });
      } else {
        setClientLegalName(code);
        setClientData({
          code: code,
          customers: [],
          vehicles: [],
          totalMonthlyAmount: 0,
          totalAmountDue: 0,
          totalOverdue: 0,
          vehicleCount: 0,
          paymentsTotalAmount: 0,
          paymentsAmountDue: 0
        });
      }
    } catch (err) {
      console.error('Error fetching client data with payments focus:', err);
      setClientLegalName(code);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch client data. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/client-payments?code=${code}&includeLegalNames=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch client data');
      }

      const data = await response.json();
      console.log('API response for client:', data);

      if (data.customers && data.customers.length > 0) {
        // Get the first customer to extract client legal name
        const firstCustomer = data.customers[0];
        const legalName = firstCustomer.legal_name || firstCustomer.company || code;
        setClientLegalName(legalName);
        
        // Get all vehicles from all matching customers
        const allVehicles = data.customers.reduce((vehicles, customer) => {
          if (customer.vehicles && Array.isArray(customer.vehicles)) {
            return vehicles.concat(customer.vehicles);
          }
          return vehicles;
        }, []);

        setClientData({
          code: code,
          customers: data.customers,
          vehicles: allVehicles,
          totalMonthlyAmount: allVehicles.reduce((sum, v) => sum + (v.monthly_amount || 0), 0),
          totalAmountDue: allVehicles.reduce((sum, v) => sum + (v.amount_due || 0), 0),
          totalOverdue: allVehicles.reduce(
            (sum, v) =>
              sum +
              (v.overdue_30_days || 0) +
              (v.overdue_60_days || 0) +
              (v.overdue_90_days || 0) +
              (v.overdue_120_plus_days || 0),
            0,
          ),
          vehicleCount: allVehicles.length,
          paymentsTotalAmount: data.customers[0]?.paymentsTotalAmount || 0,
          paymentsAmountDue: data.customers[0]?.paymentsAmountDue || 0,
          summary: data.customers[0]?.summary || null
        });
      } else {
        setClientLegalName(code);
        setClientData({
          code: code,
          customers: [],
          vehicles: [],
          totalMonthlyAmount: 0,
          totalAmountDue: 0,
          totalOverdue: 0,
          vehicleCount: 0,
          paymentsTotalAmount: 0,
          paymentsAmountDue: 0
        });
      }
    } catch (err) {
      console.error('Error fetching client data:', err);
      setClientLegalName(code);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch client data. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCostCenters = () => {
    if (!clientData?.vehicles) return;

    console.log('Filtering cost centers with search term:', searchTerm);
    console.log('Available vehicles:', clientData.vehicles.length);

    const filtered = clientData.vehicles.filter(vehicle => {
      const accountNumber = vehicle.account_number || '';
      const stockCode = vehicle.stock_code || '';
      const stockDescription = vehicle.stock_description || '';
      const company = vehicle.company || '';
      const paymentStatus = vehicle.payment_status || '';
      
      const searchLower = searchTerm.toLowerCase();
      const matches = (
        accountNumber.toLowerCase().includes(searchLower) ||
        stockCode.toLowerCase().includes(searchLower) ||
        stockDescription.toLowerCase().includes(searchLower) ||
        company.toLowerCase().includes(searchLower) ||
        paymentStatus.toLowerCase().includes(searchLower)
      );
      
      if (searchTerm && matches) {
        console.log('Match found:', { accountNumber, stockCode, company, paymentStatus });
      }
      
      return matches;
    });

    console.log('Filtered vehicles:', filtered.length);
    setFilteredCostCenters(filtered);
  };

  const groupByCostCenter = (vehicles) => {
    const costCenters = {};
    
    console.log('Grouping vehicles by cost center:', vehicles.length, 'vehicles');
    
    vehicles.forEach(vehicle => {
      const accountNumber = vehicle.account_number;
      if (!accountNumber) {
        console.log('Skipping vehicle with no account number:', vehicle);
        return;
      }
      
      console.log('Processing vehicle:', { 
        accountNumber, 
        company: vehicle.company, 
        total_ex_vat: vehicle.total_ex_vat, 
        amount_due: vehicle.amount_due,
        payment_status: vehicle.payment_status
      });
      
      if (!costCenters[accountNumber]) {
        costCenters[accountNumber] = {
          accountNumber,
          accountName: vehicle.company || vehicle.stock_description || vehicle.stock_code || accountNumber,
        dueAmount: vehicle.total_ex_vat || 0,
        paidAmount: (vehicle.total_ex_vat || 0) - (vehicle.amount_due || 0),
        balanceDue: vehicle.amount_due || 0,
        creditAmount: Number(vehicle.credit_amount || 0),
        paymentStatus: vehicle.payment_status || 'pending',
        accountInvoiceId: vehicle.account_invoice_id || null,
        reference: isRealInvoiceNumber(vehicle.reference) ? vehicle.reference : '',
        billingMonth: vehicle.billing_month,
          vehicleCount: 0,
          vehicles: []
        };
      }
      
      // Use the payment data from the payments_ table
      costCenters[accountNumber].dueAmount = Math.max(costCenters[accountNumber].dueAmount, vehicle.total_ex_vat || 0);
      costCenters[accountNumber].paidAmount = (vehicle.total_ex_vat || 0) - (vehicle.amount_due || 0);
      costCenters[accountNumber].balanceDue = vehicle.amount_due || 0;
      costCenters[accountNumber].creditAmount = Number(vehicle.credit_amount || 0);
      costCenters[accountNumber].paymentStatus = vehicle.payment_status || 'pending';
      costCenters[accountNumber].accountInvoiceId =
        vehicle.account_invoice_id || costCenters[accountNumber].accountInvoiceId || null;
      costCenters[accountNumber].reference = isRealInvoiceNumber(vehicle.reference) ? vehicle.reference : '';
      costCenters[accountNumber].billingMonth = vehicle.billing_month;
      costCenters[accountNumber].vehicleCount += 1;
      costCenters[accountNumber].vehicles.push(vehicle);
    });
    
    const result = Object.values(costCenters);
    console.log('Grouped cost centers result:', result.length, 'cost centers');
    result.forEach(cc => {
      console.log('Cost center:', {
        accountNumber: cc.accountNumber,
        accountName: cc.accountName,
        dueAmount: cc.dueAmount,
        balanceDue: cc.balanceDue,
        paymentStatus: cc.paymentStatus,
        vehicleCount: cc.vehicleCount
      });
    });
    
    return result;
  };

  // Fetch payments data for each cost center
  const fetchPaymentsForCostCenters = async (costCenters) => {
    try {
      const updatedCostCenters = await Promise.all(
        costCenters.map(async (costCenter) => {
          try {
            const response = await fetch(`/api/payments/by-account?accountNumber=${costCenter.accountNumber}`);
            if (response.ok) {
              const paymentData = await response.json();
              if (paymentData.payment) {
                return {
                  ...costCenter,
                  amountDue: paymentData.payment.balance_due || 0,
                  outstandingBalance:
                    (paymentData.payment.outstanding_balance ?? paymentData.payment.balance_due) || 0,
                  overdue:
                    (paymentData.payment.overdue_30_days || 0) +
                    (paymentData.payment.overdue_60_days || 0) +
                    (paymentData.payment.overdue_90_days || 0) +
                    (paymentData.payment.overdue_120_plus_days || 0),
                  totalPaid: paymentData.payment.paid_amount || 0,
                  creditAmount: paymentData.payment.credit_amount || costCenter.creditAmount || 0,
                  monthlyAmount: paymentData.payment.due_amount || 0,
                  currentDue: paymentData.payment.current_due || 0,
                  firstMonth: paymentData.payment.overdue_30_days || 0,
                  overdue120PlusDays: paymentData.payment.overdue_120_plus_days || 0,
                };
              }
            }
          } catch (error) {
            console.error(`Error fetching payment for ${costCenter.accountNumber}:`, error);
          }
          return costCenter;
        })
      );
      return updatedCostCenters;
    } catch (error) {
      console.error('Error fetching payments data:', error);
      return costCenters;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const getAgingBuckets = (costCenter) => {
    const balanceDue = Number(costCenter?.balanceDue || 0);
    const dueDateValue = costCenter?.dueDate || costCenter?.invoiceDate || costCenter?.billingMonth;
    const dueDate = dueDateValue ? new Date(dueDateValue) : null;

    if (balanceDue <= 0 || !dueDate || Number.isNaN(dueDate.getTime())) {
      return { current: balanceDue, days30: 0, days60: 0, days90: 0, days91Plus: 0 };
    }

    const today = new Date();
    const diffMs = today.setHours(0, 0, 0, 0) - dueDate.setHours(0, 0, 0, 0);
    const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (daysOverdue <= 0) {
      return { current: balanceDue, days30: 0, days60: 0, days90: 0, days91Plus: 0 };
    }

    return {
      current: 0,
      days30: daysOverdue <= 30 ? balanceDue : 0,
      days60: daysOverdue >= 31 && daysOverdue <= 60 ? balanceDue : 0,
      days90: daysOverdue >= 61 && daysOverdue <= 90 ? balanceDue : 0,
      days91Plus: daysOverdue > 90 ? balanceDue : 0,
    };
  };

  const getOutstandingAmount = (costCenter) =>
    Number(costCenter?.balanceDue ?? costCenter?.amountDue ?? 0);

  const getOutstandingBucketAmount = (source) =>
    Number(
      (
        Number(source?.overdue120PlusDays ?? source?.overdue_120_plus_days ?? 0) +
        Number(source?.overdue90Days ?? source?.overdue_90_days ?? 0) +
        Number(source?.overdue60Days ?? source?.overdue_60_days ?? 0) +
        Number(source?.overdue30Days ?? source?.overdue_30_days ?? 0)
      ).toFixed(2),
    );

  const buildOutstandingInvoiceSummary = (costCenter) => {
    const overdue30 = Number(costCenter?.overdue30Days ?? costCenter?.overdue_30_days ?? 0);
    const overdue60 = Number(costCenter?.overdue60Days ?? costCenter?.overdue_60_days ?? 0);
    const overdue90 = Number(costCenter?.overdue90Days ?? costCenter?.overdue_90_days ?? 0);
    const overdue120 = Number(costCenter?.overdue120PlusDays ?? costCenter?.overdue_120_plus_days ?? 0);
    const outstandingAmount = getOutstandingBucketAmount(costCenter);

    if (outstandingAmount <= 0) {
      return null;
    }

    return {
      id: `outstanding-${costCenter?.accountNumber || 'account'}`,
      account_number: costCenter?.accountNumber || null,
      billing_month: costCenter?.billingMonth || null,
      invoice_number: 'Outstanding Balance',
      invoice_date: costCenter?.invoiceDate || costCenter?.dueDate || costCenter?.billingMonth || null,
      created_at: costCenter?.created_at || costCenter?.createdAt || null,
      total_amount: outstandingAmount,
      paid_amount: 0,
      balance_due: outstandingAmount,
      payment_status: 'pending',
      isOutstandingSummary: true,
      overdue_30_days: overdue30,
      overdue_60_days: overdue60,
      overdue_90_days: overdue90,
      overdue_120_plus_days: overdue120,
    };
  };

  const downloadBlob = (blob, fileName) => {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const escapeHtml = (value) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const buildReportEmailHtml = ({
    title,
    clientName,
    accountNumber,
    formatLabel,
    documentLabel,
    attachmentName,
    bodyText,
  }) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;color:#ffffff;">
                    <div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.9;">Solflo Reports</div>
                    <div style="margin-top:10px;font-size:28px;font-weight:700;line-height:1.2;">${documentLabel}</div>
                    <div style="margin-top:8px;font-size:15px;opacity:0.92;">Your requested ${formatLabel} document is attached and ready to use.</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <div style="font-size:15px;line-height:1.7;color:#111827;white-space:pre-line;">${escapeHtml(bodyText || `Please find the attached ${documentLabel.toLowerCase()} for ${clientName}.`)}</div>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 12px;">
                      <tr><td colspan="2" style="height:10px;"></td></tr>
                      <tr>
                        <td style="width:180px;color:#6b7280;font-size:14px;">Client</td>
                        <td style="font-size:15px;font-weight:600;color:#111827;">${clientName}</td>
                      </tr>
                      <tr>
                        <td style="width:180px;color:#6b7280;font-size:14px;">Account Number</td>
                        <td style="font-size:15px;font-weight:600;color:#111827;">${accountNumber}</td>
                      </tr>
                      <tr>
                        <td style="width:180px;color:#6b7280;font-size:14px;">Document Format</td>
                        <td style="font-size:15px;font-weight:600;color:#111827;">${formatLabel}</td>
                      </tr>
                      <tr>
                        <td style="width:180px;color:#6b7280;font-size:14px;">Sent On</td>
                        <td style="font-size:15px;font-weight:600;color:#111827;">${new Date().toLocaleString('en-ZA')}</td>
                      </tr>
                    </table>

                    <div style="margin-top:24px;padding:18px 20px;border:1px solid #dbeafe;border-radius:14px;background:#eff6ff;color:#1e3a8a;font-size:14px;line-height:1.6;">
                      The attachment is included with this email. Open the attached file to view, save, or forward the report.
                    </div>

                    <div style="margin-top:18px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;overflow:hidden;">
                      <div style="padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#475569;">
                        Attachment
                      </div>
                      <div style="padding:16px 18px;font-size:14px;color:#111827;font-weight:600;">
                        ${attachmentName}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6;">
                    Solflo automated report delivery
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const renderHtmlToPdfBlob = async (html) => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-10000px';
    wrapper.style.top = '0';
    wrapper.style.width = '960px';
    wrapper.style.background = '#ffffff';
    wrapper.style.zIndex = '-1';
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));

      const images = Array.from(wrapper.querySelectorAll('img'));
      await Promise.all(
        images.map(
          (image) =>
            new Promise((resolve) => {
              if (image.complete) {
                resolve(true);
                return;
              }
              image.onload = () => resolve(true);
              image.onerror = () => resolve(true);
            }),
        ),
      );

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: wrapper.scrollWidth,
        height: wrapper.scrollHeight,
        windowWidth: wrapper.scrollWidth,
        windowHeight: wrapper.scrollHeight,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      return pdf.output('blob');
    } finally {
      wrapper.remove();
    }
  };

  const sendDocumentToMyEmail = async ({ recipientEmail, subject, html, fileName, blob, contentType }) => {
    const formData = new FormData();
    formData.append('recipientEmail', recipientEmail || '');
    formData.append('subject', subject || '');
    formData.append('html', html || '');
    formData.append('senderName', 'Solflo Delivery');
    formData.append(
      'attachment',
      new File([blob], fileName, {
        type: contentType || 'application/octet-stream',
      }),
    );

    const response = await fetch('/api/send-document-email', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (!response.ok || !result?.success) {
      throw new Error(result?.error || 'Failed to send document email');
    }

    return result;
  };

  const fetchCostCenterInfo = async (accountNumber) => {
    const response = await fetch(
      `/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(accountNumber)}`,
    );

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (!Array.isArray(result?.costCenters)) {
      return null;
    }

    return (
      result.costCenters.find(
        (item) =>
          String(item?.cost_code || '').trim().toUpperCase() ===
          String(accountNumber || '').trim().toUpperCase(),
      ) || result.costCenters[0] || null
    );
  };

  const fetchStatementReportPayload = async (costCenter) => {
    const query = new URLSearchParams({
      accountNumber: costCenter.accountNumber,
    });
    if (costCenter.billingMonth) {
      query.set('billingMonth', costCenter.billingMonth);
    }

    const response = await fetch(`/api/payments/by-account?${query.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch payment data');
    }

    const paymentDataResult = await response.json();
    const payment = paymentDataResult.payment || {};
    const [historyResponse, bulkInvoiceResponse] = await Promise.all([
      fetch(`/api/invoices/account/history?accountNumber=${encodeURIComponent(costCenter.accountNumber)}`),
      fetch(
        `/api/invoices/bulk-account?accountNumber=${encodeURIComponent(costCenter.accountNumber)}${
          costCenter.billingMonth ? `&billingMonth=${encodeURIComponent(costCenter.billingMonth)}` : ''
        }`,
      ),
    ]);

    let invoiceHistory = [];
    let paymentHistory = [];
    let bulkInvoice = null;
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      invoiceHistory = Array.isArray(historyData?.invoices) ? historyData.invoices : [];
      paymentHistory = Array.isArray(historyData?.payments) ? historyData.payments : [];
    }
    if (bulkInvoiceResponse.ok) {
      const bulkInvoiceData = await bulkInvoiceResponse.json();
      bulkInvoice = bulkInvoiceData?.invoice || null;
    }

    let invoiceData = null;
    const invoiceQuery = new URLSearchParams({
      accountNumber: costCenter.accountNumber,
    });
    if (costCenter.sourceAccountNumber) {
      invoiceQuery.set('sourceAccountNumber', costCenter.sourceAccountNumber);
    }
    if (costCenter.invoiceGroup) {
      invoiceQuery.set('billingGroup', costCenter.invoiceGroup);
    }
    if (costCenter.billingMonth) {
      invoiceQuery.set('billingMonth', costCenter.billingMonth);
    }

    const invoiceResponse = await fetch(`/api/vehicles/invoice?${invoiceQuery.toString()}`);
    if (invoiceResponse.ok) {
      const invoicePayload = await invoiceResponse.json();
      invoiceData = invoicePayload?.invoiceData || null;
    }

    const costCenterInfo = costCenter?.costCenterInfo || (await fetchCostCenterInfo(costCenter.accountNumber));
    const reportCostCenter = {
      ...costCenter,
      paymentData: payment,
      invoiceData: invoiceData || costCenter.invoiceData || null,
      invoiceHistory,
      paymentHistory,
      bulkInvoice,
      costCenterInfo,
    };
    const statementView = buildStatementView({
      costCenter: reportCostCenter,
      clientLegalName,
      paymentData: payment,
      invoiceHistory,
      paymentHistory,
      bulkInvoice,
    });

    return { reportCostCenter, statementView };
  };

  const fetchInvoiceReportPayload = async (costCenter) => {
    const query = new URLSearchParams({
      accountNumber: costCenter.accountNumber,
    });
    if (costCenter.sourceAccountNumber) {
      query.set('sourceAccountNumber', costCenter.sourceAccountNumber);
    }
    if (costCenter.invoiceGroup) {
      query.set('billingGroup', costCenter.invoiceGroup);
    }
    if (costCenter.billingMonth) {
      query.set('billingMonth', costCenter.billingMonth);
    }

    const response = await fetch(`/api/vehicles/invoice?${query.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch vehicle invoice data');
    }

    const data = await response.json();
    const invoiceData = data?.invoiceData || null;
    if (!invoiceData) {
      throw new Error('No vehicle data found for this account');
    }

    const costCenterInfo = costCenter?.costCenterInfo || (await fetchCostCenterInfo(costCenter.accountNumber));
    const reportCostCenter = {
      ...costCenter,
      invoiceData,
      costCenterInfo,
    };
    const invoiceView = buildInvoiceView({
      activeInvoiceData: invoiceData,
      customerInfo: costCenterInfo,
      clientLegalName,
      costCenter: reportCostCenter,
      editableNotes:
        invoiceData?.notes ?? invoiceData?.note ?? invoiceData?.quote_notes ?? '',
    });

    return { reportCostCenter, invoiceView };
  };

  const buildStatementWorkbook = (statementView, includeItems = false) => {
    const rows = [
      ['DEBTOR STATEMENT'],
      [],
      ['Client', statementView.clientName],
      ['Account', statementView.accountNumber],
      ['Statement Date', statementView.statementDate],
      ['Company Reg', statementView.companyRegistrationNumber],
      ['Customer VAT Number', statementView.customerVatNumber],
      ['Address', statementView.clientAddress],
      [],
      ['Date', 'Client', 'Invoice Number', 'Total Invoiced', 'Paid', 'Credited', 'Outstanding'],
      ...statementView.rows.map((row) => [
        row.date,
        row.client,
        row.invoiceNumber,
        row.totalInvoiced,
        row.paid,
        row.credited,
        row.outstanding,
      ]),
      [],
      ['AGE ANALYSIS'],
      ['Current', '30 Days', '60 Days', '90 Days', '120+ Days'],
      statementView.agingRows,
      [],
      ['Total Invoiced', statementView.totals.totalInvoiced],
      ['Paid', statementView.totals.paid],
      ['Credited', statementView.totals.credited],
      ['Outstanding', statementView.totals.outstanding],
    ];

    if (includeItems && Array.isArray(statementView.itemRows) && statementView.itemRows.length > 0) {
      rows.push(
        [],
        ['FULL ITEM BREAKDOWN'],
        ['Vehicle Reg', 'Fleet No', 'Description', 'Unit Price', 'VAT', 'Total Incl'],
        ...statementView.itemRows.map((row) => [
          row.reg,
          row.fleetNumber,
          row.description,
          row.unitPrice,
          row.vatAmount,
          row.totalIncl,
        ]),
      );
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Statement');
    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  };

  const buildInvoiceWorkbook = (invoiceView) => {
    const rows = [
      ['TAX INVOICE'],
      [],
      ['Client', invoiceView.clientName],
      ['Account', invoiceView.accountNumber],
      ['Invoice Number', invoiceView.invoiceNumber],
      ['Invoice Date', invoiceView.invoiceDate],
      ['Company Reg', invoiceView.companyRegistrationNumber],
      ['Customer VAT Number', invoiceView.customerVatNumber],
      ['Address', invoiceView.clientAddress],
      [],
      ['Previous Reg', 'New Reg', 'Item Code', 'Description', 'Comments', 'Units', 'Unit Price', 'Vat', 'Vat%', 'Total Incl'],
      ...invoiceView.rows.map((row) => [
        row.previousReg,
        row.newReg,
        row.itemCode,
        row.description,
        row.comments,
        row.units,
        row.unitPrice,
        row.vatAmount,
        row.vatPercent,
        row.totalIncl,
      ]),
      [],
      ['Notes', invoiceView.notes],
      ['Total Ex. VAT', formatCurrency(invoiceView.totals.totalExVat)],
      ['Discount', formatCurrency(invoiceView.totals.discount)],
      ['VAT', formatCurrency(invoiceView.totals.totalVat)],
      ['Total Incl. VAT', formatCurrency(invoiceView.totals.totalInclVat)],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');
    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  };

  const getInvoicePeriodTab = (invoice) => {
    if (invoice?.isOutstandingSummary) {
      return 'outstanding';
    }
    const billingMonth = String(invoice?.billing_month || '').trim();
    if (invoice?.isDraft || billingMonth === currentBillingMonthKey) {
      return 'current';
    }
    return 'outstanding';
  };

  const currentOpenInvoicesForPayment = useMemo(
    () => openInvoicesForPayment.filter((invoice) => getInvoicePeriodTab(invoice) === 'current'),
    [openInvoicesForPayment, currentBillingMonthKey],
  );

  const outstandingOpenInvoicesForPayment = useMemo(
    () => openInvoicesForPayment.filter((invoice) => getInvoicePeriodTab(invoice) === 'outstanding'),
    [openInvoicesForPayment, currentBillingMonthKey],
  );

  const visibleOpenInvoicesForPayment = useMemo(
    () =>
      selectedPaymentTab === 'outstanding'
        ? outstandingOpenInvoicesForPayment
        : currentOpenInvoicesForPayment,
    [currentOpenInvoicesForPayment, outstandingOpenInvoicesForPayment, selectedPaymentTab],
  );

  const selectedPaymentInvoice = useMemo(() => {
    if (!selectedPaymentInvoiceId) return null;
    return (
      visibleOpenInvoicesForPayment.find(
        (invoice) => String(invoice?.id || '') === String(selectedPaymentInvoiceId),
      ) || null
    );
  }, [visibleOpenInvoicesForPayment, selectedPaymentInvoiceId]);

  const totalOpenInvoiceBalance = useMemo(
    () =>
      visibleOpenInvoicesForPayment.reduce(
        (sum, invoice) => sum + Number(invoice?.balance_due || 0),
        0,
      ),
    [visibleOpenInvoicesForPayment],
  );

  const getPaymentLimit = () => {
    if (paymentDetails?.type !== 'costCenter') {
      return Number(paymentDetails?.amount || 0);
    }

    if (selectedPaymentInvoice) {
      return Number(selectedPaymentInvoice.balance_due || 0);
    }

    return Number(paymentDetails?.amount || 0);
  };

  useEffect(() => {
    const activeInvoices =
      selectedPaymentTab === 'outstanding'
        ? outstandingOpenInvoicesForPayment
        : currentOpenInvoicesForPayment;

    if (activeInvoices.length === 0) {
      setSelectedPaymentInvoiceId(null);
      return;
    }

    const currentSelectionVisible = activeInvoices.some(
      (invoice) => String(invoice?.id || '') === String(selectedPaymentInvoiceId || ''),
    );

    if (!currentSelectionVisible) {
      setSelectedPaymentInvoiceId(activeInvoices[0]?.id || null);
    }
  }, [
    currentOpenInvoicesForPayment,
    outstandingOpenInvoicesForPayment,
    selectedPaymentInvoiceId,
    selectedPaymentTab,
  ]);

  const fetchOpenInvoicesForCostCenter = async (costCenter) => {
    const accountNumber = String(costCenter?.accountNumber || '').trim();
    if (!accountNumber) {
      setOpenInvoicesForPayment([]);
      setSelectedPaymentInvoiceId(null);
      return;
    }

    setLoadingOpenInvoices(true);
    try {
      const query = new URLSearchParams({ accountNumber });
      const [historyResponse, bulkInvoiceResponse] = await Promise.all([
        fetch(`/api/invoices/account/history?${query.toString()}`),
        fetch(
          `/api/invoices/bulk-account?accountNumber=${encodeURIComponent(accountNumber)}${
            costCenter?.billingMonth
              ? `&billingMonth=${encodeURIComponent(costCenter.billingMonth)}`
              : ''
          }`,
        ),
      ]);
      if (!historyResponse.ok) {
        throw new Error('Failed to fetch open invoices');
      }

      const payload = await historyResponse.json();
      const invoices = Array.isArray(payload?.invoices) ? payload.invoices : [];
      let openInvoices = invoices.filter(
        (invoice) =>
          Number(invoice?.balance_due || 0) > 0 &&
          String(invoice?.billing_month || '').trim() === currentBillingMonthKey,
      );
      if (bulkInvoiceResponse.ok) {
        const bulkPayload = await bulkInvoiceResponse.json();
        openInvoices = mergeOpenInvoices(openInvoices, bulkPayload?.invoice || null);
      }

      if (
        openInvoices.length === 0 &&
        Number(costCenter?.balanceDue ?? costCenter?.amountDue ?? 0) > 0
      ) {
        openInvoices.push({
          id: costCenter?.accountInvoiceId || costCenter?.account_invoice_id || `draft-${costCenter?.accountNumber || 'current'}`,
          account_number: costCenter?.accountNumber || null,
          billing_month: costCenter?.billingMonth || currentBillingMonthKey,
          invoice_number: costCenter?.reference || 'Current Billing Record',
          invoice_date:
            costCenter?.invoiceDate ||
            costCenter?.billingMonth ||
            currentBillingMonthKey,
          created_at: costCenter?.created_at || costCenter?.createdAt || null,
          total_amount: Number(costCenter?.amountDue || costCenter?.balanceDue || 0),
          paid_amount: Number(costCenter?.paidAmount || costCenter?.totalPaid || 0),
          balance_due: Number(costCenter?.balanceDue ?? costCenter?.amountDue ?? 0),
          payment_status: costCenter?.paymentStatus || 'pending',
          isDraft: true,
        });
      }

      const outstandingSummary = buildOutstandingInvoiceSummary(costCenter);
      if (outstandingSummary) {
        openInvoices.push(outstandingSummary);
      }

      const preferredInvoiceId =
        costCenter?.accountInvoiceId || costCenter?.account_invoice_id || null;
      const preferredInvoice =
        openInvoices.find(
          (invoice) => String(invoice?.id || '') === String(preferredInvoiceId || ''),
        ) || openInvoices[0] || null;

      setOpenInvoicesForPayment(openInvoices);
      setSelectedPaymentInvoiceId(preferredInvoice?.id || null);
    } catch (error) {
      console.error('Error fetching open invoices for payment modal:', error);
      setOpenInvoicesForPayment([]);
      setSelectedPaymentInvoiceId(null);
    } finally {
      setLoadingOpenInvoices(false);
    }
  };

  const buildFallbackOpenInvoice = (costCenter) => ({
    id: costCenter?.accountInvoiceId || costCenter?.account_invoice_id || `draft-${costCenter?.accountNumber || 'current'}`,
    account_number: costCenter?.accountNumber || null,
    billing_month: costCenter?.billingMonth || currentBillingMonthKey,
    invoice_number: costCenter?.reference || 'Current Billing Record',
    invoice_date:
      costCenter?.invoiceDate ||
      costCenter?.billingMonth ||
      currentBillingMonthKey,
    created_at: costCenter?.created_at || costCenter?.createdAt || null,
    total_amount: Number(costCenter?.amountDue || costCenter?.balanceDue || 0),
    paid_amount: Number(costCenter?.paidAmount || costCenter?.totalPaid || 0),
    balance_due: Number(costCenter?.balanceDue ?? costCenter?.amountDue ?? 0),
    payment_status: costCenter?.paymentStatus || 'pending',
    isDraft: true,
  });

  const isUuidLike = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || '').trim(),
    );

  const normalizeBulkInvoiceForSelection = (invoice) => {
    if (!invoice) return null;

    return {
      id:
        invoice.id ||
        `bulk-${invoice.account_number || 'current'}-${invoice.billing_month || currentBillingMonthKey}`,
      account_number: invoice.account_number || null,
      billing_month: invoice.billing_month || currentBillingMonthKey,
      invoice_number: invoice.invoice_number || 'Bulk Invoice',
      invoice_date: invoice.invoice_date || invoice.billing_month || currentBillingMonthKey,
      created_at: invoice.created_at || null,
      total_amount: Number(invoice.total_amount || 0),
      paid_amount: Number(invoice.paid_amount || 0),
      balance_due: Number(
        invoice.balance_due ??
          Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)),
      ),
      payment_status: invoice.payment_status || 'pending',
      isBulkInvoice: true,
    };
  };

  const mergeOpenInvoices = (historyInvoices = [], bulkInvoice = null) => {
    const merged = [...historyInvoices];
    const normalizedBulkInvoice = normalizeBulkInvoiceForSelection(bulkInvoice);

    if (
      normalizedBulkInvoice &&
      Number(normalizedBulkInvoice.balance_due || 0) > 0
    ) {
      const alreadyExists = merged.some((invoice) => {
        const sameId =
          String(invoice?.id || '').trim() === String(normalizedBulkInvoice.id || '').trim();
        const sameInvoiceNumber =
          String(invoice?.invoice_number || '').trim() &&
          String(invoice?.invoice_number || '').trim() ===
            String(normalizedBulkInvoice.invoice_number || '').trim();
        const sameBillingMonth =
          String(invoice?.billing_month || '').trim() ===
          String(normalizedBulkInvoice.billing_month || '').trim();

        return sameId || (sameInvoiceNumber && sameBillingMonth);
      });

      if (!alreadyExists) {
        merged.unshift(normalizedBulkInvoice);
      }
    }

    return merged;
  };

  const fetchBulkOpenInvoicesForCostCenter = async (costCenter) => {
    const accountNumber = String(costCenter?.accountNumber || '').trim();
    if (!accountNumber) {
      return [];
    }

    const query = new URLSearchParams({ accountNumber });
    const [historyResponse, bulkInvoiceResponse] = await Promise.all([
      fetch(`/api/invoices/account/history?${query.toString()}`),
      fetch(
        `/api/invoices/bulk-account?accountNumber=${encodeURIComponent(accountNumber)}${
          costCenter?.billingMonth
            ? `&billingMonth=${encodeURIComponent(costCenter.billingMonth)}`
            : ''
        }`,
      ),
    ]);
    if (!historyResponse.ok) {
      throw new Error('Failed to fetch open invoices');
    }

    const payload = await historyResponse.json();
    const invoices = Array.isArray(payload?.invoices) ? payload.invoices : [];
    let openInvoices = invoices.filter(
      (invoice) =>
        Number(invoice?.balance_due || 0) > 0 &&
        String(invoice?.billing_month || '').trim() === currentBillingMonthKey,
    );
    if (bulkInvoiceResponse.ok) {
      const bulkPayload = await bulkInvoiceResponse.json();
      openInvoices = mergeOpenInvoices(openInvoices, bulkPayload?.invoice || null);
    }

    if (
      openInvoices.length === 0 &&
      Number(costCenter?.balanceDue ?? costCenter?.amountDue ?? 0) > 0
    ) {
      openInvoices.push(buildFallbackOpenInvoice(costCenter));
    }

    const outstandingSummary = buildOutstandingInvoiceSummary(costCenter);
    if (outstandingSummary) {
      openInvoices.push(outstandingSummary);
    }

    return openInvoices;
  };

  const toggleBulkInvoiceDropdown = async (costCenter) => {
    const accountNumber = String(costCenter?.accountNumber || '').trim();
    if (!accountNumber) return;

    const current = bulkInvoiceSelections[accountNumber];
    const alreadyLoaded = Array.isArray(current?.invoices);

    setBulkInvoiceSelections((prev) => ({
      ...prev,
      [accountNumber]: {
        ...prev[accountNumber],
        expanded: !prev[accountNumber]?.expanded,
      },
    }));

    if (alreadyLoaded || current?.loading) {
      return;
    }

    setBulkInvoiceSelections((prev) => ({
      ...prev,
      [accountNumber]: {
        ...prev[accountNumber],
        expanded: true,
        loading: true,
        invoices: prev[accountNumber]?.invoices || [],
        allocations: prev[accountNumber]?.allocations || {},
      },
    }));

    try {
      const openInvoices = await fetchBulkOpenInvoicesForCostCenter(costCenter);
      setBulkInvoiceSelections((prev) => ({
        ...prev,
        [accountNumber]: {
          ...prev[accountNumber],
          expanded: true,
          loading: false,
          invoices: openInvoices,
          allocations:
            prev[accountNumber]?.allocations ||
            Object.fromEntries(
              openInvoices.map((invoice) => [
                String(invoice.id),
                {
                  selected: false,
                  amount: '',
                  paymentReference: '',
                },
              ]),
            ),
        },
      }));
    } catch (error) {
      console.error(`Error fetching bulk invoices for ${accountNumber}:`, error);
      setBulkInvoiceSelections((prev) => ({
        ...prev,
        [accountNumber]: {
          ...prev[accountNumber],
          expanded: true,
          loading: false,
          invoices: [],
          allocations: prev[accountNumber]?.allocations || {},
        },
      }));
    }
  };

  const handleBulkInvoiceAllocationChange = (accountNumber, invoiceId, field, value) => {
    setBulkInvoiceSelections((prev) => ({
      ...prev,
      [accountNumber]: {
        ...prev[accountNumber],
        allocations: {
          ...(prev[accountNumber]?.allocations || {}),
          [invoiceId]: {
            ...((prev[accountNumber]?.allocations || {})[invoiceId] || {
              selected: false,
              amount: '',
              paymentReference: '',
            }),
            [field]: value,
          },
        },
      },
    }));
  };

  const getBulkSelectedAllocations = () => {
    return selectedCostCenters
      .filter((costCenter) => costCenter.selected)
      .flatMap((costCenter) => {
        const accountNumber = String(costCenter?.accountNumber || '').trim();
        const state = bulkInvoiceSelections[accountNumber];
        const invoices = Array.isArray(state?.invoices) ? state.invoices : [];
        const allocations = state?.allocations || {};

        return invoices
          .map((invoice) => {
            const allocation = allocations[String(invoice.id)] || {};
            const amount = Number(String(allocation.amount || '').replace(/,/g, ''));
            return {
              accountNumber,
              accountInvoiceId:
                isUuidLike(invoice.id) &&
                !invoice?.isBulkInvoice &&
                !invoice?.isOutstandingSummary
                  ? invoice.id
                  : null,
              billingMonth: invoice.billing_month || null,
              invoiceNumber: invoice.invoice_number || null,
              maxAmount: Number(invoice.balance_due || 0),
              amount,
              paymentReference: String(allocation.paymentReference || '').trim(),
              selected: Boolean(allocation.selected),
              paymentPeriodType: invoice?.isOutstandingSummary ? 'outstanding' : 'current',
            };
          })
          .filter((entry) => entry.selected && Number.isFinite(entry.amount) && entry.amount > 0);
      });
  };

  const totalBulkAllocatedAmount = useMemo(
    () =>
      getBulkSelectedAllocations().reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [selectedCostCenters, bulkInvoiceSelections],
  );

  const handlePayCostCenter = async (costCenter) => {
    setSelectedPaymentTab('current');
    setPaymentDetails({
      type: 'costCenter',
      title: `Pay Cost Center: ${costCenter.accountName || costCenter.accountNumber}`,
      amount: getOutstandingAmount(costCenter),
      description: `Amount owed for ${costCenter.accountName || costCenter.accountNumber} (${costCenter.accountNumber})`,
      costCenter: costCenter
    });
    setEnteredAmount('');
    setPaymentReference('');
    setOpenInvoicesForPayment([]);
    setSelectedPaymentInvoiceId(null);
    setShowPaymentModal(true);
    await fetchOpenInvoicesForCostCenter(costCenter);
  };

  const handlePayAllCostCenters = () => {
    const outstandingCostCenters = costCentersWithPayments.filter(
      (cc) => getOutstandingAmount(cc) > 0 || getOutstandingBucketAmount(cc) > 0,
    );
    
    if (outstandingCostCenters.length === 0) {
      toast({
        variant: "destructive",
        title: "No Outstanding Amounts",
        description: "All cost centers are already paid up to date."
      });
      return;
    }

    // Initialize selected cost centers with all outstanding ones
    setSelectedCostCenters(outstandingCostCenters.map(cc => ({
      ...cc,
      selected: true
    })));
    setBulkInvoiceSelections({});
    setPayAllReference('');
    setSelectedBulkPaymentTab('current');
    
    setShowPayAllModal(true);
  };

  const handleCostCenterSelection = (accountNumber, selected) => {
    setSelectedCostCenters(prev => prev.map(cc => 
      
      cc.accountNumber === accountNumber 
        ? { ...cc, selected }
        : cc
    ));
    
  };

  const handlePayAllSubmit = async () => {
    const selectedAllocations = getBulkSelectedAllocations();

    if (selectedAllocations.length === 0) {
      toast({
        variant: "destructive",
        title: "No Invoice Allocations",
        description: "Please select at least one invoice and enter an allocation amount."
      });
      return;
    }

    const selectedCostCentersToPay = selectedCostCenters.filter(cc => cc.selected);
    
    if (selectedCostCentersToPay.length === 0) {
      toast({
        variant: "destructive",
        title: "No Cost Centers Selected",
        description: "Please select at least one cost center to pay."
      });
      return;
    }

    setProcessingPayment(true);
    
    try {
      const response = await fetch('/api/payments/bulk-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payments: selectedAllocations.map((allocation) => ({
            accountNumber: allocation.accountNumber,
            accountInvoiceId: allocation.accountInvoiceId,
            billingMonth: allocation.billingMonth,
            amount: allocation.amount,
            paymentReference: allocation.paymentReference,
            paymentPeriodType: allocation.paymentPeriodType || selectedBulkPaymentTab,
          })),
          paymentReference: payAllReference.trim() || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk payment failed');
      }

      const result = await response.json();
      const successCount = result.summary.successful;
      const errors = result.errors || [];
      const totalCreditApplied = Array.isArray(result.results)
        ? result.results.reduce((sum, entry) => sum + Number(entry?.creditAmount || 0), 0)
        : 0;

      await refreshVisibleClientData();

        toast({
          title: successCount === selectedCostCentersToPay.length ? "Bulk Payment Successful" : "Bulk Payment Completed",
          description:
            errors.length > 0
            ? `${successCount} allocation(s) processed. ${errors.length} failed. ${errors[0]}${totalCreditApplied > 0 ? ` Credit created: ${formatCurrency(totalCreditApplied)}.` : ''}`
            : `${successCount} allocation(s) processed successfully.${totalCreditApplied > 0 ? ` Credit created: ${formatCurrency(totalCreditApplied)}.` : ''}`,
        });
      closePayAllModal();
    } catch (error) {
      console.error('Bulk payment error:', error);
      toast({
        variant: "destructive",
        title: "Bulk Payment Error",
        description: error instanceof Error ? error.message : "Failed to process bulk payment.",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle Due for All Cost Centers
  const _unusedHandleDueForAllCostCenters = async () => {
    try {
      // Create a new window with the comprehensive due report
      const printWindow = window.open('', '_blank');
      
      // Calculate totals for all cost centers
      const totalOutstanding = costCentersWithPayments.reduce((sum, cc) => sum + getOutstandingAmount(cc), 0);
      const totalMonthly = costCentersWithPayments.reduce((sum, cc) => sum + (cc.monthlyAmount || 0), 0);
      const totalPaid = costCentersWithPayments.reduce((sum, cc) => sum + (cc.totalPaid || 0), 0);
      
      // Create the print HTML with proper styling
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Due Report - All Cost Centers - ${clientLegalName}</title>
            <style>
              @media print {
                @page {
                  size: A4;
                  margin: 20mm;
                }
              }
              
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background: white;
              }
              
              .company-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding-bottom: 20px;
                border-bottom: 2px solid #3b82f6;
                margin-bottom: 30px;
              }
              
              .company-info {
                display: flex;
                align-items: flex-start;
                gap: 20px;
              }
              
              .company-logo {
                width: 120px;
                height: 120px;
              }
              
              .company-details h2 {
                color: #3b82f6;
                font-size: 24px;
                margin: 0 0 10px 0;
              }
              
              .company-details p {
                margin: 5px 0;
                color: #6b7280;
              }
              
              .statement-header {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #d1d5db;
                margin-bottom: 20px;
              }
              
              .statement-header h3 {
                margin: 0 0 15px 0;
                color: #374151;
              }
              
              .client-info {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #d1d5db;
                margin-bottom: 20px;
              }
              
              .client-info h3 {
                margin: 0 0 15px 0;
                color: #374151;
              }
              
              .client-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
              }
              
              .client-grid label {
                font-weight: 600;
                color: #374151;
                font-size: 12px;
                text-transform: uppercase;
              }
              
              .client-grid p {
                margin: 5px 0;
                color: #111827;
                font-weight: 600;
              }
              
              .table-section h3 {
                margin: 0 0 15px 0;
                color: #374151;
              }
              
              .due-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
              }
              
              .due-table th {
                background: #f3f4f6;
                padding: 12px;
                text-align: left;
                border: 1px solid #d1d5db;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
              }
              
              .due-table td {
                padding: 12px;
                border: 1px solid #d1d5db;
                font-size: 12px;
              }
              
              .due-table tr:nth-child(even) {
                background: #f9fafb;
              }
              
              .total-outstanding {
                background: #fef3c7;
                padding: 20px;
                border: 2px solid #f59e0b;
                border-radius: 8px;
                margin-bottom: 30px;
                text-align: center;
              }
              
              .total-outstanding h3 {
                margin: 0 0 15px 0;
                color: #92400e;
              }
              
              .total-outstanding p {
                margin: 0;
                font-size: 24px;
                font-weight: bold;
                color: #92400e;
              }
              
              .summary-section {
                background: #f8fafc;
                padding: 30px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                margin-bottom: 30px;
              }
              
              .summary-section h3 {
                margin: 0 0 20px 0;
                color: #374151;
                text-align: center;
              }
              
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
              }
              
              .summary-box {
                text-align: center;
                padding: 20px;
                border-radius: 8px;
                color: white;
              }
              
              .summary-box.red {
                background: #ef4444;
              }
              
              .summary-box.green {
                background: #22c55e;
              }
              
              .summary-box.blue {
                background: #3b82f6;
              }
              
              .summary-box label {
                display: block;
                margin-bottom: 10px;
                font-size: 14px;
                font-weight: 600;
              }
              
              .summary-box p {
                margin: 0;
                font-size: 20px;
                font-weight: bold;
              }
              
              .footer {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                padding-top: 30px;
                border-top: 1px solid #d1d5db;
                margin-top: 30px;
              }
              
              .footer h4 {
                margin: 0 0 10px 0;
                color: #374151;
                font-size: 14px;
              }
              
              .footer p {
                margin: 5px 0;
                color: #6b7280;
                font-size: 12px;
              }
              
              @media print {
                .download-btn {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="company-header">
              <div class="company-info">
                <img src="/soltrack_logo.png" alt="Soltrack Logo" class="company-logo" />
                <div class="company-details">
                  <h2>Soltrack (PTY) LTD</h2>
                  <p>VEHICLE BUREAU SERVICE</p>
                  <p>Reg No: 2018/095975/07</p>
                  <p>VAT No: 4580161802</p>
                </div>
              </div>
              <div class="statement-header">
                <h3>COMPREHENSIVE DUE REPORT: ${clientLegalName}</h3>
                <p>Date: ${new Date().toLocaleDateString()}</p>
                <p>Total Cost Centers: ${costCentersWithPayments.length}</p>
              </div>
            </div>
            
            <div class="client-info">
              <h3>Client Information</h3>
              <div class="client-grid">
                <div>
                  <label>Client Name:</label>
                  <p>${clientLegalName}</p>
                </div>
                <div>
                  <label>Report Date:</label>
                  <p>${new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <label>Total Cost Centers:</label>
                  <p>${costCentersWithPayments.length}</p>
                </div>
                <div>
                  <label>Total Vehicles:</label>
                  <p>${costCentersWithPayments.reduce((sum, cc) => sum + cc.vehicleCount, 0)}</p>
                </div>
              </div>
            </div>
            
            <div class="table-section">
              <h3>All Cost Centers Due Report</h3>
              <table class="due-table">
                <thead>
                  <tr>
                    <th>Account Name</th>
                    <th>Account Number</th>
                    <th>Monthly Amount</th>
                    <th>Amount Due</th>
                    <th>First Month</th>
                    <th>Overdue</th>
                    <th>Vehicles</th>
                    <th>Total Paid</th>
                  </tr>
                </thead>
                <tbody>
                  ${costCentersWithPayments.map((costCenter, index) => `
                    <tr>
                      <td>${costCenter.accountName || 'N/A'}</td>
                      <td>${costCenter.accountNumber}</td>
                      <td>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(costCenter.monthlyAmount)}</td>
                      <td>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(getOutstandingAmount(costCenter))}</td>
                      <td>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(costCenter.firstMonth || 0)}</td>
                      <td>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(costCenter.overdue || 0)}</td>
                      <td>${costCenter.vehicleCount}</td>
                      <td>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(costCenter.totalPaid || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="total-outstanding">
              <h3>Total Outstanding for All Cost Centers</h3>
              <p>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalOutstanding)}</p>
            </div>
            
            <div class="summary-section">
              <h3>Financial Summary</h3>
              <div class="summary-grid">
                <div class="summary-box red">
                  <label>Total Amount Due</label>
                  <p>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalOutstanding)}</p>
                </div>
                <div class="summary-box green">
                  <label>Total Paid</label>
                  <p>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalPaid)}</p>
                </div>
                <div class="summary-box blue">
                  <label>Total Monthly</label>
                  <p>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalMonthly)}</p>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div>
                <h4>Head Office:</h4>
                <p>8 Viscount Road</p>
                <p>Viscount office park, Block C unit 4 & 5</p>
                <p>Bedfordview, 2008</p>
              </div>
              <div>
                <h4>Postal Address:</h4>
                <p>P.O Box 95603</p>
                <p>Grant Park 2051</p>
              </div>
              <div>
                <h4>Contact Details:</h4>
                <p>Phone: 011 824 0066</p>
                <p>Email: sales@soltrack.co.za</p>
                <p>Website: www.soltrack.co.za</p>
              </div>
              <div>
                <h4>Soltrack (PTY) LTD:</h4>
                <p>Nedbank Northrand</p>
                <p>Code - 146905</p>
                <p>A/C No. - 1469109069</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      // Write the HTML to the new window
      printWindow.document.write(printHTML);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = function() {
        printWindow.print();
        // Close the window after printing
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      };
      
    } catch (error) {
      console.error('Error generating due report for all cost centers:', error);
      toast({
        variant: "destructive",
        title: "Report Generation Failed",
        description: "Failed to generate due report for all cost centers. Please try again.",
      });
    }
  };

  // Handle Due for All Cost Centers
  const handleDueForAllCostCenters = async () => {
    try {
      // Create a new window with the comprehensive due report
      const printWindow = window.open('', '_blank');
      
      // Calculate totals for all cost centers
      const totalOutstanding = costCentersWithPayments.reduce((sum, cc) => sum + getOutstandingAmount(cc), 0);
      const totalMonthly = costCentersWithPayments.reduce((sum, cc) => sum + (cc.monthlyAmount || 0), 0);
      const totalPaid = costCentersWithPayments.reduce((sum, cc) => sum + (cc.totalPaid || 0), 0);
      
      // Create the print HTML with proper styling
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Due Report - All Cost Centers - ${clientLegalName}</title>
            <style>
              @media print {
                @page {
                  size: A4;
                  margin: 20mm;
                }
              }
              
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background: white;
              }
              
              .company-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding-bottom: 20px;
                border-bottom: 2px solid #3b82f6;
                margin-bottom: 30px;
              }
              
              .company-info {
                display: flex;
                align-items: flex-start;
                gap: 20px;
              }
              
              .company-logo {
                width: 120px;
                height: 120px;
              }
              
              .company-details h2 {
                color: #3b82f6;
                font-size: 24px;
                margin: 0 0 10px 0;
              }
              
              .company-details p {
                margin: 5px 0;
                color: #6b7280;
              }
              
              .statement-header {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #d1d5db;
                margin-bottom: 20px;
              }
              
              .statement-header h3 {
                margin: 0 0 15px 0;
                color: #374151;
              }
              
              .client-info {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #d1d5db;
                margin-bottom: 20px;
              }
              
              .client-info h3 {
                margin: 0 0 15px 0;
                color: #374151;
              }
              
              .client-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
              }
              
              .client-grid label {
                font-weight: 600;
                color: #374151;
                font-size: 12px;
                text-transform: uppercase;
              }
              
              .client-grid p {
                margin: 5px 0;
                color: #111827;
                font-weight: 600;
              }
              
              .table-section h3 {
                margin: 0 0 15px 0;
                color: #374151;
              }
              
              .due-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
              }
              
              .due-table th {
                background: #f3f4f6;
                padding: 12px;
                text-align: left;
                border: 1px solid #d1d5db;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
              }
              
              .due-table td {
                padding: 12px;
                border: 1px solid #d1d5db;
                font-size: 12px;
              }
              
              .due-table tr:nth-child(even) {
                background: #f9fafb;
              }
              
              .total-outstanding {
                background: #fef3c7;
                padding: 20px;
                border: 2px solid #f59e0b;
                border-radius: 8px;
                margin-bottom: 30px;
                text-align: center;
              }
              
              .total-outstanding h3 {
                margin: 0 0 15px 0;
                color: #92400e;
              }
              
              .total-outstanding p {
                margin: 0;
                font-size: 24px;
                font-weight: bold;
                color: #92400e;
              }
              
              .summary-section {
                background: #f8fafc;
                padding: 30px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                margin-bottom: 30px;
              }
              
              .summary-section h3 {
                margin: 0 0 20px 0;
                color: #374151;
                text-align: center;
              }
              
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
              }
              
              .summary-box {
                text-align: center;
                padding: 20px;
                border-radius: 8px;
                color: white;
              }
              
              .summary-box.red {
                background: #ef4444;
              }
              
              .summary-box.green {
                background: #22c55e;
              }
              
              .summary-box.blue {
                background: #3b82f6;
              }
              
              .summary-box label {
                display: block;
                margin-bottom: 10px;
                font-size: 14px;
                font-weight: 600;
              }
              
              .summary-box p {
                margin: 0;
                font-size: 20px;
                font-weight: bold;
              }
              
              .footer {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
                padding-top: 30px;
                border-top: 1px solid #d1d5db;
                margin-top: 30px;
              }
              
              .footer h4 {
                margin: 0 0 10px 0;
                color: #374151;
                font-size: 14px;
              }
              
              .footer p {
                margin: 5px 0;
                color: #6b7280;
                font-size: 12px;
              }
              
              @media print {
                .download-btn {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="company-header">
              <div class="company-info">
                <img src="/soltrack_logo.png" alt="Soltrack Logo" class="company-logo" />
                <div class="company-details">
                  <h2>Soltrack (PTY) LTD</h2>
                  <p>VEHICLE BUREAU SERVICE</p>
                  <p>Reg No: 2018/095975/07</p>
                  <p>VAT No: 4580161802</p>
                </div>
              </div>
              <div class="statement-header">
                <h3>COMPREHENSIVE DUE REPORT: ${clientLegalName}</h3>
                <p>Date: ${new Date().toLocaleDateString()}</p>
                <p>Total Cost Centers: ${costCentersWithPayments.length}</p>
              </div>
            </div>
            
            <div class="client-info">
              <h3>Client Information</h3>
              <div class="client-grid">
                <div>
                  <label>Client Name:</label>
                  <p>${clientLegalName}</p>
                </div>
                <div>
                  <label>Report Date:</label>
                  <p>${new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <label>Total Cost Centers:</label>
                  <p>${costCentersWithPayments.length}</p>
                </div>
                <div>
                  <label>Total Vehicles:</label>
                  <p>${costCentersWithPayments.reduce((sum, cc) => sum + cc.vehicleCount, 0)}</p>
                </div>
              </div>
            </div>
            
            <div class="table-section">
              <h3>All Cost Centers Due Report</h3>
              <table class="due-table">
                <thead>
                  <tr>
                    <th>Account Name</th>
                    <th>Account Number</th>
                    <th>Monthly Amount</th>
                    <th>Amount Due</th>
                    <th>First Month</th>
                    <th>Overdue</th>
                    <th>Vehicles</th>
                    <th>Total Paid</th>
                  </tr>
                </thead>
                <tbody>
                  ${costCentersWithPayments.map((costCenter, index) => `
                    <tr>
                      <td>${costCenter.accountName || 'N/A'}</td>
                      <td>${costCenter.accountNumber}</td>
                      <td>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(costCenter.monthlyAmount)}</td>
                      <td>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(getOutstandingAmount(costCenter))}</td>
                      <td>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(costCenter.firstMonth || 0)}</td>
                      <td>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(costCenter.overdue || 0)}</td>
                      <td>${costCenter.vehicleCount}</td>
                      <td>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(costCenter.totalPaid || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="total-outstanding">
              <h3>Total Outstanding for All Cost Centers</h3>
              <p>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalOutstanding)}</p>
            </div>
            
            <div class="summary-section">
              <h3>Financial Summary</h3>
              <div class="summary-grid">
                <div class="summary-box red">
                  <label>Total Amount Due</label>
                  <p>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalOutstanding)}</p>
                </div>
                <div class="summary-box green">
                  <label>Total Paid</label>
                  <p>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalPaid)}</p>
                </div>
                <div class="summary-box blue">
                  <label>Total Monthly</label>
                  <p>${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(totalMonthly)}</p>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div>
                <h4>Head Office:</h4>
                <p>8 Viscount Road</p>
                <p>Viscount office park, Block C unit 4 & 5</p>
                <p>Bedfordview, 2008</p>
              </div>
              <div>
                <h4>Postal Address:</h4>
                <p>P.O Box 95603</p>
                <p>Grant Park 2051</p>
              </div>
              <div>
                <h4>Contact Details:</h4>
                <p>Phone: 011 824 0066</p>
                <p>Email: sales@soltrack.co.za</p>
                <p>Website: www.soltrack.co.za</p>
              </div>
              <div>
                <h4>Soltrack (PTY) LTD:</h4>
                <p>Nedbank Northrand</p>
                <p>Code - 146905</p>
                <p>A/C No. - 1469109069</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      // Write the HTML to the new window
      printWindow.document.write(printHTML);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = function() {
        printWindow.print();
        // Close the window after printing
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      };
      
    } catch (error) {
      console.error('Error generating due report for all cost centers:', error);
      toast({
        variant: "destructive",
        title: "Report Generation Failed",
        description: "Failed to generate due report for all cost centers. Please try again.",
      });
    }
  };

  const handleConfirmPayment = async () => {
    const amount = getNumericAmount();
    
    // Validate payment amount
    if (amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid payment amount greater than 0."
      });
      return;
    }

    if (paymentDetails.type === 'costCenter') {
      setProcessingPayment(true);
      try {
        const selectedInvoiceId =
          (isUuidLike(selectedPaymentInvoice?.id) && !selectedPaymentInvoice?.isBulkInvoice
            ? selectedPaymentInvoice?.id
            : null) ||
          paymentDetails.costCenter.accountInvoiceId ||
          paymentDetails.costCenter.account_invoice_id ||
          null;
        const selectedBillingMonth =
          selectedPaymentInvoice?.billing_month ||
          paymentDetails.costCenter.billingMonth ||
          null;

        // Process payment through API using payments_ table
        const response = await fetch('/api/payments/process-payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountNumber: paymentDetails.costCenter.accountNumber,
            accountInvoiceId: selectedInvoiceId,
            billingMonth: selectedBillingMonth,
            amount: amount,
            paymentReference: paymentReference || `Payment for ${paymentDetails.costCenter.accountNumber}`,
            paymentType: 'cost_center_payment',
            paymentPeriodType: selectedPaymentInvoice?.isOutstandingSummary
              ? 'outstanding'
              : selectedPaymentTab,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Payment processing failed');
        }

        const result = await response.json();
        
        if (result.success) {
          const newBalanceDue = result.payment.balance_due;
          const paymentStatus = result.payment.payment_status;
          const creditAmount = Number(result.creditAmount || 0);
          const message = newBalanceDue === 0 
            ? `Payment of ${formatCurrency(amount)} processed successfully! Balance due is now R 0.00. Status: ${paymentStatus}${creditAmount > 0 ? `. Credit created: ${formatCurrency(creditAmount)}` : ''}`
            : `Payment of ${formatCurrency(amount)} processed successfully! New balance due: ${formatCurrency(newBalanceDue)}. Status: ${paymentStatus}${creditAmount > 0 ? `. Credit created: ${formatCurrency(creditAmount)}` : ''}`;
          
          toast({
            title: "Payment Successful",
            description: message,
          });
          
          // Refresh client data to show updated amounts
          await refreshVisibleClientData();
        } else {
          toast({
            variant: "destructive",
            title: "Payment Failed",
            description: result.error || 'Payment processing failed'
          });
        }
      } catch (error) {
        console.error('Payment error:', error);
        toast({
          variant: "destructive",
          title: "Payment Error",
          description: "Failed to process payment. Please try again."
        });
      } finally {
        setProcessingPayment(false);
      }
    } else if (paymentDetails.type === 'allCostCenters') {
      setProcessingPayment(true);
      try {
        // Process payments for all cost centers
        const costCentersToPay = costCentersWithPayments.filter(cc => cc.balanceDue > 0);
        let successCount = 0;
        let totalProcessed = 0;

        for (const costCenter of costCentersToPay) {
          try {
            const response = await fetch('/api/payments/process-payments', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                accountNumber: costCenter.accountNumber,
                accountInvoiceId: costCenter.accountInvoiceId || costCenter.account_invoice_id || null,
                billingMonth: costCenter.billingMonth || null,
                amount: Math.min(amount - totalProcessed, costCenter.balanceDue),
                paymentReference: paymentReference.trim() || `Bulk payment for ${costCenter.accountNumber}`,
                paymentType: 'cost_center_payment'
              }),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success) {
                successCount++;
                totalProcessed += Math.min(amount - totalProcessed, getOutstandingAmount(costCenter));
              }
            }
          } catch (error) {
            console.error(`Error processing payment for ${costCenter.accountNumber}:`, error);
          }
        }

        if (successCount > 0) {
          const message = successCount === costCentersToPay.length
            ? `Successfully processed payments for all ${successCount} cost centers! Total amount: ${formatCurrency(amount)}`
            : `Successfully processed payments for ${successCount} out of ${costCentersToPay.length} cost centers. Total amount: ${formatCurrency(amount)}`;
          
          toast({
            title: "Pay All Successful",
            description: message,
          });
          
          // Refresh client data to show updated amounts
          await refreshVisibleClientData();
        } else {
          toast({
            variant: "destructive",
            title: "Pay All Failed",
            description: "Failed to process payments for any cost centers. Please try again."
          });
        }
      } catch (error) {
        console.error('Pay All error:', error);
        toast({
          variant: "destructive",
          title: "Pay All Error",
          description: "Failed to process payments. Please try again."
        });
      } finally {
        setProcessingPayment(false);
      }
    }
    
    setShowPaymentModal(false);
    setPaymentDetails(null);
    setEnteredAmount('');
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentDetails(null);
    setEnteredAmount('');
    setPaymentReference('');
    setProcessingPayment(false);
    setOpenInvoicesForPayment([]);
    setLoadingOpenInvoices(false);
    setSelectedPaymentInvoiceId(null);
    setSelectedPaymentTab('current');
  };

  const closePayAllModal = () => {
    setShowPayAllModal(false);
    setSelectedCostCenters([]);
    setPayAllReference('');
    setProcessingPayment(false);
    setBulkInvoiceSelections({});
    setSelectedBulkPaymentTab('current');
  };

  // Effect to fetch payments data when cost centers change
  useEffect(() => {
    console.log('useEffect triggered for filteredCostCenters:', filteredCostCenters.length);
    if (filteredCostCenters.length > 0) {
      console.log('Processing filtered cost centers...');
      const costCenters = groupByCostCenter(filteredCostCenters);
      console.log('Grouped cost centers:', costCenters.length);
      if (clientData?.searchMethod === 'payments_table_focus' || clientData?.searchMethod === 'payments_table_focus_api' || clientData?.searchMethod === 'cost_centers_with_payments') {
        expandSpecialCostCenters(costCenters).then(setCostCentersWithPayments);
      } else {
        fetchPaymentsForCostCenters(costCenters).then(result => {
          console.log('Final cost centers with payments:', result.length);
          expandSpecialCostCenters(result).then(setCostCentersWithPayments);
        });
      }
    } else {
      console.log('No filtered cost centers to process');
      setCostCentersWithPayments([]);
    }
  }, [filteredCostCenters]);

  // Show Due Report Component (replaces PDF generation)
  const handleShowDueReport = async (costCenter, variant = 'summary') => {
    try {
      setGeneratingReport(prev => ({ ...prev, [costCenter.accountNumber]: true }));
      const query = new URLSearchParams({
        accountNumber: costCenter.accountNumber,
      });
      if (costCenter.billingMonth) {
        query.set('billingMonth', costCenter.billingMonth);
      }
      const response = await fetch(`/api/payments/by-account?${query.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }
      
      const paymentData = await response.json();
      const payment = paymentData.payment || {};
      const historyResponse = await fetch(
        `/api/invoices/account/history?accountNumber=${encodeURIComponent(costCenter.accountNumber)}`,
      );
      const bulkInvoiceResponse = await fetch(
        `/api/invoices/bulk-account?accountNumber=${encodeURIComponent(costCenter.accountNumber)}${
          costCenter.billingMonth ? `&billingMonth=${encodeURIComponent(costCenter.billingMonth)}` : ""
        }`,
      );
      let invoiceHistory = [];
      let paymentHistory = [];
      let bulkInvoice = null;
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        invoiceHistory = Array.isArray(historyData?.invoices) ? historyData.invoices : [];
        paymentHistory = Array.isArray(historyData?.payments) ? historyData.payments : [];
      }
      if (bulkInvoiceResponse.ok) {
        const bulkInvoiceData = await bulkInvoiceResponse.json();
        bulkInvoice = bulkInvoiceData?.invoice || null;
      }
      let invoiceData = null;
      const invoiceQuery = new URLSearchParams({
        accountNumber: costCenter.accountNumber,
      });
      if (costCenter.sourceAccountNumber) {
        invoiceQuery.set('sourceAccountNumber', costCenter.sourceAccountNumber);
      }
      if (costCenter.invoiceGroup) {
        invoiceQuery.set('billingGroup', costCenter.invoiceGroup);
      }
      if (costCenter.billingMonth) {
        invoiceQuery.set('billingMonth', costCenter.billingMonth);
      }

      const invoiceResponse = await fetch(`/api/vehicles/invoice?${invoiceQuery.toString()}`);
      if (invoiceResponse.ok) {
        const invoicePayload = await invoiceResponse.json();
        invoiceData = invoicePayload?.invoiceData || null;
      }
      
      setSelectedCostCenterForReport({
        ...costCenter,
        paymentData: payment,
        invoiceData: invoiceData || costCenter.invoiceData || null,
        invoiceHistory,
        paymentHistory,
        bulkInvoice,
      });
      setSelectedStatementVariant(variant);
      setShowDueReport(true);
      
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast({
        variant: "destructive",
        title: "Report Generation Failed",
        description: "Failed to fetch payment data. Please try again.",
      });
    } finally {
      setGeneratingReport(prev => ({ ...prev, [costCenter.accountNumber]: false }));
    }
  };

  // Generate Invoice PDF
  const handleGenerateInvoice = async (costCenter) => {
    try {
      setGeneratingReport(prev => ({ ...prev, [costCenter.accountNumber]: true }));
      
      // Fetch vehicle invoices data
      const response = await fetch(`/api/vehicle-invoices-fetch/by-account?accountNumber=${costCenter.accountNumber}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vehicle invoices data');
      }
      
      const data = await response.json();
      const vehicleInvoices = data.vehicleInvoices || [];
      
      if (vehicleInvoices.length === 0) {
        toast({
          title: "No Data",
          description: "No vehicle invoices found for this account.",
        });
        return;
      }
      
      // Generate PDF
      const doc = new jsPDF('landscape'); // Use landscape for wider table
      
      // Header
      doc.setFontSize(20);
      doc.text('Soltrack (PTY) LTD', 20, 20);
      doc.setFontSize(12);
      doc.text('VEHICLE BUREAU SERVICE', 20, 30);
      doc.text(`Reg No: 2018/095975/07`, 20, 40);
      doc.text(`VAT No: 4580161802`, 20, 50);
      
      // Invoice Title
      doc.setFontSize(16);
      doc.text(`INVOICE - ${costCenter.accountNumber}`, 20, 70);
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 80);
      doc.text(`Client: ${clientLegalName}`, 20, 90);
      
      // Calculate totals for summary
      let totalExVat = 0;
      let totalVat = 0;
      let totalInclVat = 0;
      
      vehicleInvoices.forEach((invoice) => {
        const exVat = parseFloat(invoice.unit_price_without_vat) || 0;
        const vat = parseFloat(invoice.vat_amount) || 0;
        const inclVat = parseFloat(invoice.total_including_vat) || 0;
        
        totalExVat += exVat;
        totalVat += vat;
        totalInclVat += inclVat;
      });
      
      // Summary section
      const summaryY = 105;
      doc.setFontSize(12);
      doc.text('SUMMARY', 20, summaryY);
      
      // Summary mini table
      const summaryTableY = summaryY + 8;
      const summaryColWidths = [60, 40, 40, 40];
      const summaryHeaders = ['Description', 'Amount (Ex VAT)', 'VAT', 'Total (Incl VAT)'];
      
      // Draw summary table header
      doc.setFillColor(240, 240, 240);
      doc.rect(20, summaryTableY - 5, 180, 8, 'F');
      doc.setFontSize(8);
      
      let summaryXPos = 20;
      summaryHeaders.forEach((header, index) => {
        doc.text(header, summaryXPos + 2, summaryTableY);
        summaryXPos += summaryColWidths[index];
      });
      
      // Draw summary table data
      const summaryDataY = summaryTableY + 10;
      doc.setFillColor(255, 255, 255);
      doc.rect(20, summaryDataY - 5, 180, 8, 'F');
      doc.setFontSize(8);
      
      summaryXPos = 20;
      const summaryData = [
        'MONTHLY SERVICE SUBSCRIPTION',
        `R ${totalExVat.toFixed(2)}`,
        `R ${totalVat.toFixed(2)}`,
        `R ${totalInclVat.toFixed(2)}`
      ];
      
      summaryData.forEach((data, index) => {
        doc.text(data, summaryXPos + 2, summaryDataY);
        summaryXPos += summaryColWidths[index];
      });
      
      // Table headers - matching the image exactly
      const headers = ['Previous Reg', 'New Reg', 'Item Code', 'Description', 'Comments', 'Units', 'Unit Price', 'Vat', 'Vat%', 'Total Incl'];
      const startY = summaryDataY + 20;
      let currentY = startY;
      
      // Column widths for landscape mode
      const colWidths = [25, 35, 30, 35, 40, 15, 25, 20, 20, 25];
      
      // Draw table headers
      doc.setFillColor(240, 240, 240);
      doc.rect(20, currentY - 5, 280, 8, 'F');
      doc.setFontSize(8);
      
      let xPos = 20;
      headers.forEach((header, index) => {
        doc.text(header, xPos + 2, currentY);
        xPos += colWidths[index];
      });
      
      currentY += 10;
      
      // Draw table rows
      vehicleInvoices.forEach((invoice, index) => {
        if (currentY > 180) {
          doc.addPage('landscape');
          currentY = 20;
        }
        
        const exVat = parseFloat(invoice.unit_price_without_vat) || 0;
        const vat = parseFloat(invoice.vat_amount) || 0;
        const inclVat = parseFloat(invoice.total_including_vat) || 0;
        
        // Row background - alternating colors
        doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 248);
        doc.rect(20, currentY - 5, 280, 8, 'F');
        
        // Row data
        xPos = 20;
        doc.setFontSize(7);
        
        // Previous Reg (using reg from vehicles table)
        doc.text(invoice.reg || '-', xPos + 2, currentY);
        xPos += colWidths[0];
        
        // New Reg (using MONTHLY SERVICE SUBSCRIPTION as per image)
        doc.text('MONTHLY SERVICE SUBSCRIPTION', xPos + 2, currentY);
        xPos += colWidths[1];
        
        // Item Code (using MONTHLY SUBSCRIPTION as per image)
        doc.text('MONTHLY SUBSCRIPTION', xPos + 2, currentY);
        xPos += colWidths[2];
        
        // Description (using MONTHLY SERVICE SUBSCRIPTION as per image)
        doc.text('MONTHLY SERVICE SUBSCRIPTION', xPos + 2, currentY);
        xPos += colWidths[3];
        
        // Comments (empty for now, but could add company info)
        const comment = invoice.company ? `THERE IS NO FD RENTAL ON THIS UNIT, AS CLIENT PAID US "CASH" - REG UPDATE FROM ${invoice.company} - ISUZU FTR` : '-';
        doc.text(comment.substring(0, 35), xPos + 2, currentY);
        xPos += colWidths[4];
        
        // Units (hardcoded to 1 as per image)
        doc.text('1', xPos + 2, currentY);
        xPos += colWidths[5];
        
        // Unit Price (price without VAT - using unit_price_without_vat)
        doc.text(`R ${invoice.unit_price_without_vat.toFixed(2)}`, xPos + 2, currentY);
        xPos += colWidths[6];
        
        // Vat (VAT amount - using vat_amount)
        doc.text(`R ${invoice.vat_amount.toFixed(2)}`, xPos + 2, currentY);
        xPos += colWidths[7];
        
        // Vat% (15.00% as per image)
        doc.text('15.00%', xPos + 2, currentY);
        xPos += colWidths[8];
        
        // Total Incl (total including VAT - using total_including_vat)
        doc.text(`R ${invoice.total_including_vat.toFixed(2)}`, xPos + 2, currentY);
        
        currentY += 10;
      });
      
      // Totals section
      currentY += 5;
      doc.setFontSize(10);
      doc.setFillColor(240, 240, 240);
      doc.rect(20, currentY - 5, 280, 8, 'F');
      
      // Fill totals row with data
      xPos = 20;
      doc.text('TOTALS:', xPos + 2, currentY);
      xPos += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5];
      doc.text(`R ${totalExVat.toFixed(2)}`, xPos + 2, currentY);
      xPos += colWidths[6];
      doc.text(`R ${totalVat.toFixed(2)}`, xPos + 2, currentY);
      xPos += colWidths[7];
      doc.text('15.00%', xPos + 2, currentY);
      xPos += colWidths[8];
      doc.text(`R ${totalInclVat.toFixed(2)}`, xPos + 2, currentY);
      
      // Footer
      currentY += 20;
      doc.setFontSize(8);
      doc.text('Head Office: 8 Viscount Road, Viscount office park, Block C unit 4 & 5, Bedfordview, 2008', 20, currentY);
      currentY += 5;
      doc.text('Postal: P.O Box 95603, Grant Park 2051 | Phone: 011 824 0066 | Email: sales@soltrack.co.za', 20, currentY);
      
      // Save PDF
      doc.save(`invoice-${costCenter.accountNumber}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Invoice Generated",
        description: `Invoice PDF has been generated successfully.`,
      });
      
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        variant: "destructive",
        title: "Invoice Generation Failed",
        description: "Failed to generate invoice. Please try again.",
      });
    } finally {
      setGeneratingReport(prev => ({ ...prev, [costCenter.accountNumber]: false }));
    }
  };

  // Show Invoice Report Component
  const handleShowInvoiceReport = async (costCenter) => {
    try {
      setGeneratingReport(prev => ({ ...prev, [costCenter.accountNumber]: true }));
      
      // Fetch vehicle invoice data from vehicles table
      const query = new URLSearchParams({
        accountNumber: costCenter.accountNumber,
      });
      if (costCenter.sourceAccountNumber) {
        query.set('sourceAccountNumber', costCenter.sourceAccountNumber);
      }
      if (costCenter.invoiceGroup) {
        query.set('billingGroup', costCenter.invoiceGroup);
      }
      if (costCenter.billingMonth) {
        query.set("billingMonth", costCenter.billingMonth);
      }
      const response = await fetch(`/api/vehicles/invoice?${query.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vehicle invoice data');
      }
      
      const data = await response.json();
      const invoiceData = data.invoiceData;
      
      if (!invoiceData) {
        toast({
          title: "No Data",
          description: "No vehicle data found for this account.",
        });
        return;
      }
      
      setSelectedCostCenterForInvoice({
        ...costCenter,
        invoiceData: invoiceData
      });
      setShowInvoiceReport(true);
      
    } catch (error) {
      console.error('Error fetching payment invoice data:', error);
      toast({
        variant: "destructive",
        title: "Invoice Report Failed",
        description: "Failed to fetch vehicle invoice data. Please try again.",
      });
    } finally {
      setGeneratingReport(prev => ({ ...prev, [costCenter.accountNumber]: false }));
    }
  };

  const openReportDeliveryOptions = (request) => {
    setReportDeliveryModal({
      open: true,
      loading: false,
      request,
    });
  };

  const closeReportDeliveryOptions = () => {
    setReportDeliveryModal({
      open: false,
      loading: false,
      request: null,
    });
  };

  const closeEmailPreview = () => {
    setEmailPreviewModal({
      open: false,
      loading: false,
      recipientEmail: '',
      subject: '',
      bodyText: '',
      html: '',
      fileName: '',
      contentType: '',
      blob: null,
      format: 'pdf',
      documentLabel: '',
      clientName: '',
      accountNumber: '',
    });
  };

  const updateEmailPreviewDraft = (updates = {}) => {
    setEmailPreviewModal((prev) => {
      const next = { ...prev, ...updates };
      return {
        ...next,
        html: buildReportEmailHtml({
          title: next.subject,
          clientName: next.clientName,
          accountNumber: next.accountNumber,
          formatLabel: String(next.format || 'pdf').toUpperCase(),
          documentLabel: next.documentLabel,
          attachmentName: next.fileName,
          bodyText: next.bodyText,
        }),
      };
    });
  };

  const handleReportDelivery = async (format, destination = 'download') => {
    const request = reportDeliveryModal.request;
    if (!request) {
      return;
    }

    setReportDeliveryModal((prev) => ({ ...prev, loading: true }));

    try {
      const isInvoice = request.type === 'invoice';
      const isItems = request.type === 'items';

      if (format === 'pdf' && destination === 'preview') {
        if (isInvoice) {
          await handleShowInvoiceReport(request.costCenter);
        } else {
          await handleShowDueReport(request.costCenter, isItems ? 'items' : 'summary');
        }
        closeReportDeliveryOptions();
        return;
      }

      if (isInvoice) {
        const { reportCostCenter, invoiceView } = await fetchInvoiceReportPayload(request.costCenter);
        const logoUrl =
          typeof window !== 'undefined'
            ? `${window.location.origin}/soltrack_logo.png`
            : '/soltrack_logo.png';
        const safeAccount = String(reportCostCenter.accountNumber || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_');

        if (format === 'excel') {
          const workbookArray = buildInvoiceWorkbook(invoiceView);
          const blob = new Blob([workbookArray], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const fileName = `${safeAccount}_Invoice_${new Date().toISOString().slice(0, 10)}.xlsx`;
          if (destination === 'email') {
            closeReportDeliveryOptions();
            const subject = `Invoice ${safeAccount}`;
            const bodyText = `Hi,\n\nPlease find the attached invoice for ${invoiceView.clientName || safeAccount}.\n\nKind regards`;
            setEmailPreviewModal({
              open: true,
              loading: false,
              recipientEmail: loggedInUserEmail || '',
              subject,
              bodyText,
              html: buildReportEmailHtml({
                title: subject,
                clientName: invoiceView.clientName,
                accountNumber: invoiceView.accountNumber,
                formatLabel: 'EXCEL',
                documentLabel: 'Invoice',
                attachmentName: fileName,
                bodyText,
              }),
              fileName,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              blob,
              format: 'excel',
              documentLabel: 'Invoice',
              clientName: invoiceView.clientName,
              accountNumber: invoiceView.accountNumber,
            });
          } else {
            downloadBlob(blob, fileName);
            toast({
              title: 'Excel Downloaded',
              description: 'Invoice Excel has been generated.',
            });
          }
        } else {
          const html = buildInvoicePrintableHtml({ logoUrl, invoiceView });
          const blob = await renderHtmlToPdfBlob(html);
          const fileName = `${safeAccount}_Invoice_${new Date().toISOString().slice(0, 10)}.pdf`;
          if (destination === 'email') {
            closeReportDeliveryOptions();
            const subject = `Invoice ${safeAccount}`;
            const bodyText = `Hi,\n\nPlease find the attached invoice for ${invoiceView.clientName || safeAccount}.\n\nKind regards`;
            setEmailPreviewModal({
              open: true,
              loading: false,
              recipientEmail: loggedInUserEmail || '',
              subject,
              bodyText,
              html: buildReportEmailHtml({
                title: subject,
                clientName: invoiceView.clientName,
                accountNumber: invoiceView.accountNumber,
                formatLabel: 'PDF',
                documentLabel: 'Invoice',
                attachmentName: fileName,
                bodyText,
              }),
              fileName,
              contentType: 'application/pdf',
              blob,
              format: 'pdf',
              documentLabel: 'Invoice',
              clientName: invoiceView.clientName,
              accountNumber: invoiceView.accountNumber,
            });
          } else {
            downloadBlob(blob, fileName);
            toast({
              title: 'PDF Downloaded',
              description: 'Invoice PDF has been generated.',
            });
          }
        }

        if (destination !== 'email') {
          closeReportDeliveryOptions();
        }
        return;
      }

      const { statementView } = await fetchStatementReportPayload(request.costCenter);
      const safeAccount = String(request.costCenter?.accountNumber || 'statement').replace(/[^a-zA-Z0-9_-]/g, '_');

      if (format === 'excel') {
        const workbookArray = buildStatementWorkbook(statementView, isItems);
        const blob = new Blob([workbookArray], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const fileName = `${safeAccount}_${isItems ? 'Full_Statement_Items' : 'Statement'}_${new Date().toISOString().slice(0, 10)}.xlsx`;

        if (destination === 'email') {
          closeReportDeliveryOptions();
          const documentLabel = isItems ? 'Full Statement + Items' : 'Debtor Statement';
          const subject = `${documentLabel} ${safeAccount}`;
          const bodyText = `Hi,\n\nPlease find the attached ${documentLabel.toLowerCase()} for ${statementView.clientName || safeAccount}.\n\nKind regards`;
          setEmailPreviewModal({
            open: true,
            loading: false,
            recipientEmail: loggedInUserEmail || '',
            subject,
            bodyText,
            html: buildReportEmailHtml({
              title: subject,
              clientName: statementView.clientName,
              accountNumber: statementView.accountNumber,
              formatLabel: 'EXCEL',
              documentLabel,
              attachmentName: fileName,
              bodyText,
            }),
            fileName,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            blob,
            format: 'excel',
            documentLabel,
            clientName: statementView.clientName,
            accountNumber: statementView.accountNumber,
          });
        } else {
          downloadBlob(blob, fileName);
          toast({
            title: 'Excel Downloaded',
            description: 'Statement Excel has been generated.',
          });
        }
      } else {
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Debtor Statement - ${statementView.accountNumber}</title>
            </head>
            <body>${StatementDocument({ statementView, showItemBreakdown: isItems })}</body>
          </html>
        `;
        const blob = await renderHtmlToPdfBlob(html);
        const fileName = `${safeAccount}_${isItems ? 'Full_Statement_Items' : 'Statement'}_${new Date().toISOString().slice(0, 10)}.pdf`;

        if (destination === 'email') {
          closeReportDeliveryOptions();
          const documentLabel = isItems ? 'Full Statement + Items' : 'Debtor Statement';
          const subject = `${documentLabel} ${safeAccount}`;
          const bodyText = `Hi,\n\nPlease find the attached ${documentLabel.toLowerCase()} for ${statementView.clientName || safeAccount}.\n\nKind regards`;
          setEmailPreviewModal({
            open: true,
            loading: false,
            recipientEmail: loggedInUserEmail || '',
            subject,
            bodyText,
            html: buildReportEmailHtml({
              title: subject,
              clientName: statementView.clientName,
              accountNumber: statementView.accountNumber,
              formatLabel: 'PDF',
              documentLabel,
              attachmentName: fileName,
              bodyText,
            }),
            fileName,
            contentType: 'application/pdf',
            blob,
            format: 'pdf',
            documentLabel,
            clientName: statementView.clientName,
            accountNumber: statementView.accountNumber,
          });
        } else {
          downloadBlob(blob, fileName);
          toast({
            title: 'PDF Downloaded',
            description: 'Statement PDF has been generated.',
          });
        }
      }

      if (destination !== 'email') {
        closeReportDeliveryOptions();
      }
    } catch (error) {
      console.error('Report delivery error:', error);
      toast({
        variant: 'destructive',
        title: 'Report Export Failed',
        description: error instanceof Error ? error.message : 'Failed to prepare report.',
      });
      setReportDeliveryModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleConfirmSendPreviewEmail = async () => {
    if (!emailPreviewModal.blob) {
      return;
    }

    setEmailPreviewModal((prev) => ({ ...prev, loading: true }));

    try {
      await sendDocumentToMyEmail({
        recipientEmail: emailPreviewModal.recipientEmail,
        subject: emailPreviewModal.subject,
        html: emailPreviewModal.html,
        fileName: emailPreviewModal.fileName,
        blob: emailPreviewModal.blob,
        contentType: emailPreviewModal.contentType,
      });

      toast({
        title: 'Email Sent',
        description: `${emailPreviewModal.documentLabel || 'Document'} sent to ${emailPreviewModal.recipientEmail || 'the selected email'}.`,
      });

      closeEmailPreview();
      closeReportDeliveryOptions();
    } catch (error) {
      console.error('Preview email send error:', error);
      toast({
        variant: 'destructive',
        title: 'Email Send Failed',
        description: error instanceof Error ? error.message : 'Failed to send email.',
      });
      setEmailPreviewModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Handle Bulk Invoice Generation - Single Continuous PDF
  const handleBulkInvoice = async () => {
    try {
      setIsGeneratingBulkInvoice(true);
      
      // Get all cost centers that have data
      const costCentersToInvoice = costCentersWithPayments.filter(cc => cc.accountNumber);
      
      if (costCentersToInvoice.length === 0) {
        toast({
          title: "No Cost Centers",
          description: "No cost centers found to generate invoices for.",
        });
        return;
      }

      console.log(`Generating bulk invoice for ${costCentersToInvoice.length} cost centers`);
      
      // Initialize a single PDF document for all invoices
      const doc = new jsPDF('landscape');
      const invoiceResults = [];
      let successCount = 0;
      let errorCount = 0;
      let isFirstInvoice = true;

      for (const costCenter of costCentersToInvoice) {
        try {
          console.log(`Processing invoice for cost center: ${costCenter.accountNumber} - ${costCenter.accountName || costCenter.company || 'Unknown'}`);
          
          // Add a new page for each cost center (except the first one)
          if (!isFirstInvoice) {
            doc.addPage();
          }
          isFirstInvoice = false;
          
          // Fetch vehicle invoice data for this cost center
          const query = new URLSearchParams({
            accountNumber: costCenter.accountNumber,
          });
          if (costCenter.billingMonth) {
            query.set('billingMonth', costCenter.billingMonth);
          }
          const response = await fetch(`/api/vehicles/invoice?${query.toString()}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch data for ${costCenter.accountNumber}`);
          }
          
          const data = await response.json();
          const invoiceData = data.invoiceData;
          
          if (!invoiceData || !invoiceData.invoiceItems || invoiceData.invoiceItems.length === 0) {
            console.log(`No invoice data found for ${costCenter.accountNumber}`);
            invoiceResults.push({
              costCenter: costCenter.accountNumber,
              companyName: costCenter.accountName || costCenter.company || 'Unknown',
              status: 'no_data',
              message: 'No vehicle data found'
            });
            errorCount++;
            continue;
          }

          // Generate invoice for this cost center on current page
          // Header
          doc.setFontSize(20);
          doc.text('Soltrack (PTY) LTD', 20, 20);
          doc.setFontSize(12);
          doc.text('VEHICLE BUREAU SERVICE', 20, 30);
          doc.text(`Reg No: 2018/095975/07`, 20, 40);
          doc.text(`VAT No: 4580161802`, 20, 50);
          
          // Invoice Title with Cost Center Info
          doc.setFontSize(16);
          doc.text(`INVOICE - ${costCenter.accountNumber}`, 20, 70);
          doc.setFontSize(12);
          doc.text(`Cost Center: ${costCenter.accountName || costCenter.company || 'Unknown'}`, 20, 80);
          doc.setFontSize(10);
          doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 90);
          doc.text(`Client: ${clientLegalName}`, 20, 100);
          
          // Table headers
          const headers = ['Vehicle Reg', 'Fleet No', 'Description', 'Company', 'Units', 'Unit Price', 'Vat Amount', 'Vat%', 'Total Incl'];
          const startY = 120;
          let currentY = startY;
          
          // Column widths for landscape mode
          const colWidths = [30, 25, 50, 30, 15, 25, 20, 15, 25];
          
          // Draw table headers
          doc.setFillColor(240, 240, 240);
          doc.rect(20, currentY - 5, 280, 8, 'F');
          doc.setFontSize(8);
          
          let xPos = 20;
          headers.forEach((header, index) => {
            doc.text(header, xPos + 2, currentY);
            xPos += colWidths[index];
          });
          
          currentY += 10;
          
          // Add invoice data rows
          let totalAmount = 0;
          invoiceData.invoiceItems.forEach((item, index) => {
            // Check if we need a new page within this invoice (if it's too long)
            if (currentY > 180) {
              doc.addPage();
              currentY = 20;
            }
            
            const rowData = [
              item.reg || '',
              item.fleetNumber || '',
              item.description || '',
              item.company || '',
              '1', // Units
              item.unit_price_without_vat ? `R ${parseFloat(item.unit_price_without_vat).toFixed(2)}` : 'R 0.00',
              item.vat_amount ? `R ${parseFloat(item.vat_amount).toFixed(2)}` : 'R 0.00',
              '15%', // VAT percentage
              item.total_including_vat ? `R ${parseFloat(item.total_including_vat).toFixed(2)}` : 'R 0.00'
            ];
            
            xPos = 20;
            rowData.forEach((cell, cellIndex) => {
              doc.text(cell, xPos + 2, currentY);
              xPos += colWidths[cellIndex];
            });
            
            totalAmount += parseFloat(item.total_including_vat || 0);
            currentY += 8;
          });
          
          // Add totals
          currentY += 10;
          doc.setFontSize(10);
          doc.text(`Total Amount: R ${totalAmount.toFixed(2)}`, 20, currentY);
          
          const companyName = costCenter.accountName || costCenter.company || 'Unknown';
          invoiceResults.push({
            costCenter: costCenter.accountNumber,
            companyName: companyName,
            status: 'success',
            message: `Invoice generated successfully`,
            totalAmount: totalAmount
          });
          
          successCount++;
          
          // Small delay to prevent overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error generating invoice for ${costCenter.accountNumber}:`, error);
          invoiceResults.push({
            costCenter: costCenter.accountNumber,
            companyName: costCenter.accountName || costCenter.company || 'Unknown',
            status: 'error',
            message: error.message
          });
          errorCount++;
        }
      }
      
      // Save the single combined PDF
      const mainClientName = clientData?.customers?.[0]?.legal_name || clientData?.customers?.[0]?.company || 'Client';
      const bulkFileName = `Bulk_Invoice_${mainClientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(bulkFileName);
      
      // Show summary toast
      if (successCount > 0) {
        toast({
          title: "Bulk Invoice Generated",
          description: `Successfully generated combined invoice with ${successCount} cost centers. ${errorCount} failed.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Bulk Invoice Generation Failed",
          description: "No invoices were generated successfully.",
        });
      }
      
      console.log('Bulk invoice generation results:', invoiceResults);
      
    } catch (error) {
      console.error('Error in bulk invoice generation:', error);
      toast({
        variant: "destructive",
        title: "Bulk Invoice Error",
        description: "Failed to generate bulk invoices. Please try again.",
      });
    } finally {
      setIsGeneratingBulkInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="mx-auto border-b-2 border-blue-600 rounded-full w-32 h-32 animate-spin"></div>
          <p className="mt-4 text-gray-700 text-lg">Loading client data...</p>
        </div>
      </div>
    );
  }

  if (!clientData || clientData.vehicles.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-gray-200 border-b">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button variant="outline" onClick={() => router.push('/protected/accounts?section=clients')} className="mr-4">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Back to Clients
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-semibold text-gray-900 text-xl">Client Cost Centers</h1>
                    {(clientData?.searchMethod === 'payments_table_focus' || clientData?.searchMethod === 'payments_table_focus_api') && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                        Payments Table Focus
                      </Badge>
                    )}
                    {clientData?.searchMethod === 'cost_centers_with_payments' && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                        Cost Centers + Payments
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm">{clientLegalName || decodedCode || code}</p>
                  {clientData?.searchDetails && (
                    <p className="mt-1 text-gray-400 text-xs">
                      Searched {clientData.searchDetails.searchedAccountNumbers?.length || 0} account numbers • 
                      Found {clientData.searchDetails.paymentsTableRecords || 0} payment records
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleDownloadStatement('summary')}
                  size="sm"
                  variant="outline"
                  disabled={isGeneratingStatement || costCentersWithPayments.length === 0}
                >
                  {isGeneratingStatement ? 'Preparing...' : 'Client Statement'}
                </Button>
                <Button
                  onClick={() => handleDownloadStatement('items')}
                  size="sm"
                  variant="outline"
                  disabled={isGeneratingStatement || costCentersWithPayments.length === 0}
                >
                  {isGeneratingStatement ? 'Preparing...' : 'Client All'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto p-6 max-w-7xl container">
          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardContent className="p-8">
              <div className="text-center">
                <AlertTriangle className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <h3 className="mb-2 font-medium text-gray-900 text-lg">No Cost Centers Found</h3>
                <p className="text-gray-500">
                  No cost centers found for client: <strong className="text-blue-600">{clientLegalName || decodedCode || code}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-gray-200 border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button variant="outline" onClick={() => router.push('/protected/accounts?section=clients')} className="mr-4">
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back to Clients
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold text-gray-900 text-xl">Client Cost Centers</h1>
                  {(clientData?.searchMethod === 'payments_table_focus' || clientData?.searchMethod === 'payments_table_focus_api') && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      Payments Table Focus
                    </Badge>
                  )}
                  {clientData?.searchMethod === 'cost_centers_with_payments' && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                      Cost Centers + Payments
                    </Badge>
                  )}
                </div>
                <p className="text-gray-500 text-sm">{clientLegalName || decodedCode || code}</p>
                <p className="mt-1 text-gray-400 text-xs">
                  Current billing month: {displayBillingMonth}
                </p>
                {clientData?.searchDetails && (
                  <p className="mt-1 text-gray-400 text-xs">
                    Searched {clientData.searchDetails.searchedAccountNumbers?.length || 0} account numbers • 
                    Found {clientData.searchDetails.paymentsTableRecords || 0} payment records
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleDownloadStatement('summary')}
                size="sm"
                variant="outline"
                disabled={isGeneratingStatement || costCentersWithPayments.length === 0}
              >
                {isGeneratingStatement ? 'Preparing...' : 'Client Statement'}
              </Button>
              <Button
                onClick={() => handleDownloadStatement('items')}
                size="sm"
                variant="outline"
                disabled={isGeneratingStatement || costCentersWithPayments.length === 0}
              >
                {isGeneratingStatement ? 'Preparing...' : 'Client All'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto p-6 max-w-7xl container">
        <div className="left-0 z-30 fixed top-32 flex items-start">
          <button
            type="button"
            onClick={() => setShowVehicleSearchDrawer((prev) => !prev)}
            className="flex items-center gap-2 rounded-r-xl border border-slate-800 bg-slate-900 px-4 py-4 text-white shadow-lg transition hover:bg-slate-800"
            aria-expanded={showVehicleSearchDrawer}
            aria-controls="client-cost-center-search-drawer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-black text-white">
              <Search className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg">Vehicle Search</span>
            {showVehicleSearchDrawer ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>

          {showVehicleSearchDrawer && (
            <Card
              id="client-cost-center-search-drawer"
              className="ml-3 max-h-[70vh] w-[360px] overflow-hidden border-slate-200 bg-white/95 shadow-2xl backdrop-blur"
            >
              <CardContent className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm">
                      Vehicle Search
                    </p>
                    <p className="text-slate-500 text-xs">
                      Search cost centers by company, account number, stock code, or description.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVehicleSearchDrawer(false)}
                    className="h-8 px-2 text-slate-500 hover:text-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search cost centers by company name, account number, stock code, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Showing</span>
                    <span className="font-semibold text-slate-900">
                      {filteredCostCenters.length} / {costCentersWithPayments.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredCostCenters.slice(0, 8).map((costCenter) => (
                    <div
                      key={costCenter.accountNumber}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <p className="font-medium text-slate-900 text-sm">
                        {costCenter.accountName || costCenter.company || costCenter.accountNumber}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {costCenter.accountNumber} • {formatCurrency(getOutstandingAmount(costCenter))}
                      </p>
                    </div>
                  ))}
                  {filteredCostCenters.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-slate-500 text-sm">
                      No matching cost centers found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Cards */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card className="bg-white shadow-lg hover:shadow-xl border-2 border-red-100 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-3">
              <CardTitle className="font-semibold text-gray-700 text-sm">Amount Due</CardTitle>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-red-600 text-2xl">
                {formatCurrency(overviewTotals.balance)}
              </div>
              <p className={`mt-1 text-xs font-medium ${
                overviewTotals.balance > 0 
                  ? 'text-red-600' 
                  : 'text-green-600'
              }`}>
                {overviewTotals.balance > 0 
                  ? 'Due / Not Paid' 
                  : 'Paid in Full'
                }
              </p>
              <p className="mt-1 text-gray-500 text-xs">Current month outstanding balance</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl border-2 border-purple-100 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-3">
              <CardTitle className="font-semibold text-gray-700 text-sm">Total Vehicles</CardTitle>
              <Car className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-purple-600 text-2xl">{clientData.vehicleCount}</div>
              <p className="mt-1 text-gray-500 text-xs">Fleet size</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl border-2 border-green-100 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-3">
              <CardTitle className="font-semibold text-gray-700 text-sm">Cost Centers</CardTitle>
              <Users className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-green-600 text-2xl">{overviewTotals.costCenters}</div>
              <p className="mt-1 text-gray-500 text-xs">
                {overviewTotals.paidCount} paid, {overviewTotals.pendingCount + overviewTotals.partialCount + overviewTotals.overdueCount} outstanding
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl border-2 border-indigo-100 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-3">
              <CardTitle className="font-semibold text-gray-700 text-sm">Total Due</CardTitle>
              {/* <DollarSign className="w-5 h-5 text-indigo-600" /> */}
            </CardHeader>
            <CardContent>
              <div className="font-bold text-indigo-600 text-2xl">
                {formatCurrency(overviewTotals.due)}
              </div>
              <p className="mt-1 text-gray-500 text-xs">Current month billed total</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl border-2 border-orange-100 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-3">
              <CardTitle className="font-semibold text-gray-700 text-sm">Balance Due</CardTitle>
              <CreditCard className="w-5 h-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-orange-600 text-2xl">
                {formatCurrency(overviewTotals.balance)}
              </div>
              <p className={`mt-1 text-xs font-medium ${
                overviewTotals.balance > 0 
                  ? 'text-orange-600' 
                  : 'text-green-600'
              }`}>
                {overviewTotals.balance > 0 
                  ? 'Due / Not Paid' 
                  : 'Paid in Full'
                }
              </p>
              <p className="mt-1 text-gray-500 text-xs">Outstanding after payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Summary Row */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-4 mb-6">
          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="font-bold text-gray-900 text-lg">
                  {formatCurrency(overviewTotals.balance)}
                </div>
                <p className={`text-xs font-medium ${
                  overviewTotals.balance > 0 
                    ? 'text-red-600' 
                    : 'text-green-600'
                }`}>
                  {overviewTotals.balance > 0 
                    ? 'Due / Not Paid' 
                    : 'Paid in Full'
                  }
                </p>
                <p className="text-gray-500 text-xs">Total Balance Due</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="font-bold text-green-600 text-lg">
                  {formatCurrency(overviewTotals.paid)}
                </div>
                <p className="text-gray-500 text-xs">Total Amount Paid</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="font-bold text-blue-600 text-lg">
                  {formatCurrency(overviewTotals.credit)}
                </div>
                <p className="text-gray-500 text-xs">Total Credit Available</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="font-bold text-red-600 text-lg">
                  {formatCurrency(overviewTotals.due)}
                </div>
                <p className="text-gray-500 text-xs">Total Amount Due</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cost Centers Table */}
        <Card className="bg-white shadow-lg border-2 border-gray-200">
          <CardHeader className="bg-gray-50 border-gray-200 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-gray-900 text-lg">
                  {(clientLegalName || decodedCode || code)} - Cost Centers
                </CardTitle>
                <p className="mt-1 text-gray-600 text-sm">Individual cost centers with company names and account codes for this client</p>
              </div>
              <div className="text-right">
                <div className="flex gap-2 mb-2">
                  <Button
                    onClick={() => handlePayAllCostCenters()}
                    size="sm"
                    disabled={costCentersWithPayments.filter(cc => cc.balanceDue > 0).length === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 shadow-md hover:shadow-lg px-4 py-2 rounded-lg text-white transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="mr-2 w-4 h-4" />
                    Pay All
                  </Button>
                  <Button
                    onClick={() => handleDownloadStatement('summary')}
                    size="sm"
                    disabled={isGeneratingStatement || costCentersWithPayments.length === 0}
                    className="bg-slate-700 hover:bg-slate-800 disabled:bg-gray-400 shadow-md hover:shadow-lg px-4 py-2 rounded-lg text-white transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    {isGeneratingStatement ? (
                      <>
                        <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin"></div>
                        Preparing...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 w-4 h-4" />
                        Client Statement
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDownloadStatement('items')}
                    size="sm"
                    disabled={isGeneratingStatement || costCentersWithPayments.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 shadow-md hover:shadow-lg px-4 py-2 rounded-lg text-white transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    {isGeneratingStatement ? (
                      <>
                        <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin"></div>
                        Preparing...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 w-4 h-4" />
                        Client All
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleBulkInvoice()}
                    size="sm"
                    disabled={isGeneratingBulkInvoice}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 shadow-md hover:shadow-lg px-4 py-2 rounded-lg text-white transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    {isGeneratingBulkInvoice ? (
                      <>
                        <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 w-4 h-4" />
                        Bulk Invoice
                      </>
                    )}
                  </Button>
                </div>
                {showCostCenterTotalColumn && costCentersWithPayments.filter(cc => getOutstandingAmount(cc) > 0).length > 0 && (
                  <p className="mt-1 text-gray-500 text-xs">
                    Total Outstanding: {formatCurrency(costCentersWithPayments.reduce((sum, cc) => sum + getOutstandingAmount(cc), 0))}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-gray-200 border-b">
                    <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">Account Name</th>
                    {showCostCenterTotalColumn && (
                      <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">Cost Center Total</th>
                    )}
                    {showPaidAndBalanceColumns && (
                      <>
                        <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">Amount Paid</th>
                        <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">Credited</th>
                        <th className="p-4 font-semibold text-gray-700 text-sm text-left uppercase tracking-wider">Balance Due</th>
                      </>
                    )}
                    <th className="p-4 font-semibold text-gray-700 text-sm text-center uppercase tracking-wider">Actions</th>
                    <th className="p-4 font-semibold text-gray-700 text-sm text-center uppercase tracking-wider">Reports</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {costCentersWithPayments.map((costCenter, index) => (
                    <tr key={costCenter.accountNumber} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {costCenter.accountName}
                          </div>
                          <Badge variant="outline" className="bg-blue-50 px-2 py-1 border-blue-200 font-mono text-blue-700 text-xs">
                            {costCenter.accountNumber}
                          </Badge>
                        </div>
                      </td>
                      {showCostCenterTotalColumn && (
                        <td className="p-4">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(getOutstandingAmount(costCenter))}
                          </div>
                          <p className="text-gray-500 text-xs">
                            {costCenter.amountSource === 'vehicles_draft'
                              ? 'Current vehicle billing draft'
                              : costCenter.amountSource === 'account_invoice'
                                ? 'Generated invoice total'
                                : costCenter.amountSource === 'no_billing_data'
                                  ? 'No current billing data'
                                  : 'Current cost center total'}
                          </p>
                        </td>
                      )}
                      {showPaidAndBalanceColumns && (
                        <>
                          <td className="p-4">
                            <div className="font-semibold text-green-600">
                              {formatCurrency(costCenter.paidAmount || 0)}
                            </div>
                            <p className="text-gray-500 text-xs">
                              Paid so far
                            </p>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-blue-600">
                              {formatCurrency(costCenter.creditAmount || 0)}
                            </div>
                            <p className="text-gray-500 text-xs">
                              Credited amount
                            </p>
                          </td>
                          <td className="p-4">
                            <div className={`font-semibold ${
                              Number(costCenter.balanceDue || 0) > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(costCenter.balanceDue || 0)}
                            </div>
                            <p className="text-gray-500 text-xs">
                              Outstanding after payments
                            </p>
                          </td>
                        </>
                      )}
                      <td className="p-4 text-center">
                        <Button
                          onClick={() => handlePayCostCenter(costCenter)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg px-4 py-2 rounded-lg text-white transition-all duration-200"
                        >
                          <CreditCard className="mr-2 w-4 h-4" />
                          Pay
                        </Button>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg px-3 py-1 rounded text-white text-xs transition-all duration-200"
                            onClick={() => openReportDeliveryOptions({ type: 'invoice', costCenter })}
                            disabled={generatingReport[costCenter.accountNumber]}
                          >
                            {generatingReport[costCenter.accountNumber] ? (
                              <>
                                <div className="mr-1 border-2 border-white border-t-transparent rounded-full w-3 h-3 animate-spin"></div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <FileText className="mr-1 w-3 h-3" />
                                Invoice
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg px-3 py-1 rounded text-white text-xs transition-all duration-200"
                            onClick={() => openReportDeliveryOptions({ type: 'statement', costCenter })}
                            disabled={generatingReport[costCenter.accountNumber]}
                          >
                            {generatingReport[costCenter.accountNumber] ? (
                              <>
                                <div className="mr-1 border-2 border-white border-t-transparent rounded-full w-3 h-3 animate-spin"></div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <FileText className="mr-1 w-3 h-3" />
                                Statement
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-slate-700 hover:bg-slate-800 shadow-md hover:shadow-lg px-3 py-1 rounded text-white text-xs transition-all duration-200"
                            onClick={() => openReportDeliveryOptions({ type: 'items', costCenter })}
                            disabled={generatingReport[costCenter.accountNumber]}
                          >
                            {generatingReport[costCenter.accountNumber] ? (
                              <>
                                <div className="mr-1 border-2 border-white border-t-transparent rounded-full w-3 h-3 animate-spin"></div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <FileText className="mr-1 w-3 h-3" />
                                Full Statement + Items
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && paymentDetails && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="flex flex-col bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex flex-shrink-0 justify-between items-center p-6 border-gray-200 border-b">
              <h3 className="font-semibold text-gray-900 text-lg">{paymentDetails.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePaymentModal}
                disabled={processingPayment}
                className="disabled:opacity-50 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="mb-6 text-center">
                <div className="flex justify-center items-center bg-blue-100 mx-auto mb-4 rounded-full w-16 h-16">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="mb-2 font-bold text-gray-900 text-xl">Amount Owed</h4>
                <div className="mb-2 font-bold text-blue-600 text-3xl">
                  {formatCurrency(
                    paymentDetails.type === 'costCenter' && openInvoicesForPayment.length > 0
                      ? totalOpenInvoiceBalance
                      : paymentDetails.amount,
                  )}
                </div>
                <p className="text-gray-600 text-sm">{paymentDetails.description}</p>
                
                {/* Payment Info Box */}
                <div className="bg-blue-50 mt-4 p-3 border border-blue-200 rounded-lg">
                  <div className="space-y-1 text-blue-800 text-xs">
                    <div className="flex justify-between">
                      <span>
                        {paymentDetails.type === 'costCenter' && openInvoicesForPayment.length > 0
                          ? 'Total Open Invoices:'
                          : 'Current Amount Due:'}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(
                          paymentDetails.type === 'costCenter' && openInvoicesForPayment.length > 0
                            ? totalOpenInvoiceBalance
                            : paymentDetails.amount,
                        )}
                      </span>
                    </div>
                    {paymentDetails.type === 'costCenter' && selectedPaymentInvoice && (
                      <div className="flex justify-between">
                        <span>Selected Invoice Due:</span>
                        <span className="font-semibold">{formatCurrency(selectedPaymentInvoice.balance_due || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Payment Due Date:</span>
                      <span className="font-semibold">21st of each month</span>
                    </div>
                    <div className="mt-2 font-medium text-blue-700 text-center">
                      💡 After 21st, unpaid amounts are added to overdue
                    </div>
                  </div>
                </div>
              </div>

              {paymentDetails.type === 'costCenter' && (
                <div className="mb-6">
                  <div className="flex gap-2 mb-3">
                    <Button
                      type="button"
                      variant={selectedPaymentTab === 'current' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPaymentTab('current')}
                    >
                      Current
                    </Button>
                    <Button
                      type="button"
                      variant={selectedPaymentTab === 'outstanding' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPaymentTab('outstanding')}
                    >
                      Outstanding
                    </Button>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block font-medium text-gray-700 text-sm">
                      {selectedPaymentTab === 'current' ? 'Current Invoices' : 'Outstanding Invoices'}
                    </label>
                    {loadingOpenInvoices && (
                      <span className="text-blue-600 text-xs">Loading...</span>
                    )}
                  </div>
                  <div className="space-y-2 bg-gray-50 p-4 border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                    {loadingOpenInvoices ? (
                      <div className="text-gray-500 text-sm">Fetching unpaid invoices...</div>
                    ) : visibleOpenInvoicesForPayment.length > 0 ? (
                      visibleOpenInvoicesForPayment.map((invoice) => {
                        const isSelected =
                          String(selectedPaymentInvoiceId || '') === String(invoice.id || '');
                        return (
                          <button
                            key={invoice.id}
                            type="button"
                            onClick={() => setSelectedPaymentInvoiceId(invoice.id)}
                            className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">
                                  {invoice.invoice_number || 'Stored Invoice'}
                                  {invoice.isDraft && (
                                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                      Draft
                                    </span>
                                  )}
                                  {invoice.isOutstandingSummary && (
                                    <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">
                                      Aged
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-gray-500 text-xs">
                                  Billing Month: {invoice.billing_month || 'N/A'}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  Invoice Date: {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'N/A'}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  Generated: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}
                                </div>
                                {invoice.isOutstandingSummary && (
                                  <div className="mt-1 text-gray-500 text-xs">
                                    30: {formatCurrency(invoice.overdue_30_days || 0)} | 60: {formatCurrency(invoice.overdue_60_days || 0)} | 90: {formatCurrency(invoice.overdue_90_days || 0)} | 120+: {formatCurrency(invoice.overdue_120_plus_days || 0)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-gray-900 text-sm">
                                  Full: {formatCurrency(invoice.total_amount || 0)}
                                </div>
                                <div className="font-semibold text-red-600 text-sm">
                                  {formatCurrency(invoice.balance_due || 0)}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  Paid: {formatCurrency(invoice.paid_amount || 0)}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-gray-500 text-sm">
                        {selectedPaymentTab === 'current'
                          ? 'No current invoice rows were found for this cost center.'
                          : 'No outstanding invoice rows were found for this cost center.'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Amount Input */}
              <div className="mb-6">
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Enter Payment Amount
                </label>
                <div className="relative">
                  <span className="top-1/2 left-3 absolute font-semibold text-gray-500 -translate-y-1/2 transform">
                    R
                  </span>
                  <Input
                    type="text"
                    value={enteredAmount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    disabled={processingPayment}
                    className="disabled:opacity-50 py-3 pr-4 pl-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono text-lg disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="text-gray-500">
                    Enter amount (e.g., 1500.50 or 1500)
                  </span>
                  <span className="font-medium text-blue-600">
                    Invoice Due: {formatCurrency(getPaymentLimit())}
                  </span>
                </div>
              </div>

              {/* Payment Reference Input */}
              <div className="mb-6">
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Payment Reference (Optional)
                </label>
                <Input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Enter payment reference..."
                  disabled={processingPayment}
                  className="disabled:opacity-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-1 text-gray-500 text-xs">
                  Add a reference to help track this payment (e.g., invoice number, check number)
                </p>
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 mb-6 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700 text-sm">Payment Type:</span>
                  <span className="text-gray-900 text-sm">
                    {paymentDetails.type === 'costCenter' ? 'Individual Cost Center' : 
                     paymentDetails.type === 'allCostCenters' ? 'All Cost Centers' : 'Entire Client'}
                  </span>
                </div>
                {paymentDetails.type === 'costCenter' && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 text-sm">Cost Center:</span>
                    <span className="font-mono text-gray-900 text-sm">{paymentDetails.costCenter.accountNumber}</span>
                  </div>
                )}
                {paymentDetails.type === 'costCenter' && paymentDetails.costCenter.accountName && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 text-sm">Company Name:</span>
                    <span className="text-gray-900 text-sm">{paymentDetails.costCenter.accountName}</span>
                  </div>
                )}
                {paymentDetails.type === 'allCostCenters' && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 text-sm">Cost Centers:</span>
                    <span className="text-gray-900 text-sm">{costCentersWithPayments.filter(cc => getOutstandingAmount(cc) > 0).length} cost centers with outstanding amounts</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700 text-sm">
                    {paymentDetails.type === 'costCenter' ? 'Cost Center Code:' : 'Client Code:'}
                  </span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {paymentDetails.type === 'costCenter'
                      ? (paymentDetails.costCenter?.accountNumber || code)
                      : code}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700 text-sm">Entered Amount:</span>
                  <span className="font-semibold text-green-600 text-sm">
                    {formatCurrency(getNumericAmount())}
                  </span>
                </div>
                {paymentReference && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-700 text-sm">Payment Reference:</span>
                    <span className="font-semibold text-blue-600 text-sm">{paymentReference}</span>
                  </div>
                )}
                {paymentDetails.type === 'costCenter' && selectedPaymentInvoice && (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700 text-sm">Selected Invoice:</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {selectedPaymentInvoice.invoice_number || 'Stored Invoice'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700 text-sm">Selected Period:</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {selectedPaymentInvoice.billing_month || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700 text-sm">Invoice Date:</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {selectedPaymentInvoice.invoice_date
                          ? new Date(selectedPaymentInvoice.invoice_date).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700 text-sm">Generated On:</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {selectedPaymentInvoice.created_at
                          ? new Date(selectedPaymentInvoice.created_at).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700 text-sm">Full Invoice Amount:</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {formatCurrency(selectedPaymentInvoice.total_amount || 0)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 text-sm">Remaining After Payment:</span>
                  <span className={`font-semibold text-sm ${
                    (getPaymentLimit() - getNumericAmount()) > 0 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.max(0, getPaymentLimit() - getNumericAmount()))}
                  </span>
                </div>
                {paymentDetails.type === 'costCenter' && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium text-gray-700 text-sm">First Month Amount:</span>
                    <span className="font-semibold text-blue-600 text-sm">
                      {formatCurrency(paymentDetails.costCenter.firstMonth || 0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={closePaymentModal}
                  disabled={processingPayment}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={
                    !enteredAmount ||
                    getNumericAmount() <= 0 ||
                    processingPayment ||
                    loadingOpenInvoices
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white disabled:cursor-not-allowed"
                >
                  {processingPayment ? (
                    <>
                      <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 w-4 h-4" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay All Modal */}
      {showPayAllModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="flex flex-col bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex flex-shrink-0 justify-between items-center p-6 border-gray-200 border-b">
              <h3 className="font-semibold text-gray-900 text-xl">Pay All Cost Centers</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePayAllModal}
                disabled={processingPayment}
                className="disabled:opacity-50 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="mb-6 text-center">
                <div className="flex justify-center items-center bg-blue-100 mx-auto mb-4 rounded-full w-16 h-16">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="mb-2 font-bold text-gray-900 text-xl">Bulk Payment</h4>
                <p className="text-gray-600 text-sm">Expand a cost center, pick the invoice, allocate the amount, and enter a reference for each allocation.</p>
              </div>

              <div className="flex gap-2 mb-6">
                <Button
                  type="button"
                  variant={selectedBulkPaymentTab === 'current' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedBulkPaymentTab('current')}
                >
                  Current
                </Button>
                <Button
                  type="button"
                  variant={selectedBulkPaymentTab === 'outstanding' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedBulkPaymentTab('outstanding')}
                >
                  Outstanding
                </Button>
              </div>

              {/* Cost Centers Selection */}
              <div className="mb-6">
                <h5 className="mb-3 font-semibold text-gray-700">Select Cost Centers to Pay</h5>
                <div className="space-y-2 p-4 border border-gray-200 rounded-lg max-h-[28rem] overflow-y-auto">
                  {selectedCostCenters.map((costCenter) => {
                    const bulkState = bulkInvoiceSelections[costCenter.accountNumber] || {};
                    const visibleBulkInvoices = (Array.isArray(bulkState.invoices) ? bulkState.invoices : []).filter(
                      (invoice) => getInvoicePeriodTab(invoice) === selectedBulkPaymentTab,
                    );
                    return (
                      <div key={costCenter.accountNumber} className="border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3 hover:bg-gray-50 p-3">
                          <input
                            type="checkbox"
                            id={"cc-" + costCenter.accountNumber}
                            checked={costCenter.selected}
                            onChange={(e) => handleCostCenterSelection(costCenter.accountNumber, e.target.checked)}
                            className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-600"
                          />
                          <label htmlFor={"cc-" + costCenter.accountNumber} className="flex-1 cursor-pointer">
                            <div className="font-medium text-gray-900 text-sm">{costCenter.accountName}</div>
                            <div className="text-gray-500 text-xs">
                              {costCenter.accountNumber} - Outstanding: {formatCurrency(getOutstandingAmount(costCenter))}
                            </div>
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleBulkInvoiceDropdown(costCenter)}
                            className="shrink-0"
                          >
                            {bulkState.expanded ? (
                              <ChevronDown className="mr-1 w-4 h-4" />
                            ) : (
                              <ChevronRight className="mr-1 w-4 h-4" />
                            )}
                            Invoices
                          </Button>
                        </div>

                        {bulkState.expanded && (
                          <div className="space-y-3 bg-gray-50 px-3 pb-3">
                            {bulkState.loading ? (
                              <div className="px-2 py-3 text-gray-500 text-sm">Loading invoices...</div>
                            ) : visibleBulkInvoices.length > 0 ? (
                              visibleBulkInvoices.map((invoice) => {
                                const allocation = bulkState.allocations?.[String(invoice.id)] || {};
                                return (
                                  <div key={invoice.id} className="bg-white p-3 border border-gray-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(allocation.selected)}
                                        onChange={(e) =>
                                          handleBulkInvoiceAllocationChange(
                                            costCenter.accountNumber,
                                            String(invoice.id),
                                            'selected',
                                            e.target.checked,
                                          )
                                        }
                                        className="mt-1 border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-600"
                                      />
                                      <div className="flex-1">
                                        <div className="flex justify-between gap-4">
                                          <div>
                                            <div className="font-semibold text-gray-900 text-sm">
                                              {invoice.invoice_number || 'Stored Invoice'}
                                              {invoice.isDraft && (
                                                <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                                                  Draft
                                                </span>
                                              )}
                                              {invoice.isOutstandingSummary && (
                                                <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">
                                                  Aged
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-gray-500 text-xs">
                                              Billing Month: {invoice.billing_month || 'N/A'}
                                            </div>
                                            <div className="text-gray-500 text-xs">
                                              Invoice Date: {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'N/A'}
                                            </div>
                                            <div className="text-gray-500 text-xs">
                                              Generated: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}
                                            </div>
                                            {invoice.isOutstandingSummary && (
                                              <div className="mt-1 text-gray-500 text-xs">
                                                30: {formatCurrency(invoice.overdue_30_days || 0)} | 60: {formatCurrency(invoice.overdue_60_days || 0)} | 90: {formatCurrency(invoice.overdue_90_days || 0)} | 120+: {formatCurrency(invoice.overdue_120_plus_days || 0)}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <div className="font-semibold text-gray-900 text-sm">
                                              Full: {formatCurrency(invoice.total_amount || 0)}
                                            </div>
                                            <div className="font-semibold text-red-600 text-sm">
                                              Due: {formatCurrency(invoice.balance_due || 0)}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="gap-3 grid grid-cols-1 md:grid-cols-2 mt-3">
                                          <div>
                                            <label className="block mb-1 font-medium text-gray-700 text-xs">
                                              Allocate Amount
                                            </label>
                                            <Input
                                              type="text"
                                              value={allocation.amount || ''}
                                              onChange={(e) =>
                                                handleBulkInvoiceAllocationChange(
                                                  costCenter.accountNumber,
                                                  String(invoice.id),
                                                  'amount',
                                                  e.target.value,
                                                )
                                              }
                                              placeholder="0.00"
                                              disabled={processingPayment}
                                              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                          </div>
                                          <div>
                                            <label className="block mb-1 font-medium text-gray-700 text-xs">
                                              Payment Reference
                                            </label>
                                            <Input
                                              type="text"
                                              value={allocation.paymentReference || ''}
                                              onChange={(e) =>
                                                handleBulkInvoiceAllocationChange(
                                                  costCenter.accountNumber,
                                                  String(invoice.id),
                                                  'paymentReference',
                                                  e.target.value,
                                                )
                                              }
                                              placeholder="Enter reference"
                                              disabled={processingPayment}
                                              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="px-2 py-3 text-gray-500 text-sm">
                                {selectedBulkPaymentTab === 'current'
                                  ? 'No current invoice rows were found for this cost center.'
                                  : 'No outstanding invoice rows were found for this cost center.'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Amount Display */}
              <div className="bg-blue-50 mb-6 p-4 border border-blue-200 rounded-lg">
                <div className="text-center">
                  <div className="mb-1 text-blue-600 text-sm">Total Allocated Amount</div>
                  <div className="font-bold text-blue-700 text-3xl">
                    {formatCurrency(totalBulkAllocatedAmount)}
                  </div>
                  <div className="mt-1 text-blue-600 text-sm">
                    {getBulkSelectedAllocations().length} invoice allocation(s) selected
                  </div>
                </div>
              </div>



              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={closePayAllModal}
                  disabled={processingPayment}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayAllSubmit}
                  disabled={processingPayment || getBulkSelectedAllocations().length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white disabled:cursor-not-allowed"
                >
                  {processingPayment ? (
                    <>
                      <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 w-4 h-4" />
                      Process All Payments
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={reportDeliveryModal.open}
        onOpenChange={(open) => {
          if (!open && !reportDeliveryModal.loading) {
            closeReportDeliveryOptions();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Report Format</DialogTitle>
            <DialogDescription>
              Preview the document in PDF using the current layout, download it as Excel, or send the chosen file format by email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-900">
                {reportDeliveryModal.request?.type === 'invoice'
                  ? 'Invoice'
                  : reportDeliveryModal.request?.type === 'items'
                    ? 'Full Statement + Items'
                    : 'Statement'}
              </div>
              <div className="mt-1 text-slate-600">
                {reportDeliveryModal.request?.costCenter?.accountName ||
                  reportDeliveryModal.request?.costCenter?.accountNumber ||
                  'Selected cost center'}
              </div>
              <div className="text-slate-500">
                {reportDeliveryModal.request?.costCenter?.accountNumber || ''}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => handleReportDelivery('pdf', 'preview')}
                disabled={reportDeliveryModal.loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {reportDeliveryModal.request?.type === 'invoice' ? 'Open Invoice PDF' : 'Preview PDF'}
              </Button>
              <Button
                onClick={() => handleReportDelivery('excel', 'download')}
                disabled={reportDeliveryModal.loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Download Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReportDelivery('pdf', 'email')}
                disabled={reportDeliveryModal.loading}
              >
                Email PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReportDelivery('excel', 'email')}
                disabled={reportDeliveryModal.loading}
              >
                Email Excel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={emailPreviewModal.open}
        onOpenChange={(open) => {
          if (!open && !emailPreviewModal.loading) {
            closeEmailPreview();
          }
        }}
      >
        <DialogContent className="max-h-[92vh] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Edit the recipient, subject, and message below. The chosen file will be attached exactly as sent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="grid gap-2 text-sm sm:grid-cols-[140px_minmax(0,1fr)]">
                <div className="font-medium text-slate-500">To</div>
                <Input
                  type="email"
                  value={emailPreviewModal.recipientEmail}
                  onChange={(event) =>
                    setEmailPreviewModal((prev) => ({
                      ...prev,
                      recipientEmail: event.target.value,
                    }))
                  }
                  disabled={emailPreviewModal.loading}
                  placeholder="name@example.com"
                />
                <div className="font-medium text-slate-500">Subject</div>
                <Input
                  value={emailPreviewModal.subject}
                  onChange={(event) => updateEmailPreviewDraft({ subject: event.target.value })}
                  disabled={emailPreviewModal.loading}
                />
                <div className="font-medium text-slate-500">Attachment</div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">{emailPreviewModal.fileName || '-'}</span>
                  {emailPreviewModal.blob && emailPreviewModal.fileName ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => downloadBlob(emailPreviewModal.blob, emailPreviewModal.fileName)}
                    >
                      Download Attachment
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700">Email Body</div>
              <textarea
                value={emailPreviewModal.bodyText}
                onChange={(event) => updateEmailPreviewDraft({ bodyText: event.target.value })}
                disabled={emailPreviewModal.loading}
                className="min-h-[140px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter the email message..."
              />
            </div>

            <div className="h-[60vh] overflow-hidden rounded-xl border bg-white shadow-inner">
              <iframe
                title="Email Preview"
                srcDoc={emailPreviewModal.html}
                className="h-full w-full border-0"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeEmailPreview}
                disabled={emailPreviewModal.loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSendPreviewEmail}
                disabled={emailPreviewModal.loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {emailPreviewModal.loading ? 'Sending...' : 'Confirm And Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Statement Component */}
      {showDueReport && selectedCostCenterForReport && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="flex flex-col bg-white shadow-xl rounded-lg w-full max-w-6xl max-h-[95vh]">
            {/* Modal Header */}
            <div className="flex flex-shrink-0 justify-between items-center p-6 border-gray-200 border-b">
              <h3 className="font-semibold text-gray-900 text-xl">
                {selectedStatementVariant === 'items' ? 'Full Debtor Statement With Items' : 'Debtor Statement'} - {selectedCostCenterForReport.accountNumber}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDueReport(false);
                  setSelectedCostCenterForReport(null);
                  setSelectedStatementVariant('summary');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              <DueReportComponent
                costCenter={selectedCostCenterForReport}
                clientLegalName={clientLegalName}
                paymentData={selectedCostCenterForReport.paymentData}
                invoiceHistory={selectedCostCenterForReport.invoiceHistory}
                paymentHistory={selectedCostCenterForReport.paymentHistory}
                bulkInvoice={selectedCostCenterForReport.bulkInvoice}
                showItemBreakdown={selectedStatementVariant === 'items'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Invoice Report Component */}
      {showInvoiceReport && selectedCostCenterForInvoice && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="flex flex-col bg-white shadow-xl rounded-lg w-full max-w-6xl max-h-[95vh]">
            {/* Modal Header */}
            <div className="flex flex-shrink-0 justify-between items-center p-6 border-gray-200 border-b">
              <h3 className="font-semibold text-gray-900 text-xl">
                Invoice - {selectedCostCenterForInvoice.accountName || selectedCostCenterForInvoice.company || clientLegalName || selectedCostCenterForInvoice.accountNumber}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowInvoiceReport(false);
                  setSelectedCostCenterForInvoice(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              <InvoiceReportComponent
                costCenter={selectedCostCenterForInvoice}
                clientLegalName={clientLegalName}
                invoiceData={selectedCostCenterForInvoice.invoiceData}
                onInvoiceGenerated={(invoice) => {
                  setSelectedCostCenterForInvoice((prev) =>
                    prev
                      ? {
                          ...prev,
                          accountInvoiceId: invoice.id,
                          reference: invoice.invoice_number,
                          invoiceData: {
                            ...(prev.invoiceData || {}),
                            id: invoice.id,
                            invoice_number: invoice.invoice_number,
                            invoice_date: invoice.invoice_date,
                            billing_month: invoice.billing_month,
                            due_date: invoice.due_date,
                            company_registration_number: invoice.company_registration_number,
                            client_address: invoice.client_address,
                            customer_vat_number: invoice.customer_vat_number,
                            subtotal: invoice.subtotal,
                            vat_amount: invoice.vat_amount,
                            total_amount: invoice.total_amount,
                            paid_amount: invoice.paid_amount,
                            balance_due: invoice.balance_due,
                            payment_status: invoice.payment_status,
                            invoice_items: invoice.line_items,
                            invoiceItems: invoice.line_items,
                          },
                        }
                      : prev,
                  );
                  setCostCentersWithPayments((prev) =>
                    prev.map((item) =>
                      item.accountNumber === selectedCostCenterForInvoice?.accountNumber
                        ? {
                            ...item,
                            accountInvoiceId: invoice.id,
                            reference: invoice.invoice_number,
                            dueAmount: Number(invoice.total_amount || 0),
                            balanceDue: Number(invoice.balance_due ?? invoice.total_amount ?? 0),
                            paidAmount: Number(invoice.paid_amount || 0),
                            paymentStatus: invoice.payment_status || 'pending',
                            billingMonth: invoice.billing_month || item.billingMonth,
                            invoiceDate: invoice.invoice_date || item.invoiceDate,
                            dueDate: invoice.due_date || item.dueDate,
                          }
                        : item,
                    ),
                  );
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
