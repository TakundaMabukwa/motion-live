'use client';

import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

(mapboxgl as any).accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
import { Badge } from '@/components/ui/badge';
import { Car, Clock, Gauge, Target } from 'lucide-react';

const PORT_MAPPING: Record<string, number> = {
  'AIXX': 8001, 'ALDA': 8002, 'ALST': 8003, 'AVVA': 8004, 'BACA': 8005,
  'BLUE': 8006, 'CONC': 8007, 'COUN': 8008, 'DACO': 8009, 'DAWN': 8010,
  'DELA': 8011, 'DUPL': 8012, 'EDGE': 8013, 'ELIZ': 8014, 'EPSC': 8015,
  'EUXX': 8016, 'FIRS': 8017, 'FRSU': 8018, 'FUSP': 8019, 'GOEA': 8020,
  'GRAV': 8021, 'HIMA': 8022, 'HITA': 8023, 'ICON': 8024, 'INTA': 8025,
  'JCAG': 8026, 'JOLO': 8027, 'KANO': 8028, 'KEAD': 8029, 'KELO': 8030,
  'KERI': 8031, 'LECO': 8032, 'LTSX': 8033, 'MACS': 8034, 'MAGO': 8035,
  'MAIB': 8036, 'MASS': 8037, 'MAVA': 8038, 'META': 8039, 'MNFU': 8040,
  'NNSL': 8041, 'PETE': 8042, 'PIRT': 8043, 'PRCR': 8044, 'RIGH': 8045,
  'SEVE': 8046, 'SGMO': 8047, 'SIVE': 8048, 'SPAR': 8049, 'STGR': 8050,
  'STRU': 8051, 'TALI': 8052, 'TRIA': 8053, 'TYSO': 8054, 'VDMX': 8055,
  'WACA': 8056
};

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
    status?: string;
  };
}

interface LiveVehicleMapProps {
  vehicles: Vehicle[];
  accountNumber: string;
}

