import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const costCentersParam = url.searchParams.get('costCenters');
  if (!costCentersParam) {
    return NextResponse.json({ error: 'Missing costCenters parameter' }, { status: 400 });
  }
  // Accept comma or comma+space separated
  const costCenters = costCentersParam.split(/,\s*/).map((c) => c.trim()).filter(Boolean);
  if (costCenters.length === 0) {
    return NextResponse.json({ error: 'No cost centers provided' }, { status: 400 });
  }

  // Query vehicles table for any vehicle with a cost_center in the list
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .in('cost_center', costCenters);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || []);
}
