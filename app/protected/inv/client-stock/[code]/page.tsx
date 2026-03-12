'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AssignClientStockModal from '@/components/inv/components/AssignClientStockModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ClientStockItem = {
  id: number;
  created_at: string;
  company?: string | null;
  category_code: string;
  serial_number: string;
  status: string | null;
  assigned_to_technician: string | null;
  notes: string | null;
  inventory_categories?: {
    description?: string | null;
  } | null;
};

export default function ClientStockDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const rawCode = params?.code ? String(params.code) : '';
  const costCode = useMemo(() => {
    try {
      return decodeURIComponent(rawCode);
    } catch {
      return rawCode;
    }
  }, [rawCode]);

  const [items, setItems] = useState<ClientStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchItems = async () => {
    if (!costCode) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/client-stock/items?cost_code=${encodeURIComponent(costCode)}`);
      if (!response.ok) {
        setItems([]);
        return;
      }
      const data = await response.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costCode]);

  const getStatusClasses = (status: string | null) => {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'IN STOCK') return 'bg-green-100 text-green-700';
    if (normalized === 'OUT OF STOCK') return 'bg-red-100 text-red-700';
    if (normalized === 'ASSIGNED') return 'bg-blue-100 text-blue-700';
    if (normalized === 'RESERVED') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-700';
  };

  const filteredItems = items.filter((item) => {
    const normalizedStatus = (item.status || '').toLowerCase();
    const statusMatch = statusFilter === 'all' || normalizedStatus === statusFilter;
    if (!statusMatch) return false;
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    const category = (item.inventory_categories?.description || item.category_code || '').toLowerCase();
    const serial = (item.serial_number || '').toLowerCase();
    const technician = (item.assigned_to_technician || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    return (
      category.includes(query) ||
      serial.includes(query) ||
      technician.includes(query) ||
      notes.includes(query)
    );
  });

  const clientName = items[0]?.company || 'Client';

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/protected/inv')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Client Stock</h2>
            <p className="text-sm text-gray-600">
              {clientName} - {costCode}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{filteredItems.length} items</Badge>
          <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAssignModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Package className="mr-2 h-4 w-4" />
            Assign Stock
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in stock">In Stock</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="out of stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search stock list..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading stock...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-10 text-center text-sm text-gray-600">
          No stock items found for this client.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Category</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Notes</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">Date Added</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.serial_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.inventory_categories?.description || item.category_code}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold ${getStatusClasses(item.status)}`}>
                      {item.status || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.assigned_to_technician || 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.notes || '-'}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAssignModal && (
        <AssignClientStockModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          client={{ cost_code: costCode, company: clientName }}
          onAssigned={fetchItems}
        />
      )}
    </div>
  );
}
