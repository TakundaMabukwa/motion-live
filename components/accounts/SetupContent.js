'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Building2, 
  TreePine, 
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  FileText,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const accountTypes = [
  'Accumulated Depreciation',
  'Bank',
  'Cash',
  'Chargeable',
  'Cost of Goods Sold',
  'Depreciation',
  'Equity',
  'Expense Account'
];

const rootTypes = [
  'Asset',
  'Equity',
  'Expense',
  'Income',
  'Liability'
];

const priceListItems = [
  {
    itemName: 'Master Purchase List',
    enabled1: true,
    enabled2: true,
    sales: false,
    purchase: true
  },
  {
    itemName: 'New',
    enabled1: true,
    enabled2: true,
    sales: true,
    purchase: true
  }
];

// Enhanced aging data with more details
const agingData = [
  {
    customer: 'Donahue',
    overdue: 81692,
    days1_30: 79432,
    days31_60: 1640,
    days61_90: 600,
    days91_plus: 0,
    total: 81692
  },
  {
    customer: 'National Steel',
    overdue: 38327,
    days1_30: 14003,
    days31_60: 20154,
    days61_90: 4169,
    days91_plus: 0,
    total: 38327
  },
  {
    customer: 'Corp Ace',
    overdue: 33635,
    days1_30: 26319,
    days31_60: 3530,
    days61_90: 335,
    days91_plus: 3481,
    total: 33635
  },
  {
    customer: 'Martin Offices',
    overdue: 28660,
    days1_30: 10956,
    days31_60: 14459,
    days61_90: 1343,
    days91_plus: 1902,
    total: 28660
  }
];

// Chart data for invoices and collections
const chartData = [
  { month: 'AUG', invoices: 42, collections: 38 },
  { month: 'SEPT', invoices: 45, collections: 41 },
  { month: 'OCT', invoices: 48, collections: 39 },
  { month: 'NOV', invoices: 47, collections: 43 },
  { month: 'DEC', invoices: 52, collections: 49 },
  { month: 'JAN', invoices: 49, collections: 44 },
  { month: 'FEB', invoices: 46, collections: 40 }
];

const agingSummary = {
  netOutstanding: 659085,
  totalOutstanding: 960615,
  current: 35327,
  days1_30: 594336,
  days31_60: 210126,
  days61_90: 63370,
  days91_120: 56943
};

export default function SetupContent() {
  const [activeTab, setActiveTab] = useState('account-types');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Setup</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Settings className="w-4 h-4 mr-2" />
          Configure
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account-types" className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Account Types</span>
          </TabsTrigger>
          <TabsTrigger value="root-types" className="flex items-center space-x-2">
            <TreePine className="w-4 h-4" />
            <span>Root Types</span>
          </TabsTrigger>
          <TabsTrigger value="price-list" className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>Price List</span>
          </TabsTrigger>
          <TabsTrigger value="aging-analysis" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Aging Analysis</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account-types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Account Types</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-2">Name</label>
                    <Input placeholder="Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-2">Active</label>
                    <Input placeholder="Active" />
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-blue-600">Name</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-blue-600">Active</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {accountTypes.map((type, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {/* Empty for now, can be filled with actual data */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                    <Button size="sm" className="bg-blue-600">
                      1
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Next
                    </Button>
                  </div>
                  <div className="text-sm text-gray-500">50</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="root-types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TreePine className="w-5 h-5 text-blue-600" />
                <span>Root Types</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-2">Name</label>
                    <Input placeholder="Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-2">Active</label>
                    <Input placeholder="Active" />
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-blue-600">Name</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-blue-600">Active</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rootTypes.map((type, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {/* Empty for now, can be filled with actual data */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                    <Button size="sm" className="bg-blue-600">
                      1
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Next
                    </Button>
                  </div>
                  <div className="text-sm text-gray-500">50</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="price-list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span>Price List</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-2">Price List Name</label>
                    <Input placeholder="Price List Name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-2">Enabled</label>
                    <Input placeholder="Enabled" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-2">Sales</label>
                    <Input placeholder="Sales" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-600 mb-2">Purchase</label>
                    <Input placeholder="Purchase" />
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Price List Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Enabled</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Sales</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Purchase</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {priceListItems.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.itemName}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge className="bg-green-500 text-white px-4 py-1 rounded-full">
                              ✓ true
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {item.sales ? (
                              <Badge className="bg-green-500 text-white px-4 py-1 rounded-full">
                                ✓ true
                              </Badge>
                            ) : (
                              <span className="text-gray-500 bg-gray-100 px-4 py-1 rounded-full text-sm">false</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge className="bg-green-500 text-white px-4 py-1 rounded-full">
                              ✓ true
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" disabled>
                      Previous
                    </Button>
                    <Button size="sm" className="bg-blue-600">
                      1
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Next
                    </Button>
                  </div>
                  <div className="text-sm text-gray-500">50</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging-analysis" className="space-y-6">
          {/* Enhanced Dashboard-style Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <span>Invoices and Collections by Month</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="invoices" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="collections" 
                        stroke="#1f2937" 
                        strokeWidth={3}
                        dot={{ fill: '#1f2937', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center space-x-6 mt-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Invoices</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                      <span className="text-sm text-gray-600">Collections</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Cards */}
            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-700">46</div>
                    <div className="text-sm text-blue-600 font-medium">DSO</div>
                    <div className="flex items-center justify-center mt-2">
                      <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                      <div className="w-8 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-700">31</div>
                    <div className="text-sm text-purple-600 font-medium">ADP</div>
                    <div className="flex items-center justify-center mt-2">
                      <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                      <div className="w-6 h-2 bg-gray-300 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Outstanding Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Overdue Customers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-red-600" />
                  <span>Top overdue customers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b pb-2">
                    <div>Customer</div>
                    <div className="text-right">Overdue</div>
                    <div className="text-right">1-30</div>
                    <div className="text-right">31-60</div>
                    <div className="text-right">61-90</div>
                    <div className="text-right">91+</div>
                  </div>
                  
                  {agingData.map((customer, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2 text-sm py-2 border-b border-gray-100">
                      <div className="font-medium text-blue-600 underline cursor-pointer">
                        {customer.customer}
                      </div>
                      <div className="text-right font-bold">
                        ${customer.overdue.toLocaleString()}
                      </div>
                      <div className="text-right text-gray-600">
                        ${customer.days1_30.toLocaleString()}
                      </div>
                      <div className="text-right text-gray-600">
                        ${customer.days31_60.toLocaleString()}
                      </div>
                      <div className="text-right text-gray-600">
                        ${customer.days61_90.toLocaleString()}
                      </div>
                      <div className="text-right text-gray-600">
                        {customer.days91_plus > 0 ? `$${customer.days91_plus.toLocaleString()}` : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Net Outstanding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span>Net Outstanding</span>
                  </span>
                  <span className="text-lg font-bold">${agingSummary.netOutstanding.toLocaleString()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Outstanding</span>
                    <span className="font-bold">${agingSummary.totalOutstanding.toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">${agingSummary.current.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">Current</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">${agingSummary.days1_30.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">1-30</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">${agingSummary.days31_60.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">31-60</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">${agingSummary.days61_90.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">61-90</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">${agingSummary.days91_120.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">91-120</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}