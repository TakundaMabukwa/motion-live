import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const technicianEmail = searchParams.get('technician_email')?.trim();

    if (!technicianEmail) {
      return NextResponse.json({ error: 'technician_email is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tech_stock')
      .select('technician_email, assigned_parts')
      .ilike('technician_email', technicianEmail)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const assignedParts = Array.isArray(data?.assigned_parts) ? data?.assigned_parts : [];

    return NextResponse.json({
      technician_email: data?.technician_email || technicianEmail,
      items: assignedParts || [],
    });
  } catch (error) {
    console.error('Error in tech stock items GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
