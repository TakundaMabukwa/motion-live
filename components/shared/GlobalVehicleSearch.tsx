'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Car,
  Hash,
  Building2,
  ChevronRight,
  Rows3,
  CarFront,
  MapPin,
  BadgeInfo,
} from 'lucide-react';
import { toast } from 'sonner';

type VehicleSearchItem = {
  id: number | string;
  reg?: string | null;
  fleet_number?: string | null;
  company?: string | null;
  new_account_number?: string | null;
  account_number?: string | null;
  make?: string | null;
  model?: string | null;
  year?: string | null;
  branch?: string | null;
};

type VehicleDetail = Record<string, unknown>;

const formatLabel = (key: string) =>
  key
    .replace(/^_+/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const DETAIL_FIELD_ORDER = [
  'reg',
  'fleet_number',
  'company',
  'account_number',
  'branch',
  'make',
  'model',
  'year',
  'vin',
  'engine',
  'colour',
  'vehicle_validated',
  'total_rental_sub',
  'total_rental',
  'total_sub',
];

const normalizeDetailEntries = (vehicle: VehicleDetail) => {
  const priorityEntries = DETAIL_FIELD_ORDER
    .filter((key) => key in vehicle)
    .map((key) => [key, vehicle[key]] as const);

  const remainingEntries = Object.entries(vehicle)
    .filter(([key]) => !DETAIL_FIELD_ORDER.includes(key))
    .filter(([key]) => key !== 'new_account_number')
    .sort(([left], [right]) => left.localeCompare(right));

  return [...priorityEntries, ...remainingEntries];
};

function SearchResultSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  );
}

