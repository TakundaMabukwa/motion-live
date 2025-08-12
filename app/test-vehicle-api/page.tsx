'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Car, MapPin, Gauge, Clock } from 'lucide-react';

export default function TestVehicleAPIPage() {
  const [vehicleData, setVehicleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string>('Never');

  const fetchVehicleData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Testing vehicle API...');
      
      const response = await fetch('http://64.227.138.235:8000/latest');
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw API response:', data);
      
      // Handle both single object and array responses
      const vehicleArray = Array.isArray(data) ? data : [data];
      console.log('Processed array:', vehicleArray);
      
      setVehicleData(vehicleArray);
      setLastFetch(new Date().toLocaleTimeString());
      
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message);
      setVehicleData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicleData();
  }, []);

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <div className="text-center">
        <h1 className="mb-4 font-bold text-3xl">Vehicle API Test</h1>
        <p className="mb-6 text-gray-600">Testing the external vehicle tracking API</p>
      </div>

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle>API Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600 text-sm">
                Last fetch: <span className="font-medium">{lastFetch}</span>
              </p>
              <p className="text-gray-600 text-sm">
                Vehicles found: <span className="font-medium">{vehicleData.length}</span>
              </p>
            </div>
            <Button 
              onClick={fetchVehicleData} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`mr-2 w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Testing...' : 'Test API'}
            </Button>
          </div>
          
          {error && (
            <div className="bg-red-50 mt-4 p-4 border border-red-200 rounded-lg">
              <p className="font-medium text-red-800">Error:</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw Data */}
      <Card>
        <CardHeader>
          <CardTitle>Raw API Response</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(vehicleData, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Vehicle Cards */}
      {vehicleData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Data ({vehicleData.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {vehicleData.map((vehicle, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Car className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{vehicle.Plate || 'Unknown'}</h3>
                      <p className="text-gray-500 text-sm">Vehicle {index + 1}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Gauge className="w-4 h-4 text-blue-600" />
                      <span><strong>Speed:</strong> {vehicle.Speed || 0} km/h</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span><strong>Location:</strong> {vehicle.Latitude?.toFixed(6)}, {vehicle.Longitude?.toFixed(6)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span><strong>Time:</strong> {vehicle.LocTime || 'Unknown'}</span>
                    </div>
                    
                    {vehicle.Address && (
                      <div className="text-gray-600 text-xs truncate">
                        <strong>Address:</strong> {vehicle.Address}
                      </div>
                    )}
                    
                    {vehicle.Geozone && (
                      <div className="text-gray-600 text-xs">
                        <strong>Zone:</strong> {vehicle.Geozone}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-gray-600 text-sm list-decimal list-inside">
            <li>Click "Test API" to fetch live vehicle data</li>
            <li>Check the browser console for detailed logs</li>
            <li>Verify the data structure matches what the VehicleMapView expects</li>
            <li>If successful, the map should display vehicle markers</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
