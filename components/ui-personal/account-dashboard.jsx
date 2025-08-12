'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  FileText, 
  MapPin, 
  Clock, 
  Gauge, 
  Navigation,
  Plus,
  RefreshCw,
  Target,
  Quote,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import ClientQuoteForm from './client-quote-form';

export default function AccountDashboard({ customer, accountNumber, onNewQuote }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [clientQuotes, setClientQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [accountVehicles, setAccountVehicles] = useState([]); // For quote form
  const [loadingAccountVehicles, setLoadingAccountVehicles] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (accountNumber) {
      fetchLiveVehicleData();
      fetchAccountVehicles(); // Fetch vehicles for quote form
      // Set up polling every 30 seconds
      const interval = setInterval(fetchLiveVehicleData, 30000);
      return () => clearInterval(interval);
    }
  }, [accountNumber]);

  useEffect(() => {
    // Initialize Mapbox
    if (typeof window !== 'undefined' && !mapInstance.current) {
      const mapboxgl = window.mapboxgl;
      if (!mapboxgl) {
        console.warn('Mapbox GL JS not loaded');
        return;
      }
      
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example';
      mapboxgl.accessToken = token;
      
      try {
        mapInstance.current = new mapboxgl.Map({
          container: mapRef.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [-26.308411, 28.139126], // Default to Johannesburg
          zoom: 10
        });

        // Add navigation controls
        mapInstance.current.addControl(new mapboxgl.NavigationControl());
        
        // Ensure map loads even if no vehicles
        mapInstance.current.on('load', () => {
          console.log('Map loaded successfully');
        });
        
        mapInstance.current.on('error', (e) => {
          console.error('Map error:', e);
        });
      } catch (error) {
        console.error('Error initializing map:', error);
      }
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
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = selectedVehicle?.id === vehicle.id ? '#3b82f6' : '#10b981';
          el.style.border = '3px solid white';
          el.style.cursor = 'pointer';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

          // Add marker to map
          new mapboxgl.Marker(el)
            .setLngLat([vehicle.live_data.longitude, vehicle.live_data.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="p-3 min-w-[200px]">
                  <h3 class="mb-2 font-bold text-lg">${vehicle.live_data.plate}</h3>
                  <div class="space-y-1 text-sm">
                    <p><strong>Speed:</strong> ${vehicle.live_data.speed} km/h</p>
                    <p><strong>Last Update:</strong> ${formatLastUpdate(vehicle.live_data.last_update)}</p>
                    ${vehicle.live_data.driver_name ? `<p><strong>Driver:</strong> ${vehicle.live_data.driver_name}</p>` : ''}
                    ${vehicle.live_data.geozone ? `<p><strong>Zone:</strong> ${vehicle.live_data.geozone}</p>` : ''}
                    ${vehicle.live_data.address ? `<p><strong>Address:</strong> ${vehicle.live_data.address}</p>` : ''}
                  </div>
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
        const avgLat = vehiclesWithLiveData.reduce((sum, v) => sum + v.live_data.latitude, 0) / vehiclesWithLiveData.length;
        const avgLng = vehiclesWithLiveData.reduce((sum, v) => sum + v.live_data.longitude, 0) / vehiclesWithLiveData.length;
        
        mapInstance.current.flyTo({
          center: [avgLng, avgLat],
          zoom: 12
        });
      } else if (vehiclesWithLiveData.length === 0) {
        // If no vehicles with live data, ensure map is centered on default location
        mapInstance.current.flyTo({
          center: [-26.308411, 28.139126], // Johannesburg
          zoom: 10
        });
      }
    }
  }, [vehicles, selectedVehicle]);

  const fetchLiveVehicleData = async () => {
    try {
      setLoading(true);
      
      // Fetch all vehicles from external feed
      const response = await fetch('/api/vehicle-live-data/all');
      if (!response.ok) {
        throw new Error(`Failed to fetch vehicle data: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Fetched vehicle data:', data);
      console.log('Vehicles count:', data.vehicles?.length || 0);
      console.log('Sample vehicle:', data.vehicles?.[0]);
      
      // Check if the API returned an error message
      if (data.error) {
        console.warn('API returned error:', data.error);
        toast.error(data.message || 'Vehicle tracking service is temporarily unavailable');
        setVehicles([]);
        return;
      }
      
      setVehicles(data.vehicles || []);
      
      // Show a message if no vehicles are available
      if (!data.vehicles || data.vehicles.length === 0) {
        toast.info('No active vehicles found. Vehicle tracking service may be temporarily unavailable.');
      }
    } catch (error) {
      console.error('Error fetching live vehicle data:', error);
      toast.error('Failed to load vehicle data. Please try again later.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientQuotes = async () => {
    try {
      setLoadingQuotes(true);
      const response = await fetch(`/api/job-cards?account_number=${accountNumber}`);
      if (!response.ok) {
        throw new Error('Failed to fetch client quotes');
      }
      const data = await response.json();
      setClientQuotes(data.job_cards || []);
    } catch (error) {
      console.error('Error fetching client quotes:', error);
      toast.error('Failed to load client quotes');
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleNewQuote = () => {
    setShowQuoteForm(true);
  };

  const handleQuoteCreated = (newQuote) => {
    setShowQuoteForm(false);
    fetchClientQuotes(); // Refresh quotes list
    toast.success('Quote created successfully');
  };

  const handleCloseQuoteForm = () => {
    setShowQuoteForm(false);
  };

  // Fetch quotes when account number changes
  useEffect(() => {
    if (accountNumber) {
      fetchClientQuotes();
    }
  }, [accountNumber]);

  const handleVehicleClick = (vehicle) => {
    setSelectedVehicle(vehicle);
    if (vehicle.live_data && mapInstance.current) {
      mapInstance.current.flyTo({
        center: [vehicle.live_data.longitude, vehicle.live_data.latitude],
        zoom: 15
      });
    }
  };

  const formatLastUpdate = (timestamp) => {
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
  const totalVehicles = vehicles.length;
  const activeVehicles = vehiclesWithLiveData.length;

  // Fetch account vehicles for quote form
  const fetchAccountVehicles = async () => {
    try {
      setLoadingAccountVehicles(true);
      
      if (!accountNumber) {
        console.error('No account number available');
        toast.error('No account number available for vehicle fetching');
        return;
      }
      
      console.log('Fetching vehicles for account:', accountNumber);
      
      // First try the debug endpoint to see what's happening
      const debugResponse = await fetch(`/api/debug-vehicle-fetch?accountNumber=${encodeURIComponent(accountNumber)}`);
      const debugData = await debugResponse.json();
      console.log('Debug response:', debugData);
      
      const response = await fetch(`/api/vehicles-by-company?accountNumber=${encodeURIComponent(accountNumber)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch account vehicles');
      }
      const data = await response.json();
      
      if (data.success) {
        setAccountVehicles(data.vehicles || []);
      } else {
        throw new Error(data.error || 'Failed to fetch account vehicles');
      }
    } catch (error) {
      console.error('Error fetching account vehicles:', error);
      toast.error('Failed to load account vehicles');
    } finally {
      setLoadingAccountVehicles(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-2xl">Dashboard</h1>
          <p className="text-gray-600">Overview of your fleet management operations</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option>All</option>
          </select>
        </div>
      </div>

      {/* Main Content and Side Panel */}
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-4">
        {/* Main Content - 3 columns */}
        <div className="space-y-6 lg:col-span-3">
          {/* Live Vehicle Map - Full Width at Top */}
          <Card className="h-[400px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Live Vehicle Map
              </CardTitle>
            </CardHeader>
            <CardContent className="relative p-0 h-full">
              <div 
                ref={mapRef}
                className="rounded-lg w-full h-full"
                style={{ minHeight: '300px' }}
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

          {/* Statistics Cards */}
          <div className="gap-6 grid grid-cols-1 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Total Vehicles</CardTitle>
                <Car className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">{totalVehicles}</div>
                <p className="text-muted-foreground text-xs">
                  Registered vehicles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Active Vehicles</CardTitle>
                <Navigation className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">{activeVehicles}</div>
                <p className="text-muted-foreground text-xs">
                  With live tracking data
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Active Trips</CardTitle>
                <MapPin className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">0</div>
                <p className="text-muted-foreground text-xs">
                  Current trips
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Stop Points</CardTitle>
                <MapPin className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">0</div>
                <p className="text-muted-foreground text-xs">
                  Available stops
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Client Quotes</CardTitle>
                <FileText className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">{clientQuotes.length}</div>
                <p className="text-muted-foreground text-xs">
                  Recent quotations
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Quick Access
              </CardTitle>
              <p className="text-gray-600 text-sm">Create new entries in your fleet management system</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  onClick={handleNewQuote}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  New Client Quote
                </Button>
                <Button 
                  onClick={fetchLiveVehicleData}
                  variant="outline"
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Info Cards - Full Width */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Vehicle Fleet ({vehicles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {vehicles.length === 0 ? (
                  <div className="py-8 text-center">
                    <Car className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                    <p className="text-gray-500 text-sm">No vehicles found</p>
                  </div>
                ) : (
                  vehicles.map((vehicle) => {
                    const isSelected = selectedVehicle?.id === vehicle.id;
                    const hasLiveData = !!vehicle.live_data;
                    const plate = vehicle.live_data?.plate || vehicle.group_name || vehicle.new_registration || vehicle.plate || 'Unknown Plate';
                    
                    return (
                      <div
                        key={vehicle.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-lg' 
                            : hasLiveData 
                              ? 'border-green-200 hover:border-green-300 bg-green-50' 
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleVehicleClick(vehicle)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="mb-1 font-bold text-gray-900 text-lg">
                              {plate}
                            </div>
                            <div className="text-gray-500 text-sm">
                              {vehicle.driver_name || vehicle.head || vehicle.beame_1 || 'No description'}
                            </div>
                            {vehicle.address && (
                              <div className="mt-1 text-gray-400 text-xs">
                                {vehicle.address}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {hasLiveData ? (
                              <>
                                <div className="flex items-center gap-1 font-medium text-green-600 text-sm">
                                  <Clock className="w-4 h-4" />
                                  <span>{formatLastUpdate(vehicle.live_data.last_update)}</span>
                                </div>
                                {vehicle.live_data.speed !== undefined && (
                                  <div className="flex items-center gap-1 mt-1 text-gray-600 text-sm">
                                    <Gauge className="w-4 h-4" />
                                    <span>{vehicle.live_data.speed} km/h</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-400 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>No live data</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
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
                          <div className="bg-gray-50 mt-3 p-2 rounded text-gray-500 text-xs">
                            <div className="gap-2 grid grid-cols-2">
                              <div>Lat: {vehicle.live_data.latitude.toFixed(4)}</div>
                              <div>Lng: {vehicle.live_data.longitude.toFixed(4)}</div>
                              {vehicle.live_data.mileage && (
                                <div>Mileage: {vehicle.live_data.mileage} km</div>
                              )}
                              {vehicle.live_data.quality && (
                                <div>Quality: {vehicle.live_data.quality}</div>
                              )}
                            </div>
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

        {/* Side Panel - Client Quotes */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Quote className="w-5 h-5" />
                Client Quotes
              </CardTitle>
              <p className="text-gray-600 text-sm">Recent quotations for this client</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingQuotes ? (
                  <div className="py-4 text-center">
                    <div className="mx-auto border-b-2 border-blue-600 rounded-full w-6 h-6 animate-spin"></div>
                    <p className="mt-2 text-gray-500 text-sm">Loading quotes...</p>
                  </div>
                ) : clientQuotes.length === 0 ? (
                  <div className="py-4 text-center">
                    <Quote className="mx-auto mb-2 w-8 h-8 text-gray-400" />
                    <p className="text-gray-500 text-sm">No quotes yet</p>
                    <Button 
                      onClick={handleNewQuote}
                      size="sm"
                      className="mt-2"
                    >
                      <Plus className="mr-2 w-4 h-4" />
                      Create Quote
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {clientQuotes.slice(0, 5).map((quote) => (
                        <div key={quote.id} className="hover:bg-gray-50 p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{quote.job_type || 'Installation'}</div>
                              <div className="text-gray-500 text-xs">
                                {new Date(quote.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge 
                              variant={quote.status === 'completed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {quote.status || 'Pending'}
                            </Badge>
                          </div>
                          {quote.description && (
                            <div className="mt-1 text-gray-600 text-xs">
                              {quote.description.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button 
                      onClick={handleNewQuote}
                      size="sm"
                      className="mt-3 w-full"
                    >
                      <Plus className="mr-2 w-4 h-4" />
                      New Quote
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quote Form Modal */}
      {showQuoteForm && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl">Create New Quote</h2>
              <Button 
                onClick={handleCloseQuoteForm}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <ClientQuoteForm
              customer={customer}
              vehicles={loadingAccountVehicles ? [] : accountVehicles} // Pass account vehicles for de-installation
              onClose={handleCloseQuoteForm}
              onQuoteCreated={handleQuoteCreated}
            />
          </div>
        </div>
      )}
    </div>
  );
}
