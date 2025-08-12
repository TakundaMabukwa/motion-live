'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight, TrendingUp, AlertTriangle, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OverdueAccountsWidget } from '@/components/overdue/OverdueAccountsWidget';

export default function DashboardContent() {
  const router = useRouter();

  const handleViewAccounts = () => {
    router.push('/protected/accounts');
  };

  const handleAccountClick = (accountNumber) => {
    router.push(`/protected/accounts/${encodeURIComponent(accountNumber)}`);
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