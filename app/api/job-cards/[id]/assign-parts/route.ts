import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
async function addPartsToTechnicianStock(supabase: any, technicianEmail: string, partsRequired: any[]) {
  try {
    console.log(`[PARTS ASSIGNMENT] Starting parts assignment for technician: ${technicianEmail}`);
    console.log(`[PARTS ASSIGNMENT] Parts to assign:`, JSON.stringify(partsRequired, null, 2));

    // Get existing technician stock
    const { data: techStock } = await supabase
      .from('tech_stock')
      .select('assigned_parts')
      .eq('technician_email', technicianEmail)
      .maybeSingle();

    let currentParts = techStock?.assigned_parts || [];

    // Simply copy the parts_required array as-is, preserving all details
    const newParts = [...currentParts, ...partsRequired];

    // Update or insert technician stock
    const { error } = await supabase
      .from('tech_stock')
      .upsert({
        technician_email: technicianEmail,
        assigned_parts: newParts
      }, {
        onConflict: 'technician_email'
      });

    if (error) {
      console.error(`[PARTS ASSIGNMENT] ERROR:`, error);
      return { success: false, error };
    } else {
      console.log(`[PARTS ASSIGNMENT] SUCCESS: Added ${partsRequired.length} parts`);
      return { success: true, totalParts: newParts.length, partsAdded: partsRequired.length };
    }
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
    const { inventory_items, ipAddress, technician_id, technician_name, technician_email, source, source_owner } = body;
    const parts = inventory_items || [];
    const stockSource = (source || 'soltrack').toString().toLowerCase();
    const stockOwner = (source_owner || '').toString();

    // Always generate email from technician name and store in technician_phone field
    let finalTechnicianEmail = technician_email;
    if (technician_name) {
      const emailName = technician_name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');
      finalTechnicianEmail = `${emailName}@soltrack.co.za`;
    }

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



    // First, add items to job (update job_cards with parts_required)
    // This is done later in the code when updating the job card
    
    // Remove items from the selected stock source
    if (stockSource === 'soltrack') {
      for (const item of parts) {
        const itemId = item.stock_id || item.inventory_item_id || item.id;
        if (!itemId) continue;
        await supabase.from('inventory_items').delete().eq('id', itemId);
      }
    } else if (stockSource === 'client') {
      if (!stockOwner) {
        return NextResponse.json({ error: 'Client cost code is required' }, { status: 400 });
      }
      for (const item of parts) {
        const itemId = item.stock_id || item.inventory_item_id || item.id;
        if (!itemId) continue;
        await supabase.from('client_inventory_items').delete().eq('id', itemId);
      }
    } else if (stockSource === 'technician') {
      const techEmail = stockOwner || jobCard.technician_phone || technician_email || '';
      if (!techEmail) {
        return NextResponse.json({ error: 'Technician email is required' }, { status: 400 });
      }

      const { data: techStock } = await supabase
        .from('tech_stock')
        .select('assigned_parts, stock')
        .eq('technician_email', techEmail)
        .maybeSingle();

      const assignedParts = Array.isArray(techStock?.assigned_parts) ? [...techStock.assigned_parts] : [];
      const updatedStock = decrementTechnicianStock(techStock?.stock, parts);
      const selectedParts = parts.map((part: any) => ({
        stockId: String(part?.stock_id || part?.id || ''),
        code: String(part?.code || ''),
        serial: String(part?.serial_number || part?.ip_address || ''),
        desc: String(part?.description || '')
      }));

      const updatedAssignedParts = assignedParts.filter((part: any) => {
        const partStockId = String(part?.stock_id || part?.id || '');
        const partCode = String(part?.code || '');
        const partSerial = String(part?.serial_number || part?.ip_address || '');
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

      await supabase
        .from('tech_stock')
        .upsert(
          {
            technician_email: techEmail,
            assigned_parts: updatedAssignedParts,
            stock: updatedStock,
          },
          { onConflict: 'technician_email' }
        );
    }



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
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };
    
    // If technician data is provided, update it too
    if (technician_id && technician_name && finalTechnicianEmail) {
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
    if (stockSource === 'soltrack' && (jobCard.technician_phone || finalTechnicianEmail)) {
      const techEmail = finalTechnicianEmail || jobCard.technician_phone;
      const result = await addPartsToTechnicianStock(supabase, techEmail, parts);
      
      if (result?.success) {
        techStockMessage = ` Parts copied to technician stock (${result.partsAdded} items).`;
      } else {
        techStockMessage = ` Warning: Failed to copy parts to technician stock.`;
      }
    }

    return NextResponse.json({
      message: (finalTechnicianEmail ? 'Parts and technician assigned successfully' : 'Parts assigned successfully') + techStockMessage,
      job: updatedJob,
      qr_code: qrCodeUrl
    });

  } catch (error) {
    console.error('Error assigning parts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
