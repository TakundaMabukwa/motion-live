'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Car, 
  Navigation, 
  Clock, 
  Gauge,
  Target
} from 'lucide-react';

interface Vehicle {
  id: string;
  group_name?: string;
  new_registration?: string;
  beame_1?: string;
  beame_2?: string;
  live_data?: {
    plate: string;
    speed: number;
    latitude: number;
    longitude: number;
    last_update: string;
    quality: string;
    mileage: number;
    head: string;
    geozone: string;
    driver_name: string;
    address: string;
  };
}

interface LiveVehicleMapProps {
  vehicles: Vehicle[];
  accountNumber: string;
}

export default function LiveVehicleMap({ vehicles, accountNumber }: LiveVehicleMapProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [mapCenter, setMapCenter] = useState([-26.308411, 28.139126]); // Default to Johannesburg
  const [mapZoom, setMapZoom] = useState(10);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    // Initialize Mapbox
    if (typeof window !== 'undefined' && !mapInstance.current) {
      // @ts-ignore
      const mapboxgl = window.mapboxgl;
      if (!mapboxgl) {
        console.warn('Mapbox GL JS not loaded');
        return;
      }
      
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example';
      mapboxgl.accessToken = token;
      
      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current!,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: mapCenter,
        zoom: mapZoom
      });

      // Add navigation controls
      mapInstance.current.addControl(new mapboxgl.NavigationControl());
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstance.current) {
      // @ts-ignore
      const mapboxgl = window.mapboxgl;
      if (!mapboxgl) return;
      
      // Clear existing markers
      const markers = document.querySelectorAll('.mapboxgl-marker');
      markers.forEach(marker => marker.remove());

      // Add markers for vehicles with live data
      vehicles.forEach(vehicle => {
        if (vehicle.live_data) {
          const el = document.createElement('div');
          el.className = 'vehicle-marker';
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = selectedVehicle?.id === vehicle.id ? '#3b82f6' : '#10b981';
          el.style.border = '2px solid white';
          el.style.cursor = 'pointer';

          // Add marker to map
          new mapboxgl.Marker(el)
            .setLngLat([vehicle.live_data.longitude, vehicle.live_data.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold">${vehicle.live_data.plate}</h3>
                  <p class="text-sm">Speed: ${vehicle.live_data.speed} km/h</p>
                  <p class="text-sm">Last Update: ${formatLastUpdate(vehicle.live_data.last_update)}</p>
                </div>
              `)
            )
            .addTo(mapInstance.current);

          // Update map center if this is the selected vehicle
          if (selectedVehicle?.id === vehicle.id) {
            mapInstance.current.flyTo({
              center: [vehicle.live_data.longitude, vehicle.live_data.latitude],
              zoom: 15
            });
          }
        }
      });

      // Update map center based on vehicles with live data
      const vehiclesWithLiveData = vehicles.filter(v => v.live_data);
      if (vehiclesWithLiveData.length > 0 && !selectedVehicle) {
        const avgLat = vehiclesWithLiveData.reduce((sum, v) => sum + v.live_data!.latitude, 0) / vehiclesWithLiveData.length;
        const avgLng = vehiclesWithLiveData.reduce((sum, v) => sum + v.live_data!.longitude, 0) / vehiclesWithLiveData.length;
        
        mapInstance.current.flyTo({
          center: [avgLng, avgLat],
          zoom: 12
        });
      }
    }
  }, [vehicles, selectedVehicle]);

  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    if (vehicle.live_data && mapInstance.current) {
      mapInstance.current.flyTo({
        center: [vehicle.live_data.longitude, vehicle.live_data.latitude],
        zoom: 15
      });
    }
  };

  const formatLastUpdate = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const vehiclesWithLiveData = vehicles.filter(v => v.live_data);

  return (
    <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
      {/* Map Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Live Vehicle Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={mapRef} 
            className="rounded-lg w-full h-96"
            style={{ minHeight: '400px' }}
          />
          {vehiclesWithLiveData.length === 0 && (
            <div className="absolute inset-0 flex justify-center items-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <Navigation className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                <p className="text-gray-500">No vehicles with live data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Info Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Vehicle Fleet ({vehicles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {vehicles.length === 0 ? (
              <div className="py-8 text-center">
                <Car className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                <p className="text-gray-500 text-sm">No vehicles found</p>
              </div>
            ) : (
              vehicles.map((vehicle) => {
                const isSelected = selectedVehicle?.id === vehicle.id;
                const hasLiveData = !!vehicle.live_data;
                const plate = vehicle.group_name || vehicle.new_registration || 'Unknown Plate';
                
                return (
                  <div
                    key={vehicle.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : hasLiveData 
                          ? 'border-green-200 hover:border-green-300 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleVehicleClick(vehicle)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {plate}
                        </div>
                        <div className="mt-1 text-gray-500 text-xs">
                          {vehicle.beame_1 || vehicle.beame_2 || 'No description'}
                        </div>
                      </div>
                      <div className="text-right">
                        {hasLiveData ? (
                          <>
                            <div className="flex items-center gap-1 text-green-600 text-xs">
                              <Clock className="w-3 h-3" />
                              <span>{formatLastUpdate(vehicle.live_data!.last_update)}</span>
                            </div>
                            {vehicle.live_data!.speed !== undefined && (
                              <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs">
                                <Gauge className="w-3 h-3" />
                                <span>{vehicle.live_data!.speed} km/h</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <Clock className="w-3 h-3" />
                            <span>No live data</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge 
                        variant={hasLiveData ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {hasLiveData ? 'Active' : 'Inactive'}
                      </Badge>
                      {vehicle.live_data?.geozone && (
                        <Badge variant="outline" className="text-xs">
                          {vehicle.live_data.geozone}
                        </Badge>
                      )}
                      {isSelected && (
                        <Badge variant="outline" className="bg-blue-100 text-xs">
                          <Target className="mr-1 w-3 h-3" />
                          Selected
                        </Badge>
                      )}
                    </div>
                    {hasLiveData && (
                      <div className="mt-2 text-gray-500 text-xs">
                        <div>Lat: {vehicle.live_data!.latitude.toFixed(4)}</div>
                        <div>Lng: {vehicle.live_data!.longitude.toFixed(4)}</div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
