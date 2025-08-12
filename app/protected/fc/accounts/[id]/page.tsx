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

function AccountDetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const accountId = params.id;
  const tab = searchParams.get('tab') || 'dashboard';
  
  const [customer, setCustomer] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClientQuote, setShowClientQuote] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    if (accountId) {
      fetchCustomerData();
    }
  }, [accountId]);

  useEffect(() => {
    if (customer?.new_account_number) {
      fetchVehicles();
    }
  }, [customer]);

  const fetchCustomerData = async () => {
    try {
      const response = await fetch(`/api/customers/${accountId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer data');
      }
      const data = await response.json();
      setCustomer(data.customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Failed to load customer data');
    }
  };

  const fetchVehicles = async () => {
    try {
      const accountNumber = customer?.new_account_number;
      console.log('Fetching vehicles for account:', accountNumber);
      
      if (!accountNumber) {
        console.error('No account number available');
        toast.error('No account number available for vehicle fetching');
        return;
      }
      
      const response = await fetch(`/api/vehicles-by-company?accountNumber=${encodeURIComponent(accountNumber)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      const data = await response.json();
      console.log('Vehicles data:', data);
      
      if (data.success) {
        setVehicles(data.vehicles || []);
      } else {
        throw new Error(data.error || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
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
              <Badge variant="outline">{vehicles.length} vehicles</Badge>
            </div>
            
            {vehicles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Car className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                  <h3 className="mb-2 font-medium text-gray-900 text-lg">No vehicles found</h3>
                  <p className="text-gray-500">This customer has no vehicles assigned.</p>
                </CardContent>
              </Card>
            ) : (
              <VehicleCards 
                vehicles={vehicles}
                selectedVehicle={selectedVehicle}
                onVehicleSelect={handleVehicleSelect}
              />
            )}
          </div>
        );

      case 'jobs':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-xl">Job History</h2>
            </div>
            
            <CustomerJobCards customerId={accountId} />
          </div>
        );

      case 'client-quotes':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-xl">Client Quotations</h2>
              <Button 
                onClick={() => setShowClientQuote(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 w-4 h-4" />
                New Client Quote
              </Button>
            </div>
            
            <ClientJobCards 
              accountNumber={customer?.new_account_number || accountId}
              onQuoteCreated={() => {
                // Refresh the page or update the data
                window.location.reload();
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
              onClose={() => setShowClientQuote(false)}
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