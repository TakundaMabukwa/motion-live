'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const stats = [
  { title: 'Opened', value: '0', change: '0 Since last month', icon: Package, color: 'bg-blue-500' },
  { title: 'Waiting for Parts Assignment', value: '0', change: '0 Since last month', icon: Clock, color: 'bg-yellow-500' },
  { title: 'Waiting on Orders', value: '0', change: '0 Since last month', icon: AlertCircle, color: 'bg-orange-500' },
  { title: 'Waiting on Arrival of Parts', value: '0', change: '0 Since last month', icon: TrendingUp, color: 'bg-purple-500' },
  { title: 'Awaiting Completion', value: '0', change: '0 Since last month', icon: Clock, color: 'bg-indigo-500' },
  { title: 'Closed', value: '0', change: '0 Since last month', icon: CheckCircle, color: 'bg-green-500' },
];

export default function Overview() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last updated: 2 minutes ago</p>
          </div>
        </div>
        <p className="text-gray-600">Monitor your inventory management system status</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.color}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <p className="text-xs text-green-600 font-medium">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">System initialized</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Dashboard loaded successfully</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database Connection</span>
                <span className="text-sm font-medium text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Inventory Sync</span>
                <span className="text-sm font-medium text-green-600">Up to date</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">System Version</span>
                <span className="text-sm font-medium text-gray-900">v0.10.100</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}