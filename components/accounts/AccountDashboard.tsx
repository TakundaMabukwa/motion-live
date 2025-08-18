'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  DollarSign, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface AccountDashboardProps {
  activeSection: string;
}

export default function AccountDashboard({ activeSection }: AccountDashboardProps) {
  const params = useParams();
  const accountNumber = params.accountNumber as string;
  
  const [accountData, setAccountData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAccountData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching data for account:', accountNumber);
      
      // Fetch detailed vehicle data for this account directly
      const vehiclesResponse = await fetch(`/api/vehicle-invoices/account/${encodeURIComponent(accountNumber)}`);
      console.log('API Response status:', vehiclesResponse.status);
      
      if (!vehiclesResponse.ok) {
        const errorText = await vehiclesResponse.text();
        console.error('API Error response:', errorText);
        throw new Error('Failed to fetch vehicle data');
      }
      
      const vehiclesData = await vehiclesResponse.json();
      console.log('API Response data:', vehiclesData);
      
      if (!vehiclesData.success) {
        throw new Error(vehiclesData.error || 'Failed to fetch account data');
      }
      
      // Set account data from the API response
      setAccountData({
        company: vehiclesData.company,
        accountNumber: vehiclesData.accountNumber,
        totalMonthlyAmount: vehiclesData.summary.totalMonthlyAmount,
        totalOverdue: vehiclesData.summary.totalOverdueAmount,
        vehicleCount: vehiclesData.summary.totalVehicles
      });
      
      // Set vehicles data
      setVehicles(vehiclesData.vehicles || []);
      console.log('Set vehicles data:', vehiclesData.vehicles);
      
    } catch (error) {
      console.error('Error fetching account data:', error);
      toast.error('Failed to load account data');
    } finally {
      setLoading(false);
    }
  }, [accountNumber]);

  useEffect(() => {
    if (accountNumber) {
      fetchAccountData();
    }
  }, [accountNumber, fetchAccountData]);

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

  // Check if payment is due (after 21st of month)
  const isPaymentDue = () => {
    const today = new Date();
    const currentDay = today.getDate();
    return currentDay >= 21;
  };

  // Get appropriate label for monthly amounts
  const getMonthlyLabel = () => {
    return isPaymentDue() ? 'Amount Due' : 'Monthly Total';
  };

  // Get appropriate description for monthly amounts
  const getMonthlyDescription = () => {
    return isPaymentDue() ? 'Payment due for this month' : 'Combined monthly billing';
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
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading account details...</span>
        </div>
      </div>
    );
  }

  if (!accountData) {
    return (
      <div className="space-y-6">
        <div className="py-12 text-center">
          <AlertTriangle className="mx-auto mb-4 w-12 h-12 text-red-500" />
          <h2 className="mb-2 font-semibold text-gray-900 text-xl">Account Not Found</h2>
          <p className="mb-4 text-gray-600">The requested account could not be found.</p>
        </div>
      </div>
    );
  }

  const totalMonthlyCost = vehicles.reduce((sum, vehicle) => sum + (parseFloat(vehicle.one_month) || 0), 0);
  const totalOverdue = vehicles.reduce((sum, vehicle) => sum + (vehicle.totalOverdue || 0), 0);

  // Dashboard Section
  if (activeSection === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-gray-900 text-3xl">{accountData.company}</h1>
            <p className="text-gray-600">Account #{accountData.accountNumber}</p>
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

        {/* PROMINENT SUMMARY CARD - Total Vehicles and Monthly Total */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-xl border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="flex justify-center items-center space-x-2 mb-2 text-blue-900 text-2xl">
              <TrendingUp className="w-8 h-8" />
              <span>Account Summary</span>
            </CardTitle>
            <p className="text-blue-700 text-lg">
              Complete overview of {accountData.company}
            </p>
          </CardHeader>
          <CardContent>
            <div className="gap-8 grid grid-cols-1 md:grid-cols-2">
              {/* Total Vehicles Card */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <Car className="w-12 h-12 text-blue-600" />
                </div>
                <div className="mb-2 font-bold text-blue-600 text-4xl">
                  {vehicles.length}
                </div>
                <p className="font-semibold text-blue-700 text-lg">Total Vehicles</p>
                <p className="text-blue-600 text-sm">Fleet size for this account</p>
              </div>
              
              {/* Monthly Total Card */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <DollarSign className="w-12 h-12 text-green-600" />
                </div>
                <div className="mb-2 font-bold text-green-600 text-4xl">
                  {formatCurrency(totalMonthlyCost)}
                </div>
                <p className="font-semibold text-green-700 text-lg">{getMonthlyLabel()}</p>
                <p className="text-green-600 text-sm">{getMonthlyDescription()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview - New Section */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl border-green-200">
          <CardHeader className="text-center">
            <CardTitle className="flex justify-center items-center space-x-2 mb-2 text-green-900 text-2xl">
              <DollarSign className="w-8 h-8" />
              <span>Financial Overview</span>
            </CardTitle>
            <p className="text-green-700 text-lg">
              Total monthly revenue and detailed financial breakdown
            </p>
          </CardHeader>
          <CardContent>
            <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
              {/* Total Monthly Revenue */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <TrendingUp className="w-12 h-12 text-green-600" />
                </div>
                <div className="mb-2 font-bold text-green-600 text-3xl">
                  {formatCurrency(vehicles.reduce((sum, v) => sum + (parseFloat(v.total_incl_vat) || 0), 0))}
                </div>
                <p className="font-semibold text-green-700 text-lg">Total Monthly Revenue</p>
                <p className="text-green-600 text-sm">All vehicles incl. VAT</p>
              </div>
              
              {/* Total Ex VAT */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <DollarSign className="w-12 h-12 text-blue-600" />
                </div>
                <div className="mb-2 font-bold text-blue-600 text-3xl">
                  {formatCurrency(vehicles.reduce((sum, v) => sum + (parseFloat(v.total_ex_vat) || 0), 0))}
                </div>
                <p className="font-semibold text-blue-700 text-lg">Total Ex VAT</p>
                <p className="text-blue-600 text-sm">Before VAT</p>
              </div>
              
              {/* Total VAT */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <DollarSign className="w-12 h-12 text-purple-600" />
                </div>
                <div className="mb-2 font-bold text-purple-600 text-3xl">
                  {formatCurrency(vehicles.reduce((sum, v) => sum + (parseFloat(v.total_vat) || 0), 0))}
                </div>
                <p className="font-semibold text-purple-700 text-lg">Total VAT</p>
                <p className="text-purple-600 text-sm">VAT amount</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Total Overdue</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-red-600 text-2xl">
                {formatCurrency(totalOverdue)}
              </div>
              <p className="text-red-700 text-sm">Outstanding amounts</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">{isPaymentDue() ? 'Amount Due' : 'Account Monthly'}</CardTitle>
              <DollarSign className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-blue-600 text-2xl">
                {formatCurrency(accountData.totalMonthlyAmount)}
              </div>
              <p className="text-blue-700 text-sm">{isPaymentDue() ? 'Payment due' : 'Monthly average'}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Average Per Vehicle</CardTitle>
              <Car className="w-4 h-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-indigo-600 text-2xl">
                {vehicles.length > 0 ? formatCurrency(totalMonthlyCost / vehicles.length) : 'N/A'}
              </div>
              <p className="text-indigo-700 text-sm">Monthly average</p>
            </CardContent>
          </Card>
        </div>

        {/* Vehicles List */}
        {vehicles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="w-5 h-5 text-blue-600" />
                <span>Vehicles & Monthly Costs</span>
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Individual vehicle monthly costs and details
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicles.map((vehicle, index) => {
                  const monthlyCost = parseFloat(vehicle.one_month) || 0;
                  const overdueStatus = getOverdueStatus(vehicle.totalOverdue || 0);
                  const totalInclVat = parseFloat(vehicle.total_incl_vat) || 0;
                  
                  return (
                    <div key={vehicle.id || index} className="hover:shadow-md p-4 border rounded-lg transition-shadow">
                      <div className="flex justify-between items-center">
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
                        
                        <div className="text-right">
                          <div className="font-bold text-green-600 text-2xl">
                            {formatCurrency(monthlyCost)}
                          </div>
                          <p className="text-green-700 text-sm">Monthly Cost</p>
                          <div className="mt-1 font-semibold text-blue-600 text-lg">
                            {formatCurrency(totalInclVat)}
                          </div>
                          <p className="text-blue-700 text-sm">Total Inc VAT</p>
                          <Badge className={`mt-2 ${getOverdueColor(overdueStatus)}`}>
                            {overdueStatus === 'current' ? 'Current' : 
                             overdueStatus === 'low' ? 'Low Risk' :
                             overdueStatus === 'medium' ? 'Medium Risk' : 'High Risk'}
                          </Badge>
                        </div>
                      </div>
                      
                      {vehicle.totalOverdue > 0 && (
                        <div className="mt-3 pt-3 border-gray-200 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 text-sm">Overdue Amount:</span>
                            <span className="font-medium text-red-600">
                              {formatCurrency(vehicle.totalOverdue)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Vehicles Section - Detailed Table View
  if (activeSection === 'vehicles') {
    console.log('Rendering vehicles section, vehicles count:', vehicles.length);
    console.log('Vehicles data:', vehicles);
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-gray-900 text-3xl">Vehicles & Monthly Costs</h1>
            <p className="text-gray-600">Showing {vehicles.length} vehicles for this account</p>
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

        {/* Vehicles Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Car className="w-5 h-5 text-blue-600" />
              <span>Vehicles Table</span>
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Monthly costs and details for all vehicles in this account
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
    );
  }

  // Financials Section - New Detailed Financial View
  if (activeSection === 'financials') {
    const totalMonthlyRevenue = vehicles.reduce((sum, v) => sum + (parseFloat(v.total_incl_vat) || 0), 0);
    const totalExVat = vehicles.reduce((sum, v) => sum + (parseFloat(v.total_ex_vat) || 0), 0);
    const totalVat = vehicles.reduce((sum, v) => sum + (parseFloat(v.total_vat) || 0), 0);
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-gray-900 text-3xl">Financial Summary</h1>
            <p className="text-gray-600">Detailed financial breakdown for {accountData.company}</p>
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

        {/* Total Monthly Revenue Summary */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl border-green-200">
          <CardHeader className="text-center">
            <CardTitle className="flex justify-center items-center space-x-2 mb-2 text-green-900 text-2xl">
              <DollarSign className="w-8 h-8" />
              <span>{isPaymentDue() ? 'Total Amount Due' : 'Total Monthly Revenue'}</span>
            </CardTitle>
            <p className="text-green-700 text-lg">
              {isPaymentDue() 
                ? 'Total amount due for all vehicles in this account'
                : 'Combined monthly revenue for all vehicles in this account'
              }
            </p>
          </CardHeader>
          <CardContent>
            <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
              {/* Total Monthly Revenue */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <TrendingUp className="w-12 h-12 text-green-600" />
                </div>
                <div className="mb-2 font-bold text-green-600 text-4xl">
                  {formatCurrency(totalMonthlyRevenue)}
                </div>
                <p className="font-semibold text-green-700 text-lg">{isPaymentDue() ? 'Total Amount Due' : 'Total Monthly Revenue'}</p>
                <p className="text-green-600 text-sm">{isPaymentDue() ? 'All vehicles due' : 'All vehicles incl. VAT'}</p>
              </div>
              
              {/* Total Ex VAT */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <DollarSign className="w-12 h-12 text-blue-600" />
                </div>
                <div className="mb-2 font-bold text-blue-600 text-4xl">
                  {formatCurrency(totalExVat)}
                </div>
                <p className="font-semibold text-blue-700 text-lg">Total Ex VAT</p>
                <p className="text-green-600 text-sm">Before VAT</p>
              </div>
              
              {/* Total VAT */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <DollarSign className="w-12 h-12 text-purple-600" />
                </div>
                <div className="mb-2 font-bold text-purple-600 text-4xl">
                  {formatCurrency(totalVat)}
                </div>
                <p className="font-semibold text-purple-700 text-lg">Total VAT</p>
                <p className="text-green-600 text-sm">VAT amount</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Financial Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span>Detailed Financial Breakdown</span>
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Individual vehicle financial details with totals for each vehicle
            </p>
          </CardHeader>
          <CardContent>
            {vehicles.length === 0 ? (
              <div className="py-8 text-gray-500 text-center">
                <DollarSign className="mx-auto mb-4 w-12 h-12 text-gray-300" />
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
                        Due Amount
                      </th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                        Total (Ex VAT)
                      </th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                        VAT Amount
                      </th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                        Total (Inc VAT)
                      </th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                        Group
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
                            <div className="flex items-center space-x-3">
                              <Car className="w-5 h-5 text-blue-600" />
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {vehicle.stock_description || `Vehicle ${index + 1}`}
                                </h3>
                                <p className="text-gray-500 text-sm">
                                  Stock Code: {vehicle.stock_code || 'N/A'}
                                </p>
                                {vehicle.beame && (
                                  <p className="text-gray-400 text-xs">
                                    Beame: {vehicle.beame}
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
                            <div className="text-gray-900 text-sm">
                              {vehicle.group_name || 'N/A'}
                            </div>
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
    );
  }

  // Payment Section
  if (activeSection === 'payment') {
    const customerTotalValue = vehicles.reduce((sum, v) => sum + (parseFloat(v.total_incl_vat) || 0), 0);
    const totalExVat = vehicles.reduce((sum, v) => sum + (parseFloat(v.total_ex_vat) || 0), 0);
    const totalVat = vehicles.reduce((sum, v) => sum + (parseFloat(v.total_vat) || 0), 0);
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-gray-900 text-3xl">Payment</h1>
            <p className="text-gray-600">Payment processing for {accountData.company}</p>
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

        {/* Payment Summary Cards */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
          {/* Customer Total Value */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="text-center">
              <CardTitle className="text-blue-900 text-lg">{isPaymentDue() ? 'Amount Due' : 'Customer Total Value'}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-2 font-bold text-blue-600 text-3xl">
                {formatCurrency(customerTotalValue)}
              </div>
              <p className="text-blue-700 text-sm">{isPaymentDue() ? 'Total amount due' : 'Total value including VAT'}</p>
            </CardContent>
          </Card>

          {/* Excl VAT */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="text-center">
              <CardTitle className="text-green-900 text-lg">Excl VAT</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-2 font-bold text-green-600 text-3xl">
                {formatCurrency(totalExVat)}
              </div>
              <p className="text-green-700 text-sm">Total before VAT</p>
            </CardContent>
          </Card>

          {/* Total VAT */}
          <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
            <CardHeader className="text-center">
              <CardTitle className="text-purple-900 text-lg">Total VAT</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-2 font-bold text-purple-600 text-3xl">
                {formatCurrency(totalVat)}
              </div>
              <p className="text-purple-700 text-sm">VAT amount</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Actions */}
        <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
          {/* Confirm Payment */}
          <Card className="border-2 border-gray-300 hover:border-blue-400 border-dashed transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Confirm Payment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-600">Process and confirm payment for this account</p>
              <Button className="bg-green-600 hover:bg-green-700 w-full">
                Confirm Payment
              </Button>
            </CardContent>
          </Card>

          {/* See Overview */}
          <Card className="border-2 border-gray-300 hover:border-blue-400 border-dashed transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-blue-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>See Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-600">View detailed payment overview and generate invoice</p>
              <Button className="bg-blue-600 hover:bg-blue-700 w-full">
                Generate Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Settings Section
  if (activeSection === 'settings') {
    return (
      <div className="space-y-6">
        <h2 className="font-bold text-gray-900 text-2xl">Account Settings</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <span>Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Account settings functionality coming soon...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="space-y-6">
      <h2 className="font-bold text-gray-900 text-2xl">Select a Section</h2>
      <p className="text-gray-600">Please select a section from the sidebar to get started.</p>
    </div>
  );
}
