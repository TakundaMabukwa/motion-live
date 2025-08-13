import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  User, 
  MapPin, 
  Package,
  Building2,
  MessageSquare,
  Save
} from 'lucide-react';

interface VehicleDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleAdded: (vehicleData: any) => void;
  jobData?: any;
}

export function VehicleDetailsPopup({ isOpen, onClose, onVehicleAdded, jobData }: VehicleDetailsPopupProps) {
  const [vehicleData, setVehicleData] = useState({
    new_registration: '',
    vin_number: '',
    company: jobData?.customerName || '',
    new_account_number: jobData?.customerEmail || '',
    group_name: '',
    beame_1: '',
    beame_2: '',
    beame_3: '',
    ip_address: '',
    comment: '',
    products: [],
    active: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleInputChange = (field: string, value: string) => {
    setVehicleData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!vehicleData.new_registration.trim()) {
      setError('Registration number is required');
      return;
    }

    if (!vehicleData.vin_number.trim()) {
      setError('VIN number is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Add vehicle to vehicles_ip table
      const response = await fetch('/api/vehicles-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });

      if (!response.ok) {
        throw new Error('Failed to add vehicle');
      }

      const result = await response.json();
      
      // Call the callback with the new vehicle data
      onVehicleAdded({
        ...vehicleData,
        id: result.id
      });

      onClose();
    } catch (err) {
      setError('Failed to add vehicle. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVehicleData({
      new_registration: '',
      vin_number: '',
      company: jobData?.customerName || '',
      new_account_number: jobData?.customerEmail || '',
      group_name: '',
      beame_1: '',
      beame_2: '',
      beame_3: '',
      ip_address: '',
      comment: '',
      products: [],
      active: true
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Add Vehicle Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Job Information */}
          {jobData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4" />
                  Job Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gap-4 grid grid-cols-2 text-sm">
                  <div>
                    <span className="font-medium">Customer:</span> {jobData.customerName}
                  </div>
                  <div>
                    <span className="font-medium">Account:</span> {jobData.customerEmail}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vehicle Details Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="w-4 h-4" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="registration">Registration Number *</Label>
                  <Input
                    id="registration"
                    placeholder="Enter registration number"
                    value={vehicleData.new_registration}
                    onChange={(e) => handleInputChange('new_registration', e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vin">VIN Number *</Label>
                  <Input
                    id="vin"
                    placeholder="Enter VIN number"
                    value={vehicleData.vin_number}
                    onChange={(e) => handleInputChange('vin_number', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Enter company name"
                    value={vehicleData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account">Account Number</Label>
                  <Input
                    id="account"
                    placeholder="Enter account number"
                    value={vehicleData.new_account_number}
                    onChange={(e) => handleInputChange('new_account_number', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group">Group Name</Label>
                  <Input
                    id="group"
                    placeholder="Enter group name"
                    value={vehicleData.group_name}
                    onChange={(e) => handleInputChange('group_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beame1">Beame 1</Label>
                  <Input
                    id="beame1"
                    placeholder="Enter beame 1"
                    value={vehicleData.beame_1}
                    onChange={(e) => handleInputChange('beame_1', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beame2">Beame 2</Label>
                  <Input
                    id="beame2"
                    placeholder="Enter beame 2"
                    value={vehicleData.beame_2}
                    onChange={(e) => handleInputChange('beame_2', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beame3">Beame 3</Label>
                  <Input
                    id="beame3"
                    placeholder="Enter beame 3"
                    value={vehicleData.beame_3}
                    onChange={(e) => handleInputChange('beame_3', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ip">IP Address</Label>
                  <Input
                    id="ip"
                    placeholder="Enter IP address"
                    value={vehicleData.ip_address}
                    onChange={(e) => handleInputChange('ip_address', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Input
                  id="comment"
                  placeholder="Enter any additional comments"
                  value={vehicleData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={vehicleData.active}
                  onChange={(e) => handleInputChange('active', e.target.checked.toString())}
                  className="border-gray-300 rounded"
                />
                <Label htmlFor="active">Vehicle is active</Label>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 p-3 border border-red-200 rounded-lg">
              <MessageSquare className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !vehicleData.new_registration.trim() || !vehicleData.vin_number.trim()}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Adding...' : 'Add Vehicle'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}









