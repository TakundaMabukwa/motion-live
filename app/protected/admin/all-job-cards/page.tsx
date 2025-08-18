'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Search,
  RefreshCw,
  Car,
  User,
  Calendar,
  MapPin,
  Package,
  DollarSign,
  Eye,
  Filter,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import AdminSubnav from '@/components/admin/AdminSubnav';

interface JobCard {
  id: string;
  job_number: string;
  quotation_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  job_type: string;
  job_description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  
  // Vehicle information
  vehicle_registration: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vin_numer: string;
  odormeter: string;
  
  // Quotation details
  quotation_total_amount: number;
  quotation_products: any[];
  quote_status: string;
  
  // Additional fields
  parts_required: any[];
  technician_name: string;
  job_location: string;
}

export default function AllJobCardsPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});

  const fetchJobCards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/job-cards');
      if (!response.ok) {
        throw new Error('Failed to fetch job cards');
      }
      const data = await response.json();
      setJobCards(data.job_cards || []);
    } catch (error) {
      console.error('Error fetching job cards:', error);
      toast.error('Failed to load job cards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobCards();
  }, [fetchJobCards]);

  const filteredJobCards = jobCards.filter(job => {
    const matchesSearch = 
      job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.vehicle_make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesJobType = jobTypeFilter === 'all' || job.job_type === jobTypeFilter;
    
    let matchesVehicle = true;
    if (vehicleFilter === 'with_vehicle') {
      matchesVehicle = !!(job.vehicle_registration || job.vehicle_make || job.vehicle_model);
    } else if (vehicleFilter === 'without_vehicle') {
      matchesVehicle = !(job.vehicle_registration || job.vehicle_make || job.vehicle_model);
    }
    
    return matchesSearch && matchesStatus && matchesJobType && matchesVehicle;
  });

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return 'R0.00';
    return `R${parseFloat(amount.toString()).toFixed(2)}`;
  };

  const hasVehicleInfo = (job: JobCard) => {
    return !!(job.vehicle_registration || job.vehicle_make || job.vehicle_model || job.vehicle_year || job.vin_numer || job.odormeter);
  };

  const getVehicleInfoDisplay = (job: JobCard) => {
    if (!hasVehicleInfo(job)) {
      return <span className="text-gray-500 italic">No vehicle information</span>;
    }

    const vehicleParts = [];
    if (job.vehicle_registration) vehicleParts.push(job.vehicle_registration);
    if (job.vehicle_make && job.vehicle_model) {
      vehicleParts.push(`${job.vehicle_make} ${job.vehicle_model}`);
    } else if (job.vehicle_make) vehicleParts.push(job.vehicle_make);
    else if (job.vehicle_model) vehicleParts.push(job.vehicle_model);
    if (job.vehicle_year) vehicleParts.push(job.vehicle_year.toString());

    return vehicleParts.length > 0 ? vehicleParts.join(' • ') : 'Vehicle info available';
  };

  return (
    <div className="space-y-6 mx-auto p-6 container">
      {/* Admin sub navigation */}
      <AdminSubnav />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-3xl">All Job Cards</h1>
          <p className="mt-2 text-gray-600">
            View all job cards with comprehensive vehicle information
          </p>
        </div>
        <Button onClick={() => fetchJobCards()} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">Search</label>
              <Input
                placeholder="Search job cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">Job Type</label>
              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="install">Install</SelectItem>
                  <SelectItem value="deinstall">Deinstall</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">Vehicle Info</label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by vehicle info" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Job Cards</SelectItem>
                  <SelectItem value="with_vehicle">With Vehicle Info</SelectItem>
                  <SelectItem value="without_vehicle">Without Vehicle Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-600 text-sm">Total Job Cards</p>
                <p className="font-bold text-gray-900 text-2xl">{jobCards.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-600 text-sm">With Vehicle Info</p>
                <p className="font-bold text-green-600 text-2xl">
                  {jobCards.filter(hasVehicleInfo).length}
                </p>
              </div>
              <Car className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-600 text-sm">Without Vehicle Info</p>
                <p className="font-bold text-orange-600 text-2xl">
                  {jobCards.filter(job => !hasVehicleInfo(job)).length}
                </p>
              </div>
              <Info className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-600 text-sm">Active Jobs</p>
                <p className="font-bold text-blue-600 text-2xl">
                  {jobCards.filter(job => job.status === 'active').length}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Cards List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Job Cards ({filteredJobCards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
              <span className="ml-2">Loading job cards...</span>
            </div>
          ) : filteredJobCards.length === 0 ? (
            <div className="py-12 text-gray-500 text-center">
              <FileText className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <p>No job cards found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobCards.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {job.job_number}
                          </h3>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status?.toUpperCase() || 'DRAFT'}
                          </Badge>
                          {job.priority && (
                            <Badge className={getPriorityColor(job.priority)}>
                              {job.priority.toUpperCase()}
                            </Badge>
                          )}
                          {hasVehicleInfo(job) && (
                            <Badge className="bg-green-100 border-green-200 text-green-800">
                              <Car className="mr-1 w-3 h-3" />
                              VEHICLE
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">
                          Quotation: {job.quotation_number || 'N/A'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleJobExpansion(job.id)}
                      >
                        {expandedJobs[job.id] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Basic Info */}
                    <div className="gap-4 grid grid-cols-1 md:grid-cols-3 mb-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">{job.customer_name || 'N/A'}</p>
                          <p className="text-gray-600 text-sm">{job.customer_email || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">{job.job_type || 'N/A'}</p>
                          <p className="text-gray-600 text-sm">{job.job_description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">Created</p>
                          <p className="text-gray-600 text-sm">{formatDate(job.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Information - Always Visible */}
                    <div className="bg-gray-50 mb-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Car className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">Vehicle Information</h4>
                      </div>
                      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <label className="font-medium text-gray-500 text-xs uppercase">Registration</label>
                          <p className="font-medium text-gray-900 text-sm">
                            {job.vehicle_registration || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <label className="font-medium text-gray-500 text-xs uppercase">Make & Model</label>
                          <p className="font-medium text-gray-900 text-sm">
                            {job.vehicle_make && job.vehicle_model 
                              ? `${job.vehicle_make} ${job.vehicle_model}`
                              : job.vehicle_make || job.vehicle_model || 'Not provided'
                            }
                          </p>
                        </div>
                        <div>
                          <label className="font-medium text-gray-500 text-xs uppercase">Year</label>
                          <p className="font-medium text-gray-900 text-sm">
                            {job.vehicle_year || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <label className="font-medium text-gray-500 text-xs uppercase">VIN Number</label>
                          <p className="font-medium text-gray-900 text-sm">
                            {job.vin_numer || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <label className="font-medium text-gray-500 text-xs uppercase">Odometer</label>
                          <p className="font-medium text-gray-900 text-sm">
                            {job.odormeter || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <label className="font-medium text-gray-500 text-xs uppercase">Summary</label>
                          <p className="font-medium text-gray-900 text-sm">
                            {getVehicleInfoDisplay(job)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedJobs[job.id] && (
                      <div className="space-y-4 pt-4 border-t">
                        {/* Customer Details */}
                        <div>
                          <h5 className="mb-2 font-medium text-gray-900">Customer Details</h5>
                          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 text-sm">
                            <div>
                              <span className="text-gray-500">Phone:</span>
                              <span className="ml-2 font-medium">{job.customer_phone || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Address:</span>
                              <span className="ml-2 font-medium">{job.customer_address || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quotation Details */}
                        <div>
                          <h5 className="mb-2 font-medium text-gray-900">Quotation Details</h5>
                          <div className="gap-4 grid grid-cols-1 md:grid-cols-3 text-sm">
                            <div>
                              <span className="text-gray-500">Total Amount:</span>
                              <span className="ml-2 font-medium text-green-600">
                                {formatCurrency(job.quotation_total_amount)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Quote Status:</span>
                              <span className="ml-2 font-medium">{job.quote_status || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Products:</span>
                              <span className="ml-2 font-medium">
                                {job.quotation_products?.length || 0} items
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div>
                          <h5 className="mb-2 font-medium text-gray-900">Additional Information</h5>
                          <div className="gap-4 grid grid-cols-1 md:grid-cols-2 text-sm">
                            <div>
                              <span className="text-gray-500">Technician:</span>
                              <span className="ml-2 font-medium">{job.technician_name || 'Not assigned'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <span className="ml-2 font-medium">{job.job_location || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Parts Required:</span>
                              <span className="ml-2 font-medium">
                                {job.parts_required?.length || 0} parts
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Last Updated:</span>
                              <span className="ml-2 font-medium">{formatDate(job.updated_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
