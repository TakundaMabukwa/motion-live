import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OPTIONAL_JOB_CARD_COLUMNS = [
  'vehicle_chassis',
  'vehicle_colour',
  'old_serial_number',
  'new_serial_number',
  'cost_center_code',
  'cost_center_name',
] as const;

const MOVE_TO_ROLE_ALLOWED = new Set(['inv', 'admin', 'accounts', 'none']);

function normalizeMoveToRole(value: unknown): string | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;

  const aliasMap: Record<string, string> = {
    inv: 'inv',
    inventory: 'inv',
    admin: 'admin',
    accounts: 'accounts',
    account: 'accounts',
    none: 'none',
    null: 'none',
  };

  const normalized = aliasMap[raw] ?? raw;
  return MOVE_TO_ROLE_ALLOWED.has(normalized) ? normalized : null;
}

function resolvePartSerial(value: Record<string, unknown>): string {
  return String(
    value?.serial_number ??
      value?.serial ??
      value?.serialNumber ??
      value?.ip_address ??
      '',
  ).trim();
}

function normalizePartRecord(value: unknown): Record<string, unknown> {
  const part =
    value && typeof value === 'object' && !Array.isArray(value)
      ? ({ ...(value as Record<string, unknown>) } as Record<string, unknown>)
      : {};

  const serialNumber = resolvePartSerial(part);

  return {
    ...part,
    description: String(
      (part as Record<string, unknown>).description ??
        (part as Record<string, unknown>).name ??
        (part as Record<string, unknown>).item_description ??
        (part as Record<string, unknown>).code ??
        'Item',
    ).trim(),
    code: String(
      (part as Record<string, unknown>).code ??
        (part as Record<string, unknown>).category_code ??
        '',
    ).trim(),
    quantity: Math.max(
      1,
      Number(
        (part as Record<string, unknown>).quantity ??
          (part as Record<string, unknown>).count ??
          1,
      ) || 1,
    ),
    serial_number: serialNumber,
    ip_address: String((part as Record<string, unknown>).ip_address ?? '').trim(),
  };
}

function normalizePartArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((part) => normalizePartRecord(part));
}

function stripOptionalJobCardColumns<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload };
  for (const column of OPTIONAL_JOB_CARD_COLUMNS) {
    delete next[column];
  }
  return next;
}

