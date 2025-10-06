'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  const params = useParams();
  const clientCode = params.code as string;
  
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
    if (clientCode) {
      fetchClientData(clientCode);
    }
  }, [clientCode]);

  // Check for stored payment data from sessionStorage
  useEffect(() => {
    const storedPaymentData = sessionStorage.getItem('clientPaymentData');
    if (storedPaymentData) {
      try {
        const data = JSON.parse(storedPaymentData);
        console.log('Retrieved payment data from sessionStorage:', data);
        
        if (data.clientInfo) {
          setClientInfo(data.clientInfo);
        }
        
        if (data.payments && Array.isArray(data.payments)) {
          // Convert array to object keyed by cost_code
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
        
        if (data.summary) {
          setPaymentSummary(data.summary);
        }
        
        // Remove the data from sessionStorage after using it
        sessionStorage.removeItem('clientPaymentData');
      } catch (error) {
        console.error('Error parsing stored payment data:', error);
      }
    }
  }, []);

  const fetchClientData = async (code: string) => {
    try {
      setLoading(true);
      console.log(`Fetching client data for code: ${code}`);
      
      // Fetch client data using the client-payments API
      const response = await fetch(`/api/client-payments?code=${encodeURIComponent(code)}&includeLegalNames=true`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch client data: ${response.status}`);
      }

      const data = await response.json();
      console.log('Client data received:', data);

      if (data.customers && data.customers.length > 0) {
        const client = data.customers[0];
        setClientInfo({
          companyGroup: client.company,
          legalNames: client.legal_name,
          accountNumbers: client.vehicles?.map((v: any) => v.account_number) || []
        });
        
        // Convert vehicles to cost centers
        const costCentersData = client.vehicles?.map((vehicle: any) => ({
          id: vehicle.doc_no,
          created_at: new Date().toISOString(),
          cost_code: vehicle.account_number,
          company: vehicle.company
        })) || [];
        
        setCostCenters(costCentersData);
        setFilteredCostCenters(costCentersData);
        
        // Convert vehicles to payment data
        const paymentMap: Record<string, PaymentInfo> = {};
        client.vehicles?.forEach((vehicle: any) => {
          paymentMap[vehicle.account_number] = {
            cost_code: vehicle.account_number,
            due_amount: vehicle.total_ex_vat || 0,
            balance_due: vehicle.amount_due || 0,
            payment_status: vehicle.payment_status || 'pending',
            billing_month: vehicle.billing_month || '',
            overdue_30_days: vehicle.overdue_30_days || 0,
            overdue_60_days: vehicle.overdue_60_days || 0,
            overdue_90_days: vehicle.overdue_90_days || 0,
            last_updated: new Date().toISOString(),
          };
        });
        setPaymentData(paymentMap);
        
        if (client.summary) {
          setPaymentSummary(client.summary);
        }
      } else {
        console.log('No client data found');
        setCostCenters([]);
        setFilteredCostCenters([]);
        setPaymentData({});
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const filterCostCenters = (searchTerm: string) => {
    setSearchTerm(searchTerm);
    
    if (!searchTerm.trim()) {
      setFilteredCostCenters(costCenters);
      return;
    }

    const filtered = costCenters.filter(costCenter => 
      costCenter.cost_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (paymentData[costCenter.cost_code]?.payment_status || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredCostCenters(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredCostCenters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCostCenters = filteredCostCenters.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading client data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/protected/fc/accounts">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Back to Clients
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-gray-900 text-3xl">Client Cost Centers</h1>
                <p className="text-gray-600 text-lg">{clientCode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Info */}
        {clientInfo && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Client Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div>
                  <label className="font-medium text-gray-500 text-sm">Company Group</label>
                  <p className="font-semibold text-lg">{clientInfo.companyGroup}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500 text-sm">Legal Names</label>
                  <p className="text-lg">{clientInfo.legalNames || 'N/A'}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-500 text-sm">Account Numbers</label>
                  <p className="text-lg">{clientInfo.accountNumbers?.join(', ') || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Summary */}
        {paymentSummary && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gap-4 grid grid-cols-2 md:grid-cols-4">
                <div className="text-center">
                  <p className="font-bold text-blue-600 text-2xl">
                    {formatCurrency(paymentSummary.totalDueAmount || 0)}
                  </p>
                  <p className="text-gray-500 text-sm">Total Due</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-green-600 text-2xl">
                    {formatCurrency(paymentSummary.totalPaidAmount || 0)}
                  </p>
                  <p className="text-gray-500 text-sm">Total Paid</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-red-600 text-2xl">
                    {formatCurrency(paymentSummary.totalBalanceDue || 0)}
                  </p>
                  <p className="text-gray-500 text-sm">Balance Due</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-purple-600 text-2xl">
                    {paymentSummary.paymentCount || 0}
                  </p>
                  <p className="text-gray-500 text-sm">Total Records</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                  <input
                    type="text"
                    placeholder="Search cost centers..."
                    value={searchTerm}
                    onChange={(e) => filterCostCenters(e.target.value)}
                    className="py-2 pr-4 pl-10 border border-gray-300 focus:border-transparent rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Centers Table */}
        {filteredCostCenters.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Cost Centers ({filteredCostCenters.length})</span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchClientData(clientCode)}
                  >
                    <RefreshCw className="mr-2 w-4 h-4" />
                    Refresh
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-center">Cost Code</TableHead>
                      <TableHead className="text-center">Due Amount</TableHead>
                      <TableHead className="text-center">Balance Due</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCostCenters.map((costCenter) => {
                      const payment = paymentData[costCenter.cost_code];
                      return (
                        <TableRow key={costCenter.id}>
                          <TableCell>
                            <span className="inline-flex items-center bg-green-100 px-2 py-1 rounded-full font-medium text-green-800 text-xs">
                              {costCenter.company || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-center">
                            {costCenter.cost_code}
                          </TableCell>
                          <TableCell className="text-center">
                            {payment ? formatCurrency(payment.due_amount) : 'R 0.00'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${payment && payment.balance_due > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                              {payment ? formatCurrency(payment.balance_due) : 'R 0.00'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={getStatusColor(payment?.payment_status || 'pending')}>
                              {payment?.payment_status || 'pending'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-gray-500 text-sm">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredCostCenters.length)} of {filteredCostCenters.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
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
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="py-12 text-center">
                <div className="flex justify-center items-center bg-gray-100 mx-auto mb-4 rounded-full w-12 h-12">
                  <Hash className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="mb-2 font-medium text-gray-900 text-lg">No Cost Centers Found</h3>
                <p className="mb-4 text-gray-500">
                  No cost centers found for client: <span className="font-medium text-blue-600">{clientCode}</span>
                </p>
                <Button
                  variant="outline"
                  onClick={() => fetchClientData(clientCode)}
                >
                  <RefreshCw className="mr-2 w-4 h-4" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
