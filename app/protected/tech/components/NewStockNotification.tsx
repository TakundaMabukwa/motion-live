'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, X, CheckCircle, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface TechStock {
  id: number;
  technician_email: string;
  stock: any;
  new_stock_assigned: boolean;
  created_at: string;
}

interface StockItem {
  id: string;
  code: string;
  description: string;
  quantity: string;
  supplier: string;
  created_at: string;
}

interface NewStockNotificationProps {
  userEmail: string;
}

export default function NewStockNotification({ userEmail }: NewStockNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [stockData, setStockData] = useState<TechStock | null>(null);
  const [allStockData, setAllStockData] = useState<TechStock | null>(null);
  const [latestStockItem, setLatestStockItem] = useState<StockItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAllStock, setShowAllStock] = useState(false);

  const supabase = createClient();

  // Check for new stock on component mount and set up real-time subscription
  useEffect(() => {
    if (!userEmail) return;

    const checkNewStock = async () => {
      try {
        // Check for new stock assignments
        const { data: newStock, error: newStockError } = await supabase
          .from('tech_stock')
          .select('*')
          .ilike('technician_email', userEmail) // Case-insensitive match
          .eq('new_stock_assigned', true)
          .single();

        if (newStockError && newStockError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking new stock:', newStockError);
        } else if (newStock) {
          setStockData(newStock);
          setShowNotification(true);
        }

        // Also fetch all stock for this technician
        const { data: allStock, error: allStockError } = await supabase
          .from('tech_stock')
          .select('*')
          .ilike('technician_email', userEmail)
          .single();

        if (allStockError && allStockError.code !== 'PGRST116') {
          console.error('Error fetching all stock:', allStockError);
        } else if (allStock) {
          setAllStockData(allStock);
        }

        // Fetch latest stock item from main stock table
        const { data: latestStock, error: latestStockError } = await supabase
          .from('stock')
          .select('id, code, description, quantity, supplier, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestStockError && latestStockError.code !== 'PGRST116') {
          console.error('Error fetching latest stock:', latestStockError);
        } else if (latestStock) {
          setLatestStockItem(latestStock);
        }
      } catch (error) {
        console.error('Error in checkNewStock:', error);
      }
    };

    // Initial check
    checkNewStock();

    // Set up real-time subscription
    const subscription = supabase
      .channel('tech_stock_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tech_stock',
          filter: `technician_email.ilike.${userEmail}`,
        },
        (payload) => {
          console.log('Tech stock change detected:', payload);
          if (payload.new && payload.new.new_stock_assigned === true) {
            setStockData(payload.new as TechStock);
            setShowNotification(true);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userEmail, supabase]);

  const handleAcknowledge = async () => {
    if (!stockData) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tech_stock')
        .update({ new_stock_assigned: false })
        .eq('id', stockData.id);

      if (error) {
        console.error('Error acknowledging stock:', error);
        toast.error('Failed to acknowledge new stock');
        return;
      }

      toast.success('New stock acknowledged!');
      setShowNotification(false);
      setStockData(null);
      
      // Refresh all stock data
      const { data: updatedAllStock } = await supabase
        .from('tech_stock')
        .select('*')
        .ilike('technician_email', userEmail)
        .single();
      
      if (updatedAllStock) {
        setAllStockData(updatedAllStock);
      }
      
      // Refresh latest stock item
      const { data: updatedLatestStock } = await supabase
        .from('stock')
        .select('id, code, description, quantity, supplier, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (updatedLatestStock) {
        setLatestStockItem(updatedLatestStock);
      }
    } catch (error) {
      console.error('Error in handleAcknowledge:', error);
      toast.error('Failed to acknowledge new stock');
    } finally {
      setLoading(false);
    }
  };

  const getStockSummary = (stock?: any) => {
    const stockToAnalyze = stock || stockData?.stock;
    if (!stockToAnalyze) return { totalItems: 0, suppliers: [] };

    const suppliers = Object.keys(stockToAnalyze);
    const totalItems = suppliers.reduce((total, supplier) => {
      const supplierItems = stockToAnalyze[supplier];
      return total + Object.values(supplierItems).reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    }, 0);

    return { totalItems, suppliers };
  };

  const renderStockDetails = (stock?: any, isNewStock = false) => {
    const stockToRender = stock || stockData?.stock;
    if (!stockToRender) return null;

    return (
      <div className="space-y-4">
        {Object.entries(stockToRender).map(([supplier, items]: [string, any]) => (
          <div key={supplier} className={`border rounded-lg p-4 ${isNewStock ? 'border-green-200 bg-green-50' : ''}`}>
            <h4 className="font-semibold text-gray-900 mb-3">{supplier}</h4>
            <div className="space-y-2">
              {Object.entries(items).map(([code, item]: [string, any]) => (
                <div key={code} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <span className="font-medium text-sm">{code}</span>
                    {item.description && (
                      <p className="text-gray-600 text-xs">{item.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={isNewStock ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-700"}>
                    Qty: {item.count || 0}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Show stock viewer button and latest stock item
  const StockViewerButton = () => {
    const hasStock = allStockData?.stock && getStockSummary(allStockData.stock).totalItems > 0;
    
    return (
      <div className="fixed bottom-4 right-4 z-40 space-y-2">
        {/* Latest Stock Item Card */}
        {latestStockItem && (
          <Card className="w-64 shadow-lg border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-blue-700">Latest Stock</h4>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                  Qty: {latestStockItem.quantity}
                </Badge>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{latestStockItem.code}</p>
                <p className="text-xs text-gray-600 truncate">{latestStockItem.description}</p>
                <p className="text-xs text-gray-500">{latestStockItem.supplier}</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* My Stock Button */}
        {hasStock && (
          <Button
            onClick={() => setShowAllStock(true)}
            className="bg-blue-600 hover:bg-blue-700 shadow-lg w-full"
            size="sm"
          >
            <Package className="w-4 h-4 mr-2" />
            My Stock ({getStockSummary(allStockData.stock).totalItems})
          </Button>
        )}
      </div>
    );
  };

  if (!showNotification && !showAllStock) {
    return <StockViewerButton />;
  }

  return (
    <>
      <StockViewerButton />
      
      {/* New Stock Notification Dialog */}
      {showNotification && stockData && (
        <Dialog open={showNotification} onOpenChange={() => {}}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700">
                <Package className="w-6 h-6" />
                New Stock Assigned!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Summary Card */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-green-900">Stock Assignment</h3>
                      <p className="text-green-700 text-sm">
                        You have been assigned {getStockSummary().totalItems} new items from {getStockSummary().suppliers.length} supplier(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-700">{getStockSummary().totalItems}</div>
                      <div className="text-green-600 text-xs">Total Items</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">New Stock Details</h3>
                {renderStockDetails(stockData.stock, true)}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowNotification(false)}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
                <Button
                  onClick={handleAcknowledge}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Acknowledge
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* All Stock Viewer Dialog */}
      {showAllStock && allStockData && (
        <Dialog open={showAllStock} onOpenChange={setShowAllStock}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-700">
                <Package className="w-6 h-6" />
                My Stock Inventory
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">All Stock</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Available Stock Items</h3>
                  {renderStockDetails(allStockData.stock)}
                </div>
              </TabsContent>
              
              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{getStockSummary(allStockData.stock).totalItems}</div>
                        <div className="text-gray-600 text-sm">Total Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{getStockSummary(allStockData.stock).suppliers.length}</div>
                        <div className="text-gray-600 text-sm">Suppliers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {Object.keys(allStockData.stock || {}).reduce((total, supplier) => {
                            return total + Object.keys(allStockData.stock[supplier] || {}).length;
                          }, 0)}
                        </div>
                        <div className="text-gray-600 text-sm">Unique Items</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Suppliers</h4>
                  {getStockSummary(allStockData.stock).suppliers.map(supplier => {
                    const supplierItems = allStockData.stock[supplier];
                    const supplierTotal = Object.values(supplierItems).reduce((sum: number, item: any) => sum + (item.count || 0), 0);
                    return (
                      <div key={supplier} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{supplier}</span>
                        <Badge variant="outline">{supplierTotal} items</Badge>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setShowAllStock(false)}>
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}