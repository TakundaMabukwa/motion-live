'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Package, User, Search, Plus } from 'lucide-react';

export default function SerialInventoryContent() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchItems(selectedCategory.code);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/inventory-categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (categoryCode) => {
    try {
      const response = await fetch(`/api/inventory-items?category_code=${categoryCode}`);
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'IN STOCK': return 'bg-green-100 text-green-800';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'INSTALLED': return 'bg-purple-100 text-purple-800';
      case 'MISSING': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredItems = items.filter(item =>
    item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.container?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Serial Number Inventory</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedCategory?.id === category.id
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                <div className="font-medium text-sm">{category.code}</div>
                <div className="text-xs text-gray-600 truncate">{category.description}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    Total: {category.total_count || 0}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {category.actual_count || 0} items
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {selectedCategory ? selectedCategory.code : 'Select Category'}
              </CardTitle>
              {selectedCategory && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search serial numbers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCategory ? (
              <div className="text-center py-12 text-gray-500">
                Select a category to view items
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No items found
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.serial_number}</div>
                      {item.container && (
                        <div className="text-sm text-gray-600">{item.container}</div>
                      )}
                      {item.assigned_to_technician && (
                        <div className="flex items-center gap-1 text-sm text-blue-600 mt-1">
                          <User className="w-3 h-3" />
                          {item.assigned_to_technician}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                      {item.date_adjusted && (
                        <span className="text-xs text-gray-500">
                          {new Date(item.date_adjusted).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}