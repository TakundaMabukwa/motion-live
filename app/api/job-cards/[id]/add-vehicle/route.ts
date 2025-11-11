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

    // Check if job type is install or installation (case insensitive)
    const jobType = (jobCard.job_type || '').toLowerCase();
    const isInstallJob = jobType === 'install' || jobType === 'installation';

    if (!isInstallJob) {
      return NextResponse.json({
        success: true,
        message: 'Job completed successfully. Vehicle not added to inventory (not an install job)',
        jobType: jobCard.job_type,
        isInstallJob: false
      });
    }

    // Extract vehicle information from job card for new vehicles table
    const vehicleData = {
      reg: jobCard.vehicle_registration || '',
      vin: jobCard.vin_numer || '',
      make: jobCard.vehicle_make || '',
      model: jobCard.vehicle_model || '',
      year: jobCard.vehicle_year?.toString() || '',
      colour: 'Unknown',
      company: jobCard.customer_name || 'Unknown Company',
      new_account_number: jobCard.new_account_number || `JOB-${jobCard.job_number}`,
      branch: null,
      fleet_number: null,
      engine: null,
      skylink_trailer_unit_ip: jobCard.ip_address || null,
      total_rental_sub: jobCard.quotation_subtotal || 0,
      total_rental: jobCard.quotation_total_amount || 0,
      total_sub: jobCard.quotation_vat_amount || 0
    };

    // For vehicle_invoices table
    const invoiceData = {
      new_account_number: jobCard.new_account_number || `JOB-${jobCard.job_number}`,
      company: jobCard.customer_name || 'Unknown Company',
      group_name: jobCard.customer_name || 'Default Group',
      stock_code: `VEH-${jobCard.vehicle_registration || jobCard.job_number}`,
      stock_description: `${jobCard.vehicle_make || 'Vehicle'} ${jobCard.vehicle_model || ''} ${jobCard.vehicle_year || ''}`.trim(),
      doc_no: `INV-${jobCard.job_number}`,
      total_ex_vat: jobCard.quotation_subtotal || 0,
      total_vat: jobCard.quotation_vat_amount || 0,
      total_incl_vat: jobCard.quotation_total_amount || 0,
      one_month: jobCard.quotation_subtotal || 0,
      '2nd_month': 0,
      '3rd_month': 0,
      amount_due: jobCard.quotation_total_amount || 0,
      monthly_amount: jobCard.quotation_subtotal || 0,
      beame: jobCard.vehicle_make || '',
      beame_2: jobCard.vehicle_model || '',
      beame_3: jobCard.vehicle_year?.toString() || '',
      ip_address: '', // Will be set later if needed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const results = {
      vehicles: null,
      errors: []
    };

    // Add to vehicles table
    try {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .insert([vehicleData])
        .select()
        .single();

      if (vehiclesError) {
        console.error('Error adding to vehicles table:', vehiclesError);
        results.errors.push(`vehicles: ${vehiclesError.message}`);
      } else {
        results.vehicles = vehiclesData;
      }
    } catch (error) {
      console.error('Exception adding to vehicles table:', error);
      results.errors.push(`vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Update job card to mark vehicle as added to inventory
    try {
      const { error: updateError } = await supabase
        .from('job_cards')
        .update({
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
      message: 'Install job completed - Vehicle successfully added to vehicles table',
      jobType: jobCard.job_type,
      isInstallJob: true,
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
