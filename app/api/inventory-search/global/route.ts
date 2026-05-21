import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type InventoryRow = {
  id: number;
  serial_number: string | null;
  category_code: string | null;
  status: string | null;
  container: string | null;
  direction: string | null;
  company: string | null;
  assigned_to_technician: string | null;
  notes: string | null;
  inventory_categories?: {
    description: string | null;
  } | null;
};

type ClientStockRow = {
  id: number;
  cost_code: string | null;
  company: string | null;
  serial_number: string | null;
  category_code: string | null;
  status: string | null;
  assigned_to_technician: string | null;
  notes: string | null;
  inventory_categories?: {
    description: string | null;
  } | null;
};

type TechStockRow = {
  technician_email: string | null;
  assigned_parts: unknown;
};

type JobCardRow = {
  id: string;
  job_number: string | null;
  job_type: string | null;
  status: string | null;
  job_status: string | null;
  customer_name: string | null;
  vehicle_registration: string | null;
  ip_address: string | null;
  old_serial_number: string | null;
  new_serial_number: string | null;
  created_at: string | null;
  completion_date: string | null;
  decommission_date: string | null;
  updated_at: string | null;
  job_date: string | null;
  new_account_number: string | null;
  quotation_products: unknown;
  parts_required: unknown;
  equipment_used: unknown;
  job_description: string | null;
};

type InventoryCategoryRow = {
  code: string | null;
  description: string | null;
};

const sanitizeQuery = (value: string) =>
  String(value || '')
    .trim()
    .replace(/[,%]/g, ' ')
    .replace(/\s+/g, ' ');

const normalizeValue = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

const isValidSingleTechnicianEmail = (value: unknown) => {
  const email = normalizeValue(value);
  if (!email) return false;
  if (email.includes(',') || email.includes(' ')) return false;
  return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email);
};

const toPositiveInt = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => isPlainObject(entry)) as Record<string, unknown>[];
};

const extractPartIdentifiers = (value: Record<string, unknown>) => {
  const identifiers = [
    value.serial_number,
    value.serial,
    value.serialNumber,
    value.ip_address,
    value.ipAddress,
    value.detail_value,
    value.value,
  ]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);

  // Split compound values like "8937... / 0960..." into searchable tokens.
  return identifiers.flatMap((entry) =>
    entry
      .split(/[\/,;|]/g)
      .map((token) => token.trim())
      .filter(Boolean),
  );
};

