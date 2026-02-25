'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  Calendar,
  Car,
  CheckCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  Package,
  Phone,
  RefreshCw,
  Search,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';

type QuotationProduct = {
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  type?: string;
  purchase_type?: string;
  quantity?: number | string;
  total_price?: number | string;
  cash_price?: number | string;
  rental_price?: number | string;
  subscription_price?: number | string;
  installation_price?: number | string;
  de_installation_price?: number | string;
};

interface CompletedJob {
  id: string;
  job_number?: string | null;
  job_date?: string | null;
  due_date?: string | null;
  completion_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  job_status?: string | null;
  job_type?: string | null;
  job_description?: string | null;
  priority?: string | null;
  role?: string | null;
  move_to?: string | null;
  repair?: boolean | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  contact_person?: string | null;
  new_account_number?: string | null;
  vehicle_registration?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  vin_numer?: string | null;
  odormeter?: string | null;
  ip_address?: string | null;
  qr_code?: string | null;
  technician_name?: string | null;
  technician_phone?: string | null;
  assigned_technician_id?: string | null;
  job_location?: string | null;
  site_contact_person?: string | null;
  site_contact_phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimated_duration_hours?: number | null;
  actual_duration_hours?: number | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  quotation_number?: string | null;
  quote_status?: string | null;
  quote_type?: string | null;
  quotation_job_type?: string | null;
  purchase_type?: string | null;
  quote_date?: string | null;
  quote_expiry_date?: string | null;
  quotation_subtotal?: number | null;
  quotation_vat_amount?: number | null;
  quotation_total_amount?: number | null;
  quotation_products?: unknown;
  parts_required?: unknown;
  products_required?: unknown;
  equipment_used?: unknown;
  safety_checklist_completed?: boolean | null;
  quality_check_passed?: boolean | null;
  customer_signature_obtained?: boolean | null;
  before_photos?: unknown;
  after_photos?: unknown;
  documents?: unknown;
  special_instructions?: string | null;
  access_requirements?: string | null;
  work_notes?: string | null;
  completion_notes?: string | null;
  customer_feedback?: string | null;
  customer_satisfaction_rating?: number | null;
}

type EditFormData = {
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  vin_number: string;
  odormeter: string;
  ip_address: string;
  job_location: string;
  site_contact_person: string;
  site_contact_phone: string;
  quotation_subtotal: string;
  quotation_vat_amount: string;
  quotation_total_amount: string;
  estimated_cost: string;
  actual_cost: string;
  work_notes: string;
  completion_notes: string;
  special_instructions: string;
  customer_feedback: string;
};

const EMPTY_FORM_DATA: EditFormData = {
  vehicle_registration: '',
  vehicle_make: '',
  vehicle_model: '',
  vehicle_year: '',
  vin_number: '',
  odormeter: '',
  ip_address: '',
  job_location: '',
  site_contact_person: '',
  site_contact_phone: '',
  quotation_subtotal: '',
  quotation_vat_amount: '',
  quotation_total_amount: '',
  estimated_cost: '',
  actual_cost: '',
  work_notes: '',
  completion_notes: '',
  special_instructions: '',
  customer_feedback: '',
};

const toNumberOrNull = (value: string): number | null => {
  if (!value || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringSafe = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value);
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

const parseStringArray = (value: unknown): string[] =>
  parseArrayValue(value).filter((item): item is string => typeof item === 'string' && item.length > 0);

const parseQuotationProducts = (value: unknown): QuotationProduct[] =>
  parseArrayValue(value).filter((item): item is QuotationProduct => typeof item === 'object' && item !== null);

const countFromArrayLike = (value: unknown): number => parseArrayValue(value).length;

const formatDate = (value?: string | null): string => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? toStringSafe(value) : date.toLocaleDateString();
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? toStringSafe(value) : date.toLocaleString();
};

const formatCurrency = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(value));
};

