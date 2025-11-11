'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search, 
  X, 
  CheckCircle,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';

export default function AssignPartsModal({ 
  isOpen, 
  onClose, 
  jobCard, 
  onPartsAssigned,
  allStockItems = []
}) {
  const [selectedParts, setSelectedParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [ipSearchTerm, setIpSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedParts([]);
      setSearchTerm('');
      setShowQRCode(false);
      setQrCodeUrl('');
      setIpSearchTerm('');
    }
  }, [isOpen]);

  const addPart = (item) => {
    const existingPart = selectedParts.find(part => part.stock_id === item.id);
    
    if (existingPart) {
      setSelectedParts(prev => prev.map(part => 
        part.stock_id === item.id 
          ? { ...part, quantity: part.quantity + 1 }
          : part
      ));
    } else {
      setSelectedParts(prev => [...prev, {
        stock_id: item.id,
        description: String(item.description || ''),
        code: String(item.code || ''),
        supplier: String(item.supplier || ''),
        quantity: 1,
        available_stock: parseInt(item.quantity || '0'),
        cost_per_unit: parseFloat(item.cost_excl_vat_zar || '0'),
        total_cost: parseFloat(item.cost_excl_vat_zar || '0')
      }]);
    }
  };

  const removePart = (stockId) => {
    setSelectedParts(prev => prev.filter(part => part.stock_id !== stockId));
  };

  const updatePartQuantity = (stockId, newQuantity) => {
    const quantity = Math.max(1, parseInt(newQuantity) || 1);
    setSelectedParts(prev => prev.map(part => 
      part.stock_id === stockId 
        ? { 
            ...part, 
            quantity,
            total_cost: (part.cost_per_unit * quantity).toFixed(2)
          }
        : part
    ));
  };

  const handleSubmit = async () => {
    if (selectedParts.length === 0) {
      toast.error('Please select at least one part');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(`/api/job-cards/${jobCard.id}/assign-parts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parts: selectedParts,
          ipAddress: '192.168.1.1'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign parts');
      }

      const result = await response.json();
      
      if (result.qr_code) {
        setQrCodeUrl(result.qr_code);
        setShowQRCode(true);
      } else {
        toast.success('Parts assigned successfully!');
        if (onPartsAssigned) {
          onPartsAssigned();
        }
        onClose();
      }
      
    } catch (error) {
      toast.error(error.message || 'Failed to assign parts');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Assign Parts to Job #{jobCard?.job_number}
          </DialogTitle>
        </DialogHeader>

        {!showQRCode ? (
          <div className="h-[70vh] flex flex-col">
            {/* Search Bars */}
            <div className="mb-4 space-y-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter IP address and press Enter"
                  value={ipSearchTerm}
                  onChange={(e) => setIpSearchTerm(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search parts by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              {ipSearchTerm && (
                <div className="text-xs text-blue-600">
                  IP Address: {ipSearchTerm}
                  <button 
                    onClick={() => setIpSearchTerm('')}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Two Column Layout */}
            <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
              {/* Available Parts */}
              <div className="flex flex-col">
                <h3 className="font-medium text-gray-900 mb-2">Available Parts</h3>
                <div className="flex-1 border rounded-lg overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    {allStockItems.filter(item => {
                      const hasStock = parseInt(item.quantity || '0') > 0;
                      
                      // If IP address is entered, search by serial_number field
                      if (ipSearchTerm) {
                        const matchesSerial = item.serial_number?.toLowerCase().includes(ipSearchTerm.toLowerCase());
                        return hasStock && matchesSerial;
                      }
                      
                      // Otherwise use regular search
                      const matchesSearch = !searchTerm || 
                        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.code?.toLowerCase().includes(searchTerm.toLowerCase());
                      return hasStock && matchesSearch;
                    }).slice(0, 50).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border-b hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => addPart(item)}
                      >
                        <div className="font-medium text-sm text-gray-900 truncate">{item.description}</div>
                        <div className="text-xs text-gray-500 mt-1">{item.code} • Stock: {item.quantity}</div>
                        {item.cost_excl_vat_zar && (
                          <div className="text-xs text-green-600 mt-1">R{parseFloat(item.cost_excl_vat_zar).toFixed(2)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selected Parts */}
              <div className="flex flex-col">
                <h3 className="font-medium text-gray-900 mb-2">Selected Parts ({selectedParts.length})</h3>
                <div className="flex-1 border rounded-lg overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    {selectedParts.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No parts selected</p>
                      </div>
                    ) : (
                      selectedParts.map((part, index) => (
                        <div key={`${part.stock_id}-${index}`} className="p-3 border-b">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900 truncate">{part.description}</div>
                              <div className="text-xs text-gray-500">{part.code}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePart(part.stock_id)}
                              className="text-red-500 hover:text-red-700 p-1 h-6 w-6"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updatePartQuantity(part.stock_id, Math.max(1, part.quantity - 1))}
                              className="h-6 w-6 p-0"
                            >
                              -
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">{part.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updatePartQuantity(part.stock_id, Math.min(part.available_stock, part.quantity + 1))}
                              className="h-6 w-6 p-0"
                            >
                              +
                            </Button>
                            <span className="text-xs text-gray-500 ml-2">/ {part.available_stock}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedParts.length > 0 && (
                  <span>Total: R{selectedParts.reduce((sum, part) => sum + (parseFloat(part.total_cost) || 0), 0).toFixed(2)}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={submitting || selectedParts.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? 'Assigning...' : `Assign ${selectedParts.length} Parts`}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 w-12 h-12 text-green-600" />
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">Parts Assigned Successfully!</h3>
              <p className="text-gray-600">QR code has been generated and stored for this job.</p>
            </div>
            <div className="text-center">
              <img 
                src={qrCodeUrl} 
                alt="Job QR Code" 
                className="mx-auto border rounded-lg"
                style={{ maxWidth: '200px' }}
              />
              <Button 
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 w-full mt-4"
              >
                <Printer className="mr-2 w-4 h-4" />
                Print QR Code
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}