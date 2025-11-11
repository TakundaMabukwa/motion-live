'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
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

export default function BootStock() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStockType, setSelectedStockType] = useState('all');
  const [stockTypes, setStockTypes] = useState<string[]>([]);
  const [defaultThreshold] = useState(10);
  const [loading, setLoading] = useState(true);

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

  const isLowStock = (item: StockItem) => {
    return parseInt(item.quantity || '0') <= defaultThreshold;
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-900 text-2xl">Boot Stock</h1>
          <p className="text-gray-600 text-sm mt-1">View your assigned boot stock inventory</p>
        </div>
        <Button onClick={fetchStockItems} variant="outline" size="sm">
          <RefreshCw className="mr-2 w-4 h-4" />
          Refresh
        </Button>
      </div>



      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder="Search stock items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Type
                </th>
                <th className="px-4 py-3 border border-gray-200 font-medium text-gray-700 text-sm text-center">
                  Quantity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredStockItems.map((item) => {
                const isLow = isLowStock(item);

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 ${isLow ? 'bg-red-50 border-red-200' : ''}`}
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
                    <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                      <Badge className={`text-xs ${getStockTypeColor(item.stock_type)}`}>
                        {item.stock_type || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 border border-gray-200 text-sm text-center">
                      <span className={`font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                        {parseInt(item.quantity || '0')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}


    </div>
  );
}