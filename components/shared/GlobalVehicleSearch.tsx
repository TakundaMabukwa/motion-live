'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ChevronRight,
  MapPin,
  BadgeInfo,
  Calendar,
  ClipboardList,
  User,
  Link as LinkIcon,
  FileText,
  Eye,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import EditFinalizeModal from '@/components/fc/EditFinalizeModal';

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

type JobCardSearchItem = {
  id: number | string;
  job_number?: string | null;
  customer_name?: string | null;
  new_account_number?: string | null;
  vehicle_registration?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  job_type?: string | null;
  status?: string | null;
  job_status?: string | null;
  priority?: string | null;
  role?: string | null;
  created_at?: string | null;
  due_date?: string | null;
  completion_date?: string | null;
};

type VehicleIpSearchItem = {
  id: number | string;
  reg?: string | null;
  ip_address?: string | null;
  matched_column?: string | null;
  company?: string | null;
  fleet_number?: string | null;
  make?: string | null;
  model?: string | null;
};

type InventorySearchItem = {
  id: number | string;
  serial_number?: string | null;
  category_code?: string | null;
  status?: string | null;
  container?: string | null;
  direction?: string | null;
  company?: string | null;
  assigned_to_technician?: string | null;
  notes?: string | null;
  category_description?: string | null;
};

type SearchResultItem =
  | ({ resultType: 'vehicle' } & VehicleSearchItem)
  | ({ resultType: 'job_card' } & JobCardSearchItem)
  | ({ resultType: 'vehicle_ip' } & VehicleIpSearchItem)
  | ({ resultType: 'inventory_item' } & InventorySearchItem);

type DetailRecord = Record<string, unknown>;
type DetailType = 'vehicle' | 'job_card' | 'vehicle_ip' | 'inventory_item' | null;

const formatLabel = (key: string) =>
  key
    .replace(/^_+/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const VEHICLE_DETAIL_FIELD_ORDER = [
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

const JOB_DETAIL_FIELD_ORDER = [
  'job_number',
  'job_date',
  'due_date',
  'completion_date',
  'status',
  'job_status',
  'job_type',
  'priority',
  'customer_name',
  'customer_email',
  'customer_phone',
  'customer_address',
  'new_account_number',
  'vehicle_registration',
  'vehicle_make',
  'vehicle_model',
  'vehicle_year',
  'job_description',
  'job_location',
  'technician_name',
  'technician_phone',
  'role',
  'quotation_number',
  'quote_status',
  'order_number',
  'work_notes',
  'completion_notes',
  'special_instructions',
  'access_requirements',
  'site_contact_person',
  'site_contact_phone',
  'created_at',
  'updated_at',
];

const VEHICLE_IP_DETAIL_FIELD_ORDER = [
  'reg',
  'ip_address',
  'matched_column',
  'fleet_number',
  'company',
  'make',
  'model',
  'new_account_number',
];

const INVENTORY_DETAIL_FIELD_ORDER = [
  'serial_number',
  'category_description',
  'category_code',
  'status',
  'container',
  'direction',
  'company',
  'assigned_to_technician',
  'notes',
];

const normalizeDetailEntries = (record: DetailRecord, orderedKeys: string[]) => {
  const priorityEntries = orderedKeys
    .filter((key) => key in record)
    .map((key) => [key, record[key]] as const);

  const remainingEntries = Object.entries(record)
    .filter(([key]) => !orderedKeys.includes(key))
    .sort(([left], [right]) => left.localeCompare(right));

  return [...priorityEntries, ...remainingEntries];
};

const looksLikeUrl = (value: string) => /^https?:\/\//i.test(value.trim());

const formatStructuredValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed;
  }
  return value;
};

