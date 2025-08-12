'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Search,
  Plus,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Truck,
  Wrench,
  Edit,
  Eye,
  BarChart3,
  Calendar,
  FileText,
  ClipboardCheck,
  Bell,
  User
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '../../../../components/logout-button';

const productCatalog = [
  // FMS Products
  { id: 'FMS-001', type: 'FMS', product: 'Skylink Pro', description: 'Telematics Unit with Accelerometer and 4x inputs', price: 4270, category: 'Telematics', inStock: 15, minLevel: 10, maxLevel: 25, location: 'Van A - Compartment 1' },
  { id: 'FMS-002', type: 'FMS', product: 'Skylink Asset (Trailer)', description: 'Telematics Unit with Accelerometer and 4x inputs for Trailers', price: 4649, category: 'Telematics', inStock: 8, minLevel: 5, maxLevel: 15, location: 'Van A - Compartment 2' },
  { id: 'FMS-003', type: 'FMS', product: 'Skylink Scout 12V', description: 'Telematics Unit with Accelerometer and 1x input', price: 3032, category: 'Telematics', inStock: 12, minLevel: 8, maxLevel: 20, location: 'Van B - Main Storage' },
  { id: 'FMS-004', type: 'FMS', product: 'Skylink Scout 24V', description: 'Telematics Unit with Accelerometer and 1x input', price: 3032, category: 'Telematics', inStock: 6, minLevel: 8, maxLevel: 20, location: 'Van B - Main Storage' },
  { id: 'FMS-005', type: 'FMS', product: 'Skylink OBD', description: 'Telematics unit with accelerometer and no inputs', price: 3184, category: 'Telematics', inStock: 20, minLevel: 15, maxLevel: 30, location: 'Van C - Side Panel' },
  { id: 'FMS-006', type: 'FMS', product: 'Skylink Motorbike', description: 'Telematics Unit with Accelerometer and 4x inputs for Motorcycles', price: 2708, category: 'Telematics', inStock: 4, minLevel: 5, maxLevel: 12, location: 'Van A - Compartment 3' },

  // Backup Products
  { id: 'BCK-001', type: 'BACKUP', product: 'SkySpy', description: 'Wireless GSM/GPS/WiFi backup SVR', price: 979, category: 'Backup Systems', inStock: 10, minLevel: 8, maxLevel: 15, location: 'Van B - Side Panel' },
  { id: 'BCK-002', type: 'BACKUP', product: 'Beame Backup Unit', description: 'Wireless recovery unit only', price: 595, category: 'Backup Systems', inStock: 25, minLevel: 20, maxLevel: 40, location: 'Van C - Main Storage' },

  // DVR Camera Products
  { id: 'DVR-001', type: 'DVR CAMERA', product: '4 Pin Cable 3M', description: 'Cabling', price: 74, category: 'Cables', inStock: 50, minLevel: 30, maxLevel: 80, location: 'Van A - Cable Box' },
  { id: 'DVR-002', type: 'DVR CAMERA', product: '4 Pin Cable 5M', description: 'Cabling', price: 148, category: 'Cables', inStock: 30, minLevel: 20, maxLevel: 50, location: 'Van A - Cable Box' },
  { id: 'DVR-003', type: 'DVR CAMERA', product: '4 Pin Cable 10M', description: 'Cabling', price: 247, category: 'Cables', inStock: 20, minLevel: 15, maxLevel: 35, location: 'Van A - Cable Box' },
  { id: 'DVR-004', type: 'DVR CAMERA', product: '1TB HD Memory Card', description: '1TB HD Memory Card', price: 2420, category: 'Storage', inStock: 8, minLevel: 5, maxLevel: 15, location: 'Van B - Electronics' },
  { id: 'DVR-005', type: 'DVR CAMERA', product: '2TB HD Memory Card', description: '2TB HD Memory Card', price: 3210, category: 'Storage', inStock: 5, minLevel: 3, maxLevel: 10, location: 'Van B - Electronics' },
  { id: 'DVR-006', type: 'DVR CAMERA', product: '2.5" SD 256GB', description: '256GB SD Memory Card', price: 1803, category: 'Storage', inStock: 15, minLevel: 10, maxLevel: 25, location: 'Van B - Electronics' },
  { id: 'DVR-007', type: 'DVR CAMERA', product: '2.5" SSD 480GB', description: '480GB SD Memory Card', price: 3358, category: 'Storage', inStock: 7, minLevel: 5, maxLevel: 12, location: 'Van B - Electronics' },

  // Dashcam Products
  { id: 'DSH-001', type: 'DASHCAM', product: 'Dashcam Forward Facing', description: 'Road Facing Camera', price: 5757, category: 'Cameras', inStock: 12, minLevel: 8, maxLevel: 20, location: 'Van C - Camera Storage' },
  { id: 'DSH-002', type: 'DASHCAM', product: 'Dashcam Cab Facing', description: 'Driver In-Cab Camera', price: 1247, category: 'Cameras', inStock: 18, minLevel: 12, maxLevel: 25, location: 'Van C - Camera Storage' },
  { id: 'DSH-003', type: 'DASHCAM', product: '2.5" TF 256GB', description: '256GB SD Memory Card', price: 1751, category: 'Storage', inStock: 22, minLevel: 15, maxLevel: 30, location: 'Van B - Electronics' },

  // AI Dashcam Products
  { id: 'AID-001', type: 'AI DASHCAM', product: '5ch AI DVR', description: 'AI DMS live camera system', price: 15832, category: 'AI Systems', inStock: 3, minLevel: 2, maxLevel: 6, location: 'Van C - Secure Storage' },
  { id: 'AID-002', type: 'AI DASHCAM', product: '2 Camera AI Dashcam + 256GB', description: 'AI DMS DashCam with ADAS', price: 5517, category: 'AI Systems', inStock: 6, minLevel: 4, maxLevel: 10, location: 'Van C - Secure Storage' },
  { id: 'AID-003', type: 'AI DASHCAM', product: 'LED Alarm', description: 'Audible and Visual LED Alarm', price: 2370, category: 'Alarms', inStock: 14, minLevel: 10, maxLevel: 20, location: 'Van A - Accessories' },
  { id: 'AID-004', type: 'AI DASHCAM', product: 'PDC Camera', description: 'Pedestrian Detection Camera', price: 2222, category: 'Cameras', inStock: 9, minLevel: 6, maxLevel: 15, location: 'Van C - Camera Storage' },

  // PTT Products
  { id: 'PTT-001', type: 'PTT', product: 'Sky Talk Portable', description: 'Portable PTT Radio Entry Level', price: 2973, category: 'Communication', inStock: 16, minLevel: 12, maxLevel: 25, location: 'Van B - Radio Storage' },
  { id: 'PTT-002', type: 'PTT', product: 'Sky Talk Portable with Keypad', description: 'Portable PTT Radio with Keypad - non stock', price: 3683, category: 'Communication', inStock: 0, minLevel: 5, maxLevel: 10, location: 'Van B - Radio Storage' },
  { id: 'PTT-003', type: 'PTT', product: 'Sky Talk Mobile', description: 'Mobile PTT Radio for Vehicles', price: 3461, category: 'Communication', inStock: 11, minLevel: 8, maxLevel: 18, location: 'Van B - Radio Storage' },
  { id: 'PTT-004', type: 'PTT', product: 'Sky Talk Portable with NFC', description: 'Portable PTT Radio with NFC Tagging', price: 3239, category: 'Communication', inStock: 8, minLevel: 6, maxLevel: 15, location: 'Van B - Radio Storage' },
  { id: 'PTT-005', type: 'PTT', product: 'Sky battery', description: 'Portable spare battery', price: 521, category: 'Accessories', inStock: 35, minLevel: 25, maxLevel: 50, location: 'Van A - Accessories' },
  { id: 'PTT-006', type: 'PTT', product: 'NFC Tags', description: 'Round Type Tag', price: 133, category: 'Accessories', inStock: 100, minLevel: 80, maxLevel: 150, location: 'Van A - Accessories' },

  // Breathalok Products
  { id: 'BRT-001', type: 'BREATHALOK', product: 'BREATHALOK', description: 'Breathalyzer System', price: 11000, category: 'Safety', inStock: 2, minLevel: 1, maxLevel: 5, location: 'Van C - Secure Storage' },
  { id: 'BRT-002', type: 'BREATHALOK', product: 'BREATHALOK OVERRIDE SWITCH', description: 'Override Switch for Breathalok', price: 200, category: 'Safety', inStock: 12, minLevel: 8, maxLevel: 20, location: 'Van A - Accessories' }
];

