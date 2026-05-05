import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OPTIONAL_JOB_CARD_COLUMNS = [
  'vehicle_chassis',
  'vehicle_colour',
  'old_serial_number',
  'new_serial_number',
] as const;

function stripOptionalJobCardColumns<T extends Record<string, any>>(payload: T): T {
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
      'id, job_number, order_number, account_id, new_account_number, customer_name, customer_email, customer_phone, customer_address, contact_person, job_type, job_sub_type, job_description, purchase_type, decommission_date, annuity_end_date, move_to_role, move_to, vehicle_registration, vehicle_make, vehicle_model, vehicle_year, vin_numer, odormeter, quote_notes, quote_email_subject, quote_email_body, quote_email_footer, quotation_products, deinstall_vehicles, completion_notes, fc_note_acknowledged, status, job_status, role, escalation_role, escalation_source_role, created_at, updated_at';

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

    delete updateData.transfer_equipment_from_assigned_parts;

    // Optional flow: move selected equipment from tech_stock.assigned_parts onto this job card.
    if (transferEquipmentFromAssignedParts && Array.isArray(body.equipment_used)) {
      try {
        const selectedEquipment = body.equipment_used as any[];

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
              const transferredParts: any[] = [];

              const selectedStockIds = new Set(
                selectedEquipment.map((item: any) => String(item?.stock_id || item?.id || ''))
              );

              const selectedKeys = new Set(
                selectedEquipment.map((item: any) => `${String(item?.code || '')}::${String(item?.supplier || '')}`)
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
        
        // Then call the add-vehicle endpoint internally (it will check job type)
        const addVehicleResponse = await fetch(`${request.nextUrl.origin}/api/job-cards/${id}/add-vehicle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({})
        });

        if (addVehicleResponse.ok) {
          const addVehicleResult = await addVehicleResponse.json();
          console.log('Job completion processed:', addVehicleResult.message);
        } else {
          console.error('Failed to process job completion:', await addVehicleResponse.text());
        }
      } catch (error) {
        console.error('Error processing job completion:', error);
        // Don't fail the job completion if vehicle processing fails
      }
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
