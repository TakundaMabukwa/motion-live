'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, X, CheckCircle, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface EndJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  onJobCompleted: (jobData: any) => void;
}

export default function EndJobModal({ isOpen, onClose, job, onJobCompleted }: EndJobModalProps) {
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobData, setJobData] = useState<any>(job);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      checkCameraPermissions().then(() => {
        startCamera();
      });
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const checkCameraPermissions = async () => {
    try {
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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported on this device/browser');
        return;
      }

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 320, max: 1920 },
          height: { ideal: 720, min: 240, max: 1080 },
          aspectRatio: { ideal: 16/9, min: 1, max: 2 }
        }
      };

      let stream;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Environment camera started successfully');
      } catch (envError) {
        console.log('Environment camera failed, trying user camera:', envError);
        
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
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error);
          }
        };

        videoRef.current.onerror = (error) => {
          console.error('Video error:', error);
          toast.error('Video playback error. Please try again.');
        };

        toast.success('Camera started successfully!');
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      
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
        setAfterPhotos(prev => [...prev, photoData]);
        toast.success('Photo captured!');
      }
    }
  };

  const removePhoto = (index: number) => {
    setAfterPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleEndJob = async () => {
    if (afterPhotos.length === 0) {
      toast.error('Please capture at least one after photo');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photos to storage and get URLs
      const supabase = createClient();
      const photoUrls: string[] = [];

      for (const photoData of afterPhotos) {
        const response = await fetch(photoData);
        const blob = await response.blob();
        
        const filename = `after_photos/${jobData.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        
        const { data, error } = await supabase.storage
          .from('invoices')
          .upload(filename, blob);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(filename);

        photoUrls.push(urlData.publicUrl);
      }

      // Update job with after photos and change status to complete
      const updateResponse = await fetch(`/api/job-cards/${jobData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          after_photos: photoUrls,
          status: 'Completed',
          job_status: 'Completed',
          completion_date: new Date().toISOString(),
        }),
      });

      if (updateResponse.ok) {
        toast.success('Job completed successfully!');
        onJobCompleted({ ...jobData, after_photos: photoUrls, status: 'Completed' });
        handleClose();
      } else {
        throw new Error('Failed to complete job');
      }
    } catch (error) {
      console.error('Error completing job:', error);
      toast.error('Failed to complete job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAfterPhotos([]);
    setJobData(job);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/50 p-4">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-xl">End Job: {jobData?.job_number || 'Unknown Job'}</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
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
                  Please capture photos of the vehicle/work area after completing the job.
                  You can take multiple photos as needed.
                </p>
                
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
              {afterPhotos.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Captured Photos ({afterPhotos.length})</h4>
                  <div className="gap-4 grid grid-cols-3">
                    {afterPhotos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`After photo ${index + 1}`}
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
                onClick={handleEndJob}
                disabled={afterPhotos.length === 0 || isSubmitting}
                className="bg-green-600 hover:bg-green-700 w-full"
              >
                {isSubmitting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                Complete Job
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
