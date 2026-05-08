import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appendAssignedPartsToTechnicianStock } from '@/lib/server/tech-stock-assignment';
import type { SupabaseClient } from '@supabase/supabase-js';

const cloneStockMap = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
};

const toSafePositiveQuantity = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
};

const normalizeEmail = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

const extractFirstEmail = (value: unknown) => {
  const token = String(value || '')
    .split(',')
    .map((part) => part.trim())
    .find(Boolean);
  return normalizeEmail(token || '');
};

const isEmailLike = (value: string) =>
  Boolean(value) && value.includes('@') && !value.includes(' ');

const normalizePartRecord = (part: Record<string, unknown>) => {
  const normalized = { ...part } as Record<string, unknown>;

  const serialNumber = String(
    part?.serial_number ?? part?.serial ?? part?.serialNumber ?? part?.ip_address ?? '',
  ).trim();

  normalized.description = String(
    part?.description ?? part?.name ?? part?.item_description ?? part?.code ?? 'Item',
  ).trim();
  normalized.code = String(part?.code ?? part?.category_code ?? '').trim();
  normalized.quantity = toSafePositiveQuantity(part?.quantity ?? part?.count ?? 1);
  normalized.stock_id = String(part?.stock_id ?? part?.inventory_item_id ?? part?.id ?? '').trim();
  normalized.serial_number = serialNumber;
  normalized.ip_address = String(part?.ip_address ?? '').trim();

  return normalized;
};

const decrementStockEntry = (
  entry: Record<string, unknown>,
  quantity: number,
) => {
  const currentCount = Number(entry.count ?? entry.quantity ?? 0);
  if (!Number.isFinite(currentCount)) return false;
  entry.count = Math.max(0, currentCount - quantity);
  return true;
};

const decrementTechnicianStock = (
  rawStock: unknown,
  selectedParts: Array<Record<string, unknown>>,
) => {
  const stockMap = cloneStockMap(rawStock);
  if (Object.keys(stockMap).length === 0 || !Array.isArray(selectedParts)) {
    return stockMap;
  }

  for (const part of selectedParts) {
    const partCode = String(part?.code || "").trim();
    const supplier = String(part?.supplier || "").trim();
    const qty = toSafePositiveQuantity(part?.quantity);

    if (!partCode) continue;

    let decremented = false;

    const topEntry = stockMap[partCode];
    if (topEntry && typeof topEntry === "object" && !Array.isArray(topEntry)) {
      decremented = decrementStockEntry(topEntry as Record<string, unknown>, qty);
    }

    if (!decremented && supplier) {
      const supplierEntry = stockMap[supplier];
      if (
        supplierEntry &&
        typeof supplierEntry === "object" &&
        !Array.isArray(supplierEntry)
      ) {
        const supplierMap = supplierEntry as Record<string, unknown>;
        const itemEntry = supplierMap[partCode];
        if (itemEntry && typeof itemEntry === "object" && !Array.isArray(itemEntry)) {
          decremented = decrementStockEntry(itemEntry as Record<string, unknown>, qty);
        }
      }
    }

    if (!decremented) {
      for (const entryValue of Object.values(stockMap)) {
        if (!entryValue || typeof entryValue !== "object" || Array.isArray(entryValue)) {
          continue;
        }
        const supplierMap = entryValue as Record<string, unknown>;
        const itemEntry = supplierMap[partCode];
        if (itemEntry && typeof itemEntry === "object" && !Array.isArray(itemEntry)) {
          if (decrementStockEntry(itemEntry as Record<string, unknown>, qty)) {
            decremented = true;
            break;
          }
        }
      }
    }
  }

  return stockMap;
};

