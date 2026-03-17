'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Car, FileText, Loader2, User, UserCheck, Wrench, X } from 'lucide-react';
import { toast } from 'sonner';

interface CreateRepairJobModalProps {
  onJobCreated: () => void;
}

interface CostCenter {
  id: string;
  cost_code: string;
  company: string;
}

interface VehicleLookupItem {
  id?: number | string;
  reg: string | null;
  fleet_number?: string | null;
  company?: string | null;
  make?: string | null;
  model?: string | null;
  year?: string | number | null;
  vin?: string | null;
  new_account_number?: string | null;
  [key: string]: any;
}

interface Technician {
  id: string;
  name: string;
  email: string;
}

const normalizeIdentifier = (value: string | null | undefined) =>
  (value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export default function CreateRepairJobModal({ onJobCreated }: CreateRepairJobModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'customer-info' | 'vehicle-details' | 'job-description' | 'assign-technician' | 'complete'>('customer-info');

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loadingCostCenters, setLoadingCostCenters] = useState(false);
  const [costCenterSearch, setCostCenterSearch] = useState('');
  const [showCostCenterDropdown, setShowCostCenterDropdown] = useState(false);

  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleLookupResults, setVehicleLookupResults] = useState<VehicleLookupItem[]>([]);
  const [loadingVehicleLookup, setLoadingVehicleLookup] = useState(false);
  const [showVehicleLookup, setShowVehicleLookup] = useState(false);
  const [vehicleSearchCache, setVehicleSearchCache] = useState<Record<string, VehicleLookupItem[]>>({});
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [assignmentTime, setAssignmentTime] = useState('');
  const skipVehicleSearchRef = useRef(false);

  const [formData, setFormData] = useState({
    job_type: 'repair',
    cost_center: '',
    job_description: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    vehicle_registration: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vin_numer: '',
  });

  const formatLocalDateInput = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!isOpen) return;

    setCurrentStep('customer-info');
    setVehicleSearch('');
    setSelectedTechnicianId('');
    setAssignmentDate(formatLocalDateInput());
    setAssignmentTime('');
    setVehicleSearchCache({});
    setVehicleLookupResults([]);
    setShowVehicleLookup(false);
    skipVehicleSearchRef.current = false;
    void fetchCostCenters();
    void fetchTechnicians();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.cost-center-dropdown')) {
        setShowCostCenterDropdown(false);
      }
      if (!target.closest('.vehicle-lookup-dropdown')) {
        setShowVehicleLookup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentStep !== 'customer-info') return;

    const term = vehicleSearch.trim();
    if (!term || term.length < 2) {
      setVehicleLookupResults([]);
      setShowVehicleLookup(false);
      return;
    }

    if (skipVehicleSearchRef.current) {
      skipVehicleSearchRef.current = false;
      return;
    }

    const cacheKey = term.toLowerCase();
    if (vehicleSearchCache[cacheKey]) {
      setVehicleLookupResults(vehicleSearchCache[cacheKey]);
      setShowVehicleLookup(true);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setLoadingVehicleLookup(true);
      try {
        const params = new URLSearchParams({ search: term, limit: '50' });
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

        setVehicleSearchCache((prev) => ({ ...prev, [cacheKey]: vehicles }));
        setVehicleLookupResults(vehicles);
        setShowVehicleLookup(true);
      } catch (error) {
        console.error('Error loading vehicles:', error);
        setVehicleLookupResults([]);
        setShowVehicleLookup(false);
      } finally {
        setLoadingVehicleLookup(false);
      }
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [currentStep, vehicleSearch, vehicleSearchCache]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const fetchCostCenters = async () => {
    setLoadingCostCenters(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, cost_code, company')
        .order('cost_code');

      if (error) {
        throw error;
      }

      setCostCenters(data || []);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
      toast.error('Failed to load cost centers');
      setCostCenters([]);
    } finally {
      setLoadingCostCenters(false);
    }
  };

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
      setTechnicians([]);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const fetchFullVehicleDetails = async (registration: string) => {
    const response = await fetch(`/api/vehicles/details?registration=${encodeURIComponent(registration)}`);
    if (!response.ok) {
      throw new Error('Failed to load full vehicle details');
    }

    const data = await response.json();
    return data?.vehicle as VehicleLookupItem | undefined;
  };

  const handleCostCenterSelect = async (costCenter: CostCenter) => {
    handleInputChange('cost_center', costCenter.cost_code);
    setCostCenterSearch(`${costCenter.cost_code} - ${costCenter.company}`);
    setShowCostCenterDropdown(false);

    setFormData((prev) => ({
      ...prev,
      cost_center: costCenter.cost_code,
      customer_name: costCenter.company || prev.customer_name,
    }));

    try {
      const response = await fetch(`/api/customers/by-account?account_number=${costCenter.cost_code}`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.customer) {
        const customer = data.customer;
        setFormData((prev) => ({
          ...prev,
          customer_name: customer.company_name || costCenter.company || prev.customer_name,
          customer_email: customer.email || prev.customer_email,
          customer_phone: customer.cell_no || customer.switchboard || prev.customer_phone,
          customer_address: customer.physical_address_1 || prev.customer_address,
        }));
      }
    } catch (error) {
      console.error('Error fetching customer info:', error);
    }
  };

  const applyVehicleSelection = async (vehicle: VehicleLookupItem) => {
    const selectedReg = (vehicle.fleet_number || vehicle.reg || '').trim();
    const customerName = (vehicle.company || '').trim();

    setVehicleSearch(selectedReg);
    setShowVehicleLookup(false);
    setVehicleLookupResults([]);
    skipVehicleSearchRef.current = true;

    let resolvedVehicle = vehicle;

    if (selectedReg) {
      try {
        const fullVehicle = await fetchFullVehicleDetails(selectedReg);
        if (fullVehicle) {
          resolvedVehicle = { ...vehicle, ...fullVehicle };
        }
      } catch (error) {
        console.error('Error fetching full vehicle details:', error);
      }
    }

    setFormData((prev) => ({
      ...prev,
      cost_center: resolvedVehicle.new_account_number || prev.cost_center,
      vehicle_registration: (resolvedVehicle.fleet_number || resolvedVehicle.reg || '').trim() || prev.vehicle_registration,
      vehicle_make: resolvedVehicle.make || prev.vehicle_make,
      vehicle_model: resolvedVehicle.model || prev.vehicle_model,
      vehicle_year: resolvedVehicle.year ? String(resolvedVehicle.year) : prev.vehicle_year,
      vin_numer: resolvedVehicle.vin || prev.vin_numer,
      customer_name: (resolvedVehicle.company || customerName || prev.customer_name).trim(),
    }));

    if (resolvedVehicle.new_account_number) {
      const matchingCostCenter = costCenters.find((center) => center.cost_code === resolvedVehicle.new_account_number);
      if (matchingCostCenter) {
        setCostCenterSearch(`${matchingCostCenter.cost_code} - ${matchingCostCenter.company}`);
      } else {
        setCostCenterSearch(resolvedVehicle.new_account_number);
      }
    }

  };

  const handleCustomerInfoNext = () => {
    const selectedReg = formData.vehicle_registration.trim() || vehicleSearch.trim();
    if (!selectedReg) {
      toast.error('Vehicle reg is required');
      return;
    }

    const normalized = selectedReg.toLowerCase();
    const matchedVehicle = vehicleLookupResults.find((vehicle) =>
      (vehicle.reg || '').toLowerCase() === normalized ||
      (vehicle.fleet_number || '').toLowerCase() === normalized
    );

    if (matchedVehicle) {
      void applyVehicleSelection(matchedVehicle);
    }

    const resolvedCustomerName = formData.customer_name.trim() || (matchedVehicle?.company || '').trim();
    if (!resolvedCustomerName) {
      toast.error('Customer name is required');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      customer_name: resolvedCustomerName,
      vehicle_registration: selectedReg,
    }));
    setCurrentStep('vehicle-details');
  };

  const handleVehicleInfoNext = () => {
    if (!formData.vehicle_registration.trim()) {
      toast.error('Vehicle registration is required');
      return;
    }
    setCurrentStep('job-description');
  };

  const handleJobDescriptionNext = () => {
    if (!formData.job_description.trim()) {
      toast.error('Job description is required');
      return;
    }

    setCurrentStep('assign-technician');
  };

  const assignTechnicianToJob = async (jobId: string, technicianName: string, override = false) => {
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

  const handleSubmit = async () => {
    if (!formData.job_description.trim()) {
      toast.error('Job description is required');
      return;
    }

    if (!selectedTechnicianId) {
      toast.error('Please select a technician');
      return;
    }

    if (!assignmentDate) {
      toast.error('Please select an assignment date');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedTechnician = technicians.find((technician) => technician.id === selectedTechnicianId);
      if (!selectedTechnician) {
        throw new Error('Selected technician not found');
      }

      const jobCardData = {
        job_type: 'repair',
        job_description: formData.job_description,
        priority: 'medium',
        status: 'pending',
        job_status: 'Pending',
        cost_center: formData.cost_center,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_address: formData.customer_address,
        vehicle_registration: formData.vehicle_registration,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year, 10) : null,
        vin_numer: formData.vin_numer,
        job_number: `REPAIR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        job_date: assignmentDate || new Date().toISOString(),
        due_date: assignmentDate || null,
      };

      const response = await fetch('/api/job-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobCardData),
      });

      if (!response.ok) {
        throw new Error('Failed to create repair job');
      }

      const result = await response.json();
      const createdJobId = result?.data?.id as string | undefined;
      if (!createdJobId) {
        throw new Error('Job created but no job ID returned');
      }

      const assignResponse = await assignTechnicianToJob(createdJobId, selectedTechnician.name);
      const assignData = await assignResponse.json().catch(() => ({}));

      if (assignResponse.status === 409 && assignData?.needsOverride) {
        const proceedOverride = window.confirm(
          `Scheduling conflict detected for ${selectedTechnician.name}. Do you want to override and assign anyway?`
        );

        if (proceedOverride) {
          const overrideResponse = await assignTechnicianToJob(createdJobId, selectedTechnician.name, true);
          if (!overrideResponse.ok) {
            toast.error('Repair job created but technician assignment failed after override attempt.');
          } else {
            toast.success(`Repair job created and assigned to ${selectedTechnician.name}`);
          }
        } else {
          toast.warning('Repair job created but technician assignment was skipped due to conflict.');
        }
      } else if (!assignResponse.ok) {
        toast.error('Repair job created but technician assignment failed.');
      } else {
        toast.success(`Repair job created and assigned to ${selectedTechnician.name}`);
      }

      setCurrentStep('complete');
      onJobCreated();

      setTimeout(() => {
        setIsOpen(false);
      }, 500);
    } catch (error) {
      console.error('Error creating repair job:', error);
      toast.error('Failed to create repair job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrentStep('customer-info');
    setFormData({
      job_type: 'repair',
      cost_center: '',
      job_description: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      vehicle_registration: '',
      vehicle_make: '',
      vehicle_model: '',
      vehicle_year: '',
      vin_numer: '',
    });
    setCostCenterSearch('');
    setVehicleSearch('');
    setSelectedTechnicianId('');
    setAssignmentDate(formatLocalDateInput());
    setAssignmentTime('');
    setShowCostCenterDropdown(false);
    setShowVehicleLookup(false);
  };

  return (
    <>
      <Button className="bg-green-600 hover:bg-green-700" onClick={() => setIsOpen(true)}>
        <Wrench className="mr-2 w-4 h-4" />
        Create Repair Job
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-xl font-semibold">Create Repair Job</h2>
              <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="mb-6 flex justify-center space-x-4">
              {[
                { key: 'customer-info', label: 'Customer Info', icon: User },
                { key: 'vehicle-details', label: 'Vehicle Details', icon: Car },
                { key: 'job-description', label: 'Job Description', icon: FileText },
                { key: 'assign-technician', label: 'Assign Technician', icon: UserCheck },
                { key: 'complete', label: 'Complete', icon: CheckCircle },
              ].map((step, index) => {
                const Icon = step.icon;
              const steps = ['customer-info', 'vehicle-details', 'job-description', 'assign-technician', 'complete'];
              const isActive = currentStep === step.key;
              const isCompleted = steps.indexOf(currentStep) > index;

              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  {index < 4 && (
                    <div className={`mx-2 h-1 w-12 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

              {currentStep === 'customer-info' && (
                <Card className="mx-auto max-w-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Customer Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Vehicle Reg Search *</Label>
                      <div className="relative vehicle-lookup-dropdown">
                        <Input
                          value={vehicleSearch}
                          onChange={(event) => {
                            setVehicleSearch(event.target.value);
                            handleInputChange('vehicle_registration', event.target.value);
                            setShowVehicleLookup(true);
                          }}
                          onFocus={() => setShowVehicleLookup(true)}
                          placeholder={loadingVehicleLookup ? 'Loading vehicles...' : 'Type reg to search...'}
                          autoComplete="off"
                        />
                        {showVehicleLookup && (
                          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                            {loadingVehicleLookup ? (
                              <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
                            ) : vehicleLookupResults.length > 0 ? (
                              vehicleLookupResults.map((vehicle, index) => {
                                const regValue = vehicle.reg || '-';
                                const fleetValue = vehicle.fleet_number || '-';
                                const companyValue = vehicle.company || 'Unknown customer';
                                return (
                                  <button
                                    key={`${vehicle.id || regValue || fleetValue || index}`}
                                    type="button"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      void applyVehicleSelection(vehicle);
                                    }}
                                    className="w-full border-b border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
                                  >
                                    <div className="text-sm font-medium">{regValue}</div>
                                    <div className="text-xs text-gray-500">Fleet: {fleetValue}</div>
                                    <div className="text-xs text-gray-500">Customer: {companyValue}</div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-500">No vehicles found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cost Center</Label>
                      <div className="relative cost-center-dropdown">
                        <Input
                          value={costCenterSearch}
                          onChange={(event) => {
                            setCostCenterSearch(event.target.value);
                            setShowCostCenterDropdown(true);
                          }}
                          onFocus={() => setShowCostCenterDropdown(true)}
                          placeholder="Search cost centers..."
                        />
                        {showCostCenterDropdown && (
                          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                            {loadingCostCenters ? (
                              <div className="p-3 text-sm text-gray-500">Loading...</div>
                            ) : (
                              costCenters
                                .filter((center) =>
                                  center.cost_code.toLowerCase().includes(costCenterSearch.toLowerCase()) ||
                                  center.company.toLowerCase().includes(costCenterSearch.toLowerCase())
                                )
                                .map((center) => (
                                  <button
                                    key={center.id}
                                    type="button"
                                    className="w-full p-3 text-left text-sm hover:bg-gray-50"
                                    onMouseDown={(event) => {
                                      event.preventDefault();
                                      handleCostCenterSelect(center);
                                    }}
                                  >
                                    {center.cost_code} - {center.company}
                                  </button>
                                ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Customer Name *</Label>
                        <Input
                          value={formData.customer_name}
                          onChange={(event) => handleInputChange('customer_name', event.target.value)}
                          placeholder="Enter customer name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Customer Email</Label>
                        <Input
                          value={formData.customer_email}
                          onChange={(event) => handleInputChange('customer_email', event.target.value)}
                          placeholder="Enter customer email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Customer Phone</Label>
                        <Input
                          value={formData.customer_phone}
                          onChange={(event) => handleInputChange('customer_phone', event.target.value)}
                          placeholder="Enter customer phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Customer Address</Label>
                        <Input
                          value={formData.customer_address}
                          onChange={(event) => handleInputChange('customer_address', event.target.value)}
                          placeholder="Enter customer address"
                        />
                      </div>
                    </div>

                    <Button onClick={handleCustomerInfoNext} disabled={loadingVehicleLookup} className="w-full bg-blue-600 hover:bg-blue-700">
                      {loadingVehicleLookup ? 'Loading Vehicles...' : 'Next: Vehicle Details'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'vehicle-details' && (
                <Card className="mx-auto max-w-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Car className="h-5 w-5" />
                      <span>Vehicle Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Vehicle Registration *</Label>
                        <Input value={formData.vehicle_registration} placeholder="Enter vehicle registration" readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>VIN Number</Label>
                        <Input value={formData.vin_numer} placeholder="Enter VIN number" readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Vehicle Make</Label>
                        <Input value={formData.vehicle_make} placeholder="e.g., Toyota" readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Vehicle Model</Label>
                        <Input value={formData.vehicle_model} placeholder="e.g., Hilux" readOnly />
                      </div>
                      <div className="space-y-2">
                        <Label>Vehicle Year</Label>
                        <Input value={formData.vehicle_year} placeholder="e.g., 2024" readOnly />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={() => setCurrentStep('customer-info')} variant="outline" className="flex-1">
                        Back
                      </Button>
                      <Button onClick={handleVehicleInfoNext} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        Next: Job Description
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'job-description' && (
                <Card className="mx-auto max-w-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Job Description</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Job Type</Label>
                      <Input value="Repair" readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Job Description *</Label>
                      <Textarea
                        value={formData.job_description}
                        onChange={(event) => handleInputChange('job_description', event.target.value)}
                        placeholder="Describe what needs to be done..."
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={() => setCurrentStep('vehicle-details')} variant="outline" className="flex-1">
                        Back
                      </Button>
                      <Button onClick={handleJobDescriptionNext} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        Next: Assign Technician
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'assign-technician' && (
                <Card className="mx-auto max-w-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <UserCheck className="h-5 w-5" />
                      <span>Assign Technician</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Technician *</Label>
                      {loadingTechnicians ? (
                        <div className="flex items-center rounded-md border p-3 text-sm text-gray-500">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading technicians...
                        </div>
                      ) : (
                        <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a technician" />
                          </SelectTrigger>
                          <SelectContent>
                            {technicians.map((technician) => (
                              <SelectItem key={technician.id} value={technician.id}>
                                {technician.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Assignment Date *</Label>
                        <Input type="date" value={assignmentDate} onChange={(event) => setAssignmentDate(event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Assignment Time</Label>
                        <Input type="time" value={assignmentTime} onChange={(event) => setAssignmentTime(event.target.value)} />
                      </div>
                    </div>

                    {selectedTechnicianId && (
                      <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                        Assigned to: <strong>{technicians.find((technician) => technician.id === selectedTechnicianId)?.name || 'Unknown technician'}</strong>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button onClick={() => setCurrentStep('job-description')} variant="outline" className="flex-1">
                        Back
                      </Button>
                      <Button onClick={handleSubmit} disabled={isSubmitting || !selectedTechnicianId || !assignmentDate} className="flex-1 bg-green-600 hover:bg-green-700">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Repair Job'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'complete' && (
                <Card className="mx-auto max-w-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>Repair Job Created Successfully!</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-lg font-medium text-gray-900">Repair job has been created</h3>
                      <p className="text-gray-600">
                        The repair job has been created successfully and assigned to the selected technician.
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <h4 className="mb-2 font-medium">Summary</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>Customer information captured</div>
                        <div>Vehicle details recorded</div>
                        <div>Repair description documented</div>
                        <div>Job status: Pending</div>
                        <div>Job type: Repair</div>
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
      )}
    </>
  );
}
