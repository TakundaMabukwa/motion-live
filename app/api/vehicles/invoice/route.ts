import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account number from query params
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    console.log(`Fetching vehicle invoice data for account: ${accountNumber}`);

    // Fetch vehicle data from vehicles table
    const { data: vehiclesData, error: fetchError } = await supabase
      .from('vehicles')
      .select(`
        id,
        company,
        new_account_number,
        fleet_number,
        reg,
        total_rental,
        total_sub,
        total_rental_sub
      `)
      .eq('new_account_number', accountNumber);

    if (fetchError) {
      console.error('Error fetching vehicle data:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch vehicle data' }, { status: 500 });
    }

    if (!vehiclesData || vehiclesData.length === 0) {
      return NextResponse.json({ 
        success: true,
        accountNumber,
        invoiceData: null,
        message: 'No vehicle data found for this account'
      });
    }

    console.log(`Found ${vehiclesData.length} vehicles for account ${accountNumber}`);

    // Calculate totals from vehicles data
    const totalRentalSub = vehiclesData.reduce((sum, vehicle) => sum + (parseFloat(vehicle.total_rental_sub) || 0), 0);
    const totalRental = vehiclesData.reduce((sum, vehicle) => sum + (parseFloat(vehicle.total_rental) || 0), 0);
    const totalSub = vehiclesData.reduce((sum, vehicle) => sum + (parseFloat(vehicle.total_sub) || 0), 0);
    
    // Calculate VAT from total_rental_sub (which includes 15% VAT)
    // VAT = total_rental_sub - (total_rental_sub / 1.15)
    const vatAmount = totalRentalSub - (totalRentalSub / 1.15);
    const amountExcludingVat = totalRentalSub - vatAmount;

    // Structure the vehicle data into an invoice-like format
    const invoiceData = {
      // Basic Info
      accountNumber: accountNumber,
      company: vehiclesData[0]?.company || 'N/A',
      reference: 'N/A', // Vehicles table doesn't have reference field
      
      // Dates
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      billingMonth: new Date().toISOString().split('T')[0].substring(0, 7) + '-01',
      lastUpdated: new Date().toISOString(),
      
      // Financial Data (using total_rental_sub as the main amount)
      dueAmount: amountExcludingVat, // Amount excluding VAT
      paidAmount: 0, // Vehicles table doesn't track payments
      balanceDue: totalRentalSub, // Display total_rental_sub as balance due
      
      // Overdue Data (not applicable for vehicles)
      overdue30Days: 0,
      overdue60Days: 0,
      overdue90Days: 0,
      totalOverdue: 0,
      
      // Status
      paymentStatus: 'pending',
      
      // Vehicle-specific totals
      totalRentalSub: totalRentalSub,
      totalRental: totalRental,
      totalSub: totalSub,
      vatAmount: vatAmount,
      amountExcludingVat: amountExcludingVat,
      // Updated field names for component compatibility
      vat_amount: vatAmount,
      unit_price_without_vat: amountExcludingVat,
      total_including_vat: totalRentalSub,
      
      // Invoice Items (one per vehicle)
      invoiceItems: vehiclesData.map((vehicle, index) => {
        const vehicleTotalRentalSub = parseFloat(vehicle.total_rental_sub) || 0;
        const vehicleVatAmount = vehicleTotalRentalSub - (vehicleTotalRentalSub / 1.15);
        const vehicleAmountExcludingVat = vehicleTotalRentalSub - vehicleVatAmount;
        
        return {
          id: vehicle.id,
          description: `Vehicle ${vehicle.reg || vehicle.fleet_number || `#${index + 1}`} - ${vehicle.company || 'N/A'}`,
          reference: vehicle.fleet_number || vehicle.reg || 'N/A',
          dueAmount: vehicleAmountExcludingVat, // Amount excluding VAT
          paidAmount: 0,
          balanceDue: vehicleTotalRentalSub, // Display total_rental_sub as balance due
          status: 'pending',
          billingMonth: new Date().toISOString().split('T')[0].substring(0, 7) + '-01',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          // Additional vehicle-specific fields
          reg: vehicle.reg,
          fleetNumber: vehicle.fleet_number,
          company: vehicle.company,
          totalRental: parseFloat(vehicle.total_rental) || 0,
          totalSub: parseFloat(vehicle.total_sub) || 0,
          totalRentalSub: vehicleTotalRentalSub,
          // Updated field names to match component expectations
          vat_amount: vehicleVatAmount,
          unit_price_without_vat: vehicleAmountExcludingVat,
          total_including_vat: vehicleTotalRentalSub,
          // Keep old field names for backward compatibility
          vatAmount: vehicleVatAmount,
          amountExcludingVat: vehicleAmountExcludingVat
        };
      })
    };

    return NextResponse.json({
      success: true,
      accountNumber,
      invoiceData,
      message: 'Vehicle invoice data retrieved successfully'
    });

  } catch (error) {
    console.error('Error in vehicle invoice API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
