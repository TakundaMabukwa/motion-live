'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Building2, 
  Calendar,
  Hash,
  Loader2,
  Plus,
  RefreshCw,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

interface CostCenter {
  id: string;
  created_at: string;
  cost_code: string;
  company: string;
}

interface PaymentInfo {
  cost_code: string;
  due_amount: number;
  balance_due: number;
  payment_status: string;
  billing_month: string;
  overdue_30_days: number;
  overdue_60_days: number;
  overdue_90_days: number;
  last_updated: string;
}

export default function ClientCostCentersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountsParam = searchParams.get('accounts');
  
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [filteredCostCenters, setFilteredCostCenters] = useState<CostCenter[]>([]);
  const [paymentData, setPaymentData] = useState<Record<string, PaymentInfo>>({});
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [accountNumbers, setAccountNumbers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 50;

  useEffect(() => {
    if (accountsParam) {
      const decodedAccounts = decodeURIComponent(accountsParam);
      const accounts = decodedAccounts.split(',').map(acc => acc.trim()).filter(acc => acc);
      setAccountNumbers(accounts);
      fetchClientInfo(accounts);
    }
  }, [accountsParam]);

  // Check for stored payment data from sessionStorage
  useEffect(() => {
    const storedPaymentData = sessionStorage.getItem('clientPaymentData');
    if (storedPaymentData) {
      try {
        const data = JSON.parse(storedPaymentData);
        
        // Set client info from stored data
        if (data.clientInfo) {
          setClientInfo(data.clientInfo);
        }
        
        // Set payment summary
        if (data.summary) {
          setPaymentSummary(data.summary);
        }
        
        // Convert payment array to object keyed by cost_code
        if (data.payments && Array.isArray(data.payments)) {
          const paymentMap: Record<string, PaymentInfo> = {};
          data.payments.forEach((payment: any) => {
            paymentMap[payment.cost_code] = {
              cost_code: payment.cost_code,
              due_amount: parseFloat(payment.due_amount) || 0,
              balance_due: parseFloat(payment.balance_due) || 0,
              payment_status: payment.payment_status || 'pending',
              billing_month: payment.billing_month || '',
              overdue_30_days: parseFloat(payment.overdue_30_days) || 0,
              overdue_60_days: parseFloat(payment.overdue_60_days) || 0,
              overdue_90_days: parseFloat(payment.overdue_90_days) || 0,
              last_updated: payment.last_updated || '',
            };
          });
          setPaymentData(paymentMap);
        }
        
        // Clear the stored data after using it
        sessionStorage.removeItem('clientPaymentData');
      } catch (error) {
        console.error('Error parsing stored payment data:', error);
      }
    }
  }, []);

  // Fetch cost centers after client info is loaded
  useEffect(() => {
    if (accountsParam && clientInfo) {
      fetchCostCenters(accountsParam);
    }
  }, [accountsParam, clientInfo]);

  // Fetch payment data after cost centers are loaded
  useEffect(() => {
    if (costCenters.length > 0) {
      fetchPaymentData();
    }
  }, [costCenters]);

  // Filter cost centers based on search term (company only)
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCostCenters(costCenters);
    } else {
      const filtered = costCenters.filter(center =>
        center.company?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCostCenters(filtered);
    }
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, costCenters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCostCenters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCostCenters = filteredCostCenters.slice(startIndex, endIndex);

  const fetchCostCenters = async (allNewAccountNumbers: string) => {
    try {
      setLoading(true);
      console.log('Fetching cost centers from database for account numbers:', allNewAccountNumbers);
      
      // Parse account numbers
      const accounts = allNewAccountNumbers.split(',').map(acc => acc.trim()).filter(acc => acc);
      
      if (accounts.length === 0) {
        setCostCenters([]);
        return;
      }
      
      // Fetch cost centers from the database where cost_code matches account numbers
      const response = await fetch(`/api/cost-centers/client?all_new_account_numbers=${encodeURIComponent(allNewAccountNumbers)}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not ok:', errorText);
        throw new Error(`Failed to fetch cost centers: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Cost centers data received from database:', data);
      console.log('Account numbers being searched:', accounts);
      console.log('Number of cost centers found:', data.costCenters?.length || 0);
      
      setCostCenters(data.costCenters || []);
    } catch (error) {
      console.error('Error fetching cost centers from database:', error);
      toast.error('Failed to load cost centers from database');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentData = async () => {
    try {
      console.log('Fetching payment data for cost centers:', costCenters.map(cc => cc.cost_code));
      
      // Get all cost codes from the cost centers
      const costCodes = costCenters.map(cc => cc.cost_code);
      
      if (costCodes.length === 0) {
        setPaymentData({});
        return;
      }

      // Fetch payment data from payments_ table
      const response = await fetch('/api/payments/by-cost-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ costCodes }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment data: ${response.status}`);
      }

      const data = await response.json();
      console.log('Payment data received:', data);

      // Convert array to object keyed by cost_code
      const paymentMap: Record<string, PaymentInfo> = {};
      data.payments?.forEach((payment: any) => {
        paymentMap[payment.cost_code] = {
          cost_code: payment.cost_code,
          due_amount: parseFloat(payment.due_amount) || 0,
          balance_due: parseFloat(payment.balance_due) || 0,
          payment_status: payment.payment_status || 'pending',
          billing_month: payment.billing_month || '',
          overdue_30_days: parseFloat(payment.overdue_30_days) || 0,
          overdue_60_days: parseFloat(payment.overdue_60_days) || 0,
          overdue_90_days: parseFloat(payment.overdue_90_days) || 0,
          last_updated: payment.last_updated || '',
        };
      });

      setPaymentData(paymentMap);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment data');
    }
  };

  const fetchClientInfo = async (accounts: string[]) => {
    try {
      // Get client info from the customers-grouped API
      const response = await fetch(`/api/customers-grouped?fetchAll=true`);
      if (response.ok) {
        const data = await response.json();
        const client = data.companyGroups?.find((group: any) => {
          const groupAccounts = group.all_new_account_numbers?.split(',').map((acc: string) => acc.trim()) || [];
          return accounts.some(acc => groupAccounts.includes(acc));
        });
        if (client) {
          setClientInfo(client);
        }
      }
    } catch (error) {
      console.error('Error fetching client info:', error);
    }
  };

  const handleBack = () => {
    router.push('/protected/fc');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="bg-gray-50 shadow-sm border border-gray-300 rounded-lg overflow-hidden">
          {/* Table Header Skeleton */}
          <div className="gap-4 grid grid-cols-6 bg-blue-50 shadow-sm px-6 py-2 border-gray-200 border-b">
            <div className="flex items-center">
              <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
            </div>
            <div className="flex justify-center">
              <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
            </div>
            <div className="flex justify-center">
              <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
            </div>
            <div className="flex justify-center">
              <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
            </div>
            <div className="flex justify-center">
              <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
            </div>
            <div className="flex justify-end">
              <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
            </div>
          </div>

      {/* Table Body Skeleton */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="gap-4 grid grid-cols-6 bg-white px-6 py-2">
            {/* Cost Center Column Skeleton */}
            <div className="flex items-center">
              <div className="bg-gray-200 rounded-full w-24 h-6 animate-pulse"></div>
            </div>

            {/* Cost Code Column Skeleton */}
            <div className="flex justify-center items-center">
              <div>
                <div className="bg-gray-200 rounded w-20 h-4 animate-pulse"></div>
              </div>
            </div>

            {/* Monthly Due Column Skeleton */}
            <div className="flex justify-center items-center">
              <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
            </div>

            {/* Balance Due Column Skeleton */}
            <div className="flex justify-center items-center">
              <div className="bg-gray-200 rounded w-16 h-4 animate-pulse"></div>
            </div>

            {/* Status Column Skeleton */}
            <div className="flex justify-center items-center">
              <div className="bg-gray-200 rounded-full w-16 h-6 animate-pulse"></div>
            </div>

            {/* Actions Column Skeleton */}
            <div className="flex justify-end items-center">
              <div className="bg-gray-200 rounded w-12 h-8 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        {/* Top Navigation */}
        <div className="bg-white border-gray-200 border-b">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBack} className="p-0">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  FC Dashboard
                </Button>
                <span className="text-gray-400">›</span>
                <span className="text-gray-600">Cost Centers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex justify-center items-center bg-blue-100 rounded-full w-8 h-8">
                  <span className="font-medium text-blue-600 text-sm">FC</span>
                </div>
                <span className="font-medium text-gray-900 text-sm">Field Coordinator</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="mb-2 font-bold text-gray-900 text-3xl">Cost Centers</h1>
            <p className="text-gray-600">
              Manage cost centers and their account permissions for {clientInfo?.company_group || 'this client'}.
            </p>
          </div>

          {/* Controls Skeleton */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gray-200 rounded w-32 h-4 animate-pulse"></div>
            </div>
            <div className="flex items-center gap-3">
                  <div className="bg-gray-200 rounded-lg w-64 h-10 animate-pulse"></div>
                  <div className="bg-gray-200 rounded w-24 h-10 animate-pulse"></div>
              <div className="bg-gray-200 rounded w-16 h-10 animate-pulse"></div>
            </div>
          </div>

          {/* Loading Skeleton */}
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!accountsParam) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="mb-4 font-semibold text-xl">No Account Numbers Provided</h2>
          <p className="mb-4 text-gray-600">Please select a client from the main dashboard.</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Top Navigation */}
      <div className="bg-white border-gray-200 border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack} className="p-0">
                <ArrowLeft className="mr-2 w-4 h-4" />
                FC Dashboard
              </Button>
              <span className="text-gray-400">›</span>
              <span className="text-gray-600">Cost Centers</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-blue-100 rounded-full w-8 h-8">
                <span className="font-medium text-blue-600 text-sm">FC</span>
              </div>
              <span className="font-medium text-gray-900 text-sm">Field Coordinator</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="mb-2 font-bold text-gray-900 text-3xl">Cost Centers</h1>
          <p className="text-gray-600">
            Manage cost centers and their account permissions for {clientInfo?.company_group || 'this client'}.
          </p>
        </div>

        {/* Payment Summary */}
        {paymentSummary && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Building2 className="w-5 h-5" />
                  Payment Summary for {clientInfo?.companyGroup || 'Client'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
                  <div className="text-center">
                    <div className="font-bold text-blue-600 text-2xl">
                      R {paymentSummary.totalDueAmount?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-gray-600 text-sm">Total Due Amount</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600 text-2xl">
                      R {paymentSummary.totalPaidAmount?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-gray-600 text-sm">Total Paid Amount</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-red-600 text-2xl">
                      R {paymentSummary.totalBalanceDue?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-gray-600 text-sm">Balance Due</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-orange-600 text-2xl">
                      {paymentSummary.paymentCount || 0}
                    </div>
                    <div className="text-gray-600 text-sm">Payment Records</div>
                  </div>
                </div>
                
                {/* Overdue Breakdown */}
                {(paymentSummary.totalOverdue30 > 0 || paymentSummary.totalOverdue60 > 0 || paymentSummary.totalOverdue90 > 0) && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <h4 className="mb-2 font-medium text-gray-700 text-sm">Overdue Breakdown</h4>
                    <div className="gap-4 grid grid-cols-3">
                      <div className="text-center">
                        <div className="font-semibold text-yellow-600 text-lg">
                          R {paymentSummary.totalOverdue30?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-gray-600 text-xs">30+ Days</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-orange-600 text-lg">
                          R {paymentSummary.totalOverdue60?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-gray-600 text-xs">60+ Days</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600 text-lg">
                          R {paymentSummary.totalOverdue90?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-gray-600 text-xs">90+ Days</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm">
              All cost centers {filteredCostCenters.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
              <input
                type="text"
                placeholder="Search by company"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-2 pr-4 pl-10 border border-gray-300 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            <Button 
              onClick={() => {
                if (accountsParam) {
                  const decodedAccounts = decodeURIComponent(accountsParam);
                  fetchCostCenters(decodedAccounts);
                }
              }}
              className="bg-black hover:bg-gray-800 text-white"
            >
              <RefreshCw className="mr-2 w-4 h-4" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBack}
              className="ml-2"
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-50 shadow-sm border border-gray-300 rounded-lg overflow-hidden">
          {filteredCostCenters.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
              <h3 className="mb-2 font-medium text-gray-900 text-lg">
                {costCenters.length === 0 ? 'No cost centers found' : 'No matching cost centers'}
              </h3>
              <p className="mb-4 text-gray-500">
                {costCenters.length === 0 
                  ? `No cost centers found for the provided account numbers`
                  : `No cost centers match your search "${searchTerm}"`
                }
              </p>
              
              {/* Show payment data if available, even without cost centers */}
              {paymentData && Object.keys(paymentData).length > 0 && (
                <div className="mx-auto mt-6 max-w-4xl">
                  <h4 className="mb-4 font-medium text-gray-900 text-lg">Payment Records Found</h4>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="divide-y divide-gray-200 min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Cost Code</th>
                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Due Amount</th>
                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Paid Amount</th>
                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Balance Due</th>
                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Billing Month</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.values(paymentData).map((payment: any, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium text-gray-900 text-sm whitespace-nowrap">
                                {payment.cost_code}
                              </td>
                              <td className="px-6 py-4 text-gray-900 text-sm whitespace-nowrap">
                                R {payment.due_amount?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-6 py-4 text-gray-900 text-sm whitespace-nowrap">
                                R {payment.paid_amount?.toFixed(2) || '0.00'}
                              </td>
                              <td className="px-6 py-4 text-gray-900 text-sm whitespace-nowrap">
                                <span className={payment.balance_due > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                                  R {payment.balance_due?.toFixed(2) || '0.00'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  payment.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                  payment.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  payment.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {payment.payment_status || 'pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                                {payment.billing_month ? new Date(payment.billing_month).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="gap-4 grid grid-cols-6 bg-blue-50 shadow-sm px-6 py-2 border-gray-200 border-b">
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 text-sm">Cost Center</span>
                </div>
                <div className="text-center">
                  <span className="font-medium text-gray-700 text-sm">Cost Code</span>
                </div>
                <div className="text-center">
                  <span className="font-medium text-gray-700 text-sm">Monthly Due</span>
                </div>
                <div className="text-center">
                  <span className="font-medium text-gray-700 text-sm">Balance Due</span>
                </div>
                <div className="text-center">
                  <span className="font-medium text-gray-700 text-sm">Status</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-700 text-sm">Actions</span>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {paginatedCostCenters.map((costCenter) => {
                  const payment = paymentData[costCenter.cost_code];
                  const formatCurrency = (amount: number) => {
                    const validAmount = isNaN(amount) || amount === null || amount === undefined ? 0 : amount;
                    return `R ${validAmount.toFixed(2)}`;
                  };
                  
                  const getStatusColor = (status: string) => {
                    switch (status?.toLowerCase()) {
                      case 'paid': return 'bg-green-100 text-green-800';
                      case 'pending': return 'bg-yellow-100 text-yellow-800';
                      case 'overdue': return 'bg-red-100 text-red-800';
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };

                  return (
                    <div key={costCenter.id} className="gap-4 grid grid-cols-6 bg-white hover:bg-gray-50 px-6 py-2 transition-colors">
                      {/* Cost Center Column */}
                      <div className="flex items-center">
                        <span className="inline-flex items-center bg-green-100 px-2 py-1 rounded-full font-medium text-green-800 text-xs">
                          {costCenter.company || 'N/A'}
                        </span>
                      </div>

                      {/* Cost Code Column */}
                      <div className="flex justify-center items-center">
                        <div>
                          <div className="font-medium text-gray-900">{costCenter.cost_code}</div>
                        </div>
                      </div>

                      {/* Monthly Due Column */}
                      <div className="flex justify-center items-center">
                        <div className="font-medium text-gray-900 text-sm">
                          {payment ? formatCurrency(payment.due_amount) : 'R 0.00'}
                        </div>
                      </div>

                      {/* Balance Due Column */}
                      <div className="flex justify-center items-center">
                        <div className={`text-sm font-medium ${payment && payment.balance_due > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {payment ? formatCurrency(payment.balance_due) : 'R 0.00'}
                        </div>
                      </div>

                      {/* Status Column */}
                      <div className="flex justify-center items-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment?.payment_status || 'pending')}`}>
                          {payment?.payment_status || 'pending'}
                        </span>
                      </div>

                      {/* Actions Column */}
                      <div className="flex justify-end items-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => router.push(`/protected/fc/accounts/${costCenter.cost_code}`)}
                          className="hover:bg-blue-50 text-blue-600 hover:text-blue-700"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {filteredCostCenters.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-6">
            <div className="text-gray-700 text-sm">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredCostCenters.length)} of {filteredCostCenters.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {/* Show page numbers */}
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNum = i + 1;
                  
                  // Show first 3 pages, current page, and last 3 pages
                  const shouldShow = 
                    pageNum <= 3 || 
                    pageNum >= totalPages - 2 || 
                    Math.abs(pageNum - currentPage) <= 1;
                  
                  if (!shouldShow) {
                    // Show ellipsis for gaps
                    if (pageNum === 4 && currentPage > 5) {
                      return <span key={`ellipsis-${pageNum}`} className="px-2 text-gray-500">...</span>;
                    }
                    if (pageNum === totalPages - 3 && currentPage < totalPages - 4) {
                      return <span key={`ellipsis-${pageNum}`} className="px-2 text-gray-500">...</span>;
                    }
                    return null;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="p-0 w-8 h-8"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
