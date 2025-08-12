"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, MapPin, Clock, Gauge, Navigation, AlertCircle } from 'lucide-react';

interface VehicleLocation {
  Plate: string;
  Speed: number;
  Latitude: number;
  Longitude: number;
  LocTime: string;
  Quality: string;
  Mileage: number;
  Pocsagstr: string;
  Head: string;
  Geozone: string;
  DriverName: string;
  NameEvent: string;
  Temperature: string;
  Address: string;
}

interface Vehicle {
  id: number;
  plate_number: string;
  company: string;
  comment: string;
  group_name: string;
  registration: string;
  active: boolean;
}

interface VehicleCardsProps {
  vehicles: Vehicle[];
  selectedVehicle?: string | null;
  onVehicleSelect?: (plate: string) => void;
}

export default function VehicleCards({ vehicles, selectedVehicle, onVehicleSelect }: VehicleCardsProps) {
  const [vehicleLocations, setVehicleLocations] = useState<{ [key: string]: VehicleLocation }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch live vehicle data
  const fetchVehicleData = useCallback(async () => {
    try {
      const response = await fetch('/api/vehicle-feed');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: VehicleLocation = await response.json();
      
      // The feed sends data for one vehicle at a time
      // Check if this vehicle is in our list by matching the Plate field
      const vehiclePlate = data.Plate;
      console.log('DEBUG: Feed data received for plate:', vehiclePlate);
      console.log('DEBUG: Our vehicles:', vehicles.map(v => v.group_name));
      
      const isRelevantVehicle = vehicles.some(v => {
        // Use group_name directly as it contains the plate number
        const vehiclePlateFromDB = v.group_name || v.plate_number || v.registration;
        const matches = vehiclePlateFromDB === vehiclePlate;
        if (matches) {
          console.log('DEBUG: MATCH FOUND!', vehiclePlate, 'matches', vehiclePlateFromDB);
        }
        return matches;
      });

      if (isRelevantVehicle) {
        console.log('DEBUG: Found relevant vehicle in feed:', vehiclePlate, data);
        setVehicleLocations(prev => ({
          ...prev,
          [vehiclePlate]: data
        }));
      } else {
        console.log('DEBUG: Vehicle not in our list, ignoring:', vehiclePlate);
      }
    } catch (err) {
      console.error('Error fetching vehicle data:', err);
    }
  }, [vehicles]);

  // Start polling for live data
  useEffect(() => {
    if (vehicles.length === 0) return;

    // Initial fetch
    fetchVehicleData();
    setIsLoading(false);

    // Poll every 3 seconds
    const interval = setInterval(fetchVehicleData, 3000);

    return () => clearInterval(interval);
  }, [vehicles, fetchVehicleData]);

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleString();
    } catch {
      return timeString;
    }
  };

  const getVehiclePlate = (vehicle: Vehicle) => {
    return vehicle.plate_number || vehicle.registration || vehicle.group_name?.replace('Plate:', '').trim() || 'Unknown';
  };

  const getVehicleLocation = (vehicle: Vehicle) => {
    const plate = getVehiclePlate(vehicle);
    return vehicleLocations[plate];
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
        {isLoading && <Badge variant="secondary">Updating...</Badge>}
      </div>
      
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => {
          const plate = getVehiclePlate(vehicle);
          const location = getVehicleLocation(vehicle);
          const isSelected = selectedVehicle === plate;
          const hasLocation = location && location.Latitude && location.Longitude;

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
                      hasLocation ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Car className={`w-5 h-5 ${
                        hasLocation ? 'text-green-600' : 'text-gray-400'
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
                  <Badge variant={hasLocation ? 'default' : 'secondary'}>
                    {hasLocation ? 'Live' : 'Offline'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {vehicle.comment && (
                  <div className="text-gray-600 text-sm">
                    <span className="font-medium">Comment:</span> {vehicle.comment}
                  </div>
                )}
                
                {hasLocation ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <Gauge className="w-4 h-4 text-blue-600" />
                      <span><strong>Speed:</strong> {location.Speed} km/h</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span className="truncate">
                        <strong>Location:</strong> {location.Address || 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span>
                        <strong>Last Update:</strong> {formatTime(location.LocTime)}
                      </span>
                    </div>
                    
                    {location.Geozone && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Navigation className="w-4 h-4 text-purple-600" />
                        <span><strong>Zone:</strong> {location.Geozone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-gray-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>No recent location data</span>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button 
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVehicleSelect?.(plate);
                    }}
                  >
                    {isSelected ? 'Selected' : 'Track Vehicle'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 