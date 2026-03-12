import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const costCode = (body?.cost_code || '').toString().trim();
    const vehicles = Array.isArray(body?.vehicles) ? body.vehicles : [];

    if (!costCode) {
      return NextResponse.json({ error: 'cost_code is required' }, { status: 400 });
    }

    const created: any[] = [];
    const skipped: any[] = [];

    for (const vehicle of vehicles) {
      const reg = (vehicle?.reg || '').toString().trim();
      if (!reg) {
        skipped.push({ reason: 'missing_reg', vehicle });
        continue;
      }

      const { data: existing, error: existingError } = await supabase
        .from('vehicles')
        .select('id, reg')
        .ilike('reg', reg)
        .maybeSingle();

      if (existingError) {
        return NextResponse.json({ error: 'Failed to check vehicle', details: existingError.message }, { status: 500 });
      }

      if (existing) {
        skipped.push({ reason: 'exists', reg: existing.reg });
        continue;
      }

      const insertData = {
        reg,
        make: vehicle?.make || null,
        model: vehicle?.model || null,
        year: vehicle?.year || null,
        company: vehicle?.company || null,
        new_account_number: costCode,
        fleet_number: vehicle?.fleet_number || null,
      };

      const { data: inserted, error: insertError } = await supabase
        .from('vehicles')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: 'Failed to insert vehicle', details: insertError.message }, { status: 500 });
      }

      created.push(inserted);
    }

    return NextResponse.json({ success: true, cost_code: costCode, created, skipped });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message || 'Unknown error' }, { status: 500 });
  }
}
