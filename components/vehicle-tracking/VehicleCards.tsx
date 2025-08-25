"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Target, Wifi } from 'lucide-react';
import VehicleTrackingModal from './VehicleTrackingModal';



interface Vehicle {
  id: number;
  plate_number: string;
  company: string;
  comment: string;
  group_name: string;
  registration: string;
  active: boolean;
  new_account_number: string;
  new_registration: string;
  beame_1: string;
  beame_2: string;
  beame_3: string;
  ip_address: string;
  products: string[];
  vin_number: string;
}

interface VehicleCardsProps {
  vehicles: Vehicle[];
  selectedVehicle?: string | null;
  onVehicleSelect?: (plate: string) => void;
  accountNumber?: string;
}

export default function VehicleCards({ vehicles, selectedVehicle, onVehicleSelect, accountNumber }: VehicleCardsProps) {
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedVehicleForTracking, setSelectedVehicleForTracking] = useState<string>('');
  const [selectedVehicleIP, setSelectedVehicleIP] = useState<string>('');

  const getVehiclePlate = (vehicle: Vehicle) => {
    return vehicle.new_registration || vehicle.group_name || vehicle.plate_number || 'Unknown';
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
          const plate = getVehiclePlate(vehicle);
          const isSelected = selectedVehicle === plate;

          return (
            <Card 
              key={vehicle.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => onVehicleSelect?.(plate)}
            >
                             <CardHeader className="pb-3">
                 <div className="flex justify-between items-start">
                   <div className="flex items-center space-x-3">
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                       vehicle.active ? 'bg-green-100' : 'bg-gray-100'
                     }`}>
                       <Car className={`w-5 h-5 ${
                         vehicle.active ? 'text-green-600' : 'text-gray-400'
                       }`} />
                     </div>
                     <div>
                       <CardTitle className="font-semibold text-gray-900 text-lg">
                         {plate}
                       </CardTitle>
                       <p className="text-gray-500 text-sm">
                         {vehicle.company || 'Unknown Company'}
                       </p>
                     </div>
                   </div>
                   <Badge variant={vehicle.active ? 'default' : 'secondary'}>
                     {vehicle.active ? 'Active' : 'Inactive'}
                   </Badge>
                 </div>
               </CardHeader>
              
                             <CardContent className="space-y-3">
                 {vehicle.comment && (
                   <div className="text-gray-600 text-sm">
                     <span className="font-medium">Comment:</span> {vehicle.comment}
                   </div>
                 )}
                 
                 <div className="space-y-2">
                   {vehicle.ip_address && (
                     <div className="flex items-center space-x-2 text-sm">
                       <Wifi className="w-4 h-4 text-blue-600" />
                       <span><strong>IP Address:</strong> {vehicle.ip_address}</span>
                     </div>
                   )}
                   
                   {vehicle.vin_number && (
                     <div className="flex items-center space-x-2 text-sm">
                       <Car className="w-4 h-4 text-green-600" />
                       <span className="truncate">
                         <strong>VIN:</strong> {vehicle.vin_number}
                       </span>
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
                       setSelectedVehicleForTracking(plate);
                       setSelectedVehicleIP(vehicle.ip_address || '');
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
      
      {/* Vehicle Tracking Modal */}
      {trackingModalOpen && accountNumber && (
        <VehicleTrackingModal
          isOpen={trackingModalOpen}
          onClose={() => setTrackingModalOpen(false)}
          vehiclePlate={selectedVehicleForTracking}
          accountNumber={accountNumber}
          vehicleIP={selectedVehicleIP}
        />
      )}
    </div>
  );
} 