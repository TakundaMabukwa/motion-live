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
  Hash,
  Building2,
  ChevronRight,
  Rows3,
  CarFront,
  MapPin,
  BadgeInfo,
  Calendar,
  ClipboardList,
  User,
  Wrench,
  Clock3,
  Link as LinkIcon,
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

type SearchResultItem =
  | ({ resultType: 'vehicle' } & VehicleSearchItem)
  | ({ resultType: 'job_card' } & JobCardSearchItem);

type DetailRecord = Record<string, unknown>;
type DetailType = 'vehicle' | 'job_card' | null;

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
  'move_to',
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
      <div className="space-y-2">
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
            return (
              <pre
                key={index}
                className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-700"
              >
                {JSON.stringify(item, null, 2)}
              </pre>
            );
          }

          return <div key={index}>{String(item)}</div>;
        })}
      </div>
    );
  }

  if (typeof normalized === 'object') {
    return (
      <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-700">
        {JSON.stringify(normalized, null, 2)}
      </pre>
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
        setResults([...jobCards, ...vehicles]);
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
    return normalizeDetailEntries(
      detailRecord,
      selectedDetailType === 'vehicle' ? VEHICLE_DETAIL_FIELD_ORDER : JOB_DETAIL_FIELD_ORDER,
    );
  }, [detailRecord, selectedDetailType]);

  const selectedSummary = useMemo(() => {
    if (!detailRecord || !selectedDetailType) return [];

    if (selectedDetailType === 'vehicle') {
      return [
        { label: 'Reg', value: String(detailRecord.reg || 'No Reg'), tone: 'primary', icon: CarFront },
        { label: 'Fleet', value: String(detailRecord.fleet_number || 'N/A'), tone: 'neutral', icon: Hash },
        { label: 'Cost Center', value: String(detailRecord.company || 'N/A'), tone: 'neutral', icon: Building2 },
        {
          label: 'Account',
          value: String(detailRecord.new_account_number || detailRecord.account_number || 'N/A'),
          tone: 'neutral',
          icon: Hash,
        },
      ];
    }

    return [
      { label: 'Job Number', value: String(detailRecord.job_number || 'N/A'), tone: 'primary', icon: ClipboardList },
      { label: 'Customer', value: String(detailRecord.customer_name || 'N/A'), tone: 'neutral', icon: User },
      { label: 'Account', value: String(detailRecord.new_account_number || 'N/A'), tone: 'neutral', icon: Hash },
      { label: 'Vehicle Reg', value: String(detailRecord.vehicle_registration || 'N/A'), tone: 'neutral', icon: CarFront },
    ];
  }, [detailRecord, selectedDetailType]);

  const overviewCards = useMemo(() => {
    if (!detailRecord || !selectedDetailType) return [];

    if (selectedDetailType === 'vehicle') {
      return [
        { label: 'Make / Model', value: [detailRecord.make, detailRecord.model].filter(Boolean).join(' ') || 'N/A', icon: Car },
        { label: 'Branch', value: String(detailRecord.branch || 'N/A'), icon: MapPin },
        { label: 'Validated', value: String(detailRecord.vehicle_validated ?? 'N/A'), icon: BadgeInfo },
        { label: 'VIN', value: String(detailRecord.vin || 'N/A'), icon: Hash },
        { label: 'Year', value: String(detailRecord.year || 'N/A'), icon: Calendar },
        { label: 'Colour', value: String(detailRecord.colour || 'N/A'), icon: BadgeInfo },
        { label: 'Engine', value: String(detailRecord.engine || 'N/A'), icon: BadgeInfo },
      ];
    }

    return [
      { label: 'Job Type', value: String(detailRecord.job_type || 'N/A'), icon: Wrench },
      { label: 'Status', value: String(detailRecord.status || 'N/A'), icon: BadgeInfo },
      { label: 'Job Status', value: String(detailRecord.job_status || 'N/A'), icon: BadgeInfo },
      { label: 'Priority', value: String(detailRecord.priority || 'N/A'), icon: BadgeInfo },
      { label: 'Created', value: String(detailRecord.created_at || 'N/A'), icon: Clock3 },
      { label: 'Due Date', value: String(detailRecord.due_date || 'N/A'), icon: Calendar },
      { label: 'Completion Date', value: String(detailRecord.completion_date || 'N/A'), icon: Calendar },
    ];
  }, [detailRecord, selectedDetailType]);

  const resultCountLabel = useMemo(() => {
    const vehicleCount = results.filter((result) => result.resultType === 'vehicle').length;
    const jobCount = results.filter((result) => result.resultType === 'job_card').length;
    return { vehicleCount, jobCount };
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
                Search by registration, fleet number, or job number, then click a result to view the full stored record. Shortcut: Ctrl/Cmd + K
              </DialogDescription>
            </DialogHeader>

            <div className="grid h-0 min-h-0 flex-1 grid-cols-1 overflow-hidden bg-slate-100/70 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="flex h-full min-h-0 flex-col overflow-hidden border-r bg-white">
                <div className="border-b p-4">
                  <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span>Quick Find</span>
                    <span className="normal-case tracking-normal text-slate-400">Reg, Fleet, Job #</span>
                  </div>

                  <Input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search reg, fleet number, or job number..."
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
                        <div className="mt-1 text-sm text-slate-500">Try a shorter or more exact reg, fleet number, or job number.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3">
                      <div className="px-1 pb-1 text-xs font-medium text-slate-500">
                        {results.length} result{results.length === 1 ? '' : 's'} found: {resultCountLabel.vehicleCount} vehicle{resultCountLabel.vehicleCount === 1 ? '' : 's'}, {resultCountLabel.jobCount} job{resultCountLabel.jobCount === 1 ? '' : 's'}
                      </div>

                      {results.map((result) => {
                        const resultId = String(result.id || '');
                        const resultKey = `${result.resultType}:${resultId}`;
                        const isSelected = selectedResultKey === resultKey;
                        const isVehicle = result.resultType === 'vehicle';
                        const Icon = isVehicle ? Car : ClipboardList;
                        const title = isVehicle ? String(result.reg || 'No Reg') : String(result.job_number || 'No Job Number');
                        const subtitle = isVehicle ? String(result.company || 'No Company') : String(result.customer_name || 'No Customer');

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
                                  {isVehicle ? 'Vehicle' : 'Job Card'}
                                </Badge>
                                {isVehicle ? (
                                  <Badge variant="outline" className="rounded-full text-[11px]">
                                    Fleet: {String(result.fleet_number || 'N/A')}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="rounded-full text-[11px]">
                                    Account: {String(result.new_account_number || 'N/A')}
                                  </Badge>
                                )}
                                {!isVehicle && result.vehicle_registration ? (
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
                ) : (
                  <div className="h-0 min-h-0 flex-1 overflow-y-scroll overscroll-contain p-5 pb-10">
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Rows3 className="h-4 w-4 text-blue-600" />
                        Selected {selectedDetailType === 'vehicle' ? 'Vehicle' : 'Job Card'}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {selectedSummary.map((item) => {
                          const Icon = item.icon;
                          const isPrimary = item.tone === 'primary';

                          return (
                            <div
                              key={item.label}
                              className={`rounded-xl border px-3 py-3 ${
                                isPrimary ? 'border-blue-200 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-900'
                              }`}
                            >
                              <div className={`mb-2 flex items-center gap-2 text-xs font-medium ${isPrimary ? 'text-blue-100' : 'text-slate-500'}`}>
                                <Icon className="h-3.5 w-3.5" />
                                {item.label}
                              </div>
                              <div className="break-words text-sm font-semibold leading-snug">{item.value}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {overviewCards.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                              <Icon className="h-3.5 w-3.5" />
                              {item.label}
                            </div>
                            <div className="break-words text-sm font-semibold text-slate-900">{item.value}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="sticky top-0 z-10 shrink-0 border-b bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                        Full {selectedDetailType === 'vehicle' ? 'Vehicle' : 'Job Card'} Record
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold text-slate-700">Field</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-700">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailEntries.map(([key, value], index) => (
                              <tr key={key} className={`border-t align-top ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                <td className="w-[220px] px-4 py-2.5 font-medium text-slate-700">{formatLabel(key)}</td>
                                <td className="break-words whitespace-pre-wrap px-4 py-2.5 text-slate-900">{renderValue(value)}</td>
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
    </>
  );
}

