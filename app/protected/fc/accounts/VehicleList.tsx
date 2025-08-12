'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Car, Search } from 'lucide-react';
import Link from 'next/link';

export default function VehiclesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get initial company from URL
  const companyName = searchParams.get('company') || '';

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = `/api/vehicles?company=${encodeURIComponent(companyName)}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error('Failed to fetch vehicles');
        }

        const data = await response.json();
        setVehicles(data.vehicles || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [companyName]);

  // Filter vehicles based on search query
  const filteredVehicles = vehicles.filter(vehicle => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (vehicle.new_registration?.toLowerCase().includes(query)) ||
      (vehicle.new_account_number?.toLowerCase().includes(query)) ||
      (vehicle.company?.toLowerCase().includes(query)) ||
      (vehicle.group_name?.toLowerCase().includes(query))
    );
  });

  const handleAddVehicle = () => {
    router.push('/vehicles/new');
  };

  return (
    <div className="p-6">
      {/* Header with Search and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Vehicles for {companyName}
        </h1>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search vehicles..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddVehicle} className="whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {loading && (
        <div className="flex items-center gap-2 p-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          <p>Loading vehicles...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h3 className="text-sm font-medium text-red-800">Error loading vehicles</h3>
          <p className="text-sm text-red-700 mt-2">{error}</p>
        </div>
      )}

      {!loading && !error && filteredVehicles.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800">No vehicles found</h3>
          <p className="text-sm text-blue-700 mt-2">
            {searchQuery ? 'No matches for your search' : 'No vehicles available'}
          </p>
        </div>
      )}

      {/* Vehicles List */}
      {!loading && filteredVehicles.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Car className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {vehicle.new_registration || 'No registration'}
                      </p>
                      <p className="text-sm text-gray-500">{vehicle.company}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Account Number</p>
                    <p className="font-medium text-gray-800">
                      {vehicle.new_account_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Group</p>
                    <p className="font-medium text-gray-800">
                      {vehicle.group_name || 'N/A'}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Link href={`/vehicle?id=${vehicle.id}`}>
                      <Button variant="outline" className="border-blue-200 hover:bg-blue-50">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}