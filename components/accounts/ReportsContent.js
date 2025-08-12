'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Building2,
  Calculator,
  DollarSign,
  BarChart3
} from 'lucide-react';

const miniLedgerData = [
  {
    account: 'Sales Revenue',
    date: '2025-01-15',
    debit: '',
    credit: 'R25,000.00',
    balance: 'R25,000.00',
    party: 'AVIS VAN RENTAL',
    refName: 'INV-001',
    refType: 'Invoice'
  },
  {
    account: 'Office Expenses',
    date: '2025-01-14',
    debit: 'R1,250.00',
    credit: '',
    balance: 'R1,250.00',
    party: 'Office Supplies Co',
    refName: 'PO-045',
    refType: 'Purchase Order'
  },
  {
    account: 'Bank Account',
    date: '2025-01-13',
    debit: 'R15,000.00',
    credit: '',
    balance: 'R15,000.00',
    party: 'Testing Client',
    refName: 'PAY-123',
    refType: 'Payment'
  }
];

const profitLossData = {
  income: {
    directIncome: {
      sales: 125000,
      serviceRevenue: 45000
    },
    totalIncome: 170000
  },
  expenses: {
    directExpenses: {
      stockExpenses: 35000,
      materialCosts: 15000
    },
    operatingExpenses: {
      officeRent: 8000,
      utilities: 2500,
      salaries: 45000
    },
    totalExpenses: 105500
  },
  totalProfit: 64500
};

