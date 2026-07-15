import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Search by company name, legal_name, or cost_code
    const { data, error } = await supabase
      .from('cost_centers')
      .select('id, company, legal_name, cost_code, cost_center_code, contact_name, email, vat_number, registration_number, physical_address_1, physical_area, physical_code')
      .or(`company.ilike.%${q}%,legal_name.ilike.%${q}%,cost_code.ilike.%${q}%`)
      .limit(15);

    if (error) {
      console.error('[COST CENTERS SEARCH] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data || [] });
  } catch (err) {
    console.error('[COST CENTERS SEARCH] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
