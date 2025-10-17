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
    const { parts, ipAddress, technician_id, technician_name, technician_email } = body;

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



    // Validate parts and check stock availability
    const stockErrors = [];
    for (const part of parts) {
      const { data: stockItem, error: stockError } = await supabase
        .from('stock')
        .select('quantity')
        .eq('id', part.stock_id)
        .single();

      if (stockError || !stockItem) {
        stockErrors.push(`Stock item ${part.stock_id} not found`);
        continue;
      }

      const currentStock = parseInt(stockItem.quantity || '0');
      if (currentStock < part.quantity) {
        stockErrors.push(`Insufficient stock for item ${part.description}. Available: ${currentStock}, Required: ${part.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Stock validation failed', 
        details: stockErrors 
      }, { status: 400 });
    }

    // Update stock quantities
    for (const part of parts) {
      const { data: currentStock, error: stockError } = await supabase
        .from('stock')
        .select('quantity, cost_excl_vat_zar, total_value, ip_addresses')
        .eq('id', part.stock_id)
        .single();

      if (stockError) continue;

      const currentQuantity = parseInt(currentStock.quantity || '0');
      const newQuantity = currentQuantity - part.quantity;
      const costPerUnit = parseFloat(currentStock.cost_excl_vat_zar || '0');
      const newTotalValue = (newQuantity * costPerUnit).toFixed(2);
      
      let ipAddresses = currentStock.ip_addresses || [];
      if (!Array.isArray(ipAddresses)) ipAddresses = [];
      if (!ipAddresses.includes(ipAddress)) ipAddresses.push(ipAddress);
      
      await supabase
        .from('stock')
        .update({ 
          quantity: newQuantity.toString(),
          total_value: newTotalValue,
          ip_addresses: ipAddresses
        })
        .eq('id', part.stock_id);
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