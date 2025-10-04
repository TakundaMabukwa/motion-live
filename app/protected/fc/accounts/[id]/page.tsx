'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

// Force dynamic rendering to avoid useSearchParams issues
export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Building, 
  Car,
  FileText,
  Plus,
  Clock,
  Navigation,
  Gauge,
  Calendar,
  Map,
  Quote
} from 'lucide-react';
import DashboardHeader from '@/components/shared/DashboardHeader';
import LiveVehicleMap from '@/components/vehicle-tracking/LiveVehicleMap';
import VehicleCards from '@/components/vehicle-tracking/VehicleCards';
import CustomerJobCards from '@/components/ui-personal/customer-job-cards';
import ClientQuoteForm from '@/components/ui-personal/client-quote-form';
import ClientJobCards from '@/components/ui-personal/client-job-cards';
import AccountDashboard from '@/components/ui-personal/account-dashboard';
import VehicleMapView from '@/components/ui-personal/vehicle-map-view';
import { toast } from 'sonner';
import { getVehiclesByAccountNumber, type Vehicle, type VehiclesResponse } from '@/lib/actions/vehicles';

function AccountDetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const accountId = params.id;
  const tab = searchParams.get('tab') || 'dashboard';
  
  const [customer, setCustomer] = useState(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesPage, setVehiclesPage] = useState(1);
  const [vehiclesTotalCount, setVehiclesTotalCount] = useState(0);
  const [vehiclesTotalPages, setVehiclesTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showClientQuote, setShowClientQuote] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (accountId) {
      fetchCustomerData();
    }
  }, [accountId]);

  useEffect(() => {
    if (customer?.new_account_number) {
      fetchVehicles(1); // Load first page when customer data is ready
    }
  }, [customer]);

  useEffect(() => {
    if (customer?.new_account_number && vehiclesPage > 1) {
      fetchVehicles(vehiclesPage);
    }
  }, [vehiclesPage]);

  const fetchCustomerData = async () => {
    try {
      // Since accountId is now a cost code (like DATA-0001), create a customer object from it
      const customerData = {
        id: accountId,
        new_account_number: accountId,
        company: accountId.split('-')[0], // Extract prefix (e.g., "DATA" from "DATA-0001")
        legal_name: `${accountId.split('-')[0]} Cost Center`,
        trading_name: `${accountId.split('-')[0]} Cost Center`,
        email: null,
        cell_no: null,
        switchboard: null,
        physical_address_1: null,
        physical_address_2: null,
        physical_area: null,
        physical_province: null,
        physical_code: null,
        postal_address_1: null,
        postal_address_2: null,
        postal_area: null,
        postal_province: null,
        postal_code: null,
        branch_person: null,
        branch_person_number: null,
        branch_person_email: null,
        created_at: new Date().toISOString()
      };
      
      setCustomer(customerData);
      console.log('Created customer data from cost code:', customerData);
    } catch (error) {
      console.error('Error creating customer data:', error);
      toast.error('Failed to load customer data');
    }
  };

  const fetchVehicles = async (page: number = 1) => {
    try {
      const accountNumber = customer?.new_account_number;
      console.log('Fetching vehicles for account:', accountNumber, 'page:', page);
      
      if (!accountNumber) {
        console.error('No account number available');
        toast.error('No account number available for vehicle fetching');
        return;
      }
      
      setVehiclesLoading(true);
      
      const result: VehiclesResponse = await getVehiclesByAccountNumber(accountNumber, page, 10);
      
      if (result.success) {
        setVehicles(result.vehicles);
        setVehiclesTotalCount(result.totalCount);
        setVehiclesTotalPages(result.totalPages);
        console.log('Vehicles loaded:', result.vehicles.length, 'of', result.totalCount);
      } else {
        console.error('Failed to fetch vehicles:', result.error);
        setVehicles([]);
        setVehiclesTotalCount(0);
        setVehiclesTotalPages(0);
        if (result.error && result.error !== 'Failed to fetch vehicles') {
          toast.error(result.error);
        }
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
      setVehiclesTotalCount(0);
      setVehiclesTotalPages(0);
      toast.error('Failed to load vehicles');
    } finally {
      setVehiclesLoading(false);
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleVehiclesPageChange = (newPage: number) => {
    setVehiclesPage(newPage);
  };

  const handleTabChange = (newTab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    router.push(url.pathname + url.search);
  };

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading account data...</span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6 p-6">
        <div className="py-12 text-center">
          <Building className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">Customer not found</h3>
          <p className="text-gray-500">The requested customer account could not be found.</p>
        </div>
      </div>
    );
  }

  // Tab navigation component
  const TabNavigation = () => (
    <div className="mb-6 border-gray-200 border-b">
      <nav className="flex space-x-8">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Building },
          { id: 'vehicles', label: 'Vehicles', icon: Car },
          { id: 'jobs', label: 'Jobs', icon: FileText },
          { id: 'client-quotes', label: 'Quotes', icon: Quote },
          { id: 'map', label: 'Live Map', icon: Map }
        ].map((tabItem) => {
          const Icon = tabItem.icon;
          const isActive = tab === tabItem.id;
          
          return (
            <button
              key={tabItem.id}
              onClick={() => handleTabChange(tabItem.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tabItem.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  // Render content based on tab
  const renderContent = () => {
    switch (tab) {
      case 'dashboard':
        return (
          <AccountDashboard 
            customer={customer} 
            accountNumber={customer?.new_account_number || accountId}
            onNewQuote={() => setShowClientQuote(true)}
          />
        );

      case 'vehicles':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-xl">Vehicle Fleet</h2>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{vehiclesTotalCount} total vehicles</Badge>
                {vehiclesLoading && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <div className="border-b-2 border-blue-600 rounded-full w-4 h-4 animate-spin"></div>
                    Loading...
                  </div>
                )}
              </div>
            </div>
            
            {vehicles.length === 0 && !vehiclesLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Car className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                  <h3 className="mb-2 font-medium text-gray-900 text-lg">No vehicles found</h3>
                  <p className="text-gray-500">This customer has no vehicles assigned.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <VehicleCards 
                  vehicles={vehicles}
                  selectedVehicle={selectedVehicle}
                  onVehicleSelect={handleVehicleSelect}
                  accountNumber={customer?.new_account_number}
                />
                
                {/* Pagination Controls */}
                {vehiclesTotalPages > 1 && (
                  <div className="flex justify-between items-center mt-6">
                    <div className="text-gray-700 text-sm">
                      Showing {((vehiclesPage - 1) * 10) + 1} to {Math.min(vehiclesPage * 10, vehiclesTotalCount)} of {vehiclesTotalCount} vehicles
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVehiclesPageChange(vehiclesPage - 1)}
                        disabled={vehiclesPage === 1 || vehiclesLoading}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {/* Show page numbers */}
                        {Array.from({ length: Math.min(vehiclesTotalPages, 5) }, (_, i) => {
                          const pageNum = i + 1;
                          const shouldShow = 
                            pageNum <= 3 || 
                            pageNum >= vehiclesTotalPages - 2 || 
                            Math.abs(pageNum - vehiclesPage) <= 1;
                          
                          if (!shouldShow) {
                            if (pageNum === 4 && vehiclesPage > 5) {
                              return <span key={`ellipsis-${pageNum}`} className="px-2 text-gray-500">...</span>;
                            }
                            if (pageNum === vehiclesTotalPages - 3 && vehiclesPage < vehiclesTotalPages - 4) {
                              return <span key={`ellipsis-${pageNum}`} className="px-2 text-gray-500">...</span>;
                            }
                            return null;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={vehiclesPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleVehiclesPageChange(pageNum)}
                              disabled={vehiclesLoading}
                              className="p-0 w-8 h-8"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVehiclesPageChange(vehiclesPage + 1)}
                        disabled={vehiclesPage === vehiclesTotalPages || vehiclesLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case 'jobs':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-xl">Job Cards</h2>
            </div>
            
            <CustomerJobCards accountNumber={customer?.new_account_number} />
          </div>
        );

      case 'client-quotes':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-xl">
                {customer?.new_account_number ? `Client Quotations for Account ${customer.new_account_number}` : 'Client Quotations'}
              </h2>
              <Button 
                onClick={() => setShowClientQuote(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 w-4 h-4" />
                New Client Quote
              </Button>
            </div>
            
            <ClientJobCards 
              key={refreshKey}
              accountNumber={customer?.new_account_number}
              onQuoteCreated={() => {
                // Refresh the client quotes list
                setShowClientQuote(false);
                setRefreshKey(prev => prev + 1);
              }}
            />
          </div>
        );

      case 'map':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-xl">Live Vehicle Map</h2>
              <Badge variant="outline">Live Feed</Badge>
            </div>
            
            <VehicleMapView 
              vehicles={vehicles}
              customer={customer}
            />
          </div>
        );

      default:
        return (
          <AccountDashboard 
            customer={customer} 
            accountNumber={customer?.new_account_number || accountId}
            onNewQuote={() => setShowClientQuote(true)}
          />
        );
    }
  };

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title={customer.company || customer.trading_name || customer.legal_name}
        subtitle={`Account #${customer.new_account_number || accountId}`}
        icon={Building}
        actionButton={{
          label: 'Main Dashboard',
          onClick: () => window.location.href = '/protected/fc',
          icon: Building
        }}
      />

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Client Quote Modal */}
      {showClientQuote && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-xl">Client Quotation</h2>
              <Button
                variant="outline"
                onClick={() => setShowClientQuote(false)}
              >
                Close
              </Button>
            </div>
            <ClientQuoteForm 
              customer={customer}
              vehicles={vehicles}
              accountInfo={customer}
              onQuoteCreated={() => {
                setShowClientQuote(false);
                // Refresh the client quotes list
                setRefreshKey(prev => prev + 1);
              }}
            />
          </div>
        </div>
      )}

      {/* Content based on tab */}
      {renderContent()}
    </div>
  );
}

export default function AccountDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountDetailPageContent />
    </Suspense>
  );
} 