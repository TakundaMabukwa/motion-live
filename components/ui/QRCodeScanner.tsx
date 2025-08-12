import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle,
  Car,
  User,
  MapPin,
  Package
} from 'lucide-react';

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onJobVerified: (jobData: any) => void;
  expectedJobNumber?: string;
}

export function QRCodeScanner({ isOpen, onClose, onJobVerified, expectedJobNumber }: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [manualInput, setManualInput] = useState('');
  const [scanMode, setScanMode] = useState<'scan' | 'manual'>('scan');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen && scanMode === 'scan') {
      startCamera();
    } else if (streamRef.current) {
      stopCamera();
    }
  }, [isOpen, scanMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please use manual input.');
      setScanMode('manual');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) {
      setError('Please enter a job number');
      return;
    }

    // Simulate QR code scan with manual input
    processScannedData(manualInput);
  };

  const processScannedData = (data: string) => {
    try {
      // Try to parse as JSON first (in case QR contains structured data)
      let jobData;
      try {
        jobData = JSON.parse(data);
      } catch {
        // If not JSON, treat as plain job number
        jobData = { job_number: data.trim() };
      }

      // Validate job number
      if (!jobData.job_number) {
        setError('Invalid QR code: No job number found');
        return;
      }

      // Check if job number matches expected job
      if (expectedJobNumber && jobData.job_number !== expectedJobNumber) {
        setError(`Job number mismatch. Expected: ${expectedJobNumber}, Got: ${jobData.job_number}`);
        return;
      }

      setSuccess('Job verified successfully!');
      setScannedData(data);
      
      // Wait a moment to show success message, then proceed
      setTimeout(() => {
        onJobVerified(jobData);
        onClose();
      }, 1500);

    } catch (err) {
      setError('Invalid QR code data');
    }
  };

  const handleClose = () => {
    stopCamera();
    setScannedData('');
    setManualInput('');
    setError('');
    setSuccess('');
    setScanMode('scan');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Scan Job QR Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'scan' ? 'default' : 'outline'}
              onClick={() => setScanMode('scan')}
              className="flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Camera Scan
            </Button>
            <Button
              variant={scanMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setScanMode('manual')}
              className="flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Manual Input
            </Button>
          </div>

          {/* Camera Scanner */}
          {scanMode === 'scan' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Camera className="w-4 h-4" />
                  Camera Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover"
                  />
                  {scanning && (
                    <div className="absolute inset-0 flex justify-center items-center">
                      <div className="bg-blue-500/20 p-4 border-2 border-blue-500 rounded-lg">
                        <QrCode className="w-8 h-8 text-blue-500" />
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-sm text-center">
                  Position the QR code within the frame to scan
                </p>
              </CardContent>
            </Card>
          )}

          {/* Manual Input */}
          {scanMode === 'manual' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="w-4 h-4" />
                  Manual Job Number Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jobNumber">Job Number</Label>
                  <Input
                    id="jobNumber"
                    placeholder="Enter job number"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                  />
                </div>
                <Button 
                  onClick={handleManualSubmit}
                  className="w-full"
                  disabled={!manualInput.trim()}
                >
                  Verify Job
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Expected Job Info */}
          {expectedJobNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4" />
                  Expected Job
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Job #{expectedJobNumber}</Badge>
                  <span className="text-gray-600 text-sm">
                    Scan QR code or enter this job number
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 p-3 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 p-3 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700">{success}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}





