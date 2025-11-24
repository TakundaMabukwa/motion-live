'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  onPartsAssigned
}) {
  const [selectedParts, setSelectedParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [allStockItems, setAllStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ipAddress, setIpAddress] = useState('');

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory-items');
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setAllStockItems(data.items || []);
      
      // Extract unique categories from category descriptions
      const uniqueCategories = [...new Set((data.items || []).map(item => item.category?.description).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedParts([]);
      setSearchTerm('');
      setShowQRCode(false);
      setQrCodeUrl('');
      setSelectedCategory('all');
      setIpAddress('');
      fetchInventoryItems();
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
        description: String(item.category?.description || ''),
        serial_number: String(item.serial_number || ''),
        code: String(item.code || ''),
        supplier: String(item.supplier || ''),
        quantity: 1,
        available_stock: parseInt(item.quantity || '0'),
        cost_per_unit: parseFloat(item.cost_excl_vat_zar || '0'),
        total_cost: parseFloat(item.cost_excl_vat_zar || '0'),
        ip_address: ipAddress || ''
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
          inventory_items: selectedParts,
          ipAddress: ipAddress
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
      <DialogContent className="w-[99vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Assign Parts to Job #{jobCard?.job_number}
          </DialogTitle>
          <DialogDescription>
            Select inventory items to assign to this job card
          </DialogDescription>
        </DialogHeader>

        {/* Job Information Section */}
        {jobCard && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg mb-4 border border-blue-200">
            {console.log('Full Job Card Data:', jobCard)}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{jobCard.customer_name || 'N/A'}</h3>
                <p className="text-sm text-gray-600">Job #{jobCard.job_number} • {jobCard.quotation_number || 'No Quote'}</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-xl text-blue-600">
                  {jobCard.quotation_total_amount ? `${jobCard.quotation_products?.length || 0} items` : 'No Items'}
                </div>
                <Badge className={`text-xs ${
                  jobCard.job_type === 'deinstall' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {jobCard.job_type?.toUpperCase() || 'N/A'}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Vehicle</span>
                <p className="font-medium text-gray-900">
                  {(() => {
                    if (jobCard.quotation_products && jobCard.quotation_products[0]?.vehicle_plate) {
                      return jobCard.quotation_products[0].vehicle_plate;
                    }
                    if (jobCard.vehicle_registration && jobCard.vehicle_registration !== 'N/A') {
                      return jobCard.vehicle_registration;
                    }
                    if (jobCard.job_description) {
                      const regMatch = jobCard.job_description.match(/REG:\s*([\w\d]+)/);
                      if (regMatch) return regMatch[1];
                      const startMatch = jobCard.job_description.match(/^([\w\d]+)\s*-/);
                      if (startMatch) return startMatch[1];
                    }
                    return 'N/A';
                  })()} 
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Status</span>
                <p className="font-medium text-gray-900">{jobCard.job_status || jobCard.status || 'Pending'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Items</span>
                <p className="font-medium text-gray-900">{jobCard.quotation_products?.length || 0} items</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Priority</span>
                <p className="font-medium text-gray-900">{jobCard.priority || 'Normal'}</p>
              </div>
            </div>
            {jobCard.job_description && jobCard.job_description.includes('DE-INSTALL') && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <div className="bg-white p-3 rounded border">
                  {(() => {
                    const desc = jobCard.job_description;
                    const skyMatch = desc.match(/SKY\s*-\s*([\d\.]+)/);
                    const snMatch = desc.match(/S\/N\s*-\s*(\w+)/);
                    const simMatch = desc.match(/SIM\s*-\s*([\d]+)/);
                    const beameMatches = desc.match(/BEAME\s*-\s*(\w+)/g);
                    const deinstallMatch = desc.match(/DEINSTALL\s*-\s*([\d\.]+)/);
                    
                    return (
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                        {skyMatch && (
                          <div>
                            <span className="text-gray-500">Sky IP</span>
                            <p className="font-medium">{skyMatch[1]}</p>
                          </div>
                        )}
                        {snMatch && (
                          <div>
                            <span className="text-gray-500">S/N</span>
                            <p className="font-medium">{snMatch[1]}</p>
                          </div>
                        )}
                        {simMatch && (
                          <div>
                            <span className="text-gray-500">SIM</span>
                            <p className="font-medium">{simMatch[1]}</p>
                          </div>
                        )}
                        {deinstallMatch && (
                          <div>
                            <span className="text-gray-500">Deinstall</span>
                            <p className="font-medium text-red-600">{deinstallMatch[1]}</p>
                          </div>
                        )}
                        {beameMatches && (
                          <div>
                            <span className="text-gray-500">BEAME</span>
                            <p className="font-medium">{beameMatches.length} units</p>
                          </div>
                        )}
                      </div>
                    );
                  })()} 
                </div>
              </div>
            )}
            {jobCard.quotation_products && Array.isArray(jobCard.quotation_products) && jobCard.quotation_products.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <span className="font-medium text-gray-700 text-sm">Items to Remove:</span>
                {console.log('Quotation Products:', jobCard.quotation_products)}
                <div className="mt-2 space-y-1">
                  {jobCard.quotation_products.map((product, index) => {
                    console.log(`Product ${index}:`, product);
                    const valueMatch = product.description?.match(/Value:\s*(\d+)\s*-\s*(.+)/);
                    const extractedValue = valueMatch ? valueMatch[1] : null;
                    
                    return (
                      <div key={index} className="bg-white p-2 rounded border flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">
                            {product.name || `Item ${index + 1}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {extractedValue && `Original: R${extractedValue} • `}
                            {product.type}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Qty: {product.quantity || 1}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!showQRCode ? (
          <div className="h-[75vh] flex flex-col">
            {/* Controls */}
            <div className="mb-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Category</label>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {jobCard?.job_type !== 'deinstall' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">IP Address</label>
                  <Input
                    type="text"
                    placeholder="Enter IP address for installation..."
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    className="h-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search by Serial Number</label>
                <Input
                  type="text"
                  placeholder="Type serial number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Two Panel Layout */}
            <div className="flex-1 flex gap-3">
              {/* Available Parts */}
              <div className="w-3/5 bg-gray-50 rounded-lg p-3">
                <h3 className="font-semibold text-gray-800 mb-3">Available Parts</h3>
                <div className="h-full overflow-y-auto">
                  <div className="bg-white rounded border">
                    {allStockItems.filter(item => {
                      // Apply category filter
                      const matchesCategory = selectedCategory === 'all' || item.category?.description === selectedCategory;
                      if (!matchesCategory) return false;
                      
                      // Apply search (searches description and serial number)
                      if (searchTerm) {
                        return item.category?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
                      }
                      
                      // Show all items in selected category
                      return true;
                    }).slice(0, 100).map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center"
                        onClick={() => addPart(item)}
                      >
                        <div>
                          <div className="font-medium text-sm text-gray-900">{item.category?.description || 'No description'}</div>
                          <div className="text-xs text-gray-600">{item.serial_number || 'No serial'}</div>
                        </div>
                        <Badge variant="secondary" className="text-xs px-2 py-1 bg-blue-100 text-blue-800">{item.status || 'Available'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selected Parts */}
              <div className="w-2/5 flex flex-col">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">Selected Parts</h3>
                    <Badge variant="default" className="text-sm">{selectedParts.length}</Badge>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto">
                    {selectedParts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Package className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">Click parts to add them</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded border">
                        {selectedParts.map((part, index) => (
                          <div key={`${part.stock_id}-${index}`} className="p-3 border-b last:border-b-0 flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">{part.description}</div>
                              <div className="text-xs text-gray-500">{part.serial_number}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{part.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePart(part.stock_id)}
                                className="text-red-500 hover:text-red-700 p-0 h-6 w-6"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-4">
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