'use client';

import { useState } from 'react';
import { FileText, Plus, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  registration: string;
  driver: string;
  location: string;
  cpk: string;
  odometer: number;
  safetyInfo: string;
  engineStatus: string;
  status: 'active' | 'inactive' | 'warning' | 'maintenance';
  startTime: string;
  actionStatus: string | null;
  costCenterId: string;
  liveData?: {
    speed: number | null;
    latitude: number;
    longitude: number;
    locTime: string;
    mileage: number;
    geozone: string;
    driverName: string;
    temperature: string;
    head: string;
  };
}

interface VehicleTableProps {
  vehicles: Vehicle[];
  onActionSelect: (vehicleId: string, action: string) => void;
  isStartTimeSection?: boolean;
}

const statusConfig = {
  active: { 
    color: 'default', 
    label: 'Active' 
  },
  inactive: { 
    color: 'secondary', 
    label: 'Inactive' 
  },
  warning: { 
    color: 'destructive', 
    label: 'Warning' 
  },
  maintenance: { 
    color: 'outline', 
    label: 'Maintenance' 
  }
} as const;

const actionOptions = [
  'Workshop',
  'Quality',
  'Warehouse', 
  'Sales',
  'No loads'
];

export function VehicleTable({ vehicles, onActionSelect, isStartTimeSection = false }: VehicleTableProps) {
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  const handleActionSelect = async (vehicleId: string, action: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    setLoadingActions(prev => ({ ...prev, [vehicleId]: true }));

    try {
      // Create vehicle log entry
      const response = await fetch('/api/vehicle-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_registration: vehicle.registration,
          status: action,
          cost_center: `Cost Center ${vehicle.costCenterId}`,
          driver_name: vehicle.driver
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create vehicle log');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Status updated to "${action}" for ${vehicle.registration}`);
        // Update the vehicle's action status
        onActionSelect(vehicleId, action);
      } else {
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      toast.error('Failed to update vehicle status');
    } finally {
      setLoadingActions(prev => ({ ...prev, [vehicleId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-800 text-xl">
        {isStartTimeSection ? 'Start Time Details' : 'Vehicle Details'}
      </h2>
      
      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-sky-600">Status</TableHead>
                <TableHead className="font-semibold text-sky-600">Vehicle Registration</TableHead>
                <TableHead className="font-semibold text-sky-600">Cost Centre</TableHead>
                <TableHead className="font-semibold text-sky-600">Driver Name</TableHead>
                <TableHead className="font-semibold text-sky-600">Start Time</TableHead>
                {!isStartTimeSection && (
                  <TableHead className="font-semibold text-sky-600">Location</TableHead>
                )}
                <TableHead className="font-semibold text-sky-600">Live Data</TableHead>
                <TableHead className="font-semibold text-sky-600 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle, index) => (
                <TableRow 
                  key={vehicle.id}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-blue-50/50 transition-colors`}
                >
                  <TableCell>
                    {isStartTimeSection ? (
                      // For Start Time section, show blank status or action status
                      vehicle.actionStatus ? (
                        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                          {vehicle.actionStatus}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )
                    ) : (
                      // For other sections, show normal status
                      vehicle.actionStatus ? (
                        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                          {vehicle.actionStatus}
                        </Badge>
                      ) : (
                        <Badge variant={statusConfig[vehicle.status].color as "default" | "secondary" | "destructive" | "outline"}>
                          {statusConfig[vehicle.status].label}
                        </Badge>
                      )
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{vehicle.registration}</TableCell>
                  <TableCell className="text-gray-600">Cost Center {vehicle.costCenterId}</TableCell>
                  <TableCell className="text-gray-600">{vehicle.driver}</TableCell>
                  <TableCell className="text-gray-600">{vehicle.startTime}</TableCell>
                  {!isStartTimeSection && (
                    <TableCell className="max-w-48 text-gray-600 truncate">
                      {vehicle.location}
                    </TableCell>
                  )}
                  <TableCell>
                    {vehicle.liveData ? (
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-green-500" />
                        <div className="flex flex-col">
                          <span className="font-medium text-green-600 text-xs">LIVE</span>
                          {vehicle.liveData.speed !== null && (
                            <span className="text-gray-600 text-xs">
                              {vehicle.liveData.speed} km/h
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Offline</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={loadingActions[vehicle.id]}
                        >
                          <FileText className="w-4 h-4 text-sky-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <div className="px-3 py-2 border-b font-medium text-gray-900 text-sm">
                          <div className="flex items-center space-x-2">
                            <Plus className="w-4 h-4 text-blue-500" />
                            <span>Add Log Message</span>
                          </div>
                        </div>
                        <div className="px-3 py-2">
                          <p className="mb-2 text-red-500 text-xs">Select Message *</p>
                          {actionOptions.map((option) => (
                            <DropdownMenuItem 
                              key={option}
                              onClick={() => handleActionSelect(vehicle.id, option)}
                              className="hover:bg-blue-50 cursor-pointer"
                              disabled={loadingActions[vehicle.id]}
                            >
                              {option}
                            </DropdownMenuItem>
                          ))}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Edit Vehicle
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          View History
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}