const stockTakeHistory = [
  {
    id: 'ST-001',
    date: '2025-01-18',
    technician: 'John Doe',
    location: 'Van A - Compartment 1',
    itemsChecked: 15,
    discrepancies: 2,
    status: 'Completed',
    notes: 'Found 2 missing Skylink Pro units'
  },
  {
    id: 'ST-002',
    date: '2025-01-17',
    technician: 'Sarah Wilson',
    location: 'Van B - Main Storage',
    itemsChecked: 23,
    discrepancies: 0,
    status: 'Completed',
    notes: 'All items accounted for'
  },
  {
    id: 'ST-003',
    date: '2025-01-18',
    technician: 'Mike Johnson',
    location: 'Van C - Camera Storage',
    itemsChecked: 8,
    discrepancies: 1,
    status: 'In Progress',
    notes: 'Checking dashcam inventory'
  }
];

const getStockStatus = (quantity, minLevel) => {
  if (quantity === 0) return { status: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200' };
  if (quantity <= minLevel) return { status: 'Low Stock', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return { status: 'In Stock', color: 'bg-green-100 text-green-700 border-green-200' };
};

export default function BootStock() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockTakeMode, setStockTakeMode] = useState(false);
  const [stockTakeItems, setStockTakeItems] = useState({});
  const pathname = usePathname(); // Add this line

  const categories = ['All', ...new Set(productCatalog.map(item => item.category))];

  const filteredProducts = productCatalog.filter(item => {
    const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalItems: productCatalog.length,
    lowStock: productCatalog.filter(item => item.inStock <= item.minLevel).length,
    outOfStock: productCatalog.filter(item => item.inStock === 0).length,
    totalValue: productCatalog.reduce((sum, item) => sum + (item.inStock * item.price), 0)
  };

  const handleStockTakeUpdate = (itemId, actualCount) => {
    setStockTakeItems(prev => ({
      ...prev,
      [itemId]: actualCount
    }));
  };

  const ProductCard = ({ item }) => {
    const stockStatus = getStockStatus(item.inStock, item.minLevel);
    const actualCount = stockTakeItems[item.id];
    const hasDiscrepancy = actualCount !== undefined && actualCount !== item.inStock;

    return (
      <Card className={`hover:shadow-lg transition-all duration-200 hover:border-blue-300 cursor-pointer group ${hasDiscrepancy ? 'border-orange-300 bg-orange-50' : ''}`}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start space-x-3">
              <div className="bg-slate-100 group-hover:bg-blue-50 p-2 rounded-lg transition-colors">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {item.product}
                </h3>
                <p className="text-slate-600 text-sm">{item.id}</p>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              <Badge className={stockStatus.color}>
                {stockStatus.status}
              </Badge>
              {hasDiscrepancy && (
                <Badge className="bg-orange-100 border-orange-200 text-orange-700">
                  Discrepancy
                </Badge>
              )}
            </div>
          </div>

          <p className="mb-4 text-slate-600 text-sm">{String(item.description || '')}</p>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">System Count</span>
              <span className="font-semibold text-slate-900">{item.inStock} units</span>
            </div>

            {stockTakeMode && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Actual Count</span>
                <Input
                  type="number"
                  className="w-20 h-8 text-center"
                  placeholder={item.inStock.toString()}
                  onChange={(e) => handleStockTakeUpdate(item.id, parseInt(e.target.value) || 0)}
                />
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Location</span>
              <span className="font-medium text-slate-700">{item.location}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Unit Price</span>
              <span className="font-semibold text-slate-900">R{item.price.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-slate-100 border-t">
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Eye className="mr-1 w-4 h-4" />
                View
              </Button>
              <Button size="sm" variant="outline">
                <Edit className="mr-1 w-4 h-4" />
                Update
              </Button>
            </div>
            <span className="text-slate-500 text-xs">
              Value: R{(item.inStock * item.price).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const StockTakeCard = ({ record }) => (
    <Card className="hover:shadow-lg hover:border-blue-300 transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">{record.id}</h3>
            <p className="text-slate-600 text-sm">{record.location}</p>
          </div>
          <Badge className={
            record.status === 'Completed' ? 'bg-green-100 text-green-700' :
              record.status === 'In Progress' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
          }>
            {record.status}
          </Badge>
        </div>

        <div className="gap-4 grid grid-cols-2 mb-4 text-sm">
          <div>
            <span className="text-slate-600">Date:</span>
            <p className="font-medium">{record.date}</p>
          </div>
          <div>
            <span className="text-slate-600">Technician:</span>
            <p className="font-medium">{record.technician}</p>
          </div>
          <div>
            <span className="text-slate-600">Items Checked:</span>
            <p className="font-medium">{record.itemsChecked}</p>
          </div>
          <div>
            <span className="text-slate-600">Discrepancies:</span>
            <p className={`font-medium ${record.discrepancies > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {record.discrepancies}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <span className="text-slate-600 text-sm">Notes:</span>
          <p className="mt-1 text-slate-700 text-sm">{record.notes}</p>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-slate-100 border-t">
          <Button size="sm" variant="outline">
            <Eye className="mr-1 w-4 h-4" />
            View Details
          </Button>
          {record.status === 'In Progress' && (
            <Button size="sm">
              <ClipboardCheck className="mr-1 w-4 h-4" />
              Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Main Content */}
      <main className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="inventory">Product Catalog ({stats.totalItems})</TabsTrigger>
            <TabsTrigger value="stocktake">Stock Take</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            {/* Controls */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="top-1/2 left-3 absolute w-4 h-4 text-slate-400 -translate-y-1/2 transform" />
                  <Input
                    placeholder="Search products..."
                    className="pl-10 w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border border-slate-200 rounded-md"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant={stockTakeMode ? "default" : "outline"}
                  onClick={() => setStockTakeMode(!stockTakeMode)}
                >
                  <ClipboardCheck className="mr-2 w-4 h-4" />
                  {stockTakeMode ? 'Exit Stock Take' : 'Start Stock Take'}
                </Button>
                <Button>
                  <Plus className="mr-2 w-4 h-4" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Stock Statistics */}
            <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                  <CardTitle className="font-medium text-slate-600 text-sm">
                    Total Products
                  </CardTitle>
                  <Package className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-slate-900 text-3xl">{stats.totalItems}</div>
                  <p className="flex items-center mt-1 text-green-600 text-xs">
                    <TrendingUp className="mr-1 w-3 h-3" />
                    Complete catalog
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                  <CardTitle className="font-medium text-slate-600 text-sm">
                    Low Stock Items
                  </CardTitle>
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-slate-900 text-3xl">{stats.lowStock}</div>
                  <p className="flex items-center mt-1 text-yellow-600 text-xs">
                    <TrendingDown className="mr-1 w-3 h-3" />
                    Needs restocking
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                  <CardTitle className="font-medium text-slate-600 text-sm">
                    Out of Stock
                  </CardTitle>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-slate-900 text-3xl">{stats.outOfStock}</div>
                  <p className="flex items-center mt-1 text-red-600 text-xs">
                    <AlertTriangle className="mr-1 w-3 h-3" />
                    Critical
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="flex flex-row justify-between items-center space-y-0 pb-2">
                  <CardTitle className="font-medium text-slate-600 text-sm">
                    Total Inventory Value
                  </CardTitle>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-slate-900 text-3xl">R{(stats.totalValue / 1000000).toFixed(1)}M</div>
                  <p className="flex items-center mt-1 text-blue-600 text-xs">
                    <TrendingUp className="mr-1 w-3 h-3" />
                    Current stock value
                  </p>
                </CardContent>
              </Card>
            </div>

            {stockTakeMode && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <ClipboardCheck className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-blue-900">Stock Take Mode Active</h3>
                        <p className="text-blue-700 text-sm">Enter actual counts for each item. Discrepancies will be highlighted.</p>
                      </div>
                    </div>
                    <Button size="sm">
                      Save Stock Take
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Grid */}
            <div className="gap-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="stocktake" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900 text-2xl">Stock Take History</h2>
                <p className="text-slate-600">Track and manage stock take activities</p>
              </div>
              <Button>
                <Plus className="mr-2 w-4 h-4" />
                New Stock Take
              </Button>
            </div>

            <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
              {stockTakeHistory.map((record) => (
                <StockTakeCard key={record.id} record={record} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Analytics</CardTitle>
              </CardHeader>
              <CardContent className="p-12 text-center">
                <BarChart3 className="mx-auto mb-4 w-12 h-12 text-slate-300" />
                <h3 className="mb-2 font-medium text-slate-900 text-lg">Analytics Dashboard</h3>
                <p className="text-slate-500">Stock usage patterns, trends, and forecasting will be displayed here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}