const extractJobCardIdentifiers = (row: JobCardRow) => {
  const identifiers = new Set<string>();

  [
    row.vehicle_registration,
    row.ip_address,
    row.old_serial_number,
    row.new_serial_number,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .forEach((value) => identifiers.add(value));

  const partSources = [
    ...toRecordArray(row.quotation_products),
    ...toRecordArray(row.parts_required),
    ...toRecordArray(row.equipment_used),
  ];

  partSources.forEach((part) => {
    extractPartIdentifiers(part).forEach((value) => identifiers.add(value));
  });

  return Array.from(identifiers);
};

const inferJobTrailEvent = (jobTypeValue: unknown) => {
  const normalized = normalizeValue(jobTypeValue);
  if (!normalized) return 'job';
  if (normalized.includes('deinstall') || normalized.includes('de-install')) {
    return 'deinstall';
  }
  if (normalized.includes('repair')) return 'repair';
  if (normalized.includes('install')) return 'install';
  return normalized;
};

const resolveJobEventDate = (row: JobCardRow) =>
  row.completion_date ||
  row.decommission_date ||
  row.job_date ||
  row.updated_at ||
  row.created_at ||
  null;

const formatDateLabel = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const matchesQuery = (query: string, values: Array<unknown>) => {
  const normalizedQuery = normalizeValue(query);
  if (!normalizedQuery) return false;

  return values.some((value) => normalizeValue(value).includes(normalizedQuery));
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q') || '';
    const query = sanitizeQuery(rawQuery);
    const requestedLimit = Number(searchParams.get('limit') || 180);
    const perSourceLimit = Math.min(
      220,
      Math.max(40, Number.isFinite(requestedLimit) ? requestedLimit : 180),
    );

    if (query.length < 2) {
      return NextResponse.json({
        query,
        results: [],
        counts: {
          inventory: 0,
          client_stock: 0,
          technician_stock: 0,
          job_history: 0,
          total: 0,
        },
      });
    }

    const likeQuery = `%${query}%`;

    const { data: matchedCategories, error: categoriesError } = await supabase
      .from('inventory_categories')
      .select('code, description')
      .or(`description.ilike.${likeQuery},code.ilike.${likeQuery}`)
      .limit(150);

    if (categoriesError) {
      return NextResponse.json(
        { error: categoriesError.message },
        { status: 500 },
      );
    }

    const matchedCategoryCodes = Array.from(
      new Set(
        (Array.isArray(matchedCategories) ? (matchedCategories as InventoryCategoryRow[]) : [])
          .map((category) => String(category.code || '').trim())
          .filter(Boolean),
      ),
    ).slice(0, 120);

    const [inventoryResponse, clientResponse, techResponse, jobCardsResponse] = await Promise.all([
      supabase
        .from('inventory_items')
        .select(
          'id, serial_number, category_code, status, container, direction, company, assigned_to_technician, notes, inventory_categories!inventory_items_category_fkey(description)',
        )
        .or(
          `serial_number.ilike.${likeQuery},category_code.ilike.${likeQuery},company.ilike.${likeQuery},notes.ilike.${likeQuery},container.ilike.${likeQuery},direction.ilike.${likeQuery}`,
        )
        .limit(perSourceLimit),
      supabase
        .from('client_inventory_items')
        .select(
          'id, cost_code, company, serial_number, category_code, status, assigned_to_technician, notes, inventory_categories!client_inventory_items_category_fkey(description)',
        )
        .or(
          `serial_number.ilike.${likeQuery},category_code.ilike.${likeQuery},cost_code.ilike.${likeQuery},company.ilike.${likeQuery},assigned_to_technician.ilike.${likeQuery},notes.ilike.${likeQuery}`,
        )
        .limit(perSourceLimit),
      supabase
        .from('tech_stock')
        .select('technician_email, assigned_parts')
        .limit(300),
      supabase
        .from('job_cards')
        .select(
          'id, job_number, job_type, status, job_status, customer_name, vehicle_registration, ip_address, old_serial_number, new_serial_number, created_at, completion_date, decommission_date, updated_at, job_date, new_account_number, quotation_products, parts_required, equipment_used, job_description',
        )
        .or(
          `job_number.ilike.${likeQuery},vehicle_registration.ilike.${likeQuery},customer_name.ilike.${likeQuery},new_account_number.ilike.${likeQuery},ip_address.ilike.${likeQuery},old_serial_number.ilike.${likeQuery},new_serial_number.ilike.${likeQuery},job_type.ilike.${likeQuery},status.ilike.${likeQuery},job_status.ilike.${likeQuery},job_description.ilike.${likeQuery}`,
        )
        .order('completion_date', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(perSourceLimit * 2),
    ]);

    if (inventoryResponse.error) {
      return NextResponse.json(
        { error: inventoryResponse.error.message },
        { status: 500 },
      );
    }
    if (clientResponse.error) {
      return NextResponse.json(
        { error: clientResponse.error.message },
        { status: 500 },
      );
    }
    if (techResponse.error) {
      return NextResponse.json(
        { error: techResponse.error.message },
        { status: 500 },
      );
    }
    if (jobCardsResponse.error) {
      return NextResponse.json(
        { error: jobCardsResponse.error.message },
        { status: 500 },
      );
    }
    let inventoryByCategoryRows: InventoryRow[] = [];
    let clientByCategoryRows: ClientStockRow[] = [];

    if (matchedCategoryCodes.length > 0) {
      const [inventoryByCategoryResponse, clientByCategoryResponse] = await Promise.all([
        supabase
          .from('inventory_items')
          .select(
            'id, serial_number, category_code, status, container, direction, company, assigned_to_technician, notes, inventory_categories!inventory_items_category_fkey(description)',
          )
          .in('category_code', matchedCategoryCodes)
          .limit(perSourceLimit),
        supabase
          .from('client_inventory_items')
          .select(
            'id, cost_code, company, serial_number, category_code, status, assigned_to_technician, notes, inventory_categories!client_inventory_items_category_fkey(description)',
          )
          .in('category_code', matchedCategoryCodes)
          .limit(perSourceLimit),
      ]);

      if (inventoryByCategoryResponse.error) {
        return NextResponse.json(
          { error: inventoryByCategoryResponse.error.message },
          { status: 500 },
        );
      }
      if (clientByCategoryResponse.error) {
        return NextResponse.json(
          { error: clientByCategoryResponse.error.message },
          { status: 500 },
        );
      }

      inventoryByCategoryRows = Array.isArray(inventoryByCategoryResponse.data)
        ? (inventoryByCategoryResponse.data as InventoryRow[])
        : [];
      clientByCategoryRows = Array.isArray(clientByCategoryResponse.data)
        ? (clientByCategoryResponse.data as ClientStockRow[])
        : [];
    }

    const results: Array<Record<string, unknown>> = [];
    const dedupe = new Set<string>();

    const pushUnique = (key: string, item: Record<string, unknown>) => {
      if (dedupe.has(key)) return;
      dedupe.add(key);
      results.push(item);
    };

    const pushJobHistoryRow = (
      row: JobCardRow,
      matchedIdentifierInput?: string,
    ) => {
      const reference = String(row.job_number || '').trim() || `JOB-${row.id}`;
      const eventType = inferJobTrailEvent(row.job_type);
      const eventDate = resolveJobEventDate(row);
      const eventDateLabel = formatDateLabel(eventDate);
      const matchedIdentifier =
        String(matchedIdentifierInput || '').trim() ||
        String(row.ip_address || '').trim() ||
        String(row.new_serial_number || '').trim() ||
        String(row.old_serial_number || '').trim() ||
        '';
      const trailStatus = [row.job_status, row.status]
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .join(' / ');

      const key = `job-history:${row.id}:${matchedIdentifier || 'none'}`;
      pushUnique(key, {
        result_id: key,
        source: 'job_history',
        source_label: 'Job Card History',
        reference,
        code: String(row.job_type || 'job').trim() || 'job',
        description:
          String(row.job_description || '').trim() || 'Job card history event',
        quantity: 1,
        status: trailStatus || 'N/A',
        bin: row.vehicle_registration || 'No Reg',
        owner: row.customer_name || 'Unknown Client',
        serial_number: matchedIdentifier || null,
        supplier: null,
        technician_email: null,
        cost_code: row.new_account_number || null,
        job_id: row.id,
        job_number: row.job_number,
        vehicle_registration: row.vehicle_registration,
        customer_name: row.customer_name,
        job_type: row.job_type,
        trail_event: eventType,
        event_date: eventDate,
        event_date_label: eventDateLabel,
        completion_date: row.completion_date,
        decommission_date: row.decommission_date,
      });
    };

    const inventoryRows = [
      ...(Array.isArray(inventoryResponse.data)
        ? (inventoryResponse.data as InventoryRow[])
        : []),
      ...inventoryByCategoryRows,
    ];
    inventoryRows.forEach((row) => {
      const reference = row.serial_number || `INV-${row.id}`;
      const bin = [row.container, row.direction].filter(Boolean).join(' / ') || 'Main Inventory';
      const owner = row.company || row.assigned_to_technician || 'Soltrack';
      const itemDescription =
        row.inventory_categories?.description ||
        row.notes ||
        row.category_code ||
        'Inventory item';
      pushUnique(`inventory:${row.id}`, {
        result_id: `inventory:${row.id}`,
        source: 'inventory',
        source_label: 'Soltrack Inventory',
        reference,
        code: row.category_code || 'N/A',
        description: itemDescription,
        quantity: 1,
        status: row.status || 'N/A',
        bin,
        owner,
        serial_number: row.serial_number,
      });
    });

    const clientRows = [
      ...(Array.isArray(clientResponse.data)
        ? (clientResponse.data as ClientStockRow[])
        : []),
      ...clientByCategoryRows,
    ];
    clientRows.forEach((row) => {
      const reference = row.serial_number || `CLIENT-${row.id}`;
      const itemDescription =
        row.inventory_categories?.description ||
        row.notes ||
        row.category_code ||
        'Client stock item';
      pushUnique(`client:${row.id}`, {
        result_id: `client:${row.id}`,
        source: 'client_stock',
        source_label: 'Client Stock',
        reference,
        code: row.category_code || 'N/A',
        description: itemDescription,
        quantity: 1,
        status: row.status || 'N/A',
        bin: row.cost_code || 'Client Bin',
        owner: row.company || row.assigned_to_technician || 'Client',
        serial_number: row.serial_number,
        cost_code: row.cost_code,
      });
    });

    const techRows = Array.isArray(techResponse.data)
      ? (techResponse.data as TechStockRow[])
      : [];

    techRows.forEach((row) => {
      const technicianEmail = String(row.technician_email || '').trim();
      if (!isValidSingleTechnicianEmail(technicianEmail)) {
        return;
      }
      const assignedParts = Array.isArray(row.assigned_parts)
        ? row.assigned_parts
        : [];

      assignedParts.forEach((part, index) => {
        const partRecord = isPlainObject(part) ? part : {};
        if (
          !matchesQuery(query, [
            technicianEmail,
            partRecord.code,
            partRecord.description,
            partRecord.name,
            partRecord.item_description,
            partRecord.serial_number,
            partRecord.serial,
            partRecord.serialNumber,
            partRecord.ip_address,
            partRecord.supplier,
          ])
        ) {
          return;
        }

        const quantity = toPositiveInt(partRecord.quantity, 1);
        const reference =
          String(
            partRecord.serial_number ||
              partRecord.serial ||
              partRecord.serialNumber ||
              partRecord.ip_address ||
              '',
          ).trim() ||
          `${technicianEmail || 'tech'}-${index + 1}`;
        const code = String(partRecord.code || 'N/A').trim();
        const key = `tech-part:${technicianEmail}:${code}:${reference}:${index}`;

        pushUnique(key, {
          result_id: key,
          source: 'technician_stock',
          source_label: 'Technician Stock',
          reference,
          code,
          description: String(
            partRecord.description ||
              partRecord.name ||
              partRecord.item_description ||
              partRecord.category_code ||
              'Assigned part',
          ),
          quantity: Math.max(1, quantity),
          status: 'IN STOCK',
          bin: technicianEmail || 'Technician Bin',
          owner: technicianEmail || 'Technician',
          supplier: String(partRecord.supplier || 'JOB_PARTS'),
          serial_number: String(
            partRecord.serial_number ||
              partRecord.serial ||
              partRecord.serialNumber ||
              partRecord.ip_address ||
              '',
          ).trim(),
          technician_email: technicianEmail || null,
        });
      });
    });

    const matchedJobRows = Array.isArray(jobCardsResponse.data)
      ? (jobCardsResponse.data as JobCardRow[])
      : [];
    const matchedJobIds = new Set<string>();
    const matchedRegistrations = new Set<string>();
    const normalizedQuery = normalizeValue(query);

    matchedJobRows.forEach((row) => {
      const rowIdentifiers = extractJobCardIdentifiers(row);
      const matchingIdentifiers = rowIdentifiers.filter((identifier) =>
        normalizeValue(identifier).includes(normalizedQuery),
      );

      const matchesCoreFields = matchesQuery(query, [
        row.job_number,
        row.customer_name,
        row.vehicle_registration,
        row.new_account_number,
        row.ip_address,
        row.old_serial_number,
        row.new_serial_number,
        row.job_type,
        row.status,
        row.job_status,
        row.job_description,
      ]);

      if (!matchesCoreFields && matchingIdentifiers.length === 0) {
        return;
      }

      matchedJobIds.add(row.id);
      const vehicleRegistration = String(row.vehicle_registration || '').trim();
      if (vehicleRegistration) {
        matchedRegistrations.add(vehicleRegistration);
      }
      const matchedIdentifier =
        matchingIdentifiers[0] ||
        row.ip_address ||
        row.new_serial_number ||
        row.old_serial_number ||
        '';
      pushJobHistoryRow(row, matchedIdentifier);
    });

    const registrationTrailList = Array.from(matchedRegistrations).slice(0, 80);
    if (registrationTrailList.length > 0) {
      const { data: registrationTrailRows, error: registrationTrailError } =
        await supabase
          .from('job_cards')
          .select(
            'id, job_number, job_type, status, job_status, customer_name, vehicle_registration, ip_address, old_serial_number, new_serial_number, created_at, completion_date, decommission_date, updated_at, job_date, new_account_number, quotation_products, parts_required, equipment_used, job_description',
          )
          .in('vehicle_registration', registrationTrailList)
          .order('completion_date', { ascending: false, nullsFirst: false })
          .order('updated_at', { ascending: false, nullsFirst: false })
          .limit(perSourceLimit * 4);

      if (registrationTrailError) {
        return NextResponse.json(
          { error: registrationTrailError.message },
          { status: 500 },
        );
      }

      const registrationHistoryRows = Array.isArray(registrationTrailRows)
        ? (registrationTrailRows as JobCardRow[])
        : [];
      registrationHistoryRows.forEach((row) => {
        if (matchedJobIds.has(row.id)) return;

        const rowIdentifiers = extractJobCardIdentifiers(row);
        const matchedIdentifier =
          rowIdentifiers.find((identifier) =>
            normalizeValue(identifier).includes(normalizedQuery),
          ) ||
          row.new_serial_number ||
          row.old_serial_number ||
          row.ip_address ||
          '';
        pushJobHistoryRow(row, matchedIdentifier);
      });
    }

    const sortedResults = results.sort((left, right) => {
      if (String(left.source || '') === 'job_history' && String(right.source || '') === 'job_history') {
        const leftDate = String(left.event_date || '');
        const rightDate = String(right.event_date || '');
        if (leftDate !== rightDate) {
          return rightDate.localeCompare(leftDate);
        }
      }
      const sourceCompare = String(left.source || '').localeCompare(
        String(right.source || ''),
      );
      if (sourceCompare !== 0) return sourceCompare;
      return String(left.reference || '').localeCompare(
        String(right.reference || ''),
      );
    });

    const counts = {
      inventory: sortedResults.filter((item) => item.source === 'inventory').length,
      client_stock: sortedResults.filter((item) => item.source === 'client_stock')
        .length,
      technician_stock: sortedResults.filter(
        (item) => item.source === 'technician_stock',
      ).length,
      job_history: sortedResults.filter((item) => item.source === 'job_history')
        .length,
    };

    return NextResponse.json({
      query,
      results: sortedResults.slice(0, perSourceLimit * 3),
      counts: {
        ...counts,
        total:
          counts.inventory +
          counts.client_stock +
          counts.technician_stock +
          counts.job_history,
      },
    });
  } catch (error) {
    console.error('Error in global inventory search:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
