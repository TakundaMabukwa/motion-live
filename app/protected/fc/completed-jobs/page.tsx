'use client';

import React, { useState, useEffect } from 'react';
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
  CheckCircle,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Car,
  Wrench,
  Calendar,
  Clock,
  Eye,
  DollarSign,
  Package,
  MapPin,
  Edit,
  Save,
  CheckCircle2,
  Building2,
  FileText,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface CompletedJob {
  id: string;
  job_number: string;
  job_date: string;
  start_time: string;
  end_time: string;
  status: string;
  job_type: string;
  job_description: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  technician_name: string;
  technician_phone: string;
  estimated_duration_hours: number;
  actual_duration_hours: number;
  created_at: string;
  updated_at: string;
  repair: boolean;
  role: string;
  job_status: string;
  job_location: string;
  estimated_cost: number;
  actual_cost: number;
  quotation_products: any;
  quotation_subtotal: number;
  quotation_vat_amount: number;
     quotation_total_amount: number;
   before_photos: string[];
   after_photos: string[];
   work_notes: string;
   completion_notes: string;
   completion_date: string;
   end_time: string;
   vin_numer: string;
   odormeter: string;
   ip_address: string;
}

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
  const [formData, setFormData] = useState({
    vehicle_registration: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vin_number: '',
    odormeter: '',
    ip_address: '',
    quotation_subtotal: '',
    quotation_vat_amount: '',
    quotation_total_amount: '',
    work_notes: ''
  });
  const [finalizing, setFinalizing] = useState(false);

  const fetchCompletedJobs = async () => {
    try {
      setLoading(true);
      
      // Fetch completed jobs where role is 'fc' and job_status is 'Completed'
      const response = await fetch('/api/fc/completed-jobs');
      
      if (!response.ok) {
        throw new Error('Failed to fetch completed jobs');
      }

      const data = await response.json();
      console.log('Fetched FC completed jobs:', data.jobs);
      
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

  const filteredJobs = jobs.filter(job =>
    job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.customer_phone?.includes(searchTerm) ||
    job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.technician_phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (job: CompletedJob) => {
    setSelectedJob(job);
    setShowDetails(true);
  };

  const handleEditJob = (job: CompletedJob) => {
    setEditingJob(job);
    // Pre-fill form with existing data
    setFormData({
      vehicle_registration: job.vehicle_registration || '',
      vehicle_make: job.vehicle_make || '',
      vehicle_model: job.vehicle_model || '',
      vehicle_year: job.vehicle_year?.toString() || '',
      vin_number: job.vin_numer || '',
      odormeter: job.odormeter || '',
      ip_address: job.ip_address || '',
      quotation_subtotal: job.quotation_subtotal?.toString() || '',
      quotation_vat_amount: job.quotation_vat_amount?.toString() || '',
      quotation_total_amount: job.quotation_total_amount?.toString() || '',
      payment_notes: ''
    });
    setShowEditDialog(true);
  };

  const calculateVAT = (subtotal: string) => {
    if (!subtotal || isNaN(Number(subtotal))) return '';
    const subtotalNum = parseFloat(subtotal);
    const vatAmount = subtotalNum * 0.15; // 15% VAT
    return vatAmount.toFixed(2);
  };

  const calculateTotal = (subtotal: string, vat: string) => {
    if (!subtotal || isNaN(Number(subtotal))) return '';
    const subtotalNum = parseFloat(subtotal);
    const vatNum = parseFloat(vat) || 0;
    return (subtotalNum + vatNum).toFixed(2);
  };

  const handleSubtotalChange = (value: string) => {
    const vat = calculateVAT(value);
    const total = calculateTotal(value, vat);
    setFormData({
      ...formData,
      quotation_subtotal: value,
      quotation_vat_amount: vat,
      quotation_total_amount: total
    });
  };

  const handleFinalizeJob = async () => {
    if (!editingJob) return;

    // Validate required fields
    if (!formData.vehicle_registration.trim()) {
      toast.error('Vehicle registration is required');
      return;
    }

    if (!formData.quotation_total_amount || parseFloat(formData.quotation_total_amount) <= 0) {
      toast.error('Total amount must be greater than 0');
      return;
    }

    try {
      setFinalizing(true);
      const finalizeData = {
        vehicle_registration: formData.vehicle_registration,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        vin_numer: formData.vin_number,
        odormeter: formData.odormeter,
        ip_address: formData.ip_address,
        quotation_subtotal: formData.quotation_subtotal ? parseFloat(formData.quotation_subtotal) : null,
        quotation_vat_amount: formData.quotation_vat_amount ? parseFloat(formData.quotation_vat_amount) : null,
        quotation_total_amount: formData.quotation_total_amount ? parseFloat(formData.quotation_total_amount) : null,
        work_notes: formData.work_notes,
        role: 'accounts',
        updated_by: 'fc'
      };

      // Update the job card
      const response = await fetch(`/api/job-cards/${editingJob.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalizeData),
      });

      if (!response.ok) {
        throw new Error('Failed to update job card');
      }

      // If it's an installation job, add to vehicles table
      if (editingJob.job_type?.toLowerCase().includes('install') && formData.ip_address) {
        const vehicleResponse = await fetch('/api/vehicles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reg: formData.vehicle_registration,
            vin: formData.vin_number,
            make: formData.vehicle_make,
            model: formData.vehicle_model,
            year: formData.vehicle_year,
            colour: 'Unknown',
            company: editingJob.customer_name || 'Unknown',
            new_account_number: editingJob.customer_name || 'Unknown',
            skylink_trailer_unit_ip: formData.ip_address,
            total_rental_sub: parseFloat(formData.quotation_total_amount) || 0,
            total_rental: parseFloat(formData.quotation_subtotal) || 0,
            total_sub: parseFloat(formData.quotation_vat_amount) || 0
          }),
        });

        if (!vehicleResponse.ok) {
          console.warn('Failed to add vehicle to vehicles table, but job was updated');
        }
      }

      toast.success(`Job ${editingJob.job_number} finalized successfully!`);
      setShowEditDialog(false);
      setEditingJob(null);
      fetchCompletedJobs(); // Refresh the list
    } catch (error) {
      console.error('Error finalizing job:', error);
      toast.error('Failed to finalize job. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-500';
      case 'assigned': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'on_hold': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getJobTypeColor = (jobType: string) => {
    switch (jobType?.toLowerCase()) {
      case 'install': return 'bg-blue-500';
      case 'deinstall': return 'bg-red-500';
      case 'maintenance': return 'bg-green-500';
      case 'repair': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Not set';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  return (
    <div className="mx-auto p-6 container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">Completed Jobs</h1>
          <p className="text-gray-600">View completed jobs assigned to Finance Controller</p>
        </div>
        <Button onClick={refreshJobs} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="mb-6 border-gray-200 border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'accounts', label: 'Accounts', icon: Building2, href: '/protected/fc' },
            { id: 'quotes', label: 'Quotes', icon: FileText, href: '/protected/fc/quotes' },
            { id: 'external-quotation', label: 'External Quotation', icon: ExternalLink, href: '/protected/fc/external-quotation' },
            { id: 'completed-jobs', label: 'Completed Jobs', icon: CheckCircle, href: '/protected/fc/completed-jobs' }
          ].map((navItem) => {
            const Icon = navItem.icon;
            const isActive = pathname === navItem.href;
            
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

      {/* Search and Stats */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search jobs by customer, phone, job number, vehicle, or technician..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 text-gray-600 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{filteredJobs.length} completed jobs</span>
              </div>
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-500" />
                <span>{filteredJobs.filter(job => job.repair).length} repair jobs</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completed Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Completed Jobs for FC Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="border-gray-900 border-b-2 rounded-full w-8 h-8 animate-spin"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-8 text-gray-500 text-center">
              {searchTerm ? 'No completed jobs found matching your search' : 'No completed jobs found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Job Details
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Repair
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Technician Email
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Completion
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 border-gray-100 border-b">
                      <td className="px-4 py-3 text-gray-900">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg">{job.job_number}</h3>
                          <Badge className={getStatusColor(job.job_status)}>
                            {job.job_status || 'completed'}
                          </Badge>
                          <Badge className={getJobTypeColor(job.job_type)}>
                            {job.job_type}
                          </Badge>
                        </div>
                        <div className="text-gray-600 text-sm">
                          <p><strong>Type:</strong> {job.job_type}</p>
                          <p><strong>Description:</strong> {job.job_description || 'No description'}</p>
                          {job.job_location && (
                            <p><strong>Location:</strong> {job.job_location}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        <div className="font-medium">{job.customer_name}</div>
                        <div className="text-gray-500 text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {job.customer_email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {job.customer_phone}
                          </div>
                          {job.customer_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="max-w-[150px] truncate">{job.customer_address}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {job.vehicle_registration ? (
                          <div>
                            <div className="font-medium">{job.vehicle_registration}</div>
                            <div className="text-gray-500 text-sm">
                              {job.vehicle_make} {job.vehicle_model} {job.vehicle_year}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">No vehicle</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {job.repair ? (
                          <Badge className="bg-purple-100 text-purple-800">
                            Yes
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">
                            No
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {job.technician_phone ? (
                          <div>
                            <div className="font-medium text-blue-600">{job.technician_phone}</div>
                            {job.technician_name && (
                              <div className="text-gray-500 text-sm">{job.technician_name}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No technician</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        <div className="text-sm">
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="w-3 h-3" />
                            <span><strong>Date:</strong> {formatDate(job.completion_date || job.job_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span><strong>Duration:</strong> {job.actual_duration_hours || job.estimated_duration_hours || 'N/A'}h</span>
                          </div>
                        </div>
                      </td>
                                             <td className="px-4 py-3 text-gray-900">
                         <div className="flex flex-col gap-2">
                           <Button
                             onClick={() => handleViewDetails(job)}
                             size="sm"
                             variant="outline"
                             className="w-full"
                           >
                             <Eye className="mr-2 w-4 h-4" />
                             View Details
                           </Button>
                           <Button
                             onClick={() => handleEditJob(job)}
                             size="sm"
                             variant="default"
                             className="w-full"
                           >
                             <Edit className="mr-2 w-4 h-4" />
                             Edit & Finalize
                           </Button>
                         </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Job Details - {selectedJob?.job_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-6">
              {/* Basic Job Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Job Information</CardTitle>
                </CardHeader>
                <CardContent className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div>
                    <p><strong>Job Number:</strong> {selectedJob.job_number}</p>
                    <p><strong>Job Type:</strong> {selectedJob.job_type}</p>
                    <p><strong>Status:</strong> {selectedJob.job_status}</p>
                    <p><strong>Priority:</strong> {selectedJob.priority || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Job Date:</strong> {formatDate(selectedJob.job_date)}</p>
                    <p><strong>Completion Date:</strong> {formatDate(selectedJob.completion_date)}</p>
                    <p><strong>Duration:</strong> {selectedJob.actual_duration_hours || selectedJob.estimated_duration_hours || 'N/A'}h</p>
                    <p><strong>Repair Job:</strong> {selectedJob.repair ? 'Yes' : 'No'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div>
                    <p><strong>Name:</strong> {selectedJob.customer_name}</p>
                    <p><strong>Email:</strong> {selectedJob.customer_email}</p>
                    <p><strong>Phone:</strong> {selectedJob.customer_phone}</p>
                  </div>
                  <div>
                    <p><strong>Address:</strong> {selectedJob.customer_address || 'N/A'}</p>
                    <p><strong>Job Location:</strong> {selectedJob.job_location || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vehicle Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                    <p><strong>Registration:</strong> {selectedJob.vehicle_registration || 'N/A'}</p>
                    <p><strong>Make:</strong> {selectedJob.vehicle_make || 'N/A'}</p>
                    <p><strong>Model:</strong> {selectedJob.vehicle_model || 'N/A'}</p>
                    <p><strong>Year:</strong> {selectedJob.vehicle_year || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Technician Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Technician Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                    <p><strong>Name:</strong> {selectedJob.technician_name || 'N/A'}</p>
                    <p><strong>Email:</strong> {selectedJob.technician_phone || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Information - Show for repair jobs */}
              {selectedJob.repair && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Pricing Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                      <div>
                        <p><strong>Estimated Cost:</strong> {formatCurrency(selectedJob.estimated_cost)}</p>
                        <p><strong>Actual Cost:</strong> {formatCurrency(selectedJob.actual_cost)}</p>
                      </div>
                      <div>
                        <p><strong>Quotation Subtotal:</strong> {formatCurrency(selectedJob.quotation_subtotal)}</p>
                        <p><strong>VAT Amount:</strong> {formatCurrency(selectedJob.quotation_vat_amount)}</p>
                        <p><strong>Total Amount:</strong> {formatCurrency(selectedJob.quotation_total_amount)}</p>
                      </div>
                    </div>
                    
                    {/* Quotation Products */}
                    {selectedJob.quotation_products && (
                      <div className="mt-4">
                        <h4 className="mb-2 font-medium">Quotation Products:</h4>
                        <div className="bg-gray-50 p-3 rounded">
                          <pre className="overflow-auto text-sm">
                            {JSON.stringify(selectedJob.quotation_products, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Job Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Job Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p><strong>Description:</strong></p>
                    <p className="text-gray-600">{selectedJob.job_description || 'No description provided'}</p>
                  </div>
                  
                  {selectedJob.special_instructions && (
                    <div>
                      <p><strong>Special Instructions:</strong></p>
                      <p className="text-gray-600">{selectedJob.special_instructions}</p>
                    </div>
                  )}
                  
                  {selectedJob.work_notes && (
                    <div>
                      <p><strong>Work Notes:</strong></p>
                      <p className="text-gray-600">{selectedJob.work_notes}</p>
                    </div>
                  )}
                  
                  {selectedJob.completion_notes && (
                    <div>
                      <p><strong>Completion Notes:</strong></p>
                      <p className="text-gray-600">{selectedJob.completion_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Photos */}
              {(selectedJob.before_photos?.length > 0 || selectedJob.after_photos?.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Job Photos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                      {selectedJob.before_photos?.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium">Before Photos ({selectedJob.before_photos.length})</h4>
                          <div className="gap-2 grid grid-cols-2">
                            {selectedJob.before_photos.map((photo, index) => (
                              <img 
                                key={index} 
                                src={photo} 
                                alt={`Before ${index + 1}`}
                                className="rounded w-full h-24 object-cover"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedJob.after_photos?.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium">After Photos ({selectedJob.after_photos.length})</h4>
                          <div className="gap-2 grid grid-cols-2">
                            {selectedJob.after_photos.map((photo, index) => (
                              <img 
                                key={index} 
                                src={photo} 
                                alt={`After ${index + 1}`}
                                className="rounded w-full h-24 object-cover"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
                 </DialogContent>
       </Dialog>

       {/* Edit Job Dialog */}
       <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
         <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Edit className="w-5 h-5" />
               Edit & Finalize Job - {editingJob?.job_number}
             </DialogTitle>
           </DialogHeader>
           
           {editingJob && (
             <div className="space-y-6">
               <Tabs defaultValue="vehicle" className="w-full">
                 <TabsList className="grid grid-cols-3 w-full">
                   <TabsTrigger value="vehicle">Vehicle Details</TabsTrigger>
                   <TabsTrigger value="payment">Payment Details</TabsTrigger>
                   <TabsTrigger value="finalize">Finalize</TabsTrigger>
                 </TabsList>
                 
                 {/* Vehicle Details Tab */}
                 <TabsContent value="vehicle" className="space-y-4">
                   <Card>
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2 text-lg">
                         <Car className="w-5 h-5" />
                         Vehicle Information
                       </CardTitle>
                     </CardHeader>
                     <CardContent className="gap-4 grid grid-cols-1 md:grid-cols-2">
                       <div className="space-y-2">
                         <Label htmlFor="vehicle_registration">Vehicle Registration *</Label>
                         <Input
                           id="vehicle_registration"
                           value={formData.vehicle_registration}
                           onChange={(e) => setFormData({...formData, vehicle_registration: e.target.value})}
                           placeholder="Enter vehicle registration"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="vehicle_make">Vehicle Make</Label>
                         <Input
                           id="vehicle_make"
                           value={formData.vehicle_make}
                           onChange={(e) => setFormData({...formData, vehicle_make: e.target.value})}
                           placeholder="Enter vehicle make"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="vehicle_model">Vehicle Model</Label>
                         <Input
                           id="vehicle_model"
                           value={formData.vehicle_model}
                           onChange={(e) => setFormData({...formData, vehicle_model: e.target.value})}
                           placeholder="Enter vehicle model"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="vehicle_year">Vehicle Year</Label>
                         <Input
                           id="vehicle_year"
                           type="number"
                           value={formData.vehicle_year}
                           onChange={(e) => setFormData({...formData, vehicle_year: e.target.value})}
                           placeholder="Enter vehicle year"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="vin_number">VIN Number</Label>
                         <Input
                           id="vin_number"
                           value={formData.vin_number}
                           onChange={(e) => setFormData({...formData, vin_number: e.target.value})}
                           placeholder="Enter VIN number"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="odormeter">Odometer</Label>
                         <Input
                           id="odormeter"
                           value={formData.odormeter}
                           onChange={(e) => setFormData({...formData, odormeter: e.target.value})}
                           placeholder="Enter odometer reading"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="ip_address">IP Address</Label>
                         <Input
                           id="ip_address"
                           value={formData.ip_address}
                           onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                           placeholder="Enter IP address"
                         />
                       </div>
                     </CardContent>
                   </Card>
                 </TabsContent>
                 
                 {/* Payment Details Tab */}
                 <TabsContent value="payment" className="space-y-4">
                   <Card>
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2 text-lg">
                         <DollarSign className="w-5 h-5" />
                         Payment Information
                       </CardTitle>
                     </CardHeader>
                     <CardContent className="gap-4 grid grid-cols-1 md:grid-cols-2">
                       <div className="space-y-2">
                         <Label htmlFor="quotation_subtotal">Quotation Subtotal</Label>
                         <Input
                           id="quotation_subtotal"
                           type="number"
                           step="0.01"
                           value={formData.quotation_subtotal}
                           onChange={(e) => handleSubtotalChange(e.target.value)}
                           placeholder="Enter subtotal amount"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="quotation_vat_amount">VAT Amount</Label>
                         <Input
                           id="quotation_vat_amount"
                           type="number"
                           step="0.01"
                           value={formData.quotation_vat_amount}
                           onChange={(e) => setFormData({...formData, quotation_vat_amount: e.target.value})}
                           placeholder="Enter VAT amount"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="quotation_total_amount">Total Amount</Label>
                         <Input
                           id="quotation_total_amount"
                           type="number"
                           step="0.01"
                           value={formData.quotation_total_amount}
                           onChange={(e) => setFormData({...formData, quotation_total_amount: e.target.value})}
                           placeholder="Enter total amount"
                         />
                       </div>
                                               <div className="space-y-2">
                          <Label htmlFor="work_notes">Work Notes</Label>
                          <Textarea
                            id="work_notes"
                            value={formData.work_notes}
                            onChange={(e) => setFormData({...formData, work_notes: e.target.value})}
                            placeholder="Enter any work notes or special instructions"
                            rows={3}
                          />
                        </div>
                     </CardContent>
                   </Card>
                 </TabsContent>
                 
                 {/* Finalize Tab */}
                 <TabsContent value="finalize" className="space-y-4">
                   <Card>
                     <CardHeader>
                       <CardTitle className="flex items-center gap-2 text-lg">
                         <CheckCircle2 className="w-5 h-5 text-green-600" />
                         Finalize Job
                       </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                       <div className="bg-blue-50 p-4 rounded-lg">
                         <h4 className="mb-2 font-medium text-blue-900">Summary of Changes</h4>
                         <div className="space-y-1 text-blue-800 text-sm">
                           <p><strong>Vehicle Registration:</strong> {formData.vehicle_registration || 'Not set'}</p>
                           <p><strong>IP Address:</strong> {formData.vehicle_registration && formData.ip_address ? 'Will be added to vehicles table' : 'Not set'}</p>
                           <p><strong>Total Amount:</strong> {formData.quotation_total_amount ? `R ${formData.quotation_total_amount}` : 'Not set'}</p>
                           <p><strong>Job Role:</strong> Will be updated to 'accounts'</p>
                         </div>
                       </div>
                       
                       <div className="bg-yellow-50 p-4 rounded-lg">
                         <h4 className="mb-2 font-medium text-yellow-900">Important Notes</h4>
                         <ul className="space-y-1 text-yellow-800 text-sm list-disc list-inside">
                           <li>This action will update the job card with all entered information</li>
                           <li>If this is an installation job with IP address, the vehicle will be added to vehicles table</li>
                           <li>The job role will be changed to 'accounts'</li>
                           <li>This action cannot be undone</li>
                         </ul>
                       </div>
                       
                       <div className="flex justify-end gap-3">
                         <Button
                           variant="outline"
                           onClick={() => setShowEditDialog(false)}
                         >
                           Cancel
                         </Button>
                         <Button
                           onClick={handleFinalizeJob}
                           disabled={finalizing}
                           className="bg-green-600 hover:bg-green-700"
                         >
                           {finalizing ? (
                             <>
                               <div className="mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4 animate-spin"></div>
                               Finalizing...
                             </>
                           ) : (
                             <>
                               <CheckCircle2 className="mr-2 w-4 h-4" />
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
