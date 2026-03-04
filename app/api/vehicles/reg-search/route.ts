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

    let query = supabase
      .from('vehicles')
      .select('id, reg, fleet_number, company, make, model, year, vin')
      .order('reg', { ascending: true })
      .limit(limit);

    if (rawSearch) {
      const escapedSearch = rawSearch.replace(/[%_]/g, '');
      query = query.or(`reg.ilike.%${escapedSearch}%,fleet_number.ilike.%${escapedSearch}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
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
