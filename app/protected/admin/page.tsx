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
  const [viewJobOpen, setViewJobOpen] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [editableVehicle, setEditableVehicle] = useState<{
    registration: string;
    make: string;
    model: string;
    year: string;
    vin: string;
    odometer: string;
  }>({
    registration: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    odometer: ''
  });
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [assignmentTime, setAssignmentTime] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);


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
  const [aqProducts, setAqProducts] = useState<Record<string, unknown>[]>([]);
  const [aqSelectedProducts, setAqSelectedProducts] = useState<Record<string, unknown>[]>([]);
  const [aqLoadingProducts, setAqLoadingProducts] = useState(false);
  const [aqSearchTerm, setAqSearchTerm] = useState('');
  const [aqSelectedType, setAqSelectedType] = useState('all');
  const [aqSelectedCategory, setAqSelectedCategory] = useState('all');

  // For deinstall: vehicles from vehicles_ip
  interface VehicleIp {
    id: string;
    new_registration?: string;
    company?: string;
    group_name?: string;
    [key: string]: any; // For other properties that might exist
  }

  const [vehiclesIp, setVehiclesIp] = useState<VehicleIp[]>([]);
  const [loadingVehiclesIp, setLoadingVehiclesIp] = useState(false);
  const [selectedVehicleIp, setSelectedVehicleIp] = useState<VehicleIp | null>(null);

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

  const aqAddProduct = (product: Record<string, unknown>) => {
    const newProduct = {
      id: product.id,
      name: product.product,
      description: product.description,
      type: product.type,
      category: product.category,
      cashPrice: (product.price as number) || 0,
      cashDiscount: (product.discount as number) || 0,
      rentalPrice: (product.rental as number) || 0,
      rentalDiscount: 0,
      installationPrice: newJobData.jobType === 'install' ? ((product.installation as number) || 0) : 0,
      installationDiscount: 0,
      deInstallationPrice: newJobData.jobType === 'deinstall' ? ((product.installation as number) || 0) : 0,
      deInstallationDiscount: 0,
      subscriptionPrice: (product.subscription as number) || 0,
      subscriptionDiscount: 0,
      quantity: 1,
      purchaseType: 'purchase',
    };
    setAqSelectedProducts(prev => [...prev, newProduct]);
  };

  const aqRemoveProduct = (index: number) => {
    setAqSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const aqUpdateProduct = (index: number, field: string, value: unknown) => {
    setAqSelectedProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const aqCalcGross = (price: number, discount: number) => Math.max(0, (price || 0) - (discount || 0));

  const aqGetProductTotal = (p: Record<string, unknown>) => {
    let total = 0;
    // cash only for admin job create for now
    total += aqCalcGross(p.cashPrice as number, p.cashDiscount as number);
    if (newJobData.jobType === 'install') total += aqCalcGross(p.installationPrice as number, (p.installationDiscount as number) || 0);
    if (newJobData.jobType === 'deinstall') total += aqCalcGross(p.deInstallationPrice as number, (p.deInstallationDiscount as number) || 0);
    if (p.purchaseType === 'rental' && p.subscriptionPrice) total += aqCalcGross(p.subscriptionPrice as number, (p.subscriptionDiscount as number) || 0);
    return total * ((p.quantity as number) || 1);
  };

  const aqSubtotal = aqSelectedProducts.reduce((sum, p) => sum + aqGetProductTotal(p), 0);
  const aqVat = aqSubtotal * 0.15;
  const aqTotal = aqSubtotal + aqVat;

  const handleVehicleIpSelect = (vehicle: VehicleIp) => {
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
  
  const handleViewJob = (job: JobCard) => {
    setSelectedJob(job);
    setIsEditingVehicle(false);
    
    // Handle potentially undefined or null values safely
    const yearValue = job.vehicle_year !== undefined && job.vehicle_year !== null 
      ? job.vehicle_year.toString() 
      : '';
    
    // Initialize the editable vehicle fields with current values or empty strings
    setEditableVehicle({
      registration: job.vehicle_registration || '',
      make: job.vehicle_make || '',
      model: job.vehicle_model || '',
      year: yearValue,
      vin: job.vin_numer || '',
      odometer: job.odormeter || ''
    });
    setViewJobOpen(true);
  };

  const handleSaveVehicleInfo = async () => {
    if (!selectedJob) return;
    
    try {
      // Prepare loading state
      toast.loading('Updating vehicle information...');
      
      const response = await fetch(`/api/job-cards/${selectedJob.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Make sure field names exactly match the schema
          vehicle_registration: editableVehicle.registration,
          vehicle_make: editableVehicle.make,
          vehicle_model: editableVehicle.model,
          vehicle_year: editableVehicle.year ? parseInt(editableVehicle.year) : null,
          vin_numer: editableVehicle.vin,
          odormeter: editableVehicle.odometer
        }),
      });

      // Dismiss the loading toast
      toast.dismiss();

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update vehicle information');
      }
      
      try {
        // Get the updated job data if available
        const updatedData = await response.json();
        
        if (updatedData && updatedData.data) {
          // Update from server data if available
          if (selectedJob) {
            selectedJob.vehicle_registration = updatedData.data.vehicle_registration || editableVehicle.registration;
            selectedJob.vehicle_make = updatedData.data.vehicle_make || editableVehicle.make;
            selectedJob.vehicle_model = updatedData.data.vehicle_model || editableVehicle.model;
            selectedJob.vehicle_year = updatedData.data.vehicle_year || (editableVehicle.year ? parseInt(editableVehicle.year) : 0);
            selectedJob.vin_numer = updatedData.data.vin_numer || editableVehicle.vin;
            selectedJob.odormeter = updatedData.data.odormeter || editableVehicle.odometer;
          }
        } else {
          // Fallback to local data if server doesn't return the updated job
          if (selectedJob) {
            selectedJob.vehicle_registration = editableVehicle.registration;
            selectedJob.vehicle_make = editableVehicle.make;
            selectedJob.vehicle_model = editableVehicle.model;
            selectedJob.vehicle_year = editableVehicle.year ? parseInt(editableVehicle.year) : 0;
            selectedJob.vin_numer = editableVehicle.vin;
            selectedJob.odormeter = editableVehicle.odometer;
          }
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        // Continue with local data if parsing fails
        if (selectedJob) {
          selectedJob.vehicle_registration = editableVehicle.registration;
          selectedJob.vehicle_make = editableVehicle.make;
          selectedJob.vehicle_model = editableVehicle.model;
          selectedJob.vehicle_year = editableVehicle.year ? parseInt(editableVehicle.year) : 0;
          selectedJob.vin_numer = editableVehicle.vin;
          selectedJob.odormeter = editableVehicle.odometer;
        }
      }

      // Turn off editing mode
      setIsEditingVehicle(false);
      toast.success('Vehicle information updated successfully');
      
      // Refresh job cards in the background
      fetchJobCards(true);
    } catch (error) {
      console.error('Error updating vehicle information:', error);
      toast.error(`Failed to update vehicle information: ${error.message}`);
      // Re-enable editing mode in case of error
      setIsEditingVehicle(true);
    }
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

      // Show loading toast
      toast.loading('Assigning technician...');

      // Use our technician validation API
      const response = await fetch(`/api/technicians/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          technicianName: technician.name,
          jobDate: assignmentDate,
          startTime: assignmentTime || '09:00',
          override: false, // First attempt without override
          assignmentNotes: assignmentNotes || null,
        }),
      });

      // Dismiss loading toast
      toast.dismiss();

      const data = await response.json();

      // If there's a conflict and we need override confirmation
      if (response.status === 409 && data.needsOverride && data.conflicts) {
        setConflictData(data);
        setConflictDialogOpen(true);
        return;
      } else if (!response.ok) {
        toast.error(data.error || 'Failed to assign technician');
        return;
      } else {
        toast.success(data.message || 'Technician assigned successfully');
      }

      // Close dialog and reset values
      setAssignTechnicianOpen(false);
      setAssignmentTime('');
      setAssignmentNotes('');
      
      // Update selected job with new technician info
      if (selectedJob) {
        selectedJob.technician_name = technician.name;
        selectedJob.assigned_technician_id = technician.id;
      }
      
      // Refresh data
      fetchJobCards(true);
    } catch (error) {
      console.error('Error assigning technician:', error);
      toast.error('Failed to assign technician');
    }
  };

  const handleOverrideAssignment = async () => {
    if (!selectedJob || !selectedTechnician) return;

    try {
      const technician = technicians.find(t => t.name === selectedTechnician);
      if (!technician) return;

      toast.loading('Assigning technician with override...');
      
      const response = await fetch(`/api/technicians/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          technicianName: technician.name,
          jobDate: assignmentDate,
          startTime: assignmentTime || '09:00',
          override: true,
        }),
      });
      
      toast.dismiss();
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || 'Failed to assign technician');
        return;
      }
      
      toast.success('Technician assigned successfully with scheduling override');
      
      setConflictDialogOpen(false);
      setAssignTechnicianOpen(false);
      setAssignmentTime('');
      setAssignmentNotes('');
      
      if (selectedJob) {
        selectedJob.technician_name = technician.name;
        selectedJob.assigned_technician_id = technician.id;
      }
      
      fetchJobCards(true);
    } catch (error) {
      console.error('Error overriding assignment:', error);
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

  // Removed unused formatTechnicianInfo function

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

  // These were used for metrics/analytics but aren't currently referenced in the UI
  // Can uncomment if needed later
  /*
  const jobCardsWithParts = sortJobs(jobCards.filter(job => 
    hasPartsRequired(job)
  ));

  const completedJobs = jobCards.filter(job => 
    job.status === 'completed'
  );
  */

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

          {/* Job Cards Table */}
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="relative w-full overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-3 px-4 text-left font-medium text-gray-500">
                      <div className="flex items-center gap-1">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                        <span>Job Number</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Description</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Priority</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Status</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Created</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center">
                        <div className="flex justify-center items-center py-8">
                          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
                          <span className="ml-2">Loading job cards...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredJobCards.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center">
                        <p className="text-gray-500 py-8">No job cards found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredJobCards.map((job) => (
                      <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                            <div className="font-medium">{job.job_number}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="truncate max-w-[250px]">
                            {job.job_description || 'No description'}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <Badge className={`${getPriorityColor(job.priority)} border font-semibold`}>
                            {job.priority.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 align-middle text-gray-600">
                          {new Date(job.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="flex justify-end gap-2">
                            <Button 
                              onClick={() => handleViewJob(job)} 
                              variant="outline" 
                              size="sm"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            >
                              View
                            </Button>
                            <Button
                              onClick={() => handleAssignTechnician(job)}
                              variant="default"
                              size="sm"
                              className="bg-black hover:bg-gray-800 text-white"
                              disabled={!hasPartsRequired(job)}
                              title={!hasPartsRequired(job) ? "Parts must be assigned before technician can be assigned" : ""}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Assign
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
          
          {/* Filters */}
          <div className="flex sm:flex-row flex-col gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search jobs with parts..."
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
          </div>

          {/* Job Cards Table */}
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="relative w-full overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Job Number</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Description</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Customer</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Vehicle</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Technician</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingJobsWithParts ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center">
                        <div className="flex justify-center items-center py-8">
                          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
                          <span className="ml-2">Loading jobs with parts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : jobsWithParts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center">
                        <div className="py-8 flex flex-col items-center">
                          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                          <h3 className="mb-2 font-medium text-gray-900 text-lg">No Jobs with Parts</h3>
                          <p className="text-gray-500">There are no jobs that require parts. Parts will appear here when assigned to jobs.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    jobsWithParts.map((job) => (
                      <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 align-middle">
                          <div className="font-medium">{job.job_number}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="truncate max-w-[200px]">
                            {job.job_description || 'No description'}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="text-sm">{job.customer_name || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="text-sm">{job.vehicle_registration || 'N/A'}</div>
                          {job.vehicle_make && job.vehicle_model && (
                            <div className="text-xs text-gray-500">
                              {job.vehicle_make} {job.vehicle_model}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          {job.technician_name ? (
                            <Badge className="bg-green-100 text-green-800">
                              {job.technician_name}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">
                              Unassigned
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="flex justify-end gap-2">
                            <Button 
                              onClick={() => handleViewJob(job)} 
                              variant="outline" 
                              size="sm"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            >
                              View
                            </Button>
                            {!job.technician_name && (
                              <Button
                                onClick={() => handleAssignTechnician(job)}
                                variant="default"
                                size="sm"
                                className="bg-black hover:bg-gray-800 text-white"
                                disabled={!hasPartsRequired(job)}
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Assign
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
          
          {/* Filters */}
          <div className="flex sm:flex-row flex-col gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search jobs waiting for parts..."
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
          </div>

          {/* Job Cards Table */}
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="relative w-full overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Job Number</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Description</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Customer</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-500">Vehicle</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center">
                        <div className="flex justify-center items-center py-8">
                          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
                          <span className="ml-2">Loading jobs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : jobCards.filter(job => !hasPartsRequired(job)).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center">
                        <div className="py-8 flex flex-col items-center">
                          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                          <h3 className="mb-2 font-medium text-gray-900 text-lg">No Jobs Waiting for Parts</h3>
                          <p className="text-gray-500">All jobs have parts assigned. Great job!</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortJobs(jobCards.filter(job => !hasPartsRequired(job))).map((job) => (
                      <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 align-middle">
                          <div className="font-medium">{job.job_number}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(job.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="truncate max-w-[200px]">
                            {job.job_description || 'No description'}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="text-sm">{job.customer_name || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="text-sm">{job.vehicle_registration || 'N/A'}</div>
                          {job.vehicle_make && job.vehicle_model && (
                            <div className="text-xs text-gray-500">
                              {job.vehicle_make} {job.vehicle_model}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="flex justify-end gap-2">
                            <Button 
                              onClick={() => handleViewJob(job)} 
                              variant="outline" 
                              size="sm"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            >
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
                <p className="text-gray-600 text-sm">View technicians&apos; calendars and schedule</p>
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
      <Dialog 
        open={assignTechnicianOpen} 
        onOpenChange={setAssignTechnicianOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-lg font-bold flex items-center">
              <UserPlus className="mr-2 h-5 w-5" />
              Assign Technician
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {selectedJob && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Job Header with Number and Priority */}
                <div className="bg-gray-50 border-b border-gray-200 p-3 flex justify-between items-center">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-500 mr-2" />
                    <h3 className="text-sm font-semibold text-gray-800">Job {selectedJob.job_number}</h3>
                  </div>
                  <Badge className={`${getPriorityColor(selectedJob.priority)} text-xs px-2 py-0.5`}>
                    {selectedJob.priority.toUpperCase()} PRIORITY
                  </Badge>
                </div>
                
                {/* Job Description */}
                <div className="p-3 border-b border-gray-200 bg-white">
                  <h4 className="text-xs font-semibold text-gray-600 mb-1 uppercase">Description</h4>
                  <p className="text-sm text-gray-700">{selectedJob.job_description || 'No description provided'}</p>
                </div>
                
                {/* Job Details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 bg-white">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1 uppercase">Customer</h4>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-800">{selectedJob.customer_name}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1 uppercase">Job Type</h4>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-800">{selectedJob.job_type?.toUpperCase()}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1 uppercase">Vehicle</h4>
                    <div className="flex items-center">
                      <Car className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-800">{selectedJob.vehicle_registration || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1 uppercase">Due Date</h4>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-800">{selectedJob.due_date ? new Date(selectedJob.due_date).toLocaleDateString() : 'Not specified'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1 uppercase">Location</h4>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-800">{selectedJob.job_location || 'Not specified'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-1 uppercase">Estimated Duration</h4>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-800">{selectedJob.estimated_duration_hours ? `${selectedJob.estimated_duration_hours} hours` : 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="border border-gray-200 rounded-lg overflow-hidden mt-3">
              <div className="bg-gray-50 border-b border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                  <UserPlus className="h-4 w-4 text-gray-500 mr-2" />
                  Technician Assignment
                </h3>
              </div>
              
              <div className="p-3 space-y-3 bg-white">
                <div>
                  <Label htmlFor="technician" className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Select Technician *</Label>
                  <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                    <SelectTrigger className="w-full border-gray-300 h-9 text-sm">
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
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="assignment-date" className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Assignment Date *</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="assignment-date"
                        type="date"
                        value={assignmentDate}
                        onChange={(e) => setAssignmentDate(e.target.value)}
                        className="pl-8 border-gray-300 h-9 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="assignment-time" className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Assignment Time</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                        <Clock className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="assignment-time"
                        type="time"
                        value={assignmentTime}
                        onChange={(e) => setAssignmentTime(e.target.value)}
                        className="pl-8 border-gray-300 h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="assignment-notes" className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Notes (Optional)</Label>
                  <Textarea
                    id="assignment-notes"
                    placeholder="Add any notes about this assignment..."
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    className="resize-none border-gray-300 h-20 text-sm"
                  />
                </div>

              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setAssignTechnicianOpen(false)}
                className="px-4 py-2 font-medium border-gray-300 text-gray-700 text-sm"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmAssignTechnician} 
                disabled={!selectedTechnician}
                className="font-medium px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Assign Technician
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Job Dialog */}
      <Dialog open={viewJobOpen} onOpenChange={setViewJobOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Job Details
            </DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-8">
              {/* Header with job number, status and badges */}
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Job Number</span>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedJob.job_number}</h2>
                    <p className="text-gray-500 text-sm mt-1">Created: {new Date(selectedJob.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-start gap-2 flex-wrap">
                      <Badge className={getStatusColor(selectedJob.status)}>
                        {selectedJob.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={`${getPriorityColor(selectedJob.priority)} border font-semibold`}>
                        {selectedJob.priority.toUpperCase()}
                      </Badge>
                      {selectedJob.parts_required && selectedJob.parts_required.length > 0 && (
                        <Badge className="bg-purple-100 text-purple-800">PARTS ASSIGNED</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main content in a two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left column: Customer and Vehicle Info */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Customer Information Card */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-md font-semibold text-gray-800 flex items-center">
                        <UserPlus className="w-4 h-4 mr-2 text-gray-500" />
                        Customer Information
                      </h3>
                    </div>
                    <div className="p-5">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{selectedJob.customer_name || 'N/A'}</h4>
                        </div>
                        {selectedJob.customer_email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {selectedJob.customer_email}
                          </div>
                        )}
                        {selectedJob.customer_phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {selectedJob.customer_phone}
                          </div>
                        )}
                        {selectedJob.customer_address && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                            <span className="whitespace-pre-wrap">{selectedJob.customer_address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information Card */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="text-md font-semibold text-gray-800 flex items-center">
                        <Car className="w-4 h-4 mr-2 text-gray-500" />
                        Vehicle Information
                      </h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsEditingVehicle(!isEditingVehicle)}
                        className="text-xs font-medium"
                      >
                        {isEditingVehicle ? 'Cancel' : 'Edit Vehicle'}
                      </Button>
                    </div>
                    <div className="p-5">
                      {!isEditingVehicle ? (
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{selectedJob.vehicle_registration || 'No Registration'}</h4>
                          </div>
                          {selectedJob.vehicle_make && selectedJob.vehicle_model && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Car className="w-4 h-4 text-gray-400" />
                              {selectedJob.vehicle_make} {selectedJob.vehicle_model}
                            </div>
                          )}
                          {selectedJob.vehicle_year && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4 text-gray-400" />
                              Year: {selectedJob.vehicle_year}
                            </div>
                          )}
                          {selectedJob.vin_numer && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FileText className="w-4 h-4 text-gray-400" />
                              VIN: {selectedJob.vin_numer}
                            </div>
                          )}
                          {selectedJob.odormeter && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Package className="w-4 h-4 text-gray-400" />
                              Odometer: {selectedJob.odormeter}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Label htmlFor="vehicle-registration" className="text-xs text-gray-500 font-medium">Registration</Label>
                              <Input 
                                id="vehicle-registration" 
                                value={editableVehicle.registration} 
                                onChange={(e) => setEditableVehicle({...editableVehicle, registration: e.target.value})}
                                placeholder="Vehicle Registration"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="vehicle-make" className="text-xs text-gray-500 font-medium">Make</Label>
                              <Input 
                                id="vehicle-make" 
                                value={editableVehicle.make} 
                                onChange={(e) => setEditableVehicle({...editableVehicle, make: e.target.value})}
                                placeholder="Vehicle Make"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="vehicle-model" className="text-xs text-gray-500 font-medium">Model</Label>
                              <Input 
                                id="vehicle-model" 
                                value={editableVehicle.model} 
                                onChange={(e) => setEditableVehicle({...editableVehicle, model: e.target.value})}
                                placeholder="Vehicle Model"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="vehicle-year" className="text-xs text-gray-500 font-medium">Year</Label>
                              <Input 
                                id="vehicle-year" 
                                value={editableVehicle.year} 
                                onChange={(e) => setEditableVehicle({...editableVehicle, year: e.target.value})}
                                placeholder="Vehicle Year"
                                type="number"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="vehicle-vin" className="text-xs text-gray-500 font-medium">VIN Number</Label>
                              <Input 
                                id="vehicle-vin" 
                                value={editableVehicle.vin} 
                                onChange={(e) => setEditableVehicle({...editableVehicle, vin: e.target.value})}
                                placeholder="VIN Number"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="vehicle-odometer" className="text-xs text-gray-500 font-medium">Odometer</Label>
                              <Input 
                                id="vehicle-odometer" 
                                value={editableVehicle.odometer} 
                                onChange={(e) => setEditableVehicle({...editableVehicle, odometer: e.target.value})}
                                placeholder="Odometer Reading"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2 pt-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsEditingVehicle(false)}
                              size="sm"
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={handleSaveVehicleInfo}
                              className="bg-black hover:bg-gray-800 text-white text-xs"
                              size="sm"
                            >
                              Save Vehicle Information
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right column: Job details, description and parts */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Job Details Card */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-md font-semibold text-gray-800 flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-gray-500" />
                        Job Details
                      </h3>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Job Type</p>
                          <p className="font-medium">{selectedJob.job_type?.toUpperCase() || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Job Date</p>
                          <p className="font-medium">
                            {selectedJob.job_date ? new Date(selectedJob.job_date).toLocaleDateString() : 'Not Scheduled'}
                          </p>
                        </div>
                        {selectedJob.due_date && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Due Date</p>
                            <p className="font-medium">{new Date(selectedJob.due_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {selectedJob.estimated_duration_hours && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Est. Duration</p>
                            <p className="font-medium">{selectedJob.estimated_duration_hours} hours</p>
                          </div>
                        )}
                        {selectedJob.estimated_cost && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Est. Cost</p>
                            <p className="font-medium">R{selectedJob.estimated_cost}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Description section */}
                      {selectedJob.job_description && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-2">Description</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedJob.job_description}</p>
                        </div>
                      )}
                      
                      {/* Work Notes section */}
                      {selectedJob.work_notes && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-2">Work Notes</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedJob.work_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parts Required Card */}
                  {selectedJob.parts_required && selectedJob.parts_required.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-md font-semibold text-gray-800 flex items-center">
                          <Package className="w-4 h-4 mr-2 text-gray-500" />
                          Parts Assigned
                        </h3>
                      </div>
                      <div className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-5 py-3 text-left font-medium text-gray-500">Description</th>
                                <th className="px-5 py-3 text-left font-medium text-gray-500">Quantity</th>
                                <th className="px-5 py-3 text-left font-medium text-gray-500">Code</th>
                                <th className="px-5 py-3 text-left font-medium text-gray-500">Supplier</th>
                                <th className="px-5 py-3 text-right font-medium text-gray-500">Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedJob.parts_required.map((part, index) => (
                                <tr key={index} className="border-b border-gray-100">
                                  <td className="px-5 py-3">{part.description}</td>
                                  <td className="px-5 py-3">{part.quantity}</td>
                                  <td className="px-5 py-3">{part.code}</td>
                                  <td className="px-5 py-3">{part.supplier}</td>
                                  <td className="px-5 py-3 text-right">R{part.total_cost}</td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50">
                                <td colSpan={4} className="px-5 py-3 font-medium text-right">Total:</td>
                                <td className="px-5 py-3 font-bold text-right">
                                  R{selectedJob.parts_required.reduce((sum, part) => sum + part.total_cost, 0)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                <Button variant="outline" onClick={() => setViewJobOpen(false)}>
                  Close
                </Button>
                {!selectedJob.technician_name && (
                  <Button
                    onClick={() => {
                      setViewJobOpen(false);
                      setTimeout(() => handleAssignTechnician(selectedJob), 100);
                    }}
                    disabled={!hasPartsRequired(selectedJob)}
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Technician
                  </Button>
                )}
              </div>
            </div>
          )}
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
                        aqProducts.map((p: Record<string, unknown>) => (
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

      {/* Conflict Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-amber-600">⚠️ Scheduling Conflict</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-semibold">
                ⚠️ WARNING: This will create a double booking!
              </p>
              <p className="text-red-700 text-sm mt-1">
                {selectedTechnician} is already assigned to other jobs within 3 hours of the selected time.
              </p>
            </div>
            
            {conflictData?.conflicts && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                {conflictData.conflicts.map((job: any) => (
                  <div key={job.id} className="mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-b-0 border-amber-200">
                    <div className="font-semibold text-amber-800">Job #{job.job_number}</div>
                    <div className="text-sm text-amber-700">
                      Customer: {job.customer_name}<br/>
                      Time: {job.start_time ? new Date(job.start_time).toLocaleString() : 'Not provided'}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-gray-600 text-sm">
              Proceeding will override the scheduling conflict. Do you want to continue?
            </p>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setConflictDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleOverrideAssignment}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Assign Anyway
              </Button>
            </div>
          </div>
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