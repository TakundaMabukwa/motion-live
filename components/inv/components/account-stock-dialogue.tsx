"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Building2, Package, Eye, ArrowLeft, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Types
interface Part {
  id: string;
  type: string;
  product: string;
  description: string;
  price: number;
  stockQuantity: number;
}

interface Account {
  id: string;
  name: string;
  companyId: string;
  status: 'Active' | 'Prospect';
  lastContact: string;
  value: number;
  stock: Part[];
}

// Sample data
const accountsData: Account[] = [
  {
    id: 'ACC-0001',
    name: 'AIRGASS COMPRESSORS (PTY) LTD',
    companyId: 'ACC-0001',
    status: 'Active',
    lastContact: '2025-01-15',
    value: 450000,
    stock: [
      { id: '1', type: 'DASHCAM', product: 'LED alarm', description: 'Audible & Visual LED alarm', price: 2370, stockQuantity: 15 },
      { id: '2', type: 'DASHCAM', product: 'PDC Camera', description: 'Pedestrian detection Camera', price: 2922, stockQuantity: 8 },
      { id: '3', type: 'AI DASHCAM', product: '5ch AI DVR', description: 'AI DMS live camera system', price: 15832, stockQuantity: 3 },
      { id: '4', type: 'BACKUP', product: 'SkySpy', description: 'Canbus integration', price: 979, stockQuantity: 25 },
      { id: '5', type: 'DVR CAMERA', product: '1TB HD Memory Card', description: '1TB HD Memory Card', price: 2420, stockQuantity: 12 },
    ]
  },
  {
    id: 'ACC-0002',
    name: 'AIRGASS COMPRESSORS (Pty) Ltd',
    companyId: 'ACC-0002',
    status: 'Active',
    lastContact: '2025-01-14',
    value: 320000,
    stock: [
      { id: '6', type: 'BREATHALOK', product: 'BREATHALOK', description: '', price: 11000, stockQuantity: 5 },
      { id: '7', type: 'BREATHALOK', product: 'BREATHALOK OVERRIDE SWITCH', description: '', price: 200, stockQuantity: 20 },
      { id: '8', type: 'FMS', product: 'Skylink Asset (Trailer)', description: 'Telematics Unit with Accelerometer and 4x inputs for Trailers', price: 4649, stockQuantity: 7 },
      { id: '9', type: 'PTT', product: 'Sky Talk portable', description: 'Portable PTT radio entry level', price: 2973, stockQuantity: 10 },
    ]
  },
  {
    id: 'ACC-0003',
    name: 'ALL-DANQUAH CC',
    companyId: 'ACC-0003',
    status: 'Prospect',
    lastContact: '2025-01-12',
    value: 180000,
    stock: [
      { id: '10', type: 'DASHCAM', product: '2.5" TF 256GB', description: '256GB - SD Memory card', price: 1751, stockQuantity: 30 },
      { id: '11', type: 'DVR CAMERA', product: '4 Pin Cable 5M', description: 'Cabling', price: 148, stockQuantity: 50 },
      { id: '12', type: 'DVR CAMERA', product: '2TB HD Memory Card', description: '2TB HD Memory Card', price: 3210, stockQuantity: 6 },
      { id: '13', type: 'FMS', product: 'Skylink Motorbike', description: 'Telematics Unit with Accelerometer and 4x inputs for Motorcy', price: 2708, stockQuantity: 4 },
    ]
  },
  {
    id: 'ACC-0004',
    name: 'AUMA SOUTH AFRICA PTY LTD',
    companyId: 'ACC-0004',
    status: 'Active',
    lastContact: '2025-01-10',
    value: 720000,
    stock: [
      { id: '14', type: 'AI DASHCAM', product: '2 Camera AI Dashcam + 256GB', description: 'AI DMS DashCam with ADAS', price: 5517, stockQuantity: 12 },
      { id: '15', type: 'BACKUP', product: 'Beame Backup Unit', description: 'Wireless recovery unit only', price: 595, stockQuantity: 18 },
      { id: '16', type: 'PTT', product: 'Sky Talk portable with NFC', description: 'Portable PTT radio with NFC tagging', price: 3239, stockQuantity: 8 },
      { id: '17', type: 'PTT', product: 'NFC TAGS', description: 'Round type tag', price: 133, stockQuantity: 100 },
    ]
  },
  {
    id: 'ACC-0005',
    name: 'AVIS VAN RENTAL EASTERN & NORTHERN GAUTENG',
    companyId: 'ACC-0005',
    status: 'Active',
    lastContact: '2025-01-08',
    value: 540000,
    stock: [
      { id: '18', type: 'FMS', product: 'Skylink Pro', description: 'Telematics Unit with Accelerometer and 4x inputs', price: 4270, stockQuantity: 9 },
      { id: '19', type: 'PTT', product: 'Sky Talk Mobile', description: 'Mobile PTT radio for vehicles', price: 3461, stockQuantity: 6 },
      { id: '20', type: 'PTT', product: 'Sky battery', description: 'Portable spare battery', price: 521, stockQuantity: 25 },
      { id: '21', type: 'SERVICES', product: 'After Hours Maintenance', description: 'After Hours Maintenance - Optional', price: 0, stockQuantity: 0 },
    ]
  },
];