function renderValue(value: unknown) {
  const normalized = formatStructuredValue(value);
  if (normalized === null) {
    return <span>-</span>;
  }

  if (typeof normalized === 'string') {
    if (looksLikeUrl(normalized)) {
      return (
        <a
          href={normalized}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 break-all text-blue-600 underline underline-offset-2"
        >
          <LinkIcon className="h-3.5 w-3.5 shrink-0" />
          {normalized}
        </a>
      );
    }

    return <span>{normalized}</span>;
  }

  if (Array.isArray(normalized)) {
    if (normalized.length === 0) return <span>-</span>;

    return (
      <div className="space-y-1">
        {normalized.map((item, index) => {
          if (typeof item === 'string' && looksLikeUrl(item)) {
            return (
              <a
                key={`${item}-${index}`}
                href={item}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-blue-600 underline underline-offset-2"
              >
                {item}
              </a>
            );
          }

          if (typeof item === 'object' && item !== null) {
            const entries = Object.entries(item as Record<string, unknown>);
            return (
              <div key={index} className="text-sm">
                {entries.map(([k, v]) => (
                  <span key={k}>
                    <span className="font-medium text-slate-600">{formatLabel(k)}:</span>{' '}
                    <span>{v !== null && v !== undefined ? String(v) : '-'}</span>
                    {index < entries.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </div>
            );
          }

          return <div key={index}>{String(item)}</div>;
        })}
      </div>
    );
  }

  if (typeof normalized === 'object') {
    const entries = Object.entries(normalized as Record<string, unknown>);
    if (entries.length === 0) return <span>-</span>;
    return (
      <div className="space-y-0.5 text-sm">
        {entries.map(([k, v]) => (
          <div key={k}>
            <span className="font-medium text-slate-600">{formatLabel(k)}:</span>{' '}
            <span>{v !== null && v !== undefined ? String(v) : '-'}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(normalized)}</span>;
}

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

function DetailSkeleton() {
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
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedResultKey, setSelectedResultKey] = useState('');
  const [selectedDetailType, setSelectedDetailType] = useState<DetailType>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailRecord, setDetailRecord] = useState<DetailRecord | null>(null);
  const detailCacheRef = useRef<Record<string, DetailRecord>>({});
  const router = useRouter();
  const [editFinalizeOpen, setEditFinalizeOpen] = useState(false);
  const [editFinalizeJob, setEditFinalizeJob] = useState<JobCardSearchItem | null>(null);

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
      setSelectedResultKey('');
      setSelectedDetailType(null);
      setDetailRecord(null);
      return;
    }

    const trimmedSearch = search.trim();
    if (trimmedSearch.length < 2) {
      setResults([]);
      setSelectedResultKey('');
      setSelectedDetailType(null);
      setDetailRecord(null);
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
          throw new Error('Failed to search records');
        }

        const data = await response.json();
        const vehicles = Array.isArray(data?.vehicles)
          ? data.vehicles.map((vehicle: VehicleSearchItem) => ({ ...vehicle, resultType: 'vehicle' as const }))
          : [];
        const jobCards = Array.isArray(data?.job_cards)
          ? data.job_cards.map((job: JobCardSearchItem) => ({ ...job, resultType: 'job_card' as const }))
          : [];
        const vehicleIps = Array.isArray(data?.vehicle_ips)
          ? data.vehicle_ips.map((item: VehicleIpSearchItem) => ({ ...item, resultType: 'vehicle_ip' as const }))
          : [];
        const inventoryItems = Array.isArray(data?.inventory_items)
          ? data.inventory_items.map((item: InventorySearchItem) => ({ ...item, resultType: 'inventory_item' as const }))
          : [];
        setResults([...jobCards, ...vehicles, ...vehicleIps, ...inventoryItems]);
      } catch {
        toast.error('Failed to search vehicles and job cards');
        setResults([]);
      } finally {
        setLoadingResults(false);
      }
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [open, search]);

  const handleSelectResult = useCallback(async (result: SearchResultItem) => {
    const resultId = String(result.id || '');
    const resultKey = `${result.resultType}:${resultId}`;
    setSelectedResultKey(resultKey);
    setSelectedDetailType(result.resultType);

    const cached = detailCacheRef.current[resultKey];
    if (cached) {
      setDetailRecord(cached);
      setLoadingDetails(false);
      return;
    }

    // For vehicle_ip and inventory_item, data is already in the result
    if (result.resultType === 'vehicle_ip' || result.resultType === 'inventory_item') {
      detailCacheRef.current[resultKey] = result as DetailRecord;
      setDetailRecord(result as DetailRecord);
      setLoadingDetails(false);
      return;
    }

    setLoadingDetails(true);

    try {
      let detail: DetailRecord | null = null;

      if (result.resultType === 'vehicle') {
        const params = new URLSearchParams({ id: resultId });
        const response = await fetch(`/api/vehicles/details?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load vehicle details');
        }

        const data = await response.json();
        detail = data?.vehicle || null;
      } else {
        const params = new URLSearchParams({ id: resultId });
        const response = await fetch(`/api/job-cards/details?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load job card details');
        }

        const data = await response.json();
        detail = data?.job_card || null;
      }

      if (!detail) {
        throw new Error('No detail record returned');
      }

      detailCacheRef.current[resultKey] = detail;
      setDetailRecord(detail);
    } catch (error) {
      console.error('Global search detail error:', error);
      toast.error(result.resultType === 'vehicle' ? 'Failed to load vehicle details' : 'Failed to load job card details');
      setDetailRecord(null);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (!results.length) {
      setSelectedResultKey('');
      setSelectedDetailType(null);
      setDetailRecord(null);
      return;
    }

    const hasSelectedResult = selectedResultKey
      ? results.some((result) => `${result.resultType}:${String(result.id || '')}` === selectedResultKey)
      : false;

    if (!hasSelectedResult) {
      void handleSelectResult(results[0]);
    }
  }, [results, selectedResultKey, handleSelectResult]);

  const detailEntries = useMemo(() => {
    if (!detailRecord || !selectedDetailType) return [];
    const fieldOrder =
      selectedDetailType === 'vehicle'
        ? VEHICLE_DETAIL_FIELD_ORDER
        : selectedDetailType === 'vehicle_ip'
        ? VEHICLE_IP_DETAIL_FIELD_ORDER
        : selectedDetailType === 'inventory_item'
        ? INVENTORY_DETAIL_FIELD_ORDER
        : JOB_DETAIL_FIELD_ORDER;
    return normalizeDetailEntries(detailRecord, fieldOrder);
  }, [detailRecord, selectedDetailType]);

  const resultCountLabel = useMemo(() => {
    const vehicleCount = results.filter((result) => result.resultType === 'vehicle').length;
    const jobCount = results.filter((result) => result.resultType === 'job_card').length;
    const ipCount = results.filter((result) => result.resultType === 'vehicle_ip').length;
    const inventoryCount = results.filter((result) => result.resultType === 'inventory_item').length;
    return { vehicleCount, jobCount, ipCount, inventoryCount };
  }, [results]);

  return (
    <>
      <div className={launcherClassName}>
        <Button onClick={() => setOpen(true)} className="h-11 px-4 shadow-lg">
          <Search className="mr-2 h-4 w-4" />
          Vehicle Search
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[90vh] max-h-[90vh] w-[97vw] max-w-7xl flex-col overflow-hidden border-0 p-0 shadow-2xl">
          <div className="flex h-full min-h-0 flex-col">
            <DialogHeader className="border-b bg-white px-6 py-4">
              <DialogTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                Global Vehicle And Job Search
              </DialogTitle>
              <DialogDescription>
                Search by registration, fleet number, job number, IP address, or serial number, then click a result to view the full stored record. Shortcut: Ctrl/Cmd + K
              </DialogDescription>
            </DialogHeader>

            <div className="grid h-0 min-h-0 flex-1 grid-cols-1 overflow-hidden bg-slate-100/70 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="flex h-full min-h-0 flex-col overflow-hidden border-r bg-white">
                <div className="border-b p-4">
                  <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span>Quick Find</span>
                    <span className="normal-case tracking-normal text-slate-400">Reg, Fleet, Job #, IP, Serial</span>
                  </div>

                  <Input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search reg, fleet number, job number, IP, or serial..."
                    className="h-10 rounded-xl border-slate-300 bg-slate-50"
                  />
                </div>

                <div className="h-0 min-h-0 flex-1 overflow-y-scroll overscroll-contain">
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
                        <div className="mt-3 font-semibold text-slate-800">Search Vehicles Or Jobs</div>
                        <div className="mt-1 text-sm text-slate-500">Type at least 2 characters to start searching.</div>
                      </div>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                        <div className="font-semibold text-slate-800">No records found</div>
                        <div className="mt-1 text-sm text-slate-500">Try a shorter or more exact reg, fleet number, job number, IP address, or serial number.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3">
                      <div className="px-1 pb-1 text-xs font-medium text-slate-500">
                        {results.length} result{results.length === 1 ? '' : 's'} found: {resultCountLabel.vehicleCount} vehicle{resultCountLabel.vehicleCount === 1 ? '' : 's'}, {resultCountLabel.jobCount} job{resultCountLabel.jobCount === 1 ? '' : 's'}, {resultCountLabel.ipCount} IP{resultCountLabel.ipCount === 1 ? '' : 's'}, {resultCountLabel.inventoryCount} inventory item{resultCountLabel.inventoryCount === 1 ? '' : 's'}
                      </div>

                      {results.map((result) => {
                        const resultId = String(result.id || '');
                        const resultKey = `${result.resultType}:${resultId}`;
                        const isSelected = selectedResultKey === resultKey;
                        const isVehicle = result.resultType === 'vehicle';
                        const isVehicleIp = result.resultType === 'vehicle_ip';
                        const isInventoryItem = result.resultType === 'inventory_item';
                        const Icon = isVehicle ? Car : isVehicleIp ? MapPin : isInventoryItem ? Package : ClipboardList;
                        const title = isVehicle
                          ? String(result.reg || 'No Reg')
                          : isVehicleIp
                          ? String(result.reg || 'No Reg')
                          : isInventoryItem
                          ? String(result.serial_number || 'No Serial')
                          : String(result.job_number || 'No Job Number');
                        const subtitle = isVehicle
                          ? String(result.company || 'No Company')
                          : isVehicleIp
                          ? `IP: ${String(result.ip_address || '')} (${String(result.matched_column || '')})`
                          : isInventoryItem
                          ? `${String(result.category_description || result.category_code || '')} - ${String(result.status || 'Unknown')}`
                          : String(result.customer_name || 'No Customer');

                        return (
                          <button
                            key={resultKey}
                            type="button"
                            onClick={() => void handleSelectResult(result)}
                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50/80 shadow-sm'
                                : 'border-slate-200 bg-white shadow-sm hover:border-blue-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 text-slate-900">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-blue-600'}`}>
                                  <Icon className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate font-semibold leading-none">{title}</div>
                                  <div className="mt-1 truncate text-xs text-slate-500">{subtitle}</div>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-1.5">
                                <Badge variant="outline" className="rounded-full text-[11px]">
                                  {isVehicle ? 'Vehicle' : isVehicleIp ? 'IP Match' : isInventoryItem ? 'Inventory' : 'Job Card'}
                                </Badge>
                                {isVehicle ? (
                                  <Badge variant="outline" className="rounded-full text-[11px]">
                                    Fleet: {String(result.fleet_number || 'N/A')}
                                  </Badge>
                                ) : isVehicleIp ? (
                                  <>
                                    <Badge variant="outline" className="rounded-full text-[11px]">
                                      Fleet: {String(result.fleet_number || 'N/A')}
                                    </Badge>
                                    <Badge variant="outline" className="rounded-full text-[11px]">
                                      {String(result.make || '')} {String(result.model || '')}
                                    </Badge>
                                  </>
                                ) : isInventoryItem ? (
                                  <>
                                    <Badge variant="outline" className="rounded-full text-[11px]">
                                      Status: {String(result.status || 'N/A')}
                                    </Badge>
                                    {result.container ? (
                                      <Badge variant="outline" className="rounded-full text-[11px]">
                                        Container: {String(result.container)}
                                      </Badge>
                                    ) : null}
                                    {result.assigned_to_technician ? (
                                      <Badge variant="outline" className="rounded-full text-[11px]">
                                        Assigned: {String(result.assigned_to_technician)}
                                      </Badge>
                                    ) : null}
                                  </>
                                ) : (
                                  <Badge variant="outline" className="rounded-full text-[11px]">
                                    Account: {String(result.new_account_number || 'N/A')}
                                  </Badge>
                                )}
                                {!isVehicle && !isVehicleIp && !isInventoryItem && result.vehicle_registration ? (
                                  <Badge variant="outline" className="rounded-full text-[11px]">
                                    Reg: {String(result.vehicle_registration)}
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

              <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50/70">
                {loadingDetails ? (
                  <DetailSkeleton />
                ) : !detailRecord || !selectedDetailType ? (
                  <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-blue-600">
                        <Search className="h-4 w-4" />
                      </div>
                      <div className="mt-3 font-semibold text-slate-800">No record selected</div>
                      <div className="mt-1 text-sm text-slate-500">Choose a search result to load all stored details.</div>
                    </div>
                  </div>
                ) : selectedDetailType === 'job_card' ? (
                  <div className="h-0 min-h-0 flex-1 overflow-y-scroll overscroll-contain p-5 pb-10">
                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Job Board</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-xs font-medium text-slate-700">{String(detailRecord.job_number || 'N/A')}</span>
                          </div>
                          <h2 className="text-xl font-bold text-slate-900">Job Card: {String(detailRecord.job_number || 'N/A')}</h2>
                        </div>
                        <Badge className={`ml-2 ${String(detailRecord.status || '').toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {String(detailRecord.status || 'N/A')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOpen(false);
                            setEditFinalizeJob(detailRecord as JobCardSearchItem);
                            setEditFinalizeOpen(true);
                          }}
                        >
                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                          Edit & Finalize
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOpen(false);
                            router.push(`/protected/fc/jobs/${detailRecord.id}`);
                          }}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>
                      </div>
                    </div>

                    {/* Top 3 cards: Role, Job Status, Approval */}
                    <div className="mb-4 grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
                          <User className="h-3.5 w-3.5" />
                          Dispatch Role
                        </div>
                        <div className="mt-1 text-sm font-semibold text-blue-900">{String(detailRecord.role || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <ClipboardList className="h-3.5 w-3.5" />
                          Job Status
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.job_status || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <BadgeInfo className="h-3.5 w-3.5" />
                          Approval Status
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.quote_status || 'N/A')}</div>
                      </div>
                    </div>

                    {/* Core Job Details + Assigned Technician */}
                    <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                          <h3 className="text-sm font-semibold text-slate-800">Core Job Details</h3>
                          <span className="text-xs text-slate-400">Last updated 2 hours ago</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm md:grid-cols-4">
                          <div>
                            <span className="text-slate-500">Job Type</span>
                            <p className="font-medium text-slate-900">{String(detailRecord.job_type || 'N/A')}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Priority</span>
                            <p className="font-medium text-slate-900">{String(detailRecord.priority || 'N/A')}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Customer Name</span>
                            <p className="font-medium text-slate-900">{String(detailRecord.customer_name || 'N/A')}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Vehicle Reg</span>
                            <p className="font-medium text-slate-900">{String(detailRecord.vehicle_registration || 'N/A')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Assigned Technician */}
                      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b px-4 py-3">
                          <h3 className="text-sm font-semibold text-slate-800">Assigned Technician</h3>
                        </div>
                        <div className="p-4">
                          {detailRecord.technician_name ? (
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                <User className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{String(detailRecord.technician_name)}</p>
                                <p className="text-xs text-slate-500">Service Field Engineer</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No technician assigned</p>
                          )}
                          {detailRecord.technician_phone && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                              <span>{String(detailRecord.technician_phone)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Job Info + Vehicle Details + Financial Summary */}
                    <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                      {/* Job Information */}
                      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b px-4 py-3">
                          <h3 className="text-sm font-semibold text-slate-800">Job Information</h3>
                        </div>
                        <div className="space-y-3 p-4 text-sm">
                          <div>
                            <span className="text-slate-500">Description</span>
                            <p className="mt-0.5 text-slate-900">{String(detailRecord.job_description || 'N/A')}</p>
                          </div>
                          {detailRecord.job_location && (
                            <div>
                              <span className="text-slate-500">Location</span>
                              <p className="mt-0.5 text-slate-900">{String(detailRecord.job_location)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vehicle Details */}
                      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b px-4 py-3">
                          <h3 className="text-sm font-semibold text-slate-800">Vehicle Details</h3>
                        </div>
                        <div className="space-y-3 p-4 text-sm">
                          <div>
                            <span className="text-slate-500">Make / Model</span>
                            <p className="font-medium text-slate-900">{[detailRecord.vehicle_make, detailRecord.vehicle_model].filter(Boolean).join(' ') || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Registration</span>
                            <p className="font-medium text-slate-900">{String(detailRecord.vehicle_registration || 'N/A')}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Year</span>
                            <p className="font-medium text-slate-900">{String(detailRecord.vehicle_year || 'N/A')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-sm">
                        <h3 className="text-sm font-semibold text-blue-100">Financial Summary</h3>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Quoted Total</span>
                            <span className="font-semibold">{detailRecord.quotation_total_amount ? `R ${detailRecord.quotation_total_amount}` : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Actual Total</span>
                            <span className="font-semibold">{detailRecord.actual_cost ? `R ${detailRecord.actual_cost}` : 'N/A'}</span>
                          </div>
                        </div>
                        {detailRecord.quote_status && (
                          <div className="mt-3 rounded-lg bg-white/20 px-3 py-2">
                            <div className="text-xs text-blue-200">Quote Status</div>
                            <div className="mt-0.5 text-sm font-semibold">{String(detailRecord.quote_status)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Full Record Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-800">Full Record</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Field</th>
                              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailEntries.map(([key, value], index) => (
                              <tr key={key} className={`border-t align-top ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                <td className="w-[180px] px-4 py-2 font-medium text-slate-600">{formatLabel(key)}</td>
                                <td className="break-words whitespace-pre-wrap px-4 py-2 text-slate-900">{renderValue(value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : selectedDetailType === 'vehicle_ip' ? (
                  /* Vehicle IP detail view */
                  <div className="h-0 min-h-0 flex-1 overflow-y-scroll overscroll-contain p-5 pb-10">
                    {/* Header */}
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">IP Match: {String(detailRecord.ip_address || 'N/A')}</h2>
                        <p className="text-sm text-slate-500">Found on vehicle {String(detailRecord.reg || 'N/A')}</p>
                      </div>
                    </div>

                    {/* Summary cards */}
                    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-600">
                          <MapPin className="h-3.5 w-3.5" />
                          IP Address
                        </div>
                        <div className="mt-1 text-sm font-semibold text-amber-900">{String(detailRecord.ip_address || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <Car className="h-3.5 w-3.5" />
                          Registration
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.reg || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <BadgeInfo className="h-3.5 w-3.5" />
                          Matched Column
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.matched_column || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <Car className="h-3.5 w-3.5" />
                          Make / Model
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{[detailRecord.make, detailRecord.model].filter(Boolean).join(' ') || 'N/A'}</div>
                      </div>
                    </div>

                    {/* Full Record Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-800">Full Record</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Field</th>
                              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailEntries.map(([key, value], index) => (
                              <tr key={key} className={`border-t align-top ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                <td className="w-[180px] px-4 py-2 font-medium text-slate-600">{formatLabel(key)}</td>
                                <td className="break-words whitespace-pre-wrap px-4 py-2 text-slate-900">{renderValue(value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : selectedDetailType === 'inventory_item' ? (
                  /* Inventory Item detail view */
                  <div className="h-0 min-h-0 flex-1 overflow-y-scroll overscroll-contain p-5 pb-10">
                    {/* Header */}
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Inventory: {String(detailRecord.serial_number || 'N/A')}</h2>
                        <p className="text-sm text-slate-500">{String(detailRecord.category_description || detailRecord.category_code || '')}</p>
                      </div>
                    </div>

                    {/* Summary cards */}
                    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
                          <Package className="h-3.5 w-3.5" />
                          Status
                        </div>
                        <div className="mt-1 text-sm font-semibold text-emerald-900">{String(detailRecord.status || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <Package className="h-3.5 w-3.5" />
                          Serial Number
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.serial_number || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <BadgeInfo className="h-3.5 w-3.5" />
                          Category
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.category_code || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          Container
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.container || 'N/A')}</div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Assigned To Technician</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.assigned_to_technician || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="text-xs font-medium text-slate-500">Direction</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.direction || 'N/A')}</div>
                      </div>
                      {detailRecord.notes ? (
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:col-span-2">
                          <div className="text-xs font-medium text-slate-500">Notes</div>
                          <div className="mt-1 text-sm text-slate-900">{String(detailRecord.notes)}</div>
                        </div>
                      ) : null}
                    </div>

                    {/* Full Record Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-800">Full Record</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Field</th>
                              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailEntries.map(([key, value], index) => (
                              <tr key={key} className={`border-t align-top ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                <td className="w-[180px] px-4 py-2 font-medium text-slate-600">{formatLabel(key)}</td>
                                <td className="break-words whitespace-pre-wrap px-4 py-2 text-slate-900">{renderValue(value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Vehicle detail view */
                  <div className="h-0 min-h-0 flex-1 overflow-y-scroll overscroll-contain p-5 pb-10">
                    {/* Header */}
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Car className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Vehicle: {String(detailRecord.reg || 'N/A')}</h2>
                        <p className="text-sm text-slate-500">{String(detailRecord.company || '')}</p>
                      </div>
                    </div>

                    {/* Summary cards */}
                    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <Car className="h-3.5 w-3.5" />
                          Make / Model
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{[detailRecord.make, detailRecord.model].filter(Boolean).join(' ') || 'N/A'}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          Year
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.year || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          Branch
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.branch || 'N/A')}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <BadgeInfo className="h-3.5 w-3.5" />
                          Validated
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{String(detailRecord.vehicle_validated ?? 'N/A')}</div>
                      </div>
                    </div>

                    {/* Full Record Table */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-800">Full Vehicle Record</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Field</th>
                              <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailEntries.map(([key, value], index) => (
                              <tr key={key} className={`border-t align-top ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                <td className="w-[180px] px-4 py-2 font-medium text-slate-600">{formatLabel(key)}</td>
                                <td className="break-words whitespace-pre-wrap px-4 py-2 text-slate-900">{renderValue(value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditFinalizeModal
        job={editFinalizeJob}
        open={editFinalizeOpen}
        onOpenChange={setEditFinalizeOpen}
        onComplete={() => {
          setEditFinalizeJob(null);
        }}
      />
    </>
  );
}

