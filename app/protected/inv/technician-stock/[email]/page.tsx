'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Search, Package, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AssignTechStockModal from '@/components/inv/components/AssignTechStockModal';
import { toast } from 'sonner';

type TechnicianStockItem = {
  row_id?: string;
  id?: string | number;
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

type TechnicianOption = {
  technician_email: string | null;
  display_name?: string | null;
};

const getItemQuantity = (item: TechnicianStockItem) => {
  const parsed = Number(item.quantity ?? 0);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
};

const isCleanTechnicianEmail = (value: unknown) => {
  const email = String(value || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return false;
  const [localPart] = email.split('@');
  if (!localPart) return false;
  return !localPart.includes('.');
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
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedTransferItem, setSelectedTransferItem] =
    useState<TechnicianStockItem | null>(null);
  const [targetTechnicianEmail, setTargetTechnicianEmail] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferring, setTransferring] = useState(false);

  const fetchItems = async () => {
    if (!technicianEmail) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/tech-stock/items?technician_email=${encodeURIComponent(technicianEmail)}`,
        { cache: 'no-store' },
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

  const fetchTechnicians = async () => {
    setLoadingTechnicians(true);
    try {
      const [stockResponse, allTechResponse] = await Promise.all([
        fetch('/api/tech-stock/technicians', { cache: 'no-store' }),
        fetch('/api/technicians', { cache: 'no-store' }),
      ]);

      const merged = new Map<string, TechnicianOption>();

      if (stockResponse.ok) {
        const stockData = await stockResponse.json().catch(() => ({}));
        const stockTechs = Array.isArray(stockData?.technicians)
          ? stockData.technicians
          : [];

        stockTechs.forEach((tech: TechnicianOption) => {
          const email = String(tech?.technician_email || '')
            .trim()
            .toLowerCase();
          if (!isCleanTechnicianEmail(email)) return;
          if (!email) return;
          merged.set(email, {
            technician_email: email,
            display_name: tech?.display_name || null,
          });
        });
      }

      if (allTechResponse.ok) {
        const allTechData = await allTechResponse.json().catch(() => ({}));
        const allTechs = Array.isArray(allTechData?.technicians)
          ? allTechData.technicians
          : [];

        allTechs.forEach(
          (tech: { email?: string | null; name?: string | null }) => {
            const email = String(tech?.email || '')
              .trim()
              .toLowerCase();
            if (!isCleanTechnicianEmail(email)) return;
            if (!email) return;
            const existing = merged.get(email);
            merged.set(email, {
              technician_email: email,
              display_name:
                existing?.display_name || String(tech?.name || '').trim() || null,
            });
          },
        );
      }

      const technicianList = Array.from(merged.values()).sort((a, b) => {
        const aName = String(a.display_name || a.technician_email || '').toLowerCase();
        const bName = String(b.display_name || b.technician_email || '').toLowerCase();
        return aName.localeCompare(bName);
      });

      setTechnicians(technicianList);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchTechnicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicianEmail]);

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true;
    const query = searchTerm.toLowerCase();
    const code = (item.code || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const serial = String(item.serial_number || item.ip_address || '').toLowerCase();
    const supplier = (item.supplier || '').toLowerCase();
    return (
      code.includes(query) ||
      description.includes(query) ||
      serial.includes(query) ||
      supplier.includes(query)
    );
  });

  const transferTargets = useMemo(
    () =>
      technicians.filter(
        (tech) =>
          String(tech.technician_email || '').trim().toLowerCase() !==
          String(technicianEmail || '').trim().toLowerCase(),
      ),
    [technicians, technicianEmail],
  );
  const hasTransferTargets = transferTargets.length > 0;

  const openTransferDialog = (item: TechnicianStockItem) => {
    const safeQuantity = getItemQuantity(item);
    setSelectedTransferItem(item);
    setTransferQuantity(safeQuantity >= 1 ? 1 : safeQuantity);
    setTargetTechnicianEmail('');
    setShowTransferDialog(true);
  };

  const handleTransferItem = async () => {
    if (!selectedTransferItem) {
      toast.error('No item selected for transfer');
      return;
    }

    if (!targetTechnicianEmail) {
      toast.error('Select a technician to receive stock');
      return;
    }

    const maxQuantity = getItemQuantity(selectedTransferItem);
    const safeTransferQuantity = Math.max(
      1,
      Math.min(maxQuantity, Number(transferQuantity) || 1),
    );

    setTransferring(true);
    try {
      const response = await fetch('/api/tech-stock/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_technician_email: technicianEmail,
          target_technician_email: targetTechnicianEmail,
          item: selectedTransferItem,
          quantity: safeTransferQuantity,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to transfer stock');
      }

      const destinationEmail = String(
        payload?.target_technician_email || targetTechnicianEmail || '',
      )
        .trim()
        .toLowerCase();
      const movedCode = String(
        payload?.item_code || selectedTransferItem?.code || '',
      ).trim();

      toast.success('Stock transferred successfully');
      setShowTransferDialog(false);
      setSelectedTransferItem(null);
      setTargetTechnicianEmail('');
      setTransferQuantity(1);
      await fetchTechnicians();

      if (
        destinationEmail &&
        destinationEmail !== String(technicianEmail || '').trim().toLowerCase()
      ) {
        const targetPath = `/protected/inv/technician-stock/${encodeURIComponent(destinationEmail)}`;
        const query = movedCode
          ? `?moved=${encodeURIComponent(movedCode)}`
          : '';
        router.push(`${targetPath}${query}`);
      } else {
        fetchItems();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to transfer stock',
      );
    } finally {
      setTransferring(false);
    }
  };

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
                <th className="px-4 py-3 border-b border-blue-100 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr
                  key={
                    item.row_id ||
                    String(item.id || item.stock_id || `${item.serial_number || item.ip_address || 'item'}-${index}`)
                  }
                  className="hover:bg-gray-50"
                >
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
                  <td className="px-4 py-3 border-b border-gray-100 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openTransferDialog(item)}
                      disabled={!hasTransferTargets}
                    >
                      <SendHorizontal className="mr-2 h-4 w-4" />
                      Transfer
                    </Button>
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

      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transfer Technician Stock</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="font-medium text-gray-900">
                {selectedTransferItem?.description || selectedTransferItem?.code || 'Item'}
              </div>
              <div className="mt-1 text-gray-600">
                Code: {selectedTransferItem?.code || 'N/A'}
              </div>
              <div className="text-gray-600">
                Available: {selectedTransferItem ? getItemQuantity(selectedTransferItem) : 1}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Send To Technician
              </label>
              <select
                value={targetTechnicianEmail}
                onChange={(event) => setTargetTechnicianEmail(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                disabled={loadingTechnicians || transferring}
              >
                <option value="">Select technician</option>
                {transferTargets.map((tech) => {
                  const email = String(tech.technician_email || '').trim().toLowerCase();
                  if (!email) return null;
                  return (
                    <option key={email} value={email}>
                      {tech.display_name ? `${tech.display_name} (${email})` : email}
                    </option>
                  );
                })}
              </select>
              {!hasTransferTargets ? (
                <p className="mt-1 text-xs text-amber-600">
                  No other technicians available for transfer.
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <Input
                type="number"
                min={1}
                max={
                  selectedTransferItem
                    ? getItemQuantity(selectedTransferItem)
                    : 1
                }
                value={transferQuantity}
                onChange={(event) =>
                  setTransferQuantity(
                    Number.isFinite(Number(event.target.value))
                      ? Number(event.target.value)
                      : 1,
                  )
                }
                disabled={transferring}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTransferDialog(false)}
                disabled={transferring}
              >
                Cancel
              </Button>
              <Button onClick={handleTransferItem} disabled={transferring}>
                {transferring ? 'Transferring...' : 'Transfer Stock'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
