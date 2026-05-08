import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const normalizeEmail = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const email = normalizeEmail(searchParams.get('email'));

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const { data: stockData, error } = await supabase
      .from('tech_stock')
      .select('*')
      .ilike('technician_email', email)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching tech stock:', error);
      return NextResponse.json({ stock: [] });
    }

    return NextResponse.json({ stock: stockData || [] });
  } catch (error) {
    console.error('Error in tech-stock API:', error);
    return NextResponse.json({ stock: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { stock } = body;
    const technicianEmail = normalizeEmail(body?.technician_email);

    if (!technicianEmail || !stock) {
      return NextResponse.json({ error: 'Technician email and stock data are required' }, { status: 400 });
    }

    // Check if record exists (case-insensitive)
    const { data: existingRows, error: fetchError } = await supabase
      .from('tech_stock')
      .select('id, technician_email')
      .ilike('technician_email', technicianEmail)
      .order('id', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching tech stock:', fetchError);
      return NextResponse.json({ error: 'Failed to lookup tech stock' }, { status: 500 });
    }

    const existingRecord = Array.isArray(existingRows) ? existingRows[0] : null;

    if (existingRecord) {
      // Update existing record
      const { data: updatedRecord, error: updateError } = await supabase
        .from('tech_stock')
        .update({ stock, technician_email: technicianEmail })
        .eq('id', existingRecord.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating tech stock:', updateError);
        return NextResponse.json({ error: 'Failed to update tech stock' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: updatedRecord });
    } else {
      // Create new record
      const { data: newRecord, error: insertError } = await supabase
        .from('tech_stock')
        .insert({ technician_email: technicianEmail, stock })
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating tech stock:', insertError);
        return NextResponse.json({ error: 'Failed to create tech stock' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: newRecord });
    }
  } catch (error) {
    console.error('Error in tech-stock POST API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
