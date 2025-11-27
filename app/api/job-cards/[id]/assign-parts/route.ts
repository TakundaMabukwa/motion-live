import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { inventory_items, ipAddress, technician_id, technician_name, technician_email } = body;
    const parts = inventory_items || [];

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
    
    // Then, delete items from inventory_items
    for (const item of parts) {
      const itemId = item.stock_id || item.inventory_item_id;
      if (!itemId) continue;
      
      // Delete the item from inventory
      await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);
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
    if (jobCard.technician_phone || finalTechnicianEmail) {
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