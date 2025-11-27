import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { stock_id, part } = await request.json();
    const { id } = await params;

    // Remove part from job's parts_required
    const { data: job, error: fetchError } = await supabase
      .from('job_cards')
      .select('parts_required')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const updatedParts = (job.parts_required || []).filter(
      (p: any) => p.stock_id !== stock_id
    );

    const { error: updateError } = await supabase
      .from('job_cards')
      .update({ parts_required: updatedParts })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