function VehicleDetailSkeleton() {
  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 p-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-5 w-28" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-0 border-b bg-slate-50 px-4 py-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[220px_minmax(0,1fr)] items-center border-t px-4 py-3"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-full max-w-[360px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface GlobalVehicleSearchProps {
  launcherClassName?: string;
}

export default function GlobalVehicleSearch({
  launcherClassName = 'fixed bottom-4 right-4 z-50',
}: GlobalVehicleSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loadingResults, setLoadingResults] = useState(false);
  const [results, setResults] = useState<VehicleSearchItem[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetail | null>(null);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setResults([]);
      setSelectedVehicleId('');
      setVehicleDetails(null);
      return;
    }

    const trimmedSearch = search.trim();
    if (trimmedSearch.length < 2) {
      setResults([]);
      setSelectedVehicleId('');
      setVehicleDetails(null);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setLoadingResults(true);
      try {
        const params = new URLSearchParams({
          search: trimmedSearch,
          limit: '20',
        });
        const response = await fetch(`/api/vehicles/global-search?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to search vehicles');
        }

        const data = await response.json();
        const vehicles = Array.isArray(data?.vehicles) ? data.vehicles : [];
        setResults(vehicles);
      } catch (error) {
        console.error('Global vehicle search error:', error);
        toast.error('Failed to search vehicles');
        setResults([]);
      } finally {
        setLoadingResults(false);
      }
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [open, search]);

  const handleSelectVehicle = useCallback(async (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setLoadingDetails(true);

    try {
      const params = new URLSearchParams({ id: vehicleId });
      const response = await fetch(`/api/vehicles/details?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load vehicle details');
      }

      const data = await response.json();
      setVehicleDetails(data?.vehicle || null);
    } catch (error) {
      console.error('Global vehicle detail error:', error);
      toast.error('Failed to load vehicle details');
      setVehicleDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (!results.length) {
      setSelectedVehicleId('');
      setVehicleDetails(null);
      return;
    }

    const hasSelectedVehicle = selectedVehicleId
      ? results.some((vehicle) => String(vehicle.id || '') === selectedVehicleId)
      : false;

    if (!hasSelectedVehicle) {
      void handleSelectVehicle(String(results[0].id || ''));
    }
  }, [results, selectedVehicleId, handleSelectVehicle]);

  const detailEntries = useMemo(
    () => (vehicleDetails ? normalizeDetailEntries(vehicleDetails) : []),
    [vehicleDetails],
  );

  const selectedSummary = useMemo(
    () =>
      vehicleDetails
        ? [
            {
              label: 'Reg',
              value: String(vehicleDetails.reg || 'No Reg'),
              tone: 'primary',
              icon: CarFront,
            },
            {
              label: 'Fleet',
              value: String(vehicleDetails.fleet_number || 'N/A'),
              tone: 'neutral',
              icon: Hash,
            },
            {
              label: 'Cost Center',
              value: String(vehicleDetails.company || 'N/A'),
              tone: 'neutral',
              icon: Building2,
            },
          ]
        : [],
    [vehicleDetails],
  );

  const overviewCards = useMemo(
    () =>
      vehicleDetails
        ? [
            {
              label: 'Make / Model',
              value: [vehicleDetails.make, vehicleDetails.model].filter(Boolean).join(' ') || 'N/A',
              icon: Car,
            },
            {
              label: 'Branch',
              value: String(vehicleDetails.branch || 'N/A'),
              icon: MapPin,
            },
            {
              label: 'Validated',
              value: String(vehicleDetails.vehicle_validated ?? 'N/A'),
              icon: BadgeInfo,
            },
            {
              label: 'Account',
              value: String(vehicleDetails.account_number || 'N/A'),
              icon: Hash,
            },
          ]
        : [],
    [vehicleDetails],
  );

  return (
    <>
      <div className={launcherClassName}>
        <Button
          onClick={() => setOpen(true)}
          className="h-11 px-4 shadow-lg"
        >
          <Search className="mr-2 h-4 w-4" />
          Vehicle Search
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[85vh] w-[95vw] max-w-6xl overflow-hidden border-0 p-0 shadow-2xl">
          <div className="flex h-full flex-col">
            <DialogHeader className="border-b bg-white px-6 py-4">
              <DialogTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                Global Vehicle Search
              </DialogTitle>
              <DialogDescription>
                Search by registration or fleet number, then click a vehicle to view all stored details. Shortcut: Ctrl/Cmd + K
              </DialogDescription>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden bg-slate-100/70 lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="min-h-0 overflow-hidden border-r bg-white">
                <div className="border-b p-4">
                  <div className="mb-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Quick Find
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Search reg or fleet number and jump straight into the vehicle record.
                    </div>
                  </div>

                  <Input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search reg or fleet number..."
                    className="h-10 rounded-xl border-slate-300 bg-slate-50"
                  />
                </div>

                <div className="h-full overflow-y-auto">
                  {loadingResults ? (
                    <div className="space-y-2 p-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <SearchResultSkeleton key={index} />
                      ))}
                    </div>
                  ) : search.trim().length < 2 ? (
                    <div className="p-6">
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                          <Search className="h-4 w-4" />
                        </div>
                        <div className="mt-3 font-semibold text-slate-800">Search Vehicles</div>
                        <div className="mt-1 text-sm text-slate-500">
                          Type at least 2 characters to start searching.
                        </div>
                      </div>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                        <div className="font-semibold text-slate-800">No vehicles found</div>
                        <div className="mt-1 text-sm text-slate-500">
                          Try a shorter or more exact reg or fleet number.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3">
                      <div className="px-1 pb-1 text-xs font-medium text-slate-500">
                        {results.length} vehicle{results.length === 1 ? '' : 's'} found
                      </div>

                      {results.map((vehicle) => {
                        const vehicleId = String(vehicle.id || '');
                        const isSelected = selectedVehicleId === vehicleId;

                        return (
                          <button
                            key={vehicleId}
                            type="button"
                            onClick={() => handleSelectVehicle(vehicleId)}
                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50/80 shadow-sm'
                                : 'border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 text-slate-900">
                                <div
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                    isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-blue-600'
                                  }`}
                                >
                                  <Car className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate font-semibold leading-none">
                                    {vehicle.reg || 'No Reg'}
                                  </div>
                                  <div className="mt-1 truncate text-xs text-slate-500">
                                    {vehicle.company || 'No Company'}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-1.5">
                                <Badge variant="outline" className="rounded-full text-[11px]">
                                  Fleet: {String(vehicle.fleet_number || 'N/A')}
                                </Badge>
                                {vehicle.branch ? (
                                  <Badge variant="outline" className="rounded-full text-[11px]">
                                    {String(vehicle.branch)}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>

                            <ChevronRight className="ml-3 h-4 w-4 text-slate-400" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-0 h-full overflow-hidden bg-slate-50/70">
                {loadingDetails ? (
                  <VehicleDetailSkeleton />
                ) : !vehicleDetails ? (
                  <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-blue-600">
                        <Car className="h-4 w-4" />
                      </div>
                      <div className="mt-3 font-semibold text-slate-800">No vehicle selected</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Choose a search result to load all vehicle details.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-0 overflow-y-auto p-5">
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Rows3 className="h-4 w-4 text-blue-600" />
                        Selected Vehicle
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        {selectedSummary.map((item) => {
                          const Icon = item.icon;
                          const isPrimary = item.tone === 'primary';

                          return (
                            <div
                              key={item.label}
                              className={`rounded-xl border px-3 py-3 ${
                                isPrimary
                                  ? 'border-blue-200 bg-blue-600 text-white'
                                  : 'border-slate-200 bg-white text-slate-900'
                              }`}
                            >
                              <div
                                className={`mb-2 flex items-center gap-2 text-xs font-medium ${
                                  isPrimary ? 'text-blue-100' : 'text-slate-500'
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {item.label}
                              </div>
                              <div className="break-words text-sm font-semibold leading-snug">
                                {item.value}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {overviewCards.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.label}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                          >
                            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                              <Icon className="h-3.5 w-3.5" />
                              {item.label}
                            </div>
                            <div className="break-words text-sm font-semibold text-slate-900">
                              {item.value}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="shrink-0 border-b bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                        Full Vehicle Record
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Field</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailEntries.map(([key, value], index) => (
                            <tr
                              key={key}
                              className={`border-t align-top ${
                                index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                              }`}
                            >
                              <td className="w-[220px] px-4 py-2.5 font-medium text-slate-700">
                                {formatLabel(key)}
                              </td>
                              <td className="break-all whitespace-pre-wrap px-4 py-2.5 text-slate-900">
                                {String(value ?? '').trim() || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
