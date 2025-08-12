'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Car, 
  MapPin, 
  Clock, 
  Gauge, 
  Navigation,
  Target,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface VehicleData {
  Plate: string;
  Speed: number;
  Latitude: number;
  Longitude: number;
  LocTime: string;
  Quality: string;
  Mileage: number;
  Head: string;
  Geozone: string;
  DriverName: string;
  Address: string;
}

interface Vehicle {
  id: string;
  group_name?: string;
  new_registration?: string;
  registration?: string;
  plate_number?: string;
  company?: string;
  comment?: string;
}

interface VehicleMapViewProps {
  vehicles: Vehicle[];
  customer: any;
}

const VehicleMapView: React.FC<VehicleMapViewProps> = ({ vehicles, customer }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [vehicleData, setVehicleData] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleData | null>(null);
  const [map, setMap] = useState<any>(null);
  const [mapboxgl, setMapboxgl] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>('Not tested');

  // Mapbox token - you can set this in your .env.local file
  const MAPBOX_TOKEN = 'eyJ1IjoicmVuZGVuaS1kZXYiLCJhIjoiY21kM2c3OXQ4MDJqczlqbzNwcDZvaCJ9.6skTnPcXqD7h24o9mfuQnw';

  // Check if token is valid (Mapbox tokens start with 'pk.')
  const isMapboxTokenValid = MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith('pk.');

  // Create a mapping of plate numbers to vehicle data for easy lookup
  const vehiclePlateMap = vehicles.reduce((acc, vehicle) => {
    const plate = vehicle.group_name || vehicle.new_registration || vehicle.registration || vehicle.plate_number;
    if (plate) {
      acc[plate] = vehicle;
    }
    return acc;
  }, {} as Record<string, any>);

  // Fetch live vehicle data from the external API
  const fetchVehicleData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      setApiStatus('Fetching...');

      console.log('Fetching live vehicle data...');
      
      let data;
      let source = 'external';
      
      // Try external API first
      try {
        console.log('Attempting external API: http://64.227.138.235:8000/latest');
        const response = await fetch('http://64.227.138.235:8000/latest');
        
        console.log('External API Response status:', response.status, response.statusText);
        
        if (response.ok) {
          data = await response.json();
          console.log('External API Response data:', data);
        } else {
          throw new Error(`External API failed: ${response.status} ${response.statusText}`);
        }
      } catch (externalError) {
        console.warn('External API failed, trying internal API:', externalError);
        
        // Fallback to internal API
        try {
          source = 'internal';
          console.log('Attempting internal API: /api/vehicle-live-data?all=true');
          const internalResponse = await fetch('/api/vehicle-live-data?all=true');
          
          if (internalResponse.ok) {
            const internalData = await internalResponse.json();
            console.log('Internal API Response:', internalData);
            
            if (internalData.vehicles && internalData.vehicles.length > 0) {
              // Transform internal API data to match expected format
              data = internalData.vehicles.map((vehicle: any) => ({
                Plate: vehicle.plate || vehicle.live_data?.plate || 'Unknown',
                Speed: vehicle.speed || vehicle.live_data?.speed || 0,
                Latitude: vehicle.latitude || vehicle.live_data?.latitude || 0,
                Longitude: vehicle.longitude || vehicle.live_data?.longitude || 0,
                LocTime: vehicle.last_update || vehicle.live_data?.last_update || new Date().toISOString(),
                Quality: vehicle.quality || vehicle.live_data?.quality || '',
                Mileage: vehicle.mileage || vehicle.live_data?.mileage || 0,
                Head: vehicle.head || vehicle.live_data?.head || '',
                Geozone: vehicle.geozone || vehicle.live_data?.geozone || '',
                DriverName: vehicle.driver_name || vehicle.live_data?.driver_name || '',
                Address: vehicle.address || vehicle.live_data?.address || ''
              }));
            } else {
              throw new Error('No vehicles in internal API response');
            }
          } else {
            throw new Error(`Internal API failed: ${internalResponse.status}`);
          }
        } catch (internalError) {
          console.error('Both APIs failed:', internalError);
          throw new Error(`Both external and internal APIs failed. External: ${externalError.message}, Internal: ${internalError.message}`);
        }
      }
      
      // Handle both single object and array responses
      const vehicleArray = Array.isArray(data) ? data : [data];
      console.log('Processed vehicle array:', vehicleArray);
      
      // Transform the data to match our expected format
      const transformedVehicles = vehicleArray.map((vehicle: any) => ({
        Plate: vehicle.Plate || 'Unknown',
        Speed: vehicle.Speed || 0,
        Latitude: vehicle.Latitude || 0,
        Longitude: vehicle.Longitude || 0,
        LocTime: vehicle.LocTime || new Date().toISOString(),
        Quality: vehicle.Quality || '',
        Mileage: vehicle.Mileage || 0,
        Head: vehicle.Head || '',
        Geozone: vehicle.Geozone || '',
        DriverName: vehicle.DriverName || '',
        Address: vehicle.Address || ''
      })).filter(vehicle => vehicle.Plate !== 'Unknown' && vehicle.Latitude !== 0 && vehicle.Longitude !== 0);
      
      console.log('Transformed vehicles:', transformedVehicles);
      setVehicleData(transformedVehicles);
      
      // If we have vehicles with data, select the first one
      if (transformedVehicles.length > 0 && !selectedVehicle) {
        setSelectedVehicle(transformedVehicles[0]);
      }
      
      setApiStatus(`Success (${source}): ${transformedVehicles.length} vehicles`);
      
      if (transformedVehicles.length > 0) {
        toast.success(`Updated ${transformedVehicles.length} vehicle locations from ${source} API`);
      } else {
        toast.info('No live vehicle data available at the moment');
      }
      
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
      setError('Failed to fetch live vehicle data. Please try again later.');
      setVehicleData([]);
      setApiStatus(`Error: ${error.message}`);
      toast.error('Failed to fetch vehicle data');
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedVehicle]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map) return;

    const initializeMap = async () => {
      try {
        setLoading(true);
        console.log('Starting map initialization...');
        console.log('Map container:', mapContainer.current);
        console.log('Mapbox token valid:', isMapboxTokenValid);
        
        // If Mapbox token is invalid, use OpenStreetMap fallback
        if (!isMapboxTokenValid) {
          console.log('Invalid Mapbox token, using OpenStreetMap fallback');
          setMap('openstreetmap'); // Mark as OpenStreetMap
          setLoading(false);
          return;
        }
        
        // Import mapbox-gl dynamically
        const mapboxModule = await import('mapbox-gl');
        const mapboxglInstance = mapboxModule.default;
        await import('mapbox-gl/dist/mapbox-gl.css');
        
        console.log('Mapbox GL imported successfully');
        setMapboxgl(mapboxglInstance);
        
        // Set the access token
        mapboxglInstance.accessToken = MAPBOX_TOKEN;
        console.log('Access token set:', mapboxglInstance.accessToken ? 'Yes' : 'No');
        
        // Verify container exists
        if (!mapContainer.current) {
          throw new Error('Map container not found');
        }
        
        console.log('Creating Mapbox map instance...');
        
        const newMap = new mapboxglInstance.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [24.9916, -28.8166], // Center of South Africa
          zoom: 6 // Zoom level to show most of South Africa
        });

        console.log('Map instance created, setting up event listeners...');

        newMap.on('load', () => {
          console.log('Map loaded successfully');
          setMap(newMap);
          setLoading(false);
          setError(null);
        });

        newMap.on('error', (e) => {
          console.error('Map error:', e);
          setError(`Map error: ${e.error}`);
          setLoading(false);
        });

        newMap.on('render', () => {
          console.log('Map rendering...');
        });

        // Add navigation controls
        try {
          newMap.addControl(new mapboxglInstance.NavigationControl(), 'top-right');
          console.log('Navigation controls added');
        } catch (controlError) {
          console.warn('Failed to add navigation controls:', controlError);
        }

        // Set a timeout to detect if map fails to load
        const loadTimeout = setTimeout(() => {
          if (!newMap.loaded()) {
            console.error('Map failed to load within timeout');
            setError('Map failed to load within expected time');
            setLoading(false);
          }
        }, 10000); // 10 second timeout

        newMap.on('load', () => {
          clearTimeout(loadTimeout);
        });

        return () => {
          clearTimeout(loadTimeout);
          if (newMap) {
            try {
              newMap.remove();
            } catch (removeError) {
              console.warn('Error removing map:', removeError);
            }
          }
        };
      } catch (error) {
        console.error('Error initializing map:', error);
        setError('Failed to initialize map: ' + (error as Error).message);
        setLoading(false);
      }
    };

    // Add a longer delay to ensure DOM is ready and CSS is loaded
    const timer = setTimeout(() => {
      console.log('DOM ready, initializing map...');
      initializeMap();
    }, 500); // Increased delay

    return () => clearTimeout(timer);
  }, [map, isMapboxTokenValid]);

  // Update map markers when vehicle data changes
  useEffect(() => {
    if (!map || !vehicleData.length) return;

    // Handle OpenStreetMap (iframe-based)
    if (map === 'openstreetmap') {
      // For OpenStreetMap, we can't add markers directly, but we can update the iframe
      // This is a limitation of using iframe-based OpenStreetMap
      console.log('OpenStreetMap detected - markers will be shown in iframe');
      
      // Update the OpenStreetMap iframe to show the first vehicle location if available
      if (vehicleData.length > 0 && mapContainer.current) {
        const firstVehicle = vehicleData[0];
        const iframe = mapContainer.current.querySelector('iframe');
        if (iframe) {
          const newSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${firstVehicle.Longitude-0.01},${firstVehicle.Latitude-0.01},${firstVehicle.Longitude+0.01},${firstVehicle.Latitude+0.01}&layer=mapnik&marker=${firstVehicle.Latitude},${firstVehicle.Longitude}`;
          iframe.setAttribute('src', newSrc);
        }
      }
      return;
    }

    // Handle Mapbox map
    if (!mapboxgl) return;

    const updateMarkers = async () => {
      try {
        // Clear existing markers
        const existingMarkers = document.querySelectorAll('.mapbox-marker');
        existingMarkers.forEach(marker => marker.remove());

        // Add markers for all vehicles with live data
        vehicleData.forEach((vehicle) => {
          const markerEl = document.createElement('div');
          markerEl.className = 'mapbox-marker';
          markerEl.style.width = '20px';
          markerEl.style.height = '20px';
          markerEl.style.borderRadius = '50%';
          markerEl.style.backgroundColor = vehicle.Speed === 0 ? '#ef4444' : 
                                        vehicle.Speed < 30 ? '#eab308' : '#22c55e';
          markerEl.style.border = '2px solid white';
          markerEl.style.cursor = 'pointer';
          markerEl.title = `${vehicle.Plate} - ${vehicle.Speed} km/h`;

          // Create popup with vehicle information
          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">${vehicle.Plate}</h3>
              <div style="font-size: 12px; color: #6b7280;">
                <p style="margin: 4px 0;"><strong>Speed:</strong> ${vehicle.Speed} km/h</p>
                <p style="margin: 4px 0;"><strong>Location:</strong> ${vehicle.Address || 'Unknown'}</p>
                <p style="margin: 4px 0;"><strong>Time:</strong> ${formatTime(vehicle.LocTime)}</p>
                ${vehicle.DriverName ? `<p style="margin: 4px 0;"><strong>Driver:</strong> ${vehicle.DriverName}</p>` : ''}
                ${vehicle.Geozone ? `<p style="margin: 4px 0;"><strong>Zone:</strong> ${vehicle.Geozone}</p>` : ''}
                ${vehicle.Head ? `<p style="margin: 4px 0;"><strong>Route:</strong> ${vehicle.Head}</p>` : ''}
              </div>
            </div>
          `);

          const marker = new mapboxgl.Marker(markerEl)
            .setLngLat([vehicle.Longitude, vehicle.Latitude])
            .setPopup(popup)
            .addTo(map);
        });

        // Center map on selected vehicle if available
        if (selectedVehicle && typeof map.flyTo === 'function') {
          map.flyTo({
            center: [selectedVehicle.Longitude, selectedVehicle.Latitude],
            zoom: 15,
            duration: 2000
          });
        }
      } catch (error) {
        console.error('Error updating markers:', error);
      }
    };

    updateMarkers();
  }, [map, mapboxgl, vehicleData, selectedVehicle]);

  // Auto-refresh vehicle data every 30 seconds
  useEffect(() => {
    fetchVehicleData();
    
    const interval = setInterval(() => {
      fetchVehicleData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchVehicleData]);

  // Center map on selected vehicle
  useEffect(() => {
    if (!map || !selectedVehicle) return;

    // Only call flyTo on actual Mapbox map instances, not on OpenStreetMap fallback
    if (map !== 'openstreetmap' && typeof map.flyTo === 'function') {
      map.flyTo({
        center: [selectedVehicle.Longitude, selectedVehicle.Latitude],
        zoom: 15,
        duration: 2000
      });
    } else if (map === 'openstreetmap') {
      // For OpenStreetMap, we can update the iframe to center on the selected vehicle
      console.log('OpenStreetMap: Centering on vehicle', selectedVehicle.Plate);
      // Note: OpenStreetMap iframe doesn't support programmatic centering
      // The user will need to manually navigate to see the vehicle location
    }
  }, [map, selectedVehicle]);

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleString();
    } catch {
      return timeString;
    }
  };

  const getVehicleInfo = (vehicleData: VehicleData) => {
    const plate = vehicleData.Plate;
    return vehiclePlateMap[plate] || {};
  };

  const getVehicleDisplayName = (vehicleData: VehicleData) => {
    const vehicleInfo = getVehicleInfo(vehicleData);
    return vehicleInfo.company || customer?.company || 'External Vehicle';
  };

  const getLiveDataForVehicle = (vehicle: Vehicle) => {
    const plate = vehicle.group_name || vehicle.new_registration || vehicle.registration || vehicle.plate_number;
    return vehicleData.find(v => v.Plate === plate);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 w-12 h-12 text-red-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">Error Loading Map</h3>
          <p className="text-gray-500">{error}</p>
          <Button onClick={fetchVehicleData} className="mt-4">
            <RefreshCw className="mr-2 w-4 h-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button and API status */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-xl">Live Vehicle Tracking</h2>
          <p className="text-gray-500 text-sm">
            {vehicles.length} vehicles • {vehicleData.length} with live data
          </p>
          <p className="mt-1 text-gray-400 text-xs">
            API Status: {apiStatus}
          </p>
          <p className="text-gray-400 text-xs">
            Map: {map === 'openstreetmap' ? 'OpenStreetMap (fallback)' : map ? 'Mapbox' : 'Loading...'}
          </p>
        </div>
        <Button 
          onClick={fetchVehicleData} 
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`mr-2 w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </Button>
      </div>

      {/* Vehicle Cards and Map Layout */}
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
        {/* Vehicle Cards */}
        <div className="space-y-4 lg:col-span-1 max-h-[600px] overflow-y-auto">
          {vehicles.map((vehicle) => {
            const liveData = getLiveDataForVehicle(vehicle);
            const isSelected = selectedVehicle?.Plate === (liveData?.Plate || '');
            const plate = vehicle.group_name || vehicle.new_registration || vehicle.registration || vehicle.plate_number;
            
            return (
              <Card 
                key={vehicle.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                } ${liveData ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
                onClick={() => {
                  if (liveData) {
                    setSelectedVehicle(liveData);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className={`flex justify-center items-center rounded-lg w-10 h-10 ${
                        liveData ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Car className={`w-5 h-5 ${
                          liveData ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="font-semibold text-gray-900 text-lg">
                          {plate || 'Unknown Plate'}
                        </CardTitle>
                        <p className="text-gray-500 text-sm">
                          {vehicle.company || customer?.company || 'Unknown Company'}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={liveData ? "default" : "secondary"}
                      className={liveData ? "bg-green-500" : ""}
                    >
                      {liveData ? 'Live' : 'Offline'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {vehicle.comment && (
                    <div className="text-gray-600 text-sm">
                      <span className="font-medium">Comment:</span> {vehicle.comment}
                    </div>
                  )}
                  
                  {liveData ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Gauge className="w-4 h-4 text-blue-600" />
                        <span><strong>Speed:</strong> {liveData.Speed} km/h</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="truncate">
                          <strong>Location:</strong> {liveData.Address || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span>
                          <strong>Last Update:</strong> {formatTime(liveData.LocTime)}
                        </span>
                      </div>
                      
                      {liveData.Geozone && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Navigation className="w-4 h-4 text-purple-600" />
                          <span><strong>Zone:</strong> {liveData.Geozone}</span>
                        </div>
                      )}
                      
                      {liveData.DriverName && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Target className="w-4 h-4 text-indigo-600" />
                          <span><strong>Driver:</strong> {liveData.DriverName}</span>
                        </div>
                      )}

                      {liveData.Head && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Navigation className="w-4 h-4 text-gray-600" />
                          <span className="truncate"><strong>Route:</strong> {liveData.Head}</span>
                        </div>
                      )}

                      {liveData.Mileage && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Gauge className="w-4 h-4 text-gray-600" />
                          <span><strong>Mileage:</strong> {liveData.Mileage} km</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      No live tracking data available
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <Button 
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      disabled={!liveData}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (liveData) {
                          setSelectedVehicle(liveData);
                        }
                      }}
                    >
                      {isSelected ? 'Selected' : liveData ? 'Show on Map' : 'No Data'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Map - Always show the map */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="relative">
                <div 
                  ref={mapContainer} 
                  className="bg-gray-100 rounded-lg w-full h-[600px]"
                />
                
                {/* Loading overlay */}
                {loading && (
                  <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-75 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="border-b-2 border-blue-600 rounded-full w-6 h-6 animate-spin"></div>
                      <span>Loading map...</span>
                    </div>
                  </div>
                )}
                
                {/* Error overlay */}
                {error && (
                  <div className="absolute inset-0 flex justify-center items-center bg-red-50 rounded-lg">
                    <div className="bg-white shadow-lg p-6 border border-red-200 rounded-lg text-center">
                      <AlertCircle className="mx-auto mb-4 w-12 h-12 text-red-400" />
                      <p className="mb-2 font-medium text-red-800">Map Loading Error</p>
                      <p className="mb-4 text-red-600 text-sm">{error}</p>
                      <div className="space-y-2">
                        <Button 
                          onClick={() => {
                            setError(null);
                            setMap(null);
                            setMapboxgl(null);
                            // Force re-initialization
                            setTimeout(() => {
                              if (mapContainer.current) {
                                const event = new Event('resize');
                                window.dispatchEvent(event);
                              }
                            }, 100);
                          }} 
                          variant="outline" 
                          size="sm"
                        >
                          <RefreshCw className="mr-2 w-4 h-4" />
                          Retry Map
                        </Button>
                        <div className="text-gray-500 text-xs">
                          <p>If the issue persists, check:</p>
                          <ul className="mt-1 list-disc list-inside">
                            <li>Browser console for errors</li>
                            <li>Mapbox token validity</li>
                            <li>Network connectivity</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show overlay only when map is loaded but no live data */}
                {!loading && !error && map && vehicleData.length === 0 && (
                  <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-50 rounded-lg">
                    <div className="bg-white shadow-lg p-6 rounded-lg text-center">
                      <MapPin className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                      <p className="font-medium text-gray-500">No live vehicles available</p>
                      <p className="mt-1 text-gray-400 text-sm">The map is ready, but no live tracking data is currently available</p>
                      <Button 
                        onClick={fetchVehicleData} 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                      >
                        <RefreshCw className="mr-2 w-4 h-4" />
                        Check for Updates
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Fallback map info when no map is loaded */}
                {!loading && !error && !map && (
                  <div className="absolute inset-0 flex justify-center items-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <MapPin className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                      <p className="font-medium text-gray-500">Map Initializing...</p>
                      <p className="mt-1 text-gray-400 text-sm">Please wait while the map loads</p>
                      <div className="mt-4">
                        <div className="mx-auto border-b-2 border-blue-600 rounded-full w-6 h-6 animate-spin"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* OpenStreetMap fallback */}
                {!loading && !error && map === 'openstreetmap' && (
                  <div className="absolute inset-0">
                    <iframe
                      src="https://www.openstreetmap.org/export/embed.html?bbox=16.0,-35.0,33.0,-22.0&layer=mapnik&marker=-28.8166,24.9916"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      style={{ borderRadius: '8px' }}
                      title="OpenStreetMap Fallback"
                    />
                    <div className="top-2 right-2 absolute bg-white bg-opacity-90 px-2 py-1 rounded text-gray-600 text-xs">
                      OpenStreetMap (Mapbox unavailable)
                    </div>
                    
                    {/* Show vehicle location info for OpenStreetMap */}
                    {vehicleData.length > 0 && (
                      <div className="bottom-2 left-2 absolute bg-white bg-opacity-90 p-3 rounded max-w-xs text-gray-600 text-xs">
                        <p className="mb-1 font-medium">Vehicle Locations:</p>
                        <p className="mb-2 text-gray-500 text-xs">
                          {vehicleData.length} vehicle{vehicleData.length > 1 ? 's' : ''} with live data
                        </p>
                        {vehicleData.slice(0, 3).map((vehicle, index) => (
                          <div key={index} className="mb-1 text-xs">
                            <span className="font-medium">{vehicle.Plate}:</span> 
                            <span className="text-gray-500"> {vehicle.Latitude.toFixed(4)}, {vehicle.Longitude.toFixed(4)}</span>
                          </div>
                        ))}
                        {vehicleData.length > 3 && (
                          <p className="text-gray-400 text-xs">...and {vehicleData.length - 3} more</p>
                        )}
                        <p className="mt-2 text-blue-600 text-xs">
                          💡 Tip: Use the map controls to navigate to vehicle locations
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VehicleMapView; 