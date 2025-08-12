'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Download, 
  FileText, 
  Calendar,
  DollarSign,
  Building2,
  RefreshCw,
  CreditCard,
  Package,
  User,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrdersContent() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [processingPayment, setProcessingPayment] = useState({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch approved stock orders
      const response = await fetch('/api/stock-orders/approved?limit=100');
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setOrders(data.orders || []);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOrders();
      toast.success('Orders refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh orders');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await fetchOrders();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/stock-orders/approved?search=${encodeURIComponent(searchTerm)}&limit=100`);
      if (!response.ok) throw new Error('Failed to search orders');
      
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error searching orders:', error);
      toast.error('Failed to search orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePayOrder = async (orderId) => {
    try {
      setProcessingPayment(prev => ({ ...prev, [orderId]: true }));
      
      const response = await fetch('/api/master/stock-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          action: 'moveToPurchases'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process payment');
      }

      const result = await response.json();
      
      // Remove the order from the list since it's now moved to purchases
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      
      toast.success(result.message || 'Order successfully moved to purchases');
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'moved_to_purchases': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading approved orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approved Stock Orders</h1>
          <p className="text-gray-600 mt-2">Manage approved stock orders and process payments</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approved Orders</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
            <p className="text-xs text-muted-foreground">Ready for payment</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(orders.reduce((sum, order) => sum + order.totalAmount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Excluding VAT</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {new Set(orders.map(order => order.supplier)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique suppliers</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {orders.length > 0 ? formatCurrency(orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length) : 'R0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute top-3 left-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by order number, supplier, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="mr-2 w-4 h-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Approved Stock Orders</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Showing {orders.length} approved orders ready for payment
          </p>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-8 text-gray-500 text-center">
              <Package className="mx-auto mb-4 w-12 h-12 text-gray-300" />
              <p>No approved orders found</p>
              <p className="text-sm text-gray-400 mt-2">All orders have been processed or no orders are approved yet</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Order Details
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                      Order Date
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-center uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order, index) => (
                    <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 text-sm">{order.orderNumber}</div>
                        <div className="text-gray-500 text-sm">
                          {order.notes ? (order.notes.length > 50 ? order.notes.substring(0, 50) + '...' : order.notes) : 'No notes'}
                        </div>
                        <div className="text-gray-400 text-xs">Created by: {order.createdBy}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{order.supplier}</div>
                            {order.invoiceLink && (
                              <a 
                                href={order.invoiceLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                View Invoice
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{formatDate(order.orderDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="font-medium text-gray-900 text-lg">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        {order.totalAmountUSD && (
                          <div className="text-gray-500 text-sm">
                            ${parseFloat(order.totalAmountUSD).toFixed(2)} USD
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status === 'approved' ? 'Approved' : 
                           order.status === 'pending' ? 'Pending' : 
                           order.status === 'moved_to_purchases' ? 'Moved to Purchases' : 
                           order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Button
                          onClick={() => handlePayOrder(order.id)}
                          disabled={processingPayment[order.id]}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          {processingPayment[order.id] ? (
                            <>
                              <div className="mr-2 border-b-2 border-white rounded-full w-4 h-4 animate-spin"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="mr-2 w-4 h-4" />
                              Pay
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
