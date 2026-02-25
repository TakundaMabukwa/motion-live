import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type CostCenterRow = {
  id: string;
  company: string | null;
  cost_code: string | null;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('cost_centers')
      .select('id, company, cost_code, created_at')
      .not('cost_code', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const uniqueByCostCode = new Map<string, CostCenterRow>();

    (data as CostCenterRow[] | null)?.forEach((row) => {
      if (!row.cost_code) return;
      const key = row.cost_code.trim().toUpperCase();
      if (!key) return;

      const existing = uniqueByCostCode.get(key);
      if (!existing || (row.created_at && row.created_at > existing.created_at)) {
        uniqueByCostCode.set(key, {
          ...row,
          cost_code: key,
        });
      }
    });

    const clients = Array.from(uniqueByCostCode.values()).sort((a, b) => {
      const companyA = (a.company || '').toUpperCase();
      const companyB = (b.company || '').toUpperCase();
      if (companyA !== companyB) return companyA.localeCompare(companyB);
      return (a.cost_code || '').localeCompare(b.cost_code || '');
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error in client stock clients GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
