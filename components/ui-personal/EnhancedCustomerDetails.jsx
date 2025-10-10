"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Car, 
  Network, 
  Package,
  AlertTriangle,
  CheckCircle,
  Plus,
  X
} from "lucide-react";
import { toast } from "sonner";

export default function EnhancedCustomerDetails({ 
  formData, 
  setFormData, 
  accountInfo,
  onVehiclesSelected,
  isDeinstall = false
}) {
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [vehicleError, setVehicleError] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  // Fetch vehicles from vehicles_ip table when account info changes
  useEffect(() => {
    if (accountInfo?.new_account_number || accountInfo?.account_number) {
      fetchVehicles();
    }
  }, [accountInfo]);

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true);
      setVehicleError(null);
      
      const accountNumber = accountInfo?.new_account_number || accountInfo?.account_number;
      const response = await fetch(`/api/vehicles-by-company?accountNumber=${encodeURIComponent(accountNumber)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vehicles: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setVehicles(data.vehicles || []);
      } else {
        throw new Error(data.error || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      setVehicleError(error.message);
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleAddVehicle = () => {
    if (!selectedVehicleId) return;
    
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    // Check if vehicle is already selected
    if (selectedVehicles.find(v => v.id === selectedVehicleId)) {
      toast.error("Vehicle already selected");
      return;
    }

    setSelectedVehicles(prev => [...prev, vehicle]);
    setSelectedVehicleId(""); // Reset dropdown
  };

  const handleRemoveVehicle = (vehicleId) => {
    setSelectedVehicles(prev => prev.filter(v => v.id !== vehicleId));
  };

  // Update parent form when vehicles change
  useEffect(() => {
    if (onVehiclesSelected) {
      onVehiclesSelected(selectedVehicles);
    }
  }, [selectedVehicles, onVehiclesSelected]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Customer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Customer Information */}
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email Address *</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="customer@example.com"
              value={formData.customerEmail}
              onChange={(e) => {
                // Keep primary email in customerEmail field for backward compatibility
                setFormData({ ...formData, customerEmail: e.target.value });
                
                // Also update emailRecipients if customerEmail changes
                // Only add if email is not empty and not already in recipients
                if (e.target.value && !formData.emailRecipients?.some(r => r === e.target.value)) {
                  setFormData(prev => ({
                    ...prev,
                    emailRecipients: [e.target.value, ...(prev.emailRecipients || [])]
                  }));
                }
              }}
            />
          </div>
        </div>

        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number *</Label>
            <Input
              id="customerPhone"
              placeholder="Enter phone number"
              value={formData.customerPhone}
              onChange={(e) =>
                setFormData({ ...formData, customerPhone: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerAddress">Address</Label>
            <Input
              id="customerAddress"
              placeholder="Enter customer address"
              value={formData.customerAddress}
              onChange={(e) =>
                setFormData({ ...formData, customerAddress: e.target.value })
              }
            />
          </div>
        </div>

        {/* Vehicle Selection Section - Only show if not de-install */}
        {!isDeinstall && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                <Label className="font-medium text-lg">Vehicle & Product Selection</Label>
              </div>
              
              {loadingVehicles ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="border-b-2 border-blue-600 rounded-full w-4 h-4 animate-spin"></div>
                  Loading vehicles...
                </div>
              ) : vehicleError ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  {vehicleError}
                </div>
              ) : vehicles.length === 0 ? (
                <div className="py-4 text-gray-500 text-center">
                  No vehicles found for this account
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Vehicles</Label>
                    <div className="gap-3 grid grid-cols-1 md:grid-cols-2 p-3 border rounded-lg max-h-60 overflow-y-auto">
                      {vehicles.map((vehicle) => {
                        const isSelected = selectedVehicles.find(v => v.id === vehicle.id);
                        return (
                          <div
                            key={vehicle.id}
                            className={`p-2 border rounded cursor-pointer transition-colors ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                handleRemoveVehicle(vehicle.id);
                              } else {
                                setSelectedVehicles(prev => [...prev, vehicle]);
                              }
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}} // Handled by onClick
                                    className="text-blue-600"
                                  />
                                  <span className="font-medium text-sm">
                                    {vehicle.group_name || 'Unknown Vehicle'}
                                    {vehicle.ip_address && ` (${vehicle.ip_address})`}
                                  </span>
                                </div>
                              </div>
                              
                              {isSelected && (
                                <CheckCircle className="flex-shrink-0 w-4 h-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Vehicles Summary */}
                  {selectedVehicles.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="mb-2 font-medium text-blue-900">
                        Selected Vehicles ({selectedVehicles.length})
                      </h4>
                      <div className="space-y-1">
                        {selectedVehicles.map((vehicle) => (
                          <div key={vehicle.id} className="flex justify-between items-center text-sm">
                            <span className="text-blue-800">
                              {vehicle.group_name || 'Unknown Vehicle'}
                              {vehicle.ip_address && ` (${vehicle.ip_address})`}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveVehicle(vehicle.id)}
                              className="px-2 h-5 text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* De-installation Vehicle Selection */}
        {isDeinstall && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                <Label className="font-medium text-lg">Vehicle Selection for De-installation</Label>
              </div>
              
              {loadingVehicles ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="border-b-2 border-blue-600 rounded-full w-4 h-4 animate-spin"></div>
                  Loading vehicles...
                </div>
              ) : vehicleError ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  {vehicleError}
                </div>
              ) : vehicles.length === 0 ? (
                <div className="py-4 text-gray-500 text-center">
                  No vehicles found for this account
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Vehicle Dropdown Selection */}
                  <div className="space-y-2">
                    <Label>Add Vehicle</Label>
                    <div className="flex gap-2">
                      <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a vehicle to add" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.group_name || 'Unknown Vehicle'} ({vehicle.ip_address || 'No IP'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={handleAddVehicle}
                        disabled={!selectedVehicleId}
                        size="sm"
                        className="px-3"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Selected Vehicles List */}
                  {selectedVehicles.length > 0 && (
                    <div className="space-y-2">
                      <Label>Selected Vehicles ({selectedVehicles.length})</Label>
                      <div className="space-y-1 p-2 border rounded-lg max-h-40 overflow-y-auto">
                        {selectedVehicles.map((vehicle) => (
                          <div key={vehicle.id} className="flex justify-between items-center bg-gray-50 px-3 py-1.5 border rounded text-sm">
                            <span className="font-medium text-gray-900">
                              {vehicle.group_name || 'Unknown Vehicle'}
                              {vehicle.ip_address && ` (${vehicle.ip_address})`}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveVehicle(vehicle.id)}
                              className="px-2 h-5 text-red-600 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
