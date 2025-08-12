'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Car, 
  Edit, 
  Calendar, 
  Fuel, 
  Gauge,
  MapPin,
  Settings,
  FileText,
  DollarSign
} from 'lucide-react';

interface VehicleDetailProps {
  vehicle: any;
  onBack: () => void;
}

const mockProducts = [
  { id: 1, name: 'Skylink Pro', dataName: 'Unit IP', value: '00855365' },
  { id: 2, name: 'Sky Safety', dataName: 'Data Number', value: '09602005632239' },
  { id: 3, name: 'Skylink Sim Card Number', dataName: 'Card Number', value: '61.40.1.95' },
  { id: 4, name: 'Skylink Data Number', dataName: 'Data Number', value: '893200000000027464654' }
];

export default function VehicleDetail({ vehicle, onBack }: VehicleDetailProps) {
  if (!vehicle) return null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack} className="px-3">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <Car className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{vehicle.registration}</h1>
              <p className="text-gray-600">{vehicle.make} {vehicle.model}</p>
            </div>
          </div>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white">
          <Edit className="h-4 w-4 mr-2" />
          Edit Vehicle
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-sky-600" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Registration Number</label>
                  <p className="text-lg font-semibold text-gray-800">{vehicle.registration}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Make & Model</label>
                  <p className="text-lg font-semibold text-gray-800">{vehicle.make} {vehicle.model}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Year</label>
                  <p className="text-lg font-semibold text-gray-800">{vehicle.year}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Color</label>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${
                      vehicle.color === 'White' ? 'bg-white border-2 border-gray-300' :
                      vehicle.color === 'Blue' ? 'bg-blue-500' :
                      vehicle.color === 'Red' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-gray-800">{vehicle.color}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Fleet Number</label>
                  <p className="text-lg font-semibold text-gray-800">{vehicle.fleetNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Fuel Type</label>
                  <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-800">{vehicle.fuelType}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Cost Centre</label>
                  <p className="text-sm text-gray-800">{vehicle.costCentre}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Products</p>
                  <p className="text-2xl font-bold text-gray-800">{vehicle.productCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Gauge className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Odometer</p>
                  <p className="text-2xl font-bold text-gray-800">45,230</p>
                  <p className="text-xs text-gray-500">km</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Next Service</p>
                  <p className="text-sm font-semibold text-gray-800">15 Mar 2024</p>
                  <p className="text-xs text-gray-500">in 12 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products/Equipment */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-600" />
              Installed Products & Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-sky-600">Product</th>
                    <th className="text-left py-3 px-4 font-semibold text-sky-600">Data Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-sky-600">Value</th>
                    <th className="text-left py-3 px-4 font-semibold text-sky-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockProducts.map((product, index) => (
                    <tr 
                      key={product.id} 
                      className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="py-4 px-4 font-medium text-gray-800">{product.name}</td>
                      <td className="py-4 px-4 text-gray-600">{product.dataName}</td>
                      <td className="py-4 px-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {product.value}
                        </code>
                      </td>
                      <td className="py-4 px-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-8 w-8 p-0 border-orange-200 hover:bg-orange-50"
                        >
                          <Edit className="h-4 w-4 text-orange-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}