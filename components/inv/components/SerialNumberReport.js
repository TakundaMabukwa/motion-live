'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Filter } from 'lucide-react';

export default function SerialNumberReport() {
  const [filters, setFilters] = useState({
    serialNumber: '',
    status: '',
    date: '',
    movementType: '',
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Serial Number Report</h2>
        <p className="text-gray-600">Track and manage serial numbers across your inventory</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Serial Number Tracking</CardTitle>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Serial Number
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">#</label>
                <Input
                  placeholder="Enter number"
                  value={filters.serialNumber}
                  onChange={(e) => handleFilterChange('serialNumber', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
                <Input
                  placeholder="Enter serial number"
                  value={filters.serialNumber}
                  onChange={(e) => handleFilterChange('serialNumber', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <Input
                  placeholder="Enter status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <Input
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type</label>
                <Input
                  placeholder="Enter movement type"
                  value={filters.movementType}
                  onChange={(e) => handleFilterChange('movementType', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-blue-50">
                  <th className="text-left py-3 px-4 font-medium text-blue-700">#</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-700">Serial Number</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-blue-700">Movement Type</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-500">
                    No results found
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show</span>
              <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                <option>50</option>
                <option>100</option>
                <option>200</option>
              </select>
              <span className="text-sm text-gray-600">entries</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">Previous</Button>
              <Button variant="outline" size="sm" className="bg-blue-600 text-white">1</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}