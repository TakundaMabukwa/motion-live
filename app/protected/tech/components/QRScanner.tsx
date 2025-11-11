'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, X, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  expectedJobNumber?: string;
  onScanSuccess: (jobNumber: string, qrData: any) => void;
}

export default function QRScanner({ isOpen, onClose, expectedJobNumber, onScanSuccess }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [lastScannedData, setLastScannedData] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please use manual input.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const validateJobNumber = async (scannedData: string) => {
    try {
      // Parse QR code data (assuming it's JSON with job info)
      let qrData;
      try {
        qrData = JSON.parse(scannedData);
      } catch {
        // If not JSON, treat as plain job number
        qrData = { job_number: scannedData };
      }

      const jobNumber = qrData.job_number || scannedData;
      
      // If we have an expected job number, validate against it
      if (expectedJobNumber && jobNumber !== expectedJobNumber) {
        toast.error(`Wrong job! Expected: ${expectedJobNumber}, Scanned: ${jobNumber}`);
        return;
      }

      // Verify job exists in database
      const response = await fetch(`/api/job-cards/validate?job_number=${jobNumber}`);
      if (!response.ok) {
        toast.error('Job not found in system');
        return;
      }

      const jobData = await response.json();
      setLastScannedData({ ...qrData, ...jobData });
      
      toast.success(`Job ${jobNumber} validated successfully!`);
      onScanSuccess(jobNumber, { ...qrData, ...jobData });
      
    } catch (error) {
      console.error('Error validating job:', error);
      toast.error('Failed to validate job number');
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      toast.error('Please enter a job number');
      return;
    }
    validateJobNumber(manualInput.trim());
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setManualInput('');
      setLastScannedData(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Scan Job QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {expectedJobNumber && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                Expected Job: <Badge variant="outline">{expectedJobNumber}</Badge>
              </p>
            </div>
          )}

          {/* Camera View */}
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-gray-100 rounded-lg object-cover"
            />
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Camera not active</p>
                  <Button onClick={startCamera} size="sm" className="mt-2">
                    Start Camera
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Manual Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Or enter job number manually:
            </label>
            <div className="flex gap-2">
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter job number..."
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit} size="sm">
                Validate
              </Button>
            </div>
          </div>

          {/* Last Scanned Result */}
          {lastScannedData && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Job Validated</span>
              </div>
              <div className="text-sm text-green-700">
                <p>Job: {lastScannedData.job_number}</p>
                {lastScannedData.customer_name && (
                  <p>Customer: {lastScannedData.customer_name}</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}