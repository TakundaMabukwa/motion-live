'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Truck, Search, AlertTriangle } from 'lucide-react';

export default function TestVehiclesListPage() {
  const [company, setCompany] = useState('ABC Manufacturing');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/test-vehicles-by-company?company=${encodeURIComponent(company)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Test vehicles response:', data);
      
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch vehicles");
      }

      setVehicles(data.vehicles || []);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company) {
      fetchVehicles();
    }
  }, [company]);

  return (
    <div className="mx-auto p-6 container">
      <div className="mb-6">
        <h1 className="mb-2 font-bold text-3xl">Test Vehicle List</h1>
        <p className="text-gray-600">Test the vehicle list functionality</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Vehicles by Company</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Enter company name"
              className="flex-1"
            />
            <Button onClick={fetchVehicles} disabled={loading}>
              <Search className="mr-2 w-4 h-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Count Card */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Vehicles</CardTitle>
            <Truck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{vehicles?.length || 0}</div>
            <p className="text-muted-foreground text-xs">
              {vehicles?.length === 1 ? 'Active vehicle' : 'Active vehicles'}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 border-gray-900 border-b-2 rounded-full w-8 h-8 animate-spin"></div>
              <p className="text-gray-600">Loading vehicles...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-red-500 text-center">
              <AlertTriangle className="mx-auto mb-4 w-12 h-12" />
              <p className="mb-2 font-medium">Error loading vehicles</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && vehicles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <span>Vehicles for {company}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vehicles.map((vehicle, index) => (
                <div key={vehicle.id || index} className="flex justify-between items-center hover:bg-gray-50 p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex justify-center items-center bg-blue-100 rounded-lg w-10 h-10">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {vehicle.new_registration || vehicle.registration_number || 'No Registration'}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {vehicle.make || 'Unknown'} {vehicle.model || 'Vehicle'}
                        {vehicle.manufactured_year && ` (${vehicle.manufactured_year})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={vehicle.active ? "default" : "secondary"}>
                      {vehicle.active ? 'Active' : 'Inactive'}
                    </Badge>
                    {vehicle.products && vehicle.products.length > 0 && (
                      <Badge variant="outline">
                        {vehicle.products.join(', ')}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && vehicles.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-gray-500 text-center">
              <Truck className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <p className="mb-2 font-medium">No vehicles found</p>
              <p className="text-sm">No vehicles found for company: {company}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 