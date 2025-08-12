"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface InventoryPart {
    id: string;
  product: string;
  count: number;
  product_code?: string;
  company?: string;
  soltrack?: string;
  isLowStock?: boolean;
  stockStatus?: 'available' | 'low' | 'out';
}

interface AssignedPart {
    product: string;
  quantity: number;
  currentCount: number;
}

interface PartsSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

// Common parts mapping for different job types
const getRequiredPartsForJob = (job: any): string[] => {
  if (!job) return [];
  
  // If job has specific products, use those
  if (job.quote_products && job.quote_products.length > 0) {
    return job.quote_products.map((product: any) => product.product_name);
  }
  
  // Fallback mapping based on job type
  const jobType = job.job_type?.toLowerCase();
  
  switch (jobType) {
    case 'installation':
    case 'install':
      return [
        'Skylink Pro',
        'Sky GPS',
        'Sky-Safety',
        'Sky-Can',
        'Driver ID Keypad',
        'Starter Cut Relay'
      ];
    case 'deinstall':
    case 'de-installation':
      return [
        'Skylink Pro',
        'Sky GPS',
        'Sky-Safety',
        'Sky-Can',
        'Driver ID Keypad',
        'Starter Cut Relay'
      ];
    case 'maintenance':
      return [
        'Sky GPS',
        'Sky-Safety',
        'Sky-Can'
      ];
    case 'repair':
      return [
        'Skylink Pro',
        'Sky GPS',
        'Sky-Safety'
      ];
    default:
      return [];
  }
};

