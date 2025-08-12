'use client';

import { Eye, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Metrics {
  totalVehicles: number;
  departingBefore9AM: number;
  onTimePercentage: number;
  notOnTimePercentage: number;
}

interface DashboardMetricsProps {
  metrics: Metrics;
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Vehicles */}
      <Card className="shadow-md border-0">
        <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
          <CardTitle className="font-medium text-gray-600 text-sm">
            Number of Vehicles
          </CardTitle>
          <Eye className="w-4 h-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-gray-900 text-3xl">{metrics.totalVehicles}</div>
        </CardContent>
      </Card>

      {/* Departing Before 9AM */}
      <Card className="shadow-md border-0">
        <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
          <CardTitle className="font-medium text-gray-600 text-sm">
            Departing Before 9:00 AM
          </CardTitle>
          <Clock className="w-4 h-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-gray-900 text-3xl">{metrics.departingBefore9AM}</div>
        </CardContent>
      </Card>

      {/* On Time Percentage */}
      <Card className="shadow-md border-0">
        <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
          <CardTitle className="font-medium text-gray-600 text-sm">
            On Time
          </CardTitle>
          <TrendingUp className="w-4 h-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="font-bold text-green-600 text-3xl">{metrics.onTimePercentage}%</div>
            <div className="bg-gray-200 rounded-full w-full h-2">
              <div 
                className="bg-green-500 rounded-full h-2 transition-all duration-300" 
                style={{ width: `${metrics.onTimePercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Not On Time Percentage */}
      <Card className="shadow-md border-0">
        <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
          <CardTitle className="font-medium text-gray-600 text-sm">
            Not on Time
          </CardTitle>
          <TrendingDown className="w-4 h-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="font-bold text-red-600 text-3xl">{metrics.notOnTimePercentage}%</div>
            <div className="bg-gray-200 rounded-full w-full h-2">
              <div 
                className="bg-red-500 rounded-full h-2 transition-all duration-300" 
                style={{ width: `${metrics.notOnTimePercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}