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
  Printer,
  FileText,
  Wrench,
  User,
  Car,
  Calendar,
  ClipboardList,
  AlertTriangle,
  MessageSquare,
  DollarSign,
  MapPin,
  Clock,
  Phone,
  Mail,
  Info
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

  const [selectedStockType, setSelectedStockType] = useState('all');
  const [stockTypes, setStockTypes] = useState([]);
  const [allStockItems, setAllStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ipAddress, setIpAddress] = useState('');

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stock');
      
      if (!response.ok) throw new Error('Failed to fetch stock');
      const data = await response.json();
      const stockArray = Array.isArray(data.stock) ? data.stock : [];
      setAllStockItems(stockArray);
      
      const categoriesResponse = await fetch('/api/inventory-categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setStockTypes(categoriesData.categories || []);
      }
    } catch (error) {
      toast.error('Failed to load stock items');
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
      setSelectedStockType('all');
      setIpAddress('');
      fetchInventoryItems();
      
      // Pre-populate with existing parts and IP address
      if (jobCard?.parts_required && Array.isArray(jobCard.parts_required)) {
        const existingParts = jobCard.parts_required.map(part => ({
          stock_id: part.stock_id || part.id,
          description: String(part.description || ''),
          serial_number: String(part.serial_number || ''),
          code: String(part.code || ''),
          supplier: String(part.supplier || ''),
          quantity: part.quantity || 1,
          cost_per_unit: parseFloat(part.cost_per_unit || '0'),
          total_cost: parseFloat(part.total_cost || '0'),
          ip_address: part.ip_address || ''
        }));
        setSelectedParts(existingParts);
        
        // Set IP address from first part if available
        if (existingParts.length > 0 && existingParts[0].ip_address) {
          setIpAddress(existingParts[0].ip_address);
        }
      }
    }
  }, [isOpen, jobCard]);

  const addPart = async (item) => {
    const alreadySelected = selectedParts.find(part => part.stock_id === item.id);
    if (alreadySelected) {
      toast.error('This item is already selected');
      return;
    }
    
    let serialNumber = item.serial_number || '';
    
    // If no serial number, fetch an available one from inventory_items for this category
    if (!serialNumber && item.category_code) {
      try {
        const response = await fetch(`/api/inventory/get-serial?category_code=${encodeURIComponent(item.category_code)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.serial_number) {
            serialNumber = data.serial_number;
            toast.success(`Auto-assigned serial: ${serialNumber}`);
          }
        }
      } catch (error) {
        console.error('Error fetching serial number:', error);
      }
    }
    
    setSelectedParts(prev => [...prev, {
      stock_id: item.id,
      description: String(item.category?.description || item.description || ''),
      serial_number: String(serialNumber),
      code: String(item.category_code || item.code || ''),
      supplier: String(item.supplier || ''),
      quantity: 1,
      cost_per_unit: parseFloat(item.cost_excl_vat_zar || '0'),
      total_cost: parseFloat(item.cost_excl_vat_zar || '0'),
      ip_address: ipAddress || ''
    }]);
    
    setAllStockItems(prev => prev.filter(stockItem => stockItem.id !== item.id));
  };

  const removePart = async (stockId) => {
    const part = selectedParts.find(p => p.stock_id === stockId);
    if (!part) return;
    
    try {
      const response = await fetch(`/api/job-cards/${jobCard.id}/unassign-part`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_id: stockId, part })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unassign');
      }
      
      setSelectedParts(prev => prev.filter(p => p.stock_id !== stockId));
      toast.success('Part removed from job');
    } catch (error) {
      toast.error(error.message || 'Failed to remove part');
    }
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
      
      // Remove assigned items from the available list
      const assignedIds = selectedParts.map(p => p.stock_id);
      setAllStockItems(prev => prev.filter(item => !assignedIds.includes(item.id)));
      
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

        {/* Clean Single Page Job Information */}
        {jobCard && (
          <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
            {/* Compact Header Bar */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">#{jobCard.job_number}</span>
                  <span className="text-blue-200">•</span>
                  <span>{jobCard.customer_name || 'No Customer'}</span>
                  <span className="text-blue-200">•</span>
                  <span className="font-mono">{jobCard.vehicle_registration || jobCard.quotation_products?.[0]?.vehicle_plate || 'No Reg'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${
                    jobCard.job_type === 'deinstall' ? 'bg-red-500 text-white' : 
                    jobCard.job_type === 'install' ? 'bg-green-500 text-white' :
                    'bg-blue-200 text-blue-800'
                  }`}>
                    {jobCard.job_type?.toUpperCase() || 'N/A'}
                  </Badge>
                  <Badge className="bg-white/20 text-white text-xs font-bold">
                    R {(jobCard.quotation_total_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Single Page Content Grid */}
            <div className="bg-gray-50 p-3">
              <div className="grid grid-cols-12 gap-3">
                
                {/* Left - Info Cards (Compact) */}
                <div className="col-span-3 space-y-2">
                  {/* Customer & Vehicle Combined */}
                  <div className="bg-white p-2 rounded border text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase">Customer</span>
                        <p className="font-semibold text-gray-900 truncate">{jobCard.customer_name || 'N/A'}</p>
                        {jobCard.customer_phone && <p className="text-gray-500 text-[10px]">{jobCard.customer_phone}</p>}
                      </div>
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase">Vehicle</span>
                        <p className="font-semibold text-gray-900">{jobCard.vehicle_registration || 'N/A'}</p>
                        {jobCard.vehicle_make && <p className="text-gray-500 text-[10px]">{jobCard.vehicle_make} {jobCard.vehicle_model}</p>}
                      </div>
                    </div>
                    {jobCard.ip_address && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-gray-400 text-[10px] uppercase">IP Address</span>
                        <p className="font-mono font-semibold text-blue-600">{jobCard.ip_address}</p>
                      </div>
                    )}
                  </div>

                  {/* Notes - If Any */}
                  {(jobCard.special_instructions || jobCard.quote_notes || jobCard.job_description) && (
                    <div className="bg-amber-50 p-2 rounded border border-amber-200 text-xs">
                      <div className="flex items-center gap-1 text-amber-700 mb-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="font-semibold text-[10px] uppercase">Notes</span>
                      </div>
                      <p className="text-gray-700 text-[11px] leading-tight">
                        {jobCard.special_instructions || jobCard.quote_notes || jobCard.job_description}
                      </p>
                    </div>
                  )}

                  {/* Already Assigned Parts */}
                  {jobCard.parts_required && jobCard.parts_required.length > 0 && (
                    <div className="bg-blue-50 p-2 rounded border border-blue-200 text-xs">
                      <div className="flex items-center gap-1 text-blue-700 mb-1">
                        <Package className="w-3 h-3" />
                        <span className="font-semibold text-[10px] uppercase">Assigned ({jobCard.parts_required.length})</span>
                      </div>
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {jobCard.parts_required.map((part, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-[10px]">
                            <span className="text-gray-600 truncate flex-1">{part.description || part.name}</span>
                            {part.serial_number && <span className="font-mono text-blue-600">{part.serial_number}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right - Quotation Products Table */}
                <div className="col-span-9">
                  <div className="bg-white rounded border h-full flex flex-col">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-purple-50 border-b">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
                        <span className="font-semibold text-purple-800 text-sm">Quotation Products</span>
                        <Badge className="bg-purple-600 text-white text-[10px] px-1.5">
                          {jobCard.quotation_products?.length || 0}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Products Table */}
                    <div className="flex-1 overflow-y-auto max-h-40">
                      {jobCard.quotation_products && jobCard.quotation_products.length > 0 ? (
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-left text-gray-500 text-[10px] uppercase">
                              <th className="px-2 py-1.5 font-medium">Product</th>
                              <th className="px-2 py-1.5 font-medium">Type</th>
                              <th className="px-2 py-1.5 font-medium">Vehicle</th>
                              <th className="px-2 py-1.5 font-medium">S/N</th>
                              <th className="px-2 py-1.5 font-medium">IP</th>
                              <th className="px-2 py-1.5 font-medium text-center">Qty</th>
                              <th className="px-2 py-1.5 font-medium text-right">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {jobCard.quotation_products.map((product, index) => {
                              const snMatch = product.description?.match(/S\/N:\s*(\w+)/i);
                              const ipMatch = product.description?.match(/IP:\s*([\d.]+)/i);
                              const serialNumber = snMatch ? snMatch[1] : null;
                              const ipAddr = ipMatch ? ipMatch[1] : null;
                              
                              return (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-2 py-1.5">
                                    <span className="font-medium text-gray-900">{product.name || product.product_name || 'N/A'}</span>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Badge className="bg-blue-100 text-blue-800 text-[9px] px-1">
                                      {product.type || 'N/A'}
                                    </Badge>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {product.vehicle_plate && (
                                      <span className="font-mono font-semibold text-green-700">{product.vehicle_plate}</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {serialNumber && (
                                      <span className="font-mono text-purple-700 bg-purple-50 px-1 rounded">{serialNumber}</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {ipAddr && (
                                      <span className="font-mono text-blue-700 bg-blue-50 px-1 rounded">{ipAddr}</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    <span className="text-gray-600">{product.quantity || 1}</span>
                                  </td>
                                  <td className="px-2 py-1.5 text-right">
                                    <span className="font-semibold text-green-700">
                                      R {(product.cash_price || product.total_price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t">
                            <tr>
                              <td colSpan="6" className="px-2 py-1.5 text-right font-semibold text-gray-700">Total:</td>
                              <td className="px-2 py-1.5 text-right font-bold text-green-700">
                                R {(jobCard.quotation_total_amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-gray-400">
                          <Package className="w-6 h-6 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">No quotation products</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!showQRCode ? (
          <div className="h-[75vh] flex flex-col">
            {/* Controls */}
            <div className="mb-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Type</label>
                <select 
                  value={selectedStockType}
                  onChange={(e) => setSelectedStockType(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Categories</option>
                  {stockTypes.map(type => (
                    <option key={type.code} value={type.code}>{type.code} - {type.description}</option>
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
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                <Input
                  type="text"
                  placeholder="Search by serial number, description, or category..."
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
                      const isSelected = selectedParts.some(p => p.stock_id === item.id);
                      if (isSelected) return false;
                      
                      const matchesSearch = !searchTerm ||
                        item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.category?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.category_code?.toLowerCase().includes(searchTerm.toLowerCase());
                      
                      const matchesType = selectedStockType === 'all' || item.category_code === selectedStockType;
                      
                      return matchesSearch && matchesType;
                    }).slice(0, 100).map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="p-3 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center"
                        onClick={() => addPart(item)}
                      >
                        <div>
                          <div className="font-medium text-sm text-gray-900">{item.category?.description || 'No description'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {item.serial_number ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                S/N: {item.serial_number}
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                Auto-assign S/N
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">{item.category_code || 'N/A'}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className={`text-xs px-2 py-1 ${
                          item.status === 'ASSIGNED' || item.status === 'OUT OF STOCK' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>{item.status || 'IN STOCK'}</Badge>
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
                              <div className="flex items-center gap-2 mt-1">
                                {part.serial_number ? (
                                  <Badge className="bg-green-100 text-green-800 text-xs">
                                    S/N: {part.serial_number}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                    No Serial
                                  </Badge>
                                )}
                                {part.code && (
                                  <span className="text-xs text-gray-500">{part.code}</span>
                                )}
                              </div>
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
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 w-12 h-12 text-green-600" />
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">Parts Assigned Successfully!</h3>
              <p className="text-gray-600">QR code has been generated and stored for this job.</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Job Information</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Job Number:</span>
                  <p className="font-medium">{jobCard?.job_number}</p>
                </div>
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <p className="font-medium">{jobCard?.customer_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Vehicle:</span>
                  <p className="font-medium">{jobCard?.vehicle_registration || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Job Type:</span>
                  <p className="font-medium">{jobCard?.job_type?.toUpperCase() || 'N/A'}</p>
                </div>
                {ipAddress && (
                  <div className="col-span-2">
                    <span className="text-gray-500">IP Address:</span>
                    <p className="font-medium">{ipAddress}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Assigned Parts ({selectedParts.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedParts.map((part, index) => (
                  <div key={index} className="bg-white p-2 rounded border flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{part.description}</div>
                      <div className="text-xs text-gray-500">{part.serial_number}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">Qty: {part.quantity}</Badge>
                  </div>
                ))}
              </div>
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