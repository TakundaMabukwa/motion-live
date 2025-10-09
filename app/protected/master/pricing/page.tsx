"use client";

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { Home, FileText, Loader2, Plus } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PricingItem {
  id: number;
  description: string;
  cost_excl_vat_zar?: number;
  USD?: number | string;
  supplier?: string;
  stock_type?: string;
  created_at?: string;
}

// Helper to format cost values
const formatCost = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(Number(value))) return '';
  return value.toString();
};

// Helper to parse cost inputs
const parseCost = (value: string): number => {
  // Remove any non-numeric characters except decimal point
  const sanitized = value.replace(/[^\d.]/g, '');
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
};

export default function PricingPage() {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedItem, setEditedItem] = useState<Partial<PricingItem> | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditingMap, setBulkEditingMap] = useState<Record<number, Partial<PricingItem>>>({});
  const [savingAll, setSavingAll] = useState(false);
  const { toast } = useToast();
  
  // Add new pricing item state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemData, setNewItemData] = useState<Partial<PricingItem>>({
    description: '',
    cost_excl_vat_zar: undefined,
    supplier: '',
    stock_type: ''
  });
  
  // Reference for auto-focusing cost input when editing starts
  const costInputRef = useRef<HTMLInputElement>(null);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('stock_pricing')
        .select('id, description, cost_excl_vat_zar, USD, supplier, stock_type, created_at')
        .order('description', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Failed to fetch pricing items', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditItem = (item: PricingItem) => {
    setEditingId(item.id);
    setEditedItem({
      description: item.description,
      supplier: item.supplier,
      cost_excl_vat_zar: item.cost_excl_vat_zar,
      stock_type: item.stock_type,
    });
    
    // Focus the cost input when editing starts
    setTimeout(() => {
      costInputRef.current?.focus();
    }, 50);
  };

  const cancelEditItem = () => {
    setEditingId(null);
    setEditedItem(null);
  };

  const saveEditItem = async (id: number) => {
    if (!editedItem) return;
    try {
      setSavingId(id);
      const supabase = createClient();

      const updatePayload: Record<string, unknown> = {};
      if (editedItem.description !== undefined) updatePayload.description = editedItem.description;
      if (editedItem.supplier !== undefined) updatePayload.supplier = editedItem.supplier;
      if (editedItem.cost_excl_vat_zar !== undefined) updatePayload.cost_excl_vat_zar = Number(editedItem.cost_excl_vat_zar || 0);
      if (editedItem.stock_type !== undefined) updatePayload.stock_type = editedItem.stock_type;

      const { data, error } = await supabase
          .from('stock_pricing')
          .update(updatePayload)
          .eq('id', id)
          .select();

      if (error) throw error;

      // Update local state
      if (data && data[0]) {
        setItems(prev => prev.map(p => (p.id === id ? { ...p, ...(data[0] as Partial<PricingItem>) } : p)));
      } else {
        setItems(prev => prev.map(p => (p.id === id ? { ...p, ...editedItem } as PricingItem : p)));
      }

      toast({ title: 'Saved', description: 'Pricing item updated', variant: 'default' });
      cancelEditItem();
    } catch (err: unknown) {
      console.error('Error saving pricing item:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: `Failed to save: ${msg}`, variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const startBulkEdit = () => {
    const map: Record<number, Partial<PricingItem>> = {};
    items.forEach(p => {
      map[p.id] = {
        description: p.description,
        supplier: p.supplier,
        cost_excl_vat_zar: p.cost_excl_vat_zar,
        stock_type: p.stock_type,
      };
    });
    setBulkEditingMap(map);
    setBulkEditMode(true);
  };

  const cancelBulkEdit = () => {
    setBulkEditingMap({});
    setBulkEditMode(false);
  };
  
  // Function to add new pricing item
  const handleAddPricingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItemData.description) {
      toast({
        title: "Validation Error",
        description: "Description is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setAddingItem(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('stock_pricing')
        .insert({
          description: newItemData.description,
          cost_excl_vat_zar: newItemData.cost_excl_vat_zar,
          supplier: newItemData.supplier || null,
          stock_type: newItemData.stock_type || null
        })
        .select();
      
      if (error) throw error;
      
      // Update local state with the new item
      if (data && data.length > 0) {
        setItems(prev => [...prev, data[0] as PricingItem]);
        toast({ 
          title: 'Success', 
          description: 'New pricing item added', 
          variant: 'default' 
        });
        
        // Reset form and close dialog
        setNewItemData({
          description: '',
          cost_excl_vat_zar: undefined,
          supplier: '',
          stock_type: ''
        });
        setShowAddDialog(false);
      }
    } catch (err: unknown) {
      console.error('Error adding pricing item:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast({ 
        title: 'Error', 
        description: `Failed to add item: ${msg}`, 
        variant: 'destructive' 
      });
    } finally {
      setAddingItem(false);
    }
  };

  const saveBulkEdit = async () => {
    try {
      setSavingAll(true);
      const supabase = createClient();

      const updates = Object.keys(bulkEditingMap).map(async (key) => {
        const id = Number(key);
        const data = bulkEditingMap[id];
        const payload: Record<string, unknown> = {};
        if (data.description !== undefined) payload.description = data.description;
        if (data.supplier !== undefined) payload.supplier = data.supplier;
        if (data.cost_excl_vat_zar !== undefined) payload.cost_excl_vat_zar = Number(data.cost_excl_vat_zar || 0);
        if (data.stock_type !== undefined) payload.stock_type = data.stock_type;

        const { data: updated, error } = await supabase.from('stock_pricing').update(payload).eq('id', id).select();
        if (error) throw error;
        return { id, updated: updated && updated[0] };
      });

      const results = await Promise.all(updates);

      // Merge returned updates into local state
      setItems(prev => {
        const copy = [...prev];
        results.forEach(r => {
          if (!r) return;
          const idx = copy.findIndex(p => p.id === r.id);
          if (idx === -1) return;
          if (r.updated) {
            copy[idx] = { ...copy[idx], ...(r.updated as Partial<PricingItem>) };
          } else {
            copy[idx] = { ...copy[idx], ...(bulkEditingMap[r.id] as Partial<PricingItem>) } as PricingItem;
          }
        });
        return copy;
      });

      toast({ title: 'Saved', description: 'All pricing items updated', variant: 'default' });
      setBulkEditingMap({});
      setBulkEditMode(false);
    } catch (err: unknown) {
      console.error('Error saving bulk pricing:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error', description: `Failed to save some items: ${msg}`, variant: 'destructive' });
    } finally {
      setSavingAll(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <div className="bg-white shadow-lg w-64">
        <div className="p-6 border-b">
          <h1 className="font-bold text-gray-900 text-xl">Dashboard</h1>
        </div>
        <nav className="mt-6">
          <div className="space-y-2 px-4">
            <Link href="/protected/master" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
              <Home className="mr-3 w-5 h-5" />
              Home
            </Link>
            <Link href="/protected/master/users" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
              <FileText className="mr-3 w-5 h-5" />
              Users
            </Link>
            <Link href="/protected/master/invoices" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
              <FileText className="mr-3 w-5 h-5" />
              Invoices
            </Link>
            <Link href="/protected/master/stock-orders" className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
              <FileText className="mr-3 w-5 h-5" />
              Stock Orders
            </Link>
            <Link href="/protected/master/pricing" className="flex items-center bg-blue-50 px-3 py-2 rounded-md text-blue-600">
              <FileText className="mr-3 w-5 h-5" />
              Pricing
            </Link>
            <div className="flex items-center hover:bg-gray-50 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900">
              <LogoutButton />
            </div>
          </div>
        </nav>
      </div>

      <div className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-bold text-gray-900 text-3xl">Pricing</h2>
            <div className="flex items-center space-x-2">
              {!bulkEditMode ? (
                <>
                  <button 
                    onClick={() => setShowAddDialog(true)} 
                    className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 shadow-md">
                    <Plus className="w-5 h-5" />
                    <span>Add New Item</span>
                  </button>
                  <button onClick={startBulkEdit} className="bg-white border px-3 py-2 rounded text-sm">Edit All</button>
                </>
              ) : (
                <>
                  <button onClick={saveBulkEdit} disabled={savingAll} className="bg-green-600 text-white px-3 py-2 rounded text-sm">{savingAll ? 'Saving…' : 'Save All'}</button>
                  <button onClick={cancelBulkEdit} disabled={savingAll} className="bg-gray-100 px-3 py-2 rounded text-sm">Cancel</button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 text-lg">All Pricing ({items.length})</h3>
              <button 
                onClick={() => setShowAddDialog(true)} 
                className="bg-green-600 text-white px-4 py-2 rounded-none shadow flex items-center">
                <Plus className="w-5 h-5 mr-1" /> Add New Pricing Item
              </button>
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
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Cost (ZAR)</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Stock Type</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          { (bulkEditMode && bulkEditingMap[item.id]) || editingId === item.id ? (
                            <input 
                              value={(bulkEditMode ? (bulkEditingMap[item.id]?.description ?? '') : (editedItem?.description ?? ''))} 
                              onChange={(e) => {
                                if (bulkEditMode) setBulkEditingMap(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), description: e.target.value } }));
                                else setEditedItem(prev => ({ ...(prev || {}), description: e.target.value }));
                              }} 
                              className="w-full border px-2 py-1 rounded" 
                            />
                          ) : (
                            <div className="font-medium text-gray-900 text-sm">{item.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          { (bulkEditMode && bulkEditingMap[item.id]) || editingId === item.id ? (
                            <input 
                              value={(bulkEditMode ? (bulkEditingMap[item.id]?.supplier ?? '') : (editedItem?.supplier ?? ''))} 
                              onChange={(e) => {
                                if (bulkEditMode) setBulkEditingMap(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), supplier: e.target.value } }));
                                else setEditedItem(prev => ({ ...(prev || {}), supplier: e.target.value }));
                              }} 
                              className="w-full border px-2 py-1 rounded" 
                            />
                          ) : (
                            <div className="text-gray-900 text-sm">{item.supplier || '—'}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          { (bulkEditMode && bulkEditingMap[item.id]) || editingId === item.id ? (
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R</span>
                              <input 
                                ref={editingId === item.id ? costInputRef : undefined}
                                type="number"
                                step="0.01"
                                min="0"
                                value={formatCost(bulkEditMode ? 
                                  bulkEditingMap[item.id]?.cost_excl_vat_zar : 
                                  editedItem?.cost_excl_vat_zar
                                )} 
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const numValue = value === '' ? undefined : parseFloat(value);
                                  
                                  if(bulkEditMode) {
                                    setBulkEditingMap(prev => ({
                                      ...prev,
                                      [item.id]: {
                                        ...(prev[item.id] || {}),
                                        cost_excl_vat_zar: numValue,
                                      },
                                    }));
                                  } else {
                                    setEditedItem(prev => ({ ...(prev || {}), cost_excl_vat_zar: numValue }));
                                  }
                                }}
                                placeholder={`${typeof item.cost_excl_vat_zar === 'number' ? item.cost_excl_vat_zar.toFixed(2) : '0.00'}`}
                                className="block w-40 pl-8 py-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="font-medium text-gray-900 text-sm">R{(item.cost_excl_vat_zar || 0).toLocaleString()}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          { (bulkEditMode && bulkEditingMap[item.id]) || editingId === item.id ? (
                            <input 
                              value={(bulkEditMode ? (bulkEditingMap[item.id]?.stock_type ?? '') : (editedItem?.stock_type ?? ''))} 
                              onChange={(e) => {
                                if (bulkEditMode) setBulkEditingMap(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), stock_type: e.target.value } }));
                                else setEditedItem(prev => ({ ...(prev || {}), stock_type: e.target.value }));
                              }} 
                              className="w-28 border px-2 py-1 rounded" 
                            />
                          ) : (
                            <div className="text-gray-900 text-sm">{item.stock_type || '—'}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingId === item.id ? (
                            <div className="flex items-center space-x-2">
                              <button onClick={() => saveEditItem(item.id)} disabled={savingId === item.id} className="bg-green-600 text-white px-3 py-1 rounded text-xs">
                                {savingId === item.id ? 'Saving…' : 'Save'}
                              </button>
                              <button onClick={cancelEditItem} className="bg-gray-100 px-3 py-1 rounded text-xs">Cancel</button>
                            </div>
                          ) : !bulkEditMode && (
                            <div className="flex items-center space-x-2">
                              <button onClick={() => startEditItem(item)} className="bg-white border px-3 py-1 rounded text-xs">Edit</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add New Pricing Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Pricing Item</DialogTitle>
            <DialogDescription>
              Enter the details for the new pricing item.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAddPricingSubmit} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input 
                id="description" 
                value={newItemData.description}
                onChange={(e) => setNewItemData({...newItemData, description: e.target.value})}
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
                    value={newItemData.cost_excl_vat_zar === undefined ? '' : newItemData.cost_excl_vat_zar}
                    onChange={(e) => setNewItemData({...newItemData, cost_excl_vat_zar: e.target.value === '' ? undefined : Number(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="stock_type">Stock Type</Label>
                <Input
                  id="stock_type"
                  value={newItemData.stock_type || ''}
                  onChange={(e) => setNewItemData({...newItemData, stock_type: e.target.value})}
                  placeholder="e.g. Consumable"
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={newItemData.supplier || ''}
                onChange={(e) => setNewItemData({...newItemData, supplier: e.target.value})}
                placeholder="Supplier name"
              />
            </div>
            
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)} disabled={addingItem}>Cancel</Button>
              <Button type="submit" disabled={!newItemData.description || addingItem}>
                {addingItem ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
                ) : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
