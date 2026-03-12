'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, Search, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const normalizeCategoryCode = (value) => String(value || '').trim().toUpperCase();

export default function AssignClientStockModal({ isOpen, onClose, client, onAssigned }) {
  const [selectedParts, setSelectedParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStockType, setSelectedStockType] = useState('all');
  const [stockTypes, setStockTypes] = useState([]);
  const [allStockItems, setAllStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stock');
      if (!response.ok) throw new Error('Failed to fetch stock');
      const data = await response.json();
      const stockArray = Array.isArray(data.stock) ? data.stock : [];
      setAllStockItems(stockArray);

      const stockCategoryMap = new Map();
      stockArray.forEach((item) => {
        const normalizedCode = normalizeCategoryCode(item?.category_code || item?.category?.code || item?.code);
        if (!normalizedCode) return;
        const existing = stockCategoryMap.get(normalizedCode);
        if (existing) {
          existing.count += 1;
          return;
        }
        stockCategoryMap.set(normalizedCode, {
          code: normalizedCode,
          description: item?.category?.description || item?.category_description || item?.description || normalizedCode,
          count: 1
        });
      });

      setStockTypes(
        Array.from(stockCategoryMap.values()).sort((a, b) =>
          String(a.description || a.code).localeCompare(String(b.description || b.code))
        )
      );
    } catch (error) {
      toast.error('Failed to load stock items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelectedParts([]);
    setSearchTerm('');
    setSelectedStockType('all');
    fetchInventoryItems();
  }, [isOpen]);

  const filteredAvailableParts = useMemo(() => {
    return allStockItems.filter((item) => {
      const isSelected = selectedParts.some((part) => part.stock_id === item.id);
      if (isSelected) return false;

      const matchesSearch = !searchTerm ||
        String(item.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.category_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.category?.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const itemCategoryCode = normalizeCategoryCode(item.category_code || item.category?.code);
      const matchesType = selectedStockType === 'all' || itemCategoryCode === selectedStockType;

      return matchesSearch && matchesType;
    });
  }, [allStockItems, selectedParts, searchTerm, selectedStockType]);

  const addPart = (item) => {
    if (selectedParts.some((part) => part.stock_id === item.id)) return;
    setSelectedParts((prev) => [
      ...prev,
      {
        stock_id: item.id,
        description: String(item.category?.description || item.description || ''),
        serial_number: String(item.serial_number || ''),
        code: String(item.category_code || item.code || ''),
        supplier: String(item.supplier || ''),
        quantity: 1,
        cost_per_unit: 0,
        total_cost: 0,
        ip_address: ''
      }
    ]);
    setAllStockItems((prev) => prev.filter((stockItem) => stockItem.id !== item.id));
  };

  const removePart = (stockId) => {
    const part = selectedParts.find((p) => p.stock_id === stockId);
    if (!part) return;
    setSelectedParts((prev) => prev.filter((p) => p.stock_id !== stockId));
    setAllStockItems((prev) => [
      ...prev,
      {
        id: part.stock_id,
        description: part.description,
        code: part.code,
        supplier: part.supplier,
        quantity: part.quantity || 1,
        serial_number: part.serial_number || '',
        category_code: part.code || '',
        category_description: part.description || part.code || '',
        status: 'IN STOCK'
      }
    ]);
  };

  const clientCode = client?.cost_code || client?.new_account_number || '';

  const handleSubmit = async () => {
    if (!clientCode) {
      toast.error('Client cost code is missing');
      return;
    }
    if (selectedParts.length === 0) {
      toast.error('Please select at least one part');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/client-stock/assign-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cost_code: clientCode,
          company: client.company,
          inventory_items: selectedParts
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to assign stock');
      }

      toast.success('Stock assigned to client');
      if (onAssigned) onAssigned();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to assign stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[99vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Assign Stock to {client?.company || clientCode || 'Client'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-3">
              <select
                value={selectedStockType}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedStockType(next === 'all' ? 'all' : normalizeCategoryCode(next));
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                {stockTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.code} - {type.description} ({type.count || 0})
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="Search stock..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                Available Stock ({filteredAvailableParts.length})
              </div>
              <div className="max-h-[55vh] overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-sm text-gray-600">Loading stock...</div>
                ) : filteredAvailableParts.length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">No stock available</div>
                ) : (
                  filteredAvailableParts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b px-4 py-2 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.category?.description || item.category_description || item.description || item.code}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.category_code || item.code} • {item.serial_number || 'No serial'}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addPart(item)}>
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-2 text-sm font-medium text-blue-900">
                Selected Parts ({selectedParts.length})
              </div>
              <div className="max-h-[55vh] overflow-y-auto">
                {selectedParts.length === 0 ? (
                  <div className="p-4 text-sm text-gray-600">No parts selected</div>
                ) : (
                  selectedParts.map((part) => (
                    <div key={part.stock_id} className="flex items-center justify-between border-b px-4 py-2 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{part.description || part.code}</div>
                        <div className="text-xs text-gray-500">{part.code}</div>
                        {part.serial_number ? (
                          <div className="text-xs text-gray-500">Serial: {part.serial_number}</div>
                        ) : null}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => removePart(part.stock_id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || selectedParts.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 animate-pulse" />
                  Assigning...
                </span>
              ) : (
                'Assign Stock'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
