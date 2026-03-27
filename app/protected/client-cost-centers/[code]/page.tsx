'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, DollarSign, Car, AlertTriangle, CreditCard, Users, X, Calendar, FileText } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import DueReportComponent from '@/components/inv/components/due-report';
import InvoiceReportComponent from '@/components/inv/components/invoice-report';
import { jsPDF } from 'jspdf';


export default function ClientCostCentersPage() {
  const EPS_SPECIAL_SOURCE_ACCOUNT = 'EPSC-0001';
  const params = useParams();
  const router = useRouter();
  const { code } = params;
  const decodedCode = useMemo(() => {
    if (!code) return '';
    try {
      return decodeURIComponent(String(code));
    } catch (error) {
      return String(code);
    }
  }, [code]);
  
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCostCenters, setFilteredCostCenters] = useState([]);
  const [costCentersWithPayments, setCostCentersWithPayments] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPayAllModal, setShowPayAllModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [enteredAmount, setEnteredAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [clientLegalName, setClientLegalName] = useState('');
  const [selectedCostCenters, setSelectedCostCenters] = useState([]);
  const [payAllAmount, setPayAllAmount] = useState('');
  const [payAllReference, setPayAllReference] = useState('');
  const [generatingReport, setGeneratingReport] = useState({});
  const [showDueReport, setShowDueReport] = useState(false);
  const [selectedCostCenterForReport, setSelectedCostCenterForReport] = useState(null);
  const [showInvoiceReport, setShowInvoiceReport] = useState(false);
  const [selectedCostCenterForInvoice, setSelectedCostCenterForInvoice] = useState(null);
  const [isGeneratingBulkInvoice, setIsGeneratingBulkInvoice] = useState(false);
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  const showCostCenterTotalColumn = true;
  const showPaidAndBalanceColumns = true;
  const currentBillingMonthKey = useMemo(() => {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    return currentMonth.toISOString().slice(0, 10);
  }, []);

  const isRealInvoiceNumber = (value) =>
    /^(INV|SOL)-\d+$/i.test(String(value || '').trim());

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
      one_month: Number(payment.due_amount || 0),
      '2nd_month': 0,
      '3rd_month': 0,
      amount_due: Number(payment.balance_due || 0),
      monthly_amount: Number(payment.due_amount || 0),
      payment_status: payment.payment_status,
      billing_month: payment.billing_month,
      reference: payment.reference,
      overdue_30_days: Number(payment.overdue_30_days || 0),
      overdue_60_days: Number(payment.overdue_60_days || 0),
      overdue_90_days: Number(payment.overdue_90_days || 0)
    }));
  };

  const buildSummaryFromPayments = (payments) => {
    const summary = {
      totalDueAmount: 0,
      totalPaidAmount: 0,
      totalBalanceDue: 0,
      totalOverdue30: 0,
      totalOverdue60: 0,
      totalOverdue90: 0,
      paymentCount: payments?.length || 0
    };

    (payments || []).forEach((payment) => {
      summary.totalDueAmount += Number(payment.due_amount || 0);
      summary.totalPaidAmount += Number(payment.paid_amount || 0);
      summary.totalBalanceDue += Number(payment.balance_due || 0);
      summary.totalOverdue30 += Number(payment.overdue_30_days || 0);
      summary.totalOverdue60 += Number(payment.overdue_60_days || 0);
      summary.totalOverdue90 += Number(payment.overdue_90_days || 0);
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
      totalOverdue: (summary?.totalOverdue30 || 0) + (summary?.totalOverdue60 || 0) + (summary?.totalOverdue90 || 0),
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

  // Handle Pay All amount input changes
  const handlePayAllAmountChange = (e) => {
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
    
    setPayAllAmount(value);
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

  const handleDownloadStatement = async () => {
    if (!costCentersWithPayments.length) {
      toast({
        variant: "destructive",
        title: "No data",
        description: "No cost centers available for statement."
      });
      return;
    }

    setIsGeneratingStatement(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const rightX = pageWidth - 14;
      const logoDataUrl = await loadLogoDataUrl();

      // Header
      doc.addImage(logoDataUrl, 'PNG', 14, 12, 42, 22);
      doc.setFontSize(10);
      doc.text('Soltrack (PTY) LTD', rightX, 16, { align: 'right' });
      doc.text('Reg No: 2018/095975/07', rightX, 22, { align: 'right' });
      doc.text('VAT No.: 4580161802', rightX, 28, { align: 'right' });
      doc.setLineWidth(0.2);
      doc.line(14, 40, rightX, 40);

      // Title
      doc.setFontSize(12);
      doc.text('Debtor Statement', pageWidth / 2, 48, { align: 'center' });

      // Client block
      const clientLabel = clientLegalName || decodedCode || code;
      doc.setFontSize(9);
      doc.text(clientLabel || 'Client', 14, 60);
      doc.text('Debtor Statement :', pageWidth / 2 + 10, 60);
      doc.text('Date:', pageWidth / 2 + 10, 66);
      doc.text(new Date().toLocaleDateString('en-GB'), rightX, 66, { align: 'right' });

      // Account info header table
      const tableTop = 80;
      doc.rect(14, tableTop, rightX - 14, 12);
      doc.line(14 + 40, tableTop, 14 + 40, tableTop + 12);
      doc.line(14 + 90, tableTop, 14 + 90, tableTop + 12);
      doc.line(14 + 120, tableTop, 14 + 120, tableTop + 12);
      doc.setFontSize(8);
      doc.text('Account', 16, tableTop + 8);
      doc.text('Your Reference', 14 + 42, tableTop + 8);
      doc.text('VAT %', 14 + 92, tableTop + 8);
      doc.text('Customer Vat Number', 14 + 122, tableTop + 8);

      const firstAccount = (decodedCode || code || '').split(',')[0]?.trim() || '';
      doc.text(firstAccount || '-', 16, tableTop + 18);
      doc.text('-', 14 + 42, tableTop + 18);
      doc.text('15%', 14 + 92, tableTop + 18);
      doc.text('-', 14 + 122, tableTop + 18);

      // Statement table
      let y = 104;
      doc.setFontSize(8);
      doc.rect(14, y, rightX - 14, 8);
      doc.text('Date', 16, y + 5);
      doc.text('Client', 40, y + 5);
      doc.text('Invoice No.', 92, y + 5);
      doc.text('Total Invoiced', 122, y + 5);
      doc.text('Paid', 150, y + 5);
      doc.text('Credited', 165, y + 5);
      doc.text('Outstanding', 182, y + 5);

      y += 10;
      const statementRows = costCentersWithPayments
        .filter(cc => (cc.balanceDue || 0) > 0)
        .map(cc => ({
          date: cc.invoiceDate || cc.dueDate || cc.billingMonth || '',
          client: cc.accountName || clientLabel,
          invoiceNo: cc.reference || cc.accountNumber,
          totalInvoiced: cc.dueAmount || 0,
          paid: cc.paidAmount || 0,
          credited: 0,
          outstanding: cc.balanceDue || 0
        }));

      if (statementRows.length === 0) {
        doc.text('No outstanding balances.', 16, y);
        y += 10;
      } else {
        statementRows.forEach(row => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          doc.text(row.date ? new Date(row.date).toLocaleDateString('en-GB') : '-', 16, y);
          doc.text(String(row.client || '').slice(0, 20), 40, y);
          doc.text(String(row.invoiceNo || '').slice(0, 12), 92, y);
          doc.text(formatCurrency(row.totalInvoiced), 140, y, { align: 'right' });
          doc.text(formatCurrency(row.paid), 158, y, { align: 'right' });
          doc.text(formatCurrency(row.credited), 174, y, { align: 'right' });
          doc.text(formatCurrency(row.outstanding), rightX, y, { align: 'right' });
          y += 6;
        });
      }

      const totalDue = statementRows.reduce((sum, row) => sum + row.outstanding, 0);
      doc.text(`Total: ${formatCurrency(totalDue)}`, rightX, y + 4, { align: 'right' });

      // Aging summary
      const agingSummary = costCentersWithPayments.reduce(
        (sum, cc) => {
          const buckets = getAgingBuckets(cc);
          sum.current += buckets.current;
          sum.days30 += buckets.days30;
          sum.days60 += buckets.days60;
          sum.days90 += buckets.days90;
          sum.days91Plus += buckets.days91Plus;
          return sum;
        },
        { current: 0, days30: 0, days60: 0, days90: 0, days91Plus: 0 }
      );
      const overdue30 = agingSummary.days30;
      const overdue60 = agingSummary.days60;
      const overdue90 = agingSummary.days90;
      const overdue120 = agingSummary.days91Plus;
      const currentDue = agingSummary.current;

      const agingTop = y + 14;
      doc.rect(14, agingTop, rightX - 14, 12);
      const colWidth = (rightX - 14) / 5;
      doc.line(14 + colWidth, agingTop, 14 + colWidth, agingTop + 12);
      doc.line(14 + colWidth * 2, agingTop, 14 + colWidth * 2, agingTop + 12);
      doc.line(14 + colWidth * 3, agingTop, 14 + colWidth * 3, agingTop + 12);
      doc.line(14 + colWidth * 4, agingTop, 14 + colWidth * 4, agingTop + 12);
      doc.setFontSize(8);
      doc.text('120 Days', 14 + colWidth * 0.5, agingTop + 5, { align: 'center' });
      doc.text('90 Days', 14 + colWidth * 1.5, agingTop + 5, { align: 'center' });
      doc.text('60 Days', 14 + colWidth * 2.5, agingTop + 5, { align: 'center' });
      doc.text('30 Days', 14 + colWidth * 3.5, agingTop + 5, { align: 'center' });
      doc.text('Current', 14 + colWidth * 4.5, agingTop + 5, { align: 'center' });

      doc.text(formatCurrency(overdue120), 14 + colWidth * 0.5, agingTop + 10, { align: 'center' });
      doc.text(formatCurrency(overdue90), 14 + colWidth * 1.5, agingTop + 10, { align: 'center' });
      doc.text(formatCurrency(overdue60), 14 + colWidth * 2.5, agingTop + 10, { align: 'center' });
      doc.text(formatCurrency(overdue30), 14 + colWidth * 3.5, agingTop + 10, { align: 'center' });
      doc.text(formatCurrency(currentDue), 14 + colWidth * 4.5, agingTop + 10, { align: 'center' });

      // Footer
      const footerTop = 250;
      doc.line(14, footerTop, rightX, footerTop);
      doc.setFontSize(7);
      doc.text('Head Office :', 14, footerTop + 8);
      doc.text('8 Viscount Road', 14, footerTop + 12);
      doc.text('Viscount office park, Block C unit 4 & 5', 14, footerTop + 16);
      doc.text('Bedfordview, 2008', 14, footerTop + 20);

      doc.text('Postal Address :', 74, footerTop + 8);
      doc.text('P.O Box 95603', 74, footerTop + 12);
      doc.text('Grant Park 2051', 74, footerTop + 16);

      doc.text('Contact Details :', 118, footerTop + 8);
      doc.text('Phone: 011 824 0066', 118, footerTop + 12);
      doc.text('Email: sales@soltrack.co.za', 118, footerTop + 16);
      doc.text('Website: www.soltrack.co.za', 118, footerTop + 20);

      doc.text('Soltrack (PTY) LTD', 170, footerTop + 8);
      doc.text('Nedbank Northrand', 170, footerTop + 12);
      doc.text('Code - 146905', 170, footerTop + 16);
      doc.text('A/C No. - 1469109069', 170, footerTop + 20);

      doc.save(`Statement-${clientLegalName || decodedCode || 'Client'}.pdf`);
    } catch (error) {
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
        balanceDue: payment.balance_due || 0,
        paymentStatus: payment.payment_status || 'pending',
        reference,
        billingMonth: payment.billing_month,
        overdue30Days: payment.overdue_30_days || 0,
        overdue60Days: payment.overdue_60_days || 0,
        overdue90Days: payment.overdue_90_days || 0,
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
          one_month: Number(payment.due_amount || 0),
          '2nd_month': 0,
          '3rd_month': 0,
          amount_due: Number(payment.balance_due || 0),
          monthly_amount: Number(payment.due_amount || 0),
          payment_status: payment.payment_status,
          billing_month: payment.billing_month,
          reference,
          overdue_30_days: Number(payment.overdue_30_days || 0),
          overdue_60_days: Number(payment.overdue_60_days || 0),
          overdue_90_days: Number(payment.overdue_90_days || 0)
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
        totalOverdue: (summary?.totalOverdue30 || 0) + (summary?.totalOverdue60 || 0) + (summary?.totalOverdue90 || 0),
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
          totalOverdue: allVehicles.reduce((sum, v) => sum + (v.overdue_30_days || 0) + (v.overdue_60_days || 0) + (v.overdue_90_days || 0), 0),
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
          totalOverdue: allVehicles.reduce((sum, v) => sum + (v.overdue_30_days || 0) + (v.overdue_60_days || 0) + (v.overdue_90_days || 0), 0),
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
                  overdue: (paymentData.payment.overdue_30_days || 0) + (paymentData.payment.overdue_60_days || 0) + (paymentData.payment.overdue_90_days || 0),
                  totalPaid: paymentData.payment.paid_amount || 0,
                  monthlyAmount: paymentData.payment.due_amount || 0,
                  firstMonth: paymentData.payment.overdue_30_days || 0
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

  const handlePayCostCenter = (costCenter) => {
    setPaymentDetails({
      type: 'costCenter',
      title: `Pay Cost Center: ${costCenter.accountName || costCenter.accountNumber}`,
      amount: getOutstandingAmount(costCenter),
      description: `Amount owed for ${costCenter.accountName || costCenter.accountNumber} (${costCenter.accountNumber})`,
      costCenter: costCenter
    });
    setEnteredAmount('');
    setPaymentReference('');
    setShowPaymentModal(true);
  };

  const handlePayAllCostCenters = () => {
    const outstandingCostCenters = costCentersWithPayments.filter(cc => cc.balanceDue > 0);
    
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
    
    // Calculate initial total using balanceDue
    const totalAmount = outstandingCostCenters.reduce((sum, cc) => sum + cc.balanceDue, 0);
    setPayAllAmount(totalAmount.toString());
    setPayAllReference('');
    
    setShowPayAllModal(true);
  };

  const handleCostCenterSelection = (accountNumber, selected) => {
    setSelectedCostCenters(prev => prev.map(cc => 
      cc.accountNumber === accountNumber 
        ? { ...cc, selected }
        : cc
    ));
    
    // Recalculate total based on selected cost centers
    const newSelected = selectedCostCenters.map(cc => 
      cc.accountNumber === accountNumber 
        ? { ...cc, selected }
        : cc
    );
    
    const totalAmount = newSelected
      .filter(cc => cc.selected)
      .reduce((sum, cc) => sum + cc.balanceDue, 0);
    
    setPayAllAmount(totalAmount.toString());
  };

  const handlePayAllSubmit = async () => {
    const amount = parseFloat(payAllAmount);
    
    if (amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid payment amount greater than 0."
      });
      return;
    }

    if (!payAllReference.trim()) {
      toast({
        variant: "destructive",
        title: "Payment Reference Required",
        description: "Please enter a payment reference for bulk payments."
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
      const bulkPayments = selectedCostCentersToPay.map(costCenter => ({
        accountNumber: costCenter.accountNumber,
        accountInvoiceId: costCenter.accountInvoiceId || costCenter.account_invoice_id || null,
        billingMonth: costCenter.billingMonth || null,
        amount: costCenter.balanceDue
      }));

      const response = await fetch('/api/payments/bulk-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payments: bulkPayments,
          paymentReference: payAllReference.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bulk payment failed');
      }

      const result = await response.json();
      const successCount = result.summary.successful;
      const errors = result.errors || [];

      await refreshVisibleClientData();

      toast({
        title: successCount === selectedCostCentersToPay.length ? "Bulk Payment Successful" : "Bulk Payment Completed",
        description:
          errors.length > 0
            ? `${successCount} payment(s) processed. ${errors.length} failed.`
            : `${successCount} payment(s) processed successfully.`,
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

    // Validate payment reference for bulk payments
    if (paymentDetails.type === 'allCostCenters' && !paymentReference.trim()) {
      toast({
        variant: "destructive",
        title: "Payment Reference Required",
        description: "Please enter a payment reference for bulk payments to help track the transaction."
      });
      return;
    }

    // Check if payment exceeds amount due
    if (amount > paymentDetails.amount) {
      toast({
        variant: "destructive",
        title: "Payment Too High",
        description: `Payment amount (${formatCurrency(amount)}) cannot exceed amount due (${formatCurrency(paymentDetails.amount)}).`
      });
      return;
    }
    
    if (paymentDetails.type === 'costCenter') {
      setProcessingPayment(true);
      try {
        // Process payment through API using payments_ table
        const response = await fetch('/api/payments/process-payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountNumber: paymentDetails.costCenter.accountNumber,
            accountInvoiceId:
              paymentDetails.costCenter.accountInvoiceId ||
              paymentDetails.costCenter.account_invoice_id ||
              null,
            billingMonth: paymentDetails.costCenter.billingMonth || null,
            amount: amount,
            paymentReference: paymentReference || `Payment for ${paymentDetails.costCenter.accountNumber}`,
            paymentType: 'cost_center_payment'
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
          const message = newBalanceDue === 0 
            ? `Payment of ${formatCurrency(amount)} processed successfully! Balance due is now R 0.00. Status: ${paymentStatus}`
            : `Payment of ${formatCurrency(amount)} processed successfully! New balance due: ${formatCurrency(newBalanceDue)}. Status: ${paymentStatus}`;
          
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
  };

  const closePayAllModal = () => {
    setShowPayAllModal(false);
    setSelectedCostCenters([]);
    setPayAllAmount('');
    setPayAllReference('');
    setProcessingPayment(false);
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
  const handleShowDueReport = async (costCenter) => { // Renamed function
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
      
      setSelectedCostCenterForReport({
        ...costCenter,
        paymentData: payment
      });
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
                  onClick={handleDownloadStatement}
                  size="sm"
                  variant="outline"
                  disabled={isGeneratingStatement || costCentersWithPayments.length === 0}
                >
                  {isGeneratingStatement ? 'Preparing...' : 'Download Statement'}
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
                onClick={handleDownloadStatement}
                size="sm"
                variant="outline"
                disabled={isGeneratingStatement || costCentersWithPayments.length === 0}
              >
                {isGeneratingStatement ? 'Preparing...' : 'Download Statement'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto p-6 max-w-7xl container">
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
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3 mb-6">
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
                <div className="font-bold text-red-600 text-lg">
                  {formatCurrency(overviewTotals.due)}
                </div>
                <p className="text-gray-500 text-xs">Total Amount Due</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-white shadow-lg mb-6 border-2 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search cost centers by company name, account number, stock code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>



        {/* Cost Centers Table */}
        <Card className="bg-white shadow-lg border-2 border-gray-200">
          <CardHeader className="bg-gray-50 border-gray-200 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-gray-900 text-lg">Cost Centers</CardTitle>
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
                    onClick={() => handleDueForAllCostCenters()}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg px-4 py-2 rounded-lg text-white transition-all duration-200"
                  >
                    <AlertTriangle className="mr-2 w-4 h-4" />
                    Due for All
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
                            onClick={() => handleShowInvoiceReport(costCenter)}
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
                            onClick={() => handleShowDueReport(costCenter)}
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
          <div className="flex flex-col bg-white shadow-xl rounded-lg w-full max-w-md max-h-[90vh]">
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
                  {formatCurrency(paymentDetails.amount)}
                </div>
                <p className="text-gray-600 text-sm">{paymentDetails.description}</p>
                
                {/* Payment Info Box */}
                <div className="bg-blue-50 mt-4 p-3 border border-blue-200 rounded-lg">
                  <div className="space-y-1 text-blue-800 text-xs">
                    <div className="flex justify-between">
                      <span>Current Amount Due:</span>
                      <span className="font-semibold">{formatCurrency(paymentDetails.amount)}</span>
                    </div>
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
                    Max: {formatCurrency(paymentDetails.amount)}
                  </span>
                </div>
              </div>

              {/* Payment Reference Input */}
              <div className="mb-6">
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  Payment Reference {paymentDetails.type === 'allCostCenters' ? '(Required)' : '(Optional)'}
                  {paymentDetails.type === 'allCostCenters' && <span className="ml-1 text-red-500">*</span>}
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
                  {paymentDetails.type === 'allCostCenters' 
                    ? 'Payment reference is required for bulk payments to help track the transaction.'
                    : 'Add a reference to help track this payment (e.g., invoice number, check number)'
                  }
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
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 text-sm">Remaining After Payment:</span>
                  <span className={`font-semibold text-sm ${
                    (paymentDetails.amount - getNumericAmount()) > 0 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.max(0, paymentDetails.amount - getNumericAmount()))}
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
                  disabled={!enteredAmount || getNumericAmount() <= 0 || processingPayment || (paymentDetails.type === 'allCostCenters' && !paymentReference.trim())}
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
              {/* Payment Fields - Moved to Top */}
              <div className="mb-6">
                <h5 className="mb-3 font-semibold text-gray-700">Payment Details</h5>
                
                {/* Payment Amount Input */}
                <div className="mb-4">
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Payment Amount
                  </label>
                  <div className="relative">
                    <span className="top-1/2 left-3 absolute font-semibold text-gray-500 -translate-y-1/2 transform">
                      R
                    </span>
                    <Input
                      type="text"
                      value={payAllAmount}
                      onChange={handlePayAllAmountChange}
                      placeholder="0.00"
                      disabled={processingPayment}
                      className="disabled:opacity-50 py-3 pr-4 pl-8 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono text-lg disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="text-gray-500">
                      Enter total payment amount
                    </span>
                    <span className="font-medium text-blue-600">
                      Selected Total: {formatCurrency(selectedCostCenters.filter(cc => cc.selected).reduce((sum, cc) => sum + getOutstandingAmount(cc), 0))}
                    </span>
                  </div>
                </div>

                {/* Payment Reference Input */}
                <div className="mb-4">
                  <label className="block mb-2 font-medium text-gray-700 text-sm">
                    Payment Reference <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={payAllReference}
                    onChange={(e) => setPayAllReference(e.target.value)}
                    placeholder="Enter payment reference for all payments..."
                    disabled={processingPayment}
                    className="disabled:opacity-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-gray-500 text-xs">
                    This reference will be used for all selected cost center payments
                  </p>
                </div>
              </div>

              <div className="mb-6 text-center">
                <div className="flex justify-center items-center bg-blue-100 mx-auto mb-4 rounded-full w-16 h-16">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="mb-2 font-bold text-gray-900 text-xl">Bulk Payment</h4>
                <p className="text-gray-600 text-sm">Select cost centers and enter payment details</p>
              </div>

              {/* Cost Centers Selection */}
              <div className="mb-6">
                <h5 className="mb-3 font-semibold text-gray-700">Select Cost Centers to Pay</h5>
                <div className="space-y-2 p-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {selectedCostCenters.map((costCenter) => (
                    <div key={costCenter.accountNumber} className="flex items-center space-x-3 hover:bg-gray-50 p-2 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        id={`cc-${costCenter.accountNumber}`}
                        checked={costCenter.selected}
                        onChange={(e) => handleCostCenterSelection(costCenter.accountNumber, e.target.checked)}
                        className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-600"
                      />
                      <label htmlFor={`cc-${costCenter.accountNumber}`} className="flex-1 cursor-pointer">
                        <div className="font-medium text-gray-900 text-sm">{costCenter.accountName}</div>
                        <div className="text-gray-500 text-xs">
                          {costCenter.accountNumber} • Amount Due: {formatCurrency(getOutstandingAmount(costCenter))}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Amount Display */}
              <div className="bg-blue-50 mb-6 p-4 border border-blue-200 rounded-lg">
                <div className="text-center">
                  <div className="mb-1 text-blue-600 text-sm">Total Amount for Selected Cost Centers</div>
                  <div className="font-bold text-blue-700 text-3xl">
                    {formatCurrency(selectedCostCenters.filter(cc => cc.selected).reduce((sum, cc) => sum + getOutstandingAmount(cc), 0))}
                  </div>
                  <div className="mt-1 text-blue-600 text-sm">
                    {selectedCostCenters.filter(cc => cc.selected).length} cost center(s) selected
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
                  disabled={!payAllAmount || parseFloat(payAllAmount) <= 0 || !payAllReference.trim() || processingPayment || selectedCostCenters.filter(cc => cc.selected).length === 0}
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

      {/* Statement Component */}
      {showDueReport && selectedCostCenterForReport && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="flex flex-col bg-white shadow-xl rounded-lg w-full max-w-6xl max-h-[95vh]">
            {/* Modal Header */}
            <div className="flex flex-shrink-0 justify-between items-center p-6 border-gray-200 border-b">
              <h3 className="font-semibold text-gray-900 text-xl">Statement - {selectedCostCenterForReport.accountNumber}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDueReport(false);
                  setSelectedCostCenterForReport(null);
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
