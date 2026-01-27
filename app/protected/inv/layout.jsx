'use client';

import { LogoutButton } from '@/components/logout-button';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, AlertTriangle } from 'lucide-react';
import UniversalLayout from '@/components/shared/UniversalLayout';

export default function Layout({ children }) {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [isClient, setIsClient] = useState(false);

  // Fetch low stock items
  const fetchLowStockItems = async () => {
    try {
      const response = await fetch('/api/stock');
      if (response.ok) {
        const data = await response.json();
        const items = data.stock || [];
        const lowItems = items.filter(item => parseInt(item.quantity || 0) <= 10); // Default threshold of 10
        setLowStockItems(lowItems);
        setLowStockCount(lowItems.length);
      }
    } catch (error) {
      console.error('Error fetching low stock items:', error);
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchLowStockItems();
    // Refresh every 5 minutes
    const interval = setInterval(fetchLowStockItems, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Update button state after client hydration
    if (isClient) {
      // Force re-render to update disabled state
    }
  }, [isClient, lowStockCount]);

  const handleNotificationClick = () => {
    if (lowStockCount > 0) {
      setShowLowStockModal(true);
    }
  };

  return (
    <UniversalLayout currentRole="inv">
      <div className="bg-gray-50 min-h-screen">
        {/* Top Navigation Bar */}
        <header className="bg-gradient-to-r from-blue-400 to-blue-500 shadow-sm text-white">
          <div className="flex justify-between items-center px-4 py-3">
            <div className="flex items-center space-x-3">
              <div className="flex justify-center items-center bg-white rounded-full w-10 h-10">
                <span className="font-bold text-blue-600 text-lg">S</span>
              </div>
              <div>
                <h1 className="font-bold text-xl">Inventory Management</h1>
                <p className="opacity-90 text-blue-100 text-sm">STOCK CONTROL SYSTEM</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-blue-100 text-sm">Good afternoon, Inventory User</span>
              
              {/* Notification Bell */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNotificationClick}
                  className="relative hover:bg-blue-600 text-white"
                  disabled={!isClient || lowStockCount === 0}
                >
                  <Bell className="w-5 h-5" />
                  {lowStockCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="-top-1 -right-1 absolute flex justify-center items-center p-0 rounded-full w-5 h-5 text-xs"
                    >
                      {lowStockCount}
                    </Badge>
                  )}
                </Button>
              </div>
              
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 bg-gray-50">
          {children}
        </main>

        {/* Low Stock Items Modal */}
        <Dialog open={showLowStockModal} onOpenChange={setShowLowStockModal}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Low Stock Items ({lowStockCount})
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
              {lowStockItems.length === 0 ? (
                <div className="py-8 text-center">
                  <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                  <h3 className="mb-2 font-medium text-gray-900 text-lg">No Low Stock Items</h3>
                  <p className="text-gray-500">All items are above the minimum threshold.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-4 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800 text-sm">
                        The following items are at or below the minimum threshold of 10 units
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="border border-gray-200 w-full border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                            Item Description
                          </th>
                          <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                            Code
                          </th>
                          <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-left">
                            Supplier
                          </th>
                          <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                            Type
                          </th>
                          <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                            Current Qty
                          </th>
                          <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                            Threshold
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {lowStockItems.map((item) => (
                          <tr key={item.id} className="bg-red-50 hover:bg-red-100 border-red-200">
                            <td className="px-4 py-3 border border-gray-200 text-sm">
                              <div>
                                <div className="font-medium text-gray-900">{item.description || 'N/A'}</div>
                                {item.stock_type && (
                                  <Badge className="bg-blue-100 mt-1 text-blue-800 text-xs">
                                    {item.stock_type}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-sm">
                              {item.code || 'N/A'}
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-sm">
                              {item.supplier || 'N/A'}
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                {item.stock_type || 'N/A'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                              <span className="font-medium text-red-600">
                                {parseInt(item.quantity || 0)}
                              </span>
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                              <span className="font-medium text-gray-600">10</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>

                  <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-800 text-sm">
                        Consider placing orders for these items to maintain adequate stock levels
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </UniversalLayout>
  );
}
