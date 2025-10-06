'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Car, Search } from 'lucide-react';
import Link from 'next/link';

function VehiclesListContent() {
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
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4 mb-6">
        <h1 className="font-bold text-gray-800 text-2xl">
          Vehicles for {companyName}
        </h1>

        <div className="flex sm:flex-row flex-col gap-3 w-full md:w-auto">
          <div className="relative w-full">
            <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2" />
            <Input
              placeholder="Search vehicles..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddVehicle} className="whitespace-nowrap">
            <Plus className="mr-2 w-4 h-4" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {loading && (
        <div className="flex items-center gap-2 p-4">
          <div className="border-gray-900 border-b-2 rounded-full w-4 h-4 animate-spin"></div>
          <p>Loading vehicles...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 mb-6 p-4 border border-red-200 rounded-md">
          <h3 className="font-medium text-red-800 text-sm">Error loading vehicles</h3>
          <p className="mt-2 text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && filteredVehicles.length === 0 && (
        <div className="bg-blue-50 p-4 border border-blue-200 rounded-md">
          <h3 className="font-medium text-blue-800 text-sm">No vehicles found</h3>
          <p className="mt-2 text-blue-700 text-sm">
            {searchQuery ? 'No matches for your search' : 'No vehicles available'}
          </p>
        </div>
      )}

      {/* Vehicles List */}
      {!loading && filteredVehicles.length > 0 && (
        <div className="gap-4 grid grid-cols-1">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="items-center gap-4 grid grid-cols-1 md:grid-cols-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Car className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {vehicle.new_registration || 'No registration'}
                      </p>
                      <p className="text-gray-500 text-sm">{vehicle.company}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Account Number</p>
                    <p className="font-medium text-gray-800">
                      {vehicle.new_account_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Group</p>
                    <p className="font-medium text-gray-800">
                      {vehicle.group_name || 'N/A'}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Link href={`/vehicle?id=${vehicle.id}`}>
                      <Button variant="outline" className="hover:bg-blue-50 border-blue-200">
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

// Loading fallback component
function VehiclesListLoading() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="bg-gray-200 mb-2 rounded w-48 h-8 animate-pulse"></div>
        <div className="bg-gray-200 rounded w-96 h-4 animate-pulse"></div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg w-full h-32 animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

export default function VehiclesList() {
  return (
    <Suspense fallback={<VehiclesListLoading />}>
      <VehiclesListContent />
    </Suspense>
  );
}