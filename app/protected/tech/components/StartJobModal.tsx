'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  X,
  CheckCircle,
  QrCode,
  Trash2,
  Loader2,
  Car,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { BrowserQRCodeReader } from '@zxing/library';

interface StartJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  userJobs: any[];
  onJobStarted: (jobData: any) => void;
  onJobCompleted?: (jobData: any) => void;
}

export default function StartJobModal({ isOpen, onClose, job, userJobs, onJobStarted, onJobCompleted }: StartJobModalProps) {
  const [currentStep, setCurrentStep] = useState<'qr-scan' | 'vehicle-details' | 'before-photos' | 'job-active' | 'after-photos' | 'complete'>('qr-scan');
  const [qrCode, setQrCode] = useState('');
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualJobId, setManualJobId] = useState('');
  const [jobData, setJobData] = useState<any>(job);
  const [maxPhotosReached, setMaxPhotosReached] = useState(false);
  const [maxAfterPhotosReached, setMaxAfterPhotosReached] = useState(false);
  const [qrReader, setQrReader] = useState<BrowserQRCodeReader | null>(null);
  const [isQrScanning, setIsQrScanning] = useState(false);
  const [qrStream, setQrStream] = useState<MediaStream | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false); // State to force re-render for video element
  
  // Vehicle details state
  const [vehicleDetails, setVehicleDetails] = useState({
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_registration: '',
    vin_numer: '',
    odormeter: '',
    ip_address: '',
  });

  // Get IP address when component mounts
  useEffect(() => {
    const getIPAddress = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setVehicleDetails(prev => ({ ...prev, ip_address: data.ip }));
      } catch (error) {
        console.log('Could not fetch IP address:', error);
        // Fallback: try to get from a different service
        try {
          const response = await fetch('https://api64.ipify.org?format=json');
          const data = await response.json();
          setVehicleDetails(prev => ({ ...prev, ip_address: data.ip }));
        } catch (fallbackError) {
          console.log('Could not fetch IP address from fallback service:', fallbackError);
        }
      }
    };
    
    getIPAddress();
  }, []);

  // Check if job is already active when modal opens
  useEffect(() => {
    if (isOpen && jobData) {
      console.log('Modal opened, jobData:', jobData);
      console.log('Job status:', jobData.status, 'Job status:', jobData.job_status);
      
      // Show toast with job information
      if (jobData.job_number) {
        toast.success(`Job loaded: ${jobData.job_number} - ${jobData.customer_name || 'Unknown Customer'}`);
      }
      
      if (jobData.status === 'Active' || jobData.job_status === 'Active') {
        console.log('Setting step to job-active');
        setCurrentStep('job-active');
      } else if (jobData.job_number && currentStep === 'qr-scan') {
        // If job is loaded and we're on QR scan step, move to vehicle details
        console.log('Job loaded, moving to vehicle-details');
        setCurrentStep('vehicle-details');
      }
    }
  }, [isOpen, jobData]);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Modal isOpen changed to:', isOpen);
      if (jobData) {
              if (jobData.status === 'Active' || jobData.job_status === 'Active') {
        setCurrentStep('job-active');
      } else {
        setCurrentStep('qr-scan');
      }
      }
    }
  }, [isOpen]);



  // Debug: Monitor step changes
  useEffect(() => {
    console.log('Current step changed to:', currentStep);
  }, [currentStep]);

  // Debug: Monitor modal open/close
  useEffect(() => {
    console.log('Modal isOpen changed to:', isOpen);
    console.log('Modal jobData:', jobData);
    console.log('Modal selectedJob:', job);
  }, [isOpen, jobData, job]);
  
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
      console.log('Starting camera...');
      
      // First check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported in this browser. Please use Chrome, Firefox, or Edge.');
        return;
      }

      // Try to get camera permissions first
      const permissions = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('Camera permissions granted');
      
      // Stop the test stream
      permissions.getTracks().forEach(track => track.stop());
      
      // Now start the actual camera with better constraints for PC
      const constraints = {
        video: {
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          facingMode: 'user', // Start with front camera (usually more accessible on PC)
          frameRate: { ideal: 30, min: 15, max: 60 }
        }
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Front camera started successfully');
      } catch (frontError) {
        console.log('Front camera failed, trying back camera:', frontError);
        
        // Try back camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          console.log('Back camera started successfully');
        } catch (backError) {
          console.log('Back camera failed, trying any available camera:', backError);
          
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
        console.log('Setting video srcObject and starting camera...');
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, starting playback...');
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('Video playback started successfully');
              toast.success('Camera started successfully!');
            }).catch((playError) => {
              console.error('Video play error:', playError);
              toast.error('Video playback failed. Please try again.');
            });
          }
        };

        // Handle video errors
        videoRef.current.onerror = (error) => {
          console.error('Video error:', error);
          toast.error('Video playback error. Please try again.');
        };

        // Force a re-render to show the video element
        setForceUpdate(prev => !prev);
      } else {
        console.error('Video ref or stream not available:', { 
          videoRef: !!videoRef.current, 
          stream: !!stream,
          videoRefCurrent: videoRef.current,
          streamDetails: stream ? `Stream with ${stream.getVideoTracks().length} tracks` : 'No stream'
        });
        
        // Since video element is always rendered, this shouldn't happen
        if (!videoRef.current) {
          console.error('Video ref still not available - this should not happen');
          console.log('Current step:', currentStep);
          console.log('Video element in DOM:', document.querySelector('video'));
          toast.error('Video element not ready. Please try again.');
        } else if (!stream) {
          toast.error('Camera stream failed to start. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      
      // Provide specific error messages for common PC issues
      if (error.name === 'NotAllowedError') {
        toast.error('Camera access denied. Please allow camera permissions in your browser and refresh the page.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device. Please connect a camera or use a device with a built-in camera.');
      } else if (error.name === 'NotSupportedError') {
        toast.error('Camera not supported on this device or browser. Please use Chrome, Firefox, or Edge.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera is in use by another application. Please close other camera apps (Zoom, Teams, etc.) and try again.');
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
    console.log('🔄 Stopping photo camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('✅ Photo camera track stopped:', track.kind);
      });
      streamRef.current = null;
    }
    console.log('✅ Photo camera fully stopped');
  };

  // Cleanup QR scanner when component unmounts
  useEffect(() => {
    return () => {
      stopQrScanner();
    };
  }, []);
  
  // Initialize QR scanner when modal opens
  useEffect(() => {
    if (isOpen && currentStep === 'qr-scan') {
      // Auto-start scanner on mobile and desktop
      const timer = setTimeout(() => {
        console.log('Auto-starting QR scanner...');
        startQrScanner();
      }, 500); // Longer delay for mobile
      
      return () => clearTimeout(timer);
    } else {
      stopQrScanner();
    }
    
    return () => {
      stopQrScanner();
    };
  }, [isOpen, currentStep]);
  
  // Camera cleanup when transitioning between steps
  useEffect(() => {
    if (currentStep === 'before-photos' || currentStep === 'after-photos') {
      // Ensure QR scanner is stopped when moving to photo capture steps
      stopQrScanner();
      
      // Start camera automatically since video element is always present
      const timer = setTimeout(() => {
        console.log(`Starting camera automatically for ${currentStep} step...`);
        startCamera();
      }, 300); // Small delay to ensure UI has updated
      
      return () => clearTimeout(timer);
    } else if (currentStep === 'qr-scan' || currentStep === 'job-active') {
      // Ensure photo camera is stopped when returning to QR scan or job active
      stopCamera();
    }
  }, [currentStep]);
  
  const startQrScanner = async () => {
    console.log('🎯 startQrScanner called');
    console.log('Current state:', { qrReader: !!qrReader, isQrScanning });
    
    if (qrReader || isQrScanning) {
      console.log('❌ Scanner already running, returning');
      return;
    }
    
    try {
      console.log('📱 Checking camera API availability...');
      
      // Check if camera API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('❌ Camera API not available');
        toast.error('Camera not supported on this device. Please use manual input.');
        return;
      }
      
      console.log('✅ Camera API available, requesting permissions...');

      // Request camera permission explicitly
      let stream;
      try {
        // Try back camera first (better for QR scanning)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
      } catch (backError) {
        console.log('Back camera failed, trying front camera:', backError);
        try {
          // Fallback to front camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'user',
              width: { ideal: 640 },
              height: { ideal: 480 }
            }
          });
        } catch (frontError) {
          console.log('Front camera failed, trying any camera:', frontError);
          // Last resort: any available camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
      }
      
      // Create new QR reader instance
      const reader = new BrowserQRCodeReader();
      setQrReader(reader);
      setQrStream(stream);
      setIsQrScanning(true);
      
      // Start scanning
      const deviceId = stream.getVideoTracks()[0].getSettings().deviceId;
      reader.decodeFromVideoDevice(
        deviceId ? deviceId : null,
        'qr-video',
        (result, error) => {
          if (result) {
            console.log('QR Code scanned:', result.getText());
            setQrCode(result.getText());
            setIsQrScanning(false);
            stopQrScanner();
            // Auto-verify the scanned QR code
            handleQrCodeSubmit();
          }
          if (error && error.name !== 'NotFoundException') {
            console.log('QR scan error:', error);
          }
        }
      );
      
      console.log('✅ QR scanner started successfully');
      toast.success('QR scanner started! Point camera at QR code.');
      
    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      
      // Provide specific error messages for mobile
      if (error.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found on this device.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera is in use by another app. Please close other camera apps.');
      } else {
        toast.error('Failed to start QR scanner. Please use manual input.');
      }
      
      setIsQrScanning(false);
    }
  };
  
  const stopQrScanner = () => {
    console.log('🔄 Stopping QR scanner...');
    if (qrReader) {
      try {
        qrReader.reset();
        setQrReader(null);
        console.log('✅ QR reader stopped');
      } catch (error) {
        console.error('❌ Error stopping QR reader:', error);
      }
    }
    
    if (qrStream) {
      qrStream.getTracks().forEach(track => {
        track.stop();
        console.log('✅ QR stream track stopped:', track.kind);
      });
      setQrStream(null);
    }
    
    setIsQrScanning(false);
    console.log('✅ QR scanner fully stopped');
  };

  const capturePhoto = () => {
    if (beforePhotos.length >= 30) {
      setMaxPhotosReached(true);
      toast.error('Maximum 30 photos allowed');
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

  const captureAfterPhoto = () => {
    if (afterPhotos.length >= 30) {
      setMaxAfterPhotosReached(true);
      toast.error('Maximum 30 after photos allowed');
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

  const removePhoto = (index: number) => {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index));
    setMaxPhotosReached(false);
  };

  const removeAfterPhoto = (index: number) => {
    setAfterPhotos(prev => prev.filter((_, i) => i !== index));
    setMaxAfterPhotosReached(false);
  };

  const handleQrCodeSubmit = async () => {
    if (!qrCode.trim()) {
      toast.error('Please enter a QR code');
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying QR code:', qrCode);
      
      // Try to parse the QR code as JSON
      let qrData;
      try {
        qrData = JSON.parse(qrCode);
        console.log('Parsed QR data:', qrData);
      } catch (parseError) {
        console.log('QR code is not JSON, treating as plain text');
        qrData = { job_number: qrCode };
      }
      
      // Check if the QR code contains a job_number or job_id
      if (!qrData.job_number && !qrData.job_id) {
        toast.error('Invalid QR code format. No job number or ID found.');
        return;
      }
      
      // Find matching job in userJobs by job_number
      const matchingJob = userJobs.find(job => 
        job.job_number === qrData.job_number || 
        job.job_number === qrData.job_id
      );
      
      if (matchingJob) {
        // Fetch full job details
        const fullJobData = await fetchFullJobDetails(matchingJob.id);
        
        // Update jobData with the full job details
        setJobData(fullJobData);
        
        // Pre-fill vehicle details if available in QR code
        if (qrData.vehicle_registration || qrData.vehicle_make || qrData.vehicle_model) {
          setVehicleDetails(prev => ({
            ...prev,
            vehicle_year: qrData.vehicle_year || prev.vehicle_year,
            vehicle_make: qrData.vehicle_make || prev.vehicle_make,
            vehicle_model: qrData.vehicle_model || prev.vehicle_model,
            vehicle_registration: qrData.vehicle_registration || prev.vehicle_registration,
            vin_numer: qrData.vin_numer || prev.vin_numer,
            odormeter: qrData.odormeter || prev.odormeter,
          }));
        }
        
        toast.success(`QR code verified! Job ${matchingJob.job_number} loaded successfully.`);
        console.log('QR verified, setting step to vehicle-details');
        
        // Stop QR scanner camera before transitioning
        stopQrScanner();
        
        setCurrentStep('vehicle-details');
      } else {
        toast.error(`Job ${qrData.job_number || qrData.job_id} not found.`);
      }
    } catch (error) {
      console.error('Error verifying QR code:', error);
      toast.error('Failed to verify QR code');
    } finally {
      setLoading(false);
    }
  };

  const fetchFullJobDetails = async (jobId: string) => {
    try {
      const response = await fetch(`/api/job-cards/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching full job details:', error);
      throw error;
    }
  };

  const fetchJobById = async (jobId: string) => {
    console.log('🔍 fetchJobById called with:', jobId);
    
    if (!jobId.trim()) {
      console.log('❌ Empty job ID');
      toast.error('Please enter a job ID');
      return;
    }

    setLoading(true);
    try {
      console.log('📋 Available jobs count:', userJobs.length);
      console.log('📋 Searching by job_number field');
      
      // Find matching job in userJobs by job_number
      const matchingJob = userJobs.find(job => {
        const matches = [
          job.job_number === jobId,
          job.job_number?.toLowerCase().includes(jobId.toLowerCase()),
          job.job_number?.includes(jobId)
        ];
        
        console.log(`🔍 Checking job:`, {
          job_number: job.job_number,
          customer: job.customer_name,
          searchTerm: jobId,
          exactMatch: job.job_number === jobId,
          partialMatch: job.job_number?.toLowerCase().includes(jobId.toLowerCase())
        });
        
        return matches.some(match => match);
      });
      
      if (matchingJob) {
        console.log('✅ Job found:', matchingJob);
        
        // Fetch full job details
        const fullJobData = await fetchFullJobDetails(matchingJob.id);
        setJobData(fullJobData);
        
        toast.success(`Job ${matchingJob.job_number} loaded successfully!`);
        
        stopQrScanner();
        setCurrentStep('vehicle-details');
      } else {
        console.log('❌ No matching job found for:', jobId);
        console.log('📋 Available job numbers:', userJobs.map(j => j.job_number));
        toast.error(`Job "${jobId}" not found (${userJobs.length} jobs available).`);
      }
    } catch (error) {
      console.error('💥 Error in fetchJobById:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCameraAccess = async () => {
    try {
      console.log('Testing camera access...');
      
      // Check if camera API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera API not supported in this browser');
        return false;
      }
      
      // Check available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoDevices);
      
      if (videoDevices.length === 0) {
        toast.error('No camera devices found');
        return false;
      }
      
      // Try to get permissions
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('Camera test successful');
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      toast.success(`Camera test successful! Found ${videoDevices.length} camera(s)`);
      return true;
      
    } catch (error) {
      console.error('Camera test failed:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Camera permission denied. Please allow camera access in your browser.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera found. Please connect a camera or check device settings.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera is in use by another app. Close Zoom, Teams, or other camera apps.');
          } else {
        toast.error(`Camera test failed: ${error.message}`);
      }
      
      return false;
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
        
        // Generate unique filename with job number
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const filename = `job_${jobData.job_number || jobData.id}_before_${timestamp}_${randomId}.jpg`;
        
        // Upload to invoices bucket in job-photos folder
        const { data, error } = await supabase.storage
          .from('invoices')
          .upload(`job-photos/${filename}`, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Error uploading photo:', error);
          toast.error(`Failed to upload photo ${photoUrls.length + 1}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(`job-photos/${filename}`);

        photoUrls.push(urlData.publicUrl);
      }

      if (photoUrls.length === 0) {
        throw new Error('Failed to upload any photos');
      }

       // Update job with before photos, vehicle details, and change status to active
       const updateResponse = await fetch(`/api/job-cards/${jobData.id}`, {
         method: 'PATCH',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           before_photos: photoUrls,
           job_status: 'Active',
           start_time: new Date().toISOString(),
           // Vehicle details
           vehicle_year: vehicleDetails.vehicle_year || null,
           vehicle_make: vehicleDetails.vehicle_make || null,
           vehicle_model: vehicleDetails.vehicle_model || null,
           vehicle_registration: vehicleDetails.vehicle_registration || null,
           vin_numer: vehicleDetails.vin_numer || null,
           odormeter: vehicleDetails.odormeter || null,
           ip_address: vehicleDetails.ip_address || null,
         }),
       });

      if (updateResponse.ok) {
        toast.success(`Job started successfully with ${photoUrls.length} before photos!`);
        // Move to job active step instead of after photos
        setCurrentStep('job-active');
      } else {
        const errorData = await updateResponse.json().catch(() => ({}));
        console.error('Failed to update job:', errorData);
        throw new Error(`Failed to update job: ${updateResponse.status}`);
      }
    } catch (error) {
      console.error('Error starting job:', error);
      toast.error(`Failed to start job: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAfterPhotosComplete = async () => {
    if (afterPhotos.length === 0) {
      toast.error('Please capture at least one after photo');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload after photos to storage and get URLs
      const supabase = createClient();
      const photoUrls: string[] = [];

      for (const photoData of afterPhotos) {
        // Convert base64 to blob
        const response = await fetch(photoData);
        const blob = await response.blob();
        
        // Generate unique filename with job number
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const filename = `job_${jobData.job_number || jobData.id}_after_${timestamp}_${randomId}.jpg`;
        
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
          toast.error(`Failed to upload after photo ${photoUrls.length + 1}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(`job-photos/${filename}`);

        photoUrls.push(urlData.publicUrl);
      }

      if (photoUrls.length === 0) {
        throw new Error('Failed to upload any after photos');
      }

      // Update job with after photos and change status to completed
      const updateResponse = await fetch(`/api/job-cards/${jobData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          after_photos: photoUrls,
          job_status: 'Completed',
          completion_date: new Date().toISOString(),
          end_time: new Date().toISOString(),
        }),
      });

      if (updateResponse.ok) {
        toast.success(`Job completed successfully with ${photoUrls.length} after photos!`);
        setCurrentStep('complete');
      } else {
        const errorData = await updateResponse.json().catch(() => ({}));
        console.error('Failed to complete job:', errorData);
        throw new Error(`Failed to complete job: ${updateResponse.status}`);
      }
    } catch (error) {
      console.error('Error completing job:', error);
      toast.error(`Failed to complete job: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJobCompleted = (completedJobData: any) => {
    if (onJobCompleted) {
      onJobCompleted(completedJobData);
    }
  };

  const handleClose = () => {
    // If we're on the complete step, notify parent that job was completed
    if (currentStep === 'complete') {
      onJobStarted({ ...jobData, before_photos: beforePhotos, after_photos: afterPhotos, job_status: 'Completed' });
    }
    
    // IMPORTANT: Stop all cameras before closing
    stopQrScanner();
    stopCamera();
    
    setCurrentStep('qr-scan');
    setQrCode('');
    setBeforePhotos([]);
    setAfterPhotos([]);
    setManualJobId('');
    setVehicleDetails({
      vehicle_year: '',
      vehicle_make: '',
      vehicle_model: '',
      vehicle_registration: '',
      vin_numer: '',
      odormeter: '',
      ip_address: '',
    });
    setJobData(job); // Reset to original job data
    onClose();
  };

  const startAfterPhotos = () => {
    console.log('Starting after photos step...');
    setCurrentStep('after-photos');
    
    // Start camera after a short delay to ensure UI has updated
    setTimeout(() => {
      console.log('Starting camera for after photos...');
      startCamera();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4"
      style={{ zIndex: 9999 }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
                 <div className="flex justify-between items-center p-3 sm:p-4 border-b">
           <h2 className="font-semibold text-lg sm:text-xl truncate pr-2">
             Start Job: {jobData?.job_number || 'Enter Job ID'}
           </h2>
           <button 
             onClick={(e) => {
               console.log('Close button clicked');
               e.preventDefault();
               e.stopPropagation();
               handleClose();
             }} 
             className="text-gray-500 hover:text-gray-700 flex-shrink-0"
             type="button"
           >
             <X className="w-5 h-5" />
           </button>
         </div>

        <div 
          className="p-3 sm:p-6" 
          key={currentStep}
          onClick={(e) => {
            console.log('Modal body clicked');
            e.stopPropagation();
          }}
        >
          {/* Debug info */}
          <div className="bg-gray-100 mb-4 p-2 rounded text-xs">
            <strong>Debug:</strong> Current step: {currentStep} | Job number: {jobData?.job_number}
            <br />
            <button 
              onClick={() => {
                console.log('🔥 TEST BUTTON CLICKED!');
                alert('Test button works!');
              }}
              className="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs"
            >
              TEST CLICK
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex justify-center space-x-1 sm:space-x-4 mb-4 sm:mb-6 overflow-x-auto">
            {[
              { key: 'qr-scan', label: 'Verify', icon: QrCode },
              { key: 'vehicle-details', label: 'Details', icon: Camera },
              { key: 'before-photos', label: 'Before', icon: Camera },
              { key: 'job-active', label: 'Active', icon: CheckCircle },
              { key: 'after-photos', label: 'After', icon: Camera },
              { key: 'complete', label: 'Done', icon: CheckCircle },
            ].map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = ['qr-scan', 'vehicle-details', 'before-photos', 'job-active', 'after-photos', 'complete'].indexOf(currentStep) > index;
              
              return (
                <div key={step.key} className="flex flex-col sm:flex-row items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-blue-600 text-white' :
                      isCompleted ? 'bg-green-500 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <span className="text-xs mt-1 text-center hidden sm:block">{step.label}</span>
                  </div>
                  {index < 5 && (
                    <div className={`w-6 sm:w-12 h-1 mx-1 sm:mx-2 ${
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
                  <span>Job Verification</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="mb-4 text-center">
                  <p className="text-gray-600">
                    Verify the job by scanning the QR code or entering the job ID manually
                  </p>
                </div>
                
                <div className="gap-4 sm:gap-6 grid grid-cols-1 lg:grid-cols-2">
                  {/* QR Scanner */}
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="font-medium text-sm sm:text-base">QR Code Scanner</Label>
                    <div className="border rounded-lg min-h-[300px] overflow-hidden">
                      <video
                        id="qr-video"
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-64 object-cover"
                        style={{ display: isQrScanning ? 'block' : 'none' }}
                      />
                      
                      {!isQrScanning && (
                        <div className="flex justify-center items-center bg-gray-50 h-64">
                          <div className="text-center">
                            <QrCode className="mx-auto mb-2 w-16 h-16 text-gray-400" />
                            <p className="text-gray-500 mb-2">Starting QR scanner...</p>
                            <div className="text-gray-400 text-xs">
                              <p>📱 Allow camera permissions when prompted</p>
                              <p>🔒 Ensure site has camera access in browser settings</p>
                            </div>
                            
                            <div className="space-y-2">
                              <button 
                                onClick={() => {
                                  console.log('🔥 Camera permission button clicked!');
                                  alert('Camera button clicked! Check console.');
                                  startQrScanner();
                                }}
                                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg w-full"
                              >
                                Request Camera Permission
                              </button>
                              
                              <button 
                                onClick={() => {
                                  console.log('🔥 Start scanner button clicked!');
                                  alert('Start scanner clicked!');
                                  startQrScanner();
                                }}
                                className="mt-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg w-full"
                              >
                                Start Scanner
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                   </div>
                    <p className="text-gray-500 text-sm text-center">
                      Position the QR code within the frame to scan
                    </p>
                    <div className="flex gap-2">
                      {isQrScanning && (
                        <Button 
                          onClick={stopQrScanner}
                          variant="outline"
                          className="flex-1"
                        >
                          Stop Scanner
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => {
                          stopQrScanner();
                          setTimeout(() => startQrScanner(), 500);
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Restart Scanner
                      </Button>
                    </div>
                 </div>

                  {/* Manual Input */}
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="font-medium text-sm sm:text-base">Manual Job Entry</Label>
                    <div className="space-y-3 sm:space-y-4">
                 <div className="space-y-2">
                        <Label htmlFor="manualJobId" className="text-sm">Job Number or Job ID</Label>
                   <Input
                     id="manualJobId"
                     value={manualJobId}
                     onChange={(e) => setManualJobId(e.target.value)}
                          placeholder="Enter job number..."
                          className="text-sm sm:text-lg"
                   />
                 </div>

                   <button 
                     onClick={() => {
                       console.log('🔥 Load Job button clicked!');
                       console.log('📝 Manual Job ID:', manualJobId);
                       
                       if (!manualJobId.trim()) {
                         alert('Please enter a job ID first!');
                         return;
                       }
                       
                       fetchJobById(manualJobId);
                     }}
                     className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm sm:text-base"
                   >
                        Load Job
                   </button>
                         </div>
                         </div>
                       </div>
                       
                {/* Current QR Code Display */}
                {qrCode && (
                  <div className="bg-blue-50 mt-4 p-3 border border-blue-200 rounded-lg">
                    <Label className="font-medium text-blue-800 text-sm">Scanned QR Code:</Label>
                    <div className="mt-1 text-blue-700 text-sm break-all">
                      {qrCode}
                         </div>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        onClick={handleQrCodeSubmit} 
                        disabled={loading || !qrCode.trim()}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {loading ? <Loader2 className="mr-2 w-3 h-3 animate-spin" /> : null}
                        Verify QR Code
                      </Button>
                      <Button 
                        onClick={() => setQrCode('')} 
                        variant="outline" 
                        size="sm"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}



          {/* Step 2: Vehicle Details */}
          {currentStep === 'vehicle-details' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Car className="w-5 h-5" />
                  <span>Enter Vehicle Details (Optional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="mb-2 text-blue-800">
                    Please enter the details of the vehicle and work area. All fields are optional.
                  </p>
                  <div className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleYear">Vehicle Year</Label>
                      <Input
                        id="vehicleYear"
                        value={vehicleDetails.vehicle_year}
                        onChange={(e) => setVehicleDetails(prev => ({ ...prev, vehicle_year: e.target.value }))}
                        placeholder="e.g., 2020"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleMake">Vehicle Make</Label>
                      <Input
                        id="vehicleMake"
                        value={vehicleDetails.vehicle_make}
                        onChange={(e) => setVehicleDetails(prev => ({ ...prev, vehicle_make: e.target.value }))}
                        placeholder="e.g., Toyota"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleModel">Vehicle Model</Label>
                      <Input
                        id="vehicleModel"
                        value={vehicleDetails.vehicle_model}
                        onChange={(e) => setVehicleDetails(prev => ({ ...prev, vehicle_model: e.target.value }))}
                        placeholder="e.g., Camry"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleRegistration">Vehicle Registration</Label>
                      <Input
                        id="vehicleRegistration"
                        value={vehicleDetails.vehicle_registration}
                        onChange={(e) => setVehicleDetails(prev => ({ ...prev, vehicle_registration: e.target.value }))}
                        placeholder="e.g., ABC123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vinNumber">VIN Number</Label>
                      <Input
                        id="vinNumber"
                        value={vehicleDetails.vin_numer}
                        onChange={(e) => setVehicleDetails(prev => ({ ...prev, vin_numer: e.target.value }))}
                        placeholder="e.g., 12345678901234567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="odometer">Odometer Reading</Label>
                      <Input
                        id="odometer"
                        value={vehicleDetails.odormeter}
                        onChange={(e) => setVehicleDetails(prev => ({ ...prev, odormeter: e.target.value }))}
                        placeholder="e.g., 123456"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setCurrentStep('before-photos')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
                  >
                    {loading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                    <span className="hidden sm:inline">Next: Capture Before Photos</span>
                    <span className="sm:hidden">Next: Before Photos</span>
                  </Button>
                  <Button
                    onClick={() => setCurrentStep('before-photos')}
                    variant="outline"
                    className="flex-1 text-sm sm:text-base"
                  >
                    Skip & Continue
                  </Button>
                </div>
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
                  {/* Debug Info */}
                  <div className="bg-gray-100 mb-2 p-2 rounded text-xs">
                    <strong>Camera Debug:</strong> 
                    Stream: {streamRef.current ? 'Active' : 'None'} | 
                    Video Ref: {videoRef.current ? 'Ready' : 'None'} | 
                    Force Update: {forceUpdate ? 'Yes' : 'No'}
                  </div>
                  
                  {/* Video Element - Always render this */}
                  <div className="bg-gray-900 rounded-lg w-full h-64 overflow-hidden">
                       <video
                         ref={videoRef}
                         autoPlay
                         playsInline
                         muted
                      className="w-full h-full object-cover"
                      style={{ display: streamRef.current ? 'block' : 'none' }}
                       />
                       <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Show placeholder when no stream */}
                    {!streamRef.current && (
                      <div className="flex flex-col justify-center items-center h-full text-white">
                        <Camera className="mb-4 w-16 h-16 text-gray-400" />
                        <p className="mb-4 text-center">Camera not accessible</p>
                        <div className="space-y-2">
                          <Button
                            onClick={startCamera}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Start Camera
                          </Button>
                          
                          <Button
                            onClick={testCameraAccess}
                            variant="outline"
                            className="bg-white/90 hover:bg-white text-gray-800"
                          >
                            Test Camera Access
                          </Button>
                          
                          <div className="text-gray-400 text-xs text-center">
                            <p>• Ensure camera permissions are enabled</p>
                            <p>• Try refreshing the page</p>
                            <p>• Check browser settings</p>
                            <p>• Close other camera apps (Zoom, Teams, etc.)</p>
                            <p>• Use Chrome, Firefox, or Edge browser</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Camera Controls - Only show when stream is active */}
                  {streamRef.current && (
                    <>
                      <div className="mt-4 text-gray-600 text-sm text-center">
                        Camera Status: Active | Stream: {streamRef.current.getVideoTracks().length} video track(s)
                      </div>
                       
                       <div className="bottom-4 left-1/2 absolute flex flex-col space-y-2 -translate-x-1/2 transform">
                         <div className="bg-black/50 text-white rounded-full px-3 py-1 mb-2 text-sm">
                           {beforePhotos.length}/30 Photos
                         </div>
                         <Button
                           onClick={capturePhoto}
                          disabled={maxPhotosReached}
                           className="bg-blue-600 hover:bg-blue-700"
                         >
                          {maxPhotosReached ? 'Max Photos (30)' : 'Capture Photo'}
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
                           Switch Camera
                         </Button>
                        
                        {/* Manual Refresh Button */}
                         <Button
                          onClick={() => {
                            console.log('Manual camera refresh requested');
                            stopCamera();
                            setTimeout(() => {
                              console.log('Restarting camera after manual refresh...');
                              startCamera();
                            }, 1000);
                          }}
                          variant="outline"
                          size="sm"
                          className="bg-white/90 hover:bg-white text-gray-800"
                        >
                          Refresh Camera
                         </Button>
                         </div>
                    </>
                   )}
                 </div>

                {/* Captured Photos */}
                {beforePhotos.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Captured Photos ({beforePhotos.length}/30)</h4>
                      {maxPhotosReached && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Max Photos Reached
                        </Badge>
                      )}
                    </div>
                    <div className="gap-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-h-[400px] overflow-y-auto p-2">
                      {beforePhotos.map((photo, index) => (
                        <div key={index} className="relative">
                          <div className="bg-gray-100 rounded-lg p-1">
                            <img
                              src={photo}
                              alt={`Before photo ${index + 1}`}
                              className="rounded-lg w-full h-24 object-cover"
                            />
                            <div className="absolute top-0 left-0 bg-black/60 text-white text-xs px-2 py-1 rounded-tl-lg rounded-br-lg">
                              #{index + 1}
                            </div>
                            <button
                              onClick={() => removePhoto(index)}
                              className="-top-2 -right-2 absolute bg-red-500 hover:bg-red-600 p-1 rounded-full text-white"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
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

          {/* Step 3: Job Active */}
          {currentStep === 'job-active' && (
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center space-x-2 text-green-600">
                   <CheckCircle className="w-5 h-5" />
                  <span>Job is Now Active</span>
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
                      <div>• Job verified</div>
                      <div>• {beforePhotos.length} before photos captured</div>
                      <div>• Job status updated to {jobData.job_status || 'Active'}</div>
                    </div>
                  </div>

                <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                  <h4 className="mb-2 font-medium text-blue-900">Next Step</h4>
                  <p className="mb-3 text-blue-800">
                    When you're ready to complete the job, click the button below to take after photos.
                  </p>
                  <Button 
                    onClick={startAfterPhotos}
                    className="bg-blue-600 hover:bg-blue-700 w-full"
                  >
                    Take After Photos
                  </Button>
                </div>

                <Button onClick={handleClose} variant="outline" className="w-full">
                  Close (Job will remain active)
                 </Button>
               </CardContent>
             </Card>
           )}

          {/* Step 4: After Photos */}
          {currentStep === 'after-photos' && (
             <Card>
               <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="w-5 h-5" />
                  <span>Capture After Photos</span>
                 </CardTitle>
               </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="mb-2 text-green-800">
                    Please capture photos of the completed work. These photos will be used to document the finished job.
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
                  {/* Debug Info */}
                  <div className="bg-gray-100 mb-2 p-2 rounded text-xs">
                    <strong>Camera Debug:</strong> 
                    Stream: {streamRef.current ? 'Active' : 'None'} | 
                    Video Ref: {videoRef.current ? 'Ready' : 'None'} | 
                    Force Update: {forceUpdate ? 'Yes' : 'No'}
                     </div>
                  
                  {/* Video Element - Always render this */}
                  <div className="bg-gray-900 rounded-lg w-full h-64 overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ display: streamRef.current ? 'block' : 'none' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Show placeholder when no stream */}
                    {!streamRef.current && (
                      <div className="flex flex-col justify-center items-center h-full text-white">
                        <Camera className="mb-4 w-16 h-16 text-gray-400" />
                        <p className="mb-4 text-center">Camera not accessible</p>
                        <div className="space-y-2">
                          <Button
                            onClick={startCamera}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Start Camera
                          </Button>
                          
                          <Button
                            onClick={testCameraAccess}
                            variant="outline"
                            className="bg-white/90 hover:bg-white text-gray-800"
                          >
                            Test Camera Access
                          </Button>
                          
                          <div className="text-gray-400 text-xs text-center">
                            <p>• Ensure camera permissions are enabled</p>
                            <p>• Try refreshing the page</p>
                            <p>• Check browser settings</p>
                            <p>• Close other camera apps (Zoom, Teams, etc.)</p>
                            <p>• Use Chrome, Firefox, or Edge browser</p>
                     </div>
                     </div>
                     </div>
                    )}
                   </div>
                  
                  {/* Camera Controls - Only show when stream is active */}
                  {streamRef.current && (
                    <>
                      <div className="mt-4 text-gray-600 text-sm text-center">
                        Camera Status: Active | Stream: {streamRef.current.getVideoTracks().length} video track(s)
                 </div>

                      <div className="bottom-4 left-1/2 absolute flex flex-col space-y-2 -translate-x-1/2 transform">
                         <div className="bg-black/50 text-white rounded-full px-3 py-1 mb-2 text-sm">
                           {afterPhotos.length}/30 Photos
                         </div>
                 <Button 
                          onClick={captureAfterPhoto}
                          disabled={maxAfterPhotosReached}
                          className="bg-blue-600 hover:bg-blue-700"
                 >
                          {maxAfterPhotosReached ? 'Max Photos (30)' : 'Capture After Photo'}
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
                          Switch Camera
                        </Button>
                        
                        {/* Manual Refresh Button */}
                        <Button
                          onClick={() => {
                            console.log('Manual camera refresh requested');
                            stopCamera();
                            setTimeout(() => {
                              console.log('Restarting camera after manual refresh...');
                              startCamera();
                            }, 1000);
                          }}
                          variant="outline"
                          size="sm"
                          className="bg-white/90 hover:bg-white text-gray-800"
                        >
                          Refresh Camera
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Captured After Photos */}
                {afterPhotos.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Captured After Photos ({afterPhotos.length}/30)</h4>
                      {maxAfterPhotosReached && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Max Photos Reached
                        </Badge>
                      )}
                    </div>
                    <div className="gap-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-h-[400px] overflow-y-auto p-2">
                      {afterPhotos.map((photo, index) => (
                        <div key={index} className="relative">
                          <div className="bg-gray-100 rounded-lg p-1">
                            <img
                              src={photo}
                              alt={`After photo ${index + 1}`}
                              className="rounded-lg w-full h-24 object-cover"
                            />
                            <div className="absolute top-0 left-0 bg-black/60 text-white text-xs px-2 py-1 rounded-tl-lg rounded-br-lg">
                              #{index + 1}
                            </div>
                            <button
                              onClick={() => removeAfterPhoto(index)}
                              className="-top-2 -right-2 absolute bg-red-500 hover:bg-red-600 p-1 rounded-full text-white"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleAfterPhotosComplete}
                  disabled={afterPhotos.length === 0 || isSubmitting}
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                  Complete Job
                 </Button>
               </CardContent>
             </Card>
           )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span>Job Completed Successfully!</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <div className="flex justify-center items-center bg-green-100 mx-auto rounded-full w-16 h-16">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                 </div>
                <div>
                  <h3 className="mb-2 font-medium text-gray-900 text-lg">
                    Job {jobData.job_number} has been completed
                  </h3>
                  <p className="text-gray-600">
                    The job has been completed with before and after photos captured.
                    Job status has been updated to Completed.
                  </p>
       </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="mb-2 font-medium">Summary</h4>
                  <div className="space-y-1 text-gray-600 text-sm">
                    <div>• Job verified</div>
                    <div>• {beforePhotos.length} before photos captured</div>
                    <div>• {afterPhotos.length} after photos captured</div>
                    <div>• Total photos: {beforePhotos.length + afterPhotos.length} (Maximum 60 allowed)</div>
                    <div>• Job status updated to {jobData.job_status || 'Completed'}</div>
                    <div>• Completion date recorded</div>
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
