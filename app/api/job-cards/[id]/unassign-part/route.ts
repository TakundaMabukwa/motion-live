import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const normalizeToken = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

const resolveSerialToken = (value: Record<string, unknown>) =>
  normalizeToken(
    value?.serial_number ?? value?.serial ?? value?.serialNumber ?? value?.ip_address,
  );

const normalizeSource = (value: unknown) =>
  normalizeToken(value) || 'soltrack';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { stock_id, part } = await request.json();
    const { id } = await params;

    // Fetch job card
    const { data: job, error: fetchError } = await supabase
      .from('job_cards')
      .select('parts_required, new_account_number, customer_name')
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

    let removedPart: Record<string, unknown> | null = null;
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

        if (!removedPart && isTarget) {
          removedPart = current;
          return false;
        }
        return true;
      },
    );

    if (!removedPart) {
      return NextResponse.json({ error: 'Part not found on this job' }, { status: 404 });
    }

    // STEP 1: Return part to inventory FIRST (before removing from job)
    const partSource = normalizeSource(removedPart?.source);
    const serial = resolveSerialToken(removedPart);
    const partDescription = String(removedPart?.description || removedPart?.code || 'Item');
    const partCategoryCode = String(removedPart?.code || removedPart?.category_code || '');
    const costCode = String(job?.new_account_number || '');

    if (partSource === 'soltrack' && serial) {
      const { error: insertError } = await supabase
        .from('inventory_items')
        .insert({
          category_code: partCategoryCode,
          serial_number: serial,
          status: 'IN STOCK',
          date_adjusted: new Date().toISOString().split('T')[0],
          company: job?.customer_name || 'N/A',
          notes: `Returned from job — ${partDescription}`,
        });
      if (insertError) {
        return NextResponse.json(
          { error: `Failed to return part to inventory: ${insertError.message}. Part NOT removed from job.` },
          { status: 500 },
        );
      }
    } else if (partSource === 'client' && serial && !costCode) {
      return NextResponse.json(
        { error: 'Cannot return client part — job has no account number (new_account_number). Part NOT removed from job.' },
        { status: 409 },
      );
    } else if (partSource === 'client' && serial && costCode) {
      // Find or create client inventory category
      const { data: existingCat } = await supabase
        .from('client_inventory_categories')
        .select('id')
        .eq('cost_code', costCode)
        .eq('category_code', partCategoryCode)
        .maybeSingle();

      let categoryId = existingCat?.id;
      if (!categoryId) {
        const { data: newCat } = await supabase
          .from('client_inventory_categories')
          .insert({ cost_code: costCode, category_code: partCategoryCode, description: partDescription })
          .select('id')
          .single();
        categoryId = newCat?.id;
      }

      if (categoryId) {
        const { error: insertError } = await supabase
          .from('client_inventory_items')
          .insert({
            category_id: categoryId,
            category_code: partCategoryCode,
            serial_number: serial,
            status: 'IN STOCK',
            cost_code: costCode,
            notes: `Returned from job — ${partDescription}`,
          });
        if (insertError) {
          return NextResponse.json(
            { error: `Failed to return part to client stock: ${insertError.message}. Part NOT removed from job.` },
            { status: 500 },
          );
        }
      }
    }
    // Technician source parts: no inventory to return to, just remove from job

    // STEP 2: Remove from job (only after inventory insert succeeded)
    const { error: updateError } = await supabase
      .from('job_cards')
      .update({ parts_required: updatedParts })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: `Part returned to inventory but failed to remove from job: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || 'Internal Server Error')
        : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
