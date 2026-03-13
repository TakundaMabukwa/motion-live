'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  X,
  Loader2,
  User,
  Car,
  Wrench,
  UserCheck,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (jobData: Record<string, unknown>) => void;
}

interface Technician {
  id: string;
  name: string;
  email: string;
  admin?: boolean;
  color_code?: string;
}

interface VehicleLookupItem {
  id: number;
  reg: string | null;
  fleet_number: string | null;
  company: string | null;
  make: string | null;
  model: string | null;
  year: string | number | null;
  vin: string | null;
}

const normalizeIdentifier = (value: string | null | undefined) =>
  (value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export default function CreateJobModal({ 
  isOpen, 
  onClose, 
  onJobCreated 
}: CreateJobModalProps) {
  const [currentStep, setCurrentStep] = useState<'customer-info' | 'vehicle-details' | 'job-description' | 'assign-technician' | 'complete'>('customer-info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [allVehicles, setAllVehicles] = useState<VehicleLookupItem[]>([]);
  const [vehicleLookupResults, setVehicleLookupResults] = useState<VehicleLookupItem[]>([]);
  const [loadingVehicleLookup, setLoadingVehicleLookup] = useState(false);
  const [showVehicleLookup, setShowVehicleLookup] = useState(false);
  
  // Customer information
  const [customerInfo, setCustomerInfo] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
  });

  // Vehicle information
  const [vehicleInfo, setVehicleInfo] = useState({
    vehicle_registration: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vin_numer: '',
    odormeter: '',
  });

  // Job information
  const [jobInfo, setJobInfo] = useState({
    job_description: '',
    special_instructions: '',
  });

  // Technician assignment
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [assignmentTime, setAssignmentTime] = useState('');

  const formatLocalDateInput = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('customer-info');
      setCustomerInfo({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address: '',
      });
      setVehicleInfo({
        vehicle_registration: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_year: '',
        vin_numer: '',
        odormeter: '',
      });
      setJobInfo({
        job_description: '',
        special_instructions: '',
      });
      setSelectedTechnicianIds([]);
      setSelectedTechnician('');
      setAssignmentDate(formatLocalDateInput());
      setAssignmentTime('');
      setVehicleSearch('');
      setAllVehicles([]);
      setVehicleLookupResults([]);
      setShowVehicleLookup(false);
    }
  }, [isOpen]);

  // Fetch technicians when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTechnicians();
      void fetchVehiclesForLookup();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentStep !== 'customer-info') return;
    const term = vehicleSearch.trim();
    if (!term) {
      setVehicleLookupResults(allVehicles.slice(0, 50));
      setShowVehicleLookup(false);
      return;
    }

    const lower = term.toLowerCase();
    const filtered = allVehicles.filter((vehicle) => {
      const reg = (vehicle.reg || '').toLowerCase();
      const fleet = (vehicle.fleet_number || '').toLowerCase();
      const company = (vehicle.company || '').toLowerCase();
      return reg.includes(lower) || fleet.includes(lower) || company.includes(lower);
    });
    setVehicleLookupResults(filtered.slice(0, 100));
    setShowVehicleLookup(true);
  }, [vehicleSearch, allVehicles, currentStep]);

  const fetchTechnicians = async () => {
    setLoadingTechnicians(true);
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
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const fetchVehiclesForLookup = async () => {
    setLoadingVehicleLookup(true);
    try {
      const params = new URLSearchParams({ all: 'true', limit: '20000', chunk: '1000' });
      const response = await fetch(`/api/vehicles/reg-search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load vehicles');
      }
      const data = await response.json();
      const vehiclesRaw = Array.isArray(data?.vehicles) ? data.vehicles : [];
      const seenVehicleKeys = new Set<string>();
      const vehicles = vehiclesRaw.filter((vehicle: VehicleLookupItem) => {
        const reg = normalizeIdentifier(vehicle.reg);
        const fleet = normalizeIdentifier(vehicle.fleet_number);
        if (!reg && !fleet) return false;

        const dedupeKey = reg || fleet;
        if (seenVehicleKeys.has(dedupeKey)) return false;
        seenVehicleKeys.add(dedupeKey);
        return true;
      });
      setAllVehicles(vehicles);
      setVehicleLookupResults(vehicles.slice(0, 50));
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Failed to load vehicle list');
      setAllVehicles([]);
      setVehicleLookupResults([]);
    } finally {
      setLoadingVehicleLookup(false);
    }
  };

  const applyVehicleSelection = (vehicle: VehicleLookupItem) => {
    const selectedReg = (vehicle.reg || vehicle.fleet_number || '').trim();
    const customerName = (vehicle.company || '').trim();

    setVehicleSearch(selectedReg);
    setShowVehicleLookup(false);

    setVehicleInfo((prev) => ({
      ...prev,
      vehicle_registration: selectedReg,
      vehicle_make: vehicle.make || prev.vehicle_make,
      vehicle_model: vehicle.model || prev.vehicle_model,
      vehicle_year: vehicle.year ? String(vehicle.year) : prev.vehicle_year,
      vin_numer: vehicle.vin || prev.vin_numer,
    }));

    if (customerName) {
      setCustomerInfo((prev) => ({
        ...prev,
        customer_name: customerName,
      }));
    }
  };

  const handleCustomerInfoNext = async () => {
    const selectedReg = vehicleInfo.vehicle_registration.trim() || vehicleSearch.trim();
    if (!selectedReg) {
      toast.error('Vehicle reg is required');
      return;
    }

    const normalized = selectedReg.toLowerCase();
    const matchedVehicle = allVehicles.find((vehicle) =>
      (vehicle.reg || '').toLowerCase() === normalized ||
      (vehicle.fleet_number || '').toLowerCase() === normalized
    );

    if (matchedVehicle) {
      applyVehicleSelection(matchedVehicle);
    }

    const resolvedCustomerName = customerInfo.customer_name.trim() || (matchedVehicle?.company || '').trim();
    if (!resolvedCustomerName) {
      toast.error('Customer name is required');
      return;
    }
    setCurrentStep('vehicle-details');
  };

  const handleVehicleLookupSelect = (vehicle: VehicleLookupItem) => {
    applyVehicleSelection(vehicle);
  };

  const handleVehicleInfoNext = () => {
    if (!vehicleInfo.vehicle_registration.trim()) {
      toast.error('Vehicle registration is required');
      return;
    }
    setCurrentStep('job-description');
  };

  const handleJobDescriptionNext = () => {
    if (!jobInfo.job_description.trim()) {
      toast.error('Job description is required');
      return;
    }
    setCurrentStep('assign-technician');
  };

  const addTechnicianSelection = (technicianId: string) => {
    if (!technicianId) return;
    setSelectedTechnicianIds((prev) => (prev.includes(technicianId) ? prev : [...prev, technicianId]));
    setSelectedTechnician('');
  };

  const removeTechnicianSelection = (technicianId: string) => {
    setSelectedTechnicianIds((prev) => prev.filter((id) => id !== technicianId));
  };

  const handleAssignTechnicianNext = () => {
    if (selectedTechnicianIds.length === 0) {
      toast.error('Please select at least one technician');
      return;
    }
    if (!assignmentDate) {
      toast.error('Please select an assignment date');
      return;
    }
    handleCreateJob();
  };

  const assignTechnicianToJob = async (
    jobId: string,
    technicianName: string,
    override = false
  ) => {
    return fetch('/api/admin/jobs/assign-technician', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId,
        technicianName,
        jobDate: assignmentDate,
        startTime: assignmentTime || null,
        endTime: null,
        override,
      }),
    });
  };

  const handleCreateJob = async () => {
    setIsSubmitting(true);
    try {
      const selectedTechnicians = technicians.filter((tech) => selectedTechnicianIds.includes(tech.id));

      // Create the job card data
      const jobCardData = {
        // Job details
        job_type: 'admin_created',
        repair: false,
        job_description: jobInfo.job_description,
        priority: 'medium',
        status: 'pending',
        job_status: 'Pending',
        
        // Customer information
        customer_name: customerInfo.customer_name,
        customer_email: customerInfo.customer_email,
        customer_phone: customerInfo.customer_phone,
        customer_address: customerInfo.customer_address,
        
        // Vehicle information
        vehicle_registration: vehicleInfo.vehicle_registration,
        vehicle_make: vehicleInfo.vehicle_make,
        vehicle_model: vehicleInfo.vehicle_model,
        vehicle_year: vehicleInfo.vehicle_year ? parseInt(vehicleInfo.vehicle_year) : null,
        vin_numer: vehicleInfo.vin_numer,
        odormeter: vehicleInfo.odormeter,
        
        // Job information
        special_instructions: jobInfo.special_instructions,
        
        // Job details
        due_date: assignmentDate || null,
        job_date: assignmentDate || new Date().toISOString(),
        start_time: null,
        
        // Photos (empty arrays since we removed photo steps)
        before_photos: [],
        after_photos: [],
        
        // Metadata
        created_by: '00000000-0000-0000-0000-000000000000', // Admin user ID
        updated_by: '00000000-0000-0000-0000-000000000000', // Admin user ID
        
        // Generate a unique job number for admin created jobs
        job_number: `ADMIN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      };

      // Create the job card via API
      const response = await fetch('/api/job-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobCardData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create job: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      const createdJobId = result?.data?.id as string | undefined;
      if (!createdJobId) {
        throw new Error('Job created but no job ID returned');
      }

      const technicianNames = selectedTechnicians.map((tech) => tech.name).join(', ');
      const assignResponse = await assignTechnicianToJob(createdJobId, technicianNames);
      const assignData = await assignResponse.json().catch(() => ({}));

      if (assignResponse.status === 409 && assignData?.needsOverride) {
        const proceedOverride = window.confirm(
          `Scheduling conflict detected for ${technicianNames}. Do you want to override and assign anyway?`
        );
        if (proceedOverride) {
          const overrideResponse = await assignTechnicianToJob(createdJobId, technicianNames, true);
          if (!overrideResponse.ok) {
            toast.error('Job created but technician assignment failed after override attempt.');
          } else {
            toast.success(
              `Job created and technician${selectedTechnicians.length > 1 ? 's' : ''} assigned successfully!`
            );
          }
        } else {
          toast.warning('Job created but technician assignment was skipped due to conflict.');
        }
      } else if (!assignResponse.ok) {
        toast.error('Job created but technician assignment failed.');
      } else {
        toast.success(
          `Job created and technician${selectedTechnicians.length > 1 ? 's' : ''} assigned successfully!`
        );
      }

      setCurrentStep('complete');
      onJobCreated(result.data);
      
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error(`Failed to create job: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('customer-info');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-xl">Create Job</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="flex justify-center space-x-4 mb-6">
            {[
              { key: 'customer-info', label: 'Customer Info', icon: User },
              { key: 'vehicle-details', label: 'Vehicle Details', icon: Car },
              { key: 'job-description', label: 'Job Description', icon: Wrench },
              { key: 'assign-technician', label: 'Assign Technician', icon: UserCheck },
              { key: 'complete', label: 'Complete', icon: CheckCircle },
            ].map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = ['customer-info', 'vehicle-details', 'job-description', 'assign-technician', 'complete'].indexOf(currentStep) > index;
             
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  {index < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 1: Customer Information */}
          {currentStep === 'customer-info' && (
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleRegLookup">Vehicle Reg Search *</Label>
                  <div className="relative">
                    <Input
                      id="vehicleRegLookup"
                      value={vehicleSearch}
                      onChange={(e) => {
                        setVehicleSearch(e.target.value);
                        setShowVehicleLookup(true);
                      }}
                      onFocus={() => setShowVehicleLookup(true)}
                      onBlur={() => {
                        setTimeout(() => setShowVehicleLookup(false), 120);
                      }}
                      placeholder="Type reg to search..."
                      autoComplete="off"
                    />
                    {showVehicleLookup && (
                      <div className="z-50 absolute bg-white shadow-lg mt-1 border rounded-md w-full max-h-56 overflow-y-auto">
                        {loadingVehicleLookup ? (
                          <div className="px-3 py-2 text-gray-500 text-sm">Searching...</div>
                        ) : vehicleLookupResults.length > 0 ? (
                          vehicleLookupResults.map((vehicle) => {
                            const regValue = vehicle.reg || '-';
                            const fleetValue = vehicle.fleet_number || '-';
                            const companyValue = vehicle.company || 'Unknown customer';
                            return (
                              <button
                                key={vehicle.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleVehicleLookupSelect(vehicle);
                                }}
                                className="hover:bg-gray-50 px-3 py-2 border-gray-100 border-b w-full text-left"
                              >
                                <div className="font-medium text-sm">{regValue}</div>
                                <div className="text-gray-500 text-xs">Fleet: {fleetValue}</div>
                                <div className="text-gray-500 text-xs">Customer: {companyValue}</div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No vehicles found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={customerInfo.customer_name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, customer_name: e.target.value }))}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerInfo.customer_email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, customer_email: e.target.value }))}
                      placeholder="Enter customer email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input
                      id="customerPhone"
                      value={customerInfo.customer_phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, customer_phone: e.target.value }))}
                      placeholder="Enter customer phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerAddress">Customer Address</Label>
                    <Input
                      id="customerAddress"
                      value={customerInfo.customer_address}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, customer_address: e.target.value }))}
                      placeholder="Enter customer address"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCustomerInfoNext}
                  disabled={loadingVehicleLookup}
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  {loadingVehicleLookup ? 'Loading Vehicles...' : 'Next: Vehicle Details'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Vehicle Details */}
          {currentStep === 'vehicle-details' && (
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Car className="w-5 h-5" />
                  <span>Vehicle Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleRegistration">Vehicle Registration *</Label>
                    <Input
                      id="vehicleRegistration"
                      value={vehicleInfo.vehicle_registration}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, vehicle_registration: e.target.value }))}
                      placeholder="Enter vehicle registration"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleMake">Vehicle Make</Label>
                    <Input
                      id="vehicleMake"
                      value={vehicleInfo.vehicle_make}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, vehicle_make: e.target.value }))}
                      placeholder="e.g., Toyota"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleModel">Vehicle Model</Label>
                    <Input
                      id="vehicleModel"
                      value={vehicleInfo.vehicle_model}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, vehicle_model: e.target.value }))}
                      placeholder="e.g., Camry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleYear">Vehicle Year</Label>
                    <Input
                      id="vehicleYear"
                      type="number"
                      value={vehicleInfo.vehicle_year}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, vehicle_year: e.target.value }))}
                      placeholder="e.g., 2020"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vinNumber">VIN Number</Label>
                    <Input
                      id="vinNumber"
                      value={vehicleInfo.vin_numer}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, vin_numer: e.target.value }))}
                      placeholder="Enter VIN number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="odometer">Odometer Reading</Label>
                    <Input
                      id="odometer"
                      value={vehicleInfo.odormeter}
                      onChange={(e) => setVehicleInfo(prev => ({ ...prev, odormeter: e.target.value }))}
                      placeholder="Enter odometer reading"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setCurrentStep('customer-info')}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleVehicleInfoNext}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Next: Job Description
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Job Description */}
          {currentStep === 'job-description' && (
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wrench className="w-5 h-5" />
                  <span>Job Description</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobDescription">Job Description *</Label>
                    <Textarea
                      id="jobDescription"
                      value={jobInfo.job_description}
                      onChange={(e) => setJobInfo(prev => ({ ...prev, job_description: e.target.value }))}
                      placeholder="Describe what needs to be done..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialInstructions">Special Instructions</Label>
                    <Textarea
                      id="specialInstructions"
                      value={jobInfo.special_instructions}
                      onChange={(e) => setJobInfo(prev => ({ ...prev, special_instructions: e.target.value }))}
                      placeholder="Any special instructions or requirements..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setCurrentStep('vehicle-details')}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleJobDescriptionNext}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Next: Assign Technician
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Assign Technician */}
          {currentStep === 'assign-technician' && (
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5" />
                  <span>Assign Technician</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Technician(s) *</Label>
                    {loadingTechnicians ? (
                      <div className="flex items-center space-x-2 p-3 border rounded-md">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-gray-500 text-sm">Loading technicians...</span>
                      </div>
                    ) : technicians.length === 0 ? (
                      <div className="bg-gray-50 p-3 border rounded-md">
                        <span className="text-gray-500 text-sm">No technicians available</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Select value={selectedTechnician} onValueChange={addTechnicianSelection}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a technician" />
                          </SelectTrigger>
                          <SelectContent>
                            {technicians
                              .filter((tech) => !selectedTechnicianIds.includes(tech.id))
                              .map((technician) => (
                                <SelectItem key={technician.id} value={technician.id}>
                                  {technician.name} ({technician.email})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        {selectedTechnicianIds.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Selected Technicians</Label>
                            <div className="flex flex-wrap gap-2">
                              {selectedTechnicianIds.map((techId) => {
                                const tech = technicians.find((t) => t.id === techId);
                                if (!tech) return null;
                                return (
                                  <div
                                    key={techId}
                                    className="flex items-center bg-blue-100 px-3 py-1.5 rounded text-blue-800 text-sm"
                                  >
                                    <span>{tech.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeTechnicianSelection(techId)}
                                      className="ml-2 font-bold text-blue-600 hover:text-blue-800"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="assignmentDate">Assignment Date *</Label>
                      <Input
                        id="assignmentDate"
                        type="date"
                        value={assignmentDate}
                        onChange={(e) => setAssignmentDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignmentTime">Assignment Time</Label>
                      <Input
                        id="assignmentTime"
                        type="time"
                        value={assignmentTime}
                        onChange={(e) => setAssignmentTime(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {selectedTechnicianIds.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <div className="text-sm">
                        <div className="font-medium text-blue-900">
                          Selected Technician{selectedTechnicianIds.length > 1 ? 's' : ''}:
                        </div>
                        {technicians
                          .filter((tech) => selectedTechnicianIds.includes(tech.id))
                          .map((tech) => (
                            <div key={tech.id} className="text-blue-700">{tech.name}</div>
                          ))}
                        <div className="text-blue-600 text-xs">
                          Scheduled: {assignmentDate || 'No date'} {assignmentTime || '09:00'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => setCurrentStep('job-description')}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleAssignTechnicianNext}
                    disabled={isSubmitting || selectedTechnicianIds.length === 0 || !assignmentDate}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                    Create Job
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <Card className="mx-auto max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>Job Created Successfully!</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="flex justify-center items-center bg-green-100 mx-auto rounded-full w-16 h-16">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="mb-2 font-medium text-gray-900 text-lg">
                    Job has been created
                  </h3>
                  <p className="text-gray-600">
                    The job has been successfully created and assigned to the technician.
                    The job is now pending and ready for work to begin.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="mb-2 font-medium">Summary</h4>
                  <div className="space-y-1 text-gray-600 text-sm">
                    <div>• Customer information captured</div>
                    <div>• Vehicle details recorded</div>
                    <div>• Job description documented</div>
                    <div>
                      • Technician{selectedTechnicianIds.length > 1 ? 's' : ''} assigned: {technicians
                        .filter((tech) => selectedTechnicianIds.includes(tech.id))
                        .map((tech) => tech.name)
                        .join(', ')}
                    </div>
                    <div>• Job status: Pending</div>
                    <div>• Job type: Admin Created</div>
                  </div>
                </div>

                <Button onClick={handleClose} className="w-full">
                  Close
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
