'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wrench, User, Car, FileText, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface CreateRepairJobModalProps {
  onJobCreated: () => void;
  onAssignParts: (jobCard: any) => void;
}

interface CostCenter {
  id: string;
  cost_code: string;
  company: string;
}

interface Vehicle {
  reg: string;
  make: string;
  model: string;
  year: number;
  [key: string]: any;
}

export default function CreateRepairJobModal({ onJobCreated, onAssignParts }: CreateRepairJobModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loadingCostCenters, setLoadingCostCenters] = useState(false);
  const [costCenterSearch, setCostCenterSearch] = useState('');
  const [showCostCenterDropdown, setShowCostCenterDropdown] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesByCostCenter, setVehiclesByCostCenter] = useState<Record<string, Vehicle[]>>({});
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  
  const [formData, setFormData] = useState({
    // Job details
    job_type: 'repair',
    cost_center: '',
    job_description: '',
    
    // Customer information
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    
    // Vehicle information
    vehicle_registration: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: ''
  });

  const steps = [
    { id: 0, title: 'Job Details', icon: FileText },
    { id: 1, title: 'Customer Info', icon: User },
    { id: 2, title: 'Vehicle Details', icon: Car }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchCostCenters();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.cost-center-dropdown')) {
        setShowCostCenterDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCostCenters = async () => {
    setLoadingCostCenters(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      // Get all cost centers
      const { data: costCentersData, error: costCentersError } = await supabase
        .from('cost_centers')
        .select('id, cost_code, company')
        .order('cost_code');
        
      if (!costCentersError && costCentersData) {
        setCostCenters(costCentersData);
        
        // Get all cost codes
        const costCodes = costCentersData.map(center => center.cost_code);
        
        // Fetch all vehicles that match any cost code
        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('reg, make, model, year, fleet_number, new_account_number')
          .in('new_account_number', costCodes)
          .order('reg');
          
        if (!vehiclesError && vehiclesData) {
          // Group vehicles by cost center
          const vehiclesByCostCenter = {};
          vehiclesData.forEach(vehicle => {
            const costCenter = vehicle.new_account_number;
            if (!vehiclesByCostCenter[costCenter]) {
              vehiclesByCostCenter[costCenter] = [];
            }
            vehiclesByCostCenter[costCenter].push(vehicle);
          });
          
          // Store vehicles grouped by cost center
          setVehiclesByCostCenter(vehiclesByCostCenter);
        }
      }
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    } finally {
      setLoadingCostCenters(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCostCenterSelect = async (costCenter: CostCenter) => {
    console.log('NEW VERSION - Cost center selected:', costCenter.cost_code);
    handleInputChange('cost_center', costCenter.cost_code);
    setCostCenterSearch(`${costCenter.cost_code} - ${costCenter.company}`);
    setShowCostCenterDropdown(false);
    
    // Auto-fill customer name with cost center company name
    setFormData(prev => ({
      ...prev,
      customer_name: costCenter.company || costCenter.cost_code
    }));
    
    // Set vehicles for this cost center from pre-loaded data
    setVehicles(vehiclesByCostCenter[costCenter.cost_code] || []);
    console.log('Available vehicles for', costCenter.cost_code, ':', vehiclesByCostCenter[costCenter.cost_code] || []);
    
    // Try to fetch additional customer information
    try {
      const response = await fetch(`/api/customers/by-account?account_number=${costCenter.cost_code}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.customer) {
          const customer = data.customer;
          setFormData(prev => ({
            ...prev,
            customer_email: customer.email || '',
            customer_phone: customer.cell_no || customer.switchboard || '',
            customer_address: customer.physical_address_1 || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching customer info:', error);
    }
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setFormData(prev => ({
      ...prev,
      vehicle_registration: vehicle.fleet_number || vehicle.reg,
      vehicle_make: vehicle.make,
      vehicle_model: vehicle.model,
      vehicle_year: vehicle.year?.toString() || ''
    }));
    toast.success(`Selected vehicle: ${vehicle.fleet_number || vehicle.reg}`);
  };

  const handleViewVehicle = async (vehicle: Vehicle) => {
    try {
      const response = await fetch(`/api/vehicles/details?registration=${vehicle.reg}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedVehicleDetails(data.vehicle);
        setShowVehicleModal(true);
      } else {
        toast.error('Failed to load vehicle details');
      }
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      toast.error('Failed to load vehicle details');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.job_type && formData.job_description;
      case 1:
        return formData.customer_name && formData.customer_email && formData.customer_phone;
      case 2:
        return true; // Vehicle details are optional
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const jobCardData = {
        job_type: formData.job_type,
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
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        
        job_number: `REPAIR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        job_date: new Date().toISOString(),
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
      toast.success(`Repair job created: ${result.data.job_number}`);
      
      setIsOpen(false);
      setCurrentStep(0);
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
        vehicle_year: ''
      });
      
      onJobCreated();
      
      // Automatically open assign parts modal
      setTimeout(() => {
        onAssignParts(result.data);
      }, 500);
      
    } catch (error) {
      console.error('Error creating repair job:', error);
      toast.error('Failed to create repair job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" />
              <h3 className="font-medium">Job Details</h3>
            </div>
            <div>
              <Label>Job Type *</Label>
              <Input
                value="Repair"
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="relative cost-center-dropdown">
              <Label>Cost Center</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={costCenterSearch}
                  onChange={(e) => {
                    setCostCenterSearch(e.target.value);
                    setShowCostCenterDropdown(true);
                  }}
                  onFocus={() => setShowCostCenterDropdown(true)}
                  placeholder="Search cost centers..."
                  className="pl-10"
                />
              </div>
              {showCostCenterDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loadingCostCenters ? (
                    <div className="p-2 text-sm text-gray-500">Loading...</div>
                  ) : (
                    costCenters
                      .filter(center => 
                        center.cost_code.toLowerCase().includes(costCenterSearch.toLowerCase()) ||
                        center.company.toLowerCase().includes(costCenterSearch.toLowerCase())
                      )
                      .map((center) => (
                        <div
                          key={center.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => handleCostCenterSelect(center)}
                        >
                          {center.cost_code} - {center.company}
                        </div>
                      ))
                  )}
                  {!loadingCostCenters && costCenters.filter(center => 
                    center.cost_code.toLowerCase().includes(costCenterSearch.toLowerCase()) ||
                    center.company.toLowerCase().includes(costCenterSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="p-2 text-sm text-gray-500">No cost centers found</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Job Description *</Label>
              <Textarea
                value={formData.job_description}
                onChange={(e) => handleInputChange('job_description', e.target.value)}
                placeholder="Describe the repair work needed..."
                rows={3}
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5" />
              <h3 className="font-medium">Customer Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name *</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label>Customer Email *</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  placeholder="Enter customer email"
                />
              </div>
              <div>
                <Label>Customer Phone *</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  placeholder="Enter customer phone"
                />
              </div>
              <div>
                <Label>Customer Address</Label>
                <Input
                  value={formData.customer_address}
                  onChange={(e) => handleInputChange('customer_address', e.target.value)}
                  placeholder="Enter customer address"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Car className="w-5 h-5" />
              <h3 className="font-medium">Vehicle Information</h3>
            </div>
            <div className="space-y-4">
              {!formData.cost_center ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">Please select a cost center in Step 1 to view available vehicles.</p>
                  <p className="text-xs text-yellow-600 mt-1">Debug: cost_center = "{formData.cost_center}"</p>
                </div>
              ) : loadingVehicles ? (
                <div className="text-sm text-gray-500">Loading vehicles...</div>
              ) : vehicles.length > 0 ? (
                <div>
                  <Label>Available Vehicles</Label>
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Fleet/Reg</th>
                          <th className="px-3 py-2 text-left">Make/Model</th>
                          <th className="px-3 py-2 text-left">Year</th>
                          <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicles.map((vehicle) => (
                          <tr key={vehicle.reg} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2">{vehicle.fleet_number || vehicle.reg}</td>
                            <td className="px-3 py-2">{vehicle.make} {vehicle.model}</td>
                            <td className="px-3 py-2">{vehicle.year}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewVehicle(vehicle)}
                                  className="text-xs"
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSelectVehicle(vehicle)}
                                  className="text-xs bg-blue-600 hover:bg-blue-700"
                                >
                                  Select
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : formData.cost_center && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm text-gray-600">No vehicles found for cost center: {formData.cost_center}</p>
                </div>
              )}
              
              {formData.vehicle_registration && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    Selected Vehicle: <strong>{formData.vehicle_registration}</strong> - {formData.vehicle_make} {formData.vehicle_model} ({formData.vehicle_year})
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-green-600 hover:bg-green-700">
            <Wrench className="mr-2 w-4 h-4" />
            Create Repair Job
          </Button>
        </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Repair Job</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === index;
              const isCompleted = currentStep > index;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`ml-2 text-sm ${
                    isActive ? 'text-blue-600 font-medium' :
                    isCompleted ? 'text-green-600' :
                    'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-1 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              {currentStep === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Creating...' : 'Create & Assign Parts'}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>

      {/* Vehicle Details Modal */}
      <Dialog open={showVehicleModal} onOpenChange={setShowVehicleModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vehicle Details - {selectedVehicleDetails?.reg || selectedVehicleDetails?.registration}</DialogTitle>
          </DialogHeader>
          {selectedVehicleDetails && (
            <div className="space-y-6">
              {/* Basic Vehicle Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-700 text-sm">Registration:</span>
                  <p className="text-gray-900">{selectedVehicleDetails.reg || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 text-sm">Make:</span>
                  <p className="text-gray-900">{selectedVehicleDetails.make || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 text-sm">Model:</span>
                  <p className="text-gray-900">{selectedVehicleDetails.model || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 text-sm">Year:</span>
                  <p className="text-gray-900">{selectedVehicleDetails.year || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 text-sm">VIN:</span>
                  <p className="text-gray-900">{selectedVehicleDetails.vin || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 text-sm">Engine:</span>
                  <p className="text-gray-900">{selectedVehicleDetails.engine || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 text-sm">Colour:</span>
                  <p className="text-gray-900">{selectedVehicleDetails.colour || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 text-sm">Fleet Number:</span>
                  <p className="text-gray-900">{selectedVehicleDetails.fleet_number || 'N/A'}</p>
                </div>
              </div>

              {/* Equipment Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Installed Equipment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(selectedVehicleDetails)
                    .filter(([key, value]) => 
                      value && 
                      value !== '' && 
                      !['id', 'created_at', 'company', 'new_account_number', 'branch', 'unique_id', 'reg', 'make', 'model', 'vin', 'engine', 'year', 'colour', 'fleet_number', 'account_number'].includes(key)
                    )
                    .map(([key, value]) => (
                      <div key={key} className="bg-white p-3 border rounded">
                        <span className="font-medium text-gray-700 text-sm capitalize">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                        </span>
                        <p className="text-gray-900 text-sm">{String(value)}</p>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}