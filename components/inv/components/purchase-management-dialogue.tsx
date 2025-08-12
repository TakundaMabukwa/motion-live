"use client";

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Types
interface Part {
  id: string;
  type: string;
  product: string;
  description: string;
  price: number;
}

interface PurchaseItem extends Part {
  quantity: number;
}

// Sample data
const partsData: Part[] = [
  { id: '1', type: 'DASHCAM', product: 'LED alarm', description: 'Audible & Visual LED alarm', price: 2370 },
  { id: '2', type: 'DASHCAM', product: 'PDC Camera', description: 'Pedestrian detection Camera', price: 2922 },
  { id: '3', type: 'AI DASHCAM', product: '5ch AI DVR', description: 'AI DMS live camera system', price: 15832 },
  { id: '4', type: 'AI DASHCAM', product: '2 Camera AI Dashcam + 256GB', description: 'AI DMS DashCam with ADAS', price: 5517 },
  { id: '5', type: 'BACKUP', product: 'SkySpy', description: 'Canbus integration', price: 979 },
  { id: '6', type: 'BACKUP', product: 'Beame Backup Unit', description: 'Wireless recovery unit only', price: 595 },
  { id: '7', type: 'BREATHALOK', product: 'BREATHALOK', description: '', price: 11000 },
  { id: '8', type: 'BREATHALOK', product: 'BREATHALOK OVERRIDE SWITCH', description: '', price: 200 },
  { id: '9', type: 'DASHCAM', product: '2.5" TF 256GB', description: '256GB - SD Memory card', price: 1751 },
  { id: '10', type: 'DVR CAMERA', product: '4 Pin Cable 5M', description: 'Cabling', price: 148 },
  { id: '11', type: 'DVR CAMERA', product: '1TB HD Memory Card', description: '1TB HD Memory Card', price: 2420 },
  { id: '12', type: 'FMS', product: 'Skylink Asset (Trailer)', description: 'Telematics Unit with Accelerometer and 4x inputs for Trailers', price: 4649 },
  { id: '13', type: 'FMS', product: 'Skylink Motorbike', description: 'Telematics Unit with Accelerometer and 4x inputs for Motorcy', price: 2708 },
  { id: '14', type: 'PTT', product: 'Sky Talk portable', description: 'Portable PTT radio entry level', price: 2973 },
  { id: '15', type: 'PTT', product: 'Sky Talk portable with NFC', description: 'Portable PTT radio with NFC tagging', price: 3239 },
  { id: '16', type: 'SERVICES', product: 'Routing OPSI', description: 'Routing OPSI', price: 0 },
  { id: '17', type: 'SERVICES', product: 'After Hours Maintenance', description: 'After Hours Maintenance - Optional', price: 0 },
];

export function PurchaseManagementDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  // Filter parts based on search term
  const filteredParts = useMemo(() => {
    return partsData.filter(
      part =>
        part.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalItems = purchaseItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = purchaseItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return { totalItems, totalPrice };
  }, [purchaseItems]);

  // Add part to purchase list
  const addToPurchase = (part: Part) => {
    const existingItem = purchaseItems.find(item => item.id === part.id);
    if (existingItem) {
      setPurchaseItems(prev =>
        prev.map(item =>
          item.id === part.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setPurchaseItems(prev => [...prev, { ...part, quantity: 1 }]);
    }
  };

  // Update quantity
  const updateQuantity = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      setPurchaseItems(prev => prev.filter(item => item.id !== partId));
    } else {
      setPurchaseItems(prev =>
        prev.map(item =>
          item.id === partId
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  // Remove item from purchase list
  const removeItem = (partId: string) => {
    setPurchaseItems(prev => prev.filter(item => item.id !== partId));
  };

  // Clear all items
  const clearAllItems = () => {
    setPurchaseItems([]);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <ShoppingCart className="mr-2 w-4 h-4" />
          Purchase Management
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold text-gray-900 text-2xl">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            Purchase Management
          </DialogTitle>
        </DialogHeader>
        
        <div className="gap-6 grid grid-cols-1 lg:grid-cols-2 h-[600px]">
          {/* Available Parts */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 text-lg">Available Parts</h3>
            
            <div className="relative">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
              <Input
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <ScrollArea className="pr-4 h-[500px]">
              <div className="space-y-2">
                {filteredParts.map((part) => (
                  <Card key={part.id} className="hover:shadow-md p-3 transition-shadow">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {part.type}
                          </Badge>
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {part.product}
                          </span>
                        </div>
                        <p className="text-gray-600 text-xs truncate">{part.description}</p>
                        <p className="font-medium text-green-600 text-sm">
                          {formatCurrency(part.price)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToPurchase(part)}
                        className="bg-green-600 hover:bg-green-700 ml-2"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Purchase List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 text-lg">Purchase List</h3>
              {purchaseItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllItems}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="mr-1 w-4 h-4" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Purchase Summary */}
            <Card className="bg-green-50 p-4 border-green-200">
              <div className="gap-4 grid grid-cols-2">
                <div>
                  <p className="text-green-700 text-sm">Total Items</p>
                  <p className="font-bold text-green-900 text-xl">{totals.totalItems}</p>
                </div>
                <div>
                  <p className="text-green-700 text-sm">Total Price</p>
                  <p className="font-bold text-green-900 text-xl">{formatCurrency(totals.totalPrice)}</p>
                </div>
              </div>
            </Card>

            <ScrollArea className="pr-4 h-[400px]">
              <div className="space-y-3">
                {purchaseItems.length === 0 ? (
                  <div className="py-12 text-gray-500 text-center">
                    <ShoppingCart className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                    <p>No items in purchase list</p>
                    <p className="text-sm">Add items from the available parts</p>
                  </div>
                ) : (
                  purchaseItems.map((item) => (
                    <Card key={item.id} className="p-3">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                              <span className="font-medium text-gray-900 text-sm truncate">
                                {item.product}
                              </span>
                            </div>
                            <p className="text-gray-600 text-xs truncate">{String(item.description || '')}</p>
                            <p className="font-medium text-green-600 text-sm">
                              {formatCurrency(item.price)} each
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-12 font-medium text-center">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {formatCurrency(item.price * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator />
        
        <div className="flex justify-between items-center pt-4">
          <div className="text-gray-600 text-sm">
            {purchaseItems.length} unique items • {totals.totalItems} total quantity
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              disabled={purchaseItems.length === 0}
              onClick={() => {
                // Handle purchase confirmation
                console.log('Purchase items:', purchaseItems);
                setIsOpen(false);
              }}
            >
              Create Purchase Order ({formatCurrency(totals.totalPrice)})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}