'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight, TrendingUp, AlertTriangle, Car, DollarSign, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OverdueAccountsWidget } from '@/components/overdue/OverdueAccountsWidget';

export default function DashboardContent() {
  const router = useRouter();
  const [monthlyTotals, setMonthlyTotals] = useState(null);
  const [loadingTotals, setLoadingTotals] = useState(true);

  // Fetch monthly subscription totals
  useEffect(() => {
    const fetchMonthlyTotals = async () => {
      try {
        setLoadingTotals(true);
        const response = await fetch('/api/vehicle-invoices/monthly-totals');
        if (response.ok) {
          const data = await response.json();
          setMonthlyTotals(data);
        }
      } catch (error) {
        console.error('Error fetching monthly totals:', error);
      } finally {
        setLoadingTotals(false);
      }
    };

    fetchMonthlyTotals();
  }, []);

  const handleViewAccounts = () => {
    router.push('/protected/accounts');
  };

  const handleAccountClick = (accountNumber) => {
    router.push(`/protected/accounts/${encodeURIComponent(accountNumber)}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Accounts Dashboard</h2>
        <Button 
          onClick={handleViewAccounts}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Users className="w-4 h-4 mr-2" />
          View All Accounts
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Monthly Subscription Totals - New Section */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl border-green-200">
        <CardHeader className="text-center">
          <CardTitle className="flex justify-center items-center space-x-2 mb-2 text-green-900 text-2xl">
            <DollarSign className="w-8 h-8" />
            <span>Monthly Subscription Overview</span>
          </CardTitle>
          <p className="text-green-700 text-lg">
            Total monthly revenue across all cost centers and customers
          </p>
        </CardHeader>
        <CardContent>
          {loadingTotals ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading monthly totals...</span>
            </div>
          ) : monthlyTotals ? (
            <div className="gap-8 grid grid-cols-1 md:grid-cols-3">
              {/* Total Monthly Revenue */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <TrendingUp className="w-12 h-12 text-green-600" />
                </div>
                <div className="mb-2 font-bold text-green-600 text-4xl">
                  {formatCurrency(monthlyTotals.totalMonthlyRevenue)}
                </div>
                <p className="font-semibold text-green-700 text-lg">Total Monthly Revenue</p>
                <p className="text-green-600 text-sm">All vehicles combined</p>
              </div>
              
              {/* Total Vehicles */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <Car className="w-12 h-12 text-blue-600" />
                </div>
                <div className="mb-2 font-bold text-blue-600 text-4xl">
                  {monthlyTotals.totalVehicles}
                </div>
                <p className="font-semibold text-blue-700 text-lg">Total Vehicles</p>
                <p className="text-blue-600 text-sm">Across all accounts</p>
              </div>
              
              {/* Total Accounts */}
              <div className="bg-white shadow-md p-6 rounded-lg text-center">
                <div className="flex justify-center items-center mb-4">
                  <Users className="w-12 h-12 text-indigo-600" />
                </div>
                <div className="mb-2 font-bold text-indigo-600 text-4xl">
                  {monthlyTotals.totalAccounts}
                </div>
                <p className="font-semibold text-indigo-700 text-lg">Total Accounts</p>
                <p className="text-indigo-600 text-sm">Cost centers/customers</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <p>Unable to load monthly totals</p>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* All Accounts Widget - Main Feature */}
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-600">
            <Users className="w-5 h-5" />
            <span>All Accounts Overview</span>
          </CardTitle>
          <p className="text-gray-600 text-sm">
            Monthly subscription totals for all cost centers and customers. Click on any account to view detailed vehicle information and costs.
          </p>
        </CardHeader>
        <CardContent>
          <OverdueAccountsWidget 
            autoRefresh={true} 
            refreshInterval={300000} // 5 minutes
            showAllAccounts={true}
            maxAccounts={20}
            onAccountClick={handleAccountClick}
          />
        </CardContent>
      </Card>

      {/* Main Action Card */}
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Accounts Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Manage customer accounts, track vehicle invoices, and monitor overdue payments. 
              All data is sourced from the vehicle_invoices table with real-time overdue calculations.
            </p>
            
            <div className="flex space-x-4">
              <Button 
                onClick={handleViewAccounts}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Users className="w-4 h-4 mr-2" />
                Access Full Accounts Dashboard
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Features</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Customer account overview</li>
                  <li>• Vehicle invoice tracking</li>
                  <li>• Overdue payment monitoring</li>
                  <li>• Search and filtering</li>
                  <li>• Click to view vehicle details</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Payment Schedule</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Due date: 21st of each month</li>
                  <li>• Automated overdue calculations</li>
                  <li>• Aging bucket analysis</li>
                  <li>• Risk assessment</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}