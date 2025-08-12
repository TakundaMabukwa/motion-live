'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  DollarSign, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  ArrowLeft,
  Users,
  FileText,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';

interface InternalAccountDashboardProps {
  accountNumber: string;
  onBack: () => void;
  defaultTab?: string;
}

export default function InternalAccountDashboard({ accountNumber, onBack, defaultTab = 'overview' }: InternalAccountDashboardProps) {
  console.log('InternalAccountDashboard rendered with:', { accountNumber, defaultTab });
  
  const [accountData, setAccountData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    console.log('InternalAccountDashboard useEffect triggered, accountNumber:', accountNumber);
    fetchAccountData();
  }, [accountNumber]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      console.log('Fetching data for account:', accountNumber);
      
      const response = await fetch(`/api/vehicle-invoices/account/${encodeURIComponent(accountNumber)}`);
      console.log('API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        
        if (data.success) {
          const accountInfo = {
            company: data.company,
            accountNumber: data.accountNumber,
            totalMonthlyAmount: data.summary.totalMonthlyAmount,
            totalOverdue: data.summary.totalOverdueAmount,
            vehicleCount: data.summary.totalVehicles
          };
          console.log('Setting account data:', accountInfo);
          setAccountData(accountInfo);
          setVehicles(data.vehicles || []);
        } else {
          console.error('API returned success: false:', data);
          toast.error('API returned error: ' + (data.error || 'Unknown error'));
        }
      } else {
        console.error('API request failed with status:', response.status);
        toast.error('API request failed with status: ' + response.status);
      }
    } catch (error) {
      console.error('Error fetching account data:', error);
      toast.error('Failed to load account data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAccountData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
        <span className="ml-2">Loading account details for {accountNumber}...</span>
      </div>
    );
  }

  if (!accountData) {
    return (
      <div className="py-12 text-center">
        <AlertTriangle className="mx-auto mb-4 w-12 h-12 text-red-500" />
        <h2 className="mb-2 font-semibold text-gray-900 text-xl">Account Not Found</h2>
        <p className="mb-4 text-gray-600">The requested account could not be found.</p>
        <p className="mb-4 text-gray-500 text-sm">Account Number: {accountNumber}</p>
        <p className="mb-4 text-gray-500 text-sm">Loading: {loading.toString()}</p>
        <p className="mb-4 text-gray-500 text-sm">Vehicles count: {vehicles.length}</p>
        
        {/* Show basic account info even if API fails */}
        <div className="bg-gray-50 mt-6 p-4 border rounded-lg">
          <h3 className="mb-2 font-medium text-gray-900">Basic Account Info</h3>
          <p className="text-gray-600 text-sm">Account: {accountNumber}</p>
          <p className="text-gray-600 text-sm">Status: {loading ? 'Loading...' : 'Failed to load'}</p>
        </div>
        
        <Button onClick={onBack} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Accounts
        </Button>
      </div>
    );
  }

  const totalMonthlyCost = vehicles.reduce((sum, vehicle) => sum + (parseFloat(vehicle.one_month) || 0), 0);
  const totalOverdue = vehicles.reduce((sum, vehicle) => sum + (vehicle.totalOverdue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Accounts
          </Button>
          <div>
            <h1 className="font-bold text-gray-900 text-3xl">{accountData.company}</h1>
            <p className="text-gray-600">Account #{accountData.accountNumber}</p>
          </div>
        </div>
        <Button 
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-gray-200 border-b">
        <nav className="flex space-x-8 -mb-px">
          {[
            { key: 'overview', label: 'Overview', icon: TrendingUp },
            { key: 'vehicles', label: 'Vehicles', icon: Car },
            { key: 'financials', label: 'Financials', icon: Calculator },
            { key: 'details', label: 'Details', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Account Summary Cards */}
          <div className="gap-6 grid grid-cols-1 md:grid-cols-4">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Total Vehicles</CardTitle>
                <Car className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-blue-600 text-2xl">{accountData.vehicleCount}</div>
                <p className="text-muted-foreground text-xs">Fleet size</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Monthly Revenue</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-green-600 text-2xl">
                  {formatCurrency(accountData.totalMonthlyAmount)}
                </div>
                <p className="text-muted-foreground text-xs">Monthly billing</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Total Overdue</CardTitle>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-red-600 text-2xl">
                  {formatCurrency(accountData.totalOverdue)}
                </div>
                <p className="text-muted-foreground text-xs">Outstanding amounts</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Average Per Vehicle</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-purple-600 text-2xl">
                  {vehicles.length > 0 ? formatCurrency(totalMonthlyCost / vehicles.length) : 'N/A'}
                </div>
                <p className="text-muted-foreground text-xs">Monthly average</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Vehicles Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="w-5 h-5 text-blue-600" />
                <span>Quick Vehicles Preview</span>
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Showing first 5 vehicles (click Vehicles tab for full list)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vehicles.slice(0, 5).map((vehicle, index) => {
                  const monthlyCost = parseFloat(vehicle.one_month) || 0;
                  return (
                    <div key={vehicle.id || index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Car className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {vehicle.stock_description || `Vehicle ${index + 1}`}
                          </h3>
                          <p className="text-gray-500 text-sm">
                            Stock Code: {vehicle.stock_code || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {formatCurrency(monthlyCost)}
                        </div>
                        <p className="text-green-700 text-sm">Monthly Cost</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-gray-900 text-2xl">All Vehicles & Monthly Costs</h2>
            <p className="text-gray-600">Total: {vehicles.length} vehicles</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="w-5 h-5 text-blue-600" />
                <span>Vehicles Table</span>
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Complete list of vehicles with monthly costs and financial details
              </p>
            </CardHeader>
            <CardContent>
              {vehicles.length === 0 ? (
                <div className="py-8 text-gray-500 text-center">
                  <Car className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                  <p>No vehicles found for this account</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                          Vehicle Details
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                          Monthly Cost
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                          Total (Ex VAT)
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                          VAT
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                          Total (Inc VAT)
                        </th>
                        <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vehicles.map((vehicle, index) => {
                        const monthlyCost = parseFloat(vehicle.one_month) || 0;
                        const overdueStatus = getOverdueStatus(vehicle.totalOverdue || 0);
                        const totalExVat = parseFloat(vehicle.total_ex_vat) || 0;
                        const totalVat = parseFloat(vehicle.total_vat) || 0;
                        const totalInclVat = parseFloat(vehicle.total_incl_vat) || 0;
                        
                        return (
                          <tr key={vehicle.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <Car className="w-5 h-5 text-blue-600" />
                                <div>
                                  <h3 className="font-medium text-gray-900">
                                    {vehicle.stock_description || `Vehicle ${index + 1}`}
                                  </h3>
                                  <p className="text-gray-500 text-sm">
                                    Stock Code: {vehicle.stock_code || 'N/A'}
                                  </p>
                                  {vehicle.group_name && (
                                    <p className="text-gray-400 text-xs">
                                      Group: {vehicle.group_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <div className="font-medium text-green-600">
                                {formatCurrency(monthlyCost)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <div className="font-medium text-gray-900">
                                {totalExVat > 0 ? formatCurrency(totalExVat) : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <div className="font-medium text-gray-900">
                                {totalVat > 0 ? formatCurrency(totalVat) : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <div className="font-medium font-semibold text-blue-600">
                                {totalInclVat > 0 ? formatCurrency(totalInclVat) : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              <Badge className={getOverdueColor(overdueStatus)}>
                                {overdueStatus === 'current' ? 'Current' : 
                                 overdueStatus === 'low' ? 'Low Risk' :
                                 overdueStatus === 'medium' ? 'Medium Risk' : 'High Risk'}
                              </Badge>
                              {vehicle.totalOverdue > 0 && (
                                <div className="mt-2 font-medium text-red-600 text-sm">
                                  Overdue: {formatCurrency(vehicle.totalOverdue)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Financials Tab */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <h2 className="font-bold text-gray-900 text-2xl">Financial Summary</h2>
          
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-green-600" />
                  <span>Monthly Revenue Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Monthly Revenue:</span>
                    <span className="font-bold text-green-600 text-lg">
                      {formatCurrency(totalMonthlyCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Number of Vehicles:</span>
                    <span className="font-bold text-blue-600">{vehicles.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Per Vehicle:</span>
                    <span className="font-bold text-purple-600">
                      {vehicles.length > 0 ? formatCurrency(totalMonthlyCost / vehicles.length) : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>Overdue Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Overdue Amount:</span>
                    <span className="font-bold text-red-600 text-lg">
                      {formatCurrency(totalOverdue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Overdue Vehicles:</span>
                    <span className="font-bold text-orange-600">
                      {vehicles.filter(v => v.totalOverdue > 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Vehicles:</span>
                    <span className="font-bold text-green-600">
                      {vehicles.filter(v => v.totalOverdue === 0).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Financial Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Financial Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                        Monthly Cost
                      </th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                        Total Ex VAT
                      </th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                        VAT Amount
                      </th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                        Total Inc VAT
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vehicles.map((vehicle, index) => {
                      const monthlyCost = parseFloat(vehicle.one_month) || 0;
                      const totalExVat = parseFloat(vehicle.total_ex_vat) || 0;
                      const totalVat = parseFloat(vehicle.total_vat) || 0;
                      const totalInclVat = parseFloat(vehicle.total_incl_vat) || 0;
                      
                      return (
                        <tr key={vehicle.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {vehicle.stock_description || `Vehicle ${index + 1}`}
                            </div>
                            <div className="text-gray-500 text-sm">
                              {vehicle.stock_code || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="font-medium text-green-600">
                              {formatCurrency(monthlyCost)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {totalExVat > 0 ? formatCurrency(totalExVat) : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {totalVat > 0 ? formatCurrency(totalVat) : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="font-medium font-semibold text-blue-600">
                              {totalInclVat > 0 ? formatCurrency(totalInclVat) : 'N/A'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <h2 className="font-bold text-gray-900 text-2xl">Account Details</h2>
          
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Company Name:</span>
                  <span className="font-medium">{accountData.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Number:</span>
                  <span className="font-medium">{accountData.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Vehicles:</span>
                  <span className="font-medium">{accountData.vehicleCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Revenue:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(accountData.totalMonthlyAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Overdue:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(accountData.totalOverdue)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vehicle Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vehicles.length > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Vehicles:</span>
                        <Badge variant="outline">{vehicles.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Current Vehicles:</span>
                        <Badge className="bg-green-100 text-green-800">
                          {vehicles.filter(v => v.totalOverdue === 0).length}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Overdue Vehicles:</span>
                        <Badge className="bg-red-100 text-red-800">
                          {vehicles.filter(v => v.totalOverdue > 0).length}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Average Monthly Cost:</span>
                        <span className="font-medium text-blue-600">
                          {vehicles.length > 0 ? formatCurrency(totalMonthlyCost / vehicles.length) : 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
