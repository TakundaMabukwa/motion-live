'use client';

import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package,
  Search,
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
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchStockItems();
  }, []);

  const fetchStockItems = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
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
    } catch (error: unknown) {
      console.error('Error fetching stock items:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      toast.error(`Failed to load stock items: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const groupedStockItems = useMemo(() => {
    const map = new Map<string, StockItem>();

    for (const item of stockItems) {
      const key = [
        String(item.code || '').trim().toUpperCase(),
        String(item.description || '').trim().toUpperCase(),
        String(item.supplier || '').trim().toUpperCase(),
        String(item.stock_type || '').trim().toUpperCase(),
      ].join('|');

      const existing = map.get(key);
      const qty = parseInt(String(item.quantity || '0')) || 0;

      if (!existing) {
        map.set(key, {
          ...item,
          id: key,
          quantity: String(qty),
        });
      } else {
        const existingQty = parseInt(String(existing.quantity || '0')) || 0;
        existing.quantity = String(existingQty + qty);
        map.set(key, existing);
      }
    }

    return Array.from(map.values());
  }, [stockItems]);

  const filteredStockItems = groupedStockItems
    .filter(item => {
      const matchesSearch =
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedStockType === 'all' || item.stock_type === selectedStockType;

      return matchesSearch && matchesType;
    })
    .sort((a, b) =>
      String(a.description || '').localeCompare(String(b.description || ''))
    );

  const totalUnits = filteredStockItems.reduce((sum, item) => {
    return sum + (parseInt(String(item.quantity || '0')) || 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="mr-2 w-6 h-6 animate-spin" />
        <span>Loading stock items...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 bg-slate-50 min-h-screen">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Boot Stock</h1>
            <p className="text-blue-100 text-sm mt-1">Assigned technician inventory in one view.</p>
          </div>
          <Button onClick={fetchStockItems} variant="secondary" size="sm" className="w-full sm:w-auto">
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 rounded-md text-sm text-red-700">
          Failed to fetch stock items: {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <Badge variant="outline" className="bg-white">Unique Items: {filteredStockItems.length}</Badge>
        <Badge variant="outline" className="bg-white">Total Units: {totalUnits}</Badge>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder="Search stock items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200"
          />
        </div>
        <select
          value={selectedStockType}
          onChange={(e) => setSelectedStockType(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50"
        >
          <option value="all">All Types</option>
          {stockTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Stock Items Table */}
      {filteredStockItems.length === 0 ? (
        <div className="py-12 text-center bg-white border border-slate-200 rounded-xl">
          <Package className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No stock items found</h3>
          <p className="text-gray-500">
            {searchTerm || selectedStockType !== 'all' ? 'No stock items match your search criteria.' : 'No stock items available.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {filteredStockItems.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 leading-tight">{item.description || 'No description'}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.code || 'N/A'}</p>
                  </div>
                  <span className="text-xl font-bold text-slate-900">{parseInt(item.quantity || '0')}</span>
                </div>
                  <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-600">{item.stock_type || 'N/A'}</span>
                  <span className="text-xs text-slate-500">{item.supplier || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table className="w-full border-collapse">
              <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 text-xs uppercase tracking-wide text-left">
                  Item Description
                </th>
                <th className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 text-xs uppercase tracking-wide text-left">
                  Code
                </th>
                <th className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 text-xs uppercase tracking-wide text-center">
                  Type
                </th>
                <th className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 text-xs uppercase tracking-wide text-left">
                  Supplier
                </th>
                <th className="px-4 py-3 border-b border-slate-200 font-semibold text-slate-700 text-xs uppercase tracking-wide text-center">
                  Quantity
                </th>
              </tr>
            </thead>
              <tbody className="bg-white">
                {filteredStockItems.map((item, index) => (
                  <tr key={item.id} className={`hover:bg-slate-50 ${index !== filteredStockItems.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium text-slate-900">{item.description || 'No description'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {item.code || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="text-slate-700">{item.stock_type || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {item.supplier || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="font-semibold text-slate-900">
                        {parseInt(item.quantity || '0')}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  );
}
