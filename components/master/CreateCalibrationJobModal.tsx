'use client';

import { useEffect, useMemo, useState } from 'react';
import { Wrench, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

type CostCenter = {
  id: string;
  cost_code: string;
  company: string;
};

type VehicleRow = {
  id?: number | string;
  reg?: string | null;
  fleet_number?: string | null;
  make?: string | null;
  model?: string | null;
  year?: string | number | null;
};

const VAT_RATE = 0.15;

const toNumber = (value: string) => {
  const normalized = value.replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function CreateCalibrationJobModal() {
  const [open, setOpen] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loadingCostCenters, setLoadingCostCenters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null);
  const [amountPerVehicle, setAmountPerVehicle] = useState('');
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const fetchCostCenters = async () => {
      setLoadingCostCenters(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('cost_centers')
          .select('id, cost_code, company')
          .order('cost_code', { ascending: true });

        if (error) {
          throw error;
        }

        setCostCenters(data || []);
      } catch (error) {
        console.error('Error loading cost centers:', error);
        toast.error('Failed to load cost centers');
      } finally {
        setLoadingCostCenters(false);
      }
    };

    void fetchCostCenters();
  }, [open]);

  const filteredCostCenters = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return costCenters;
    }

    return costCenters.filter((center) => {
      const code = String(center.cost_code || '').toLowerCase();
      const company = String(center.company || '').toLowerCase();
      return code.includes(normalizedSearch) || company.includes(normalizedSearch);
    });
  }, [costCenters, search]);

  useEffect(() => {
    if (!open || !selectedCostCenter?.cost_code) {
      setVehicles([]);
      setLoadingVehicles(false);
      return;
    }

    const fetchVehicles = async () => {
      setLoadingVehicles(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('vehicles')
          .select('id, reg, fleet_number, make, model, year')
          .eq('new_account_number', selectedCostCenter.cost_code)
          .order('reg', { ascending: true });

        if (error) {
          throw error;
        }

        setVehicles(data || []);
      } catch (error) {
        console.error('Error loading vehicles:', error);
        toast.error('Failed to load vehicles');
        setVehicles([]);
      } finally {
        setLoadingVehicles(false);
      }
    };

    void fetchVehicles();
  }, [open, selectedCostCenter]);

  const handleClose = () => {
    setOpen(false);
    setSearch('');
    setSelectedCostCenter(null);
    setAmountPerVehicle('');
    setVehicles([]);
    setLoadingVehicles(false);
  };

  const vehicleCount = vehicles.length;
  const amountPerVehicleValue = toNumber(amountPerVehicle);
  const subtotalAmount = Number((amountPerVehicleValue * vehicleCount).toFixed(2));
  const vatAmount = Number((subtotalAmount * VAT_RATE).toFixed(2));
  const totalAmount = Number((subtotalAmount + vatAmount).toFixed(2));

  const handleSubmit = async () => {
    if (!selectedCostCenter) {
      toast.error('Please select a cost center');
      return;
    }

    if (amountPerVehicleValue <= 0) {
      toast.error('Please enter the calibration amount per vehicle');
      return;
    }

    if (vehicleCount <= 0) {
      toast.error('No vehicles found for the selected cost center');
      return;
    }

    setSubmitting(true);
    try {

      const response = await fetch('/api/job-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repair: true,
          job_type: 'calibration',
          customerName: selectedCostCenter.company,
          customer_name: selectedCostCenter.company,
          new_account_number: selectedCostCenter.cost_code,
          status: 'completed',
          job_status: 'Completed',
          priority: 'medium',
          role: 'accounts',
          move_to: 'accounts',
          job_date: new Date().toISOString(),
          completion_date: new Date().toISOString(),
          quotationSubtotal: subtotalAmount,
          quotationProducts: vehicles.map((vehicle, index) => ({
            id: vehicle.id || `${selectedCostCenter.cost_code}-${index}` ,
            name: 'Calibration',
            description: `Calibration for ${vehicle.reg || vehicle.fleet_number || `Vehicle ${index + 1}`}` ,
            quantity: 1,
            total_price: amountPerVehicleValue,
            unit_price: amountPerVehicleValue,
            price: amountPerVehicleValue,
            purchase_type: 'purchase',
            vehicle_plate: vehicle.reg || vehicle.fleet_number || '',
            vehicle_id: vehicle.id || null,
            item_code: 'CALIBRATION',
            make: vehicle.make || '',
            model: vehicle.model || '',
            year: vehicle.year || null,
          })),
          quotationVatAmount: vatAmount,
          quotationTotalAmount: totalAmount,
          quotationJobType: 'calibration',
          purchaseType: 'purchase',
          quoteType: 'internal',
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to create calibration job');
      }

      toast.success(
        `Calibration job ${result?.data?.job_number || ''} created. ${result?.calibrationVehicleCount || 0} vehicles flagged.`,
      );
      handleClose();
    } catch (error) {
      console.error('Error creating calibration job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create calibration job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Target className="mr-2 h-4 w-4" />
          Create Calibration Job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Calibration Job
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Job Type</Label>
            <Input value="Calibration" readOnly />
          </div>

          <div className="space-y-2">
            <Label>Select Client / Cost Center</Label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search cost code or company..."
            />
            <div className="max-h-72 overflow-y-auto rounded-md border">
              {loadingCostCenters ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading cost centers...
                </div>
              ) : filteredCostCenters.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500">No cost centers found</div>
              ) : (
                filteredCostCenters.map((center) => {
                  const selected = selectedCostCenter?.id === center.id;
                  return (
                    <button
                      key={center.id}
                      type="button"
                      onClick={() => setSelectedCostCenter(center)}
                      className={`w-full border-b px-3 py-3 text-left last:border-b-0 ${
                        selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">{center.cost_code}</div>
                      <div className="text-sm text-gray-500">{center.company || 'No company name'}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <Label>Amount Per Vehicle Ex VAT</Label>
              <Input
                value={amountPerVehicle}
                onChange={(event) => setAmountPerVehicle(event.target.value)}
                placeholder="Enter amount per vehicle"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicles</Label>
              <Input value={loadingVehicles ? 'Loading...' : String(vehicleCount)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>VAT</Label>
              <Input value={vatAmount.toFixed(2)} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Total Incl VAT</Label>
              <Input value={totalAmount.toFixed(2)} readOnly />
            </div>
          </div>

          <div className="rounded-lg border bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This calibration job will be created straight into Accounts as a completed job card. The invoice subtotal is calculated as amount per vehicle x number of vehicles on the selected cost center.
          </div>

          {selectedCostCenter ? (
            <div className="rounded-lg border bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Creating this job will mark all vehicles with
              {' '}
              <span className="font-semibold">new_account_number = {selectedCostCenter.cost_code}</span>
              {' '}
              as calibration vehicles in both vehicle tables.
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !selectedCostCenter} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Calibration Job'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
