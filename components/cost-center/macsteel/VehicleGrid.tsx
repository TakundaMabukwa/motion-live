'use client';

import { 
  Car, 
  User, 
  MapPin, 
  Gauge, 
  Shield, 
  Zap,
  Clock,
  Lock,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface VehicleGridProps {
  vehicles: Vehicle[];
  title: string;
}

const statusConfig = {
  active: { 
    color: 'bg-green-500', 
    textColor: 'text-green-700', 
    bgColor: 'bg-green-50',
    label: 'Active' 
  },
  inactive: { 
    color: 'bg-gray-500', 
    textColor: 'text-gray-700', 
    bgColor: 'bg-gray-50',
    label: 'Inactive' 
  },
  warning: { 
    color: 'bg-yellow-500', 
    textColor: 'text-yellow-700', 
    bgColor: 'bg-yellow-50',
    label: 'Warning' 
  },
  maintenance: { 
    color: 'bg-red-500', 
    textColor: 'text-red-700', 
    bgColor: 'bg-red-50',
    label: 'Maintenance' 
  }
};

export function VehicleGrid({ vehicles, title }: VehicleGridProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 text-xl">{title}</h2>
        <span className="text-gray-500 text-sm">{vehicles.length} vehicles</span>
      </div>

      <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {vehicles.map((vehicle) => {
          const config = statusConfig[vehicle.status];
          const hasLiveData = vehicle.liveData;
          
          return (
            <Card 
              key={vehicle.id} 
              className={`shadow-md hover:shadow-lg border-0 hover:scale-[1.02] transition-all duration-200 ${
                hasLiveData ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Car className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-gray-800 text-lg">
                      {vehicle.registration}
                    </span>
                    {hasLiveData && (
                      <div className="flex items-center space-x-1">
                        <div className="bg-green-500 rounded-full w-2 h-2 animate-pulse" />
                        <span className="font-medium text-green-600 text-xs">LIVE</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <div className={`w-3 h-3 rounded-full ${config.color}`} />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className={`${config.bgColor} ${config.textColor} border-0 w-fit`}
                  >
                    {config.label}
                  </Badge>
                  {hasLiveData && (
                    <Badge variant="outline" className="border-blue-300 text-blue-600 text-xs">
                      Real-time
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {/* Live Data Section */}
                  {hasLiveData && (
                    <div className="bg-blue-50 p-3 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-800 text-sm">Live Data</span>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Driver (Plate) */}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs">Driver:</span>
                          <span className="font-medium text-sm">
                            {vehicle.registration}
                          </span>
                        </div>

                        {/* Speed */}
                        {vehicle.liveData!.speed !== null && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-xs">Speed:</span>
                            <span className="font-bold text-green-600 text-sm">
                              {vehicle.liveData!.speed} km/h
                            </span>
                          </div>
                        )}
                        
                        {/* Location (Coordinates) */}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs">Location:</span>
                          <span className="text-gray-700 text-xs text-right">
                            {vehicle.liveData!.latitude.toFixed(4)}, {vehicle.liveData!.longitude.toFixed(4)}
                          </span>
                        </div>
                        
                        {/* Geozone (from Head field) */}
                        {vehicle.liveData!.head && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-xs">Geozone:</span>
                            <span className="text-gray-700 text-xs text-right">
                              {vehicle.liveData!.head}
                            </span>
                          </div>
                        )}
                        
                        {/* Mileage */}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs">Mileage:</span>
                          <span className="font-medium text-sm">
                            {vehicle.liveData!.mileage.toLocaleString()} km
                          </span>
                        </div>
                        
                        {/* Last Update */}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-xs">Updated:</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(vehicle.liveData!.locTime).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Standard Vehicle Info (only if no live data) */}
                  {!hasLiveData && (
                    <>
                      <div className="flex items-start space-x-3">
                        <User className="flex-shrink-0 mt-0.5 w-4 h-4 text-gray-500" />
                        <div>
                          <span className="font-medium text-gray-700 text-sm">Driver:</span>
                          <p className="text-gray-600 text-sm break-words">{vehicle.driver}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <MapPin className="flex-shrink-0 mt-0.5 w-4 h-4 text-blue-500" />
                        <div>
                          <span className="font-medium text-gray-700 text-sm">Location:</span>
                          <p className="text-gray-600 text-sm break-words">{vehicle.location}</p>
                        </div>
                      </div>

                      <div className="gap-4 grid grid-cols-2">
                        <div className="flex items-center space-x-2">
                          <Gauge className="w-4 h-4 text-green-500" />
                          <div>
                            <span className="text-gray-500 text-xs">CPK:</span>
                            <p className="font-medium text-sm">{vehicle.cpk}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="flex justify-center items-center bg-purple-100 rounded w-4 h-4">
                            <div className="bg-purple-500 rounded w-2 h-2" />
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Odometer:</span>
                            <p className="font-medium text-sm">{vehicle.odometer.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <Shield className="flex-shrink-0 mt-0.5 w-4 h-4 text-orange-500" />
                        <div>
                          <span className="font-medium text-gray-700 text-sm">Safety:</span>
                          <p className="text-gray-600 text-sm break-words">{vehicle.safetyInfo}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-gray-100 border-t">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 text-sm">Engine: {vehicle.engineStatus}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="font-medium text-gray-700 text-sm">{vehicle.startTime}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}