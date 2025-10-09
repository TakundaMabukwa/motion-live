import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication - handle potential undefined auth
    let user = null;
    let authError = null;
    
    try {
      const authResult = await supabase.auth.getUser();
      user = authResult.data?.user;
      authError = authResult.error;
    } catch (authErr) {
      console.error('Auth error:', authErr);
      authError = authErr;
    }
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account number from query params
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    console.log(`Fetching vehicle invoices for account: ${accountNumber}`);

    // Fetch vehicles for the account using the vehicles table
    const { data: vehicles, error: fetchError } = await supabase
      .from('vehicles')
      .select('id, created_at, company, new_account_number, unique_id, fleet_number, reg, total_rental_sub')
      .eq('new_account_number', accountNumber);

    if (fetchError) {
      console.error('Error fetching vehicles:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    // Transform vehicles data to invoice format with VAT calculations
    const vehicleInvoices = vehicles?.map(vehicle => {
      const totalRentalSub = parseFloat(vehicle.total_rental_sub) || 0;
      
      // Calculate VAT: 15% of the total_rental_sub (which includes VAT)
      // To get unit price without VAT: total_rental_sub / 1.15
      // To get VAT amount: total_rental_sub - unit_price
      const unitPriceWithoutVat = totalRentalSub / 1.15;
      const vatAmount = totalRentalSub - unitPriceWithoutVat;
      
      // Determine service type based on amounts
      const totalRental = parseFloat(vehicle.total_rental) || 0;
      const totalSub = parseFloat(vehicle.total_sub) || 0;
      
      let serviceType = 'Vehicle Service';
      if (totalRental > 0 && totalSub === 0) {
        serviceType = 'Rental Service';
      } else if (totalSub > 0 && totalRental === 0) {
        serviceType = 'Subscription Service';
      } else if (totalRental > 0 && totalSub > 0) {
        serviceType = 'Rental & Subscription Service';
      }

      return {
        id: vehicle.id,
        created_at: vehicle.created_at,
        company: vehicle.company,
        new_account_number: vehicle.new_account_number,
        unique_id: vehicle.unique_id,
        fleet_number: vehicle.fleet_number,
        reg: vehicle.reg,
        total_rental_sub: totalRentalSub,
        // Invoice-specific fields
        unit_price_without_vat: unitPriceWithoutVat,
        vat_amount: vatAmount,
        vat_percentage: 15.00,
        total_including_vat: totalRentalSub,
        // For compatibility with existing invoice generation
        stock_code: `VEH-${vehicle.reg || vehicle.fleet_number || vehicle.id}`,
        stock_description: serviceType,
        doc_no: `INV-${vehicle.reg || vehicle.fleet_number || vehicle.id}`,
        total_ex_vat: unitPriceWithoutVat,
        total_vat: vatAmount,
        total_incl_vat: totalRentalSub,
        one_month: unitPriceWithoutVat,
        amount_due: totalRentalSub,
        monthly_amount: unitPriceWithoutVat,
        beame: vehicle.company || '',
        beame_2: vehicle.fleet_number || '',
        beame_3: vehicle.reg || '',
        ip_address: '',
        updated_at: new Date().toISOString()
      };
    }) || [];

    console.log(`Found ${vehicleInvoices?.length || 0} vehicles for account ${accountNumber}`);

    return NextResponse.json({
      success: true,
      accountNumber,
      vehicleInvoices: vehicleInvoices
    });

  } catch (error) {
    console.error('Error in vehicle invoices API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
