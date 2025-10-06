"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Target, Wifi, Hash } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-xl">Vehicle Fleet</h2>
        <Badge variant="outline">{vehicles.length} vehicles</Badge>
      </div>
      
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => {
          const displayName = getVehicleDisplayName(vehicle);
          const isSelected = selectedVehicle?.id === vehicle.id;

          return (
            <Card 
              key={vehicle.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => onVehicleSelect?.(vehicle)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
                      <Car className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="font-semibold text-gray-900 text-lg">
                        {vehicle.reg || 'No Registration'}
                      </CardTitle>
                    </div>
                  </div>
                  <Badge variant="outline">
                    Vehicle
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Fleet Number and Registration prominently displayed */}
                <div className="space-y-2">
                  {vehicle.fleet_number && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Hash className="w-4 h-4 text-blue-600" />
                      <span><strong>Fleet #:</strong> {vehicle.fleet_number}</span>
                    </div>
                  )}
                  
                  {vehicle.reg && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Car className="w-4 h-4 text-green-600" />
                      <span><strong>Registration:</strong> {vehicle.reg}</span>
                    </div>
                  )}
                </div>

                {/* Additional vehicle details */}
                <div className="space-y-2">
                  {vehicle.make && vehicle.model && (
                    <div className="text-gray-600 text-sm">
                      <strong>Vehicle:</strong> {vehicle.make} {vehicle.model}
                    </div>
                  )}
                  
                  {vehicle.year && (
                    <div className="text-gray-600 text-sm">
                      <strong>Year:</strong> {vehicle.year}
                    </div>
                  )}
                  
                  {vehicle.colour && (
                    <div className="text-gray-600 text-sm">
                      <strong>Color:</strong> {vehicle.colour}
                    </div>
                  )}
                </div>
                
                <div className="pt-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-blue-50 hover:bg-blue-100 border-blue-200 w-full text-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVehicleForTracking(vehicle);
                      setTrackingModalOpen(true);
                    }}
                  >
                    <Target className="mr-2 w-3 h-3" />
                    View Vehicle Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
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