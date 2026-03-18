import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const normalizeIdentifier = (value: string | null | undefined) =>
  (value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawSearch = (searchParams.get('search') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '2000', 10), 10000);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const fetchAll = searchParams.get('all') === 'true';
    const chunkSize = Math.min(Math.max(parseInt(searchParams.get('chunk') || '1000', 10), 1), 1000);
    const hardCap = 50000;

    const selectColumns = 'id, reg, fleet_number, company, make, model, year, vin, new_account_number';

    const buildQuery = (start: number, end: number) => {
      let query = supabase
        .from('vehicles')
        .select(selectColumns)
        .order('reg', { ascending: true })
        .range(start, end);

      if (rawSearch) {
        const escapedSearch = rawSearch.replace(/[%_]/g, '');
        query = query.or(`reg.ilike.%${escapedSearch}%,fleet_number.ilike.%${escapedSearch}%`);
      }

      return query;
    };

    let data: Array<Record<string, unknown>> = [];

    if (fetchAll) {
      let start = offset;
      const maxRows = Math.max(limit, hardCap);

      while (data.length < maxRows) {
        const remaining = maxRows - data.length;
        const currentChunkSize = Math.min(chunkSize, remaining);
        const end = start + currentChunkSize - 1;

        const { data: chunk, error } = await buildQuery(start, end);
        if (error) {
          return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
        }

        const rows = chunk || [];
        data.push(...rows);

        if (rows.length < currentChunkSize) {
          break;
        }

        start += currentChunkSize;
      }
    } else {
      const { data: chunk, error } = await buildQuery(offset, offset + limit - 1);
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
      }
      data = chunk || [];
    }

    const seenVehicleKeys = new Set<string>();

    const vehicles = (data || []).filter((vehicle) => {
      const reg = normalizeIdentifier(vehicle.reg);
      const fleet = normalizeIdentifier(vehicle.fleet_number);
      if (!reg && !fleet) return false;

      const dedupeKey = reg || fleet;
      if (seenVehicleKeys.has(dedupeKey)) return false;
      seenVehicleKeys.add(dedupeKey);
      return true;
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error('Vehicle reg search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
