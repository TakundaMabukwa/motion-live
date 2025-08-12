'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ApiStatus {
  success: boolean;
  status: number;
  statusText: string;
  responseTime: string;
  message: string;
  error?: string;
  data?: any;
  timestamp: string;
}

export default function VehicleApiStatusPage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [vehicleDataLoading, setVehicleDataLoading] = useState(false);

  const testApiStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-vehicle-api');
      const data = await response.json();
      setApiStatus(data);
    } catch (error) {
      console.error('Error testing API:', error);
      setApiStatus({
        success: false,
        status: 0,
        statusText: 'Connection Failed',
        responseTime: 'N/A',
        message: 'Failed to connect to test endpoint',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testVehicleData = async () => {
    setVehicleDataLoading(true);
    try {
      const response = await fetch('/api/vehicle-live-data?all=true');
      const data = await response.json();
      setVehicleData(data);
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
      setVehicleData({ error: 'Failed to fetch vehicle data' });
    } finally {
      setVehicleDataLoading(false);
    }
  };

  useEffect(() => {
    testApiStatus();
  }, []);

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <div className="flex justify-between items-center">
        <h1 className="font-bold text-3xl">Vehicle API Status</h1>
        <Button onClick={testApiStatus} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Test API Status
        </Button>
      </div>

      {/* API Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            External Vehicle API Status
            {apiStatus && (
              <Badge variant={apiStatus.success ? 'default' : 'destructive'}>
                {apiStatus.success ? 'Online' : 'Offline'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiStatus ? (
            <div className="space-y-4">
              <div className="gap-4 grid grid-cols-2">
                <div>
                  <p className="font-medium text-gray-500 text-sm">Status</p>
                  <p className="text-lg">{apiStatus.status} {apiStatus.statusText}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500 text-sm">Response Time</p>
                  <p className="text-lg">{apiStatus.responseTime}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500 text-sm">Message</p>
                  <p className="text-lg">{apiStatus.message}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500 text-sm">Timestamp</p>
                  <p className="text-sm">{new Date(apiStatus.timestamp).toLocaleString()}</p>
                </div>
              </div>
              
              {apiStatus.error && (
                <div className="bg-red-50 p-4 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <XCircle className="mr-2 w-5 h-5 text-red-400" />
                    <p className="font-medium text-red-800">Error</p>
                  </div>
                  <p className="mt-1 text-red-700">{apiStatus.error}</p>
                </div>
              )}

              {apiStatus.data && (
                <div className="bg-green-50 p-4 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <CheckCircle className="mr-2 w-5 h-5 text-green-400" />
                    <p className="font-medium text-green-800">Sample Data</p>
                  </div>
                  <pre className="mt-2 overflow-auto text-green-700 text-sm">
                    {JSON.stringify(apiStatus.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="mr-2 w-6 h-6 animate-spin" />
              <span>Testing API status...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Data Test Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Vehicle Data Test
            <Button 
              onClick={testVehicleData} 
              disabled={vehicleDataLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${vehicleDataLoading ? 'animate-spin' : ''}`} />
              Test Vehicle Data
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vehicleData ? (
            <div className="space-y-4">
              {vehicleData.error ? (
                <div className="bg-red-50 p-4 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <XCircle className="mr-2 w-5 h-5 text-red-400" />
                    <p className="font-medium text-red-800">Error</p>
                  </div>
                  <p className="mt-1 text-red-700">{vehicleData.error}</p>
                  {vehicleData.message && (
                    <p className="mt-1 text-red-600">{vehicleData.message}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <Badge variant="default">Total: {vehicleData.total || 0}</Badge>
                    <Badge variant="secondary">Active: {vehicleData.active || 0}</Badge>
                  </div>
                  
                  {vehicleData.vehicles && vehicleData.vehicles.length > 0 ? (
                    <div className="space-y-2">
                      <p className="font-medium text-sm">Vehicles:</p>
                      {vehicleData.vehicles.slice(0, 3).map((vehicle: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-md">
                          <p className="font-medium">{vehicle.plate || vehicle.group_name || 'Unknown'}</p>
                          {vehicle.live_data && (
                            <div className="mt-1 text-gray-600 text-sm">
                              <p>Speed: {vehicle.live_data.speed || 0} km/h</p>
                              <p>Location: {vehicle.live_data.latitude}, {vehicle.live_data.longitude}</p>
                              <p>Last Update: {vehicle.live_data.last_update}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      {vehicleData.vehicles.length > 3 && (
                        <p className="text-gray-500 text-sm">... and {vehicleData.vehicles.length - 3} more</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-md">
                      <div className="flex items-center">
                        <AlertCircle className="mr-2 w-5 h-5 text-yellow-400" />
                        <p className="text-yellow-800">No vehicles found</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-gray-500 text-center">
              Click "Test Vehicle Data" to check the vehicle data endpoint
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
