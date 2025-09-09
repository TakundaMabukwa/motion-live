import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
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

    const { id: jobId } = await params;
    const body = await request.json();

    // Get the job card details
    const { data: jobCard, error: jobError } = await supabase
      .from('job_cards')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !jobCard) {
      console.error('Error fetching job card:', jobError);
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    // Check if job is completed
    if (jobCard.job_status !== 'Completed') {
      return NextResponse.json({ 
        error: 'Job must be completed before adding vehicle to inventory' 
      }, { status: 400 });
    }

    // Extract vehicle information from job card
    const vehicleData = {
      // For vehicles_ip table
      new_account_number: jobCard.account_id || `JOB-${jobCard.job_number}`,
      company: jobCard.customer_name || 'Unknown Company',
      comment: `Added from completed job: ${jobCard.job_number}`,
      group_name: jobCard.customer_name || 'Default Group',
      new_registration: jobCard.vehicle_registration || '',
      beame_1: jobCard.vehicle_make || '',
      beame_2: jobCard.vehicle_model || '',
      beame_3: jobCard.vehicle_year?.toString() || '',
      ip_address: '', // Will be set later if needed
      products: jobCard.products_required || [],
      active: true
    };

    // For vehicle_invoices table
    const invoiceData = {
      new_account_number: jobCard.account_id || `JOB-${jobCard.job_number}`,
      company: jobCard.customer_name || 'Unknown Company',
      group_name: jobCard.customer_name || 'Default Group',
      stock_code: `VEH-${jobCard.vehicle_registration || jobCard.job_number}`,
      stock_description: `${jobCard.vehicle_make || 'Vehicle'} ${jobCard.vehicle_model || ''} ${jobCard.vehicle_year || ''}`.trim(),
      doc_no: `INV-${jobCard.job_number}`,
      total_ex_vat: jobCard.actual_cost || 0,
      total_vat: (jobCard.actual_cost || 0) * 0.15, // Assuming 15% VAT
      total_incl_vat: (jobCard.actual_cost || 0) * 1.15,
      one_month: jobCard.actual_cost || 0,
      '2nd_month': 0,
      '3rd_month': 0,
      amount_due: (jobCard.actual_cost || 0) * 1.15,
      monthly_amount: jobCard.actual_cost || 0,
      beame: jobCard.vehicle_make || '',
      beame_2: jobCard.vehicle_model || '',
      beame_3: jobCard.vehicle_year?.toString() || '',
      ip_address: '', // Will be set later if needed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const results = {
      vehicles_ip: null,
      vehicle_invoices: null,
      errors: []
    };

    // Add to vehicles_ip table
    try {
      const { data: vehiclesIpData, error: vehiclesIpError } = await supabase
        .from('vehicles_ip')
        .insert([vehicleData])
        .select()
        .single();

      if (vehiclesIpError) {
        console.error('Error adding to vehicles_ip:', vehiclesIpError);
        results.errors.push(`vehicles_ip: ${vehiclesIpError.message}`);
      } else {
        results.vehicles_ip = vehiclesIpData;
      }
    } catch (error) {
      console.error('Exception adding to vehicles_ip:', error);
      results.errors.push(`vehicles_ip: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Add to vehicle_invoices table
    try {
      const { data: invoiceDataResult, error: invoiceError } = await supabase
        .from('vehicle_invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) {
        console.error('Error adding to vehicle_invoices:', invoiceError);
        results.errors.push(`vehicle_invoices: ${invoiceError.message}`);
      } else {
        results.vehicle_invoices = invoiceDataResult;
      }
    } catch (error) {
      console.error('Exception adding to vehicle_invoices:', error);
      results.errors.push(`vehicle_invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Update job card to mark vehicle as added to inventory
    try {
      const { error: updateError } = await supabase
        .from('job_cards')
        .update({
          vehicle_added_to_inventory: true,
          vehicle_added_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error updating job card:', updateError);
        results.errors.push(`job_card_update: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Exception updating job card:', error);
      results.errors.push(`job_card_update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Return results
    if (results.errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Some operations failed',
        results,
        errors: results.errors
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: 'Vehicle successfully added to inventory',
      results
    });

  } catch (error) {
    console.error('Error in add-vehicle API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
