'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/cost-center/macsteel/Header';
import { Sidebar } from '@/components/cost-center/macsteel/Sidebar';
import { VehicleGrid } from '@/components/cost-center/macsteel/VehicleGrid';
import { DashboardMetrics } from '@/components/cost-center/macsteel/DashboardMetric';
import { VehicleTable } from '@/components/cost-center/macsteel/VehicleTable';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  registration: string;
  driver: string;
  location: string;
  cpk: string;
  odometer: number;
  safetyInfo: string;
  engineStatus: string;
  status: 'active' | 'inactive' | 'warning' | 'maintenance';
  costCenterId: string;
  startTime: string;
  actionStatus: string | null;
  // Add live data fields
  liveData?: {
    speed: number | null;
    latitude: number;
    longitude: number;
    locTime: string;
    mileage: number;
    geozone: string;
    driverName: string;
    temperature: string;
    head: string;
  };
}

interface MacsCompany {
  id: string;
  company: string;
  new_account_number: string;
  vehicle_count: number;
}

interface VehicleFromAPI {
  id: string;
  company: string;
  new_account_number: string;
  registration?: string;
  driver?: string;
  location?: string;
  cpk?: string;
  odometer?: number;
  safetyInfo?: string;
  engineStatus?: string;
  status?: string;
  startTime?: string;
  group_name?: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface LiveVehicleData {
  Plate: string;
  Speed: number | null;
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

interface VehicleWithLiveData {
  id: string;
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
  };
}

export default function Home() {
  const [selectedSection, setSelectedSection] = useState('utilisation');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [macsCompanies, setMacsCompanies] = useState<MacsCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanyVehicles, setSelectedCompanyVehicles] = useState<Vehicle[]>([]);
  const [liveData, setLiveData] = useState<LiveVehicleData[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const fetchAllCompanies = async () => {
    try {
      setLoadingCompanies(true);
      console.log('Fetching MACS companies...');
      const response = await fetch('/api/companies');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('Failed to fetch MACS companies');
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        console.log('Processed MACS companies:', data.companies);
        setMacsCompanies(data.companies || []);
      } else {
        throw new Error(data.error || 'Failed to fetch MACS companies');
      }
    } catch (error) {
      console.error('Error fetching MACS companies:', error);
      toast.error('Failed to load MACS companies');
      setMacsCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchCompanyVehicles = async (companyName: string) => {
    try {
      setLoadingVehicles(true);
      console.log('fetchCompanyVehicles called with company:', companyName);
      
      if (!macsCompanies || macsCompanies.length === 0) {
        console.log('No companies available, skipping vehicle fetch');
        return;
      }
      
      const company = macsCompanies.find(c => c.company === companyName);
      if (!company) {
        console.error('Company not found:', companyName);
        console.log('Available companies:', macsCompanies.map(c => c.company));
        return;
      }

      console.log('Found company:', company);
      const response = await fetch(`/api/vehicles-by-company?accountNumber=${company.new_account_number}`);
      console.log('Vehicle response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Vehicle API Error:', errorText);
        throw new Error('Failed to fetch company vehicles');
      }
      
      const data = await response.json();
      console.log('Vehicle API Response:', data);
      
      if (data.success && data.vehicles) {
        // Transform API vehicles to match our Vehicle interface
        const transformedVehicles: Vehicle[] = data.vehicles.map((vehicle: VehicleFromAPI, index: number) => {
          return {
            id: vehicle.id || index.toString(),
            registration: vehicle.group_name || vehicle.registration || 'Unknown',
            driver: vehicle.driver || 'No Driver',
            location: vehicle.location || 'Unknown Location',
            cpk: vehicle.cpk || '0 Km/l',
            odometer: typeof vehicle.odometer === 'number' ? vehicle.odometer : 0,
            safetyInfo: vehicle.safetyInfo || 'No Info',
            engineStatus: vehicle.engineStatus || 'Unknown',
            status: (vehicle.status as 'active' | 'inactive' | 'warning' | 'maintenance') || 'inactive',
            costCenterId: '1', // Default cost center
            startTime: vehicle.startTime || 'Unknown',
            actionStatus: null
          };
        });

        console.log('Transformed vehicles:', transformedVehicles);
        setSelectedCompanyVehicles(transformedVehicles);
      } else {
        throw new Error(data.error || 'Failed to fetch company vehicles');
      }
    } catch (error) {
      console.error('Error fetching company vehicles:', error);
      toast.error('Failed to load company vehicles');
      setSelectedCompanyVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Fetch MACS companies on component mount
  useEffect(() => {
    fetchAllCompanies();
  }, [selectedSection]);

  // Fetch vehicles for selected company or section
  useEffect(() => {
    console.log('Vehicle fetch effect triggered:', { selectedSection, selectedCompany, macsCompaniesLength: macsCompanies?.length || 0 });
    
    // Don't run if companies haven't been loaded yet
    if (!macsCompanies || macsCompanies.length === 0) {
      console.log('Companies not loaded yet, skipping vehicle fetch');
      return;
    }
    
    if (selectedSection === 'utilisation') {
      // For utilisation section, only fetch if a specific company is selected
      if (selectedCompany && selectedCompany !== 'all') {
        console.log('Fetching vehicles for utilisation section, company:', selectedCompany);
        fetchCompanyVehicles(selectedCompany);
      } else {
        console.log('Clearing vehicles for utilisation section (no company selected)');
        setSelectedCompanyVehicles([]);
      }
    } else if (selectedSection === 'starttime' || selectedSection === 'vehicles' || selectedSection === 'drivers') {
      // For other sections, fetch vehicles from the first available company
      if (macsCompanies && macsCompanies.length > 0 && macsCompanies[0]) {
        console.log(`Fetching vehicles for ${selectedSection} section, first company:`, macsCompanies[0].company);
        fetchCompanyVehicles(macsCompanies[0].company);
      } else {
        console.log(`No companies available for ${selectedSection} section`);
      }
    }
  }, [selectedCompany, selectedSection, macsCompanies]);

  // Additional effect to fetch vehicles when companies are loaded for non-utilisation sections
  useEffect(() => {
    if ((selectedSection === 'starttime' || selectedSection === 'vehicles' || selectedSection === 'drivers') && 
        macsCompanies && macsCompanies.length > 0 && macsCompanies[0] && 
        selectedCompanyVehicles.length === 0) {
      console.log(`Fetching vehicles for ${selectedSection} section after companies loaded`);
      fetchCompanyVehicles(macsCompanies[0].company);
    }
  }, [macsCompanies, selectedSection, selectedCompanyVehicles.length]);

  // Update vehicles with live data when live data changes - more responsive
  useEffect(() => {
    if (selectedCompanyVehicles.length > 0 && liveData.length > 0) {
      const updatedVehicles = selectedCompanyVehicles.map(vehicle => {
        const vehiclePlate = vehicle.registration;
        const matchingLiveData = liveData.find(live => live.Plate === vehiclePlate);
        
        const liveDataForVehicle = matchingLiveData ? {
          speed: matchingLiveData.Speed,
          latitude: matchingLiveData.Latitude,
          longitude: matchingLiveData.Longitude,
          locTime: matchingLiveData.LocTime,
          mileage: matchingLiveData.Mileage,
          geozone: matchingLiveData.Geozone,
          driverName: matchingLiveData.DriverName,
          temperature: matchingLiveData.Temperature,
          head: matchingLiveData.Head
        } : vehicle.liveData;

        return {
          ...vehicle,
          liveData: liveDataForVehicle
        };
      });

      setSelectedCompanyVehicles(updatedVehicles);
      console.log('Updated vehicles with live data:', updatedVehicles);
    }
  }, [liveData]); // Remove selectedCompanyVehicles.length dependency to avoid infinite loops

  // Fetch live data periodically
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        // Use the vehicle-live-data API to get all vehicle feeds
        const response = await fetch('/api/vehicle-live-data?all=true');
        if (response.ok) {
          const data = await response.json();
          if (data.vehicles) {
            // Extract live data from vehicles that have it
            const liveDataArray = data.vehicles
              .filter((vehicle: VehicleWithLiveData) => vehicle.live_data)
              .map((vehicle: VehicleWithLiveData) => {
                const liveData = vehicle.live_data!; // Safe to use ! because we filtered for it
                return {
                  Plate: liveData.plate,
                  Speed: liveData.speed,
                  Latitude: liveData.latitude,
                  Longitude: liveData.longitude,
                  LocTime: liveData.last_update,
                  Quality: liveData.quality,
                  Mileage: liveData.mileage,
                  Pocsagstr: '',
                  Head: liveData.head,
                  Geozone: liveData.geozone,
                  DriverName: liveData.driver_name,
                  NameEvent: '',
                  Temperature: '',
                  Address: liveData.address
                };
              });
            
            setLiveData(liveDataArray);
            console.log('Live data updated:', liveDataArray.length, 'vehicles');
          }
        }
      } catch (error) {
        console.error('Error fetching live data:', error);
      }
    };

    // Fetch immediately
    fetchLiveData();

    // Set up interval to fetch every 10 seconds for more responsive updates
    const interval = setInterval(fetchLiveData, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleActionSelect = (vehicleId: string, action: string) => {
    // Update selected company vehicles if they exist
    if (selectedCompanyVehicles.length > 0) {
      setSelectedCompanyVehicles(prev => 
        prev.map(vehicle => 
          vehicle.id === vehicleId 
            ? { ...vehicle, actionStatus: action }
            : vehicle
        )
      );
    }
  };

  // Use selected company vehicles if available, otherwise use filtered vehicles
  const displayVehicles = (selectedSection === 'utilisation' && selectedCompany !== 'all' && selectedCompanyVehicles.length > 0) 
    ? selectedCompanyVehicles 
    : selectedSection === 'starttime' || selectedSection === 'vehicles' || selectedSection === 'drivers'
    ? selectedCompanyVehicles // Show vehicles for other sections
    : []; // Show no vehicles when no company is selected for utilisation

  const metrics = {
    totalVehicles: displayVehicles.length,
    departingBefore9AM: displayVehicles.filter(v => v.startTime !== 'Unknown' && v.startTime !== '').length,
    onTimePercentage: 75,
    notOnTimePercentage: 25
  };

  // Show loading state while companies are being fetched
  if (loadingCompanies) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Header 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        
        <div className="flex">
          <Sidebar
            selectedSection={selectedSection}
            setSelectedSection={setSelectedSection}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
          
          <main className="flex-1 lg:ml-64 transition-all duration-300">
            <div className="flex justify-center items-center h-screen">
              <div className="text-center">
                <Loader2 className="mx-auto mb-4 w-8 h-8 animate-spin" />
                <p className="text-gray-600">Loading MACS companies...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex">
        <Sidebar
          selectedSection={selectedSection}
          setSelectedSection={setSelectedSection}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        
        <main className="flex-1 lg:ml-64 transition-all duration-300">
          <div className="space-y-8 p-4 lg:p-8">
            {/* Page Title */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-bold text-gray-900 text-2xl lg:text-3xl">
                  {selectedSection === 'utilisation' ? 'Utilisation Dashboard' : 
                   selectedSection === 'starttime' ? 'Start Time Dashboard' :
                   selectedSection === 'vehicles' ? 'Vehicles Dashboard' :
                   selectedSection === 'drivers' ? 'Drivers Dashboard' :
                   'Dashboard'}
                </h1>
              </div>
              
              {/* MACS Companies Dropdown - Only show on utilisation dashboard */}
              {selectedSection === 'utilisation' && (
                <div className="flex items-center gap-4">
                  <label className="font-medium text-gray-700 text-sm">MACS Company:</label>
                  <Select 
                    value={selectedCompany} 
                    onValueChange={setSelectedCompany}
                    disabled={loadingCompanies}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder={loadingCompanies ? "Loading MACS companies..." : "Select MACS company"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All MACS Companies</SelectItem>
                      {macsCompanies && macsCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.company}>
                          {company.company} ({company.vehicle_count} vehicles)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingCompanies && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              )}
            </div>

            {/* MACS Company Info - Only show on utilisation dashboard */}
            {selectedSection === 'utilisation' && selectedCompany && selectedCompany !== 'all' && macsCompanies && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-blue-900">Selected MACS Company</h3>
                      <p className="text-blue-700">{selectedCompany}</p>
                      <p className="text-blue-600 text-sm">
                        Account: {macsCompanies.find(c => c.company === selectedCompany)?.new_account_number || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-600 text-sm">Vehicles</p>
                      <p className="font-bold text-blue-900 text-2xl">
                        {selectedCompanyVehicles.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Companies Summary - Only show on utilisation dashboard */}
            {selectedSection === 'utilisation' && selectedCompany === 'all' && macsCompanies && macsCompanies.length > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-green-900">All MACS Companies</h3>
                      <p className="text-green-700">Showing all MACS companies</p>
                      <p className="text-green-600 text-sm">
                        Total MACS Companies: {macsCompanies.length}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 text-sm">Total Vehicles</p>
                      <p className="font-bold text-green-900 text-2xl">
                        {macsCompanies.reduce((sum, company) => sum + company.vehicle_count, 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metrics */}
            <DashboardMetrics metrics={metrics} />

            {/* Vehicle Grid */}
            <VehicleGrid 
              vehicles={displayVehicles}
              title={selectedSection === 'utilisation' ? 'Fleet Status' : 
                     selectedSection === 'starttime' ? 'Start Time Status' :
                     selectedSection === 'vehicles' ? 'Vehicle Status' :
                     selectedSection === 'drivers' ? 'Driver Status' :
                     'Vehicle Status'}
            />

            {/* Loading indicator */}
            {loadingVehicles && (
              <div className="flex justify-center items-center p-8">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-2 w-8 h-8 animate-spin" />
                  <p className="text-gray-600">Loading vehicles...</p>
                </div>
              </div>
            )}

            {/* Vehicle Table */}
            {!loadingVehicles && (
              <VehicleTable 
                vehicles={displayVehicles} 
                onActionSelect={handleActionSelect}
                isStartTimeSection={selectedSection === 'starttime'}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}