'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search, 
  Download, 
  AlertTriangle, 
  Car,
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  Wrench,
  Receipt
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { OverdueAccountsWidget } from '@/components/overdue/OverdueAccountsWidget';
import InternalAccountDashboard from './InternalAccountDashboard';

export default function AccountsContent({ activeSection }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountVehicles, setAccountVehicles] = useState([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const router = useRouter();

  const fetchCustomers = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const currentPage = isLoadMore ? page + 1 : 1;
      const response = await fetch(
        `/api/vehicle-invoices?page=${currentPage}&limit=50&search=${encodeURIComponent(searchTerm)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();
      
      if (isLoadMore) {
        setCustomers(prev => [...prev, ...data.customers]);
        setPage(currentPage);
        setHasMore(data.pagination.hasMore);
      } else {
        setCustomers(data.customers);
        setPage(1);
        setHasMore(data.pagination.hasMore);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    if (activeSection === 'dashboard' || activeSection === 'overdue') {
      fetchCustomers();
    }
  }, [activeSection, fetchCustomers]);

  // Check for account parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accountParam = urlParams.get('account');
    
    if (accountParam) {
      console.log('Account parameter found:', accountParam);
      fetchAccountData(accountParam);
    }
  }, []);

  const fetchAccountData = async (accountNumber) => {
    try {
      setAccountLoading(true);
      console.log('Fetching account data for:', accountNumber);
      
      const response = await fetch(`/api/vehicle-invoices/account/${encodeURIComponent(accountNumber)}`);
      console.log('API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        
        if (data.success) {
          const accountData = {
            company: data.company,
            accountNumber: data.accountNumber,
            totalMonthlyAmount: data.summary.totalMonthlyAmount,
            totalOverdue: data.summary.totalOverdueAmount,
            vehicleCount: data.summary.totalVehicles
          };
          console.log('Setting selected account:', accountData);
          setSelectedAccount(accountData);
          setAccountVehicles(data.vehicles || []);
        } else {
          console.error('API returned success: false:', data);
        }
      } else {
        console.error('API request failed with status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchCustomers();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchCustomers();
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchCustomers(true);
    }
  };

  const handleCustomerClick = (accountNumber) => {
    console.log('Clicking on account:', accountNumber);
    // Set the selected account directly instead of navigating
    fetchAccountData(accountNumber);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getOverdueStatus = (totalOverdue) => {
    if (totalOverdue === 0) return 'current';
    if (totalOverdue < 1000) return 'low';
    if (totalOverdue < 5000) return 'medium';
    return 'high';
  };

  const getOverdueColor = (status) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Dashboard Section
  if (activeSection === 'dashboard') {
    console.log('Dashboard section active, selectedAccount:', selectedAccount);
    
    // If an account is selected, show the internal account dashboard
    if (selectedAccount) {
      console.log('Showing internal dashboard for account:', selectedAccount.accountNumber);
      return (
        <InternalAccountDashboard 
          accountNumber={selectedAccount.accountNumber}
          onBack={() => {
            console.log('Going back to accounts');
            setSelectedAccount(null);
            setAccountVehicles([]);
          }}
        />
      );
    }

    // Show the main accounts dashboard
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Accounts Dashboard</h2>
          <Button 
            onClick={() => router.push('/protected/accounts')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Users className="w-4 h-4 mr-2" />
            View All Accounts
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehicle Invoices</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">Vehicle Billing</div>
              <p className="text-xs text-muted-foreground">Monthly recurring billing</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Tracking</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Due 21st</div>
              <p className="text-xs text-muted-foreground">Monthly payment schedule</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Monitoring</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">Real-time</div>
              <p className="text-xs text-muted-foreground">Automated tracking</p>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Accounts Widget - Main Feature */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Overdue Accounts Overview</span>
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Click on any account to view detailed vehicle information and costs
            </p>
          </CardHeader>
          <CardContent>
            <OverdueAccountsWidget 
              autoRefresh={true} 
              refreshInterval={300000} // 5 minutes
              showAllAccounts={false}
              maxAccounts={10}
              onAccountClick={handleCustomerClick}
            />
          </CardContent>
        </Card>

                 {/* All Accounts Section */}
         <Card className="hover:shadow-lg transition-shadow duration-200">
           <CardHeader>
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-2">
                 <Users className="w-5 h-5 text-blue-600" />
                 <span>All Accounts</span>
               </div>
               <Button 
                 onClick={() => {
                   console.log('Testing internal dashboard with AIRG-0001');
                   fetchAccountData('AIRG-0001');
                 }}
                 variant="outline"
                 size="sm"
               >
                 Test Dashboard
               </Button>
             </div>
             <p className="text-gray-600 text-sm">
               Showing {customers.length} accounts (first 50 loaded, click "Load More" for additional accounts)
             </p>
           </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
                <span className="ml-2">Loading accounts...</span>
              </div>
            ) : customers.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Users className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                <p>No accounts found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search and Filters */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="top-3 left-3 absolute w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by company name or account number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                    <Search className="mr-2 w-4 h-4" />
                    Search
                  </Button>
                </div>

                {/* Accounts Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                          Monthly Amount
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                          Total Overdue
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                          Vehicles
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {customers.map((customer, index) => {
                        const overdueStatus = getOverdueStatus(customer.totalOverdue);
                        return (
                          <tr key={customer.accountNumber} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900 text-sm">{customer.company}</div>
                              <div className="text-gray-500 text-sm">#{customer.accountNumber}</div>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="font-medium text-gray-900 text-sm">
                                {formatCurrency(customer.totalMonthlyAmount)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="font-medium text-red-600 text-sm">
                                {formatCurrency(customer.totalOverdue)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <Badge variant="outline">{customer.vehicleCount}</Badge>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <Badge className={getOverdueColor(overdueStatus)}>
                                {overdueStatus === 'current' ? 'Current' : 
                                 overdueStatus === 'low' ? 'Low Risk' :
                                 overdueStatus === 'medium' ? 'Medium Risk' : 'High Risk'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <Button 
                                size="sm" 
                                onClick={() => handleCustomerClick(customer.accountNumber)}
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                <Users className="mr-2 w-4 h-4" />
                                View Details
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button 
                      onClick={handleLoadMore} 
                      disabled={loadingMore}
                      variant="outline"
                      className="w-full max-w-xs"
                    >
                      {loadingMore ? (
                        <>
                          <div className="mr-2 border-b-2 border-blue-600 rounded-full w-4 h-4 animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        'Load More Accounts'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overdue Accounts Section
  if (activeSection === 'overdue') {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="flex justify-center items-center py-12">
            <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
            <span className="ml-2">Loading overdue accounts...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-gray-900 text-3xl">Overdue Accounts Dashboard</h1>
            <p className="mt-2 text-gray-600">Monitor customer payment status and overdue amounts</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Customers</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-blue-600 text-2xl">{customers.length}</div>
              <p className="text-muted-foreground text-xs">Active accounts</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Monthly Revenue</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-green-600 text-2xl">
                {formatCurrency(customers.reduce((sum, c) => sum + (c.totalMonthlyAmount || 0), 0))}
              </div>
              <p className="text-muted-foreground text-xs">Monthly billing</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Overdue</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-red-600 text-2xl">
                {formatCurrency(customers.reduce((sum, c) => sum + (c.totalOverdue || 0), 0))}
              </div>
              <p className="text-muted-foreground text-xs">Outstanding amounts</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Vehicles</CardTitle>
              <Car className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-purple-600 text-2xl">
                {customers.reduce((sum, c) => sum + (c.vehicleCount || 0), 0)}
              </div>
              <p className="text-muted-foreground text-xs">Fleet size</p>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Accounts Widget */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Overdue Accounts Overview</span>
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Click on any account to view detailed vehicle information and costs
            </p>
          </CardHeader>
          <CardContent>
            <OverdueAccountsWidget 
              autoRefresh={true} 
              refreshInterval={300000} // 5 minutes
              showAllAccounts={false}
              maxAccounts={15}
              onAccountClick={handleCustomerClick}
            />
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="top-3 left-3 absolute w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by company name or account number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
                <Search className="mr-2 w-4 h-4" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Accounts Table */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Overdue Accounts (Highest to Lowest)</span>
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Showing {customers.length} accounts sorted by overdue amount
            </p>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                      Monthly Amount
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                      Total Overdue
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                      Vehicles
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer, index) => {
                    const overdueStatus = getOverdueStatus(customer.totalOverdue);
                    return (
                      <tr key={customer.accountNumber} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900 text-sm">{customer.company}</div>
                          <div className="text-gray-500 text-sm">#{customer.accountNumber}</div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="font-medium text-gray-900 text-sm">
                            {formatCurrency(customer.totalMonthlyAmount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="font-medium text-red-600 text-sm">
                            {formatCurrency(customer.totalOverdue)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <Badge variant="outline">{customer.vehicleCount}</Badge>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <Badge className={getOverdueColor(overdueStatus)}>
                            {overdueStatus === 'current' ? 'Current' : 
                             overdueStatus === 'low' ? 'Low Risk' :
                             overdueStatus === 'medium' ? 'Medium Risk' : 'High Risk'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Button 
                            size="sm" 
                            onClick={() => handleCustomerClick(customer.accountNumber)}
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            <Users className="mr-2 w-4 h-4" />
                            View Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={handleLoadMore} 
                  disabled={loadingMore}
                  variant="outline"
                  className="w-full max-w-xs"
                >
                  {loadingMore ? (
                    <>
                      <div className="mr-2 border-b-2 border-blue-600 rounded-full w-4 h-4 animate-spin"></div>
                      Loading...
                    </>
                  ) : (
                    'Load More Customers'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Other sections (placeholder for now)
  if (activeSection === 'purchases') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Purchases</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <span>Purchase Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Purchase management functionality coming soon...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'job-cards') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Job Cards</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              <span>Job Card Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Job card management functionality coming soon...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'orders') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              <span>Order Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Order management functionality coming soon...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'vehicles') {
    // If an account is selected, show the internal account dashboard with vehicles tab
    if (selectedAccount) {
      return (
        <InternalAccountDashboard 
          accountNumber={selectedAccount.accountNumber}
          defaultTab="vehicles"
          onBack={() => {
            setSelectedAccount(null);
            setAccountVehicles([]);
            router.push('/protected/accounts?section=vehicles');
          }}
        />
      );
    }

    // Show the main vehicles section
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Vehicles</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Car className="w-5 h-5 text-blue-600" />
              <span>Vehicle Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Select an account to view vehicles and monthly costs.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Select a Section</h2>
      <p className="text-gray-600">Please select a section from the sidebar to get started.</p>
    </div>
  );
}