function isMissingOptionalJobCardColumn(message?: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return OPTIONAL_JOB_CARD_COLUMNS.some((column) => normalized.includes(column));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const view = request.nextUrl.searchParams.get('view') || '';

    const fcEditSelect =
      'id, job_number, order_number, account_id, new_account_number, cost_center_code, cost_center_name, customer_name, customer_email, customer_phone, customer_address, contact_person, job_type, job_sub_type, job_description, purchase_type, decommission_date, annuity_end_date, move_to_role, move_to, vehicle_registration, vehicle_make, vehicle_model, vehicle_year, vin_numer, odormeter, quote_notes, quote_email_subject, quote_email_body, quote_email_footer, quotation_products, deinstall_vehicles, completion_notes, fc_note_acknowledged, status, job_status, role, escalation_role, escalation_source_role, created_at, updated_at';

    const requestedSelect = view === 'fc-edit' ? fcEditSelect : '*';

    // Fetch the job card by ID
    let { data: job, error: fetchError } = await supabase
      .from('job_cards')
      .select(requestedSelect)
      .eq('id', id)
      .single();

    if (fetchError && view === 'fc-edit') {
      const fallbackQuery = await supabase
        .from('job_cards')
        .select('*')
        .eq('id', id)
        .single();
      job = fallbackQuery.data;
      fetchError = fallbackQuery.error;
    }

    if (fetchError) {
      console.error('Error fetching job card:', fetchError);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);

  } catch (error) {
    console.error('Error in job-cards GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const transferEquipmentFromAssignedParts = body.transfer_equipment_from_assigned_parts === true;

    // Get current job card to check if it's being completed
    const { data: currentJob, error: fetchError } = await supabase
      .from('job_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current job card:', fetchError);
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    // Check if job is being completed (status changing to 'Completed')
    const isBeingCompleted = body.job_status === 'Completed' && 
                            currentJob.job_status !== 'Completed';

    // Prepare update data - remove technician if job is being completed
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    if (Array.isArray(updateData.parts_required)) {
      updateData.parts_required = normalizePartArray(updateData.parts_required);
    }

    if (Array.isArray(updateData.equipment_used)) {
      updateData.equipment_used = normalizePartArray(updateData.equipment_used);
    }

    // Keep move_to_role constrained-safe on every update.
    // This auto-fixes legacy rows that still carry invalid values (e.g. "fc").
    const requestedMoveToRole =
      body.move_to_role ??
      body.moveToRole ??
      body.move_to ??
      body.moveTo ??
      currentJob?.move_to_role ??
      null;
    updateData.move_to_role = normalizeMoveToRole(requestedMoveToRole);

    delete updateData.transfer_equipment_from_assigned_parts;

    // Optional flow: move selected equipment from tech_stock.assigned_parts onto this job card.
    if (transferEquipmentFromAssignedParts && Array.isArray(body.equipment_used)) {
      try {
        const selectedEquipment = normalizePartArray(body.equipment_used);

        if (selectedEquipment.length > 0) {
          const technicianEmailForTransfer =
            currentJob.technician_phone || user.email || null;

          if (technicianEmailForTransfer) {
            const { data: techStock, error: techStockError } = await supabase
              .from('tech_stock')
              .select('assigned_parts')
              .eq('technician_email', technicianEmailForTransfer)
              .maybeSingle();

            if (techStockError) {
              console.error('Error fetching tech stock for transfer:', techStockError);
            } else {
              const assignedParts = Array.isArray(techStock?.assigned_parts) ? [...techStock.assigned_parts] : [];
              const updatedAssignedParts = [...assignedParts];
              const transferredParts: Record<string, unknown>[] = [];

              const selectedStockIds = new Set(
                selectedEquipment.map(
                  (item: Record<string, unknown>) =>
                    String(item?.stock_id || item?.id || ''),
                )
              );

              const selectedKeys = new Set(
                selectedEquipment.map(
                  (item: Record<string, unknown>) =>
                    `${String(item?.code || '')}::${String(item?.supplier || '')}`,
                )
              );

              for (let i = 0; i < updatedAssignedParts.length; i += 1) {
                const part = updatedAssignedParts[i];
                const partStockId = String(part?.stock_id || part?.id || '');
                const partKey = `${String(part?.code || '')}::${String(part?.supplier || '')}`;

                const matchedById = partStockId && selectedStockIds.has(partStockId);
                const matchedByCodeSupplier = selectedKeys.has(partKey);

                if (!matchedById && !matchedByCodeSupplier) {
                  continue;
                }

                const currentQty = parseInt(String(part?.quantity || '1')) || 1;
                const newQty = Math.max(0, currentQty - 1);

                transferredParts.push({
                  ...part,
                  quantity: 1,
                });

                if (newQty === 0) {
                  updatedAssignedParts.splice(i, 1);
                  i -= 1;
                } else {
                  updatedAssignedParts[i] = {
                    ...part,
                    quantity: newQty,
                    available_stock: newQty,
                  };
                }
              }

              if (transferredParts.length > 0) {
                const existingPartsRequired = Array.isArray(currentJob.parts_required) ? currentJob.parts_required : [];
                const existingEquipmentUsed = Array.isArray(currentJob.equipment_used) ? currentJob.equipment_used : [];

                updateData.parts_required = [...existingPartsRequired, ...transferredParts];
                updateData.equipment_used = [...existingEquipmentUsed, ...transferredParts];

                const { error: updateTechStockError } = await supabase
                  .from('tech_stock')
                  .update({ assigned_parts: updatedAssignedParts })
                  .eq('technician_email', technicianEmailForTransfer);

                if (updateTechStockError) {
                  console.error('Error updating tech stock during transfer:', updateTechStockError);
                }
              } else {
                // If no match found in assigned_parts, still keep selected equipment on the job card.
                const existingPartsRequired = Array.isArray(currentJob.parts_required) ? currentJob.parts_required : [];
                const existingEquipmentUsed = Array.isArray(currentJob.equipment_used) ? currentJob.equipment_used : [];
                updateData.parts_required = [...existingPartsRequired, ...selectedEquipment];
                updateData.equipment_used = [...existingEquipmentUsed, ...selectedEquipment];
              }
            }
          } else {
            const existingPartsRequired = Array.isArray(currentJob.parts_required) ? currentJob.parts_required : [];
            const existingEquipmentUsed = Array.isArray(currentJob.equipment_used) ? currentJob.equipment_used : [];
            updateData.parts_required = [...existingPartsRequired, ...selectedEquipment];
            updateData.equipment_used = [...existingEquipmentUsed, ...selectedEquipment];
          }
        }
      } catch (transferError) {
        console.error('Error during equipment transfer flow:', transferError);
      }
    }

    // If job is being completed, remove technician assignment
    if (isBeingCompleted) {
      updateData.assigned_technician_id = null;
      updateData.technician_name = null;
      updateData.technician_phone = null;
      updateData.move_to_role = null;
    }

    // Update the job card
    let { data: updatedJob, error: updateError } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError && isMissingOptionalJobCardColumn(updateError.message)) {
      const fallbackUpdateData = stripOptionalJobCardColumns(updateData);
      ({ data: updatedJob, error: updateError } = await supabase
        .from('job_cards')
        .update(fallbackUpdateData)
        .eq('id', id)
        .select()
        .single());
    }

    if (updateError) {
      console.error('Error updating job card:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update job card',
          details: updateError.message || updateError.details || 'Unknown database error',
        },
        { status: 500 }
      );
    }

    // If job is being completed, handle vehicle addition and stock deduction
    if (isBeingCompleted) {
      try {
        // First, deduct stock from technician's boot stock
        if (currentJob.technician_phone && currentJob.parts_required && currentJob.assigned_technician_id) {
          console.log(`Deducting stock for technician: ${currentJob.technician_phone} (ID: ${currentJob.assigned_technician_id})`);
          await deductTechnicianStock(currentJob.technician_phone, currentJob.parts_required, currentJob.assigned_technician_id);
        }

        // Handle vehicle addition directly (avoid internal API-to-API round-trip).
        await addVehicleToInventoryIfInstall(updatedJob);
      } catch (error) {
        console.error('Error processing job completion:', error);
        // Don't fail the job completion if vehicle processing fails
      }
    }

    async function addVehicleToInventoryIfInstall(jobCard: any) {
      const jobType = String(jobCard?.job_type || '').toLowerCase();
      const isInstallJob = jobType === 'install' || jobType === 'installation';

      if (!isInstallJob) {
        console.log('Job completion processed: Job completed successfully. Vehicle not added to inventory (not an install job)');
        return;
      }

      const vehicleData = {
        reg: jobCard.vehicle_registration || '',
        vin: jobCard.vehicle_chassis || jobCard.vin_numer || '',
        make: jobCard.vehicle_make || '',
        model: jobCard.vehicle_model || '',
        year: jobCard.vehicle_year?.toString() || '',
        colour: jobCard.vehicle_colour || 'Unknown',
        company: jobCard.customer_name || 'Unknown Company',
        new_account_number: jobCard.new_account_number || `JOB-${jobCard.job_number}`,
        branch: null,
        fleet_number: null,
        engine: null,
        skylink_trailer_unit_ip: jobCard.ip_address || null,
        total_rental_sub: jobCard.quotation_total_amount || 0,
        total_rental: jobCard.quotation_subtotal || 0,
        total_sub: jobCard.quotation_vat_amount || 0
      };

      const { error: vehiclesError } = await supabase
        .from('vehicles')
        .insert([vehicleData]);

      if (vehiclesError) {
        console.error('Failed to process job completion: Failed to add vehicle to inventory', vehiclesError);
        return;
      }

      console.log('Job completion processed: Install job completed - Vehicle successfully added to vehicles table');
    }

    // Function to deduct stock from technician's boot stock
    async function deductTechnicianStock(technicianEmail: string, partsRequired: any[], technicianId: string) {
      try {
        console.log(`Attempting to deduct stock for technician: ${technicianEmail}`);
        
        // Validate that the technician email matches the assigned technician
        if (!technicianEmail || !technicianId) {
          console.log('Missing technician email or ID, skipping stock deduction');
          return;
        }

        // Get technician's current stock
        const { data: techStock, error: fetchError } = await supabase
          .from('tech_stock')
          .select('assigned_parts, technician_email')
          .eq('technician_email', technicianEmail)
          .single();

        if (fetchError || !techStock) {
          console.log('No tech stock found for technician:', technicianEmail);
          return;
        }

        // Double-check that we have the correct technician's stock
        if (techStock.technician_email !== technicianEmail) {
          console.error(`Technician email mismatch! Expected: ${technicianEmail}, Got: ${techStock.technician_email}`);
          return;
        }

        const assignedParts = techStock.assigned_parts || [];
        let updatedParts = [...assignedParts];
        let stockDeducted = false;

        // Match parts required with boot stock and deduct quantities
        partsRequired.forEach(requiredPart => {
          const stockIndex = updatedParts.findIndex(stockPart => 
            stockPart.code === requiredPart.code && 
            stockPart.boot_stock === 'yes'
          );

          if (stockIndex !== -1) {
            const currentQty = parseInt(updatedParts[stockIndex].quantity) || 0;
            const requiredQty = parseInt(requiredPart.quantity) || 0;
            const newQty = Math.max(0, currentQty - requiredQty);
            
            updatedParts[stockIndex] = {
              ...updatedParts[stockIndex],
              quantity: newQty,
              available_stock: newQty
            };
            
            stockDeducted = true;
            console.log(`Deducted ${requiredQty} of ${requiredPart.code} from technician stock`);
          }
        });

        // Update technician's stock if any deductions were made
        if (stockDeducted) {
          const { error: updateError } = await supabase
            .from('tech_stock')
            .update({ assigned_parts: updatedParts })
            .eq('technician_email', technicianEmail);

          if (updateError) {
            console.error('Error updating technician stock:', updateError);
          } else {
            console.log('Successfully updated technician stock');
          }
        }
      } catch (error) {
        console.error('Error deducting technician stock:', error);
      }
    }

    return NextResponse.json(updatedJob);

  } catch (error) {
    console.error('Error in job-cards PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
