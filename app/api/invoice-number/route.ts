import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('allocate_document_number', {
      sequence_name: 'invoice',
      prefix: 'INV-',
    });

    if (error) {
      console.error('Error allocating invoice number:', error);
      return NextResponse.json(
        { error: 'Failed to allocate invoice number' },
        { status: 500 },
      );
    }

    return NextResponse.json({ invoiceNumber: data });
  } catch (error) {
    console.error('Error in invoice-number POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
