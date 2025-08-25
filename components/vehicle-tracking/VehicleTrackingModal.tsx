"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Car, 
  MapPin, 
  Clock, 
  Gauge, 
  Navigation, 
  Building,
  Wifi,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface VehicleIPData {
  id: number;
  new_registration: string;
  new_account_number: string;
  ip_address: string;
  vin_number: string | null;
  company: string;
  products: string[] | null;
  active: boolean;
  comment: string | null;
  group_name: string | null;
  beame_1: string | null;
  beame_2: string | null;
  beame_3: string | null;
  created_at: string;
  updated_at: string;
}

interface VehicleTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehiclePlate: string;
  accountNumber: string;
  vehicleIP: string;
}

export default function VehicleTrackingModal({ 
  isOpen, 
  onClose, 
  vehiclePlate, 
  accountNumber,
  vehicleIP
}: VehicleTrackingModalProps) {
  const [vehicleData, setVehicleData] = useState<VehicleIPData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    new_registration: '',
    new_account_number: '',
    ip_address: '',
    vin_number: '',
    company: '',
    products: '',
    active: true,
    comment: '',
    group_name: '',
    beame_1: '',
    beame_2: '',
    beame_3: ''
  });

  useEffect(() => {
    if (isOpen && vehiclePlate) {
      // Auto-fill IP address from the card
      if (vehicleIP) {
        setFormData(prev => ({
          ...prev,
          ip_address: vehicleIP
        }));
      }
      fetchVehicleData();
    }
  }, [isOpen, vehiclePlate, vehicleIP]);

  const fetchVehicleData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/vehicles-ip?registration=${encodeURIComponent(vehiclePlate)}&accountNumber=${encodeURIComponent(accountNumber)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vehicle data');
      }
      const data = await response.json();
      
      if (data.vehicles && data.vehicles.length > 0) {
        const vehicle = data.vehicles[0];
        setVehicleData(vehicle);
                 // Auto-fill form data, but preserve the IP address from the card if no existing IP
         setFormData({
           new_registration: vehicle.new_registration || '',
           new_account_number: vehicle.new_account_number || '',
           ip_address: vehicle.ip_address || vehicleIP || '',
           vin_number: vehicle.vin_number || '',
           company: vehicle.company || '',
           products: Array.isArray(vehicle.products) ? vehicle.products.join(', ') : vehicle.products || '',
           active: vehicle.active,
           comment: vehicle.comment || '',
           group_name: vehicle.group_name || '',
           beame_1: vehicle.beame_1 || '',
           beame_2: vehicle.beame_2 || '',
           beame_3: vehicle.beame_3 || ''
         });
      } else {
                 // No existing data, create new entry
         setVehicleData(null);
         setFormData({
           new_registration: vehiclePlate,
           new_account_number: accountNumber,
           ip_address: vehicleIP || '',
           vin_number: '',
           company: accountNumber,
           products: '',
           active: true,
           comment: '',
           group_name: vehiclePlate,
           beame_1: '',
           beame_2: '',
           beame_3: ''
         });
      }
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
      toast.error('Failed to load vehicle data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        products: formData.products ? formData.products.split(',').map(p => p.trim()) : []
      };

      const response = await fetch('/api/vehicles-ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save vehicle data');
      }

      const result = await response.json();
      toast.success('Vehicle data saved successfully!');
      setEditing(false);
      fetchVehicleData(); // Refresh data
    } catch (error) {
      console.error('Error saving vehicle data:', error);
      toast.error(error.message || 'Failed to save vehicle data');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
      <div className="bg-white shadow-xl m-4 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            <Car className="w-6 h-6 text-blue-600" />
            <div>
                             <CardTitle className="text-xl">Vehicle Details</CardTitle>
              <p className="text-gray-600 text-sm">Plate: {vehiclePlate} | Account: {accountNumber}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-2">Loading vehicle data...</span>
            </div>
          ) : (
            <>
              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                <Badge variant={vehicleData?.active ? "default" : "secondary"}>
                  {vehicleData?.active ? "Active" : "Inactive"}
                </Badge>
                {vehicleData ? (
                  <Badge variant="outline">Existing Vehicle</Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-600">New Vehicle</Badge>
                )}
              </div>

              {/* Vehicle Information Form */}
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new_registration">Registration Number</Label>
                  <Input
                    id="new_registration"
                    value={formData.new_registration}
                    onChange={(e) => handleInputChange('new_registration', e.target.value)}
                    disabled={!editing}
                    placeholder="Vehicle registration"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_account_number">Account Number</Label>
                  <Input
                    id="new_account_number"
                    value={formData.new_account_number}
                    onChange={(e) => handleInputChange('new_account_number', e.target.value)}
                    disabled={!editing}
                    placeholder="Account number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ip_address">IP Address *</Label>
                  <Input
                    id="ip_address"
                    value={formData.ip_address}
                    onChange={(e) => handleInputChange('ip_address', e.target.value)}
                    disabled={!editing}
                    placeholder="192.168.1.100"
                    className={!formData.ip_address ? 'border-red-300' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vin_number">VIN Number</Label>
                  <Input
                    id="vin_number"
                    value={formData.vin_number}
                    onChange={(e) => handleInputChange('vin_number', e.target.value)}
                    disabled={!editing}
                    placeholder="Vehicle identification number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    disabled={!editing}
                    placeholder="Company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group_name">Group Name</Label>
                  <Input
                    id="group_name"
                    value={formData.group_name}
                    onChange={(e) => handleInputChange('group_name', e.target.value)}
                    disabled={!editing}
                    placeholder="Group identifier"
                  />
                </div>
              </div>

              {/* Beame Fields */}
              <div className="space-y-4">
                <Label className="font-medium text-sm">Beame Device Information</Label>
                <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="beame_1">Beame 1</Label>
                    <Input
                      id="beame_1"
                      value={formData.beame_1}
                      onChange={(e) => handleInputChange('beame_1', e.target.value)}
                      disabled={!editing}
                      placeholder="Beame device 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="beame_2">Beame 2</Label>
                    <Input
                      id="beame_2"
                      value={formData.beame_2}
                      onChange={(e) => handleInputChange('beame_2', e.target.value)}
                      disabled={!editing}
                      placeholder="Beame device 2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="beame_3">Beame 3</Label>
                    <Input
                      id="beame_3"
                      value={formData.beame_3}
                      onChange={(e) => handleInputChange('beame_3', e.target.value)}
                      disabled={!editing}
                      placeholder="Beame device 3"
                    />
                  </div>
                </div>
              </div>

              {/* Products and Comment */}
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="products">Products (comma-separated)</Label>
                  <Input
                    id="products"
                    value={formData.products}
                    onChange={(e) => handleInputChange('products', e.target.value)}
                    disabled={!editing}
                    placeholder="Product 1, Product 2, Product 3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="active">Status</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => handleInputChange('active', e.target.checked)}
                      disabled={!editing}
                      className="rounded w-4 h-4 text-blue-600"
                    />
                    <Label htmlFor="active" className="text-sm">Active Vehicle</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => handleInputChange('comment', e.target.value)}
                  disabled={!editing}
                  placeholder="Additional notes about this vehicle"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                {editing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        fetchVehicleData(); // Reset form data
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={loading || !formData.ip_address}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={onClose}>
                      Close
                    </Button>
                    <Button
                      onClick={() => setEditing(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Edit Vehicle
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </div>
    </div>
  );
}
