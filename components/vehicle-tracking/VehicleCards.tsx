"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Car, Target, Wifi, Hash, Search, X } from 'lucide-react';
import VehicleDetailsModal from './VehicleDetailsModal';
import { Vehicle } from '@/lib/actions/vehicles';

interface VehicleCardsProps {
  vehicles: Vehicle[];
  selectedVehicle?: Vehicle | null;
  onVehicleSelect?: (vehicle: Vehicle) => void;
  accountNumber?: string;
}

export default function VehicleCards({ vehicles, selectedVehicle, onVehicleSelect, accountNumber }: VehicleCardsProps) {
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedVehicleForTracking, setSelectedVehicleForTracking] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const getVehicleDisplayName = (vehicle: Vehicle) => {
    return vehicle.fleet_number || vehicle.reg || `Vehicle ${vehicle.id}`;
  };

  if (vehicles.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Car className="mx-auto mb-4 w-12 h-12 text-gray-300" />
            <h3 className="mb-2 font-medium text-gray-900 text-lg">No Vehicles Found</h3>
            <p className="text-gray-500">This account has no active vehicles.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredVehicles = vehicles.filter(vehicle => {
    if (!searchTerm) return true;
    const registration = (vehicle.reg || vehicle.fleet_number || '').toLowerCase();
    return registration.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Vehicle Fleet</h2>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by registration..."
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
          <Badge variant="outline">{filteredVehicles.length} vehicles</Badge>
        </div>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader className="bg-white">
            <TableRow>
              <TableHead>Fleet Number</TableHead>
              <TableHead>Registration</TableHead>
              <TableHead>Make</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.map((vehicle, index) => {
              const isSelected = selectedVehicle?.id === vehicle.id;
              const isEven = index % 2 === 0;
              return (
                <TableRow 
                  key={vehicle.id} 
                  className={`cursor-pointer ${
                    isSelected ? 'bg-blue-50' : isEven ? 'bg-gray-50' : 'bg-white'
                  } hover:bg-gray-100`}
                  onClick={() => onVehicleSelect?.(vehicle)}
                >
                  <TableCell className="font-medium">
                    {vehicle.fleet_number || 'N/A'}
                  </TableCell>
                  <TableCell>{vehicle.reg || 'No Registration'}</TableCell>
                  <TableCell>{vehicle.make || 'N/A'}</TableCell>
                  <TableCell>{vehicle.model || 'N/A'}</TableCell>
                  <TableCell>{vehicle.year || 'N/A'}</TableCell>
                  <TableCell>{vehicle.colour || 'N/A'}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVehicleForTracking(vehicle);
                        setTrackingModalOpen(true);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Vehicle Details Modal */}
      {trackingModalOpen && accountNumber && selectedVehicleForTracking && (
        <VehicleDetailsModal
          isOpen={trackingModalOpen}
          onClose={() => setTrackingModalOpen(false)}
          vehicle={selectedVehicleForTracking}
          accountNumber={accountNumber}
        />
      )}
    </div>
  );
} 