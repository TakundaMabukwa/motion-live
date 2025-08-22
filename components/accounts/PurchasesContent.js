'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Receipt, 
  CreditCard, 
  Download,
  Eye,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function PurchasesContent() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  useEffect(() => {
    console.log('PurchasesContent mounted, fetching purchases...');
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      
      // Use the new purchases API endpoint
      const response = await fetch('/api/purchases');
      if (!response.ok) {
        throw new Error('Failed to fetch purchases');
      }
      
      const data = await response.json();
      const purchasesData = data.purchases || [];
      
      console.log('Fetched purchases:', purchasesData);
      setPurchases(purchasesData);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (purchase) => {
    if (purchase.order?.invoice_link) {
      setSelectedPurchase(purchase);
      setShowPdfModal(true);
    } else {
      toast.error('No invoice available for this purchase');
    }
  };

  const handleDownloadInvoice = async (purchase) => {
    if (!purchase.order?.invoice_link) {
      toast.error('No invoice available for this purchase');
      return;
    }

    try {
      const response = await fetch(purchase.order.invoice_link);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${purchase.order_number}.pdf`;
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

  console.log('PurchasesContent render - loading:', loading, 'purchases count:', purchases.length);
  
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-12">Loading purchases...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{purchases.length}</div>
            <p className="text-xs text-muted-foreground">Paid orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent (ZAR)</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(purchases.reduce((sum, purchase) => sum + (parseFloat(purchase.amount) || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Total payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(purchases
                .filter(purchase => {
                  const purchaseDate = new Date(purchase.created_at);
                  const now = new Date();
                  return purchaseDate.getMonth() === now.getMonth() && 
                         purchaseDate.getFullYear() === now.getFullYear();
                })
                .reduce((sum, purchase) => sum + (parseFloat(purchase.amount) || 0), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Month</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(purchases
                .filter(purchase => {
                  const purchaseDate = new Date(purchase.created_at);
                  const now = new Date();
                  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  return purchaseDate.getMonth() === lastMonth.getMonth() && 
                         purchaseDate.getFullYear() === lastMonth.getFullYear();
                })
                .reduce((sum, purchase) => sum + (parseFloat(purchase.amount) || 0), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Previous month</p>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Purchase History</CardTitle>
              <p className="text-sm text-gray-600">View all completed purchases and payments</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/purchases');
                    const result = await response.json();
                    console.log('Purchases API test result:', result);
                    toast.success('Purchases API test completed - check console');
                  } catch (error) {
                    console.error('Purchases API test failed:', error);
                    toast.error('Purchases API test failed');
                  }
                }}
                variant="outline"
                size="sm"
              >
                Test API
              </Button>
              <Button
                onClick={fetchPurchases}
                variant="outline"
                size="sm"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CreditCard className="mx-auto mb-4 w-12 h-12" />
              <p className="font-medium text-lg">No purchases found</p>
              <p>No completed purchases in the system.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchase Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Paid (ZAR)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Reference
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-green-600" />
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {purchase.order_number}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {purchase.order?.supplier || 'Unknown Supplier'}
                            </div>
                            {purchase.order?.notes && (
                              <div className="text-gray-400 text-xs mt-1 max-w-xs truncate">
                                {purchase.order.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {formatDate(purchase.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(purchase.amount)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm text-gray-900">
                          {purchase.payment_reference}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {purchase.order?.invoice_link && (
                            <>
                              <Button
                                onClick={() => handleViewInvoice(purchase)}
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </Button>
                              <Button
                                onClick={() => handleDownloadInvoice(purchase)}
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </Button>
                            </>
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

      {/* PDF Viewer Modal */}
      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Invoice Viewer - {selectedPurchase?.order_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPurchase?.order?.invoice_link && (
            <div className="w-full h-[70vh]">
              <iframe
                src={selectedPurchase.order.invoice_link}
                className="w-full h-full border-0 rounded-lg"
                title={`Invoice for purchase ${selectedPurchase.order_number}`}
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
            {selectedPurchase?.order?.invoice_link && (
              <Button
                onClick={() => handleDownloadInvoice(selectedPurchase)}
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