const formatBool = (value?: boolean | null): string => (value ? 'Yes' : 'No');

const getStatusColor = (status?: string | null): string => {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return 'bg-green-500';
    case 'assigned':
      return 'bg-blue-500';
    case 'pending':
      return 'bg-yellow-500';
    case 'cancelled':
      return 'bg-red-500';
    case 'on_hold':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

const getJobTypeColor = (jobType?: string | null): string => {
  switch ((jobType || '').toLowerCase()) {
    case 'install':
      return 'bg-blue-500';
    case 'deinstall':
      return 'bg-red-500';
    case 'maintenance':
      return 'bg-green-500';
    case 'repair':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
};

export default function FCCompletedJobsPage() {
  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CompletedJob | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<CompletedJob | null>(null);
  const [formData, setFormData] = useState<EditFormData>(EMPTY_FORM_DATA);
  const [finalizing, setFinalizing] = useState(false);

  const fetchCompletedJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fc/completed-jobs');
      if (!response.ok) {
        throw new Error('Failed to fetch completed jobs');
      }
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching completed jobs:', error);
      toast.error('Failed to load completed jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompletedJobs();
  }, []);

  const refreshJobs = async () => {
    setRefreshing(true);
    await fetchCompletedJobs();
  };

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const search = searchTerm.toLowerCase();
        return (
          toStringSafe(job.customer_name).toLowerCase().includes(search) ||
          toStringSafe(job.customer_phone).toLowerCase().includes(search) ||
          toStringSafe(job.job_number).toLowerCase().includes(search) ||
          toStringSafe(job.vehicle_registration).toLowerCase().includes(search) ||
          toStringSafe(job.technician_phone).toLowerCase().includes(search) ||
          toStringSafe(job.new_account_number).toLowerCase().includes(search)
        );
      }),
    [jobs, searchTerm]
  );

  const handleViewDetails = (job: CompletedJob) => {
    setSelectedJob(job);
    setShowDetails(true);
  };

  const handleEditJob = (job: CompletedJob) => {
    setEditingJob(job);
    setFormData({
      vehicle_registration: toStringSafe(job.vehicle_registration),
      vehicle_make: toStringSafe(job.vehicle_make),
      vehicle_model: toStringSafe(job.vehicle_model),
      vehicle_year: toStringSafe(job.vehicle_year),
      vin_number: toStringSafe(job.vin_numer),
      odormeter: toStringSafe(job.odormeter),
      ip_address: toStringSafe(job.ip_address),
      job_location: toStringSafe(job.job_location),
      site_contact_person: toStringSafe(job.site_contact_person),
      site_contact_phone: toStringSafe(job.site_contact_phone),
      quotation_subtotal: toStringSafe(job.quotation_subtotal),
      quotation_vat_amount: toStringSafe(job.quotation_vat_amount),
      quotation_total_amount: toStringSafe(job.quotation_total_amount),
      estimated_cost: toStringSafe(job.estimated_cost),
      actual_cost: toStringSafe(job.actual_cost),
      work_notes: toStringSafe(job.work_notes),
      completion_notes: toStringSafe(job.completion_notes),
      special_instructions: toStringSafe(job.special_instructions),
      customer_feedback: toStringSafe(job.customer_feedback),
    });
    setShowEditDialog(true);
  };

  const updateFormField = (field: keyof EditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubtotalChange = (subtotal: string) => {
    const subtotalNumber = Number(subtotal);
    if (!Number.isFinite(subtotalNumber)) {
      updateFormField('quotation_subtotal', subtotal);
      return;
    }
    const vat = (subtotalNumber * 0.15).toFixed(2);
    const total = (subtotalNumber + Number(vat)).toFixed(2);
    setFormData((prev) => ({
      ...prev,
      quotation_subtotal: subtotal,
      quotation_vat_amount: vat,
      quotation_total_amount: total,
    }));
  };

  const handleVatChange = (vat: string) => {
    const subtotal = Number(formData.quotation_subtotal);
    const vatNumber = Number(vat);
    const total =
      Number.isFinite(subtotal) && Number.isFinite(vatNumber)
        ? (subtotal + vatNumber).toFixed(2)
        : formData.quotation_total_amount;

    setFormData((prev) => ({
      ...prev,
      quotation_vat_amount: vat,
      quotation_total_amount: total,
    }));
  };

  const handleFinalizeJob = async () => {
    if (!editingJob) return;
    if (!formData.vehicle_registration.trim()) {
      toast.error('Vehicle registration is required');
      return;
    }
    if (!formData.quotation_total_amount || Number(formData.quotation_total_amount) <= 0) {
      toast.error('Total amount must be greater than 0');
      return;
    }

    try {
      setFinalizing(true);

      const finalizeData = {
        vehicle_registration: formData.vehicle_registration.trim(),
        vehicle_make: formData.vehicle_make.trim() || null,
        vehicle_model: formData.vehicle_model.trim() || null,
        vehicle_year: toNumberOrNull(formData.vehicle_year),
        vin_numer: formData.vin_number.trim() || null,
        odormeter: formData.odormeter.trim() || null,
        ip_address: formData.ip_address.trim() || null,
        job_location: formData.job_location.trim() || null,
        site_contact_person: formData.site_contact_person.trim() || null,
        site_contact_phone: formData.site_contact_phone.trim() || null,
        quotation_subtotal: toNumberOrNull(formData.quotation_subtotal),
        quotation_vat_amount: toNumberOrNull(formData.quotation_vat_amount),
        quotation_total_amount: toNumberOrNull(formData.quotation_total_amount),
        estimated_cost: toNumberOrNull(formData.estimated_cost),
        actual_cost: toNumberOrNull(formData.actual_cost),
        work_notes: formData.work_notes.trim() || null,
        completion_notes: formData.completion_notes.trim() || null,
        special_instructions: formData.special_instructions.trim() || null,
        customer_feedback: formData.customer_feedback.trim() || null,
        role: 'accounts',
        updated_by: 'fc',
      };

      const response = await fetch(`/api/job-cards/${editingJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalizeData),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Failed to update job card');
      }

      if ((editingJob.job_type || '').toLowerCase().includes('install') && formData.ip_address) {
        const vehiclePayload = {
          reg: formData.vehicle_registration.trim(),
          vin: formData.vin_number.trim(),
          make: formData.vehicle_make.trim(),
          model: formData.vehicle_model.trim(),
          year: formData.vehicle_year.trim(),
          colour: 'Unknown',
          company: editingJob.customer_name || 'Unknown',
          new_account_number: editingJob.new_account_number || editingJob.customer_name || 'Unknown',
          skylink_trailer_unit_ip: formData.ip_address.trim(),
          total_rental_sub: Number(formData.quotation_total_amount) || 0,
          total_rental: Number(formData.quotation_subtotal) || 0,
          total_sub: Number(formData.quotation_vat_amount) || 0,
        };

        const vehicleResponse = await fetch('/api/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vehiclePayload),
        });

        if (!vehicleResponse.ok) {
          console.warn('Job was finalized, but vehicle creation failed');
        }
      }

      toast.success(`Job ${editingJob.job_number || editingJob.id} finalized successfully`);
      setShowEditDialog(false);
      setEditingJob(null);
      setFormData(EMPTY_FORM_DATA);
      fetchCompletedJobs();
    } catch (error) {
      console.error('Error finalizing job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to finalize job');
    } finally {
      setFinalizing(false);
    }
  };

  const selectedJobProducts = useMemo(
    () => parseQuotationProducts(selectedJob?.quotation_products),
    [selectedJob]
  );
  const editingJobProducts = useMemo(
    () => parseQuotationProducts(editingJob?.quotation_products),
    [editingJob]
  );

  return (
    <div className="w-full px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Job Card Review</h1>
          <p className="text-gray-600">Finance Controller review and finalization</p>
        </div>
        <Button onClick={refreshJobs} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'accounts', label: 'Accounts', icon: Building2, href: '/protected/fc' },
            { id: 'quotes', label: 'Quotes', icon: FileText, href: '/protected/fc/quotes' },
            { id: 'external-quotation', label: 'External Quotation', icon: ExternalLink, href: '/protected/fc/external-quotation' },
            { id: 'completed-jobs', label: 'Job Card Review', icon: CheckCircle, href: '/protected/fc/completed-jobs' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center space-x-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by client, account code, job number, vehicle, or technician"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{filteredJobs.length} completed jobs</span>
              </div>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-purple-500" />
                <span>{filteredJobs.filter((job) => job.repair).length} repair jobs</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Job Card Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {searchTerm ? 'No jobs found for this search' : 'No completed jobs found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1300px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Job</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vehicle and Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Commercial</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Completion</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredJobs.map((job) => {
                    const products = parseQuotationProducts(job.quotation_products);
                    return (
                      <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 align-top text-gray-900">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold">{job.job_number || job.id}</h3>
                            <Badge className={getStatusColor(job.job_status)}>{job.job_status || job.status || 'N/A'}</Badge>
                            <Badge className={getJobTypeColor(job.job_type)}>{job.job_type || 'Unknown'}</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p className="line-clamp-2"><strong>Description:</strong> {job.job_description || 'No description'}</p>
                            <p><strong>Priority:</strong> {job.priority || 'N/A'}</p>
                            <p><strong>Role Flow:</strong> {job.role || 'N/A'} {job.move_to ? `-> ${job.move_to}` : ''}</p>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-gray-900">
                          <div className="space-y-1 text-sm">
                            <p className="font-medium">{job.customer_name || 'N/A'}</p>
                            <p className="text-gray-600"><strong>Account:</strong> {job.new_account_number || 'N/A'}</p>
                            <p className="text-gray-600"><strong>Contact:</strong> {job.contact_person || 'N/A'}</p>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Mail className="h-3 w-3" />
                              <span>{job.customer_email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Phone className="h-3 w-3" />
                              <span>{job.customer_phone || 'N/A'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-gray-900">
                          <div className="space-y-1 text-sm text-gray-600">
                            <p><strong>Reg:</strong> {job.vehicle_registration || 'N/A'}</p>
                            <p><strong>Vehicle:</strong> {job.vehicle_make || ''} {job.vehicle_model || ''} {job.vehicle_year || ''}</p>
                            <p><strong>VIN:</strong> {job.vin_numer || 'N/A'}</p>
                            <p><strong>ODO:</strong> {job.odormeter || 'N/A'}</p>
                            <p><strong>IP:</strong> {job.ip_address || 'N/A'}</p>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-gray-900">
                          <div className="space-y-1 text-sm text-gray-600">
                            <p><strong>Quote:</strong> {job.quotation_number || 'N/A'}</p>
                            <p><strong>Status:</strong> {job.quote_status || 'N/A'}</p>
                            <p><strong>Type:</strong> {job.purchase_type || 'N/A'} / {job.quote_type || 'N/A'}</p>
                            <p><strong>Items:</strong> {products.length}</p>
                            <p><strong>Total:</strong> {formatCurrency(job.quotation_total_amount)}</p>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-gray-900">
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span><strong>Date:</strong> {formatDate(job.completion_date || job.job_date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span><strong>Duration:</strong> {job.actual_duration_hours || job.estimated_duration_hours || 'N/A'}h</span>
                            </div>
                            <p><strong>Tech:</strong> {job.technician_name || 'N/A'}</p>
                            <p><strong>Repair:</strong> {job.repair ? 'Yes' : 'No'}</p>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-gray-900">
                          <div className="flex min-w-[160px] flex-col gap-2">
                            <Button onClick={() => handleViewDetails(job)} size="sm" variant="outline" className="w-full">
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                            <Button onClick={() => handleEditJob(job)} size="sm" className="w-full">
                              <Edit className="mr-2 h-4 w-4" />
                              Edit and Finalize
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-h-[92vh] max-w-[96vw] overflow-y-auto xl:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Job Details - {selectedJob?.job_number || selectedJob?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-gray-500">Quote Total</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedJob.quotation_total_amount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-gray-500">Quote Items</p>
                    <p className="text-lg font-semibold">{selectedJobProducts.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-gray-500">Vehicle</p>
                    <p className="text-lg font-semibold">{selectedJob.vehicle_registration || 'N/A'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-gray-500">Account</p>
                    <p className="text-lg font-semibold">{selectedJob.new_account_number || 'N/A'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs uppercase text-gray-500">Completed</p>
                    <p className="text-lg font-semibold">{formatDate(selectedJob.completion_date)}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Job and Workflow</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <p><strong>Job Number:</strong> {selectedJob.job_number || 'N/A'}</p>
                    <p><strong>Status:</strong> {selectedJob.job_status || selectedJob.status || 'N/A'}</p>
                    <p><strong>Job Type:</strong> {selectedJob.job_type || 'N/A'}</p>
                    <p><strong>Priority:</strong> {selectedJob.priority || 'N/A'}</p>
                    <p><strong>Role:</strong> {selectedJob.role || 'N/A'}</p>
                    <p><strong>Move To:</strong> {selectedJob.move_to || 'N/A'}</p>
                    <p><strong>Job Date:</strong> {formatDate(selectedJob.job_date)}</p>
                    <p><strong>Due Date:</strong> {formatDate(selectedJob.due_date)}</p>
                    <p><strong>Start Time:</strong> {formatDateTime(selectedJob.start_time)}</p>
                    <p><strong>End Time:</strong> {formatDateTime(selectedJob.end_time)}</p>
                    <p><strong>Estimated Duration:</strong> {selectedJob.estimated_duration_hours || 'N/A'}h</p>
                    <p><strong>Actual Duration:</strong> {selectedJob.actual_duration_hours || 'N/A'}h</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Client and Site</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <p><strong>Client:</strong> {selectedJob.customer_name || 'N/A'}</p>
                    <p><strong>Account Code:</strong> {selectedJob.new_account_number || 'N/A'}</p>
                    <p><strong>Email:</strong> {selectedJob.customer_email || 'N/A'}</p>
                    <p><strong>Phone:</strong> {selectedJob.customer_phone || 'N/A'}</p>
                    <p><strong>Contact Person:</strong> {selectedJob.contact_person || 'N/A'}</p>
                    <p><strong>Site Contact:</strong> {selectedJob.site_contact_person || 'N/A'}</p>
                    <p><strong>Site Phone:</strong> {selectedJob.site_contact_phone || 'N/A'}</p>
                    <p><strong>Job Location:</strong> {selectedJob.job_location || 'N/A'}</p>
                    <p><strong>Latitude:</strong> {toStringSafe(selectedJob.latitude) || 'N/A'}</p>
                    <p><strong>Longitude:</strong> {toStringSafe(selectedJob.longitude) || 'N/A'}</p>
                    <p className="md:col-span-2"><strong>Address:</strong> {selectedJob.customer_address || 'N/A'}</p>
                    <p className="md:col-span-2"><strong>Access Requirements:</strong> {selectedJob.access_requirements || 'N/A'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vehicle and Device</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <p><strong>Registration:</strong> {selectedJob.vehicle_registration || 'N/A'}</p>
                    <p><strong>Make:</strong> {selectedJob.vehicle_make || 'N/A'}</p>
                    <p><strong>Model:</strong> {selectedJob.vehicle_model || 'N/A'}</p>
                    <p><strong>Year:</strong> {selectedJob.vehicle_year || 'N/A'}</p>
                    <p><strong>VIN:</strong> {selectedJob.vin_numer || 'N/A'}</p>
                    <p><strong>Odometer:</strong> {selectedJob.odormeter || 'N/A'}</p>
                    <p><strong>IP Address:</strong> {selectedJob.ip_address || 'N/A'}</p>
                    <p><strong>QR Code:</strong> {selectedJob.qr_code || 'N/A'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Commercial</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <p><strong>Quote Number:</strong> {selectedJob.quotation_number || 'N/A'}</p>
                    <p><strong>Quote Status:</strong> {selectedJob.quote_status || 'N/A'}</p>
                    <p><strong>Quote Type:</strong> {selectedJob.quote_type || 'N/A'}</p>
                    <p><strong>Purchase Type:</strong> {selectedJob.purchase_type || 'N/A'}</p>
                    <p><strong>Quotation Job Type:</strong> {selectedJob.quotation_job_type || 'N/A'}</p>
                    <p><strong>Repair Job:</strong> {selectedJob.repair ? 'Yes' : 'No'}</p>
                    <p><strong>Quote Date:</strong> {formatDate(selectedJob.quote_date)}</p>
                    <p><strong>Quote Expiry:</strong> {formatDate(selectedJob.quote_expiry_date)}</p>
                    <p><strong>Estimated Cost:</strong> {formatCurrency(selectedJob.estimated_cost)}</p>
                    <p><strong>Actual Cost:</strong> {formatCurrency(selectedJob.actual_cost)}</p>
                    <p><strong>Subtotal:</strong> {formatCurrency(selectedJob.quotation_subtotal)}</p>
                    <p><strong>VAT:</strong> {formatCurrency(selectedJob.quotation_vat_amount)}</p>
                    <p className="md:col-span-2"><strong>Total:</strong> {formatCurrency(selectedJob.quotation_total_amount)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quotation Products</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedJobProducts.length === 0 ? (
                    <p className="text-sm text-gray-500">No quotation products available</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Name</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Category/Type</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Qty</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Purchase</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Subscription</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Install</th>
                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedJobProducts.map((product, index) => (
                            <tr key={product.id || `${product.name || 'item'}-${index}`}>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                <div className="font-medium">{product.name || 'Unnamed item'}</div>
                                <div className="text-xs text-gray-500">{product.description || 'No description'}</div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-700">
                                {product.category || 'N/A'} / {product.type || 'N/A'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-700">{toStringSafe(product.quantity) || 'N/A'}</td>
                              <td className="px-3 py-2 text-sm text-gray-700">{product.purchase_type || 'N/A'}</td>
                              <td className="px-3 py-2 text-sm text-gray-700">{toStringSafe(product.subscription_price) || 'N/A'}</td>
                              <td className="px-3 py-2 text-sm text-gray-700">{toStringSafe(product.installation_price) || 'N/A'}</td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">{toStringSafe(product.total_price) || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes and Feedback</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium">Description</p>
                      <p className="text-gray-600">{selectedJob.job_description || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Special Instructions</p>
                      <p className="text-gray-600">{selectedJob.special_instructions || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Work Notes</p>
                      <p className="text-gray-600">{selectedJob.work_notes || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Completion Notes</p>
                      <p className="text-gray-600">{selectedJob.completion_notes || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Customer Feedback</p>
                      <p className="text-gray-600">{selectedJob.customer_feedback || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium">Customer Rating</p>
                      <p className="text-gray-600">{selectedJob.customer_satisfaction_rating || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Checks, Stock and Media</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <p><strong>Safety Checklist:</strong> {formatBool(selectedJob.safety_checklist_completed)}</p>
                      <p><strong>Quality Check:</strong> {formatBool(selectedJob.quality_check_passed)}</p>
                      <p><strong>Customer Signature:</strong> {formatBool(selectedJob.customer_signature_obtained)}</p>
                      <p><strong>Before Photos:</strong> {parseStringArray(selectedJob.before_photos).length}</p>
                      <p><strong>After Photos:</strong> {parseStringArray(selectedJob.after_photos).length}</p>
                      <p><strong>Documents:</strong> {countFromArrayLike(selectedJob.documents)}</p>
                      <p><strong>Parts Required:</strong> {countFromArrayLike(selectedJob.parts_required)}</p>
                      <p><strong>Products Required:</strong> {countFromArrayLike(selectedJob.products_required)}</p>
                      <p><strong>Equipment Used:</strong> {countFromArrayLike(selectedJob.equipment_used)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[92vh] max-w-[96vw] overflow-y-auto xl:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit and Finalize - {editingJob?.job_number || editingJob?.id}
            </DialogTitle>
          </DialogHeader>

          {editingJob && (
            <div className="space-y-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="vehicle">Vehicle and Site</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing and Notes</TabsTrigger>
                  <TabsTrigger value="finalize">Finalize</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Job Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                      <p><strong>Job Number:</strong> {editingJob.job_number || 'N/A'}</p>
                      <p><strong>Client:</strong> {editingJob.customer_name || 'N/A'}</p>
                      <p><strong>Account:</strong> {editingJob.new_account_number || 'N/A'}</p>
                      <p><strong>Job Type:</strong> {editingJob.job_type || 'N/A'}</p>
                      <p><strong>Quote:</strong> {editingJob.quotation_number || 'N/A'}</p>
                      <p><strong>Quote Status:</strong> {editingJob.quote_status || 'N/A'}</p>
                      <p><strong>Current Total:</strong> {formatCurrency(editingJob.quotation_total_amount)}</p>
                      <p><strong>Products:</strong> {editingJobProducts.length}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quotation Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editingJobProducts.length === 0 ? (
                        <p className="text-sm text-gray-500">No quotation products available</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[860px]">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Item</th>
                                <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Qty</th>
                                <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Purchase Type</th>
                                <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Subscription</th>
                                <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Install</th>
                                <th className="px-3 py-2 text-left text-xs uppercase text-gray-500">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {editingJobProducts.map((product, index) => (
                                <tr key={product.id || `${product.name || 'item'}-${index}`}>
                                  <td className="px-3 py-2 text-sm text-gray-900">{product.name || 'Unnamed item'}</td>
                                  <td className="px-3 py-2 text-sm text-gray-700">{toStringSafe(product.quantity) || 'N/A'}</td>
                                  <td className="px-3 py-2 text-sm text-gray-700">{product.purchase_type || 'N/A'}</td>
                                  <td className="px-3 py-2 text-sm text-gray-700">{toStringSafe(product.subscription_price) || 'N/A'}</td>
                                  <td className="px-3 py-2 text-sm text-gray-700">{toStringSafe(product.installation_price) || 'N/A'}</td>
                                  <td className="px-3 py-2 text-sm font-medium text-gray-900">{toStringSafe(product.total_price) || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="vehicle" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Car className="h-5 w-5" />
                        Vehicle and Site Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_registration">Vehicle Registration *</Label>
                        <Input id="vehicle_registration" value={formData.vehicle_registration} onChange={(e) => updateFormField('vehicle_registration', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_make">Vehicle Make</Label>
                        <Input id="vehicle_make" value={formData.vehicle_make} onChange={(e) => updateFormField('vehicle_make', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_model">Vehicle Model</Label>
                        <Input id="vehicle_model" value={formData.vehicle_model} onChange={(e) => updateFormField('vehicle_model', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicle_year">Vehicle Year</Label>
                        <Input id="vehicle_year" type="number" value={formData.vehicle_year} onChange={(e) => updateFormField('vehicle_year', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vin_number">VIN Number</Label>
                        <Input id="vin_number" value={formData.vin_number} onChange={(e) => updateFormField('vin_number', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="odormeter">Odometer</Label>
                        <Input id="odormeter" value={formData.odormeter} onChange={(e) => updateFormField('odormeter', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ip_address">IP Address</Label>
                        <Input id="ip_address" value={formData.ip_address} onChange={(e) => updateFormField('ip_address', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="job_location">Job Location</Label>
                        <Input id="job_location" value={formData.job_location} onChange={(e) => updateFormField('job_location', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="site_contact_person">Site Contact Person</Label>
                        <Input id="site_contact_person" value={formData.site_contact_person} onChange={(e) => updateFormField('site_contact_person', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="site_contact_phone">Site Contact Phone</Label>
                        <Input id="site_contact_phone" value={formData.site_contact_phone} onChange={(e) => updateFormField('site_contact_phone', e.target.value)} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <DollarSign className="h-5 w-5" />
                        Pricing, Quote and Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="quotation_subtotal">Quotation Subtotal</Label>
                        <Input id="quotation_subtotal" type="number" step="0.01" value={formData.quotation_subtotal} onChange={(e) => handleSubtotalChange(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quotation_vat_amount">VAT Amount</Label>
                        <Input id="quotation_vat_amount" type="number" step="0.01" value={formData.quotation_vat_amount} onChange={(e) => handleVatChange(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quotation_total_amount">Quotation Total *</Label>
                        <Input id="quotation_total_amount" type="number" step="0.01" value={formData.quotation_total_amount} onChange={(e) => updateFormField('quotation_total_amount', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estimated_cost">Estimated Cost</Label>
                        <Input id="estimated_cost" type="number" step="0.01" value={formData.estimated_cost} onChange={(e) => updateFormField('estimated_cost', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actual_cost">Actual Cost</Label>
                        <Input id="actual_cost" type="number" step="0.01" value={formData.actual_cost} onChange={(e) => updateFormField('actual_cost', e.target.value)} />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="work_notes">Work Notes</Label>
                        <Textarea id="work_notes" value={formData.work_notes} onChange={(e) => updateFormField('work_notes', e.target.value)} rows={3} />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="completion_notes">Completion Notes</Label>
                        <Textarea id="completion_notes" value={formData.completion_notes} onChange={(e) => updateFormField('completion_notes', e.target.value)} rows={3} />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="special_instructions">Special Instructions</Label>
                        <Textarea id="special_instructions" value={formData.special_instructions} onChange={(e) => updateFormField('special_instructions', e.target.value)} rows={3} />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="customer_feedback">Customer Feedback</Label>
                        <Textarea id="customer_feedback" value={formData.customer_feedback} onChange={(e) => updateFormField('customer_feedback', e.target.value)} rows={2} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="finalize" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        Finalize and Move to Accounts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg bg-blue-50 p-4">
                        <h4 className="mb-2 font-medium text-blue-900">Final Review</h4>
                        <div className="grid grid-cols-1 gap-1 text-sm text-blue-900 md:grid-cols-2">
                          <p><strong>Job:</strong> {editingJob.job_number || editingJob.id}</p>
                          <p><strong>Client:</strong> {editingJob.customer_name || 'N/A'}</p>
                          <p><strong>Account Code:</strong> {editingJob.new_account_number || 'N/A'}</p>
                          <p><strong>Vehicle:</strong> {formData.vehicle_registration || 'Not set'}</p>
                          <p><strong>IP Address:</strong> {formData.ip_address || 'Not set'}</p>
                          <p><strong>Total:</strong> {formData.quotation_total_amount ? `R ${formData.quotation_total_amount}` : 'Not set'}</p>
                          <p><strong>Products:</strong> {editingJobProducts.length}</p>
                          <p><strong>Target Role:</strong> accounts</p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-900">
                        <p>This will update the job card details and set role to accounts.</p>
                        <p>If this is an install job with IP address, vehicle creation is also attempted.</p>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleFinalizeJob} disabled={finalizing} className="bg-green-600 hover:bg-green-700">
                          {finalizing ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Finalizing...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Finalize Job Card
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
