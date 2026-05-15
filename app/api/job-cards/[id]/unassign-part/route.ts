import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const normalizeToken = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

const resolveSerialToken = (value: Record<string, unknown>) =>
  normalizeToken(
    value?.serial_number ?? value?.serial ?? value?.serialNumber ?? value?.ip_address,
  );

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

    const selectedPart =
      part && typeof part === 'object' && !Array.isArray(part)
        ? (part as Record<string, unknown>)
        : null;
    const selectedStockId = normalizeToken(
      selectedPart?.stock_id ?? selectedPart?.id ?? stock_id,
    );
    const selectedSerial = selectedPart ? resolveSerialToken(selectedPart) : '';
    const selectedRowId = normalizeToken(selectedPart?.row_id);

    let removedOne = false;
    const updatedParts = (Array.isArray(job.parts_required) ? job.parts_required : []).filter(
      (rawPart: unknown) => {
        if (!rawPart || typeof rawPart !== 'object' || Array.isArray(rawPart)) {
          return true;
        }
        const current = rawPart as Record<string, unknown>;
        const currentStockId = normalizeToken(current.stock_id ?? current.id);
        const currentSerial = resolveSerialToken(current);
        const currentRowId = normalizeToken(current.row_id);

        const matchesRow = selectedRowId && currentRowId && selectedRowId === currentRowId;
        const matchesStockId = selectedStockId && currentStockId && selectedStockId === currentStockId;
        const matchesSerial = selectedSerial && currentSerial && selectedSerial === currentSerial;
        const isTarget = matchesRow || (matchesStockId && matchesSerial) || (!selectedRowId && matchesStockId && !selectedSerial);

        if (!removedOne && isTarget) {
          removedOne = true;
          return false;
        }
        return true;
      },
    );

    const { error: updateError } = await supabase
      .from('job_cards')
      .update({ parts_required: updatedParts })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || 'Internal Server Error')
        : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