export function PartsSelectionDialog({ isOpen, onClose, job }: PartsSelectionDialogProps) {
  const [availableParts, setAvailableParts] = useState<InventoryPart[]>([]);
  const [selectedParts, setSelectedParts] = useState<AssignedPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'customer' | 'soltrack' | null>(null);
  const [currentSource, setCurrentSource] = useState<string>('');
  const [customerStockExists, setCustomerStockExists] = useState(false);
  const { toast } = useToast();
  
  // Cache for loaded parts
  const [cachedParts, setCachedParts] = useState<{
    customer: InventoryPart[];
    soltrack: InventoryPart[];
  }>({ customer: [], soltrack: [] });

  useEffect(() => {
    if (isOpen && job) {
      setSelectedParts([]);
      setSource(null);
      setCurrentSource('');
      // Clear cache for new jobs to ensure fresh data
      setCachedParts({ customer: [], soltrack: [] });
      checkCustomerStock();
    }
  }, [isOpen, job]);

  // Debug effect to track state changes
  useEffect(() => {
    console.log('State changed:', {
      availableParts: availableParts.length,
      selectedParts: selectedParts.length,
      source,
      currentSource,
      loading,
      cachedCustomer: cachedParts.customer.length,
      cachedSoltrack: cachedParts.soltrack.length
    });
  }, [availableParts, selectedParts, source, currentSource, loading, cachedParts]);

  const checkCustomerStock = async () => {
    try {
      const response = await fetch('/api/inventory/available-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType: job.job_type,
          customerName: job.customer_name,
          source: 'customer'
        })
      });

      const data = await response.json();
      setCustomerStockExists(data.success && data.availableParts.length > 0);
    } catch (error) {
      console.error('Error checking customer stock:', error);
      setCustomerStockExists(false);
    }
  };

  const fetchAvailableParts = async (selectedSource: 'customer' | 'soltrack') => {
    try {
      setLoading(true);
      console.log(`Fetching ${selectedSource} stock for job:`, job);
      
      // Check if we have cached data
      const cachedData = cachedParts[selectedSource];
      if (cachedData.length > 0) {
        console.log(`Using cached ${selectedSource} data:`, cachedData.length, 'items');
        setAvailableParts(cachedData);
        setCurrentSource(selectedSource);
        setSource(selectedSource);
        autoSelectRequiredParts(cachedData);
        setLoading(false);
        return;
      }
      
      // Fetch from API if not cached
      const response = await fetch('/api/inventory/available-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType: job.job_type,
          customerName: job.customer_name,
          source: selectedSource
        })
      });

      const data = await response.json();
      console.log(`API response for ${selectedSource}:`, data);
      
      if (data.success) {
        // Cache the data
        setCachedParts(prev => ({
          ...prev,
          [selectedSource]: data.availableParts
        }));
        
        setAvailableParts(data.availableParts);
        setCurrentSource(selectedSource);
        setSource(selectedSource);
        
        console.log(`Setting ${data.availableParts.length} available parts`);
        console.log(`Source: ${data.source}, SelectedSource: ${selectedSource}`);
        
        // Automatically select required parts
        autoSelectRequiredParts(data.availableParts);
      } else {
        console.error(`API error for ${selectedSource}:`, data.error);
        toast({
          title: 'Failed to fetch available parts',
          description: data.error || 'Failed to fetch available parts',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching available parts:', error);
      toast({
        title: 'Failed to fetch available parts',
        description: 'Failed to fetch available parts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const autoSelectRequiredParts = (parts: InventoryPart[]) => {
    console.log('Auto-selecting parts:', parts.length);
    console.log('Job quote products:', job.quote_products);
    
    // Only select items that match the job's products
    const autoSelected: AssignedPart[] = [];
    
    if (!job.quote_products || job.quote_products.length === 0) {
      console.log('No quote products found, skipping auto-selection');
      setSelectedParts([]);
      return;
    }
    
    parts.forEach(part => {
      if (part.count > 0) {
        // Check if this part matches any of the job's quote products
        const jobProduct = job.quote_products?.find((p: any) => 
          p.product_name.toLowerCase().includes(part.product.toLowerCase()) ||
          part.product.toLowerCase().includes(p.product_name.toLowerCase())
        );
        
        // Only select if it matches a job product
        if (jobProduct) {
          const quantity = jobProduct.quantity || 1;
          
          autoSelected.push({
            product: part.product,
            quantity: Math.min(quantity, part.count),
            currentCount: part.count
          });
          
          console.log(`Auto-selected: ${part.product} (quantity: ${Math.min(quantity, part.count)})`);
        }
      }
    });
    
    console.log('Auto-selected parts:', autoSelected.length);
    setSelectedParts(autoSelected);
    
    if (autoSelected.length > 0) {
      const sourceType = source === 'soltrack' ? 'soltrack' : 'customer';
      toast({
        title: `Auto-selected ${autoSelected.length} items that match job products`,
        description: `Auto-selected ${autoSelected.length} items that match job products`,
      });
    } else {
      toast({
        title: 'No matching items found for this job',
        description: 'No matching items found for this job',
      });
    }
  };

  const handlePartSelection = (part: InventoryPart, quantity: number) => {
    if (quantity <= 0 || quantity > part.count) {
      toast({
        title: 'Invalid quantity',
        description: `Invalid quantity. Available: ${part.count}`,
        variant: 'destructive',
      });
      return;
    }

    setSelectedParts(prev => {
      const existing = prev.find(p => p.product === part.product);
      if (existing) {
        return prev.map(p => 
          p.product === part.product 
            ? { ...p, quantity: quantity }
            : p
        );
      } else {
        return [...prev, {
          product: part.product,
          quantity: quantity,
          currentCount: part.count
        }];
      }
    });
  };

  const handleRemovePart = (productName: string) => {
    setSelectedParts(prev => prev.filter(p => p.product !== productName));
  };

  const handleAssignParts = async () => {
    console.log('Assign button clicked!');
    console.log('Selected parts:', selectedParts);
    console.log('Job:', job);
    console.log('Source:', source);
    
    if (selectedParts.length === 0) {
      console.log('No parts selected, showing error');
      toast({
        title: 'Please select at least one part',
        description: 'Please select at least one part',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Starting assignment process...');
      setLoading(true);
      console.log('Job object:', job);
      console.log('Job ID:', job.id);
      console.log('Job ID type:', typeof job.id);
      console.log('Job quote_products:', job.quote_products);
      console.log('Job jobs:', job.jobs);
      console.log('Job keys:', Object.keys(job));
      console.log('Job stringified:', JSON.stringify(job, null, 2));
      
      // We need to use a quote_products ID, not the cust_quotes ID
      // For now, let's use the first quote_product ID if available
      let quoteProductId = job.id; // fallback to job.id
      
      if (job.quote_products && job.quote_products.length > 0) {
        quoteProductId = job.quote_products[0].id;
        console.log('Using first quote_product ID:', quoteProductId);
      } else if (job.jobs && job.jobs.length > 0) {
        quoteProductId = job.jobs[0].id;
        console.log('Using first job ID:', quoteProductId);
      } else {
        console.log('No quote_products or jobs found, using job.id as fallback');
      }
      
      const requestData = {
        quoteProductId: quoteProductId,
        assignedParts: selectedParts,
        jobType: job.job_type,
        customerName: job.customer_name,
        source
      };
      
      console.log('Sending request with data:', requestData);
      
      const response = await fetch('/api/inventory/assign-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      console.log('Response received:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      console.log('Response data keys:', Object.keys(data));
      
      if (data.availableQuoteProductIds) {
        console.log('Available quote product IDs:', data.availableQuoteProductIds);
      }
      
      if (data.success) {
        console.log('Assignment successful!');
        toast({
          title: `✅ Successfully assigned ${selectedParts.length} part${selectedParts.length > 1 ? 's' : ''} to job`,
          description: `Updated inventory and job status for ${job.customer_name}`,
        });
        onClose();
      } else {
        console.error('Assignment failed:', data.error);
        
        // If the API tells us we used the wrong ID, retry with the correct one
        if (data.availableQuoteProductIds && data.availableQuoteProductIds.length > 0) {
          console.log('Retrying with correct quote_product ID:', data.availableQuoteProductIds[0].id);
          
          toast({
            title: '🔄 Retrying with correct job ID...',
            description: 'Found the correct job reference, retrying assignment',
          });
          
          // Retry with the first available quote_product ID
          const retryData = {
            quoteProductId: data.availableQuoteProductIds[0].id,
            assignedParts: selectedParts,
            jobType: job.job_type,
            customerName: job.customer_name,
            source
          };
          
          console.log('Retrying with data:', retryData);
          
          try {
            const retryResponse = await fetch('/api/inventory/assign-parts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(retryData)
            });
            
            const retryResult = await retryResponse.json();
            console.log('Retry response:', retryResult);
            
            if (retryResult.success) {
              console.log('Assignment successful on retry!');
              toast({
                title: `✅ Successfully assigned ${selectedParts.length} part${selectedParts.length > 1 ? 's' : ''} to job`,
                description: `Updated inventory and job status for ${job.customer_name}`,
              });
              onClose();
            } else {
              console.error('Assignment failed on retry:', retryResult.error);
              toast({
                title: '❌ Failed to assign parts',
                description: retryResult.error || 'An error occurred during assignment',
                variant: 'destructive',
              });
            }
          } catch (retryError) {
            console.error('Error on retry:', retryError);
            toast({
              title: '❌ Failed to assign parts on retry',
              description: 'Network error occurred during retry',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: '❌ Failed to assign parts',
            description: data.error || 'An error occurred during assignment',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error assigning parts:', error);
      toast({
        title: '❌ Failed to assign parts',
        description: 'An unexpected error occurred during assignment',
        variant: 'destructive',
      });
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const getStockStatusBadge = (part: InventoryPart) => {
    if (part.count === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (part.isLowStock) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else {
      return <Badge variant="default">Available</Badge>;
    }
  };

  const isPartSelected = (part: InventoryPart) => {
    return selectedParts.some(p => p.product === part.product);
  };

  const getSelectedQuantity = (part: InventoryPart) => {
    const selected = selectedParts.find(p => p.product === part.product);
    return selected?.quantity || 0;
    };

    return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-gray-50 to-white">
        <DialogHeader className="pb-4 border-gray-200 border-b">
          <DialogTitle className="flex items-center gap-2 font-bold text-gray-900 text-2xl">
            <div className="bg-blue-600 rounded-full w-2 h-8"></div>
            Assign Parts - {job?.customer_name}
            <Badge variant="outline" className="ml-2">
              {job?.job_type}
            </Badge>
          </DialogTitle>
          <p className="mt-1 text-gray-600">Select parts from available inventory</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Selection Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={() => fetchAvailableParts('customer')}
              variant={source === 'customer' ? 'default' : 'outline'}
              disabled={loading || !customerStockExists}
              className={`flex-1 h-12 text-lg font-medium transition-all duration-200 ${
                source === 'customer' 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-lg' 
                  : 'hover:bg-blue-50 border-blue-200'
              } ${!customerStockExists ? 'opacity-50 bg-gray-100' : ''}`}
            >
              <div className="flex flex-col items-center">
                <span className="font-semibold">Customer Stock</span>
                <span className="opacity-75 text-xs">Company Items</span>
                {!customerStockExists && <span className="mt-1 text-red-500 text-xs">(No stock available)</span>}
              </div>
            </Button>
            <Button
              onClick={() => fetchAvailableParts('soltrack')}
              variant={source === 'soltrack' ? 'default' : 'outline'}
              disabled={loading}
              className={`flex-1 h-12 text-lg font-medium transition-all duration-200 ${
                source === 'soltrack' 
                  ? 'bg-green-600 hover:bg-green-700 shadow-lg' 
                  : 'hover:bg-green-50 border-green-200'
              }`}
            >
              <div className="flex flex-col items-center">
                <span className="font-semibold">Soltrack Stock</span>
                <span className="opacity-75 text-xs">Soltrack Items</span>
              </div>
            </Button>
          </div>

          {/* Selected Parts with Action Buttons */}
          {selectedParts.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 text-xl">
                  <span>Selected Parts</span>
                  <Badge variant="default" className="bg-blue-600">
                    {selectedParts.length}
                  </Badge>
                </h3>
                <div className="flex space-x-3">
                  <Button 
                    onClick={onClose} 
                    variant="outline"
                    size="sm"
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignParts}
                    disabled={loading || selectedParts.length === 0}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 shadow-lg px-4 py-2"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="border-white border-b-2 rounded-full w-4 h-4 animate-spin"></div>
                        Assigning...
                      </div>
                    ) : (
                      `Assign ${selectedParts.length} Parts`
                    )}
                  </Button>
                </div>
              </div>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {selectedParts.map((part) => (
                  <div key={part.product} className="bg-gradient-to-r from-blue-50 to-blue-100 shadow-sm p-4 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">{part.product}</h4>
                        <p className="font-medium text-blue-600 text-sm">
                          Quantity: {part.quantity}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleRemovePart(part.product)}
                        variant="outline"
                        size="sm"
                        className="hover:bg-red-50 text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 text-sm">
                      <span>Available: {part.currentCount}</span>
                      <Badge variant="outline" className="bg-white">
                        Selected
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Parts */}
          {source && (
            <div className="space-y-4">
                        <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 text-xl">
                  Available Parts ({availableParts.length})
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    Source: {currentSource === 'soltrack' ? 'Soltrack Stock' : currentSource === 'customer' ? 'Customer Stock' : currentSource}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {job?.customer_name}
                  </Badge>
                </div>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
                  <span className="ml-3 text-gray-600">Loading available parts...</span>
                </div>
              ) : availableParts.length > 0 ? (
                <div className="space-y-3">
                  {availableParts.map((part) => (
                    <div
                      key={part.id}
                      className={`p-4 border rounded-lg shadow-sm transition-all duration-200 hover:shadow-md ${
                        part.count === 0 
                          ? 'bg-gray-100 opacity-60 border-gray-200' 
                          : isPartSelected(part)
                          ? 'bg-blue-50 border-blue-300 shadow-md'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-4">
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between sm:justify-start items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-lg truncate">{part.product}</h4>
                              <p className="text-gray-600 text-sm">
                                Code: {part.product_code || 'N/A'}
                              </p>
                              <p className="mt-1 text-gray-500 text-xs">
                                {source === 'customer' ? 'Customer Stock' : 'Soltrack Stock'}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              {getStockStatusBadge(part)}
                            </div>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex sm:flex-row flex-col items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`quantity-${part.id}`} className="font-medium text-gray-700 text-sm whitespace-nowrap">
                              Quantity:
                            </Label>
                            <span className="text-gray-500 text-sm whitespace-nowrap">
                              {part.count} available
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Input
                              id={`quantity-${part.id}`}
                              type="number"
                              min="0"
                              max={part.count}
                              value={getSelectedQuantity(part)}
                              className="w-20 h-10 font-medium text-center"
                              onChange={(e) => {
                                const quantity = parseInt(e.target.value) || 0;
                                handlePartSelection(part, quantity);
                              }}
                              disabled={part.count === 0}
                            />
                            {isPartSelected(part) && (
                              <Badge variant="default" className="bg-blue-600 text-white">
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="flex justify-center items-center bg-gray-100 mx-auto mb-4 rounded-full w-16 h-16">
                    <span className="text-2xl">📦</span>
                  </div>
                  <p className="text-gray-500 text-lg">No parts available from this source.</p>
                  <p className="mt-2 text-gray-400 text-sm">
                    {source === 'customer' 
                      ? `No inventory found for ${job?.customer_name}` 
                      : 'No soltrack inventory available'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}