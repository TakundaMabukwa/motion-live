// components/BootStock.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package,
  Search,
  Filter,
  AlertCircle,
  ClipboardList,
  RefreshCw,
  Save
} from 'lucide-react';
import { Edit, X } from 'lucide-react';
import { toast } from 'sonner';

interface StockItem {
  id: string;
  quantity: string;
  technician_email: string;
  code: string;
  description: string;
  supplier: string;
  cost_excl_vat_zar: number;
  usd: number;
  stock_type: string;
}

interface UpdatedItem {
  id: string;
  current_quantity: number;
  new_quantity: number;
  difference: number;
}

export default function BootStock() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockTakeMode, setStockTakeMode] = useState(false);
  const [updatedItems, setUpdatedItems] = useState<{ [key: string]: UpdatedItem }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStockType, setSelectedStockType] = useState('all');
  const [stockTypes, setStockTypes] = useState<string[]>([]);
  const [defaultThreshold] = useState(10);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('0');

  useEffect(() => {
    fetchStockItems();
  }, []);

  const fetchStockItems = async () => {
    try {
      setLoading(true);
      console.log('Fetching technician stock items...');
      const response = await fetch('/api/stock/technician');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      console.log('Technician stock data received:', data);
      
      // Ensure we have an array and handle potential undefined
      const stockArray = Array.isArray(data.stock) ? data.stock : [];
      setStockItems(stockArray);
      
      // Extract unique stock types
      const types = [...new Set(stockArray.map(item => item.stock_type).filter(Boolean))] as string[];
      setStockTypes(types);
      
      console.log('Stock items set:', stockArray.length, 'items');
      console.log('Stock types:', types);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      toast.error(`Failed to load stock items: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartStockTake = () => {
    setStockTakeMode(true);
    setUpdatedItems({});
    setHasChanges(false);
    toast.success('Stock take mode activated. You can now update quantities.');
  };

  const handleCancelStockTake = () => {
    setStockTakeMode(false);
    setUpdatedItems({});
    setHasChanges(false);
    toast('Stock take cancelled. No changes were saved.');
  };

  const handleQuantityChange = (itemId: string, newQuantity: string) => {
    const item = stockItems.find(item => item.id === itemId);
    if (!item) return;

    const currentQuantity = parseInt(item.quantity || '0');
    const parsedQuantity = parseInt(newQuantity) || 0;
    
    setUpdatedItems(prev => ({
      ...prev,
      [itemId]: {
        id: itemId,
        current_quantity: currentQuantity,
        new_quantity: parsedQuantity,
        difference: parsedQuantity - currentQuantity
      }
    }));
    
    setHasChanges(true);
  };

  const handlePublishStockTake = async () => {
    if (!hasChanges) {
      toast.error('No changes to publish');
      return;
    }

    try {
      setPublishing(true);
      const response = await fetch('/api/stock/stock-take', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock_updates: Object.values(updatedItems),
          stock_take_date: new Date().toISOString(),
          notes: `Boot stock take completed on ${new Date().toLocaleDateString()}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish stock take');
      }

      const result = await response.json();
      toast.success(`Stock take published successfully! ${result.updated_count} items updated.`);
      
      setStockTakeMode(false);
      setUpdatedItems({});
      setHasChanges(false);
      
      fetchStockItems();
    } catch (error) {
      console.error('Error publishing stock take:', error);
      toast.error('Failed to publish stock take');
    } finally {
      setPublishing(false);
    }
  };

  const isLowStock = (item: StockItem) => {
    return parseInt(item.quantity || '0') <= defaultThreshold;
  };

  const getQuantityDifferenceColor = (difference: number) => {
    if (difference > 0) return 'text-green-600';
    if (difference < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStockTypeColor = (stockType: string) => {
    const colors: { [key: string]: string } = {
      'Tracking Equipment': 'bg-blue-100 text-blue-800',
      'Accessories': 'bg-green-100 text-green-800',
      'Hardware': 'bg-orange-100 text-orange-800',
      'Electronics': 'bg-purple-100 text-purple-800',
      'Software': 'bg-indigo-100 text-indigo-800'
    };
    return colors[stockType] || 'bg-gray-100 text-gray-800';
  };

  const filteredStockItems = stockItems.filter(item => {
    const matchesSearch = 
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedStockType === 'all' || item.stock_type === selectedStockType;
    
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    const aIsLow = isLowStock(a);
    const bIsLow = isLowStock(b);
    if (aIsLow && !bIsLow) return -1;
    if (!aIsLow && bIsLow) return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="mr-2 w-6 h-6 animate-spin" />
        <span>Loading stock items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stock Take Header */}
      <div className="flex justify-between items-center">
        <div className="mx-2">
          <h3 className="font-semibold text-gray-900 text-lg">Technician Stock</h3>
          <p className="text-gray-600 text-sm">View and manage technician stock inventory</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={stockTakeMode ? handleCancelStockTake : handleStartStockTake}
            variant={stockTakeMode ? "outline" : "default"}
            className={stockTakeMode ? "text-red-600 hover:text-red-700" : ""}
          >
            {stockTakeMode ? (
              <>
                <AlertCircle className="mr-2 w-4 h-4" />
                Cancel Stock Take
              </>
            ) : (
              <>
                <ClipboardList className="mr-2 w-4 h-4" />
                Start Stock Take
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stock Take Controls */}
      {stockTakeMode && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Stock Take Mode Active</span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handlePublishStockTake}
                  disabled={!hasChanges || publishing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="mr-2 w-4 h-4" />
                  {publishing ? 'Publishing...' : 'Publish Changes'}
                </Button>
              </div>
            </div>
            {hasChanges && (
              <div className="mt-2 text-blue-700 text-sm">
                {Object.keys(updatedItems).length} items have been modified
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder="Search stock items by description, code, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedStockType}
            onChange={(e) => setSelectedStockType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Types</option>
            {stockTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <Button onClick={fetchStockItems} variant="outline" size="sm">
          <RefreshCw className="mr-2 w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stock Items Table */}
      {filteredStockItems.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No stock items found</h3>
          <p className="text-gray-500">
            {searchTerm || selectedStockType !== 'all' ? 'No stock items match your search criteria.' : 'No stock items available.'}
          </p>
        </div>
      ) : (
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
                {stockTakeMode && (
                  <>
                    <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                      New Qty
                    </th>
                    <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                      Difference
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredStockItems.map((item) => {
                const update = updatedItems[item.id];
                const currentQuantity = update?.new_quantity ?? parseInt(item.quantity || '0');
                const difference = update?.difference ?? 0;
                const isLow = isLowStock(item);

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 ${isLow ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-4 py-3 border border-gray-200 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{item.description || 'No description'}</div>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {item.stock_type && (
                            <Badge className={`text-xs ${getStockTypeColor(item.stock_type)}`}>
                              {item.stock_type}
                            </Badge>
                          )}
                          {isLow && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm">
                      {item.code || 'N/A'}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-gray-600 text-sm">
                      {item.supplier || 'N/A'}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                      <Badge className={`text-xs ${getStockTypeColor(item.stock_type)}`}>
                        {item.stock_type || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="w-20 text-center"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    // Save change via API
                                    const newQty = parseInt(editingValue) || 0;
                                    try {
                                      const res = await fetch('/api/stock/technician', {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ id: item.id, new_quantity: newQty })
                                        });
                                        if (!res.ok) {
                                          // Try to parse JSON error response first, fallback to text
                                          let errMsg = 'Failed to update quantity';
                                          try {
                                            const json = await res.json();
                                            errMsg = json?.error || json?.message || JSON.stringify(json);
                                          } catch {
                                            const txt = await res.text();
                                            errMsg = txt || errMsg;
                                          }
                                          console.error('Update failed:', errMsg);
                                          toast.error(errMsg);
                                          setEditingId(null);
                                          return;
                                        }
                                        toast.success('Quantity updated');
                                      // Update local state optimistically
                                      setStockItems(prev => prev.map(si => si.id === item.id ? { ...si, quantity: String(newQty) } : si));
                                    } catch (err) {
                                      console.error('Update error', err);
                                      toast.error('Failed to update quantity');
                                    } finally {
                                      setEditingId(null);
                                    }
                                  }}
                                >
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setEditingId(null); }}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <span className={`font-medium ${isLow ? 'text-red-600' : ''}`}>
                                {parseInt(item.quantity || '0')}
                              </span>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingId(item.id); setEditingValue(String(parseInt(item.quantity || '0'))); }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                    </td>
                    {stockTakeMode && (
                      <>
                        <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                          <Input
                            type="number"
                            min="0"
                            value={currentQuantity}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-20 text-center"
                          />
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                          {update && (
                            <span className={`font-medium ${getQuantityDifferenceColor(difference)}`}>
                              {difference > 0 ? '+' : ''}{difference}
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {stockTakeMode && hasChanges && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-green-800">Stock Take Summary</h3>
                <p className="text-green-700 text-sm">
                  {Object.keys(updatedItems).length} items modified
                </p>
              </div>
              <div className="text-right">
                <div className="text-green-700 text-sm">
                  Total Changes: {Object.values(updatedItems).reduce((sum, item) => sum + Math.abs(item.difference), 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}