export default function ReportsContent() {
  const [activeTab, setActiveTab] = useState('mini-ledger');
  const [expandedSections, setExpandedSections] = useState({
    income: true,
    directIncome: true,
    expenses: true,
    directExpenses: true,
    operatingExpenses: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mini-ledger" className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Mini Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="profits-losses" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Profits and Losses</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mini-ledger" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Mini Ledger</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filter Section */}
              <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="refType" className="text-sm font-medium text-red-600">
                      Ref Type *
                    </Label>
                    <select className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select Type</option>
                      <option value="invoice">Invoice</option>
                      <option value="payment">Payment</option>
                      <option value="purchase">Purchase Order</option>
                    </select>
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="refName" className="text-sm font-medium text-red-600">
                      Ref Name *
                    </Label>
                    <select className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select Reference</option>
                      <option value="INV-001">INV-001</option>
                      <option value="PO-045">PO-045</option>
                      <option value="PAY-123">PAY-123</option>
                    </select>
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="account" className="text-sm font-medium text-red-600">
                      Account *
                    </Label>
                    <select className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select Account</option>
                      <option value="sales">Sales Revenue</option>
                      <option value="expenses">Office Expenses</option>
                      <option value="bank">Bank Account</option>
                    </select>
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="party" className="text-sm font-medium text-red-600">
                      Party *
                    </Label>
                    <select className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select Party</option>
                      <option value="avis">AVIS VAN RENTAL</option>
                      <option value="testing">Testing Client</option>
                      <option value="office">Office Supplies Co</option>
                    </select>
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="groupBy" className="text-sm font-medium text-red-600">
                      Group By *
                    </Label>
                    <select className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select Grouping</option>
                      <option value="account">Account</option>
                      <option value="date">Date</option>
                      <option value="party">Party</option>
                    </select>
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fromDate" className="text-sm font-medium text-red-600">
                      From Date *
                    </Label>
                    <Input 
                      type="date" 
                      id="fromDate"
                      className="mt-1"
                    />
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="toDate" className="text-sm font-medium text-red-600">
                      To Date *
                    </Label>
                    <Input 
                      type="date" 
                      id="toDate"
                      className="mt-1"
                    />
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-6">
                    <input type="checkbox" id="includeCancelled" className="rounded" />
                    <Label htmlFor="includeCancelled" className="text-sm">Include Cancelled</Label>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Search className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>

              {/* Results Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Account</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Debit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Credit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Party</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Ref Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider">Ref Type</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {miniLedgerData.map((entry, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.account}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.date}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {entry.debit}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {entry.credit}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.balance}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.party}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600">
                          {entry.refName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant="outline" className="text-xs">
                            {entry.refType}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="default" size="sm" className="bg-blue-600">
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  Showing 1-3 of 3 results
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profits-losses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>Profits and Losses</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filter Section */}
              <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="basedOn" className="text-sm font-medium text-red-600">
                      Based On *
                    </Label>
                    <select className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select Basis</option>
                      <option value="accrual">Accrual</option>
                      <option value="cash">Cash</option>
                    </select>
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="periodicity" className="text-sm font-medium text-red-600">
                      Periodicity *
                    </Label>
                    <select className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select Period</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="toDatePL" className="text-sm font-medium text-red-600">
                      To Date *
                    </Label>
                    <select className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">Select Date</option>
                      <option value="2025-01">January 2025</option>
                      <option value="2024-12">December 2024</option>
                    </select>
                    <p className="text-xs text-red-500 mt-1">This field is required</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="months" className="text-sm font-medium text-gray-700">
                      Number of Months
                    </Label>
                    <Input 
                      type="number" 
                      id="months"
                      placeholder="12"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Calculator className="w-4 h-4 mr-2" />
                  Generate P&L Report
                </Button>
              </div>

              {/* Profit & Loss Statement */}
              <div className="space-y-4">
                <div className="bg-white border rounded-lg">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Account Structure</h3>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {/* Income Section */}
                    <div>
                      <button
                        onClick={() => toggleSection('income')}
                        className="flex items-center space-x-2 w-full text-left p-2 hover:bg-gray-50 rounded"
                      >
                        {expandedSections.income ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-medium text-gray-900">Income</span>
                      </button>
                      
                      {expandedSections.income && (
                        <div className="ml-6 space-y-2">
                          <button
                            onClick={() => toggleSection('directIncome')}
                            className="flex items-center space-x-2 w-full text-left p-2 hover:bg-gray-50 rounded"
                          >
                            {expandedSections.directIncome ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="text-gray-700">Direct Income</span>
                          </button>
                          
                          {expandedSections.directIncome && (
                            <div className="ml-6 space-y-1">
                              <div className="flex justify-between items-center p-2 text-sm">
                                <span className="text-gray-600">Sales</span>
                                <span className="font-medium text-green-600">
                                  R{profitLossData.income.directIncome.sales.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2 text-sm">
                                <span className="text-gray-600">Service Revenue</span>
                                <span className="font-medium text-green-600">
                                  R{profitLossData.income.directIncome.serviceRevenue.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded mt-2">
                        <span className="font-semibold text-green-800">Total Income (Credit)</span>
                        <span className="font-bold text-green-600">
                          R{profitLossData.income.totalIncome.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Expenses Section */}
                    <div>
                      <button
                        onClick={() => toggleSection('expenses')}
                        className="flex items-center space-x-2 w-full text-left p-2 hover:bg-gray-50 rounded"
                      >
                        {expandedSections.expenses ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="font-medium text-gray-900">Expenses</span>
                      </button>
                      
                      {expandedSections.expenses && (
                        <div className="ml-6 space-y-2">
                          <button
                            onClick={() => toggleSection('directExpenses')}
                            className="flex items-center space-x-2 w-full text-left p-2 hover:bg-gray-50 rounded"
                          >
                            {expandedSections.directExpenses ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="text-gray-700">Direct Expenses</span>
                          </button>
                          
                          {expandedSections.directExpenses && (
                            <div className="ml-6 space-y-1">
                              <div className="flex justify-between items-center p-2 text-sm">
                                <span className="text-gray-600">Stock Expenses</span>
                                <span className="font-medium text-red-600">
                                  R{profitLossData.expenses.directExpenses.stockExpenses.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-2 text-sm">
                                <span className="text-gray-600">Material Costs</span>
                                <span className="font-medium text-red-600">
                                  R{profitLossData.expenses.directExpenses.materialCosts.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded mt-2">
                        <span className="font-semibold text-red-800">Total Expense (Debit)</span>
                        <span className="font-bold text-red-600">
                          R{profitLossData.expenses.totalExpenses.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Total Profit */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                        <span className="text-lg font-bold text-blue-800">Total Profit</span>
                        <span className="text-xl font-bold text-blue-600">
                          R{profitLossData.totalProfit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}