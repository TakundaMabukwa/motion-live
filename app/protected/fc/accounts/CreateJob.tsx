'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Plus, 
  Save,
  CheckCircle,
  Circle
} from 'lucide-react';

interface CreateJobProps {
  onBack: () => void;
  onSave: () => void;
}

const steps = [
  { id: 1, name: 'Job Details', icon: Circle },
  { id: 2, name: 'Vehicle Details', icon: Circle },
];

export default function CreateJob({ onBack, onSave }: CreateJobProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    jobType: 'New Installation',
    quoteRef: '',
    paymentType: 'Cash',
    // Vehicle details would be added in step 2
  });

  const [errors, setErrors] = useState({
    quoteRef: false
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const validateStep = () => {
    const newErrors = { ...errors };
    
    if (currentStep === 1) {
      newErrors.quoteRef = !formData.quoteRef.trim();
    }
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const nextStep = () => {
    if (validateStep() && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    if (validateStep()) {
      console.log('Saving job data:', formData);
      onSave();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="jobType" className="text-sm font-medium text-gray-600">
                    Job Type *
                  </Label>
                  <Select value={formData.jobType} onValueChange={(value) => handleInputChange('jobType', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Installation">New Installation</SelectItem>
                      <SelectItem value="De-Installation">De-Installation</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Repair">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paymentType" className="text-sm font-medium text-gray-600">
                    Payment Type *
                  </Label>
                  <Select value={formData.paymentType} onValueChange={(value) => handleInputChange('paymentType', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                      <SelectItem value="Invoice">Invoice</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="quoteRef" className="text-sm font-medium text-gray-600">
                    Quote Ref *
                  </Label>
                  <Input
                    id="quoteRef"
                    value={formData.quoteRef}
                    onChange={(e) => handleInputChange('quoteRef', e.target.value)}
                    className={`mt-1 ${errors.quoteRef ? 'border-red-500' : ''}`}
                    placeholder="Enter quote reference"
                  />
                  {errors.quoteRef && (
                    <p className="text-red-500 text-sm mt-1">This field is required</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">Vehicle Details</div>
              <div className="text-gray-400 text-sm mt-2">Vehicle selection and details will be configured here</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="px-3">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Plus className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Create New Job</h1>
              <p className="text-gray-600">Add a new job to the system</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= step.id ? 'bg-sky-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
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
                  Next
                </Button>
              ) : (
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-2" />
                  Create Job
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}