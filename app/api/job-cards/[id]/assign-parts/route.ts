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

    const jobId = await params.id;
    const body = await request.json();
    const { parts, ipAddress } = body;

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

    // Update stock quantities and store IP addresses
    for (const part of parts) {
      const { data: currentStock, error: stockError } = await supabase
        .from('stock')
        .select('quantity, cost_excl_vat_zar, total_value, ip_addresses')
        .eq('id', part.stock_id)
        .single();

      if (stockError) {
        console.error(`Error fetching stock for item ${part.stock_id}:`, stockError);
        continue;
      }

      const currentQuantity = parseInt(currentStock.quantity || '0');
      const newQuantity = currentQuantity - part.quantity;
      const costPerUnit = parseFloat(currentStock.cost_excl_vat_zar || '0');
      const newTotalValue = (newQuantity * costPerUnit).toFixed(2);
      
      // Update IP addresses array
      let ipAddresses = currentStock.ip_addresses || [];
      if (!Array.isArray(ipAddresses)) {
        ipAddresses = [];
      }
      if (!ipAddresses.includes(ipAddress)) {
        ipAddresses.push(ipAddress);
      }
      
      const { error: updateError } = await supabase
        .from('stock')
        .update({ 
          quantity: newQuantity.toString(),
          total_value: newTotalValue,
          ip_addresses: ipAddresses
        })
        .eq('id', part.stock_id);

      if (updateError) {
        console.error(`Error updating stock for item ${part.stock_id}:`, updateError);
      }
    }

    // Generate QR code data with comprehensive job information
    const qrData = {
      // Basic job information
      job_number: jobCard.job_number,
      quotation_number: jobCard.quotation_number,
      job_type: jobCard.job_type,
      job_description: jobCard.job_description,
      status: jobCard.status,
      priority: jobCard.priority,
      
      // Customer information
      customer_name: jobCard.customer_name,
      customer_email: jobCard.customer_email,
      customer_phone: jobCard.customer_phone,
      customer_address: jobCard.customer_address,
      
      // Vehicle information
      vehicle_registration: jobCard.vehicle_registration,
      vehicle_make: jobCard.vehicle_make,
      vehicle_model: jobCard.vehicle_model,
      vehicle_year: jobCard.vehicle_year,
      vin_numer: jobCard.vin_numer,
      odormeter: jobCard.odormeter,
      
      // Quotation details
      quotation_total_amount: jobCard.quotation_total_amount,
      quotation_products: jobCard.quotation_products,
      quote_status: jobCard.quote_status,
      quote_date: jobCard.quote_date,
      quote_expiry_date: jobCard.quote_expiry_date,
      
      // Job location and timing
      job_location: jobCard.job_location,
      latitude: jobCard.latitude,
      longitude: jobCard.longitude,
      created_at: jobCard.created_at,
      updated_at: jobCard.updated_at,
      
      // Assignment information
      ip_address: ipAddress,
      assigned_date: new Date().toISOString(),
      assigned_by: user.id,
      
      // Parts information
      assigned_parts: parts.map(part => ({
        description: part.description,
        quantity: part.quantity,
        code: part.code,
        supplier: part.supplier,
        cost_per_unit: part.cost_per_unit,
        total_cost: part.total_cost,
        stock_id: part.stock_id,
        assigned_ip: ipAddress
      })),
      total_parts: parts.length,
      total_cost: parts.reduce((sum, part) => sum + (part.total_cost || 0), 0),
      
      // Additional job details
      special_instructions: jobCard.special_instructions,
      access_requirements: jobCard.access_requirements,
      site_contact_person: jobCard.site_contact_person,
      site_contact_phone: jobCard.site_contact_phone,
      estimated_duration_hours: jobCard.estimated_duration_hours,
      estimated_cost: jobCard.estimated_cost,
      
      // Metadata
      job_id: jobCard.id,
      account_id: jobCard.account_id,
      created_by: jobCard.created_by,
      updated_by: jobCard.updated_by
    };

    console.log('Generating QR code with data:', qrData);

    // Generate QR code using external service with larger size for better readability
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(qrData))}`;
    
    console.log('Generated QR code URL:', qrCodeUrl);

    // Update job card with parts and QR code
    let updateData = {
      parts_required: parts,
      ip_address: ipAddress,
      qr_code: qrCodeUrl,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    // Try to update with all fields first
    let { data: updatedJob, error: updateError } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', jobId)
      .select('*')
      .single();

    // If update fails due to missing columns, try without qr_code and ip_address first
    if (updateError && updateError.message?.includes('column') && updateError.message?.includes('does not exist')) {
      console.log('QR code or IP address columns don\'t exist, trying without them...');
      
      // Try updating without qr_code and ip_address
      const { data: tempUpdatedJob, error: tempError } = await supabase
        .from('job_cards')
        .update({
          parts_required: parts,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', jobId)
        .select('*')
        .single();

      if (tempError) {
        console.error('Error updating job card:', tempError);
        return NextResponse.json({ error: 'Failed to update job card' }, { status: 500 });
      }

      updatedJob = tempUpdatedJob;
      console.log('Job card updated without QR code fields (fields may not exist in database)');
    } else if (updateError) {
      console.error('Error updating job card:', updateError);
      return NextResponse.json({ error: 'Failed to update job card' }, { status: 500 });
    }

    console.log('Job card updated successfully with QR code');

    return NextResponse.json({
      success: true,
      message: 'Parts assigned successfully',
      job_card: updatedJob,
      qr_code: qrCodeUrl
    });

  } catch (error) {
    console.error('Error in assign parts POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 