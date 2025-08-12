'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  FileText, 
  Users, 
  Package, 
  DollarSign,
  Calendar,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';

const journalEntries = [
  {
    refNo: 'QUO-001',
    status: 'Draft',
    customer: 'Test Draft',
    date: '1 Jan 2014',
    grandTotal: 'R25.00',
    outstanding: 'R25.00'
  },
  {
    refNo: 'QUO-002',
    status: 'Saved',
    customer: 'Test Saved',
    date: '15 Oct 2020',
    grandTotal: 'R25.00',
    outstanding: 'R25.00'
  },
  {
    refNo: 'QUO-003',
    status: 'NotSaved',
    customer: 'Test Not Saved',
    date: '28 Feb 2024',
    grandTotal: 'R25.00',
    outstanding: 'R25.00'
  },
  {
    refNo: 'QUO-004',
    status: 'Submitted',
    customer: 'Test Submitted',
    date: '5 Jun 2023',
    grandTotal: 'R25.00',
    outstanding: 'R25.00'
  },
  {
    refNo: 'QUO-005',
    status: 'Cancelled',
    customer: 'Test Cancelled',
    date: '5 Jun 2023',
    grandTotal: 'R25.00',
    outstanding: 'R25.00'
  }
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

const agingData = [
  {
    customer: 'AVIS VAN RENTAL',
    current: 15000,
    days30: 8500,
    days60: 3200,
    days90: 1800,
    over90: 2500,
    total: 31000
  },
  {
    customer: 'Testing Client',
    current: 12000,
    days30: 0,
    days60: 5000,
    days90: 0,
    over90: 0,
    total: 17000
  },
  {
    customer: 'AIRGASS COMPRESSORS',
    current: 0,
    days30: 2500,
    days60: 1200,
    days90: 3400,
    over90: 8900,
    total: 16000
  }
];

export default function SettingsContent() {
  const [activeTab, setActiveTab] = useState('profile');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft':
        return 'bg-blue-500';
      case 'Saved':
        return 'bg-blue-500';
      case 'NotSaved':
        return 'bg-red-500';
      case 'Submitted':
        return 'bg-green-500';
      case 'Cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAgingColor = (days) => {
    if (days === 'current') return 'text-green-600';
    if (days === 'days30') return 'text-yellow-600';
    if (days === 'days60') return 'text-orange-600';
    if (days === 'days90') return 'text-red-600';
    if (days === 'over90') return 'text-red-800';
    return 'text-gray-900';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="journal-entry">Journal Entry</TabsTrigger>
          <TabsTrigger value="party">Party</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="price-list">Price List</TabsTrigger>
          <TabsTrigger value="aging">Aging Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Profile Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="Accounts" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Skyflow" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue="accounts@skyflow.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" defaultValue="+27 123 456 789" />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal-entry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Journal Entry</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <Input placeholder="Ref No." />
                  <Input placeholder="Status" />
                  <Input placeholder="Customer" />
                  <Input placeholder="Date" />
                  <Input placeholder="Grand Total" />
                  <Input placeholder="Outstanding" />
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Ref No.</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Customer</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Grand Total</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {journalEntries.map((entry, index) => (
                        <tr key={entry.refNo} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.refNo}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge className={`${getStatusColor(entry.status)} text-white px-4 py-1 rounded-full`}>
                              ✓ {entry.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.customer}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.date}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.grandTotal}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.outstanding}
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
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="party" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Party Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Party management settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>Items</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input placeholder="Item Name" />
                  <Input placeholder="Unit Type" />
                  <Input placeholder="Tax" />
                  <Input placeholder="Rate" />
                </div>

                <div className="text-center py-8 text-gray-500">
                  No results
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Input placeholder="Item Name" />
                  <Input placeholder="Enabled" />
                  <Input placeholder="Enabled" />
                  <Input placeholder="Sales" />
                  <Input placeholder="Purchase" />
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Item Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-blue-600">Enabled</th>
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
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.enabled1 ? 'true' : 'false'}
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

        <TabsContent value="aging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>Aging Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Current (0-30 days)</p>
                          <p className="text-2xl font-bold text-green-700">R27,000</p>
                        </div>
                        <TrendingDown className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-600">31-60 days</p>
                          <p className="text-2xl font-bold text-yellow-700">R11,000</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-600">61-90 days</p>
                          <p className="text-2xl font-bold text-orange-700">R9,400</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-600">Over 90 days</p>
                          <p className="text-2xl font-bold text-red-700">R16,600</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Aging Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-blue-600">Customer</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-green-600">Current</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-yellow-600">31-60 Days</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-orange-600">61-90 Days</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-red-600">Over 90 Days</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-blue-600">Total Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {agingData.map((customer, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {customer.customer}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                            R{customer.current.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-yellow-600">
                            R{customer.days30.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-orange-600">
                            R{customer.days60.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                            R{customer.over90.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                            R{customer.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          TOTAL
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                          R27,000
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-yellow-600">
                          R11,000
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-orange-600">
                          R9,400
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                          R16,600
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                          R64,000
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}