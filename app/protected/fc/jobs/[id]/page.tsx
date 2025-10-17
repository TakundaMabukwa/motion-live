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
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

interface JobCard {
  id: string;
  job_number: string;
  job_type: string;
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
  parts_required: any[];
}

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
        <div className="grid grid-cols-4 gap-3 mb-4">
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
                  <p className="text-xs text-slate-500 font-medium">Parts</p>
                  <p className="text-sm font-semibold text-violet-700">{job.parts_required?.length || 0}</p>
                </div>
                <Wrench className="w-5 h-5 text-violet-500" />
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