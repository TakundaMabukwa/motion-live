'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Package, 
  Search, 
  Plus, 
  X, 
  CheckCircle,
  AlertCircle,
  QrCode,
  Printer,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

export default function AssignPartsModal({ 
  isOpen, 
  onClose, 
  jobCard, 
  onPartsAssigned,
  allIpAddresses = [],
  allStockItems = []
}) {
  const [selectedParts, setSelectedParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ipAddress, setIpAddress] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [ipAddresses, setIpAddresses] = useState([]);
  const [showIpDropdown, setShowIpDropdown] = useState(false);


  useEffect(() => {
    if (isOpen) {
      setSelectedParts([]);
      setSearchTerm('');
      setIpAddress('');
      setShowQRCode(false);
      setQrCodeUrl('');
      setShowDropdown(false);
      setIpAddresses([]);
      setShowIpDropdown(false);
    }
  }, [isOpen]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
      if (showIpDropdown && !event.target.closest('.ip-dropdown-container')) {
        setShowIpDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showIpDropdown]);



  const getAllIpAddressesWithParts = () => {
    const ipMap = new Map();
    allStockItems.forEach(item => {
      if (item.ip_addresses && Array.isArray(item.ip_addresses)) {
        item.ip_addresses.forEach(ip => {
          if (!ipMap.has(ip)) {
            ipMap.set(ip, []);
          }
          ipMap.get(ip).push(item.description || item.code || 'Unknown Part');
        });
      }
    });
    return Array.from(ipMap.entries()).map(([ip, parts]) => ({
      ip_address: ip,
      parts: parts
    }));
  };

  const fetchIpAddresses = (searchTerm) => {
    const allIpsWithParts = getAllIpAddressesWithParts();
    
    if (!searchTerm || searchTerm.length < 2) {
      setIpAddresses(allIpsWithParts);
      setShowIpDropdown(allIpsWithParts.length > 0);
      return;
    }

    const filtered = allIpsWithParts.filter(ip => 
      ip.ip_address?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setIpAddresses(filtered);
    setShowIpDropdown(true);
  };

  const handleIpAddressChange = (value) => {
    setIpAddress(value);
    fetchIpAddresses(value);
  };

  const selectIpAddress = (ip) => {
    setIpAddress(ip.ip_address);
    setShowIpDropdown(false);
  };

  const filteredStockItems = allStockItems.filter(item => {
    const matchesSearch = 
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Only show items with available stock
    const hasStock = parseInt(item.quantity || '0') > 0;
    
    return matchesSearch && hasStock;
  });

  const addPart = (item) => {
    const existingPart = selectedParts.find(part => part.stock_id === item.id);
    
    if (existingPart) {
      // Increase quantity if already selected
      setSelectedParts(prev => prev.map(part => 
        part.stock_id === item.id 
          ? { ...part, quantity: part.quantity + 1 }
          : part
      ));
    } else {
      // Add new part
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
    
    // Clear search and hide dropdown
    setSearchTerm('');
    setShowDropdown(false);
    
    // Update IP address suggestions based on selected parts
    fetchIpAddresses(ipAddress);
  };

  const removePart = (stockId) => {
    setSelectedParts(prev => prev.filter(part => part.stock_id !== stockId));
  };

  const updatePartQuantity = (stockId, newQuantity) => {
    const quantity = Math.max(0, parseInt(newQuantity) || 0);
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
    if (!ipAddress.trim()) {
      toast.error('Please enter an IP address');
      return;
    }

    if (selectedParts.length === 0) {
      toast.error('Please select at least one part');
      return;
    }

    // Validate quantities
    for (const part of selectedParts) {
      if (part.quantity > part.available_stock) {
        toast.error(`Insufficient stock for ${part.description}. Available: ${part.available_stock}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      console.log('Submitting parts assignment:', {
        jobId: jobCard.id,
        parts: selectedParts,
        ipAddress: ipAddress.trim()
      });
      
      const response = await fetch(`/api/job-cards/${jobCard.id}/assign-parts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parts: selectedParts,
          ipAddress: ipAddress.trim()
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Response error:', errorData);
        throw new Error(errorData.error || 'Failed to assign parts');
      }

      const result = await response.json();
      console.log('Assignment result:', result);
      
      // Store QR code from response
      if (result.qr_code) {
        console.log('QR code received:', result.qr_code);
        setQrCodeUrl(result.qr_code);
        setShowQRCode(true);
      } else {
        console.warn('No QR code in response - database fields may not exist');
        // Still show success but without QR code
        toast.success('Parts assigned successfully!');
        toast.info('Job will appear in the "Assigned Parts" section.');
        toast.warning('QR code generation requires database fields to be added. Please contact administrator.');
        
        // Call callback to refresh job cards
        if (onPartsAssigned) {
          onPartsAssigned();
        }
        onClose();
        return;
      }
      
      toast.success('Parts assigned successfully!');
      toast.info('Job will appear in the "Assigned Parts" section.');
      
      // Call callback to refresh job cards
      if (onPartsAssigned) {
        onPartsAssigned();
      }
    } catch (error) {
      console.error('Error assigning parts:', error);
      toast.error(error.message || 'Failed to assign parts');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Job QR Code - ${jobCard.job_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .qr-container { max-width: 800px; margin: 0 auto; }
            .job-info { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            .job-info h2 { color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            .job-info p { margin: 5px 0; }
            .qr-code { text-align: center; margin: 20px 0; }
            .qr-code img { border: 2px solid #333; border-radius: 8px; }
            .job-details { margin-top: 20px; }
            .section { margin-bottom: 20px; padding: 15px; background: #fff; border: 1px solid #ddd; border-radius: 8px; }
            .section h3 { color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
            .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .section-grid p { margin: 5px 0; }
            .part-item { padding: 10px; background: #f8f9fa; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid #3498db; }
            .part-header { font-weight: bold; margin-bottom: 10px; color: #2c3e50; }
            .total-section { margin-top: 20px; padding-top: 15px; border-top: 2px solid #333; background: #e8f4fd; padding: 15px; border-radius: 5px; }
            .vehicle-info { background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #27ae60; }
            .customer-info { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #f39c12; }
            .quotation-info { background: #f8d7da; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545; }
            @media print {
              body { margin: 10px; }
              .qr-code img { max-width: 250px; }
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="job-info">
              <h2>Job QR Code - ${jobCard.job_number}</h2>
              <div class="section-grid">
                <div>
                  <p><strong>Job Number:</strong> ${jobCard.job_number}</p>
                  <p><strong>Quotation Number:</strong> ${jobCard.quotation_number || 'N/A'}</p>
                  <p><strong>Job Type:</strong> ${jobCard.job_type || 'Not specified'}</p>
                  <p><strong>Status:</strong> ${jobCard.status || 'N/A'}</p>
                  <p><strong>Priority:</strong> ${jobCard.priority || 'N/A'}</p>
                  <p><strong>IP Address:</strong> ${ipAddress}</p>
                  <p><strong>Assigned Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <p><strong>Created:</strong> ${jobCard.created_at ? new Date(jobCard.created_at).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Updated:</strong> ${jobCard.updated_at ? new Date(jobCard.updated_at).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Job Location:</strong> ${jobCard.job_location || 'N/A'}</p>
                  <p><strong>Estimated Duration:</strong> ${jobCard.estimated_duration_hours || 'N/A'} hours</p>
                  <p><strong>Estimated Cost:</strong> ${jobCard.estimated_cost ? `R${jobCard.estimated_cost}` : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div class="qr-code">
              <img src="${qrCodeUrl}" alt="Job QR Code" />
              <p style="margin-top: 10px; color: #666; font-size: 12px;">
                Scan this QR code to access complete job information
              </p>
            </div>

            <div class="customer-info">
              <h3>Customer Information</h3>
              <div class="section-grid">
                <div>
                  <p><strong>Customer Name:</strong> ${jobCard.customer_name || 'N/A'}</p>
                  <p><strong>Email:</strong> ${jobCard.customer_email || 'N/A'}</p>
                  <p><strong>Phone:</strong> ${jobCard.customer_phone || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Address:</strong> ${jobCard.customer_address || 'N/A'}</p>
                  <p><strong>Site Contact:</strong> ${jobCard.site_contact_person || 'N/A'}</p>
                  <p><strong>Contact Phone:</strong> ${jobCard.site_contact_phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div class="vehicle-info">
              <h3>Vehicle Information</h3>
              <div class="section-grid">
                <div>
                  <p><strong>Registration:</strong> ${jobCard.vehicle_registration || 'Not provided'}</p>
                  <p><strong>Make & Model:</strong> ${jobCard.vehicle_make && jobCard.vehicle_model ? `${jobCard.vehicle_make} ${jobCard.vehicle_model}` : (jobCard.vehicle_make || jobCard.vehicle_model || 'Not provided')}</p>
                  <p><strong>Year:</strong> ${jobCard.vehicle_year || 'Not provided'}</p>
                </div>
                <div>
                  <p><strong>VIN Number:</strong> ${jobCard.vin_numer || 'Not provided'}</p>
                  <p><strong>Odometer:</strong> ${jobCard.odormeter || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div class="quotation-info">
              <h3>Quotation Details</h3>
              <div class="section-grid">
                <div>
                  <p><strong>Quote Status:</strong> ${jobCard.quote_status || 'N/A'}</p>
                  <p><strong>Quote Date:</strong> ${jobCard.quote_date ? new Date(jobCard.quote_date).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Quote Expiry:</strong> ${jobCard.quote_expiry_date ? new Date(jobCard.quote_expiry_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Total Amount:</strong> ${jobCard.quotation_total_amount ? `R${jobCard.quotation_total_amount}` : 'N/A'}</p>
                  <p><strong>Products:</strong> ${jobCard.quotation_products?.length || 0} items</p>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Job Description</h3>
              <p>${jobCard.job_description || 'No description provided'}</p>
            </div>

            ${jobCard.special_instructions ? `
            <div class="section">
              <h3>Special Instructions</h3>
              <p>${jobCard.special_instructions}</p>
            </div>
            ` : ''}

            ${jobCard.access_requirements ? `
            <div class="section">
              <h3>Access Requirements</h3>
              <p>${jobCard.access_requirements}</p>
            </div>
            ` : ''}

            <div class="section">
              <h3>Assigned Parts</h3>
              <div class="part-list">
                ${selectedParts.map(part => `
                  <div class="part-item">
                    <strong>${part.description}</strong> (${part.code})<br>
                    Quantity: ${part.quantity} | Supplier: ${part.supplier || 'N/A'}<br>
                    Cost: R${part.cost_per_unit?.toFixed(2) || '0.00'} each | Total: R${part.total_cost || '0.00'}
                  </div>
                `).join('')}
              </div>
              <div class="total-section">
                <p><strong>Total Parts:</strong> ${selectedParts.length}</p>
                <p><strong>Total Cost:</strong> R${selectedParts.reduce((sum, part) => sum + (parseFloat(part.total_cost) || 0), 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Function to generate comprehensive QR code data for existing jobs
  const generateComprehensiveQRData = (job) => {
    return {
      // Basic job information
      job_number: job.job_number,
      quotation_number: job.quotation_number,
      job_type: job.job_type,
      job_description: job.job_description,
      status: job.status,
      priority: job.priority,
      
      // Customer information
      customer_name: job.customer_name,
      customer_email: job.customer_email,
      customer_phone: job.customer_phone,
      customer_address: job.customer_address,
      
      // Vehicle information
      vehicle_registration: job.vehicle_registration,
      vehicle_make: job.vehicle_make,
      vehicle_model: job.vehicle_model,
      vehicle_year: job.vehicle_year,
      vin_numer: job.vin_numer,
      odormeter: job.odormeter,
      
      // Quotation details
      quotation_total_amount: job.quotation_total_amount,
      quotation_products: job.quotation_products,
      quote_status: job.quote_status,
      quote_date: job.quote_date,
      quote_expiry_date: job.quote_expiry_date,
      
      // Job location and timing
      job_location: job.job_location,
      latitude: job.latitude,
      longitude: job.longitude,
      created_at: job.created_at,
      updated_at: job.updated_at,
      
      // Parts information (if available)
      parts_required: job.parts_required,
      total_parts: job.parts_required?.length || 0,
      
      // Additional job details
      special_instructions: job.special_instructions,
      access_requirements: job.access_requirements,
      site_contact_person: job.site_contact_person,
      site_contact_phone: job.site_contact_phone,
      estimated_duration_hours: job.estimated_duration_hours,
      estimated_cost: job.estimated_cost,
      
      // Metadata
      job_id: job.id,
      account_id: job.account_id,
      created_by: job.created_by,
      updated_by: job.updated_by
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Assign Parts to Job #{jobCard?.job_number}
          </DialogTitle>
        </DialogHeader>

        {!showQRCode ? (
          <div className="space-y-6">
            {/* IP Address Input with Autocomplete */}
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                IP Address *
              </label>
              <div className="relative ip-dropdown-container">
                <Input
                  type="text"
                  placeholder="Enter IP address (e.g., 192.168.1.100)"
                  value={ipAddress}
                  onChange={(e) => handleIpAddressChange(e.target.value)}
                  onFocus={() => fetchIpAddresses(ipAddress)}
                  className="w-full"
                />
                {showIpDropdown && (
                  <div className="z-50 absolute bg-white shadow-lg mt-1 border border-gray-200 rounded-lg w-full h-80vh overflow-y-auto">
                    {ipAddresses.length === 0 ? (
                      <div className="p-3 text-gray-500 text-sm">
                        No matching IP addresses found
                      </div>
                    ) : (
                      ipAddresses.map((ip, index) => (
                        <div
                          key={index}
                          className="hover:bg-gray-50 p-3 border-gray-100 border-b last:border-b-0 cursor-pointer"
                          onClick={() => selectIpAddress(ip)}
                        >
                          <div className="font-medium text-gray-900">{ip.ip_address}</div>
                          <div className="text-gray-500 text-sm">
                            ({ip.parts?.join(', ') || 'No parts assigned'})
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Stock Search with Dropdown */}
            <div>
              <label className="block mb-2 font-medium text-gray-700 text-sm">
                Search and Select Stock Items
              </label>
              <div className="relative dropdown-container">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                <Input
                  type="text"
                  placeholder="Type to search stock items..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowDropdown(searchTerm.length > 0)}
                  className="pl-10"
                />
                {showDropdown && (
                  <div className="z-50 absolute bg-white shadow-lg mt-1 border border-gray-200 rounded-lg w-full max-h-60 overflow-y-auto">
                    {filteredStockItems.length === 0 ? (
                      <div className="p-3 text-gray-500 text-sm">
                        No stock items found matching "{searchTerm}"
                      </div>
                    ) : (
                      filteredStockItems.map((item) => (
                        <div
                          key={item.id}
                          className="hover:bg-gray-50 p-3 border-gray-100 border-b last:border-b-0 cursor-pointer"
                          onClick={() => addPart(item)}
                        >
                                                  <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{String(item.description || '')}</div>
                            <div className="text-gray-500 text-sm">{String(item.code || '')}</div>
                            <div className="text-gray-400 text-xs">{String(item.supplier || '')}</div>
                            {item.cost_excl_vat_zar && (
                              <div className="font-medium text-green-600 text-xs">
                                R{parseFloat(item.cost_excl_vat_zar).toFixed(2)} each
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              Stock: {parseInt(item.quantity || '0')}
                            </Badge>
                            {item.stock_type && (
                              <div className="mt-1 text-gray-400 text-xs">
                                {String(item.stock_type)}
                              </div>
                            )}
                          </div>
                        </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Parts */}
            {selectedParts.length > 0 && (
              <div>
                <h3 className="mb-3 font-medium text-gray-700 text-sm">Selected Parts</h3>
                <div className="space-y-2">
                  {selectedParts.map((part) => (
                    <div key={part.stock_id} className="flex justify-between items-center bg-gray-50 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{String(part.description || '')}</div>
                        <div className="text-gray-500 text-sm">{String(part.code || '')}</div>
                        {part.cost_per_unit > 0 && (
                          <div className="text-green-600 text-xs">
                            R{part.cost_per_unit.toFixed(2)} each
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max={part.available_stock}
                          value={part.quantity}
                          onChange={(e) => updatePartQuantity(part.stock_id, e.target.value)}
                          className="w-20 h-8 text-sm text-center"
                        />
                        <span className="text-gray-500 text-sm">/ {part.available_stock}</span>
                        {part.cost_per_unit > 0 && (
                          <span className="font-medium text-green-600 text-xs">
                            R{String(part.total_cost || '0.00')}
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePart(part.stock_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={submitting || selectedParts.length === 0 || !ipAddress.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Assigning...' : 'Assign Parts'}
              </Button>
            </div>
          </div>
        ) : (
          /* QR Code Display */
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 w-12 h-12 text-green-600" />
              <h3 className="mb-2 font-semibold text-gray-900 text-lg">Parts Assigned Successfully!</h3>
              <p className="text-gray-600">QR code has been generated and stored for this job.</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <h4 className="mb-4 font-medium text-gray-900">Job QR Code</h4>
                  <div className="mb-4">
                    <img 
                      src={qrCodeUrl} 
                      alt="Job QR Code" 
                      className="mx-auto border rounded-lg"
                      style={{ maxWidth: '200px' }}
                    />
                  </div>
                  <p className="mb-4 text-gray-500 text-xs">
                    Scan this QR code to access complete job information
                  </p>
                  
                  {/* Job Summary */}
                  <div className="gap-4 grid grid-cols-1 md:grid-cols-2 mb-4 text-left">
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-900 text-sm">Job Details</h5>
                      <div className="space-y-1 text-gray-600 text-xs">
                        <p><strong>Job:</strong> {jobCard.job_number}</p>
                        <p><strong>Type:</strong> {jobCard.job_type || 'N/A'}</p>
                        <p><strong>Status:</strong> {jobCard.status || 'N/A'}</p>
                        <p><strong>Priority:</strong> {jobCard.priority || 'N/A'}</p>
                        <p><strong>IP Address:</strong> {ipAddress}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-900 text-sm">Customer & Vehicle</h5>
                      <div className="space-y-1 text-gray-600 text-xs">
                        <p><strong>Customer:</strong> {jobCard.customer_name}</p>
                        <p><strong>Vehicle:</strong> {jobCard.vehicle_registration || 'N/A'}</p>
                        <p><strong>Make/Model:</strong> {jobCard.vehicle_make && jobCard.vehicle_model ? `${jobCard.vehicle_make} ${jobCard.vehicle_model}` : 'N/A'}</p>
                        <p><strong>Parts Assigned:</strong> {selectedParts.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  {(jobCard.vehicle_registration || jobCard.vehicle_make || jobCard.vehicle_model) && (
                    <div className="bg-green-50 mb-4 p-3 border border-green-200 rounded-lg">
                      <h5 className="mb-2 font-medium text-green-900 text-sm">Vehicle Information</h5>
                      <div className="gap-2 grid grid-cols-2 text-xs">
                        <div><strong>Registration:</strong> {jobCard.vehicle_registration || 'N/A'}</div>
                        <div><strong>Make:</strong> {jobCard.vehicle_make || 'N/A'}</div>
                        <div><strong>Model:</strong> {jobCard.vehicle_model || 'N/A'}</div>
                        <div><strong>Year:</strong> {jobCard.vehicle_year || 'N/A'}</div>
                        <div><strong>VIN:</strong> {jobCard.vin_numer || 'N/A'}</div>
                        <div><strong>Odometer:</strong> {jobCard.odormeter || 'N/A'}</div>
                      </div>
                    </div>
                  )}

                  {/* Quotation Information */}
                  {jobCard.quotation_total_amount && (
                    <div className="bg-blue-50 mb-4 p-3 border border-blue-200 rounded-lg">
                      <h5 className="mb-2 font-medium text-blue-900 text-sm">Quotation Details</h5>
                      <div className="gap-2 grid grid-cols-2 text-xs">
                        <div><strong>Total Amount:</strong> R{jobCard.quotation_total_amount}</div>
                        <div><strong>Products:</strong> {jobCard.quotation_products?.length || 0} items</div>
                        <div><strong>Quote Status:</strong> {jobCard.quote_status || 'N/A'}</div>
                        <div><strong>Quote Number:</strong> {jobCard.quotation_number || 'N/A'}</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button 
                      onClick={handlePrintQR}
                      className="bg-blue-600 hover:bg-blue-700 w-full"
                    >
                      <Printer className="mr-2 w-4 h-4" />
                      Print Complete Job Details
                    </Button>
                    <p className="text-gray-500 text-xs">
                      Print comprehensive job information including all details
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 