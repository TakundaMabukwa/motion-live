'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Car, 
  Save, 
  Plus,
  CheckCircle,
  Circle
} from 'lucide-react';

interface CreateVehicleProps {
  onBack: () => void;
  onSave: () => void;
}

const steps = [
  { id: 1, name: 'Basic Information', icon: Car },
  { id: 2, name: 'Technical Details', icon: Circle },
  { id: 3, name: 'Service & Maintenance', icon: Circle },
  { id: 4, name: 'Dimensions & Weight', icon: Circle },
];

export default function CreateVehicle({ onBack, onSave }: CreateVehicleProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Information
    registrationNumber: '',
    engineNumber: '',
    vinNumber: '',
    make: '',
    model: '',
    subModel: '',
    manufacturedYear: '',
    vehicleType: '',
    registrationDate: '',
    licenseExpiryDate: '',
    purchasePrice: '',
    retailPrice: '',
    vehiclePriority: '',
    fuelType: '',
    transmissionType: '',
    tankCapacity: '',
    color: '',
    
    // Technical Details
    registerNumber: '',
    takeOnKilometers: '',
    serviceIntervals: '',
    boardingKm: '',
    dateOfExpectedBoarding: '',
    costCentres: '',
    
    // Dimensions
    lengthInMeters: '',
    widthInMeters: '',
    heightInMeters: '',
    volume: '',
    tare: '',
    gross: '',
    
    // Service Plan
    servicePlan: '',
    factoryPlan: '',
    aftermarketPlan: '',
    serviceProvider: '',
    servicePlanKm: '',
    servicePlanIntervals: '',
    servicePlanStartDate: '',
    servicePlanEndDate: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    console.log('Saving vehicle data:', formData);
    onSave();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input
                    id="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    placeholder="e.g., LX 90 MH GP"
                  />
                </div>
                <div>
                  <Label htmlFor="engineNumber">Engine Number</Label>
                  <Input
                    id="engineNumber"
                    value={formData.engineNumber}
                    onChange={(e) => handleInputChange('engineNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="vinNumber">VIN/Chassis Number</Label>
                  <Input
                    id="vinNumber"
                    value={formData.vinNumber}
                    onChange={(e) => handleInputChange('vinNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="make">Make *</Label>
                  <Select value={formData.make} onValueChange={(value) => handleInputChange('make', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select make" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="toyota">Toyota</SelectItem>
                      <SelectItem value="ford">Ford</SelectItem>
                      <SelectItem value="chevrolet">Chevrolet</SelectItem>
                      <SelectItem value="suzuki">Suzuki</SelectItem>
                      <SelectItem value="nissan">Nissan</SelectItem>
                      <SelectItem value="volkswagen">Volkswagen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="e.g., Corolla, F-150"
                  />
                </div>
                <div>
                  <Label htmlFor="subModel">Sub Model</Label>
                  <Input
                    id="subModel"
                    value={formData.subModel}
                    onChange={(e) => handleInputChange('subModel', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="manufacturedYear">Manufactured Year *</Label>
                  <Select value={formData.manufacturedYear} onValueChange={(value) => handleInputChange('manufacturedYear', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select value={formData.vehicleType} onValueChange={(value) => handleInputChange('vehicleType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedan">Sedan</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="utility">Utility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fuelType">Fuel Type</Label>
                  <Select value={formData.fuelType} onValueChange={(value) => handleInputChange('fuelType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="petrol">Petrol</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="transmissionType">Transmission Type</Label>
                  <Select value={formData.transmissionType} onValueChange={(value) => handleInputChange('transmissionType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transmission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Automatic</SelectItem>
                      <SelectItem value="cvt">CVT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Select value={formData.color} onValueChange={(value) => handleInputChange('color', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="black">Black</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="gray">Gray</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tankCapacity">Tank Capacity (L)</Label>
                  <Input
                    id="tankCapacity"
                    type="number"
                    value={formData.tankCapacity}
                    onChange={(e) => handleInputChange('tankCapacity', e.target.value)}
                    placeholder="e.g., 60"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="registrationDate">Registration Date</Label>
                  <Input
                    id="registrationDate"
                    type="date"
                    value={formData.registrationDate}
                    onChange={(e) => handleInputChange('registrationDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="licenseExpiryDate">License Expiry Date</Label>
                  <Input
                    id="licenseExpiryDate"
                    type="date"
                    value={formData.licenseExpiryDate}
                    onChange={(e) => handleInputChange('licenseExpiryDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="retailPrice">Retail Price</Label>
                  <Input
                    id="retailPrice"
                    type="number"
                    value={formData.retailPrice}
                    onChange={(e) => handleInputChange('retailPrice', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="takeOnKilometers">Take on Kilometers</Label>
                  <Input
                    id="takeOnKilometers"
                    type="number"
                    value={formData.takeOnKilometers}
                    onChange={(e) => handleInputChange('takeOnKilometers', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vehiclePriority">Vehicle Priority</Label>
                  <Select value={formData.vehiclePriority} onValueChange={(value) => handleInputChange('vehiclePriority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="registerNumber">Register Number</Label>
                  <Input
                    id="registerNumber"
                    value={formData.registerNumber}
                    onChange={(e) => handleInputChange('registerNumber', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="serviceIntervals">Service Intervals (KM/hours)</Label>
                  <Input
                    id="serviceIntervals"
                    value={formData.serviceIntervals}
                    onChange={(e) => handleInputChange('serviceIntervals', e.target.value)}
                    placeholder="e.g., 10000 km"
                  />
                </div>
                <div>
                  <Label htmlFor="costCentres">Cost Centres</Label>
                  <Textarea
                    id="costCentres"
                    value={formData.costCentres}
                    onChange={(e) => handleInputChange('costCentres', e.target.value)}
                    placeholder="Enter cost centre details"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 font-semibold text-lg">Service Plan Configuration</h3>
              <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="servicePlan">Service Plan</Label>
                    <Select value={formData.servicePlan} onValueChange={(value) => handleInputChange('servicePlan', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="factoryPlan">Factory Plan</Label>
                    <Select value={formData.factoryPlan} onValueChange={(value) => handleInputChange('factoryPlan', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select factory plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="aftermarketPlan">Aftermarket Plan</Label>
                    <Select value={formData.aftermarketPlan} onValueChange={(value) => handleInputChange('aftermarketPlan', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select aftermarket plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="serviceProvider">Service Provider</Label>
                    <Input
                      id="serviceProvider"
                      value={formData.serviceProvider}
                      onChange={(e) => handleInputChange('serviceProvider', e.target.value)}
                      placeholder="Enter service provider"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="servicePlanKm">Service Plan KM</Label>
                    <Input
                      id="servicePlanKm"
                      type="number"
                      value={formData.servicePlanKm}
                      onChange={(e) => handleInputChange('servicePlanKm', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="servicePlanIntervals">Service Plan Intervals (KM)</Label>
                    <Input
                      id="servicePlanIntervals"
                      type="number"
                      value={formData.servicePlanIntervals}
                      onChange={(e) => handleInputChange('servicePlanIntervals', e.target.value)}
                      placeholder="e.g., 15000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="servicePlanStartDate">Service Plan Start Date</Label>
                    <Input
                      id="servicePlanStartDate"
                      type="date"
                      value={formData.servicePlanStartDate}
                      onChange={(e) => handleInputChange('servicePlanStartDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="servicePlanEndDate">Service Plan End Date</Label>
                    <Input
                      id="servicePlanEndDate"
                      type="date"
                      value={formData.servicePlanEndDate}
                      onChange={(e) => handleInputChange('servicePlanEndDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 font-semibold text-lg">Vehicle Dimensions & Weight</h3>
              <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="lengthInMeters">Length (Meters)</Label>
                    <Input
                      id="lengthInMeters"
                      type="number"
                      step="0.01"
                      value={formData.lengthInMeters}
                      onChange={(e) => handleInputChange('lengthInMeters', e.target.value)}
                      placeholder="e.g., 4.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="widthInMeters">Width (Meters)</Label>
                    <Input
                      id="widthInMeters"
                      type="number"
                      step="0.01"
                      value={formData.widthInMeters}
                      onChange={(e) => handleInputChange('widthInMeters', e.target.value)}
                      placeholder="e.g., 1.8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="heightInMeters">Height (Meters)</Label>
                    <Input
                      id="heightInMeters"
                      type="number"
                      step="0.01"
                      value={formData.heightInMeters}
                      onChange={(e) => handleInputChange('heightInMeters', e.target.value)}
                      placeholder="e.g., 1.6"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="volume">Volume (m³)</Label>
                    <Input
                      id="volume"
                      type="number"
                      step="0.01"
                      value={formData.volume}
                      onChange={(e) => handleInputChange('volume', e.target.value)}
                      placeholder="e.g., 12.96"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tare">Tare (kg) - Vehicle without load</Label>
                    <Input
                      id="tare"
                      type="number"
                      value={formData.tare}
                      onChange={(e) => handleInputChange('tare', e.target.value)}
                      placeholder="e.g., 1200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gross">Gross (kg) - Total load weight</Label>
                    <Input
                      id="gross"
                      type="number"
                      value={formData.gross}
                      onChange={(e) => handleInputChange('gross', e.target.value)}
                      placeholder="e.g., 3500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="px-3">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Plus className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-2xl">Create New Vehicle</h1>
              <p className="text-gray-600">Add a new vehicle to your fleet management system</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= step.id ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold text-sm">{step.id}</span>
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id ? 'text-sky-600' : 'text-gray-600'
                }`}>
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-20 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-sky-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Content */}
      <Card>
        <CardHeader>
          <CardTitle>Step {currentStep}: {steps[currentStep - 1].name}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
          
          <Separator className="my-6" />
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={prevStep} 
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              {currentStep < steps.length ? (
                <Button onClick={nextStep} className="bg-sky-600 hover:bg-sky-700">
                  Next Step
                </Button>
              ) : (
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  <Save className="mr-2 w-4 h-4" />
                  Create Vehicle
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}