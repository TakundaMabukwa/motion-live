import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type TechRow = {
  id: number;
  technician_email: string | null;
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
      .from('tech_stock')
      .select('id, technician_email, created_at')
      .not('technician_email', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const uniqueByEmail = new Map<string, TechRow>();
    (data as TechRow[] | null)?.forEach((row) => {
      const email = (row.technician_email || '').trim().toLowerCase();
      if (!email) return;
      const existing = uniqueByEmail.get(email);
      if (!existing || (row.created_at && row.created_at > existing.created_at)) {
        uniqueByEmail.set(email, {
          ...row,
          technician_email: email,
        });
      }
    });

    const technicians = Array.from(uniqueByEmail.values()).sort((a, b) =>
      (a.technician_email || '').localeCompare(b.technician_email || '')
    );

    return NextResponse.json({ technicians });
  } catch (error) {
    console.error('Error in tech stock technicians GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
