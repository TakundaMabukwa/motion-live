'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Loader2,
  User,
  Car,
  Wrench,
  Camera,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface CreateRepairJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  userInfo: any;
  onJobCreated: (jobData: any) => void;
}

export default function CreateRepairJobModal({ 
  isOpen, 
  onClose, 
  userInfo, 
  onJobCreated 
}: CreateRepairJobModalProps) {
  const [currentStep, setCurrentStep] = useState<'customer-info' | 'vehicle-details' | 'job-description' | 'before-photos' | 'after-photos' | 'complete'>('customer-info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  
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

  // Photos
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [maxPhotosReached, setMaxPhotosReached] = useState(false);
  const [maxAfterPhotosReached, setMaxAfterPhotosReached] = useState(false);
  
  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
              setBeforePhotos([]);
        setAfterPhotos([]);
        setMaxPhotosReached(false);
        setMaxAfterPhotosReached(false);
    }
  }, [isOpen]);

  // Initialize camera when modal opens and step changes
  useEffect(() => {
    if (isOpen && (currentStep === 'before-photos' || currentStep === 'after-photos')) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, currentStep]);

  // Camera functions
  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported in this browser');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          facingMode: 'environment'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              toast.success('Camera started successfully!');
            }).catch((error) => {
              console.error('Video play error:', error);
              toast.error('Failed to start camera');
            });
          }
        };
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error('Failed to start camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCustomerInfoNext = () => {
    if (!customerInfo.customer_name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!customerInfo.customer_email.trim()) {
      toast.error('Customer email is required');
      return;
    }
    if (!customerInfo.customer_phone.trim()) {
      toast.error('Customer phone is required');
      return;
    }
    if (!customerInfo.customer_address.trim()) {
      toast.error('Customer address is required');
      return;
    }
    setCurrentStep('vehicle-details');
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
    setCurrentStep('before-photos');
  };

  const capturePhoto = () => {
    if (beforePhotos.length >= 10) {
      setMaxPhotosReached(true);
      toast.error('Maximum 10 photos allowed');
      return;
    }

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const photoData = canvas.toDataURL('image/jpeg');
        setBeforePhotos(prev => [...prev, photoData]);
        toast.success(`Before photo ${beforePhotos.length + 1} captured!`);
      }
    }
  };

  const removePhoto = (index: number) => {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index));
    setMaxPhotosReached(false);
  };

  const captureAfterPhoto = () => {
    if (afterPhotos.length >= 10) {
      setMaxAfterPhotosReached(true);
      toast.error('Maximum 10 after photos allowed');
      return;
    }

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const photoData = canvas.toDataURL('image/jpeg');
        setAfterPhotos(prev => [...prev, photoData]);
        toast.success(`After photo ${afterPhotos.length + 1} captured!`);
      }
    }
  };

  const removeAfterPhoto = (index: number) => {
    setAfterPhotos(prev => prev.filter((_, i) => i !== index));
    setMaxAfterPhotosReached(false);
  };

  const handleCreateJob = async () => {
    if (beforePhotos.length === 0) {
      toast.error('Please capture at least one before photo');
      return;
    }

    if (afterPhotos.length === 0) {
      toast.error('Please capture at least one after photo');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload before photos to storage and get URLs
      const supabase = createClient();
      const beforePhotoUrls: string[] = [];

      for (const photoData of beforePhotos) {
        // Convert base64 to blob
        const response = await fetch(photoData);
        const blob = await response.blob();
        
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const filename = `repair_job_before_${timestamp}_${randomId}.jpg`;
        
        // Upload to invoices bucket in job-photos folder
        const { data, error } = await supabase.storage
          .from('invoices')
          .upload(`job-photos/${filename}`, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Error uploading before photo:', error);
          toast.error(`Failed to upload before photo ${beforePhotoUrls.length + 1}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(`job-photos/${filename}`);

        beforePhotoUrls.push(urlData.publicUrl);
      }

      if (beforePhotoUrls.length === 0) {
        throw new Error('Failed to upload any before photos');
      }

      // Upload after photos to storage and get URLs
      const afterPhotoUrls: string[] = [];

      for (const photoData of afterPhotos) {
        // Convert base64 to blob
        const response = await fetch(photoData);
        const blob = await response.blob();
        
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const filename = `repair_job_after_${timestamp}_${randomId}.jpg`;
        
        // Upload to invoices bucket in job-photos folder
        const { data, error } = await supabase.storage
          .from('invoices')
          .upload(`job-photos/${filename}`, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Error uploading after photo:', error);
          toast.error(`Failed to upload after photo ${afterPhotoUrls.length + 1}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(`job-photos/${filename}`);

        afterPhotoUrls.push(urlData.publicUrl);
      }

      if (afterPhotoUrls.length === 0) {
        throw new Error('Failed to upload any after photos');
      }

      // Create the job card data
      const jobCardData = {
        // Job details
        job_type: 'repair',
        repair: true,
        job_description: jobInfo.job_description,
        priority: 'medium',
        status: 'completed',
        job_status: 'Completed',
        
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
        
        // Technician information
        technician_name: userInfo?.user?.email || 'Unknown',
        technician_phone: userInfo?.user?.email || 'Unknown',
        
        // Job details
        job_date: new Date().toISOString(),
        start_time: new Date().toISOString(),
        completion_date: new Date().toISOString(),
        end_time: new Date().toISOString(),
        
        // Photos (uploaded to storage)
        before_photos: beforePhotoUrls,
        after_photos: afterPhotoUrls,
        
        // Metadata
        created_by: userInfo?.user?.id || '00000000-0000-0000-0000-000000000000',
        updated_by: userInfo?.user?.id || '00000000-0000-0000-0000-000000000000',
        
        // Generate a unique job number for repair jobs
        job_number: `REPAIR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
       toast.success(`Repair job completed successfully! Job number: ${result.data.job_number}`);
       
       // Move to complete step
       setCurrentStep('complete');
      
      // Notify parent component
      onJobCreated(result.data);
      
    } catch (error) {
      console.error('Error creating repair job:', error);
      toast.error(`Failed to create repair job: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCurrentStep('customer-info');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-xl">Create Repair Job</h2>
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
               { key: 'before-photos', label: 'Before Photos', icon: Camera },
               { key: 'after-photos', label: 'After Photos', icon: Camera },
               { key: 'complete', label: 'Complete', icon: CheckCircle },
             ].map((step, index) => {
               const Icon = step.icon;
               const isActive = currentStep === step.key;
               const isCompleted = ['customer-info', 'vehicle-details', 'job-description', 'before-photos', 'after-photos', 'complete'].indexOf(currentStep) > index;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  {index < 4 && (
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Customer Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <Label htmlFor="customerEmail">Customer Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerInfo.customer_email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, customer_email: e.target.value }))}
                      placeholder="Enter customer email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Customer Phone *</Label>
                    <Input
                      id="customerPhone"
                      value={customerInfo.customer_phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, customer_phone: e.target.value }))}
                      placeholder="Enter customer phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerAddress">Customer Address *</Label>
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
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  Next: Vehicle Details
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Vehicle Details */}
          {currentStep === 'vehicle-details' && (
            <Card>
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
            <Card>
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
                      placeholder="Describe what needs to be repaired..."
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
                    Next: Before Photos
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Before Photos */}
          {currentStep === 'before-photos' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Before Photos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800">
                    Please capture photos of the vehicle/work area before starting the repair.
                    You can take multiple photos as needed.
                  </p>
                </div>

                                 {/* Camera View */}
                 <div className="relative">
                   <div className="bg-gray-900 rounded-lg w-full h-64 overflow-hidden">
                     <video
                       ref={videoRef}
                       autoPlay
                       playsInline
                       muted
                       className="w-full h-full object-cover"
                     />
                     <canvas ref={canvasRef} className="hidden" />
                   </div>
                   
                   {/* Camera Controls */}
                   <div className="mt-4 text-center">
                     <Button
                       onClick={capturePhoto}
                       disabled={maxPhotosReached}
                       className="bg-blue-600 hover:bg-blue-700"
                     >
                       <Camera className="mr-2 w-4 h-4" />
                       {maxPhotosReached ? 'Max Photos (10)' : 'Capture Photo'}
                     </Button>
                     
                     <Button
                       onClick={() => {
                         stopCamera();
                         setTimeout(() => startCamera(), 500);
                       }}
                       variant="outline"
                       size="sm"
                       className="bg-white/90 hover:bg-white ml-2 text-gray-800"
                     >
                       Switch Camera
                     </Button>
                   </div>
                 </div>

                {/* Captured Photos */}
                {beforePhotos.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Captured Photos ({beforePhotos.length}/10)</h4>
                      {maxPhotosReached && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Max Photos Reached
                        </Badge>
                      )}
                    </div>
                    <div className="gap-4 grid grid-cols-3">
                      {beforePhotos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={photo}
                            alt={`Before photo ${index + 1}`}
                            className="rounded-lg w-full h-24 object-cover"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="-top-2 -right-2 absolute bg-red-500 hover:bg-red-600 p-1 rounded-full text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                                 <div className="flex gap-3">
                   <Button
                     onClick={() => setCurrentStep('job-description')}
                     variant="outline"
                     className="flex-1"
                   >
                     Back
                   </Button>
                   <Button
                     onClick={() => setCurrentStep('after-photos')}
                     disabled={beforePhotos.length === 0}
                     className="flex-1 bg-blue-600 hover:bg-blue-700"
                   >
                     Next: After Photos
                   </Button>
                 </div>
              </CardContent>
            </Card>
                     )}

           {/* Step 5: After Photos */}
           {currentStep === 'after-photos' && (
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center space-x-2">
                   <Camera className="w-5 h-5" />
                   <span>After Photos</span>
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="bg-green-50 p-4 rounded-lg">
                   <p className="text-green-800">
                     Please capture photos of the completed repair work.
                     You can take multiple photos as needed.
                   </p>
                 </div>

                 {/* Camera View */}
                 <div className="relative">
                   <div className="bg-gray-900 rounded-lg w-full h-64 overflow-hidden">
                     <video
                       ref={videoRef}
                       autoPlay
                       playsInline
                       muted
                       className="w-full h-full object-cover"
                     />
                     <canvas ref={canvasRef} className="hidden" />
                   </div>
                   
                   {/* Camera Controls */}
                   <div className="mt-4 text-center">
                     <Button
                       onClick={captureAfterPhoto}
                       disabled={maxAfterPhotosReached}
                       className="bg-blue-600 hover:bg-blue-700"
                     >
                       <Camera className="mr-2 w-4 h-4" />
                       {maxAfterPhotosReached ? 'Max Photos (10)' : 'Capture After Photo'}
                     </Button>
                     
                     <Button
                       onClick={() => {
                         stopCamera();
                         setTimeout(() => startCamera(), 500);
                       }}
                       variant="outline"
                       size="sm"
                       className="bg-white/90 hover:bg-white ml-2 text-gray-800"
                     >
                       Switch Camera
                     </Button>
                   </div>
                 </div>

                 {/* Captured After Photos */}
                 {afterPhotos.length > 0 && (
                   <div className="space-y-4">
                     <div className="flex justify-between items-center">
                       <h4 className="font-medium">Captured After Photos ({afterPhotos.length}/10)</h4>
                       {maxAfterPhotosReached && (
                         <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                           Max Photos Reached
                         </Badge>
                       )}
                     </div>
                     <div className="gap-4 grid grid-cols-3">
                       {afterPhotos.map((photo, index) => (
                         <div key={index} className="relative">
                           <img
                             src={photo}
                             alt={`After photo ${index + 1}`}
                             className="rounded-lg w-full h-24 object-cover"
                           />
                           <button
                             onClick={() => removeAfterPhoto(index)}
                             className="-top-2 -right-2 absolute bg-red-500 hover:bg-red-600 p-1 rounded-full text-white"
                           >
                             <X className="w-3 h-3" />
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 <div className="flex gap-3">
                   <Button
                     onClick={() => setCurrentStep('before-photos')}
                     variant="outline"
                     className="flex-1"
                   >
                     Back
                   </Button>
                   <Button
                     onClick={handleCreateJob}
                     disabled={afterPhotos.length === 0 || isSubmitting}
                     className="flex-1 bg-green-600 hover:bg-green-700"
                   >
                     {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                     Create & Complete Repair Job
                   </Button>
                 </div>
               </CardContent>
             </Card>
           )}

           {/* Step 6: Complete */}
          {currentStep === 'complete' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>Repair Job Created Successfully!</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="flex justify-center items-center bg-green-100 mx-auto rounded-full w-16 h-16">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                                 <div>
                   <h3 className="mb-2 font-medium text-gray-900 text-lg">
                     Repair job has been completed
                   </h3>
                   <p className="text-gray-600">
                     The repair job has been successfully created and marked as completed.
                     All photos have been captured and the job is ready for review.
                   </p>
                 </div>

                                 <div className="bg-gray-50 p-4 rounded-lg">
                   <h4 className="mb-2 font-medium">Summary</h4>
                   <div className="space-y-1 text-gray-600 text-sm">
                     <div>• Customer information captured</div>
                     <div>• Vehicle details recorded</div>
                     <div>• Job description documented</div>
                     <div>• {beforePhotos.length} before photos captured</div>
                     <div>• {afterPhotos.length} after photos captured</div>
                     <div>• Job status: Completed</div>
                     <div>• Repair marked as true</div>
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
