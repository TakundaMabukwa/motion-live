import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return NextResponse.json({ error: 'Account number is required' }, { status: 400 });
    }

    // Fetch all vehicle fields
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('new_account_number', accountNumber);

    if (error) throw error;
    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({ 
        success: true,
        accountNumber,
        invoiceData: null,
        message: 'No vehicle data found'
      });
    }

    // Fetch customer details
    const { data: customers } = await supabase
      .from('customers')
      .select('legal_name, company, trading_name, new_account_number, account_number')
      .eq('new_account_number', accountNumber);

    const customer = customers?.[0];
    const companyName = customer?.legal_name || customer?.company || customer?.trading_name || '';

    // Build invoice items
    const invoiceItems = [];
    let totalAmount = 0;

    vehicles.forEach((vehicle) => {
      // Show both reg and fleet_number if available
      let regFleetDisplay = '';
      if (vehicle.reg && vehicle.fleet_number) {
        regFleetDisplay = `${vehicle.reg} / ${vehicle.fleet_number}`;
      } else {
        regFleetDisplay = vehicle.reg || vehicle.fleet_number || '';
      }
      
      // Loop through all fields to find billable items
      Object.keys(vehicle).forEach((key) => {
        // Check if it's a rental, sub, or roaming field with a value
        if ((key.includes('_rental') || key.includes('_sub') || key === 'roaming') && vehicle[key]) {
          const amount = parseFloat(vehicle[key]) || 0;
          if (amount > 0) {
            // Get the base field name (without _rental or _sub)
            const baseFieldName = key.replace(/_rental$/, '').replace(/_sub$/, '');
            
            // Check if the corresponding equipment field is not empty
            const equipmentField = vehicle[baseFieldName];
            const hasEquipment = equipmentField && equipmentField.toString().trim() !== '';
            
            if (hasEquipment || key === 'roaming') {
              const vatAmount = amount * 0.15;
              const totalInclVat = amount + vatAmount;
              
              // Format the field name as item description
              let itemName = baseFieldName
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
              
              // Add billing type suffix
              if (key.includes('_rental')) itemName += ' - Monthly Rental';
              else if (key.includes('_sub')) itemName += ' - Monthly Subscription';
              else if (key === 'roaming') itemName = 'Roaming - Monthly Fee';
              
              invoiceItems.push({
                reg: regFleetDisplay,
                item_code: baseFieldName.toUpperCase(),
                item: itemName,
                company: vehicle.company || companyName,
                account_number: vehicle.new_account_number || '',
                units: 1,
                unit_price: amount.toFixed(2),
                total_excl_vat: amount.toFixed(2),
                vat_amount: vatAmount.toFixed(2),
                total_incl_vat: totalInclVat.toFixed(2)
              });
              
              totalAmount += totalInclVat;
            }
          }
        }
      });
    });

    // Structure invoice
    const invoiceData = {
      company_name: companyName,
      account_number: accountNumber,
      invoice_date: new Date().toLocaleDateString(),
      invoice_items: invoiceItems,
      total_amount: totalAmount.toFixed(2)
    };

    return NextResponse.json({
      success: true,
      accountNumber,
      invoiceData,
      message: 'Invoice generated successfully'
    });

  } catch (error) {
    console.error('Error in vehicle invoice API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