// Helper function to add parts to technician stock
async function addPartsToTechnicianStock(
  supabase: SupabaseClient,
  technicianEmail: string,
  partsRequired: unknown[],
) {
  try {
    console.log(`[PARTS ASSIGNMENT] Starting parts assignment for technician: ${technicianEmail}`);
    console.log(`[PARTS ASSIGNMENT] Parts to assign:`, JSON.stringify(partsRequired, null, 2));
    const result = await appendAssignedPartsToTechnicianStock(
      supabase,
      technicianEmail,
      partsRequired,
    );
    if (!result.success) {
      console.error(`[PARTS ASSIGNMENT] ERROR:`, result.error);
      return { success: false, error: result.error };
    }
    console.log(`[PARTS ASSIGNMENT] SUCCESS: Added ${partsRequired.length} parts`);
    return {
      success: true,
      totalParts: result.totalParts,
      partsAdded: partsRequired.length,
    };
  } catch (error) {
    console.error(`[PARTS ASSIGNMENT] ERROR:`, error);
    return { success: false, error };
  }
}

export async function PUT(request: NextRequest, { params }) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const body = await request.json();
    const { inventory_items, technician_id, technician_name, technician_email, source, source_owner } = body;
    const parts = Array.isArray(inventory_items)
      ? inventory_items.map((part: Record<string, unknown>) =>
          normalizePartRecord(part || {}),
        )
      : [];
    const stockSource = (source || 'soltrack').toString().toLowerCase();
    const stockOwner = (source_owner || '').toString();

    let finalTechnicianEmail = extractFirstEmail(technician_email);

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    // Get the job card details first
    const { data: jobCard, error: jobError } = await supabase
      .from('job_cards')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !jobCard) {
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }
    if (!isEmailLike(finalTechnicianEmail)) {
      finalTechnicianEmail = extractFirstEmail(jobCard.technician_phone);
    }
    if (!isEmailLike(finalTechnicianEmail) && technician_id) {
      const { data: technicianRow } = await supabase
        .from('technicians')
        .select('email')
        .eq('id', technician_id)
        .maybeSingle();
      finalTechnicianEmail = extractFirstEmail(technicianRow?.email);
    }
    if (!isEmailLike(finalTechnicianEmail) && technician_name && !String(technician_name).includes(',')) {
      const emailName = String(technician_name || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');
      finalTechnicianEmail = `${emailName}@soltrack.co.za`;
    }
    if (stockSource === 'client' && !stockOwner) {
      return NextResponse.json({ error: 'Client cost code is required' }, { status: 400 });
    }

    const technicianSourceEmail =
      stockSource === 'technician'
        ? extractFirstEmail(stockOwner || jobCard.technician_phone || technician_email || '')
        : '';

    if (stockSource === 'technician' && !technicianSourceEmail) {
      return NextResponse.json({ error: 'Technician email is required' }, { status: 400 });
    }

    const applySourceStockChanges = async () => {
      if (stockSource === 'soltrack') {
        for (const item of parts) {
          const itemId = item.stock_id || item.inventory_item_id || item.id;
          if (!itemId) continue;
          const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
          if (error) {
            return {
              success: false,
              warning: `Failed to remove one or more Soltrack stock items: ${error.message}`,
            };
          }
        }
        return { success: true };
      }

      if (stockSource === 'client') {
        for (const item of parts) {
          const itemId = item.stock_id || item.inventory_item_id || item.id;
          if (!itemId) continue;
          const { error } = await supabase
            .from('client_inventory_items')
            .delete()
            .eq('id', itemId);
          if (error) {
            return {
              success: false,
              warning: `Failed to remove one or more client stock items: ${error.message}`,
            };
          }
        }
        return { success: true };
      }

      if (stockSource === 'technician') {
        const { data: techStockRows, error: techFetchError } = await supabase
          .from('tech_stock')
          .select('id, assigned_parts, stock')
          .ilike('technician_email', technicianSourceEmail)
          .order('id', { ascending: true })
          .limit(1);

        if (techFetchError) {
          return {
            success: false,
            warning: `Failed to read technician source stock: ${techFetchError.message}`,
          };
        }
        const techStock = Array.isArray(techStockRows) ? techStockRows[0] : null;

        const assignedParts = Array.isArray(techStock?.assigned_parts) ? [...techStock.assigned_parts] : [];
        const updatedStock = decrementTechnicianStock(techStock?.stock, parts);
        const selectedParts = parts.map((part: Record<string, unknown>) => ({
          stockId: String(part?.stock_id || part?.id || ''),
          code: String(part?.code || ''),
          serial: String(part?.serial_number || part?.serial || part?.serialNumber || part?.ip_address || ''),
          desc: String(part?.description || ''),
        }));

        const updatedAssignedParts = assignedParts.filter((part: Record<string, unknown>) => {
          const partStockId = String(part?.stock_id || part?.id || '');
          const partCode = String(part?.code || '');
          const partSerial = String(part?.serial_number || part?.serial || part?.serialNumber || part?.ip_address || '');
          const partDesc = String(part?.description || '');

          return !selectedParts.some((sel) => {
            if (sel.stockId && partStockId && sel.stockId === partStockId) return true;
            if (sel.serial && partSerial && sel.serial === partSerial) return true;
            if (sel.code && partCode && sel.code === partCode) {
              if (!sel.desc || !partDesc) return true;
              if (sel.desc === partDesc) return true;
            }
            return false;
          });
        });

        if (techStock?.id) {
          const { error: techUpdateError } = await supabase
            .from('tech_stock')
            .update({
              assigned_parts: updatedAssignedParts,
              stock: updatedStock,
            })
            .eq('id', techStock.id);

          if (techUpdateError) {
            return {
              success: false,
              warning: `Failed to update technician source stock: ${techUpdateError.message}`,
            };
          }
        } else {
          const { error: techInsertError } = await supabase
            .from('tech_stock')
            .insert({
              technician_email: technicianSourceEmail,
              assigned_parts: updatedAssignedParts,
              stock: updatedStock,
            });

          if (techInsertError) {
            return {
              success: false,
              warning: `Failed to create technician source stock: ${techInsertError.message}`,
            };
          }
        }
      }

      return { success: true };
    };



    // Generate QR code
    const qrData = {
      job_number: jobCard.job_number,
      job_id: jobCard.id,
      assigned_parts: parts,
      technician: jobCard.technician_phone,
      assigned_date: new Date().toISOString()
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;

    // Prepare update data
    const updateData = {
      parts_required: parts,
      qr_code: qrCodeUrl,
      role: "admin",
      status: "admin_created",
      job_status: "pending",
      escalation_role: null,
      escalation_source_role: null,
      escalated_at: null,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };
    
    // If technician data is provided, update it too
    if (technician_id && technician_name && isEmailLike(finalTechnicianEmail)) {
      updateData.assigned_technician_id = technician_id;
      updateData.technician_name = technician_name;
      updateData.technician_phone = finalTechnicianEmail;
    }

    // Update job card
    const { data: updatedJob, error: updateError } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', jobId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update job card' }, { status: 500 });
    }

    // If technician is already assigned, copy parts to tech_stock
    let techStockMessage = '';
    let canApplySourceChanges = true;
    if (
      stockSource === 'soltrack' &&
      (isEmailLike(finalTechnicianEmail) || isEmailLike(extractFirstEmail(jobCard.technician_phone)))
    ) {
      const techEmail = isEmailLike(finalTechnicianEmail)
        ? finalTechnicianEmail
        : extractFirstEmail(jobCard.technician_phone);
      const result = await addPartsToTechnicianStock(supabase, techEmail, parts);
      
      if (result?.success) {
        techStockMessage = ` Parts copied to technician stock (${result.partsAdded} items).`;
      } else {
        techStockMessage = ` Warning: Failed to copy parts to technician stock.`;
        canApplySourceChanges = false;
      }
    }

    let sourceStockMessage = '';
    if (canApplySourceChanges) {
      const sourceMutation = await applySourceStockChanges();
      if (!sourceMutation.success && sourceMutation.warning) {
        sourceStockMessage = ` Warning: ${sourceMutation.warning}`;
      }
    } else if (stockSource === 'soltrack') {
      sourceStockMessage =
        ' Warning: Source stock was not removed because technician stock update failed.';
    }

    return NextResponse.json({
      message: (finalTechnicianEmail
        ? 'Parts and technician assigned successfully. Job moved to Admin.'
        : 'Parts assigned successfully. Job moved to Admin.') +
        techStockMessage +
        sourceStockMessage,
      job: updatedJob,
      qr_code: qrCodeUrl
    });

  } catch (error) {
    console.error('Error assigning parts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
