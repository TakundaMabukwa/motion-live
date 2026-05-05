'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Car,
  FileText,
  DollarSign,
  Clock,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  Building2,
  Hash,
  Wrench,
  CheckCircle2,
  Timer,
  CreditCard,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';

interface JobCard {
  id: string;
  job_number: string;
  order_number?: string;
  job_type: string;
  job_sub_type?: string;
  job_description: string;
  status: string;
  job_status: string;
  priority: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  created_at: string;
  updated_at: string;
  job_date: string;
  due_date: string;
  completion_date: string;
  new_account_number: string;
  quotation_number: string;
  quotation_total_amount: number;
  estimated_cost: number;
  actual_cost: number;
  estimated_duration_hours: number;
  technician_name: string;
  technician_phone: string;
  work_notes: string;
  completion_notes: string;
  parts_required: unknown[];
  quotation_products?: unknown;
  billing_statuses?: Record<string, unknown> | null;
}

type QuotationProduct = Record<string, unknown>;

type BilledItem = {
  id: string;
  source: 'Quotation' | 'Invoice';
  description: string;
  code: string;
  category: string;
  purchaseType: string;
  quantity: number;
  unitExVat: number;
  vatAmount: number;
  totalInclVat: number;
};

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchJobDetails(params.id as string);
    }
  }, [params.id]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/job-cards/${jobId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      
      const jobData = await response.json();
      setJob(jobData);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount || 0);
  };

  const toFiniteNumber = (value: unknown): number => {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseArrayValue = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const parseQuotationProducts = (value: unknown): QuotationProduct[] =>
    parseArrayValue(value).filter(
      (item): item is QuotationProduct =>
        typeof item === 'object' && item !== null,
    );

  const getFirstText = (...values: unknown[]): string =>
    values
      .map((value) => String(value || '').trim())
      .find((value) => value.length > 0) || '';

  const getQuotationUnitPrice = (product: QuotationProduct): number => {
    const purchaseType = String(product.purchase_type || '').trim().toLowerCase();
    const candidates =
      purchaseType === 'rental'
        ? [product.rental_price, product.unit_price_without_vat, product.unit_price, product.price]
        : purchaseType === 'subscription'
          ? [product.subscription_price, product.unit_price_without_vat, product.unit_price, product.price]
          : purchaseType === 'installation'
            ? [product.installation_price, product.unit_price_without_vat, product.unit_price, product.price]
            : purchaseType === 'de-installation'
              ? [product.de_installation_price, product.unit_price_without_vat, product.unit_price, product.price]
              : [product.cash_price, product.unit_price_without_vat, product.unit_price, product.price];

    for (const candidate of candidates) {
      const value = toFiniteNumber(candidate);
      if (value > 0) return value;
    }
    return 0;
  };

  const billedItems: BilledItem[] = (() => {
    if (!job) return [];

    const quotationItems = parseQuotationProducts(job.quotation_products).map((product, index) => {
      const quantity = Math.max(1, toFiniteNumber(product.quantity) || 1);
      const unitExVat = getQuotationUnitPrice(product);
      const explicitVat = toFiniteNumber(product.vat_amount ?? product.vat);
      const explicitTotal = toFiniteNumber(
        product.total_incl_vat ??
          product.total_including_vat ??
          product.total_price ??
          product.total,
      );
      const computedExVat = Number((quantity * unitExVat).toFixed(2));
      const totalInclVat = explicitTotal > 0 ? explicitTotal : Number((computedExVat + explicitVat).toFixed(2));
      const vatAmount =
        explicitVat > 0
          ? explicitVat
          : Number(Math.max(totalInclVat - computedExVat, 0).toFixed(2));

      return {
        id: `quotation-${index}`,
        source: 'Quotation' as const,
        description:
          getFirstText(
            product.description,
            product.name,
            product.item_description,
            product.product_name,
            product.service_name,
          ) || 'Quoted item',
        code: getFirstText(product.code, product.item_code, product.sku),
        category: getFirstText(product.category, product.product_category),
        purchaseType: getFirstText(product.purchase_type, product.purchaseType),
        quantity,
        unitExVat,
        vatAmount,
        totalInclVat,
      };
    });

    const parsedBillingStatuses =
      typeof job.billing_statuses === 'string'
        ? (() => {
            try {
              return JSON.parse(job.billing_statuses) as Record<string, unknown>;
            } catch {
              return null;
            }
          })()
        : (job.billing_statuses as Record<string, unknown> | null);

    const billingInvoice =
      parsedBillingStatuses &&
      typeof parsedBillingStatuses.invoice === 'object' &&
      parsedBillingStatuses.invoice !== null
        ? (parsedBillingStatuses.invoice as Record<string, unknown>)
        : null;

    const invoiceItemsRaw = parseArrayValue(
      billingInvoice?.line_items ??
        billingInvoice?.items ??
        billingInvoice?.products ??
        null,
    );

    const invoiceItems = invoiceItemsRaw
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item, index) => {
        const quantity = Math.max(1, toFiniteNumber(item.quantity) || 1);
        const unitExVat = toFiniteNumber(
          item.unit_price_without_vat ??
            item.unit_price ??
            item.price,
        );
        const vatAmount = toFiniteNumber(item.vat_amount ?? item.vat);
        const totalInclVat = toFiniteNumber(
          item.total_including_vat ??
            item.total_incl_vat ??
            item.total ??
            Number((quantity * unitExVat + vatAmount).toFixed(2)),
        );

        return {
          id: `invoice-${index}`,
          source: 'Invoice' as const,
          description:
            getFirstText(item.description, item.item_description, item.product_name) ||
            'Billed item',
          code: getFirstText(item.code, item.item_code, item.sku),
          category: getFirstText(item.category, item.product_category),
          purchaseType: getFirstText(item.purchase_type),
          quantity,
          unitExVat,
          vatAmount,
          totalInclVat,
        };
      });

    return [...quotationItems, ...invoiceItems];
  })();

  const billedSummary = (() => {
    const exVat = billedItems.reduce(
      (sum, item) => sum + (Number.isFinite(item.unitExVat) ? item.unitExVat * item.quantity : 0),
      0,
    );
    const vat = billedItems.reduce((sum, item) => sum + item.vatAmount, 0);
    const total = billedItems.reduce((sum, item) => sum + item.totalInclVat, 0);
    return {
      count: billedItems.length,
      exVat: Number(exVat.toFixed(2)),
      vat: Number(vat.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  })();

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const escapeHtml = (value: unknown): string =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const handlePrintReport = () => {
    if (!job) return;

    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) {
      toast.error('Please allow popups to print this job report.');
      return;
    }

    const generatedAt = new Date().toLocaleString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const billedRows =
      billedItems.length > 0
        ? billedItems
            .map(
              (item) => `
                <tr>
                  <td>${escapeHtml(item.description)}</td>
                  <td>${escapeHtml(item.source)}</td>
                  <td class="right">${escapeHtml(item.quantity)}</td>
                  <td class="right">${escapeHtml(formatCurrency(item.unitExVat))}</td>
                  <td class="right">${escapeHtml(formatCurrency(item.vatAmount))}</td>
                  <td class="right">${escapeHtml(formatCurrency(item.totalInclVat))}</td>
                </tr>
              `,
            )
            .join('')
        : `<tr><td colspan="6">No billed items found.</td></tr>`;

    const partsRows =
      Array.isArray(job.parts_required) && job.parts_required.length > 0
        ? job.parts_required
            .map((part, index) => {
              const safePart =
                typeof part === 'object' && part !== null ? (part as Record<string, unknown>) : {};
              const name =
                getFirstText(
                  safePart.description,
                  safePart.name,
                  safePart.item_description,
                  safePart.code,
                ) || `Part ${index + 1}`;
              const qty = toFiniteNumber(safePart.quantity) || 1;
              return `
                <tr>
                  <td>${escapeHtml(name)}</td>
                  <td class="right">${escapeHtml(qty)}</td>
                </tr>
              `;
            })
            .join('')
        : `<tr><td colspan="2">No parts listed.</td></tr>`;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Job Report - ${escapeHtml(job.job_number)}</title>
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 18px; color: #0f172a; }
            h1 { margin: 0; font-size: 24px; }
            h2 { margin: 14px 0 6px; font-size: 15px; }
            .meta { color: #475569; font-size: 12px; margin-top: 6px; }
            .pill-row { margin-top: 8px; }
            .pill { display: inline-block; border: 1px solid #cbd5e1; border-radius: 999px; padding: 3px 10px; margin-right: 6px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 9px; font-size: 12px; vertical-align: top; }
            th { background: #f8fafc; text-align: left; color: #1e293b; }
            .right { text-align: right; }
            .totals { margin-top: 8px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; font-size: 12px; }
            .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
            .notes { white-space: pre-wrap; word-break: break-word; }
            @media print { body { margin: 10mm; } }
          </style>
        </head>
        <body>
          <h1>Job Card Report</h1>
          <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
          <div class="pill-row">
            <span class="pill">Job: ${escapeHtml(job.job_number || 'N/A')}</span>
            <span class="pill">Order: ${escapeHtml(job.order_number || 'N/A')}</span>
            <span class="pill">Account: ${escapeHtml(job.new_account_number || 'N/A')}</span>
            <span class="pill">Status: ${escapeHtml(job.job_status || job.status || 'N/A')}</span>
          </div>

          <h2>Job Details</h2>
          <table>
            <tr><th>Customer</th><td>${escapeHtml(job.customer_name || 'N/A')}</td><th>Contact Person</th><td>${escapeHtml((job as Record<string, unknown>).contact_person || 'N/A')}</td></tr>
            <tr><th>Email</th><td>${escapeHtml(job.customer_email || 'N/A')}</td><th>Phone</th><td>${escapeHtml(job.customer_phone || 'N/A')}</td></tr>
            <tr><th>Job Type</th><td>${escapeHtml(job.job_type || 'N/A')}</td><th>Sub Type</th><td>${escapeHtml(job.job_sub_type || 'N/A')}</td></tr>
            <tr><th>Vehicle</th><td>${escapeHtml(job.vehicle_registration || 'N/A')}</td><th>Make/Model</th><td>${escapeHtml(`${job.vehicle_make || ''} ${job.vehicle_model || ''}`.trim() || 'N/A')}</td></tr>
            <tr><th>Created</th><td>${escapeHtml(formatDate(job.created_at))}</td><th>Updated</th><td>${escapeHtml(formatDate(job.updated_at))}</td></tr>
            <tr><th>Description</th><td colspan="3" class="notes">${escapeHtml(job.job_description || 'N/A')}</td></tr>
          </table>

          <h2>Billed Items</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Source</th>
                <th class="right">Qty</th>
                <th class="right">Unit Ex VAT</th>
                <th class="right">VAT</th>
                <th class="right">Total Incl</th>
              </tr>
            </thead>
            <tbody>
              ${billedRows}
            </tbody>
          </table>
          <div class="totals">
            <div class="box">Ex VAT: <strong>${escapeHtml(formatCurrency(billedSummary.exVat))}</strong></div>
            <div class="box">VAT: <strong>${escapeHtml(formatCurrency(billedSummary.vat))}</strong></div>
            <div class="box">Total Incl: <strong>${escapeHtml(formatCurrency(billedSummary.total || job.quotation_total_amount || 0))}</strong></div>
          </div>

          <h2>Parts Required</h2>
          <table>
            <thead>
              <tr>
                <th>Part</th>
                <th class="right">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${partsRows}
            </tbody>
          </table>

          <h2>Notes</h2>
          <table>
            <tr><th>Work Notes</th><td class="notes">${escapeHtml(job.work_notes || '-')}</td></tr>
            <tr><th>Completion Notes</th><td class="notes">${escapeHtml(job.completion_notes || '-')}</td></tr>
          </table>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 w-8 h-8 animate-spin" />
          <p>Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 w-8 h-8 text-red-500" />
          <p>Job not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <h1 className="text-lg font-semibold text-slate-900">Job #{job.job_number}</h1>
                <span className="text-slate-500">•</span>
                <span className="text-sm text-slate-600">{job.customer_name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrintReport}>
                <Printer className="mr-2 w-4 h-4" />
                Print Report
              </Button>
              <Badge className={`${getStatusColor(job.job_status || job.status)} text-xs`}>
                {job.job_status || job.status || 'Unknown'}
              </Badge>
              {job.priority && (
                <Badge variant="outline" className="text-xs">
                  {job.priority}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
          <Card className="border-0 shadow-sm border-l-4 border-l-blue-400">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Account</p>
                  <p className="text-sm font-semibold text-slate-900">{job.new_account_number || 'Unassigned'}</p>
                </div>
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm border-l-4 border-l-emerald-400">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Quote Value</p>
                  <p className="text-sm font-semibold text-emerald-700">{formatCurrency(job.quotation_total_amount)}</p>
                </div>
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Duration</p>
                  <p className="text-sm font-semibold text-amber-700">{job.estimated_duration_hours || 'TBD'} hrs</p>
                </div>
                <Timer className="w-5 h-5 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm border-l-4 border-l-violet-400">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Billed Items</p>
                  <p className="text-sm font-semibold text-violet-700">{billedSummary.count}</p>
                </div>
                <Wrench className="w-5 h-5 text-violet-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm border-l-4 border-l-rose-400">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Billed Total</p>
                  <p className="text-sm font-semibold text-rose-700">
                    {formatCurrency(billedSummary.total || job.quotation_total_amount || 0)}
                  </p>
                </div>
                <CreditCard className="w-5 h-5 text-rose-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Job Details */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-blue-50 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-blue-800">
                  <Hash className="w-4 h-4 text-blue-600" />
                  Job Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Job Number</label>
                      <p className="text-sm font-medium text-slate-900">{job.job_number}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Job Type</label>
                      <p className="text-sm font-medium text-slate-900 capitalize">{job.job_type}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Created</label>
                      <p className="text-sm font-medium text-slate-900">{formatDate(job.created_at)}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Quotation</label>
                      <p className="text-sm font-medium text-slate-900">{job.quotation_number || 'Not assigned'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Order Number</label>
                      <p className="text-sm font-medium text-slate-900">{job.order_number || 'Not assigned'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Priority</label>
                      <p className="text-sm font-medium text-slate-900 capitalize">{job.priority || 'Medium'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Updated</label>
                      <p className="text-sm font-medium text-slate-900">{formatDate(job.updated_at)}</p>
                    </div>
                  </div>
                </div>
                
                {job.job_description && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Description</label>
                      <p className="text-sm text-slate-700 mt-1">{job.job_description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-green-50 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-green-800">
                  <User className="w-4 h-4 text-green-600" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Name</label>
                      <p className="text-sm font-medium text-slate-900">{job.customer_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Email</label>
                      <div className="flex items-center gap-1">
                        {job.customer_email ? (
                          <>
                            <Mail className="w-3 h-3 text-slate-400" />
                            <p className="text-sm text-slate-900">{job.customer_email}</p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">Not provided</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Phone</label>
                      <div className="flex items-center gap-1">
                        {job.customer_phone ? (
                          <>
                            <Phone className="w-3 h-3 text-slate-400" />
                            <p className="text-sm text-slate-900">{job.customer_phone}</p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">Not provided</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {job.customer_address && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Address</label>
                      <div className="flex items-start gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 mt-0.5" />
                        <p className="text-sm text-slate-700">{job.customer_address}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Vehicle Information */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-orange-50 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-orange-800">
                  <Car className="w-4 h-4 text-orange-600" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Registration</label>
                    <p className="text-sm font-medium text-slate-900">{job.vehicle_registration || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Make & Model</label>
                    <p className="text-sm font-medium text-slate-900">
                      {job.vehicle_make && job.vehicle_model 
                        ? `${job.vehicle_make} ${job.vehicle_model}` 
                        : 'Not provided'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Year</label>
                    <p className="text-sm font-medium text-slate-900">{job.vehicle_year || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billed Items */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-rose-50 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-rose-800">
                  <CreditCard className="w-4 h-4 text-rose-600" />
                  Billed Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {billedItems.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">
                    No billed items found on this job card yet.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Item</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Source</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Qty</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Unit Ex VAT</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">VAT</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Total Incl</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {billedItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 align-top">
                                <div className="text-sm font-medium text-slate-900">{item.description}</div>
                                <div className="text-xs text-slate-500">
                                  {[item.code, item.category, item.purchaseType].filter(Boolean).join(" | ") || "No extra detail"}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <Badge variant={item.source === 'Invoice' ? 'default' : 'outline'} className="text-[11px]">
                                  {item.source}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-right text-sm text-slate-800">{item.quantity}</td>
                              <td className="px-3 py-2 text-right text-sm text-slate-800">{formatCurrency(item.unitExVat)}</td>
                              <td className="px-3 py-2 text-right text-sm text-slate-800">{formatCurrency(item.vatAmount)}</td>
                              <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">{formatCurrency(item.totalInclVat)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="bg-slate-50 border-t px-4 py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div className="text-slate-600">
                          Ex VAT: <span className="font-semibold text-slate-900">{formatCurrency(billedSummary.exVat)}</span>
                        </div>
                        <div className="text-slate-600">
                          VAT: <span className="font-semibold text-slate-900">{formatCurrency(billedSummary.vat)}</span>
                        </div>
                        <div className="text-slate-600 sm:text-right">
                          Total Incl: <span className="font-semibold text-slate-900">{formatCurrency(billedSummary.total)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Scheduling */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-purple-50 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-purple-800">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Job Date</label>
                  <p className="text-sm text-slate-900">{formatDate(job.job_date)}</p>
                </div>
                <Separator />
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Due Date</label>
                  <p className="text-sm text-slate-900">{formatDate(job.due_date)}</p>
                </div>
                {job.completion_date && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Completed</label>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <p className="text-sm text-slate-900">{formatDate(job.completion_date)}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Technician */}
            {job.technician_name && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-cyan-50 border-b pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-cyan-800">
                    <User className="w-4 h-4 text-cyan-600" />
                    Technician
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Assigned To</label>
                    <p className="text-sm text-slate-900">{job.technician_name}</p>
                  </div>
                  {job.technician_phone && (
                    <>
                      <Separator />
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">Contact</label>
                        <p className="text-sm text-slate-900">{job.technician_phone}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Financial */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-emerald-50 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Financial
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {job.quotation_total_amount > 0 && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Quote Total</label>
                    <p className="text-base font-semibold text-slate-900">{formatCurrency(job.quotation_total_amount)}</p>
                  </div>
                )}
                {job.estimated_cost > 0 && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Estimated</label>
                      <p className="text-sm text-slate-900">{formatCurrency(job.estimated_cost)}</p>
                    </div>
                  </>
                )}
                {job.actual_cost > 0 && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">Actual</label>
                      <p className="text-sm text-slate-900">{formatCurrency(job.actual_cost)}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Duration */}
            {job.estimated_duration_hours && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-amber-50 border-b pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Duration
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Estimated</label>
                    <p className="text-base font-semibold text-slate-900">{job.estimated_duration_hours} hours</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Notes */}
        {(job.work_notes || job.completion_notes) && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-indigo-50 border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-indigo-800">
                <FileText className="w-4 h-4 text-indigo-600" />
                Notes & Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {job.work_notes && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Work Notes</label>
                  <div className="mt-1 p-3 bg-blue-50 rounded border-l-2 border-blue-300">
                    <p className="text-sm text-slate-700">{job.work_notes}</p>
                  </div>
                </div>
              )}
              {job.completion_notes && (
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Completion Notes</label>
                  <div className="mt-1 p-3 bg-green-50 rounded border-l-2 border-green-300">
                    <p className="text-sm text-slate-700">{job.completion_notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Parts Required */}
        {job.parts_required?.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-violet-50 border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-violet-800">
                <Wrench className="w-4 h-4 text-violet-600" />
                Parts Required
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {job.parts_required.map((part, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-violet-50 rounded border">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-violet-400 rounded-full"></div>
                      <span className="text-sm text-slate-900">{part.description || part.code}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Qty: {part.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
