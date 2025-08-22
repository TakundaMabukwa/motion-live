'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Eye, 
  CreditCard, 
  Receipt,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function OrdersContent() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [orderPayments, setOrderPayments] = useState({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stock-orders/approved');
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      const ordersData = data.orders || [];
      
      // Filter out paid orders - only show pending payment orders
      const pendingOrders = ordersData.filter(order => order.status !== 'paid');
      setOrders(pendingOrders);
      
      // Fetch payment information for paid orders (for reference)
      await fetchOrderPayments(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderPayments = async (ordersList) => {
    try {
      const paidOrders = ordersList.filter(order => order.status === 'paid');
      const paymentsMap = {};
      
      for (const order of paidOrders) {
        const response = await fetch(`/api/stock-orders/payments?orderNumber=${order.order_number}`);
        if (response.ok) {
          const data = await response.json();
          if (data.payment) {
            paymentsMap[order.order_number] = data.payment;
          }
        }
      }
      
      setOrderPayments(paymentsMap);
    } catch (error) {
      console.error('Error fetching order payments:', error);
    }
  };

  const handleViewInvoice = (order) => {
    if (order.invoice_link) {
      setSelectedOrder(order);
      setShowPdfModal(true);
    } else {
      toast.error('No invoice available for this order');
    }
  };

  const handleDownloadInvoice = async (order) => {
    if (!order.invoice_link) {
      toast.error('No invoice available for this order');
      return;
    }

    try {
      const response = await fetch(order.invoice_link);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${order.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  const handlePay = (order) => {
    setSelectedOrder(order);
    setPaymentReference('');
    setPaymentAmount(order.total_amount_ex_vat?.toString() || '');
    setShowPaymentModal(true);
  };

    const handlePaymentSubmit = async () => {
    if (!paymentReference.trim()) {
      toast.error('Please enter a payment reference');
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const orderAmount = parseFloat(selectedOrder.total_amount_ex_vat);

    // Check if payment amount matches order total exactly (allowing for small rounding differences)
    if (Math.abs(amount - orderAmount) > 0.01) {
      toast.error(`Payment amount must match the order total exactly (${formatCurrency(orderAmount)})`);
      return;
    }

    try {
      setProcessingPayment(true);
      
      console.log('Submitting payment:', {
        orderNumber: selectedOrder.order_number,
        paymentReference: paymentReference.trim(),
        amount: amount
      });
      
      // Call the payment API
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber: selectedOrder.order_number,
          paymentReference: paymentReference.trim(),
          amount: amount
        })
      });

      console.log('Payment API response status:', response.status);
      const result = await response.json();
      console.log('Payment API response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success(`Payment of ${formatCurrency(amount)} processed successfully for order ${selectedOrder.order_number} with reference: ${paymentReference.trim()}`);
      }

      setShowPaymentModal(false);
      setSelectedOrder(null);
      setPaymentReference('');
      setPaymentAmount('');
      
      // Refresh orders to update status and payment information
      fetchOrders();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === '') {
      return 'R 0.00';
    }
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return 'R 0.00';
    }
    
    return `R ${numAmount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getPaymentStatusBadge = (status) => {
    if (status === 'paid') {
      return <Badge variant="default" className="bg-green-100 text-green-800">Paid</Badge>;
    }
    return <Badge variant="outline" className="text-orange-600">Pending Payment</Badge>;
  };

  const getPaymentInfo = (orderNumber) => {
    return orderPayments[orderNumber] || null;
  };



  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value (ZAR)</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(orders.reduce((sum, order) => sum + (parseFloat(order.total_amount_ex_vat) || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Excluding VAT</p>
          </CardContent>
        </Card>






      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Pending Stock Orders</CardTitle>
              <p className="text-sm text-gray-600">Manage and view orders awaiting payment</p>
            </div>
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/test-db');
                  const result = await response.json();
                  console.log('Database test result:', result);
                  toast.success('Database test completed - check console');
                } catch (error) {
                  console.error('Database test failed:', error);
                  toast.error('Database test failed');
                }
              }}
              variant="outline"
              size="sm"
            >
              Test DB
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Receipt className="mx-auto mb-4 w-12 h-12" />
              <p className="font-medium text-lg">No pending orders</p>
              <p>All stock orders have been paid or are pending approval.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Order Details
                     </th>
                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Order Date
                     </th>
                                                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount (ZAR)
                      </th>
                     <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Payment Status
                     </th>
                     <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Actions
                     </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                                             <td className="px-4 py-3">
                         <div className="flex items-center space-x-3">
                           <div className="flex-shrink-0">
                             <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                               <Receipt className="w-5 h-5 text-blue-600" />
                             </div>
                           </div>
                           <div>
                             <div className="font-medium text-gray-900 text-sm">
                               {order.order_number}
                             </div>
                             <div className="text-gray-500 text-xs">
                               Created by {order.created_by || 'Unknown'}
                             </div>
                             {order.notes && (
                               <div className="text-gray-400 text-xs mt-1 max-w-xs truncate">
                                 {order.notes}
                               </div>
                             )}
                           </div>
                         </div>
                       </td>
                       <td className="px-4 py-3">
                         <div className="text-sm text-gray-900">
                           {formatDate(order.order_date)}
                         </div>
                       </td>
                                                                    <td className="px-4 py-3 text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(order.total_amount_ex_vat)}
                          </div>
                        </td>
                       <td className="px-4 py-3 text-center">
                         <div className="flex justify-center">
                           {getPaymentStatusBadge(order.status)}
                         </div>
                       </td>
                       <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {order.invoice_link && (
                            <>
                              <Button
                                onClick={() => handleViewInvoice(order)}
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </Button>
                              <Button
                                onClick={() => handleDownloadInvoice(order)}
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </Button>
                            </>
                          )}
                                                     {order.status === 'paid' ? (
                             <div className="text-xs text-gray-500 text-center">
                               <div className="font-medium text-green-600">Paid</div>
                               {orderPayments[order.order_number] && (
                                 <>
                                   <div>{orderPayments[order.order_number].payment_reference}</div>
                                   <div>{formatDate(orderPayments[order.order_number].created_at)}</div>
                                 </>
                               )}
                             </div>
                           ) : (
                            <Button
                              onClick={() => handlePay(order)}
                              size="sm"
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

             {/* Payment Modal */}
       <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <CreditCard className="w-5 h-5 text-green-600" />
               Pay Order: {selectedOrder?.order_number}
             </DialogTitle>
           </DialogHeader>
           
           {selectedOrder && (
             <div className="space-y-6">
               {/* Amount Owed Section */}
               <div className="text-center">
                 <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                   <CreditCard className="w-8 h-8 text-blue-600" />
                 </div>
                 <h3 className="text-lg font-semibold text-gray-900 mb-2">Amount Owed</h3>
                 <div className="text-3xl font-bold text-blue-600 mb-2">
                   {formatCurrency(selectedOrder.total_amount_ex_vat)}
                 </div>
                 <p className="text-sm text-gray-600">
                   Amount owed for order {selectedOrder.order_number}
                 </p>
               </div>

               {/* Payment Details Box */}
               <div className="bg-blue-50 p-4 rounded-lg">
                 <div className="space-y-2 text-sm">
                   <div className="flex justify-between">
                     <span className="text-gray-600">Current Amount Due:</span>
                     <span className="font-medium">{formatCurrency(selectedOrder.total_amount_ex_vat)}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-600">Order Date:</span>
                     <span className="font-medium">{formatDate(selectedOrder.order_date)}</span>
                   </div>
                   <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
                     <div className="w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center">
                       <span className="text-blue-600 text-xs">💡</span>
                     </div>
                     <span>Payment will be processed immediately upon confirmation</span>
                   </div>
                 </div>
               </div>

               {/* Payment Amount Input */}
               <div className="space-y-2">
                 <Label htmlFor="payment-amount" className="text-sm font-medium text-gray-700">
                   Enter Payment Amount
                 </Label>
                 <Input
                   id="payment-amount"
                   type="number"
                   step="0.01"
                   placeholder="R 0.00"
                   value={paymentAmount}
                   onChange={(e) => setPaymentAmount(e.target.value)}
                   className="text-lg font-medium"
                 />
                 <div className="flex justify-between text-xs text-gray-500">
                   <span>Full payment amount is required</span>
                   <span className="text-blue-600">Required: {formatCurrency(selectedOrder.total_amount_ex_vat)}</span>
                 </div>
               </div>

               {/* Payment Reference */}
               <div className="space-y-2">
                 <Label htmlFor="payment-reference" className="text-sm font-medium text-gray-700">
                   Payment Reference
                 </Label>
                 <Input
                   id="payment-reference"
                   placeholder="Enter payment reference (e.g., PO123, Invoice #456)"
                   value={paymentReference}
                   onChange={(e) => setPaymentReference(e.target.value)}
                 />
               </div>

               {/* Payment Summary */}
               {paymentAmount && parseFloat(paymentAmount) > 0 && (
                 <div className="bg-gray-50 p-4 rounded-lg">
                   <h4 className="font-medium text-gray-900 mb-3">Payment Summary</h4>
                   <div className="space-y-2 text-sm">
                     <div className="flex justify-between">
                       <span className="text-gray-600">Order Number:</span>
                       <span className="font-medium">{selectedOrder.order_number}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Entered Amount:</span>
                       <span className="font-medium text-green-600">{formatCurrency(paymentAmount)}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Payment Type:</span>
                       <span className="font-medium text-green-600">Full Payment</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-gray-600">Remaining After Payment:</span>
                       <span className="font-medium text-green-600">R 0.00</span>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           )}

           <DialogFooter className="flex gap-2 pt-4">
             <Button
               variant="outline"
               onClick={() => setShowPaymentModal(false)}
               disabled={processingPayment}
             >
               Cancel
             </Button>
             <Button
               onClick={handlePaymentSubmit}
               disabled={!paymentReference.trim() || !paymentAmount || parseFloat(paymentAmount) <= 0 || processingPayment}
               className="bg-green-600 hover:bg-green-700"
             >
               {processingPayment ? 'Processing...' : 'Confirm Payment'}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

      {/* PDF Viewer Modal */}
      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Invoice Viewer - {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder?.invoice_link && (
            <div className="w-full h-[70vh]">
              <iframe
                src={selectedOrder.invoice_link}
                className="w-full h-full border-0 rounded-lg"
                title={`Invoice for order ${selectedOrder.order_number}`}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPdfModal(false)}
            >
              Close
            </Button>
            {selectedOrder?.invoice_link && (
              <Button
                onClick={() => handleDownloadInvoice(selectedOrder)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
