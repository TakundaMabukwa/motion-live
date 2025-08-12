'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search,
  RefreshCw,
  Save,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Download,
  Upload,
  History,
  Filter
} from 'lucide-react';
import DashboardHeader from '@/components/shared/DashboardHeader';
import DashboardTabs from '@/components/shared/DashboardTabs';
import StockTakeHistory from '@/components/ui-personal/stock-take-history';
import { toast } from 'sonner';

export default function StockTakePage() {
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockTakeMode, setStockTakeMode] = useState(false);
  const [updatedItems, setUpdatedItems] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState('stock-take');
  const [selectedStockType, setSelectedStockType] = useState('all');
  const [stockTypes, setStockTypes] = useState([]);

  // Fetch stock items from API
  useEffect(() => {
    fetchStockItems();
  }, []);

  const fetchStockItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stock');
      if (!response.ok) {
        throw new Error('Failed to fetch stock items');
      }
      const data = await response.json();
      setStockItems(data.stock || []);
      
      // Extract unique stock types
      const types = [...new Set(data.stock?.map(item => item.stock_type).filter(Boolean))];
      setStockTypes(types);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      toast.error('Failed to load stock items');
    } finally {
      setLoading(false);
    }
  };

  const filteredStockItems = stockItems.filter(item => {
    const matchesSearch = 
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedStockType === 'all' || item.stock_type === selectedStockType;
    
    return matchesSearch && matchesType;
  });

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
    toast.info('Stock take cancelled. No changes were saved.');
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    const currentQuantity = parseInt(stockItems.find(item => item.id === itemId)?.quantity || '0');
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
          notes: `Stock take completed on ${new Date().toLocaleDateString()}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish stock take');
      }

      const result = await response.json();
      toast.success(`Stock take published successfully! ${result.updated_count} items updated.`);
      
      // Reset state
      setStockTakeMode(false);
      setUpdatedItems({});
      setHasChanges(false);
      
      // Refresh stock items
      fetchStockItems();
    } catch (error) {
      console.error('Error publishing stock take:', error);
      toast.error('Failed to publish stock take');
    } finally {
      setPublishing(false);
    }
  };

  const getQuantityDifference = (itemId) => {
    const update = updatedItems[itemId];
    if (!update) return null;
    
    if (update.difference > 0) {
      return { type: 'increase', value: update.difference };
    } else if (update.difference < 0) {
      return { type: 'decrease', value: Math.abs(update.difference) };
    }
    return null;
  };

  const getQuantityDifferenceColor = (difference) => {
    if (difference > 0) return 'text-green-600';
    if (difference < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  const getStockTypeColor = (stockType) => {
    const colors = {
      'Tracking Equipment': 'bg-blue-100 text-blue-800',
      'Accessories': 'bg-green-100 text-green-800',
      'Hardware': 'bg-orange-100 text-orange-800',
      'Electronics': 'bg-purple-100 text-purple-800',
      'Software': 'bg-indigo-100 text-indigo-800'
    };
    return colors[stockType] || 'bg-gray-100 text-gray-800';
  };

  // Tab content components
  const stockTakeContent = (
    <div className="space-y-6">
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

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 border border-gray-200 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{String(item.description || '')}</div>
                        {item.stock_type && (
                          <Badge className={`text-xs ${getStockTypeColor(item.stock_type)}`}>
                            {String(item.stock_type)}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-gray-900 text-sm">
                      {String(item.code || '-')}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-gray-900 text-sm">
                      {String(item.supplier || '-')}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-center">
                      {item.stock_type && (
                        <Badge variant="outline" className="text-xs">
                          {String(item.stock_type)}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 border border-gray-200 font-medium text-sm text-center">
                      {parseInt(item.quantity || '0')}
                    </td>
                    {stockTakeMode && (
                      <>
                        <td className="px-4 py-3 border border-gray-200 text-center">
                          <Input
                            type="number"
                            min="0"
                            value={currentQuantity}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-20 h-8 text-sm text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-center">
                          {difference !== 0 && (
                            <div className="flex justify-center items-center gap-1">
                              {difference > 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                              )}
                              <span className={`text-sm font-medium ${getQuantityDifferenceColor(difference)}`}>
                                {difference > 0 ? '+' : ''}{difference}
                              </span>
                            </div>
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

  const historyContent = <StockTakeHistory />;

  const tabs = [
    {
      value: 'stock-take',
      label: 'Stock Take',
      icon: ClipboardList,
      content: stockTakeContent
    },
    {
      value: 'history',
      label: 'History',
      icon: History,
      content: historyContent
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <DashboardHeader
          title="Stock Take"
          subtitle="Perform physical stock counts and update inventory"
          icon={ClipboardList}
          actionButton={
            stockTakeMode ? {
              label: "Cancel Stock Take",
              onClick: handleCancelStockTake,
              icon: AlertCircle,
              variant: "outline"
            } : {
              label: "Start Stock Take",
              onClick: handleStartStockTake,
              icon: ClipboardList
            }
          }
        />
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading stock items...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <DashboardHeader
        title="Stock Take"
        subtitle="Perform physical stock counts and update inventory"
        icon={ClipboardList}
        actionButton={
          stockTakeMode ? {
            label: "Cancel Stock Take",
            onClick: handleCancelStockTake,
            icon: AlertCircle,
            variant: "outline"
          } : {
            label: "Start Stock Take",
            onClick: handleStartStockTake,
            icon: ClipboardList
          }
        }
      />

      {/* Tabs */}
      <DashboardTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
} 