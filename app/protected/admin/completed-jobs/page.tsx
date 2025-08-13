'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Car,
  Wrench,
  Calendar,
  Clock
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
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  technician_name: string;
  technician_phone: string; // This contains the email
  estimated_duration_hours: number;
  actual_duration_hours: number;
  created_at: string;
  updated_at: string;
  repair: boolean;
  role: string;
}

export default function CompletedJobsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCompletedJobs = async () => {
    try {
      setLoading(true);
      
      // Fetch completed jobs from the admin jobs API
      const response = await fetch('/api/admin/jobs?status=completed');
      
      if (!response.ok) {
        throw new Error('Failed to fetch completed jobs');
      }

      const data = await response.json();
      console.log('Fetched completed jobs:', data.jobs);

      // Filter to only show jobs that haven't been sent to FC yet
      const completedJobs = (data.jobs || []).filter((job: CompletedJob) => job.role !== 'fc');
      
      setJobs(completedJobs);
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

  const handleSendToFC = async (job: CompletedJob) => {
    try {
      // Update the job role to 'fc'
      const response = await fetch(`/api/job-cards/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'fc',
          updated_by: 'admin',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send job to FC');
      }

      toast.success(`Job ${job.job_number} sent to FC successfully!`);
      
      // Remove the job from the list since it's now sent to FC
      setJobs(prev => prev.filter(j => j.id !== job.id));
    } catch (error) {
      console.error('Error sending job to FC:', error);
      toast.error('Failed to send job to FC. Please try again.');
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

  return (
    <div className="mx-auto p-6 container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">Completed Jobs</h1>
          <p className="text-gray-600">View and manage completed jobs before sending to Finance Controller</p>
        </div>
        <Button onClick={refreshJobs} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
            Completed Jobs Ready for FC
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
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="w-3 h-3" />
                            <span><strong>Date:</strong> {formatDate(job.job_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span><strong>Duration:</strong> {job.actual_duration_hours || job.estimated_duration_hours || 'N/A'}h</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        <Button
                          onClick={() => handleSendToFC(job)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 w-full text-white"
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
    </div>
  );
}