// Soltrack stock data
const soltrackStock: Part[] = [
  { id: 'SOL-001', type: 'DASHCAM', product: 'LED alarm', description: 'Audible & Visual LED alarm', price: 2370, stockQuantity: 45 },
  { id: 'SOL-002', type: 'DASHCAM', product: 'PDC Camera', description: 'Pedestrian detection Camera', price: 2922, stockQuantity: 32 },
  { id: 'SOL-003', type: 'AI DASHCAM', product: '5ch AI DVR', description: 'AI DMS live camera system', price: 15832, stockQuantity: 12 },
  { id: 'SOL-004', type: 'AI DASHCAM', product: '2 Camera AI Dashcam + 256GB', description: 'AI DMS DashCam with ADAS', price: 5517, stockQuantity: 28 },
  { id: 'SOL-005', type: 'BACKUP', product: 'SkySpy', description: 'Canbus integration', price: 979, stockQuantity: 67 },
  { id: 'SOL-006', type: 'BACKUP', product: 'Beame Backup Unit', description: 'Wireless recovery unit only', price: 595, stockQuantity: 89 },
  { id: 'SOL-007', type: 'BREATHALOK', product: 'BREATHALOK', description: '', price: 11000, stockQuantity: 15 },
  { id: 'SOL-008', type: 'BREATHALOK', product: 'BREATHALOK OVERRIDE SWITCH', description: '', price: 200, stockQuantity: 78 },
  { id: 'SOL-009', type: 'DASHCAM', product: '2.5" TF 256GB', description: '256GB - SD Memory card', price: 1751, stockQuantity: 156 },
  { id: 'SOL-010', type: 'Dashcam Cab Facing', product: 'Driver In-Cab Camera', description: 'Driver In-Cab camera', price: 1247, stockQuantity: 34 },
  { id: 'SOL-011', type: 'Dashcam Forward Facing', product: 'Road Facing Camera', description: 'Road Facing Camera', price: 5757, stockQuantity: 23 },
  { id: 'SOL-012', type: 'DVR CAMERA', product: '4 Pin Cable 10M', description: 'Cabling', price: 247, stockQuantity: 234 },
  { id: 'SOL-013', type: 'DVR CAMERA', product: '4 Pin Cable 5M', description: 'Cabling', price: 148, stockQuantity: 189 },
  { id: 'SOL-014', type: 'DVR CAMERA', product: '1TB HD Memory Card', description: '1TB HD Memory Card', price: 2420, stockQuantity: 67 },
  { id: 'SOL-015', type: 'DVR CAMERA', product: '4 Pin Cable 3M', description: 'Cabling', price: 74, stockQuantity: 298 },
  { id: 'SOL-016', type: 'DVR CAMERA', product: '2.5" SSD 480GB', description: '480GB SD memory card', price: 3358, stockQuantity: 45 },
  { id: 'SOL-017', type: 'DVR CAMERA', product: '2TB HD Memory Card', description: '2TB HD Memory Card', price: 3210, stockQuantity: 34 },
  { id: 'SOL-018', type: 'DVR CAMERA', product: '2.5" SD 256GB', description: '256GB SD memory card', price: 1803, stockQuantity: 78 },
  { id: 'SOL-019', type: 'FMS', product: 'Skylink Scout 24V', description: 'Telematics Unit with Accelerometer and 1x input', price: 3032, stockQuantity: 56 },
  { id: 'SOL-020', type: 'FMS', product: 'Skylink Asset (Trailer)', description: 'Telematics Unit with Accelerometer and 4x inputs for Trailers', price: 4649, stockQuantity: 23 },
  { id: 'SOL-021', type: 'FMS', product: 'Skylink Motorbike', description: 'Telematics Unit with Accelerometer and 4x inputs for Motorcy', price: 2708, stockQuantity: 34 },
  { id: 'SOL-022', type: 'FMS', product: 'Skylink Scout 12V', description: 'Telematics Unit with Accelerometer and 1x input', price: 3032, stockQuantity: 67 },
  { id: 'SOL-023', type: 'FMS', product: 'Skylink OBD', description: 'Telematics unit with accelerometer and 4x inputs', price: 3184, stockQuantity: 45 },
  { id: 'SOL-024', type: 'FMS', product: 'Skylink Pro', description: 'Telematics Unit with Accelerometer and 4x inputs', price: 4270, stockQuantity: 29 },
  { id: 'SOL-025', type: 'PTT', product: 'Sky Talk portable', description: 'Portable PTT radio entry level', price: 2973, stockQuantity: 89 },
  { id: 'SOL-026', type: 'PTT', product: 'Sky Talk portable with NFC', description: 'Portable PTT radio with NFC tagging', price: 3239, stockQuantity: 67 },
  { id: 'SOL-027', type: 'PTT', product: 'NFC TAGS', description: 'Round type tag', price: 133, stockQuantity: 456 },
  { id: 'SOL-028', type: 'PTT', product: 'Sky Talk portable with keypad', description: 'Portable PTT radio with keypad', price: 3683, stockQuantity: 34 },
  { id: 'SOL-029', type: 'PTT', product: 'Sky Talk Mobile', description: 'Mobile PTT radio for vehicles', price: 3461, stockQuantity: 45 },
  { id: 'SOL-030', type: 'PTT', product: 'Sky battery', description: 'Portable spare battery', price: 521, stockQuantity: 123 },
];
export function AccountsStockDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [showSoltrackStock, setShowSoltrackStock] = useState(false);

  // Filter accounts based on search term
  const filteredAccounts = accountsData.filter(
    account =>
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.companyId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter stock based on search term
  const currentStock = showSoltrackStock ? soltrackStock : selectedAccount?.stock || [];
  const filteredStock = currentStock.filter(
    part =>
      part.product.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      part.type.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      part.description.toLowerCase().includes(stockSearchTerm.toLowerCase())
  );

  // Calculate total stock value for selected account
  const totalStockValue = currentStock.reduce(
    (total, part) => total + (part.price * part.stockQuantity), 0
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSelectFromStock = (part: Part) => {
    // Handle selecting part from account stock
    console.log('Selected part from stock:', part);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <Building2 className="mr-2 w-4 h-4" />
        Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold text-gray-900 text-2xl">
            <Building2 className="w-6 h-6 text-purple-600" />
            {showSoltrackStock ? 'Soltrack Stock Inventory' : selectedAccount ? `${selectedAccount.name} - Stock Inventory` : 'Account Stock Management'}
          </DialogTitle>
        </DialogHeader>
        
        {selectedAccount || showSoltrackStock ? (
          /* Account Stock View */
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAccount(null);
                  setShowSoltrackStock(false);
                  setStockSearchTerm('');
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Accounts
              </Button>
              {showSoltrackStock ? (
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Soltrack Stock</h3>
                  <p className="text-gray-600 text-sm">Main Inventory</p>
                </div>
              ) : (
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedAccount?.name}</h3>
                  <p className="text-gray-600 text-sm">ID: {selectedAccount?.companyId}</p>
                </div>
              )}
            </div>
            
            {/* Account Summary */}
            {showSoltrackStock ? (
              <Card className="bg-blue-50 p-4 border-blue-200">
                <div className="gap-4 grid grid-cols-3">
                  <div>
                    <p className="text-blue-700 text-sm">Total Items</p>
                    <p className="font-bold text-blue-900">{soltrackStock.length}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 text-sm">Total Quantity</p>
                    <p className="font-bold text-blue-900">
                      {soltrackStock.reduce((sum, part) => sum + part.stockQuantity, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700 text-sm">Stock Value</p>
                    <p className="font-bold text-blue-600">
                      {formatCurrency(totalStockValue)}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-purple-50 p-4 border-purple-200">
                <div className="gap-4 grid grid-cols-4">
                  <div>
                    <p className="text-purple-700 text-sm">Status</p>
                    <Badge variant={selectedAccount?.status === 'Active' ? 'default' : 'secondary'}>
                      {selectedAccount?.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-purple-700 text-sm">Last Contact</p>
                    <p className="font-medium">{selectedAccount?.lastContact}</p>
                  </div>
                  <div>
                    <p className="text-purple-700 text-sm">Account Value</p>
                    <p className="font-bold text-green-600">
                      {formatCurrency(selectedAccount?.value || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-purple-700 text-sm">Stock Value</p>
                    <p className="font-bold text-purple-600">
                      {formatCurrency(totalStockValue)}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Stock Search */}
            <div className="relative">
              <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
              <Input
                placeholder="Search stock items..."
                value={stockSearchTerm}
                onChange={(e) => setStockSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Stock List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {showSoltrackStock ? 'Soltrack' : 'Stock'} Inventory ({filteredStock.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredStock.length === 0 ? (
                      <div className="py-12 text-gray-500 text-center">
                        <Package className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                        <p>No stock items found</p>
                        {stockSearchTerm && (
                          <p className="text-sm">Try adjusting your search terms</p>
                        )}
                      </div>
                    ) : (
                      filteredStock.map((part) => (
                        <Card key={part.id} className="hover:shadow-md p-4 transition-shadow">
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {part.type}
                                </Badge>
                                <span className="font-medium text-gray-900 truncate">
                                  {part.product}
                                </span>
                              </div>
                              <p className="mb-2 text-gray-600 text-sm truncate">{part.description}</p>
                              <div className="flex items-center gap-4">
                                <span className="font-medium text-green-600 text-sm">
                                  {formatCurrency(part.price)} each
                                </span>
                                <span className="text-gray-600 text-sm">
                                  Stock: <span className="font-medium">{part.stockQuantity}</span>
                                </span>
                                <span className={`text-sm font-medium ${showSoltrackStock ? 'text-blue-600' : 'text-purple-600'}`}>
                                  Total: {formatCurrency(part.price * part.stockQuantity)}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSelectFromStock(part)}
                              className={`ml-4 ${showSoltrackStock ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                              disabled={part.stockQuantity === 0}
                            >
                              <Plus className="mr-1 w-4 h-4" />
                              Select
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Accounts List View */
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => setShowSoltrackStock(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Package className="mr-2 w-4 h-4" />
                Soltrack Stock
              </Button>
            </div>
            
            <ScrollArea className="pr-4 h-[500px]">
              <div className="space-y-3">
                {filteredAccounts.map((account) => (
                  <Card key={account.id} className="hover:shadow-md p-4 transition-shadow cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-1 items-center gap-3 min-w-0">
                        <Building2 className="flex-shrink-0 w-8 h-8 text-purple-600" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{account.name}</h3>
                          <p className="text-gray-600 text-sm">ID: {account.companyId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <Badge variant={account.status === 'Active' ? 'default' : 'secondary'}>
                            {account.status}
                          </Badge>
                          <p className="mt-1 text-gray-600 text-xs">{account.lastContact}</p>
                        </div>
                        <div className="min-w-[120px] text-right">
                          <p className="font-bold text-green-600">
                            {formatCurrency(account.value)}
                          </p>
                          <p className="text-gray-600 text-xs">{account.stock.length} stock items</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAccount(account)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View Stock
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <Separator />
        
        <div className="flex justify-between items-center pt-4">
          <div className="text-gray-600 text-sm">
            {showSoltrackStock
              ? `${filteredStock.length} stock items • Total value: ${formatCurrency(totalStockValue)}`
              : selectedAccount 
              ? `${filteredStock.length} stock items • Total value: ${formatCurrency(totalStockValue)}`
              : `${filteredAccounts.length} accounts available`
            }
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            {(selectedAccount || showSoltrackStock) && (
              <Button 
                className={showSoltrackStock ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}
                onClick={() => {
                  // Handle stock selection confirmation
                  console.log('Stock viewed:', showSoltrackStock ? 'Soltrack' : selectedAccount);
                  setIsOpen(false);
                }}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}