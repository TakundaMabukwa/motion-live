'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car } from 'lucide-react';

export default function TestBlueVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBlueVehicles = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Testing BLUE-0001 vehicles fetch with pagination...');
      
      const response = await fetch('/api/vehicles-by-account?account_number=BLUE-0001&page=1&limit=10');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch vehicles: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Vehicles data received:', data);
      
      if (data.success) {
        setVehicles(data.vehicles || []);
        console.log(`Found ${data.totalCount} total vehicles, showing ${data.vehicles?.length || 0} on page ${data.currentPage}`);
      } else {
        setVehicles([]);
        setError(data.error || 'Failed to fetch vehicles');
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTestVehicles = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Creating test vehicles for BLUE-0001...');
      
      const response = await fetch('/api/vehicles-by-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountNumber: 'BLUE-0001' }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create vehicles: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Test vehicles created:', data);
      
      // Refresh the vehicles list
      await fetchBlueVehicles();
    } catch (err) {
      console.error('Error creating vehicles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex justify-between items-center">
        <h1 className="font-bold text-2xl">Test BLUE-0001 Vehicles</h1>
        <div className="space-x-2">
          <Button onClick={createTestVehicles} disabled={loading}>
            Create Test Vehicles
          </Button>
          <Button onClick={fetchBlueVehicles} disabled={loading}>
            Fetch Vehicles
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading...</span>
        </div>
      )}

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="gap-4 grid">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Vehicles for BLUE-0001 ({vehicles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <p className="text-gray-500">No vehicles found. Click "Create Test Vehicles" to add some test data.</p>
            ) : (
              <div className="space-y-3">
                 {vehicles.map((vehicle: any) => (
                   <div key={vehicle.id} className="p-3 border rounded-lg">
                     <div className="gap-4 grid grid-cols-2">
                       <div>
                         <p><strong>Registration:</strong> {vehicle.reg || 'N/A'}</p>
                         <p><strong>Make:</strong> {vehicle.make || 'N/A'}</p>
                         <p><strong>Model:</strong> {vehicle.model || 'N/A'}</p>
                         <p><strong>Year:</strong> {vehicle.year || 'N/A'}</p>
                         <p><strong>VIN:</strong> {vehicle.vin || 'N/A'}</p>
                       </div>
                       <div>
                         <p><strong>Company:</strong> {vehicle.company || 'N/A'}</p>
                         <p><strong>Account:</strong> {vehicle.new_account_number || 'N/A'}</p>
                         <p><strong>Fleet Number:</strong> {vehicle.fleet_number || 'N/A'}</p>
                         <p><strong>Colour:</strong> {vehicle.colour || 'N/A'}</p>
                         <p><strong>Total Rental:</strong> R{vehicle.total_rental || 0}</p>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test FC Account Page</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Test the FC account page with BLUE-0001:</p>
            <Button 
              onClick={() => window.open('/protected/fc/accounts/BLUE-0001?tab=vehicles', '_blank')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Open FC Account Page
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
