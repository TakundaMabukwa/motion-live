import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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



    // Assign inventory items to job and technician
    for (const item of parts) {
      await supabase
        .from('inventory_items')
        .update({
          status: 'ASSIGNED',
          assigned_to_technician: finalTechnicianEmail,
          assigned_date: new Date().toISOString(),
          job_card_id: jobId
        })
        .eq('id', item.inventory_item_id)
        .eq('status', 'IN STOCK');
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

    return NextResponse.json({
      message: finalTechnicianEmail ? 'Parts and technician assigned successfully' : 'Parts assigned successfully',
      job: updatedJob,
      qr_code: qrCodeUrl
    });

  } catch (error) {
    console.error('Error assigning parts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}