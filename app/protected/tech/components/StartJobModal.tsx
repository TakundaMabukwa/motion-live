'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Camera,
  X,
  CheckCircle,
  AlertCircle,
  QrCode,
  Car,
  Upload,
  Trash2,
  Loader2,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import EndJobModal from './EndJobModal';

interface StartJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  onJobStarted: (jobData: any) => void;
  onJobCompleted?: (jobData: any) => void;
}

interface VehicleData {
  id?: number;
  new_registration: string;
  vin_number?: string;
  company?: string;
  comment?: string;
  group_name?: string;
  ip_address?: string;
  new_account_number: string;
  active?: boolean;
}

export default function StartJobModal({ isOpen, onClose, job, onJobStarted, onJobCompleted }: StartJobModalProps) {
  const [currentStep, setCurrentStep] = useState<'qr-scan' | 'vehicle-check' | 'before-photos' | 'complete' | 'end-job'>('qr-scan');
  const [qrCode, setQrCode] = useState('');
  const [isQrValid, setIsQrValid] = useState(false);
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualJobId, setManualJobId] = useState('');
  const [jobData, setJobData] = useState<any>(job);
  const [showEndJobModal, setShowEndJobModal] = useState(false);

  // Check if job is already active when modal opens
  useEffect(() => {
    if (isOpen && jobData) {
      console.log('Modal opened, jobData:', jobData);
      console.log('Job status:', jobData.status, 'Job status:', jobData.job_status);
      
      if (jobData.status === 'Active' || jobData.job_status === 'Active') {
        console.log('Setting step to end-job');
        setCurrentStep('end-job');
      } else {
        console.log('Setting step to qr-scan');
        setCurrentStep('qr-scan');
      }
    }
  }, [isOpen, jobData]);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Modal isOpen changed to:', isOpen);
      if (jobData) {
        if (jobData.status === 'Active' || jobData.job_status === 'Active') {
          setCurrentStep('end-job');
        } else {
          setCurrentStep('qr-scan');
        }
      }
    }
  }, [isOpen]);

  // Initialize vehicle data with job information when form is shown
  useEffect(() => {
    if (showVehicleForm && jobData) {
      const initialVehicleData = {
        new_registration: jobData.vehicle_registration || jobData.temporary_registration || '',
        vin_number: jobData.vin_numer || '',
        company: jobData.customer_name || '',
        new_account_number: jobData.customer_email || jobData.customer_phone || '',
        ip_address: jobData.ip_address || '',
        comment: jobData.job_description || jobData.job_type || `Job: ${jobData.job_number}`,
        group_name: jobData.vehicle_registration || jobData.temporary_registration || '',
        active: true
      };
      console.log('Initializing vehicle data:', initialVehicleData);
      setVehicleData(initialVehicleData);
    }
  }, [showVehicleForm, jobData]);

  // Debug: Monitor step changes
  useEffect(() => {
    console.log('Current step changed to:', currentStep);
  }, [currentStep]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen && currentStep === 'before-photos') {
      // Check camera permissions first
      checkCameraPermissions().then(() => {
        startCamera();
      });
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, currentStep]);

  const checkCameraPermissions = async () => {
    try {
      // Check if we have camera permissions
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permissions.state === 'denied') {
        toast.error('Camera access denied. Please enable camera permissions in your browser settings.');
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('Permission API not supported, proceeding with camera access');
      return true;
    }
  };

  const startCamera = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported on this device/browser');
        return;
      }

      // Mobile-optimized camera constraints
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera on mobile
          width: { ideal: 1280, min: 320, max: 1920 },
          height: { ideal: 720, min: 240, max: 1080 },
          aspectRatio: { ideal: 16/9, min: 1, max: 2 }
        }
      };

      let stream;
      
      // Try environment camera first (back camera on mobile)
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Environment camera started successfully');
      } catch (envError) {
        console.log('Environment camera failed, trying user camera:', envError);
        
        // Fallback to user camera (front camera)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 1280, min: 320, max: 1920 },
              height: { ideal: 720, min: 240, max: 1080 }
            }
          });
          console.log('User camera started successfully');
        } catch (userError) {
          console.log('User camera also failed:', userError);
          
          // Last resort: try with minimal constraints
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true
            });
            console.log('Minimal camera started successfully');
          } catch (minimalError) {
            throw minimalError;
          }
        }
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error);
          }
        };

        // Handle video errors
        videoRef.current.onerror = (error) => {
          console.error('Video error:', error);
          toast.error('Video playback error. Please try again.');
        };

        toast.success('Camera started successfully!');
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      
      // Provide specific error messages for common mobile issues
      if (error.name === 'NotAllowedError') {
        toast.error('Camera access denied. Please allow camera permissions in your browser settings and refresh the page.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device.');
      } else if (error.name === 'NotSupportedError') {
        toast.error('Camera not supported on this device or browser.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera is in use by another application. Please close other camera apps and try again.');
      } else if (error.name === 'OverconstrainedError') {
        toast.error('Camera constraints not met. Trying with minimal settings...');
        // Try again with minimal constraints
        setTimeout(() => startCamera(), 1000);
        return;
      } else {
        toast.error('Failed to start camera. Please check permissions and try again.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const photoData = canvas.toDataURL('image/jpeg');
        setBeforePhotos(prev => [...prev, photoData]);
        toast.success('Photo captured!');
      }
    }
  };

  const removePhoto = (index: number) => {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleQrCodeSubmit = async () => {
    if (!qrCode.trim()) {
      toast.error('Please enter a QR code');
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying QR code:', qrCode);
      console.log('Job QR code:', jobData.qr_code);
      
      // Verify QR code matches job
      if (qrCode === jobData.qr_code) {
        setIsQrValid(true);
        toast.success('QR code verified!');
        console.log('QR verified, setting step to vehicle-check');
        setCurrentStep('vehicle-check');
      } else {
        toast.error('Invalid QR code for this job');
      }
    } catch (error) {
      console.error('Error verifying QR code:', error);
      toast.error('Failed to verify QR code');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobById = async (jobId: string) => {
    if (!jobId.trim()) {
      toast.error('Please enter a job ID');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching job by ID:', jobId);
      const response = await fetch(`/api/job-cards/${jobId}`);
      
      if (response.ok) {
        const job = await response.json();
        console.log('Job loaded successfully:', job);
        setJobData(job);
        toast.success(`Job ${job.job_number} loaded successfully!`);
        
        // Auto-fill vehicle data with job information
        const initialVehicleData = {
          new_registration: job.vehicle_registration || '',
          vin_number: job.vin_numer || '',
          company: job.customer_name || '',
          new_account_number: job.customer_email || job.customer_phone || '',
          ip_address: job.ip_address || '',
          comment: job.job_description || job.job_type || `Job: ${job.job_number}`,
          group_name: job.vehicle_registration || '',
          active: true
        };
        console.log('Setting initial vehicle data:', initialVehicleData);
        setVehicleData(initialVehicleData);
        
        // Go directly to vehicle check step
        console.log('Setting step to vehicle-check');
        setCurrentStep('vehicle-check');
      } else {
        toast.error('Job not found. Please check the job ID.');
      }
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error('Failed to fetch job data');
    } finally {
      setLoading(false);
    }
  };

  const checkVehicleDetails = async () => {
    setLoading(true);
    try {
      console.log('Job data available:', jobData);
      console.log('Vehicle registration:', jobData.vehicle_registration);
      console.log('Temporary registration:', jobData.temporary_registration);
      console.log('VIN number:', jobData.vin_numer);
      console.log('Customer name:', jobData.customer_name);
      console.log('IP address:', jobData.ip_address);
      
      // Check if we have vehicle information to search with
      const hasVehicleInfo = jobData.vehicle_registration || jobData.vin_numer || jobData.temporary_registration;
      
      if (!hasVehicleInfo) {
        console.log('No vehicle information available, showing form directly');
        toast.info('No vehicle information found in job. Please fill in vehicle details manually.');
        setShowVehicleForm(true);
        return;
      }
      
      // Check if vehicle exists in vehicles_ip table
      const registration = jobData.vehicle_registration || jobData.temporary_registration || '';
      const vin = jobData.vin_numer || '';
      
      console.log('Searching with registration:', registration, 'VIN:', vin);
      
      if (registration || vin) {
        const response = await fetch(`/api/vehicles-ip?registration=${registration}&vin=${vin}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('API response:', data);
          if (data.vehicles && data.vehicles.length > 0) {
            // Vehicle exists, use existing data
            setVehicleData(data.vehicles[0]);
            setCurrentStep('before-photos');
            toast.success('Vehicle details found');
          } else {
            // Vehicle not found, show form to fill details
            setShowVehicleForm(true);
          }
        } else {
          console.log('API response not ok, showing form');
          setShowVehicleForm(true);
        }
      } else {
        // No vehicle information available, show form directly
        setShowVehicleForm(true);
      }
    } catch (error) {
      console.error('Error checking vehicle:', error);
      setShowVehicleForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use temporary_registration from job if new_registration is empty
    const registration = vehicleData?.new_registration || jobData.temporary_registration;
    console.log('Form submission - registration:', registration);
    console.log('Form submission - vehicleData:', vehicleData);
    console.log('Form submission - jobData:', jobData);
    
    if (!registration) {
      toast.error('Vehicle Registration is required');
      return;
    }

    const requestBody = {
      new_registration: registration,
      vin_number: vehicleData?.vin_number || jobData.vin_numer || '',
      company: vehicleData?.company || jobData.customer_name || '',
      comment: vehicleData?.comment || jobData.job_description || jobData.job_type || `Job: ${jobData.job_number}`,
      group_name: registration, // Use registration (or temporary_registration) for group_name
      ip_address: vehicleData?.ip_address || jobData.ip_address || '',
      new_account_number: vehicleData?.new_account_number || jobData.customer_email || jobData.customer_phone || 'N/A',
      active: true,
    };
    
    console.log('Form submission - request body:', requestBody);

    setLoading(true);
    try {
      // Add vehicle to vehicles_ip table
      const response = await fetch('/api/vehicles-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const newVehicle = await response.json();
        setVehicleData(newVehicle);
        setShowVehicleForm(false);
        
        // Automatically proceed to before photos after successful vehicle addition
        setCurrentStep('before-photos');
        toast.success('Vehicle added successfully! Now taking before photos...');
        
        // Start camera for photo capture
        startCamera();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error response:', response.status, errorData);
        throw new Error(`Failed to add vehicle: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleBeforePhotosComplete = async () => {
    if (beforePhotos.length === 0) {
      toast.error('Please capture at least one before photo');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photos to storage and get URLs
      const supabase = createClient();
      const photoUrls: string[] = [];

      for (const photoData of beforePhotos) {
        // Convert base64 to blob
        const response = await fetch(photoData);
        const blob = await response.blob();
        
        // Generate unique filename
        const filename = `before_photos/${jobData.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('invoices')
          .upload(filename, blob);

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(filename);

        photoUrls.push(urlData.publicUrl);
      }

      // Update job with before photos and change status to active
      const updateResponse = await fetch(`/api/job-cards/${jobData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          before_photos: photoUrls,
          status: 'Active',
          job_status: 'Active',
          start_time: new Date().toISOString(),
        }),
      });

      if (updateResponse.ok) {
        toast.success('Job started successfully!');
        onJobStarted({ ...jobData, before_photos: photoUrls, status: 'Active' });
        setCurrentStep('complete');
      } else {
        throw new Error('Failed to update job');
      }
    } catch (error) {
      console.error('Error starting job:', error);
      toast.error('Failed to start job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJobCompleted = (completedJobData: any) => {
    if (onJobCompleted) {
      onJobCompleted(completedJobData);
    }
    setShowEndJobModal(false);
  };

  const handleClose = () => {
    setCurrentStep('qr-scan');
    setQrCode('');
    setIsQrValid(false);
    setVehicleData(null);
    setShowVehicleForm(false);
    setBeforePhotos([]);
    setManualJobId('');
    setJobData(job); // Reset to original job data
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center p-4 border-b">
           <h2 className="font-semibold text-xl">Start Job: {jobData?.job_number || 'Enter Job ID'}</h2>
           <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
             <X className="w-5 h-5" />
           </button>
         </div>

        <div className="p-6" key={currentStep}>
          {/* Debug info */}
          <div className="bg-gray-100 mb-4 p-2 rounded text-xs">
            <strong>Debug:</strong> Current step: {currentStep} | Job number: {jobData?.job_number} | Show form: {showVehicleForm.toString()}
          </div>
          
          {/* Progress Steps */}
          <div className="flex justify-center space-x-4 mb-6">
            {[
              { key: 'qr-scan', label: 'QR Scan', icon: QrCode },
              { key: 'vehicle-check', label: 'Vehicle Check', icon: Car },
              { key: 'before-photos', label: 'Before Photos', icon: Camera },
              { key: 'complete', label: 'Complete', icon: CheckCircle },
              { key: 'end-job', label: 'End Job', icon: CheckCircle },
            ].map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = ['qr-scan', 'vehicle-check', 'before-photos', 'complete'].indexOf(currentStep) > index;
              
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

          {/* Step 1: QR Code Scan */}
          {currentStep === 'qr-scan' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="w-5 h-5" />
                  <span>Scan QR Code</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="flex justify-center items-center bg-gray-100 mx-auto mb-4 rounded-lg w-32 h-32">
                    <QrCode className="w-16 h-16 text-gray-400" />
                  </div>
                  <p className="mb-4 text-gray-600">
                    Scan the QR code on the job card to verify and start the job
                  </p>
                </div>
                
                                 <div className="space-y-2">
                   <Label htmlFor="qrCode">QR Code</Label>
                   <Input
                     id="qrCode"
                     value={qrCode}
                     onChange={(e) => setQrCode(e.target.value)}
                     placeholder="Enter or scan QR code"
                     className="text-lg text-center"
                   />
                 </div>

                 <div className="relative">
                   <div className="absolute inset-0 flex items-center">
                     <span className="border-t w-full" />
                   </div>
                   <div className="relative flex justify-center text-xs uppercase">
                     <span className="bg-white px-2 text-gray-500">Or</span>
                   </div>
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="manualJobId">Job ID (Manual Entry)</Label>
                   <Input
                     id="manualJobId"
                     value={manualJobId}
                     onChange={(e) => setManualJobId(e.target.value)}
                     placeholder="Enter job ID (UUID)"
                     className="text-lg text-center"
                   />
                 </div>

                 <div className="gap-3 grid grid-cols-2">
                   <Button 
                     onClick={handleQrCodeSubmit} 
                     disabled={loading || !qrCode.trim()}
                     className="w-full"
                   >
                     {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                     Verify QR Code
                   </Button>

                   <Button 
                     onClick={() => fetchJobById(manualJobId)}
                     disabled={loading || !manualJobId.trim()}
                     variant="outline"
                     className="w-full"
                   >
                     {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                     Load Job by ID
                   </Button>
                 </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Vehicle Check */}
          {currentStep === 'vehicle-check' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Car className="w-5 h-5" />
                  <span>Vehicle Verification</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                                 <div className="bg-blue-50 p-4 rounded-lg">
                   <h4 className="mb-2 font-medium text-blue-900">Job Details</h4>
                   <div className="gap-4 grid grid-cols-2 text-sm">
                     <div>
                       <span className="font-medium">Customer:</span> {jobData.customer_name || 'N/A'}
                     </div>
                     <div>
                       <span className="font-medium">Vehicle:</span> {jobData.vehicle_registration || jobData.temporary_registration || 'N/A'}
                     </div>
                     <div>
                       <span className="font-medium">VIN:</span> {jobData.vin_numer || 'N/A'}
                     </div>
                     <div>
                       <span className="font-medium">Job Type:</span> {jobData.job_type || 'N/A'}
                     </div>
                   </div>
                   {jobData.temporary_registration && !jobData.vehicle_registration && (
                     <div className="mt-2 text-blue-600 text-xs">
                       <strong>Note:</strong> Using temporary registration: {jobData.temporary_registration}
                     </div>
                   )}
                 </div>

                {!showVehicleForm ? (
                  <Button onClick={checkVehicleDetails} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                    Check Vehicle Details
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-yellow-800">
                        Vehicle not found. Please fill in the missing details.
                      </p>
                    </div>
                    
                    <form onSubmit={handleVehicleFormSubmit} className="space-y-4">
                                             {/* Auto-filled information display */}
                       <div className="bg-blue-50 p-4 rounded-lg">
                         <h5 className="mb-3 font-medium text-blue-900">Auto-filled Information:</h5>
                         <div className="gap-4 grid grid-cols-2 text-sm">
                           <div>
                             <span className="font-medium text-blue-700">Customer:</span>
                             <div className="text-blue-600">{jobData.customer_name || 'N/A'}</div>
                           </div>
                           <div>
                             <span className="font-medium text-blue-700">IP Address:</span>
                             <div className="text-blue-600">{jobData.ip_address || 'N/A'}</div>
                           </div>
                           <div>
                             <span className="font-medium text-blue-700">Account:</span>
                             <div className="text-blue-600">{jobData.customer_email || jobData.customer_phone || 'N/A'}</div>
                           </div>
                           <div>
                             <span className="font-medium text-blue-700">Job Type:</span>
                             <div className="text-blue-600">{jobData.job_type || 'N/A'}</div>
                           </div>
                         </div>
                         <div className="mt-3 pt-3 border-t border-blue-200">
                           <div className="text-blue-600 text-xs">
                             <strong>Debug Info:</strong> Vehicle Registration: {jobData.vehicle_registration || 'N/A'}, VIN: {jobData.vin_numer || 'N/A'}
                           </div>
                           {jobData.temporary_registration && (
                             <div className="mt-1 text-blue-600 text-xs">
                               <strong>Temporary Registration:</strong> {jobData.temporary_registration}
                             </div>
                           )}
                         </div>
                       </div>

                                             {/* Editable fields */}
                       <div className="gap-4 grid grid-cols-2">
                         <div className="space-y-2">
                           <Label htmlFor="registration">Vehicle Registration *</Label>
                           <Input
                             id="registration"
                             value={vehicleData?.new_registration || jobData.vehicle_registration || jobData.temporary_registration || ''}
                             onChange={(e) => setVehicleData(prev => ({ ...prev, new_registration: e.target.value }))}
                             placeholder="Vehicle registration"
                             required
                           />
                           {!vehicleData?.new_registration && !jobData.vehicle_registration && jobData.temporary_registration && (
                             <div className="mt-1 text-blue-600 text-xs">
                               Using temporary registration: {jobData.temporary_registration}
                             </div>
                           )}
                         </div>
                         <div className="space-y-2">
                           <Label htmlFor="productName">Product Name</Label>
                           <Input
                             id="productName"
                             value={vehicleData?.comment || jobData.job_description || jobData.job_type || ''}
                             onChange={(e) => setVehicleData(prev => ({ ...prev, comment: e.target.value }))}
                             placeholder="Product name (optional)"
                           />
                         </div>
                       </div>
                       
                       <div className="gap-4 grid grid-cols-2">
                         <div className="space-y-2">
                           <Label htmlFor="vin">VIN Number</Label>
                           <Input
                             id="vin"
                             value={vehicleData?.vin_number || jobData.vin_numer || ''}
                             onChange={(e) => setVehicleData(prev => ({ ...prev, vin_number: e.target.value }))}
                             placeholder="VIN number (optional)"
                           />
                         </div>
                         <div className="space-y-2">
                           <Label htmlFor="company">Company/Customer</Label>
                           <Input
                             id="company"
                             value={vehicleData?.company || jobData.customer_name || ''}
                             onChange={(e) => setVehicleData(prev => ({ ...prev, company: e.target.value }))}
                             placeholder="Company name"
                           />
                         </div>
                       </div>
                      
                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                        Add Vehicle & Take Photos
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Before Photos */}
          {currentStep === 'before-photos' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Capture Before Photos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                                 <div className="bg-green-50 p-4 rounded-lg">
                   <p className="mb-2 text-green-800">
                     Please capture photos of the vehicle/work area before starting the job.
                     You can take multiple photos as needed.
                   </p>
                   
                   {/* Mobile-specific instructions */}
                   <div className="bg-blue-50 p-3 border-blue-400 border-l-4 rounded">
                     <h5 className="mb-2 font-medium text-blue-900">📱 Mobile Camera Tips:</h5>
                     <ul className="space-y-1 text-blue-800 text-sm">
                       <li>• Hold device steady for clear photos</li>
                       <li>• Ensure good lighting for best results</li>
                       <li>• Use "Switch Camera" button to toggle between front/back cameras</li>
                       <li>• Allow camera permissions when prompted</li>
                     </ul>
                   </div>
                 </div>

                                 {/* Camera View */}
                 <div className="relative">
                   {streamRef.current ? (
                     <>
                       <video
                         ref={videoRef}
                         autoPlay
                         playsInline
                         muted
                         className="bg-gray-900 rounded-lg w-full h-64"
                       />
                       <canvas ref={canvasRef} className="hidden" />
                       
                       <div className="bottom-4 left-1/2 absolute flex flex-col space-y-2 -translate-x-1/2 transform">
                         <Button
                           onClick={capturePhoto}
                           disabled={isCapturing}
                           className="bg-blue-600 hover:bg-blue-700"
                         >
                           <Camera className="mr-2 w-4 h-4" />
                           Capture Photo
                         </Button>
                         
                         {/* Camera Toggle Button for Mobile */}
                         <Button
                           onClick={() => {
                             stopCamera();
                             setTimeout(() => startCamera(), 500);
                           }}
                           variant="outline"
                           size="sm"
                           className="bg-white/90 hover:bg-white text-gray-800"
                         >
                           <RefreshCw className="mr-2 w-4 h-4" />
                           Switch Camera
                         </Button>
                       </div>
                     </>
                   ) : (
                     <div className="flex flex-col justify-center items-center bg-gray-900 rounded-lg w-full h-64 text-white">
                       <Camera className="mb-4 w-16 h-16 text-gray-400" />
                       <p className="mb-4 text-center">Camera not accessible</p>
                       <div className="space-y-2">
                         <Button
                           onClick={startCamera}
                           className="bg-blue-600 hover:bg-blue-700"
                         >
                           <Camera className="mr-2 w-4 h-4" />
                           Start Camera
                         </Button>
                         <div className="text-gray-400 text-xs text-center">
                           <p>• Ensure camera permissions are enabled</p>
                           <p>• Try refreshing the page</p>
                           <p>• Check browser settings</p>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>

                {/* Captured Photos */}
                {beforePhotos.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Captured Photos ({beforePhotos.length})</h4>
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
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleBeforePhotosComplete}
                  disabled={beforePhotos.length === 0 || isSubmitting}
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                  Complete & Start Job
                </Button>
              </CardContent>
            </Card>
          )}

                     {/* Step 4: Complete */}
           {currentStep === 'complete' && (
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center space-x-2 text-green-600">
                   <CheckCircle className="w-5 h-5" />
                   <span>Job Started Successfully!</span>
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4 text-center">
                 <div className="flex justify-center items-center bg-green-100 mx-auto rounded-full w-16 h-16">
                   <CheckCircle className="w-8 h-8 text-green-600" />
                 </div>
                                  <div>
                   <h3 className="mb-2 font-medium text-gray-900 text-lg">
                     Job {jobData.job_number} is now active
                   </h3>
                   <p className="text-gray-600">
                     The job has been started and before photos have been captured.
                     You can now proceed with the work.
                   </p>
                 </div>
                 
                 <div className="bg-gray-50 p-4 rounded-lg">
                   <h4 className="mb-2 font-medium">Summary</h4>
                   <div className="space-y-1 text-gray-600 text-sm">
                     <div>• QR Code verified</div>
                     <div>• Vehicle details confirmed</div>
                     <div>• {beforePhotos.length} before photos captured</div>
                     <div>• Job status updated to Active</div>
                   </div>
                 </div>

                 <Button onClick={handleClose} className="w-full">
                   Close
                 </Button>
               </CardContent>
             </Card>
           )}

           {/* Step 5: End Job */}
           {currentStep === 'end-job' && (
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center space-x-2 text-red-600">
                   <CheckCircle className="w-5 h-5" />
                   <span>End Job: {jobData?.job_number}</span>
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4 text-center">
                 <div className="bg-yellow-50 p-4 rounded-lg">
                   <p className="text-yellow-800">
                     This job is currently active. To complete it, you need to take after photos.
                   </p>
                 </div>
                 
                 <div className="bg-blue-50 p-4 rounded-lg">
                   <h4 className="mb-2 font-medium text-blue-900">Job Details</h4>
                   <div className="gap-4 grid grid-cols-2 text-sm">
                     <div>
                       <span className="font-medium">Customer:</span> {jobData.customer_name || 'N/A'}
                     </div>
                     <div>
                       <span className="font-medium">Vehicle:</span> {jobData.vehicle_registration || jobData.temporary_registration || 'N/A'}
                     </div>
                     <div>
                       <span className="font-medium">Status:</span> 
                       <Badge variant="secondary" className="ml-2">
                         {jobData.status || jobData.job_status || 'Active'}
                       </Badge>
                     </div>
                     <div>
                       <span className="font-medium">Started:</span> {jobData.start_time ? new Date(jobData.start_time).toLocaleDateString() : 'N/A'}
                     </div>
                   </div>
                 </div>

                 <Button 
                   onClick={() => setShowEndJobModal(true)} 
                   className="bg-red-600 hover:bg-red-700 w-full"
                 >
                   <Camera className="mr-2 w-4 h-4" />
                   Take After Photos & Complete Job
                 </Button>

                 <Button onClick={handleClose} variant="outline" className="w-full">
                   Cancel
                 </Button>
               </CardContent>
             </Card>
           )}
                 </div>
       </div>

       {/* End Job Modal */}
       <EndJobModal
         isOpen={showEndJobModal}
         onClose={() => setShowEndJobModal(false)}
         job={jobData}
         onJobCompleted={handleJobCompleted}
       />
     </div>
   );
 }
