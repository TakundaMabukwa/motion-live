'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  Clock,
  CheckCircle,
  FileText,
  Search,
  User,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Package,
  RefreshCw,
  Calendar,
  QrCode,
  MapPin,
  Car,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminJob {
  id: string;
  job_number: string;
  job_date: string;
  due_date: string;
  start_time: string;
  end_time: string;
  status: string;
  job_type: string;
  job_description: string;
  priority: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  technician_name: string;
  technician_phone: string; // This contains the email
  job_location: string;
  estimated_duration_hours: number;
  actual_duration_hours: number;
  created_at: string;
  updated_at: string;
  parts_required: any;
  products_required: any;
  quotation_products: any;
  quotation_total_amount: number;
  qr_code: string;
  work_notes: string;
  completion_notes: string;
  customer_feedback: string;
  quotation_number: string;
  quote_status: string;
  special_instructions: string;
  access_requirements: string;
  site_contact_person: string;
  site_contact_phone: string;
  repair: boolean;
  role: string;
}

interface Technician {
  id: string;
  name: string;
  email: string;
}

export default function AdminJobsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('jobs-with-parts');
  const [assignTechnicianOpen, setAssignTechnicianOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<AdminJob | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [jobDate, setJobDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [companyFilter, setCompanyFilter] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedJobForQR, setSelectedJobForQR] = useState<AdminJob | null>(null);

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/technicians');
      if (!response.ok) {
        throw new Error('Failed to fetch technicians');
      }
      const data = await response.json();
      
      if (data.technicians && data.technicians.length > 0) {
        setTechnicians(data.technicians);
        toast.success(`Loaded ${data.technicians.length} technicians`);
      } else {
        // Fallback to hardcoded technicians
        const fallbackTechnicians = [
          { id: '1', name: 'John Smith', email: 'john.smith@company.com' },
          { id: '2', name: 'Sarah Wilson', email: 'sarah.wilson@company.com' },
          { id: '3', name: 'Mike Johnson', email: 'mike.johnson@company.com' },
          { id: '4', name: 'Tech Skyflow', email: 'tech.skyflow@company.com' }
        ];
        setTechnicians(fallbackTechnicians);
        toast.info('Using fallback technicians. Add technicians to database for full functionality.');
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
      // Fallback to hardcoded technicians on error
      const fallbackTechnicians = [
        { id: '1', name: 'John Smith', email: 'john.smith@company.com' },
        { id: '2', name: 'Sarah Wilson', email: 'sarah.wilson@company.com' },
        { id: '3', name: 'Mike Johnson', email: 'mike.johnson@company.com' },
        { id: '4', name: 'Tech Skyflow', email: 'tech.skyflow@company.com' }
      ];
      setTechnicians(fallbackTechnicians);
      toast.warning('Using fallback technicians due to connection error.');
    }
  };

  const fetchAdminJobs = async () => {
    try {
      setLoading(true);
      const status = activeTab === 'jobs-with-parts' ? 'open' : 'completed';
      
      let url = `/api/admin/jobs?status=${status}`;
      if (companyFilter) {
        url += `&company=${encodeURIComponent(companyFilter)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch admin jobs');
      }

      const data = await response.json();
      console.log('Fetched admin jobs:', data.jobs);

      // Sort jobs: unassigned first, assigned last
      const sortedJobs = (data.jobs || []).sort((a: AdminJob, b: AdminJob) => {
        const aHasTechnician = !!a.technician_name;
        const bHasTechnician = !!b.technician_name;
        
        if (aHasTechnician && !bHasTechnician) return 1; // a goes to bottom
        if (!aHasTechnician && bHasTechnician) return -1; // b goes to bottom
        return 0; // keep original order
      });

      setJobs(sortedJobs);

      // Initialize expanded state
      const initialExpanded = {};
      sortedJobs.forEach(job => {
        initialExpanded[job.id] = false;
      });
      setExpandedJobs(initialExpanded);
    } catch (error) {
      console.error('Error fetching admin jobs:', error);
      toast.error('Failed to load admin jobs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
    fetchAdminJobs();
  }, [activeTab, companyFilter]);

  const refreshJobs = async () => {
    setRefreshing(true);
    await fetchAdminJobs();
  };

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const filteredJobs = jobs.filter(job =>
    job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.customer_phone?.includes(searchTerm) ||
    job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignTechnician = (job: AdminJob) => {
    setSelectedJob(job);
    setSelectedTechnician('');
    setJobDate('');
    setStartTime('');
    setEndTime('');
    setAssignTechnicianOpen(true);
  };

  const confirmAssignTechnician = async () => {
    console.log('FUNCTION CALLED: confirmAssignTechnician started');
    if (!selectedTechnician || !jobDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Find the selected technician's email
      const selectedTech = technicians.find(tech => tech.name === selectedTechnician);
      if (!selectedTech) {
        toast.error('Selected technician not found');
        return;
      }

      console.log(`STEP 1: Starting assignment for ${selectedTech.name} (${selectedTech.email})`);
      
      // Generate email from technician name if no email exists
      let technicianEmail = selectedTech.email;
      if (!technicianEmail || technicianEmail.includes('@company.com')) {
        // Generate email from name: "John Smith" -> "john.smith@soltrack.co.za"
        const emailName = selectedTech.name
          .toLowerCase()
          .replace(/\s+/g, '.')
          .replace(/[^a-z0-9.]/g, '');
        technicianEmail = `${emailName}@soltrack.co.za`;
        console.log(`Generated email from name: ${technicianEmail}`);
      }
      
      console.log(`STEP 2: Using technician email: ${technicianEmail}`);
      
      // STEP 3: Pre-update the job_cards table with technician_phone (email) to trigger stock transfers
      console.log('STEP 3: Pre-updating job_cards with technician_phone...');
      const preUpdateResponse = await fetch(`/api/job-cards/${selectedJob?.id}/assign-technician`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technician_id: selectedTech.id,
          technician_name: selectedTech.name,
          technician_email: technicianEmail,
          assignment_date: jobDate,
          assignment_notes: `Assigned via admin panel on ${new Date().toISOString()}`
        }),
      });
      
      if (!preUpdateResponse.ok) {
        const errorData = await preUpdateResponse.json();
        console.error('Pre-update failed:', errorData);
        toast.error(`Failed to update technician assignment: ${errorData.error}`);
        return;
      }
      
      const preUpdateResult = await preUpdateResponse.json();
      console.log('STEP 3: Pre-update successful:', preUpdateResult);
      toast.success('Technician assigned and stock transfers initiated!');
      
      // STEP 4: Also update via the admin endpoint for compatibility
      console.log('STEP 4: Updating via admin endpoint...');
      const adminResponse = await fetch(`/api/admin/jobs/assign-technician`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: selectedJob?.id,
          technicianEmail: technicianEmail,
          technicianName: selectedTech.name,
          jobDate: jobDate,
          startTime: startTime || null,
          endTime: endTime || null,
        }),
      });

      if (!adminResponse.ok) {
        const errorData = await adminResponse.json();
        console.warn('Admin endpoint failed, but main assignment succeeded:', errorData);
        // Don't fail here since the main assignment worked
      } else {
        const adminResult = await adminResponse.json();
        console.log('STEP 4: Admin update successful:', adminResult);
      }
      
      toast.success('Technician assignment completed successfully!');
      
      setAssignTechnicianOpen(false);
      setSelectedJob(null);
      setSelectedTechnician('');
      setJobDate('');
      setStartTime('');
      setEndTime('');
      fetchAdminJobs(); // Refresh the jobs list
    } catch (error) {
      console.error('Assignment failed:', error);
      toast.error(`Assignment failed: ${error.message}`);
    }
  };

  const showJobQRCode = (job: AdminJob) => {
    setSelectedJobForQR(job);
    setShowQRCode(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
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

  const handleSendToFC = async (job: AdminJob) => {
    try {
      // Update the job role to 'fc'
      const response = await fetch(`/api/job-cards/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'fc',
          updated_by: 'admin', // You might want to get the actual admin user ID
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send job to FC');
      }

      toast.success(`Job ${job.job_number} sent to FC successfully!`);
      fetchAdminJobs(); // Refresh the jobs list
    } catch (error) {
      console.error('Error sending job to FC:', error);
      toast.error('Failed to send job to FC. Please try again.');
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

  return (
    <div className="mx-auto p-6 container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">Admin Jobs Management</h1>
          <p className="text-gray-600">Manage jobs with parts required from job_cards table</p>
        </div>
        <Button onClick={refreshJobs} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="company-filter">Filter by Company</Label>
              <Input
                id="company-filter"
                placeholder="Enter company name..."
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setCompanyFilter('')}
              disabled={!companyFilter}
            >
              Clear Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="jobs-with-parts" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Jobs with Parts
          </TabsTrigger>
          <TabsTrigger value="completed-jobs" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Completed Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs-with-parts">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Jobs with Parts Required
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="border-gray-900 border-b-2 rounded-full w-8 h-8 animate-spin"></div>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="py-8 text-gray-500 text-center">
                  No jobs with parts found
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
                          Parts Required
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Technician
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredJobs.map((job) => (
                        <React.Fragment key={job.id}>
                          <tr className="hover:bg-gray-50 border-gray-100 border-b">
                            <td className="px-4 py-3 text-gray-900">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold text-lg">{job.job_number}</h3>
                                <Badge className={getStatusColor(job.status)}>
                                  {job.status || 'pending'}
                                </Badge>
                                <Badge className={getJobTypeColor(job.job_type)}>
                                  {job.job_type}
                                </Badge>
                                <Badge className={getPriorityColor(job.priority)}>
                                  {job.priority || 'medium'}
                                </Badge>
                              </div>
                              <div className="text-gray-600 text-sm">
                                <p><strong>Type:</strong> {job.job_type}</p>
                                <p><strong>Description:</strong> {job.job_description || 'No description'}</p>
                                <p><strong>Location:</strong> {job.job_location || 'Not specified'}</p>
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
                              <div className="flex items-center gap-2">
                                <span>{job.parts_required ? 'Parts required' : 'No parts'}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 w-6 h-6"
                                  onClick={() => toggleJobExpansion(job.id)}
                                >
                                  {expandedJobs[job.id] ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              {job.technician_name ? (
                                <div>
                                  <div className="font-medium">{job.technician_name}</div>
                                  <div className="text-gray-500 text-sm">{job.technician_phone}</div>
                                </div>
                              ) : (
                                <span className="text-orange-600">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              <div className="flex flex-col gap-2">
                                {job.technician_name ? (
                                  <Button
                                    size="sm"
                                    disabled
                                    className="bg-gray-400 w-full text-gray-600 cursor-not-allowed"
                                  >
                                    Technician Assigned
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAssignTechnician(job)}
                                    className="w-full"
                                  >
                                    Assign Technician
                                  </Button>
                                )}
                                {job.qr_code && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => showJobQRCode(job)}
                                    className="w-full"
                                  >
                                    <QrCode className="mr-1 w-4 h-4" />
                                    View QR
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedJobs[job.id] && (
                            <tr>
                              <td colSpan={7} className="bg-gray-50 px-4 py-3">
                                <div className="space-y-3">
                                  <h4 className="font-medium text-gray-900">Job Details:</h4>
                                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <p><strong>Parts Required:</strong></p>
                                      <pre className="bg-white p-2 rounded overflow-auto text-xs">
                                        {JSON.stringify(job.parts_required, null, 2)}
                                      </pre>
                                    </div>
                                    <div className="space-y-2">
                                      <p><strong>Products Required:</strong></p>
                                      <pre className="bg-white p-2 rounded overflow-auto text-xs">
                                        {JSON.stringify(job.products_required, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                  {job.special_instructions && (
                                    <div>
                                      <p><strong>Special Instructions:</strong></p>
                                      <p className="text-gray-600">{job.special_instructions}</p>
                                    </div>
                                  )}
                                  {job.access_requirements && (
                                    <div>
                                      <p><strong>Access Requirements:</strong></p>
                                      <p className="text-gray-600">{job.access_requirements}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed-jobs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Completed Jobs
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="border-gray-900 border-b-2 rounded-full w-8 h-8 animate-spin"></div>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="py-8 text-gray-500 text-center">
                  No completed jobs found
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
                              <Badge className={getStatusColor(job.status)}>
                                {job.status || 'completed'}
                              </Badge>
                              <Badge className={getJobTypeColor(job.job_type)}>
                                {job.job_type}
                              </Badge>
                            </div>
                            <div className="text-gray-600 text-sm">
                              <p><strong>Type:</strong> {job.job_type}</p>
                              <p><strong>Description:</strong> {job.job_description || 'No description'}</p>
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
                              <p><strong>Date:</strong> {formatDate(job.job_date)}</p>
                              <p><strong>Duration:</strong> {job.actual_duration_hours || job.estimated_duration_hours || 'N/A'}h</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            <Button
                              onClick={() => handleSendToFC(job)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Send to FC
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign Technician Dialog */}
      <Dialog open={assignTechnicianOpen} onOpenChange={setAssignTechnicianOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedJob && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="mb-2 font-medium text-gray-900">Job Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Job Number:</strong> {selectedJob.job_number}</p>
                  <p><strong>Customer:</strong> {selectedJob.customer_name}</p>
                  <p><strong>Type:</strong> {selectedJob.job_type}</p>
                  <p><strong>Location:</strong> {selectedJob.job_location || 'Not specified'}</p>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="technician">Technician</Label>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((technician) => (
                    <SelectItem key={technician.id} value={technician.name}>
                      {technician.name} ({technician.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="job-date">Job Date</Label>
              <Input
                id="job-date"
                type="date"
                value={jobDate}
                onChange={(e) => setJobDate(e.target.value)}
                required
              />
            </div>
            <div className="gap-4 grid grid-cols-2">
              <div>
                <Label htmlFor="start-time">Start Time (Optional)</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time (Optional)</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignTechnicianOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmAssignTechnician}
                disabled={!selectedTechnician || !jobDate}
              >
                Assign Technician
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Job QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedJobForQR && (
              <div className="text-center">
                <div className="bg-gray-50 mb-4 p-4 rounded-lg">
                  <h4 className="mb-2 font-medium text-gray-900">Job Information</h4>
                  <p><strong>Job Number:</strong> {selectedJobForQR.job_number}</p>
                  <p><strong>Customer:</strong> {selectedJobForQR.customer_name}</p>
                  <p><strong>Type:</strong> {selectedJobForQR.job_type}</p>
                </div>
                {selectedJobForQR.qr_code ? (
                  <div className="bg-white p-4 border rounded-lg">
                    <img 
                      src={selectedJobForQR.qr_code} 
                      alt="Job QR Code" 
                      className="mx-auto max-w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <QrCode className="mx-auto mb-4 w-16 h-16 text-gray-400" />
                    <p className="text-gray-500">No QR code available for this job</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowQRCode(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
