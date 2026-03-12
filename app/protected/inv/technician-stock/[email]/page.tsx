'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AssignTechStockModal from '@/components/inv/components/AssignTechStockModal';

type TechnicianStockItem = {
  code?: string;
  description?: string;
  quantity?: number;
  stock_id?: string | number;
  supplier?: string;
  ip_address?: string;
  serial_number?: string;
  total_cost?: number;
  cost_per_unit?: number;
};

export default function TechnicianStockDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const rawEmail = params?.email ? String(params.email) : '';
  const technicianEmail = useMemo(() => {
    try {
      return decodeURIComponent(rawEmail);
    } catch {
      return rawEmail;
    }
  }, [rawEmail]);

  const [items, setItems] = useState<TechnicianStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchItems = async () => {
    if (!technicianEmail) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/tech-stock/items?technician_email=${encodeURIComponent(technicianEmail)}`
      );
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
  }, [technicianEmail]);

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    const code = (item.code || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const serial = (item.serial_number || '').toLowerCase();
    const supplier = (item.supplier || '').toLowerCase();
    return (
      code.includes(query) ||
      description.includes(query) ||
      serial.includes(query) ||
      supplier.includes(query)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/protected/inv')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Technician Stock</h2>
            <p className="text-sm text-gray-600">{technicianEmail}</p>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
        <Input
          placeholder="Search assigned parts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading stock...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-10 text-center text-sm text-gray-600">
          No assigned parts found for this technician.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-3 border-b border-blue-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 border-b border-blue-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 border-b border-blue-100 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 border-b border-blue-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-3 border-b border-blue-100 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Serial / IP</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr key={`${item.code || 'item'}-${item.serial_number || item.ip_address || index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-800 font-medium">
                    {item.code || 'N/A'}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-700">
                    {item.description || 'N/A'}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-sm text-center">
                    <Badge variant="outline" className="text-xs">{item.quantity ?? 1}</Badge>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-700">
                    {item.supplier || 'N/A'}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-sm text-gray-700">
                    {item.serial_number || item.ip_address || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAssignModal && (
        <AssignTechStockModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          technician={{ technician_email: technicianEmail }}
          onAssigned={fetchItems}
        />
      )}
    </div>
  );
}
