'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Eye, Plus, Search, Download, Users } from 'lucide-react';

const quotes = [
  {
    id: 'SQUOT-0187',
    status: 'Draft',
    customer: 'AVIS VAN RENTAL SAMRAND',
    contact: '0118240066',
    email: 'test@gmail.com',
    created: '12:23 4 Apr 2025',
    modified: '12:23 4 Apr 2025',
    gross: 'R914.00',
    discount: 'R0.00',
    net: 'R914.00',
    fc: 'FC Skyflow'
  },
  {
    id: 'SQUOT-0188',
    status: 'Draft',
    customer: 'Testing Client',
    contact: '1234567890',
    email: 'testing@client.co.za',
    created: '12:43 4 Apr 2025',
    modified: '12:43 4 Apr 2025',
    gross: 'R914.00',
    discount: 'R0.00',
    net: 'R914.00',
    fc: 'Monique Dames'
  },
  {
    id: 'SQUOT-0189',
    status: 'Draft',
    customer: 'AVIS VAN RENTAL SAMRAND',
    contact: '0118240066',
    email: 'test@gmail.com',
    created: '08:41 7 Apr 2025',
    modified: '08:41 7 Apr 2025',
    gross: 'R25,907.00',
    discount: 'R0.00',
    net: 'R25,907.00',
    fc: 'Monique Dames'
  },
];

export default function SalesContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('accounts');

  const filteredQuotes = quotes.filter(quote =>
    quote.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sales Management</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Entry
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <Input placeholder="Ref No." />
                  <Input placeholder="Status" />
                  <Input placeholder="Customer" />
                  <Input placeholder="Contact" />
                  <Input placeholder="Email" />
                  <Input placeholder="Created" />
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Ref No.</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Created</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Net</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">FC</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredQuotes.map((quote, index) => (
                        <tr key={quote.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {quote.id}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge className="bg-blue-500 text-white">
                              {quote.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {quote.customer}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {quote.contact}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {quote.email}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {quote.created}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {quote.net}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {quote.fc}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <Button size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-full w-8 h-8 p-0">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Invoice management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Payment tracking coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Customer management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <Button className="bg-blue-500 hover:bg-blue-600 rounded-full w-12 h-12 p-0 shadow-lg">
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}