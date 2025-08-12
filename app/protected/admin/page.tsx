'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
  UserPlus,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Package,
  Car,
  FileText
} from 'lucide-react';
import StatsCard from '@/components/shared/StatsCard';
import DashboardTabs from '@/components/shared/DashboardTabs';
import { toast } from 'sonner';

interface PartRequired {
  description: string;
  quantity: number;
  code: string;
  supplier: string;
  cost_per_unit: number;
  total_cost: number;
  stock_id?: string;
  available_stock?: number;
}

interface JobCard {
  id: string;
  job_number: string;
  job_date: string;
  due_date: string;
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
  assigned_technician_id: string;
  technician_name: string;
  technician_phone: string;
  job_location: string;
  estimated_duration_hours: number;
  estimated_cost: number;
  work_notes: string;
  created_at: string;
  updated_at: string;
  parts_required?: PartRequired[]; // Updated to be an array of PartRequired objects
  vin_numer?: string;
  odormeter?: string;
}

interface Technician {
  id: string;
  name: string;
  email: string;
  admin: boolean;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('all-jobs');
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [partsFilter, setPartsFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<JobCard | null>(null);
  const [assignTechnicianOpen, setAssignTechnicianOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [assignmentTime, setAssignmentTime] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assignedJobs, setAssignedJobs] = useState<any[]>([]);
  const [loadingAssignedJobs, setLoadingAssignedJobs] = useState(false);
  const [jobsWithParts, setJobsWithParts] = useState<JobCard[]>([]);
  const [loadingJobsWithParts, setLoadingJobsWithParts] = useState(false);
  const [jobsLoaded, setJobsLoaded] = useState(false);

  // Fetch job cards with caching
  const fetchJobCards = useCallback(async (forceRefresh = false) => {
    // If jobs are already loaded and not forcing refresh, return cached data
    if (jobsLoaded && !forceRefresh) {
      console.log('Using cached job cards');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/job-cards');
      if (!response.ok) {
        throw new Error('Failed to fetch job cards');
      }
      const data = await response.json();
      console.log('Job cards API response:', data);
      setJobCards(data.job_cards || []);
      setJobsLoaded(true);
      
      // If no job cards exist, create some test data
      if (!data.job_cards || data.job_cards.length === 0) {
        console.log('No job cards found, creating test data...');
        await createTestJobCards();
      }
    } catch (error) {
      console.error('Error fetching job cards:', error);
      toast.error('Failed to load job cards');
    } finally {
      setLoading(false);
    }
  }, [jobsLoaded]);

  // Fetch assigned jobs (formerly today's jobs)
  const fetchAssignedJobs = useCallback(async () => {
    try {
      setLoadingAssignedJobs(true);
      const response = await fetch('/api/schedule/today');
      if (!response.ok) {
        throw new Error('Failed to fetch assigned jobs');
      }
      const data = await response.json();
      console.log('Assigned jobs API response:', data);
      setAssignedJobs(data.today_jobs || []);
    } catch (error) {
      console.error('Error fetching assigned jobs:', error);
      toast.error('Failed to load assigned jobs');
    } finally {
      setLoadingAssignedJobs(false);
    }
  }, []);

  // Fetch jobs with parts
  const fetchJobsWithParts = useCallback(async () => {
    try {
      setLoadingJobsWithParts(true);
      const response = await fetch('/api/job-cards');
      if (!response.ok) {
        throw new Error('Failed to fetch jobs with parts');
      }
      const data = await response.json();
      console.log('Jobs API response:', data);
      
      // Filter jobs with parts on the frontend
      const jobsWithActualParts = (data.job_cards || []).filter(job => {
        const hasParts = hasPartsRequired(job);
        console.log(`Job ${job.job_number} parts_required:`, job.parts_required, 'hasParts:', hasParts);
        return hasParts;
      });
      
      setJobsWithParts(jobsWithActualParts);
    } catch (error) {
      console.error('Error fetching jobs with parts:', error);
      toast.error('Failed to load jobs with parts');
    } finally {
      setLoadingJobsWithParts(false);
    }
  }, []);

  // Create test job cards
  const createTestJobCards = async () => {
    try {
      const testJobs = [
        {
          jobType: 'install',
          jobDescription: 'Install new tracking system',
          priority: 'high',
          customerName: 'Macsteel Durban',
          customerEmail: 'durban@macsteel.com',
          customerPhone: '+27 31 123 4567',
          customerAddress: '123 Durban Street, Durban',
          vehicleRegistration: 'CA 123 GP',
          vehicleMake: 'Toyota',
          vehicleModel: 'Hilux',
          vehicleYear: 2022,
          jobLocation: 'Durban Warehouse',
          estimatedDurationHours: 4,
          estimatedCost: 2500,
          partsRequired: [{
            description: 'GPS Module',
            quantity: 1,
            code: 'GPS-001',
            supplier: 'TechParts Inc.',
            cost_per_unit: 1200,
            total_cost: 1200,
            stock_id: 'STOCK-001',
            available_stock: 10
          }, {
            description: 'Antenna',
            quantity: 2,
            code: 'ANT-001',
            supplier: 'Local Suppliers',
            cost_per_unit: 50,
            total_cost: 100,
            stock_id: 'STOCK-002',
            available_stock: 50
          }]
        },
        {
          jobType: 'maintenance',
          jobDescription: 'Regular maintenance check',
          priority: 'medium',
          customerName: 'Macsteel Cape Town',
          customerEmail: 'capetown@macsteel.com',
          customerPhone: '+27 21 123 4567',
          customerAddress: '456 Cape Town Road, Cape Town',
          vehicleRegistration: 'CA 456 GP',
          vehicleMake: 'Ford',
          vehicleModel: 'Ranger',
          vehicleYear: 2021,
          jobLocation: 'Cape Town Depot',
          estimatedDurationHours: 2,
          estimatedCost: 1200,
          partsRequired: [{
            description: 'Replacement Sensor',
            quantity: 1,
            code: 'SENS-001',
            supplier: 'Global Parts',
            cost_per_unit: 800,
            total_cost: 800,
            stock_id: 'STOCK-003',
            available_stock: 20
          }]
        },
        {
          jobType: 'repair',
          jobDescription: 'Fix tracking system malfunction',
          priority: 'urgent',
          customerName: 'Macsteel Johannesburg',
          customerEmail: 'joburg@macsteel.com',
          customerPhone: '+27 11 123 4567',
          customerAddress: '789 Johannesburg Avenue, Johannesburg',
          vehicleRegistration: 'CA 789 GP',
          vehicleMake: 'Isuzu',
          vehicleModel: 'KB',
          vehicleYear: 2023,
          jobLocation: 'Johannesburg Hub',
          estimatedDurationHours: 6,
          estimatedCost: 3500,
          partsRequired: [{
            description: 'New Control Unit',
            quantity: 1,
            code: 'CTRL-001',
            supplier: 'TechParts Inc.',
            cost_per_unit: 2000,
            total_cost: 2000,
            stock_id: 'STOCK-004',
            available_stock: 10
          }, {
            description: 'Wiring Harness',
            quantity: 1,
            code: 'WIRE-001',
            supplier: 'Local Suppliers',
            cost_per_unit: 500,
            total_cost: 500,
            stock_id: 'STOCK-005',
            available_stock: 50
          }, {
            description: 'Display Screen',
            quantity: 1,
            code: 'DISP-001',
            supplier: 'Global Parts',
            cost_per_unit: 1000,
            total_cost: 1000,
            stock_id: 'STOCK-006',
            available_stock: 20
          }]
        }
      ];

      for (const jobData of testJobs) {
        const response = await fetch('/api/job-cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jobData),
        });

        if (response.ok) {
          console.log('Created test job card');
        } else {
          console.error('Failed to create test job card');
        }
      }

      // Refresh the job cards list
      await fetchJobCards();
    } catch (error) {
      console.error('Error creating test job cards:', error);
    }
  };

