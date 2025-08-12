"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, MapPin, Clock, Gauge, Navigation } from 'lucide-react';

// Set mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

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

interface LiveVehicleMapProps {
  vehicles: Vehicle[];
  selectedVehicle?: string | null;
  onVehicleSelect?: (plate: string) => void;
}

export default function LiveVehicleMap({ vehicles, selectedVehicle, onVehicleSelect }: LiveVehicleMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [vehicleLocations, setVehicleLocations] = useState<{ [key: string]: VehicleLocation }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initializeMap = () => {
      try {
        // Ensure the container element exists
        if (!mapContainer.current) {
          console.error('Map container not found in LiveVehicleMap');
          return;
        }

        console.log('Initializing LiveVehicleMap with container:', mapContainer.current);
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [28.179211, -26.263278], // Default to Johannesburg
          zoom: 10
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
          console.log('LiveVehicleMap loaded successfully');
        });

        map.current.on('error', (e) => {
          console.error('LiveVehicleMap error:', e);
        });

      } catch (error) {
        console.error('Error initializing LiveVehicleMap:', error);
      }
    };

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(initializeMap, 100);

    return () => {
      clearTimeout(timer);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

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
      console.log('DEBUG: Feed data received for plate (map):', vehiclePlate);
      console.log('DEBUG: Our vehicles (map):', vehicles.map(v => v.group_name));
      
      const isRelevantVehicle = vehicles.some(v => {
        // Use group_name directly as it contains the plate number
        const vehiclePlateFromDB = v.group_name || v.plate_number || v.registration;
        const matches = vehiclePlateFromDB === vehiclePlate;
        if (matches) {
          console.log('DEBUG: MATCH FOUND! (map)', vehiclePlate, 'matches', vehiclePlateFromDB);
        }
        return matches;
      });

      if (isRelevantVehicle) {
        console.log('DEBUG: Found relevant vehicle in feed for map:', vehiclePlate, data);
        setVehicleLocations(prev => ({
          ...prev,
          [vehiclePlate]: data
        }));
      } else {
        console.log('DEBUG: Vehicle not in our list, ignoring (map):', vehiclePlate);
      }
    } catch (err) {
      console.error('Error fetching vehicle data:', err);
      setError('Failed to fetch live vehicle data');
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

  // Update markers on map - only when selectedVehicle changes
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    // Only show marker for selected vehicle
    if (selectedVehicle && vehicleLocations[selectedVehicle]) {
      const location = vehicleLocations[selectedVehicle];
      
      if (location.Latitude && location.Longitude) {
        const el = document.createElement('div');
        el.className = 'vehicle-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#ef4444'; // Red for selected vehicle
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([location.Longitude, location.Latitude])
          .addTo(map.current!);

        // Add popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${selectedVehicle}</h3>
            <p style="margin: 4px 0;"><strong>Speed:</strong> ${location.Speed} km/h</p>
            <p style="margin: 4px 0;"><strong>Location:</strong> ${location.Address || 'Unknown'}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> ${location.LocTime}</p>
          </div>
        `);

        marker.setPopup(popup);
        markers.current[selectedVehicle] = marker;

        // Center map on selected vehicle
        map.current.flyTo({
          center: [location.Longitude, location.Latitude],
          zoom: 15
        });
      }
    }
  }, [selectedVehicle, vehicleLocations]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Live Vehicle Tracking</span>
            {isLoading && <Badge variant="secondary">Loading...</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 mb-4 p-3 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}
          
          <div 
            ref={mapContainer} 
            className="border border-gray-200 rounded-lg w-full h-96"
          />
          
          <div className="mt-4 text-gray-600 text-sm">
            <p>• Click on a vehicle card to see its location on the map</p>
            <p>• Red marker shows the selected vehicle</p>
            <p>• Data updates every 3 seconds</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 