'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface IPAddress {
  value: string;
  isValid: boolean;
}

interface StockItem {
  id: number;
  description?: string;
  code?: string;
  supplier?: string;
  serial_number?: string;
  ip_addresses?: string[] | Record<string, string>;
}

interface AssignIPAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem;
  onAssigned: (itemId: number, ipAddresses: string[]) => void;
}

export default function AssignIPAddressModal({ isOpen, onClose, item, onAssigned }: AssignIPAddressModalProps) {
  const [ipAddresses, setIPAddresses] = useState<IPAddress[]>([]);
  const [serialNumber, setSerialNumber] = useState<string>('');
  
  // Initialize IP addresses and serial number from the item when the modal opens
  useEffect(() => {
    if (item && item.ip_addresses) {
      try {
        // Handle both array and object formats of IP addresses
        const addresses = Array.isArray(item.ip_addresses) 
          ? item.ip_addresses 
          : Object.values(item.ip_addresses);
        
        setIPAddresses(addresses.map(ip => ({ value: ip, isValid: validateIPAddress(ip) })));
      } catch (error) {
        console.error('Error parsing IP addresses:', error);
        setIPAddresses([]);
      }
    } else {
      setIPAddresses([]);
    }
    
    setSerialNumber(item?.serial_number || '');
  }, [item]);

  const validateIPAddress = (ip: string): boolean => {
    // Basic IPv4 validation regex
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    
    if (!ipv4Pattern.test(ip)) return false;
    
    const parts = ip.split('.').map((part: string) => parseInt(part, 10));
    return parts.every((part: number) => part >= 0 && part <= 255);
  };

  const handleAddIP = (): void => {
    setIPAddresses([...ipAddresses, { value: '', isValid: false }]);
  };

  const handleRemoveIP = (index: number): void => {
    const newIPs = [...ipAddresses];
    newIPs.splice(index, 1);
    setIPAddresses(newIPs);
  };

  const handleIPChange = (index: number, value: string): void => {
    const newIPs = [...ipAddresses];
    const isValid = validateIPAddress(value);
    newIPs[index] = { value, isValid };
    setIPAddresses(newIPs);
  };

  const handleSave = async () => {
    // Filter out empty IP addresses
    const validIPs = ipAddresses
      .filter(ip => ip.value.trim() !== '')
      .map(ip => ip.value.trim());
    
    // Check if all IPs are valid
    const hasInvalidIP = ipAddresses.some(ip => ip.value.trim() !== '' && !ip.isValid);
    
    if (hasInvalidIP) {
      toast.error('Please fix invalid IP addresses before saving');
      return;
    }

    try {
      // Update serial number if changed
      if (serialNumber !== item?.serial_number) {
        const serialResponse = await fetch('/api/stock', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: item.id,
            serial_number: serialNumber
          }),
        });

        if (!serialResponse.ok) {
          throw new Error('Failed to update serial number');
        }
      }

      const response = await fetch('/api/stock/stock-take/ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockItemId: item.id,
          ipAddresses: validIPs
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update IP addresses');
      }

      await response.json();
      toast.success('Updated successfully');
      onAssigned(item.id, validIPs);
      onClose();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Failed to update');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {ipAddresses.length > 0 ? 'Manage' : 'Assign'} IP Addresses
          </DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-800">
              {item?.description || 'Item'}
            </h3>
            {item?.supplier && (
              <Badge variant="outline" className="text-xs">
                {item.supplier}
              </Badge>
            )}
          </div>
          {item?.code && (
            <p className="text-sm text-gray-600">Code: {item.code}</p>
          )}
          <div className="mt-2">
            <label className="text-sm font-medium text-gray-700">Serial Number:</label>
            <Input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Enter serial number"
              className="mt-1"
            />
          </div>
        </div>

          <div className="space-y-3 mb-6">
            {ipAddresses.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
                <Network className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-600 mb-4">No IP addresses assigned yet</p>
                <Button 
                  variant="outline"
                  onClick={handleAddIP}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Your First IP Address
                </Button>
              </div>
            ) : (
              <>
                {ipAddresses.map((ip, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={ip.value}
                      onChange={(e) => handleIPChange(index, e.target.value)}
                      placeholder="e.g. 192.168.1.100"
                      className={ip.value && !ip.isValid ? "border-red-300" : ""}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveIP(index)}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {ipAddresses.some(ip => ip.value && !ip.isValid) && (
                  <p className="text-sm text-red-500">
                    Please enter valid IP addresses (format: xxx.xxx.xxx.xxx)
                  </p>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddIP} 
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Another IP Address
                </Button>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}