  // Fetch technicians
  const fetchTechnicians = useCallback(async () => {
    try {
      const response = await fetch('/api/technicians');
      if (!response.ok) {
        throw new Error('Failed to fetch technicians');
      }
      const data = await response.json();
      setTechnicians(data.technicians || []);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast.error('Failed to load technicians');
    }
  }, []);

  useEffect(() => {
    fetchJobCards();
    fetchTechnicians();
    fetchAssignedJobs();
    fetchJobsWithParts();
  }, [fetchJobCards, fetchTechnicians, fetchAssignedJobs, fetchJobsWithParts]);

  const handleAssignTechnician = (job: JobCard) => {
    setSelectedJob(job);
    setSelectedTechnician('');
    setAssignmentDate(new Date().toISOString().split('T')[0]);
    setAssignmentTime('');
    setAssignmentNotes('');
    setAssignTechnicianOpen(true);
  };

  const confirmAssignTechnician = async () => {
    if (!selectedJob || !selectedTechnician) {
      toast.error('Please select a technician');
      return;
    }

    try {
      const technician = technicians.find(t => t.name === selectedTechnician);
      if (!technician) {
        toast.error('Selected technician not found');
        return;
      }

      const assignmentDateTime = `${assignmentDate}T${assignmentTime}:00`;

      const response = await fetch(`/api/admin/jobs/assign-technician`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          technicianEmail: technician.email,
          technicianName: technician.name,
          jobDate: assignmentDateTime,
          startTime: null,
          endTime: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to assign technician');
        return;
      }

      toast.success(data.message || 'Technician assigned successfully');

      setAssignTechnicianOpen(false);
      
      // Refresh data
      fetchJobCards(true);
      fetchAssignedJobs();
    } catch (error) {
      console.error('Error assigning technician:', error);
      toast.error('Failed to assign technician');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'critical': return 'bg-red-200 text-red-900 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to format technician information
  const formatTechnicianInfo = (technicianName: string, technicianPhone: string) => {
    if (!technicianName) return null;
    
    return (
      <div className="space-y-1">
        <p className="font-medium text-gray-600 text-sm">{technicianName}</p>
        {technicianPhone && (
          <p className="text-gray-500 text-xs">
            <span className="font-medium">Email:</span> {technicianPhone}
          </p>
        )}
      </div>
    );
  };

  // Helper function to check if parts are required
  const hasPartsRequired = (job: JobCard) => {
    const hasParts = job.parts_required && 
                   Array.isArray(job.parts_required) && 
                   job.parts_required.length > 0;
    
    console.log(`Job ${job.job_number} parts check:`, {
      parts_required: job.parts_required,
      type: typeof job.parts_required,
      isArray: Array.isArray(job.parts_required),
      hasParts
    });
    
    return hasParts;
  };

  // Sort jobs: unassigned first, then assigned jobs at the bottom
  const sortJobs = (jobs: JobCard[]) => {
    return [...jobs].sort((a, b) => {
      // First sort by assignment status (unassigned first)
      const aAssigned = !!a.technician_name;
      const bAssigned = !!b.technician_name;
      
      if (aAssigned && !bAssigned) return 1; // a goes to bottom
      if (!aAssigned && bAssigned) return -1; // b goes to bottom
      
      // If both have same assignment status, sort by priority
      const priorityOrder = { 'critical': 0, 'urgent': 1, 'high': 2, 'medium': 3, 'low': 4 };
      const aPriority = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 5;
      const bPriority = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 5;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // If same priority, sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const filteredJobCards = sortJobs(jobCards.filter(job => {
    const matchesSearch = 
      job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Show all jobs in the main job cards tab
    return matchesSearch;
  }));

  const jobCardsWithParts = sortJobs(jobCards.filter(job => 
    hasPartsRequired(job)
  ));

  const completedJobs = jobCards.filter(job => 
    job.status === 'completed'
  );

  const overviewMetrics = [
    {
      title: 'TOTAL JOBS',
      value: jobCards.length.toString(),
      subtitle: 'All job cards',
      color: 'text-blue-600',
      icon: BarChart3
    },
    {
      title: 'PENDING JOBS',
      value: jobCards.filter(job => job.status === 'pending').length.toString(),
      subtitle: 'Awaiting assignment',
      color: 'text-yellow-600',
      icon: Clock
    },
    {
      title: 'IN PROGRESS',
      value: jobCards.filter(job => job.status === 'in_progress').length.toString(),
      subtitle: 'Currently being worked on',
      color: 'text-blue-600',
      icon: Users
    },
    {
      title: 'COMPLETED',
      value: jobCards.filter(job => job.status === 'completed').length.toString(),
      subtitle: 'Successfully finished',
      color: 'text-green-600',
      icon: CheckCircle
    },
    {
      title: 'WITH VEHICLE INFO',
      value: jobCards.filter(job => 
        job.vehicle_registration || job.vehicle_make || job.vehicle_model
      ).length.toString(),
      subtitle: 'Jobs with vehicle details',
      color: 'text-purple-600',
      icon: Car
    }
  ];

  const tabItems = [
    {
      value: 'all-jobs',
      label: 'All Jobs',
      icon: BarChart3,
      content: (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex sm:flex-row flex-col gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
              <SelectTrigger className="w-48">
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
            <Select value={partsFilter} onValueChange={setPartsFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by parts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parts</SelectItem>
                <SelectItem value="with_parts">With Parts</SelectItem>
                <SelectItem value="without_parts">Without Parts</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => fetchJobCards(true)} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Job Cards */}
          <div className="gap-4 grid">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
                <span className="ml-2">Loading job cards...</span>
              </div>
            ) : filteredJobCards.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">No job cards found</p>
                </CardContent>
              </Card>
            ) : (
              filteredJobCards.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex lg:flex-row flex-col lg:justify-between lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {job.job_number}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Created: {new Date(job.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(job.status)}>
                              {job.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge className={`${getPriorityColor(job.priority)} border font-semibold`}>
                              {job.priority.toUpperCase()}
                            </Badge>
                            {job.parts_required && job.parts_required.length > 0 && (
                              <Badge className="bg-purple-100 text-purple-800">
                                PARTS ASSIGNED
                              </Badge>
                            )}
                            {(job.vehicle_registration || job.vehicle_make || job.vehicle_model) && (
                              <Badge className="bg-green-100 border-green-200 text-green-800">
                                <Car className="mr-1 w-3 h-3" />
                                VEHICLE
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4">
                          <div>
                            <h4 className="mb-2 font-medium text-gray-900">Customer</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-gray-400" />
                                {job.customer_name || 'N/A'}
                              </p>
                              {job.customer_email && (
                                <p className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  {job.customer_email}
                                </p>
                              )}
                              {job.customer_phone && (
                                <p className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  {job.customer_phone}
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="mb-2 font-medium text-gray-900">Vehicle</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex items-center gap-2">
                                <Car className="w-4 h-4 text-gray-400" />
                                {job.vehicle_registration || 'No Registration'}
                              </p>
                              {job.vehicle_make && job.vehicle_model && (
                                <p className="text-gray-600">
                                  {job.vehicle_make} {job.vehicle_model}
                                </p>
                              )}
                              {job.vehicle_year && (
                                <p className="text-gray-600">
                                  Year: {job.vehicle_year}
                                </p>
                              )}
                              {job.vin_numer && (
                                <p className="text-gray-600">
                                  VIN: {job.vin_numer}
                                </p>
                              )}
                              {job.odormeter && (
                                <p className="text-gray-600">
                                  Odometer: {job.odormeter}
                                </p>
                              )}
                              {!job.vehicle_registration && !job.vehicle_make && !job.vehicle_model && (
                                <p className="text-gray-400 italic">No vehicle information</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="mb-2 font-medium text-gray-900">Job Details</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {job.job_type?.toUpperCase() || 'N/A'}
                              </p>
                              {job.estimated_duration_hours && (
                                <p className="text-gray-600">
                                  Est. Duration: {job.estimated_duration_hours}h
                                </p>
                              )}
                              {job.estimated_cost && (
                                <p className="text-gray-600">
                                  Est. Cost: R{job.estimated_cost}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {job.job_description && (
                          <div className="mb-4">
                            <h4 className="mb-2 font-medium text-gray-900">Description</h4>
                            <p className="text-gray-600 text-sm">{job.job_description}</p>
                          </div>
                        )}

                        {job.parts_required && job.parts_required.length > 0 && (
                          <div className="mb-4">
                            <h4 className="mb-2 font-medium text-gray-900">Parts Assigned</h4>
                            <div className="flex flex-wrap gap-2">
                              {job.parts_required.map((part, index) => (
                                <Badge key={index} variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                                  {part.description}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {job.technician_name && (
                          <div className="mb-4">
                            <h4 className="mb-2 font-medium text-gray-900">Assigned Technician</h4>
                            <p className="text-gray-600 text-sm">{job.technician_name}</p>
                            {job.technician_phone && (
                              <p className="text-gray-600 text-sm">{job.technician_phone}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {!job.technician_name ? (
                          <Button
                            onClick={() => handleAssignTechnician(job)}
                            className="flex items-center gap-2"
                            disabled={!hasPartsRequired(job)}
                            variant={!hasPartsRequired(job) ? "outline" : "default"}
                            title={!hasPartsRequired(job) ? "Parts must be assigned before technician can be assigned" : ""}
                          >
                            <UserPlus className="w-4 h-4" />
                            Assign Technician
                          </Button>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            Assigned: {job.technician_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )
    },
    {
      value: 'assigned-jobs',
      label: 'Assigned Jobs',
      icon: Calendar,
      content: (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 text-xl">Assigned Jobs</h2>
            <Button onClick={fetchAssignedJobs} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {loadingAssignedJobs ? (
            <div className="flex justify-center items-center py-12">
              <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
              <span className="ml-2">Loading assigned jobs...</span>
            </div>
          ) : assignedJobs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <h3 className="mb-2 font-medium text-gray-900 text-lg">No Jobs Assigned Today</h3>
                <p className="text-gray-500">There are no jobs assigned for today. Assign technicians to jobs to see them here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="gap-4 grid">
              {assignedJobs.map((schedule) => (
                <Card key={schedule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {schedule.job_number}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Scheduled: {new Date(schedule.scheduled_date).toLocaleString()}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {schedule.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4">
                      <div>
                        <h4 className="mb-2 font-medium text-gray-900">Technician</h4>
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-gray-400" />
                            {schedule.technician_name}
                          </p>
                          <p className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {schedule.technician_email}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-2 font-medium text-gray-900">Customer</h4>
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-gray-400" />
                            {schedule.customer_name || 'N/A'}
                          </p>
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {schedule.vehicle_registration || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-2 font-medium text-gray-900">Job Details</h4>
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {schedule.job_type?.toUpperCase() || 'N/A'}
                          </p>
                          <p className="text-gray-600">
                            Duration: {schedule.estimated_duration_hours}h
                          </p>
                          <p className="text-gray-600">
                            Location: {schedule.job_location || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {schedule.job_description && (
                      <div className="mb-4">
                        <h4 className="mb-2 font-medium text-gray-900">Description</h4>
                        <p className="text-gray-600 text-sm">{schedule.job_description}</p>
                      </div>
                    )}

                    {schedule.notes && (
                      <div className="mb-4">
                        <h4 className="mb-2 font-medium text-gray-900">Notes</h4>
                        <p className="text-gray-600 text-sm">{schedule.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      value: 'overview',
      label: 'Overview',
      icon: BarChart3,
      content: (
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {overviewMetrics.map((metric) => (
            <StatsCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              subtitle={metric.subtitle}
              icon={metric.icon}
              color={metric.color}
            />
          ))}
        </div>
      )
    },
    {
      value: 'jobs-with-parts',
      label: 'Jobs with Parts',
      icon: Package,
      content: (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-gray-900 text-xl">Jobs with Parts Assigned</h2>
              <p className="mt-1 text-gray-600 text-sm">Showing all jobs that have parts assigned, regardless of status</p>
            </div>
            <Button onClick={() => fetchJobsWithParts()} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {loadingJobsWithParts ? (
            <div className="flex justify-center items-center py-12">
              <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
              <span className="ml-2">Loading jobs with parts...</span>
            </div>
          ) : jobsWithParts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <h3 className="mb-2 font-medium text-gray-900 text-lg">No Jobs with Parts</h3>
                <p className="text-gray-500">There are no jobs that require parts. Parts will appear here when assigned to jobs.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="gap-4 grid">
              {jobsWithParts.map((job) => (
                <Card key={job.id} className="hover:shadow-md border-l-4 border-l-purple-500 transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex lg:flex-row flex-col lg:justify-between lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {job.job_number}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Created: {new Date(job.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(job.status)}>
                              {job.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge className={`${getPriorityColor(job.priority)} border font-semibold`}>
                              {job.priority.toUpperCase()}
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-800">
                              PARTS ASSIGNED
                            </Badge>
                          </div>
                        </div>

                        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-4">
                          <div>
                            <h4 className="mb-2 font-medium text-gray-900">Customer</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-gray-400" />
                                {job.customer_name || 'N/A'}
                              </p>
                              {job.customer_email && (
                                <p className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  {job.customer_email}
                                </p>
                              )}
                              {job.customer_phone && (
                                <p className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-gray-400" />
                                  {job.customer_phone}
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="mb-2 font-medium text-gray-900">Vehicle</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                {job.vehicle_registration || 'N/A'}
                              </p>
                              {job.vehicle_make && job.vehicle_model && (
                                <p className="text-gray-600">
                                  {job.vehicle_make} {job.vehicle_model}
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="mb-2 font-medium text-gray-900">Job Details</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {job.job_type?.toUpperCase() || 'N/A'}
                              </p>
                              {job.estimated_duration_hours && (
                                <p className="text-gray-600">
                                  Est. Duration: {job.estimated_duration_hours}h
                                </p>
                              )}
                              {job.estimated_cost && (
                                <p className="text-gray-600">
                                  Est. Cost: R{job.estimated_cost}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {job.job_description && (
                          <div className="mb-4">
                            <h4 className="mb-2 font-medium text-gray-900">Description</h4>
                            <p className="text-gray-600 text-sm">{job.job_description}</p>
                          </div>
                        )}

                        {job.parts_required && job.parts_required.length > 0 && (
                          <div className="mb-4">
                            <h4 className="mb-2 font-medium text-gray-900">Parts Assigned</h4>
                            <div className="flex flex-wrap gap-2">
                              {job.parts_required.map((part, index) => (
                                <Badge key={index} variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                                  {part.description}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {job.technician_name && (
                          <div className="mb-4">
                            <h4 className="mb-2 font-medium text-gray-900">Assigned Technician</h4>
                            <p className="text-gray-600 text-sm">{job.technician_name}</p>
                            {job.technician_phone && (
                              <p className="text-gray-600 text-sm">{job.technician_phone}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {!job.technician_name ? (
                          <Button
                            onClick={() => handleAssignTechnician(job)}
                            className="flex items-center gap-2"
                            disabled={!hasPartsRequired(job)}
                            variant={!hasPartsRequired(job) ? "outline" : "default"}
                            title={!hasPartsRequired(job) ? "Parts must be assigned before technician can be assigned" : ""}
                          >
                            <UserPlus className="w-4 h-4" />
                            Assign Technician
                          </Button>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            Assigned: {job.technician_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h1 className="font-bold text-gray-900 text-2xl">Admin Dashboard</h1>
      </div>

      {/* Quick Access Section */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/protected/admin/all-job-cards'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">All Job Cards</h3>
                <p className="text-gray-600 text-sm">View comprehensive job card information with vehicle details</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('all-jobs')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Job Management</h3>
                <p className="text-gray-600 text-sm">Manage and assign technicians to jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('assigned-jobs')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Schedule</h3>
                <p className="text-gray-600 text-sm">View today's assigned jobs and schedule</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DashboardTabs
        tabs={tabItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

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
                  <p><strong>Vehicle:</strong> {selectedJob.vehicle_registration}</p>
                  <p><strong>Job Type:</strong> {selectedJob.job_type}</p>
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
            <div className="gap-4 grid grid-cols-2">
              <div>
                <Label htmlFor="assignment-date">Assignment Date</Label>
                <Input
                  id="assignment-date"
                  type="date"
                  value={assignmentDate}
                  onChange={(e) => setAssignmentDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="assignment-time">Assignment Time</Label>
                <Input
                  id="assignment-time"
                  type="time"
                  value={assignmentTime}
                  onChange={(e) => setAssignmentTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="assignment-notes">Notes (Optional)</Label>
              <Input
                id="assignment-notes"
                placeholder="Add any notes about this assignment..."
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignTechnicianOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmAssignTechnician} disabled={!selectedTechnician}>
                Assign Technician
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}