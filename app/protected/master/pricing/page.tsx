"use client";

import { useEffect, useState, useRef } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PricingItem {
  id: string;
  type: string;
  product: string;
  description?: string;
  category: string;
  price: number;
  quantity?: number;
  discount?: number;
  rental?: number;
  installation?: number;
  subscription?: number;
}

export default function PricingPage() {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('product_items')
        .select('id, type, product, description, category, price, quantity, discount, rental, installation, subscription')
        .order('product', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Failed to fetch pricing items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-bold text-gray-900 text-3xl">Pricing</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowAddDialog(true)} 
              className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 shadow-md">
              <Plus className="w-5 h-5" />
              <span>Add New Item</span>
            </button>
          </div>
        </div>

        <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 text-lg">All Pricing ({items.length})</h3>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 flex items-center space-x-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-gray-600">Loading pricing...</span>
              </div>
            ) : (
              <table className="divide-y divide-gray-200 min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Price (ZAR)</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Rental</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Installation</th>
                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 text-sm">{item.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900 text-sm">{item.product}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900 text-sm">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 text-sm">R{item.price.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900 text-sm">R{(item.rental || 0).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900 text-sm">R{(item.installation || 0).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button className="bg-white border px-3 py-1 rounded text-xs">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Pricing Item</DialogTitle>
            <DialogDescription>
              Enter the details for the new pricing item.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input 
                id="description" 
                placeholder="Item description"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cost">Cost (ZAR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R</span>
                  <Input 
                    id="cost"
                    className="pl-8"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="stock_type">Stock Type</Label>
                <Input
                  id="stock_type"
                  placeholder="e.g. Consumable"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                placeholder="Supplier name"
              />
            </div>
            
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit">Add Item</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}