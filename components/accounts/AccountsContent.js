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
  Receipt,
  X
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
  const [completedJobs, setCompletedJobs] = useState([]);
  const [completedJobsLoading, setCompletedJobsLoading] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
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
    if (activeSection === 'completed-jobs') {
      fetchCompletedJobs();
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

  const fetchCompletedJobs = async () => {
    try {
      setCompletedJobsLoading(true);
      
      const response = await fetch('/api/accounts/completed-jobs');
      
      if (!response.ok) {
        throw new Error('Failed to fetch completed jobs');
      }

      const data = await response.json();
      setCompletedJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching completed jobs:', error);
      toast.error('Failed to load completed jobs');
    } finally {
      setCompletedJobsLoading(false);
    }
  };

  const handleBillClient = async (job) => {
    try {
      // For now, just show a success message
      // In the future, this could generate invoices, send emails, etc.
      toast.success(`Billing initiated for job ${job.job_number}`);
      
      // You could also update the job status to 'billed' here
      // const response = await fetch(`/api/job-cards/${job.id}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ job_status: 'Billed' })
      // });
      
    } catch (error) {
      console.error('Error billing client:', error);
      toast.error('Failed to bill client');
    }
  };

  const handleViewJobDetails = (job) => {
    setSelectedJobDetails(job);
    setShowJobDetailsModal(true);
  };

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

  // Completed Jobs Section
  if (activeSection === 'completed-jobs') {
    if (completedJobsLoading) {
      return (
        <div className="space-y-6">
          <div className="flex justify-center items-center py-12">
            <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
            <span className="ml-2">Loading completed jobs...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-gray-900 text-3xl">Completed Job Cards</h1>
            <p className="mt-2 text-gray-600">View completed jobs ready for billing</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={fetchCompletedJobs}
              disabled={completedJobsLoading}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${completedJobsLoading ? 'animate-spin' : ''}`} />
              {completedJobsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Jobs</CardTitle>
              <Wrench className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-blue-600 text-2xl">{completedJobs.length}</div>
              <p className="text-muted-foreground text-xs">Ready for billing</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Repair Jobs</CardTitle>
              <Wrench className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-purple-600 text-2xl">
                {completedJobs.filter(job => job.repair).length}
              </div>
              <p className="text-muted-foreground text-xs">Repair work</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Installation Jobs</CardTitle>
              <Car className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-green-600 text-2xl">
                {completedJobs.filter(job => job.job_type?.toLowerCase().includes('install')).length}
              </div>
              <p className="text-muted-foreground text-xs">Installations</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Value</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-green-600 text-2xl">
                {formatCurrency(completedJobs.reduce((sum, job) => sum + (job.quotation_total_amount || 0), 0))}
              </div>
              <p className="text-muted-foreground text-xs">Billing amount</p>
            </CardContent>
          </Card>
        </div>

                 {/* Completed Jobs Table */}
         <Card className="hover:shadow-lg transition-shadow duration-200">
           <CardHeader>
             <CardTitle className="flex items-center space-x-2">
               <Receipt className="w-5 h-5 text-green-600" />
               <span>Completed Jobs for Billing</span>
             </CardTitle>
           </CardHeader>
           <CardContent>
             {completedJobs.length === 0 ? (
               <div className="py-8 text-gray-500 text-center">
                 No completed jobs found
               </div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead className="bg-gray-50">
                     <tr>
                       <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                         Job Details
                       </th>
                       <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                         Customer
                       </th>
                       <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                         Vehicle
                       </th>
                       <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                         Amount
                       </th>
                       <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                         Completion Date
                       </th>
                       <th className="px-4 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                         Actions
                       </th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {completedJobs.map((job) => (
                       <tr key={job.id} className="hover:bg-gray-50">
                         <td className="px-4 py-3">
                           <div className="flex items-center space-x-2 mb-2">
                             <h3 className="font-semibold text-lg">{job.job_number}</h3>
                             <Badge className={job.repair ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                               {job.repair ? 'Repair' : job.job_type}
                             </Badge>
                           </div>
                           <div className="text-gray-600 text-sm">
                             <p><strong>Description:</strong> {job.job_description || 'No description'}</p>
                             {job.job_location && (
                               <p><strong>Location:</strong> {job.job_location}</p>
                             )}
                           </div>
                         </td>
                         <td className="px-4 py-3">
                           <div className="font-medium">{job.customer_name}</div>
                           <div className="text-gray-500 text-sm">
                             <div className="flex items-center gap-1">
                               <span>📧 {job.customer_email}</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <span>📱 {job.customer_phone}</span>
                             </div>
                           </div>
                         </td>
                         <td className="px-4 py-3">
                           {job.vehicle_registration ? (
                             <div>
                               <div className="font-medium">{job.vehicle_registration}</div>
                               <div className="text-gray-500 text-sm">
                                 {job.vehicle_make} {job.vehicle_model} {job.vehicle_year}
                               </div>
                             </div>
                           ) : (
                             <span className="text-gray-400">No vehicle</span>
                           )}
                         </td>
                         <td className="px-4 py-3">
                           <div className="text-right">
                             <div className="font-medium text-green-600">
                               {formatCurrency(job.quotation_total_amount || 0)}
                             </div>
                             {job.quotation_subtotal && (
                               <div className="text-gray-500 text-sm">
                                 Subtotal: {formatCurrency(job.quotation_subtotal)}
                               </div>
                             )}
                           </div>
                         </td>
                         <td className="px-4 py-3">
                           <div className="text-sm">
                             <div className="font-medium">
                               {new Date(job.completion_date || job.job_date).toLocaleDateString()}
                             </div>
                             <div className="text-gray-500">
                               {job.actual_duration_hours || job.estimated_duration_hours || 'N/A'}h
                             </div>
                           </div>
                         </td>
                                                  <td className="px-4 py-3">
                            <div className="space-y-2">
                              <Button
                                onClick={() => handleViewJobDetails(job)}
                                size="sm"
                                variant="outline"
                                className="w-full"
                              >
                                <Search className="mr-2 w-4 h-4" />
                                View Details
                              </Button>
                              <Button
                                onClick={() => handleBillClient(job)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 w-full"
                              >
                                <Receipt className="mr-2 w-4 h-4" />
                                Bill Client
                              </Button>
                            </div>
                          </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
           </CardContent>
         </Card>

         {/* Job Details Modal */}
         {showJobDetailsModal && selectedJobDetails && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
               {/* Modal Header */}
               <div className="flex items-center justify-between p-6 border-b">
                 <div>
                   <h2 className="text-2xl font-bold text-gray-900">
                     Job Details: {selectedJobDetails.job_number}
                   </h2>
                   <p className="text-gray-600">
                     {selectedJobDetails.repair ? 'Repair Job' : selectedJobDetails.job_type}
                   </p>
                 </div>
                 <Button
                   onClick={() => setShowJobDetailsModal(false)}
                   variant="ghost"
                   size="sm"
                   className="h-8 w-8 p-0"
                 >
                   <X className="h-4 w-4" />
                 </Button>
               </div>

               {/* Modal Content */}
               <div className="p-6 space-y-6">
                 {/* Job Information */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Card>
                     <CardHeader>
                       <CardTitle className="text-lg">Job Information</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-3">
                       <div>
                         <span className="font-medium">Job Number:</span>
                         <span className="ml-2 text-gray-600">{selectedJobDetails.job_number}</span>
                       </div>
                       <div>
                         <span className="font-medium">Job Type:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.repair ? 'Repair' : selectedJobDetails.job_type}
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">Description:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.job_description || 'No description'}
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">Location:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.job_location || 'No location specified'}
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">Priority:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.priority || 'Not specified'}
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">Status:</span>
                         <Badge className="ml-2 bg-green-100 text-green-800">
                           {selectedJobDetails.job_status}
                         </Badge>
                       </div>
                     </CardContent>
                   </Card>

                   <Card>
                     <CardHeader>
                       <CardTitle className="text-lg">Timing & Duration</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-3">
                       <div>
                         <span className="font-medium">Job Date:</span>
                         <span className="ml-2 text-gray-600">
                           {new Date(selectedJobDetails.job_date).toLocaleDateString()}
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">Start Time:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.start_time ? 
                             new Date(selectedJobDetails.start_time).toLocaleTimeString() : 'Not specified'
                           }
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">End Time:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.end_time ? 
                             new Date(selectedJobDetails.end_time).toLocaleTimeString() : 'Not specified'
                           }
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">Completion Date:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.completion_date ? 
                             new Date(selectedJobDetails.completion_date).toLocaleDateString() : 'Not specified'
                           }
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">Duration:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.actual_duration_hours || selectedJobDetails.estimated_duration_hours || 'N/A'} hours
                         </span>
                       </div>
                     </CardContent>
                   </Card>
                 </div>

                 {/* Customer Information */}
                 <Card>
                   <CardHeader>
                     <CardTitle className="text-lg">Customer Information</CardTitle>
                   </CardHeader>
                   <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-3">
                       <div>
                         <span className="font-medium">Name:</span>
                         <span className="ml-2 text-gray-600">{selectedJobDetails.customer_name}</span>
                       </div>
                       <div>
                         <span className="font-medium">Email:</span>
                         <span className="ml-2 text-gray-600">{selectedJobDetails.customer_phone}</span>
                       </div>
                       <div>
                         <span className="font-medium">Phone:</span>
                         <span className="ml-2 text-gray-600">{selectedJobDetails.customer_phone}</span>
                       </div>
                     </div>
                     <div className="space-y-3">
                       <div>
                         <span className="font-medium">Address:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.customer_address || 'No address specified'}
                         </span>
                       </div>
                     </div>
                   </CardContent>
                 </Card>

                 {/* Vehicle Information */}
                 {selectedJobDetails.vehicle_registration && (
                   <Card>
                     <CardHeader>
                       <CardTitle className="text-lg">Vehicle Information</CardTitle>
                     </CardHeader>
                     <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-3">
                         <div>
                           <span className="font-medium">Registration:</span>
                           <span className="ml-2 text-gray-600">{selectedJobDetails.vehicle_registration}</span>
                         </div>
                         <div>
                           <span className="font-medium">Make:</span>
                           <span className="ml-2 text-gray-600">{selectedJobDetails.vehicle_make}</span>
                         </div>
                         <div>
                           <span className="font-medium">Model:</span>
                           <span className="ml-2 text-gray-600">{selectedJobDetails.vehicle_model}</span>
                         </div>
                       </div>
                       <div className="space-y-3">
                         <div>
                           <span className="font-medium">Year:</span>
                           <span className="ml-2 text-gray-600">{selectedJobDetails.vehicle_year}</span>
                         </div>
                         {selectedJobDetails.vin_numer && (
                           <div>
                             <span className="font-medium">VIN:</span>
                             <span className="ml-2 text-gray-600">{selectedJobDetails.vin_numer}</span>
                           </div>
                         )}
                         {selectedJobDetails.odormeter && (
                           <div>
                             <span className="font-medium">Odometer:</span>
                             <span className="ml-2 text-gray-600">{selectedJobDetails.odormeter}</span>
                           </div>
                         )}
                       </div>
                     </CardContent>
                   </Card>
                 )}

                 {/* Financial Information */}
                 <Card>
                   <CardHeader>
                     <CardTitle className="text-lg">Financial Information</CardTitle>
                   </CardHeader>
                   <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="text-center">
                       <div className="text-2xl font-bold text-green-600">
                         {formatCurrency(selectedJobDetails.quotation_total_amount || 0)}
                       </div>
                       <div className="text-sm text-gray-600">Total Amount</div>
                     </div>
                     <div className="text-center">
                       <div className="text-xl font-semibold text-blue-600">
                         {formatCurrency(selectedJobDetails.quotation_subtotal || 0)}
                       </div>
                       <div className="text-sm text-gray-600">Subtotal</div>
                     </div>
                     <div className="text-center">
                       <div className="text-xl font-semibold text-red-600">
                         {formatCurrency(selectedJobDetails.quotation_vat_amount || 0)}
                       </div>
                       <div className="text-sm text-gray-600">VAT (15%)</div>
                     </div>
                   </CardContent>
                 </Card>

                 {/* Before and After Photos - Split View */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Before Photos */}
                   <Card>
                     <CardHeader>
                       <CardTitle className="text-lg text-red-600">Before Photos</CardTitle>
                       <p className="text-sm text-gray-600">
                         {selectedJobDetails.before_photos?.length || 0} photo(s) taken before work
                       </p>
                     </CardHeader>
                     <CardContent>
                       {selectedJobDetails.before_photos && selectedJobDetails.before_photos.length > 0 ? (
                         <div className="grid grid-cols-2 gap-3">
                           {selectedJobDetails.before_photos.map((photo, index) => (
                             <div key={index} className="relative group">
                               <img
                                 src={photo}
                                 alt={`Before photo ${index + 1}`}
                                 className="w-full h-32 object-cover rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors cursor-pointer"
                                 onClick={() => window.open(photo, '_blank')}
                               />
                               <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                 <span className="text-white opacity-0 group-hover:opacity-100 font-medium">
                                   Click to enlarge
                                 </span>
                               </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="text-center py-8 text-gray-500">
                           <div className="text-4xl mb-2">📷</div>
                           <p>No before photos available</p>
                           </div>
                       )}
                     </CardContent>
                   </Card>

                   {/* After Photos */}
                   <Card>
                     <CardHeader>
                       <CardTitle className="text-lg text-green-600">After Photos</CardTitle>
                       <p className="text-sm text-gray-600">
                         {selectedJobDetails.after_photos?.length || 0} photo(s) taken after work
                       </p>
                     </CardHeader>
                     <CardContent>
                       {selectedJobDetails.after_photos && selectedJobDetails.after_photos.length > 0 ? (
                         <div className="grid grid-cols-2 gap-3">
                           {selectedJobDetails.after_photos.map((photo, index) => (
                             <div key={index} className="relative group">
                               <img
                                 src={photo}
                                 alt={`After photo ${index + 1}`}
                                 className="w-full h-32 object-cover rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors cursor-pointer"
                                 onClick={() => window.open(photo, '_blank')}
                               />
                               <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                 <span className="text-white opacity-0 group-hover:opacity-100 font-medium">
                                   Click to enlarge
                                 </span>
                               </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="text-center py-8 text-gray-500">
                           <div className="text-4xl mb-2">📷</div>
                           <p>No after photos available</p>
                         </div>
                       )}
                     </CardContent>
                   </Card>
                 </div>

                 {/* Additional Information */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Work Notes */}
                   <Card>
                     <CardHeader>
                       <CardTitle className="text-lg">Work Notes</CardTitle>
                     </CardHeader>
                     <CardContent>
                       <div className="bg-gray-50 p-4 rounded-lg min-h-[100px]">
                         {selectedJobDetails.work_notes ? (
                           <p className="text-gray-700 whitespace-pre-wrap">{selectedJobDetails.work_notes}</p>
                         ) : (
                           <p className="text-gray-500 italic">No work notes available</p>
                         )}
                       </div>
                     </CardContent>
                   </Card>

                   {/* Completion Notes */}
                   <Card>
                     <CardHeader>
                       <CardTitle className="text-lg">Completion Notes</CardTitle>
                     </CardHeader>
                     <CardContent>
                       <div className="bg-gray-50 p-4 rounded-lg min-h-[100px]">
                         <p className="text-gray-700 whitespace-pre-wrap">{selectedJobDetails.completion_notes || 'No completion notes available'}</p>
                       </div>
                     </CardContent>
                   </Card>
                 </div>

                 {/* Technician Information */}
                 <Card>
                   <CardHeader>
                     <CardTitle className="text-lg">Technician Information</CardTitle>
                   </CardHeader>
                   <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-3">
                       <div>
                         <span className="font-medium">Name:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.technician_name || 'Not specified'}
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">Email:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.technician_phone || 'Not specified'}
                         </span>
                       </div>
                     </div>
                     <div className="space-y-3">
                       <div>
                         <span className="font-medium">Special Instructions:</span>
                         <span className="ml-2 text-gray-600">
                           {selectedJobDetails.special_instructions || 'None'}
                         </span>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </div>

               {/* Modal Footer */}
               <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                 <Button
                   onClick={() => setShowJobDetailsModal(false)}
                   variant="outline"
                 >
                   Close
                 </Button>
                 <Button
                   onClick={() => handleBillClient(selectedJobDetails)}
                   className="bg-green-600 hover:bg-green-700"
                 >
                   <Receipt className="mr-2 w-4 h-4" />
                   Bill Client
                 </Button>
               </div>
             </div>
           </div>
         )}
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
    <>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Select a Section</h2>
        <p className="text-gray-600">Please select a section from the sidebar to get started.</p>
      </div>

               {/* Job Details Modal */}
         {showJobDetailsModal && selectedJobDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Job Details: {selectedJobDetails.job_number}
                </h2>
                <p className="text-gray-600">
                  {selectedJobDetails.repair ? 'Repair Job' : selectedJobDetails.job_type}
                </p>
              </div>
              <Button
                onClick={() => setShowJobDetailsModal(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Job Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Job Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium">Job Number:</span>
                      <span className="ml-2 text-gray-600">{selectedJobDetails.job_number}</span>
                    </div>
                    <div>
                      <span className="font-medium">Job Type:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.repair ? 'Repair' : selectedJobDetails.job_type}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Description:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.job_description || 'No description'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Location:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.job_location || 'No location specified'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Priority:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.priority || 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge className="ml-2 bg-green-100 text-green-800">
                        {selectedJobDetails.job_status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Timing & Duration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium">Job Date:</span>
                      <span className="ml-2 text-gray-600">
                        {new Date(selectedJobDetails.job_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Start Time:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.start_time ? 
                          new Date(selectedJobDetails.start_time).toLocaleTimeString() : 'Not specified'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">End Time:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.end_time ? 
                          new Date(selectedJobDetails.end_time).toLocaleTimeString() : 'Not specified'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Completion Date:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.completion_date ? 
                          new Date(selectedJobDetails.completion_date).toLocaleDateString() : 'Not specified'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.actual_duration_hours || selectedJobDetails.estimated_duration_hours || 'N/A'} hours
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Name:</span>
                      <span className="ml-2 text-gray-600">{selectedJobDetails.customer_name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>
                      <span className="ml-2 text-gray-600">{selectedJobDetails.customer_email}</span>
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span>
                      <span className="ml-2 text-gray-600">{selectedJobDetails.customer_phone}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Address:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.customer_address || 'No address specified'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              {selectedJobDetails.vehicle_registration && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vehicle Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">Registration:</span>
                        <span className="ml-2 text-gray-600">{selectedJobDetails.vehicle_registration}</span>
                      </div>
                      <div>
                        <span className="font-medium">Make:</span>
                        <span className="ml-2 text-gray-600">{selectedJobDetails.vehicle_make}</span>
                      </div>
                      <div>
                        <span className="font-medium">Model:</span>
                        <span className="ml-2 text-gray-600">{selectedJobDetails.vehicle_model}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium">Year:</span>
                        <span className="ml-2 text-gray-600">{selectedJobDetails.vehicle_year}</span>
                      </div>
                      {selectedJobDetails.vin_numer && (
                        <div>
                          <span className="font-medium">VIN:</span>
                          <span className="ml-2 text-gray-600">{selectedJobDetails.vin_numer}</span>
                        </div>
                      )}
                      {selectedJobDetails.odormeter && (
                        <div>
                          <span className="font-medium">Odometer:</span>
                          <span className="ml-2 text-gray-600">{selectedJobDetails.odormeter}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedJobDetails.quotation_total_amount || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Amount</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-blue-600">
                      {formatCurrency(selectedJobDetails.quotation_subtotal || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Subtotal</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-red-600">
                      {formatCurrency(selectedJobDetails.quotation_vat_amount || 0)}
                    </div>
                    <div className="text-sm text-gray-600">VAT (15%)</div>
                  </div>
                </CardContent>
              </Card>

              {/* Before and After Photos - Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Before Photos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600">Before Photos</CardTitle>
                    <p className="text-sm text-gray-600">
                      {selectedJobDetails.before_photos?.length || 0} photo(s) taken before work
                    </p>
                  </CardHeader>
                  <CardContent>
                    {selectedJobDetails.before_photos && selectedJobDetails.before_photos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {selectedJobDetails.before_photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Before photo ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors cursor-pointer"
                              onClick={() => window.open(photo, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 font-medium">
                                Click to enlarge
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📷</div>
                        <p>No before photos available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* After Photos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-green-600">After Photos</CardTitle>
                    <p className="text-sm text-gray-600">
                      {selectedJobDetails.after_photos?.length || 0} photo(s) taken after work
                    </p>
                  </CardHeader>
                  <CardContent>
                    {selectedJobDetails.after_photos && selectedJobDetails.after_photos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {selectedJobDetails.after_photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`After photo ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors cursor-pointer"
                              onClick={() => window.open(photo, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 font-medium">
                                Click to enlarge
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📷</div>
                        <p>No after photos available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Work Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Work Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg min-h-[100px]">
                      {selectedJobDetails.work_notes ? (
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedJobDetails.work_notes}</p>
                      ) : (
                        <p className="text-gray-500 italic">No work notes available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Completion Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Completion Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg min-h-[100px]">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedJobDetails.completion_notes || 'No completion notes available'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Technician Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Technician Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Name:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.technician_name || 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.technician_phone || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Special Instructions:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedJobDetails.special_instructions || 'None'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <Button
                onClick={() => setShowJobDetailsModal(false)}
                variant="outline"
              >
                Close
              </Button>
              <Button
                onClick={() => handleBillClient(selectedJobDetails)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Receipt className="mr-2 w-4 h-4" />
                Bill Client
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