export default function LiveVehicleMap({ vehicles, accountNumber }: LiveVehicleMapProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [liveVehicles, setLiveVehicles] = useState<Vehicle[]>(vehicles);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);


  useEffect(() => {
    setLiveVehicles([]);
  }, [vehicles]);

  useEffect(() => {
    if (eventSourceRef.current) return;
    
    const prefix = accountNumber.split('-')[0].toUpperCase();
    const eventSource = new EventSource(`/api/ws-proxy?prefix=${prefix}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'telematics' && data.vehicle && data.location) {
        setLiveVehicles(prev => {
          const existingIndex = prev.findIndex(v => 
            v.live_data?.plate === data.vehicle.plate
          );
          
          const vehicleData = {
            id: data.vehicle.plate,
            group_name: data.vehicle.plate,
            new_registration: data.vehicle.registration,
            beame_1: data.vehicle.fleetNumber?.trim(),
            beame_2: '',
            live_data: {
              plate: data.vehicle.plate,
              speed: data.telemetry.speed,
              latitude: data.location.latitude,
              longitude: data.location.longitude,
              last_update: data.location.timestamp,
              quality: '',
              mileage: data.telemetry.mileage,
              head: '',
              geozone: data.telemetry.geozone || '',
              driver_name: data.telemetry.driverName || '',
              address: '',
              status: data.telemetry.status || ''
            }
          };
          
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = vehicleData;
            return updated;
          }
          return [...prev, vehicleData];
        });
      }
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [accountNumber]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [28.139126, -26.308411],
      zoom: 10,
      attributionControl: false,
      trackResize: true,
      preserveDrawingBuffer: true
    });

    (mapInstance.current as any)._requestManager._skuToken = '';

    mapInstance.current.addControl(new mapboxgl.NavigationControl());

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;

    liveVehicles.forEach(vehicle => {
      if (vehicle.live_data) {
        const existingMarker = markersRef.current.find(m => (m as any).vehicleId === vehicle.id);
        
        if (existingMarker) {
          const currentLngLat = existingMarker.getLngLat();
          const newLngLat: [number, number] = [vehicle.live_data.longitude, vehicle.live_data.latitude];
          
          const distance = Math.sqrt(
            Math.pow(newLngLat[0] - currentLngLat.lng, 2) + 
            Math.pow(newLngLat[1] - currentLngLat.lat, 2)
          );
          
          if (distance > 0.0001) {
            const steps = 60;
            let step = 0;
            
            const animate = () => {
              if (step <= steps) {
                const progress = step / steps;
                const lng = currentLngLat.lng + (newLngLat[0] - currentLngLat.lng) * progress;
                const lat = currentLngLat.lat + (newLngLat[1] - currentLngLat.lat) * progress;
                existingMarker.setLngLat([lng, lat]);
                step++;
                requestAnimationFrame(animate);
              }
            };
            animate();
          }
          
          const el = existingMarker.getElement();
          el.style.backgroundColor = selectedVehicle?.id === vehicle.id ? '#3b82f6' : '#10b981';
        } else {
          const el = document.createElement('div');
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = selectedVehicle?.id === vehicle.id ? '#3b82f6' : '#10b981';
          el.style.border = '2px solid white';
          el.style.cursor = 'pointer';
          el.style.transition = 'all 0.3s ease';

          const marker = new mapboxgl.Marker(el)
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
            .addTo(mapInstance.current!);

          (marker as any).vehicleId = vehicle.id;
          markersRef.current.push(marker);
        }
      }
    });
  }, [liveVehicles, selectedVehicle]);

  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    if (vehicle.live_data && mapInstance.current) {
      mapInstance.current.flyTo({
        center: [vehicle.live_data.longitude, vehicle.live_data.latitude],
        zoom: 15,
        duration: 1500,
        essential: true
      });
    }
  };

  const formatLastUpdate = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    date.setHours(date.getHours() + 2);
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

  const vehiclesWithLiveData = liveVehicles.filter(v => v.live_data);

  return (
    <div className="flex h-[600px] max-h-[600px] overflow-hidden">
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
      </div>

      <div className="w-1/4 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900">
            <Car className="w-5 h-5" />
            Vehicle Fleet ({liveVehicles.length})
          </h3>
          <div className="flex gap-2 mt-2">
            <Badge variant="default" className="text-xs">
              {vehiclesWithLiveData.length} active
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {vehicles.length - vehiclesWithLiveData.length} inactive
            </Badge>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {liveVehicles.map((vehicle) => {
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
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {plate}
                        </div>
                        <div className="mt-1 text-gray-500 text-xs truncate">
                          {vehicle.beame_1 || vehicle.beame_2 || 'No description'}
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {hasLiveData && (
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-1 text-green-600">
                              <Clock className="w-3 h-3" />
                              <span>{formatLastUpdate(vehicle.live_data!.last_update)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-700">
                              <Gauge className="w-3 h-3" />
                              <span>{vehicle.live_data!.speed} km/h</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge 
                        variant={hasLiveData ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {hasLiveData ? 'Active' : 'Inactive'}
                      </Badge>
                      {isSelected && (
                        <Badge variant="outline" className="bg-blue-100 text-xs">
                          <Target className="mr-1 w-3 h-3" />
                          Selected
                        </Badge>
                      )}
                    </div>
                    {hasLiveData && (
                      <div className="mt-2 text-gray-600 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Location:</span>
                          <span>{vehicle.live_data!.latitude.toFixed(4)}, {vehicle.live_data!.longitude.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Mileage:</span>
                          <span>{vehicle.live_data!.mileage.toLocaleString()} km</span>
                        </div>
                        {vehicle.live_data!.driver_name && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Driver:</span>
                            <span>{vehicle.live_data!.driver_name}</span>
                          </div>
                        )}
                        {vehicle.live_data!.geozone && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Zone:</span>
                            <span>{vehicle.live_data!.geozone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
