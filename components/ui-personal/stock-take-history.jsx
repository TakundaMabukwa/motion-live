'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  History,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

export default function StockTakeHistory() {
  const [stockTakeHistory, setStockTakeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    fetchStockTakeHistory();
  }, []);

  const fetchStockTakeHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stock/stock-take');
      if (!response.ok) {
        throw new Error('Failed to fetch stock take history');
      }
      const data = await response.json();
      setStockTakeHistory(data.stock_take_history || []);
    } catch (error) {
      console.error('Error fetching stock take history:', error);
      toast.error('Failed to load stock take history');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = stockTakeHistory.filter(item => {
    const matchesSearch = 
      item.stock_item?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.stock_item?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'increases' && item.difference > 0) return matchesSearch;
    if (selectedFilter === 'decreases' && item.difference < 0) return matchesSearch;
    if (selectedFilter === 'no-change' && item.difference === 0) return matchesSearch;
    
    return false;
  });

  const getDifferenceColor = (difference) => {
    if (difference > 0) return 'text-green-600';
    if (difference < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getDifferenceIcon = (difference) => {
    if (difference > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (difference < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <span className="ml-2">Loading stock take history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-2xl">Stock Take History</h2>
          <p className="text-gray-600">View all stock take activities and changes</p>
        </div>
        <Button onClick={fetchStockTakeHistory} variant="outline" size="sm">
          <RefreshCw className="mr-2 w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="top-1/2 left-3 absolute w-4 h-4 text-gray-400 -translate-y-1/2 transform" />
          <Input
            placeholder="Search by item description, code, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="all">All Changes</option>
          <option value="increases">Increases Only</option>
          <option value="decreases">Decreases Only</option>
          <option value="no-change">No Change</option>
        </select>
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="py-12 text-center">
          <History className="mx-auto mb-4 w-12 h-12 text-gray-400" />
          <h3 className="mb-2 font-medium text-gray-900 text-lg">No stock take history found</h3>
          <p className="text-gray-500">
            {searchTerm || selectedFilter !== 'all' 
              ? 'No stock take activities match your search criteria.' 
              : 'No stock take activities have been recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <h3 className="font-medium text-gray-900">
                        {item.stock_item?.description || 'Unknown Item'}
                      </h3>
                      {item.stock_item?.code && (
                        <Badge variant="outline" className="text-xs">
                          {String(item.stock_item.code)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="gap-4 grid grid-cols-2 md:grid-cols-4 text-sm">
                      <div>
                        <span className="text-gray-500">Previous:</span>
                        <span className="ml-2 font-medium">{item.previous_quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">New:</span>
                        <span className="ml-2 font-medium">{item.new_quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Difference:</span>
                        <span className={`ml-2 font-medium ${getDifferenceColor(item.difference)}`}>
                          {item.difference > 0 ? '+' : ''}{item.difference}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <span className="ml-2 font-medium">{formatDate(item.stock_take_date)}</span>
                      </div>
                    </div>

                    {item.notes && (
                      <div className="mt-2 text-gray-600 text-sm">
                        <span className="font-medium">Notes:</span> {item.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getDifferenceIcon(item.difference)}
                  </div>
                </div>

                {/* Additional Details */}
                <div className="mt-3 pt-3 border-gray-100 border-t">
                  <div className="flex justify-between items-center text-gray-500 text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    {item.performed_by && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>User ID: {item.performed_by.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredHistory.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-blue-800">Summary</h3>
                <p className="text-blue-700 text-sm">
                  {filteredHistory.length} stock take activities found
                </p>
              </div>
              <div className="text-right">
                <div className="text-blue-700 text-sm">
                  Total Changes: {filteredHistory.reduce((sum, item) => sum + Math.abs(item.difference), 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 