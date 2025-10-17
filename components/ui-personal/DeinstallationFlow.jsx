"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowLeft, Car, Plus, Search, X } from "lucide-react";

const DeinstallationFlow = ({ 
  deInstallData, 
  setDeInstallData, 
  fetchVehiclesFromIP, 
  toggleVehicleSelection, 
  addProduct,
  viewVehicleParts,
  backToVehicleSelection,
  selectedProducts
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  if (deInstallData.loadingVehicles) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
        <span className="text-gray-600">Loading vehicles...</span>
      </div>
    );
  }

  if (!deInstallData.availableVehicles || deInstallData.availableVehicles.length === 0) {
    return (
      <div className="py-8 text-center">
        <Car className="mx-auto mb-4 w-12 h-12 text-gray-400" />
        <h3 className="mb-2 font-medium text-gray-900 text-lg">No vehicles available</h3>
        <p className="text-gray-500">This customer has no vehicles assigned for de-installation.</p>
      </div>
    );
  }

  // Step 1: Vehicle Selection
  if (deInstallData.currentStep === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-3">
          <Label>Select Vehicle ({deInstallData.totalVehicles})</Label>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-8 h-8 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="max-h-80 overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate Number</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deInstallData.availableVehicles
                .filter(vehicle => {
                  if (!searchTerm) return true;
                  const plate = (vehicle.fleet_number || vehicle.reg || '').toLowerCase();
                  return plate.includes(searchTerm.toLowerCase());
                })
                .map((vehicle) => (
                  <TableRow key={vehicle.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {vehicle.fleet_number || vehicle.reg || 'Unknown Vehicle'}
                    </TableCell>
                    <TableCell>{vehicle.make || 'Unknown'}</TableCell>
                    <TableCell>{vehicle.model || ''}</TableCell>
                    <TableCell>{vehicle.year || 'N/A'}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => viewVehicleParts(vehicle.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        
        {/* All vehicles are now loaded by default for de-installation */}
      </div>
    );
  }
  
  // Step 2: Parts Selection for the selected vehicle
  if (deInstallData.currentStep === 1 && deInstallData.currentVehicleId) {
    const vehicle = deInstallData.availableVehicles.find(v => v.id === deInstallData.currentVehicleId);
    const vehicleProductsList = deInstallData.vehicleProducts[deInstallData.currentVehicleId] || [];
    const vehicleName = vehicle 
      ? `${vehicle.fleet_number || vehicle.reg || 'Unknown'}`
      : 'Unknown Vehicle';
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={backToVehicleSelection}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vehicles
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {deInstallData.selectedVehicles.includes(deInstallData.currentVehicleId) 
                ? 'Selected for de-installation' 
                : 'Not selected'}
            </Badge>
            <Button
              size="sm"
              variant={deInstallData.selectedVehicles.includes(deInstallData.currentVehicleId) ? 'outline' : 'default'}
              onClick={() => toggleVehicleSelection(deInstallData.currentVehicleId)}
            >
              {deInstallData.selectedVehicles.includes(deInstallData.currentVehicleId) ? 'Deselect' : 'Select for Quote'}
            </Button>
          </div>
        </div>
        
        {/* List of products/parts on this vehicle */}
        {vehicleProductsList.length > 0 ? (
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Installed Products on {vehicleName}:</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {vehicleProductsList.map((product) => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                return (
                  <div key={product.id} className={`flex justify-between items-start p-4 border rounded-lg ${isSelected ? 'bg-gray-200 opacity-50' : 'bg-gray-50'}`}>
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-gray-600 text-sm">{product.description}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">Code: {product.code}</Badge>
                        <Badge variant="outline" className="text-xs">Type: {product.type}</Badge>
                        <Badge variant="outline" className="text-xs">Category: {product.category}</Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => addProduct({
                        ...product,
                        vehicleId: deInstallData.currentVehicleId,
                        vehiclePlate: vehicle ? (vehicle.fleet_number || vehicle.reg || 'Unknown') : 'Unknown'
                      })}
                      disabled={isSelected}
                      className={isSelected ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}
                    >
                      {isSelected ? 'Added' : 'Add to Quote'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-yellow-500 w-5 h-5" />
              <div>
                <h4 className="font-medium text-yellow-800">No products found</h4>
                <p className="text-yellow-700 text-sm">This vehicle has no registered products. A default telematics unit will be added for de-installation.</p>
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={() => {
                  // Add a default product for de-installation
                  addProduct({
                    id: `default-${deInstallData.currentVehicleId}`,
                    name: "Telematics Unit",
                    description: "Default telematics unit for de-installation",
                    type: "FMS",
                    category: "HARDWARE",
                    installation_price: 0,
                    de_installation_price: 500,
                    price: 0,
                    rental: 0,
                    code: 'DEFAULT_TELEMATICS',
                    vehicleId: deInstallData.currentVehicleId,
                    vehiclePlate: vehicle ? (vehicle.fleet_number || vehicle.reg || 'Unknown') : 'Unknown'
                  });
                }}
              >
                Add Default Telematics Unit
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return null;
};

export default DeinstallationFlow;