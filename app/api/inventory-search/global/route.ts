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
  stock: unknown;
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

const collectLegacyStockItems = (stock: unknown) => {
  const rows: Array<{
    supplier: string;
    code: string;
    description: string;
    quantity: number;
    serial_number?: string;
    ip_address?: string;
  }> = [];

  if (!isPlainObject(stock)) return rows;

  Object.entries(stock).forEach(([topKey, topValue]) => {
    if (!isPlainObject(topValue)) return;

    const directCount = toPositiveInt(
      (topValue as Record<string, unknown>).count ??
        (topValue as Record<string, unknown>).quantity,
    );

    if (directCount > 0) {
      rows.push({
        supplier: 'Technician Stock',
        code: topKey,
        description: String(
          (topValue as Record<string, unknown>).description || topKey,
        ),
        quantity: directCount,
        serial_number: String(
          (topValue as Record<string, unknown>).serial_number ||
            (topValue as Record<string, unknown>).serial ||
            (topValue as Record<string, unknown>).serialNumber ||
            '',
        ).trim(),
        ip_address: String(
          (topValue as Record<string, unknown>).ip_address || '',
        ).trim(),
      });
      return;
    }

    Object.entries(topValue).forEach(([childCode, childValue]) => {
      if (!isPlainObject(childValue)) return;
      const quantity = toPositiveInt(
        (childValue as Record<string, unknown>).count ??
          (childValue as Record<string, unknown>).quantity,
      );
      if (quantity <= 0) return;
      rows.push({
        supplier: topKey,
        code: childCode,
        description: String(
          (childValue as Record<string, unknown>).description || childCode,
        ),
        quantity,
        serial_number: String(
          (childValue as Record<string, unknown>).serial_number ||
            (childValue as Record<string, unknown>).serial ||
            (childValue as Record<string, unknown>).serialNumber ||
            '',
        ).trim(),
        ip_address: String(
          (childValue as Record<string, unknown>).ip_address || '',
        ).trim(),
      });
    });
  });

  return rows;
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

    const [inventoryResponse, clientResponse, techResponse] = await Promise.all([
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
        .select('technician_email, assigned_parts, stock')
        .limit(300),
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

      const legacyItems = collectLegacyStockItems(row.stock);
      legacyItems.forEach((legacyItem, index) => {
        if (
          !matchesQuery(query, [
            technicianEmail,
            legacyItem.code,
            legacyItem.description,
            legacyItem.supplier,
            legacyItem.serial_number,
            legacyItem.ip_address,
          ])
        ) {
          return;
        }

        const reference =
          legacyItem.serial_number ||
          legacyItem.ip_address ||
          `${legacyItem.supplier}:${legacyItem.code}`;
        const key = `tech-legacy:${technicianEmail}:${legacyItem.supplier}:${legacyItem.code}:${index}`;
        pushUnique(key, {
          result_id: key,
          source: 'technician_stock',
          source_label: 'Technician Stock',
          reference,
          code: legacyItem.code,
          description: legacyItem.description,
          quantity: legacyItem.quantity,
          status: 'IN STOCK',
          bin: technicianEmail || 'Technician Bin',
          owner: technicianEmail || 'Technician',
          supplier: legacyItem.supplier,
          serial_number: legacyItem.serial_number || legacyItem.ip_address || null,
          technician_email: technicianEmail || null,
        });
      });
    });

    const sortedResults = results.sort((left, right) => {
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
    };

    return NextResponse.json({
      query,
      results: sortedResults.slice(0, perSourceLimit * 3),
      counts: {
        ...counts,
        total: counts.inventory + counts.client_stock + counts.technician_stock,
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
