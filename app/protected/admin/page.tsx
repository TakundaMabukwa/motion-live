'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
  FileText,
  Plus
} from 'lucide-react';
import StatsCard from '@/components/shared/StatsCard';
import { toast } from 'sonner';
import CreateJobModal from './components/CreateJobModal';

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

  const [jobsWithParts, setJobsWithParts] = useState<JobCard[]>([]);
  const [loadingJobsWithParts, setLoadingJobsWithParts] = useState(false);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);
  const [createJobStep, setCreateJobStep] = useState(1);
  const [newJobData, setNewJobData] = useState({
    jobType: 'install',
    jobDescription: '',
    priority: 'medium',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    vehicleRegistration: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: 2023,
    partsRequired: [] as PartRequired[],
  });
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [selectedTechnicianForJob, setSelectedTechnicianForJob] = useState('');
  const [assignmentDateForJob, setAssignmentDateForJob] = useState('');
  const [assignmentTimeForJob, setAssignmentTimeForJob] = useState('');

  // FC External-quotation style product selection for installation
  const [aqProducts, setAqProducts] = useState<any[]>([]);
  const [aqSelectedProducts, setAqSelectedProducts] = useState<any[]>([]);
  const [aqLoadingProducts, setAqLoadingProducts] = useState(false);
  const [aqSearchTerm, setAqSearchTerm] = useState('');
  const [aqSelectedType, setAqSelectedType] = useState('all');
  const [aqSelectedCategory, setAqSelectedCategory] = useState('all');

  // For deinstall: vehicles from vehicles_ip
  const [vehiclesIp, setVehiclesIp] = useState<any[]>([]);
  const [loadingVehiclesIp, setLoadingVehiclesIp] = useState(false);
  const [selectedVehicleIp, setSelectedVehicleIp] = useState<any>(null);

  const aqProductTypes = [
    'FMS', 'BACKUP', 'MODULE', 'INPUT', 'PFK CAMERA', 'DASHCAM', 'PTT', 'DVR CAMERA'
  ];
  const aqProductCategories = [
    'HARDWARE', 'MODULES', 'INPUTS', 'CAMERA EQUIPMENT', 'AI MOVEMENT DETECTION', 'PTT RADIOS'
  ];

  const fetchAqProducts = useCallback(async () => {
    setAqLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (aqSelectedType && aqSelectedType !== 'all') params.append('type', aqSelectedType);
      if (aqSelectedCategory && aqSelectedCategory !== 'all') params.append('category', aqSelectedCategory);
      if (aqSearchTerm) params.append('search', aqSearchTerm);
      const res = await fetch(`/api/product-items?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.products)) setAqProducts(data.products);
      else if (Array.isArray(data)) setAqProducts(data);
      else setAqProducts([]);
    } catch (e) {
      console.error('Failed to fetch products', e);
      setAqProducts([]);
    } finally {
      setAqLoadingProducts(false);
    }
  }, [aqSelectedType, aqSelectedCategory, aqSearchTerm]);

  useEffect(() => { if (createJobOpen) fetchAqProducts(); }, [createJobOpen, fetchAqProducts]);

  const fetchVehiclesIp = useCallback(async () => {
    setLoadingVehiclesIp(true);
    try {
      const res = await fetch('/api/vehicles-ip');
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const data = await res.json();
      setVehiclesIp(data.vehicles || []);
    } catch (e) {
      console.error('Failed to fetch vehicles', e);
      setVehiclesIp([]);
    } finally {
      setLoadingVehiclesIp(false);
    }
  }, []);

  useEffect(() => { 
    if (createJobOpen) {
      // Load popup first, then load data after a short delay for smooth rendering
      const timer = setTimeout(() => {
        fetchAqProducts();
      }, 100); // 100ms delay to ensure popup is fully rendered
      return () => clearTimeout(timer);
    }
  }, [createJobOpen, fetchAqProducts]);

  const aqAddProduct = (product: any) => {
    const newProduct = {
      id: product.id,
      name: product.product,
      description: product.description,
      type: product.type,
      category: product.category,
      cashPrice: product.price || 0,
      cashDiscount: product.discount || 0,
      rentalPrice: product.rental || 0,
      rentalDiscount: 0,
      installationPrice: newJobData.jobType === 'install' ? (product.installation || 0) : 0,
      installationDiscount: 0,
      deInstallationPrice: newJobData.jobType === 'deinstall' ? (product.installation || 0) : 0,
      deInstallationDiscount: 0,
      subscriptionPrice: product.subscription || 0,
      subscriptionDiscount: 0,
      quantity: 1,
      purchaseType: 'purchase',
    };
    setAqSelectedProducts(prev => [...prev, newProduct]);
  };

  const aqRemoveProduct = (index: number) => {
    setAqSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const aqUpdateProduct = (index: number, field: string, value: any) => {
    setAqSelectedProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const aqCalcGross = (price: number, discount: number) => Math.max(0, (price || 0) - (discount || 0));

  const aqGetProductTotal = (p: any) => {
    let total = 0;
    // cash only for admin job create for now
    total += aqCalcGross(p.cashPrice, p.cashDiscount);
    if (newJobData.jobType === 'install') total += aqCalcGross(p.installationPrice, p.installationDiscount || 0);
    if (newJobData.jobType === 'deinstall') total += aqCalcGross(p.deInstallationPrice, p.deInstallationDiscount || 0);
    if (p.purchaseType === 'rental' && p.subscriptionPrice) total += aqCalcGross(p.subscriptionPrice, p.subscriptionDiscount || 0);
    return total * (p.quantity || 1);
  };

  const aqSubtotal = aqSelectedProducts.reduce((sum, p) => sum + aqGetProductTotal(p), 0);
  const aqVat = aqSubtotal * 0.15;
  const aqTotal = aqSubtotal + aqVat;

  const handleVehicleIpSelect = (vehicle: any) => {
    setSelectedVehicleIp(vehicle);
    setNewJobData(prev => ({
      ...prev,
      vehicleRegistration: vehicle.new_registration || '',
      vehicleMake: vehicle.company || '',
      vehicleModel: vehicle.group_name || '',
      // Note: vehicles_ip doesn't have year, so we'll leave it as default
    }));
  };

  const handleJobTypeChange = (jobType: string) => {
    setNewJobData(prev => ({ ...prev, jobType }));
    if (jobType === 'deinstall') {
      // Load vehicles with a small delay for smooth UI updates
      const timer = setTimeout(() => {
        fetchVehiclesIp();
      }, 50); // 50ms delay for smooth UI transition
      return () => clearTimeout(timer);
    }
    // Clear vehicle data when switching job types
    setSelectedVehicleIp(null);
    setNewJobData(prev => ({
      ...prev,
      vehicleRegistration: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: 2023,
    }));
  };

  // Fetch job cards with caching
  const fetchJobCards = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && jobsLoaded) return;
    
      setLoading(true);
    try {
      const response = await fetch('/api/job-cards');
      if (!response.ok) throw new Error('Failed to fetch job cards');
      
      const data = await response.json();
      setJobCards(data.job_cards || []);
      setJobsLoaded(true);
    } catch (error) {
      console.error('Error fetching job cards:', error);
    } finally {
      setLoading(false);
    }
  }, [jobsLoaded]);

  // Set default assignment date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setAssignmentDateForJob(today);
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
    fetchJobsWithParts();
  }, [fetchJobCards, fetchTechnicians, fetchJobsWithParts]);

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
    } catch (error) {
      console.error('Error assigning technician:', error);
      toast.error('Failed to assign technician');
    }
  };

  const handleCreateJob = async () => {
    // Validate required fields
    if (!newJobData.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }

    // For deinstall jobs, ensure a vehicle is selected
    if (newJobData.jobType === 'deinstall' && !selectedVehicleIp) {
      toast.error('Please select a vehicle for deinstall job');
      return;
    }

    try {
      const jobData = {
        jobType: newJobData.jobType,
        jobDescription: newJobData.jobDescription,
        priority: newJobData.priority,
        customerName: newJobData.customerName,
        customerEmail: newJobData.customerEmail,
        customerPhone: newJobData.customerPhone,
        customerAddress: newJobData.customerAddress,
        vehicleRegistration: newJobData.vehicleRegistration,
        vehicleMake: newJobData.vehicleMake,
        vehicleModel: newJobData.vehicleModel,
        vehicleYear: newJobData.vehicleYear,
        status: 'pending',
        job_status: 'created',
        // For deinstall: include vehicle_ip reference
        vehicle_ip_id: newJobData.jobType === 'deinstall' && selectedVehicleIp ? selectedVehicleIp.id : null,
        // quotation-style fields
        purchaseType: 'purchase',
        quotationJobType: newJobData.jobType,
        quotationProducts: aqSelectedProducts.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          type: p.type,
          category: p.category,
          cash_price: p.cashPrice,
          cash_discount: p.cashDiscount,
          cash_gross: aqCalcGross(p.cashPrice, p.cashDiscount),
          rental_price: p.rentalPrice,
          rental_discount: p.rentalDiscount,
          rental_gross: aqCalcGross(p.rentalPrice, p.rentalDiscount),
          installation_price: p.installationPrice,
          installation_discount: p.installationDiscount,
          installation_gross: aqCalcGross(p.installationPrice, p.installationDiscount),
          de_installation_price: p.deInstallationPrice,
          de_installation_discount: p.deInstallationDiscount,
          de_installation_gross: aqCalcGross(p.deInstallationPrice, p.deInstallationDiscount),
          subscription_price: p.subscriptionPrice,
          subscription_discount: p.subscriptionDiscount,
          subscription_gross: aqCalcGross(p.subscriptionPrice, p.subscriptionDiscount),
          quantity: p.quantity,
          line_total: aqGetProductTotal(p)
        })),
        quotationSubtotal: aqSubtotal,
        quotationVatAmount: aqVat,
        quotationTotalAmount: aqTotal,
        quoteType: 'external'
      };

      const response = await fetch('/api/job-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create job');
      }

      const result = await response.json();
      toast.success(`Job created successfully! Job number: ${result.data.job_number}`);

      // Store the created job ID and move to technician assignment step
      setCreatedJobId(result.data.id);
      setCreateJobStep(2);
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error(`Failed to create job: ${error.message}`);
    }
  };

  const resetCreateJobForm = () => {
    setNewJobData({
      jobType: 'install',
      jobDescription: '',
      priority: 'medium',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      vehicleRegistration: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: 2023,
      partsRequired: [],
    });
    setCreateJobStep(1);
    setCreatedJobId(null);
    setSelectedTechnicianForJob('');
    setAssignmentDateForJob('');
    setAssignmentTimeForJob('');
    setAqSelectedProducts([]);
    setSelectedVehicleIp(null);
    setVehiclesIp([]);
  };

  const handleAssignTechnicianToNewJob = async () => {
    if (!createdJobId || !selectedTechnicianForJob || !assignmentDateForJob) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const technician = technicians.find(t => t.name === selectedTechnicianForJob);
      if (!technician) {
        toast.error('Selected technician not found');
        return;
      }

      const assignmentDateTime = `${assignmentDateForJob}T${assignmentTimeForJob || '09:00'}:00`;

      const response = await fetch(`/api/admin/jobs/assign-technician`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: createdJobId,
          technicianEmail: technician.email,
          technicianName: technician.name,
          jobDate: assignmentDateTime,
          startTime: assignmentTimeForJob || null,
          endTime: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to assign technician');
        return;
      }

      toast.success(`Technician ${technician.name} assigned successfully to the new job!`);

      // Reset everything and close dialog
      resetCreateJobForm();
      setCreateJobStep(1);
      setCreatedJobId(null);
      setSelectedTechnicianForJob('');
      setAssignmentDateForJob('');
      setAssignmentTimeForJob('');
      setCreateJobOpen(false);

      // Refresh job cards
      await fetchJobCards(true);
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

  // Sort jobs: newest first, then by assignment status and priority
  const sortJobs = (jobs: JobCard[]) => {
    return [...jobs].sort((a, b) => {
      // Primary sort: creation date (newest first)
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      
      if (aDate !== bDate) {
        return bDate - aDate; // Newest first
      }
      
      // Secondary sort: assignment status (unassigned first)
      const aAssigned = !!a.technician_name;
      const bAssigned = !!b.technician_name;
      
      if (aAssigned && !bAssigned) return 1; // a goes to bottom
      if (!aAssigned && bAssigned) return -1; // b goes to top
      
      // Tertiary sort: priority
      const priorityOrder = { 'critical': 0, 'urgent': 1, 'high': 2, 'medium': 3, 'low': 4 };
      const aPriority = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 5;
      const bPriority = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 5;
      
      return aPriority - bPriority;
    });
  };

  const filteredJobCards = sortJobs(jobCards.filter(job => {
    const matchesSearch = 
      job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.vehicle_registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.job_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Show only jobs with no technician assigned AND with parts assigned
    return matchesSearch && !job.technician_name && hasPartsRequired(job);
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
      label: 'Ready for Technician',
      icon: BarChart3,
      content: (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-gray-900 text-xl">Jobs Ready for Technician Assignment</h2>
              <p className="mt-1 text-gray-600 text-sm">Showing jobs with parts assigned and no technician assigned</p>
            </div>
            <Button onClick={() => fetchJobCards(true)} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

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
    },
    {
      value: 'waiting-for-parts',
      label: 'Waiting for Parts',
      icon: Package,
      content: (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-gray-900 text-xl">Jobs Waiting for Parts</h2>
              <p className="mt-1 text-gray-600 text-sm">Showing jobs that need parts assigned before technician assignment</p>
            </div>
            <Button onClick={() => fetchJobCards(true)} variant="outline" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
              <span className="ml-2">Loading jobs...</span>
            </div>
          ) : jobCards.filter(job => !hasPartsRequired(job)).length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                <h3 className="mb-2 font-medium text-gray-900 text-lg">No Jobs Waiting for Parts</h3>
                <p className="text-gray-500">All jobs have parts assigned. Great job!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="gap-4 grid">
              {sortJobs(jobCards.filter(job => !hasPartsRequired(job))).map((job) => (
                <Card key={job.id} className="hover:shadow-md border-l-4 border-l-orange-500 transition-shadow">
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
                            <Badge className="bg-orange-100 border-orange-200 text-orange-800">
                              NEEDS PARTS
                            </Badge>
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
                        <Badge className="bg-orange-100 border-orange-200 text-orange-800">
                          Parts Required
                        </Badge>
                        <p className="text-gray-500 text-xs text-center">Assign parts before technician</p>
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

      {/* Overview Cards Section */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-blue-600 text-sm">Total Jobs</p>
                <p className="font-bold text-blue-900 text-2xl">{jobCards.length}</p>
                <p className="text-blue-700 text-xs">All job cards</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-green-600 text-sm">Technicians Assigned</p>
                <p className="font-bold text-green-900 text-2xl">{jobCards.filter(job => job.technician_name).length}</p>
                <p className="text-green-700 text-xs">Jobs with technicians</p>
              </div>
              <div className="bg-green-500 p-3 rounded-full">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-purple-600 text-sm">Jobs with Parts</p>
                <p className="font-bold text-purple-900 text-2xl">{jobCards.filter(job => hasPartsRequired(job)).length}</p>
                <p className="text-purple-700 text-xs">Parts assigned</p>
              </div>
              <div className="bg-purple-500 p-3 rounded-full">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-orange-600 text-sm">Waiting for Parts</p>
                <p className="font-bold text-orange-900 text-2xl">{jobCards.filter(job => !hasPartsRequired(job)).length}</p>
                <p className="text-orange-700 text-xs">Need parts assigned</p>
              </div>
              <div className="bg-orange-500 p-3 rounded-full">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Quick Access Section */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setCreateJobModalOpen(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Plus className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Create Job</h3>
                <p className="text-gray-600 text-sm">Create a new job with photos and details</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
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
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/protected/admin/schedule'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Schedule</h3>
                <p className="text-gray-600 text-sm">View technicians' calendars and schedule</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/protected/admin/completed-jobs'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Completed Jobs</h3>
                <p className="text-gray-600 text-sm">View all completed job cards and history</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Top Bar Navigation */}
      <div className="bg-white p-1 border border-gray-200 rounded-lg">
        <div className="gap-1 grid grid-cols-4">
          {tabItems.map((item) => (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === item.value
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {item.icon && <item.icon className="w-4 h-4" />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-4">
        <a
          href="/protected/admin/schedule"
          className="flex items-center gap-2 hover:bg-gray-50 px-4 py-2 rounded-md font-medium text-gray-700 hover:text-gray-900 text-sm transition-all duration-200"
        >
          <Calendar className="w-4 h-4" />
          Schedule
        </a>
        <a
          href="/protected/admin/all-job-cards"
          className="flex items-center gap-2 hover:bg-gray-50 px-4 py-2 rounded-md font-medium text-gray-700 hover:text-gray-900 text-sm transition-all duration-200"
        >
          <FileText className="w-4 h-4" />
          All Job Cards
        </a>

      </div>

      {/* Tab Content */}
      {tabItems.map((item) => (
        activeTab === item.value && (
          <div key={item.value}>
            {item.content}
          </div>
        )
      ))}

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

      {/* Create Job Dialog */}
      <Dialog open={createJobOpen} onOpenChange={(open) => {
        setCreateJobOpen(open);
        if (!open) {
          resetCreateJobForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {createJobStep === 1 ? 'Create New Job' : 'Assign Technician'}
            </DialogTitle>
          </DialogHeader>
          
          {createJobStep === 1 ? (
            // Step 1: Job Creation Form
            <div className="space-y-6">
              {/* Job Details Section */}
              <div className="space-y-4">
                <h3 className="pb-2 border-b font-semibold text-gray-900 text-lg">Job Details</h3>
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div>
                    <Label htmlFor="jobType">Job Type *</Label>
                    <Select value={newJobData.jobType} onValueChange={handleJobTypeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="install">Install</SelectItem>
                        <SelectItem value="deinstall">Deinstall</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority *</Label>
                    <Select value={newJobData.priority} onValueChange={(value) => setNewJobData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="jobDescription">Job Description</Label>
                  <Textarea
                    id="jobDescription"
                    placeholder="Describe the job requirements..."
                    value={newJobData.jobDescription}
                    onChange={(e) => setNewJobData(prev => ({ ...prev, jobDescription: e.target.value }))}
                    rows={3}
                  />
                </div>

              </div>

              {/* Customer Details Section */}
              <div className="space-y-4">
                <h3 className="pb-2 border-b font-semibold text-gray-900 text-lg">Customer Details</h3>
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      placeholder="Enter customer name..."
                      value={newJobData.customerName}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, customerName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="Enter customer email..."
                      value={newJobData.customerEmail}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div>
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input
                      id="customerPhone"
                      placeholder="Enter customer phone..."
                      value={newJobData.customerPhone}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerAddress">Customer Address</Label>
                    <Input
                      id="customerAddress"
                      placeholder="Enter customer address..."
                      value={newJobData.customerAddress}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, customerAddress: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Details Section */}
              <div className="space-y-4">
                <h3 className="pb-2 border-b font-semibold text-gray-900 text-lg">Vehicle Details</h3>
                
                {newJobData.jobType === 'deinstall' && (
                  <div className="bg-blue-50 mb-4 p-4 border border-blue-200 rounded-lg">
                    <h4 className="mb-3 font-medium text-blue-800">Select Vehicle for Deinstall</h4>
                    {loadingVehiclesIp ? (
                      <div className="text-blue-600">Loading vehicles...</div>
                    ) : vehiclesIp.length === 0 ? (
                      <div className="text-blue-600">No vehicles found</div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-auto">
                        {vehiclesIp.map((vehicle) => (
                          <div 
                            key={vehicle.id} 
                            className={`p-2 border rounded cursor-pointer hover:bg-blue-100 ${
                              selectedVehicleIp?.id === vehicle.id ? 'bg-blue-200 border-blue-400' : 'bg-white'
                            }`}
                            onClick={() => handleVehicleIpSelect(vehicle)}
                          >
                            <div className="font-medium text-sm">{vehicle.new_registration || 'No Registration'}</div>
                            <div className="text-gray-600 text-xs">
                              Company: {vehicle.company || 'N/A'} | Group: {vehicle.group_name || 'N/A'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              IP: {vehicle.ip_address || 'N/A'} | VIN: {vehicle.vin_number || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div>
                    <Label htmlFor="vehicleRegistration">Vehicle Registration</Label>
                    <Input
                      id="vehicleRegistration"
                      placeholder="Enter vehicle registration..."
                      value={newJobData.vehicleRegistration}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, vehicleRegistration: e.target.value }))}
                      readOnly={newJobData.jobType === 'deinstall' && selectedVehicleIp}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicleMake">Vehicle Make</Label>
                    <Input
                      id="vehicleMake"
                      placeholder="Enter vehicle make..."
                      value={newJobData.vehicleMake}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, vehicleMake: e.target.value }))}
                      readOnly={newJobData.jobType === 'deinstall' && selectedVehicleIp}
                    />
                  </div>
                </div>
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div>
                    <Label htmlFor="vehicleModel">Vehicle Model</Label>
                    <Input
                      id="vehicleModel"
                      placeholder="Enter vehicle model..."
                      value={newJobData.vehicleModel}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                      readOnly={newJobData.jobType === 'deinstall' && selectedVehicleIp}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicleYear">Vehicle Year</Label>
                    <Input
                      id="vehicleYear"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={newJobData.vehicleYear}
                      onChange={(e) => setNewJobData(prev => ({ ...prev, vehicleYear: parseInt(e.target.value) || 2023 }))}
                      readOnly={newJobData.jobType === 'deinstall' && selectedVehicleIp}
                    />
                  </div>
                </div>
              </div>

              {/* Products (FC external quotation style) */}
              <div className="space-y-4">
                <h3 className="pb-2 border-b font-semibold text-gray-900 text-lg">Products</h3>
                <div className="gap-3 grid grid-cols-1 md:grid-cols-3">
                  <div>
                    <Label className="text-sm">Type</Label>
                    <Select value={aqSelectedType} onValueChange={setAqSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {aqProductTypes.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Category</Label>
                    <Select value={aqSelectedCategory} onValueChange={setAqSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {aqProductCategories.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Search</Label>
                    <Input value={aqSearchTerm} onChange={(e) => setAqSearchTerm(e.target.value)} placeholder="Search products" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={fetchAqProducts} disabled={aqLoadingProducts}>
                    Refresh
                  </Button>
                </div>

                <div className="gap-3 grid grid-cols-1 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Available Products</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-64 overflow-auto">
                      {aqLoadingProducts ? (
                        <div className="text-gray-500 text-sm">Loading...</div>
                      ) : aqProducts.length === 0 ? (
                        <div className="text-gray-500 text-sm">No products</div>
                      ) : (
                        aqProducts.map((p: any) => (
                          <div key={p.id} className="flex justify-between items-center py-2 border-b">
                            <div>
                              <div className="font-medium text-sm">{p.product}</div>
                              <div className="text-gray-500 text-xs">Installation: R{(p.installation || 0).toFixed(2)}</div>
                            </div>
                            <Button size="sm" onClick={() => aqAddProduct(p)}>Add</Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Selected Products</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-64 overflow-auto">
                      {aqSelectedProducts.length === 0 ? (
                        <div className="text-gray-500 text-sm">No products selected</div>
                      ) : (
                        aqSelectedProducts.map((prod, idx) => (
                          <div key={idx} className="space-y-2 p-2 border rounded">
                            <div className="flex justify-between items-center">
                              <div className="font-medium text-sm">{prod.name}</div>
                              <Button size="icon" variant="ghost" onClick={() => aqRemoveProduct(idx)}>
                                ×
                              </Button>
                            </div>
                            <div className="gap-3 grid grid-cols-3">
                              <div>
                                <Label className="text-xs">Cash ex VAT</Label>
                                <Input type="number" value={prod.cashPrice} onChange={(e) => aqUpdateProduct(idx, 'cashPrice', parseFloat(e.target.value) || 0)} />
                              </div>
                              <div>
                                <Label className="text-xs">Cash Discount</Label>
                                <Input type="number" value={prod.cashDiscount} onChange={(e) => aqUpdateProduct(idx, 'cashDiscount', parseFloat(e.target.value) || 0)} />
                              </div>
                              <div>
                                <Label className="text-xs">Qty</Label>
                                <Input type="number" min={1} value={prod.quantity} onChange={(e) => aqUpdateProduct(idx, 'quantity', parseInt(e.target.value) || 1)} />
                              </div>
                            </div>
                            <div className="gap-3 grid grid-cols-3">
                              <div>
                                <Label className="text-xs">Install ex VAT</Label>
                                <Input type="number" value={prod.installationPrice} onChange={(e) => aqUpdateProduct(idx, 'installationPrice', parseFloat(e.target.value) || 0)} />
                              </div>
                              <div>
                                <Label className="text-xs">Install Discount</Label>
                                <Input type="number" value={prod.installationDiscount} onChange={(e) => aqUpdateProduct(idx, 'installationDiscount', parseFloat(e.target.value) || 0)} />
                              </div>
                              <div>
                                <Label className="text-xs">Line Total</Label>
                                <Input readOnly value={aqGetProductTotal(prod).toFixed(2)} />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Separator />
                <div className="flex justify-end gap-6 text-sm">
                  <div>Subtotal: <span className="font-semibold">R{aqSubtotal.toFixed(2)}</span></div>
                  <div>VAT (15%): <span className="font-semibold">R{aqVat.toFixed(2)}</span></div>
                  <div>Total: <span className="font-semibold">R{aqTotal.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  resetCreateJobForm();
                  setCreateJobOpen(false);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateJob} 
                  disabled={!newJobData.customerName.trim() || (newJobData.jobType === 'deinstall' && !selectedVehicleIp)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Create Job
                </Button>
              </div>
            </div>
          ) : (
            // Step 2: Technician Assignment
            <div className="space-y-6">
              <div className="bg-green-50 p-4 border border-green-200 rounded-lg">
                <h4 className="mb-2 font-medium text-green-800">Job Created Successfully!</h4>
                <p className="text-green-700 text-sm">Now assign a technician to complete the setup.</p>
              </div>

              <div className="space-y-4">
                <h3 className="pb-2 border-b font-semibold text-gray-900 text-lg">Technician Assignment</h3>
                <div>
                  <Label htmlFor="technicianForJob">Select Technician *</Label>
                  <Select value={selectedTechnicianForJob} onValueChange={setSelectedTechnicianForJob}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a technician" />
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
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div>
                    <Label htmlFor="assignmentDateForJob">Assignment Date *</Label>
                    <Input
                      id="assignmentDateForJob"
                      type="date"
                      value={assignmentDateForJob}
                      onChange={(e) => setAssignmentDateForJob(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="assignmentTimeForJob">Assignment Time</Label>
                    <Input
                      id="assignmentTimeForJob"
                      type="time"
                      value={assignmentTimeForJob}
                      onChange={(e) => setAssignmentTimeForJob(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setCreateJobStep(1)}>
                  Back
                </Button>
                <Button 
                  onClick={handleAssignTechnicianToNewJob} 
                  disabled={!selectedTechnicianForJob || !assignmentDateForJob}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="mr-2 w-4 h-4" />
                  Assign Technician
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={createJobModalOpen}
        onClose={() => setCreateJobModalOpen(false)}
        onJobCreated={(jobData) => {
          toast.success(`Job created successfully: ${jobData.job_number}`);
          setCreateJobModalOpen(false);
          // Refresh job data if needed
          if (activeTab === 'all-jobs') {
            fetchJobCards();
          }
        }}
      />
    </div>
  );
}