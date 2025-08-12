'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Car, QrCode, Database, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import PhotoCaptureModal from './photo-capture-modal';

interface JobData {
  job_number: string;
  customer_name: string;
  customer_address: string;
  vehicle_registration?: string;
  job_type: string;
  job_description: string;
  ip_address?: string;
  assigned_parts: Array<{
    description: string;
    quantity: number;
    code: string;
    supplier: string;
    cost_per_unit: number;
    total_cost: number;
  }>;
  assigned_date: string;
  assigned_by: string;
  total_parts: number;
  total_cost: number;
}

interface VehicleData {
  id: number;
  products: string[];
  active: boolean;
  group_name?: string;
  new_registration?: string;
  beame_1?: string;
  beame_2?: string;
  beame_3?: string;
  ip_address?: string;
  new_account_number: string;
  vin_number?: string;
  company?: string;
  comment?: string;
}

interface VehicleVerificationFormProps {
  jobData: JobData;
  onVerificationComplete: (vehicleData: VehicleData) => void;
  onCancel: () => void;
}

export default function VehicleVerificationForm({ 
  jobData, 
  onVerificationComplete, 
  onCancel 
}: VehicleVerificationFormProps) {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [scanning, setScanning] = useState(false);
  const [vinNumber, setVinNumber] = useState('');
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [verifiedVehicleData, setVerifiedVehicleData] = useState<VehicleData | null>(null);

  // Manual form state
  const [manualForm, setManualForm] = useState({
    group_name: '',
    new_registration: '',
    beame_1: '',
    beame_2: '',
    beame_3: '',
    ip_address: jobData.ip_address || '',
    new_account_number: '',
    vin_number: '',
    company: '',
    comment: '',
    products: [] as string[],
    active: true
  });

  useEffect(() => {
    // Auto-determine mode based on job data
    if (!jobData.vehicle_registration) {
      setMode('manual');
    } else {
      setMode('scan');
    }
  }, [jobData]);

  const handleVINScan = async () => {
    if (!vinNumber.trim()) {
      toast.error('Please enter a VIN number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vehicles/search?vin=${encodeURIComponent(vinNumber.trim())}`);
      
      if (!response.ok) {
        throw new Error('Failed to search for vehicle');
      }

      const data = await response.json();
      
      if (data.vehicle) {
        setVehicleData(data.vehicle);
        toast.success('Vehicle found!');
      } else {
        setError('No vehicle found with this VIN number');
        toast.error('Vehicle not found');
      }
    } catch (error) {
      console.error('Error searching for vehicle:', error);
      setError('Failed to search for vehicle. Please try again.');
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    // Validate required fields
    if (!manualForm.new_registration || !manualForm.new_account_number) {
      toast.error('Please fill in all required fields');
      return;
    }

    const vehicleData: VehicleData = {
      id: Date.now(), // Temporary ID for new vehicle
      products: manualForm.products,
      active: manualForm.active,
      group_name: manualForm.group_name,
      new_registration: manualForm.new_registration,
      beame_1: manualForm.beame_1,
      beame_2: manualForm.beame_2,
      beame_3: manualForm.beame_3,
      ip_address: manualForm.ip_address,
      new_account_number: manualForm.new_account_number,
      vin_number: manualForm.vin_number,
      company: manualForm.company,
      comment: manualForm.comment
    };

    setVerifiedVehicleData(vehicleData);
    setShowPhotoCapture(true);
  };

  const handleUseScannedVehicle = () => {
    if (vehicleData) {
      setVerifiedVehicleData(vehicleData);
      setShowPhotoCapture(true);
    }
  };

  const handleCreateNewVehicle = () => {
    setMode('manual');
    setVehicleData(null);
    setError(null);
  };

  const handlePhotosSaved = async (photos: any[]) => {
    try {
      // Save photos to database and upload to storage
      const response = await fetch('/api/job-photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobNumber: jobData.job_number,
          vehicleRegistration: verifiedVehicleData?.new_registration,
          photos: photos,
          vehicleData: verifiedVehicleData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save photos');
      }

      const result = await response.json();
      console.log('Photos uploaded and saved:', result);
      
      if (verifiedVehicleData) {
        // Add photo data to vehicle data (now includes storage URLs)
        const vehicleDataWithPhotos = {
          ...verifiedVehicleData,
          beforePhotos: result.photos, // Use the uploaded photos with storage URLs
          beforePhotosCount: result.photos.length
        };
        
        onVerificationComplete(vehicleDataWithPhotos);
      }
    } catch (error) {
      console.error('Error saving photos:', error);
      toast.error('Failed to save photos. Please try again.');
    }
  };

  const handlePhotoCaptureClose = () => {
    setShowPhotoCapture(false);
    setVerifiedVehicleData(null);
  };

  return (
    <div className="space-y-6 mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="font-bold text-gray-900 text-2xl">Vehicle Verification</h1>
        <p className="text-gray-600">Verify vehicle details for job: {jobData.job_number}</p>
      </div>

      {/* Job Summary Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Job Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="gap-4 grid grid-cols-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Customer:</span>
              <span className="ml-2 text-gray-900">{jobData.customer_name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Job Type:</span>
              <Badge variant="outline" className="ml-2">{jobData.job_type}</Badge>
            </div>
            <div>
              <span className="font-medium text-gray-700">Parts Assigned:</span>
              <span className="ml-2 text-gray-900">{jobData.total_parts} parts</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Total Cost:</span>
              <span className="ml-2 text-gray-900">R {jobData.total_cost.toFixed(2)}</span>
            </div>
          </div>
          {jobData.vehicle_registration && (
            <div className="pt-2 border-t border-blue-200">
              <span className="font-medium text-gray-700">Vehicle Registration:</span>
              <Badge variant="secondary" className="ml-2">{jobData.vehicle_registration}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode Selection */}
      <div className="flex justify-center space-x-4">
        <Button
          variant={mode === 'scan' ? 'default' : 'outline'}
          onClick={() => setMode('scan')}
          className="flex items-center gap-2"
        >
          <QrCode className="w-4 h-4" />
          Scan VIN
        </Button>
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          onClick={() => setMode('manual')}
          className="flex items-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          Manual Entry
        </Button>
      </div>

      {/* Scan Mode */}
      {mode === 'scan' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Scan VIN Number
            </CardTitle>
            <CardDescription>
              Enter or scan the VIN number to fetch vehicle details from the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN Number</Label>
              <div className="flex gap-2">
                <Input
                  id="vin"
                  placeholder="Enter VIN number..."
                  value={vinNumber}
                  onChange={(e) => setVinNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVINScan()}
                />
                <Button 
                  onClick={handleVINScan} 
                  disabled={loading || !vinNumber.trim()}
                  className="flex items-center gap-2"
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 p-3 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {vehicleData && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Database className="w-5 h-5" />
                    Vehicle Found
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="gap-4 grid grid-cols-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Registration:</span>
                      <span className="ml-2 text-gray-900">{vehicleData.new_registration || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Company:</span>
                      <span className="ml-2 text-gray-900">{vehicleData.company || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Group:</span>
                      <span className="ml-2 text-gray-900">{vehicleData.group_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Account:</span>
                      <span className="ml-2 text-gray-900">{vehicleData.new_account_number}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleUseScannedVehicle}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Use This Vehicle
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCreateNewVehicle}
                    >
                      Create New Vehicle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Mode */}
      {mode === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Manual Vehicle Entry
            </CardTitle>
            <CardDescription>
              Enter vehicle details manually. Required fields are marked with *
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="gap-4 grid grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new_registration">Registration Number *</Label>
                <Input
                  id="new_registration"
                  placeholder="e.g., ABC123GP"
                  value={manualForm.new_registration}
                  onChange={(e) => setManualForm(prev => ({ ...prev, new_registration: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vin_number">VIN Number</Label>
                <Input
                  id="vin_number"
                  placeholder="17-digit VIN"
                  value={manualForm.vin_number}
                  onChange={(e) => setManualForm(prev => ({ ...prev, vin_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="gap-4 grid grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Company name"
                  value={manualForm.company}
                  onChange={(e) => setManualForm(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_account_number">Account Number *</Label>
                <Input
                  id="new_account_number"
                  placeholder="e.g., MACS-0001"
                  value={manualForm.new_account_number}
                  onChange={(e) => setManualForm(prev => ({ ...prev, new_account_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="gap-4 grid grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group_name">Group Name</Label>
                <Input
                  id="group_name"
                  placeholder="Group/Division name"
                  value={manualForm.group_name}
                  onChange={(e) => setManualForm(prev => ({ ...prev, group_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip_address">IP Address</Label>
                <Input
                  id="ip_address"
                  placeholder="IP address"
                  value={manualForm.ip_address}
                  onChange={(e) => setManualForm(prev => ({ ...prev, ip_address: e.target.value }))}
                />
              </div>
            </div>

            <div className="gap-4 grid grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="beame_1">Beame 1</Label>
                <Input
                  id="beame_1"
                  placeholder="Beame 1"
                  value={manualForm.beame_1}
                  onChange={(e) => setManualForm(prev => ({ ...prev, beame_1: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="beame_2">Beame 2</Label>
                <Input
                  id="beame_2"
                  placeholder="Beame 2"
                  value={manualForm.beame_2}
                  onChange={(e) => setManualForm(prev => ({ ...prev, beame_2: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="beame_3">Beame 3</Label>
                <Input
                  id="beame_3"
                  placeholder="Beame 3"
                  value={manualForm.beame_3}
                  onChange={(e) => setManualForm(prev => ({ ...prev, beame_3: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Additional notes..."
                value={manualForm.comment}
                onChange={(e) => setManualForm(prev => ({ ...prev, comment: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={manualForm.active}
                onChange={(e) => setManualForm(prev => ({ ...prev, active: e.target.checked }))}
                className="border-gray-300 rounded"
              />
              <Label htmlFor="active">Vehicle is active</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {mode === 'manual' && (
          <Button 
            onClick={handleManualSubmit}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Complete Verification
          </Button>
        )}
      </div>

      {/* Photo Capture Modal */}
      {verifiedVehicleData && (
        <PhotoCaptureModal
          isOpen={showPhotoCapture}
          onClose={handlePhotoCaptureClose}
          onPhotosSaved={handlePhotosSaved}
          jobNumber={jobData.job_number}
          vehicleRegistration={verifiedVehicleData.new_registration}
        />
      )}
    </div>
  );
}
