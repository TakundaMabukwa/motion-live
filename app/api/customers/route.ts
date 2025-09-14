import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const prefix = searchParams.get('prefix') || '';
    const limit = 20;
    const offset = (page - 1) * limit;

    console.log('Fetching customers with search:', search, 'page:', page, 'prefix:', prefix);

    // If a specific prefix is requested, return individual accounts for that prefix
    if (prefix) {
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles_ip')
        .select('new_account_number, company, group_name, new_registration, beame_1, beame_2, beame_3')
        .like('new_account_number', `${prefix}-%`);

      if (vehiclesError) {
        console.error('Error fetching vehicles for prefix:', vehiclesError);
        return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
      }

      // Group vehicles by account number
      const accountGroups = {};
      vehicles?.forEach(vehicle => {
        const accountNumber = vehicle.new_account_number;
        if (!accountGroups[accountNumber]) {
          accountGroups[accountNumber] = {
            new_account_number: accountNumber,
            company: vehicle.company || 'Unknown Company',
            vehicle_count: 0,
            vehicles: []
          };
        }
        accountGroups[accountNumber].vehicle_count++;
        accountGroups[accountNumber].vehicles.push(vehicle);
      });

      const accounts = Object.values(accountGroups).sort((a, b) => 
        a.new_account_number.localeCompare(b.new_account_number)
      );

      // Get prefix info
      const prefixInfo = {
        prefix: prefix,
        company_name: vehicles?.[0]?.company || `${prefix} Company`,
        total_accounts: accounts.length,
        total_vehicles: vehicles?.length || 0
      };

      return NextResponse.json({
        accounts,
        prefixInfo
      });
    }

    // First, get all unique account numbers from vehicles_ip table
    const { data: allAccountNumbers, error: accountError } = await supabase
      .from('vehicles_ip')
      .select('new_account_number')
      .not('new_account_number', 'is', null);

    if (accountError) {
      console.error('Error fetching account numbers:', accountError);
      return NextResponse.json({ error: 'Failed to fetch account numbers' }, { status: 500 });
    }

    console.log('All account numbers from vehicles_ip:', allAccountNumbers?.length || 0);

    // Extract unique account prefixes (before the dash)
    const accountPrefixes = new Set();
    allAccountNumbers?.forEach(item => {
      if (item.new_account_number && item.new_account_number.includes('-')) {
        const prefix = item.new_account_number.split('-')[0];
        accountPrefixes.add(prefix);
      }
    });

    console.log('Unique account prefixes:', Array.from(accountPrefixes));
    console.log('Sample account numbers:', allAccountNumbers?.slice(0, 10).map(item => item.new_account_number));

    // Get all accounts for these prefixes
    const accountConditions = Array.from(accountPrefixes).map(prefix => 
      `new_account_number.ilike.${prefix}-%`
    );

    console.log('Account conditions:', accountConditions);

    let query = supabase
      .from('vehicles_ip')
      .select('new_account_number, company, group_name, new_registration, beame_1, beame_2, beame_3');

    // Combine all conditions in a single OR statement
    const allConditions = [...accountConditions];
    
    // Add search filter if provided
    if (search) {
      allConditions.push(`company.ilike.%${search}%`);
      allConditions.push(`group_name.ilike.%${search}%`);
      allConditions.push(`new_registration.ilike.%${search}%`);
    }

    // Apply OR conditions
    if (allConditions.length > 0) {
      query = query.or(allConditions.join(','));
    }

    console.log('Final query conditions:', allConditions);

    // Remove pagination to get all results
    const { data: vehicles, error: vehiclesError } = await query;

    if (vehiclesError) {
      console.error('Error fetching vehicles:', vehiclesError);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    console.log('Vehicles found:', vehicles?.length || 0);
    console.log('Sample vehicles:', vehicles?.slice(0, 5).map(v => ({
      account: v.new_account_number,
      company: v.company,
      plate: v.group_name || v.new_registration
    })));

    // Group vehicles by account prefix (before the dash) and create customer objects
    const prefixGroups = {};
    vehicles?.forEach(vehicle => {
      const accountNumber = vehicle.new_account_number;
      if (accountNumber && accountNumber.includes('-')) {
        const prefix = accountNumber.split('-')[0];
        
        if (!prefixGroups[prefix]) {
          prefixGroups[prefix] = {
            prefix: prefix,
            company_name: vehicle.company || `${prefix} Company`,
            total_accounts: 0,
            total_vehicles: 0,
            accounts: [],
            sample_vehicles: []
          };
        }
        
        // Add account if not already present
        if (!prefixGroups[prefix].accounts.includes(accountNumber)) {
          prefixGroups[prefix].accounts.push(accountNumber);
          prefixGroups[prefix].total_accounts++;
        }
        
        prefixGroups[prefix].total_vehicles++;
        
        // Keep sample vehicles (first 3)
        if (prefixGroups[prefix].sample_vehicles.length < 3) {
          prefixGroups[prefix].sample_vehicles.push({
            plate: vehicle.group_name || vehicle.new_registration || 'Unknown',
            make: vehicle.beame_1 || '',
            model: vehicle.beame_2 || '',
            account: accountNumber
          });
        }
      }
    });

    console.log('Prefix groups found:', Object.keys(prefixGroups));
    console.log('MACS prefix group:', prefixGroups['MACS']);

    // Convert to array and sort
    const customers = Object.values(prefixGroups).sort((a, b) => 
      a.prefix.localeCompare(b.prefix)
    );

    console.log('Grouped customers by prefix:', customers.length);

    return NextResponse.json({
      customers,
      pagination: {
        page: 1,
        limit: customers.length,
        total: customers.length,
        hasMore: false
      }
    });

  } catch (error) {
    console.error('Error in customers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Re-enable authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.account_number || !body.company || !body.trading_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: account_number, company, and trading_name are required' 
      }, { status: 400 });
    }

    // Prepare customer data
    const customerData = {
      divisions: body.divisions || null,
      account_number: body.account_number,
      company: body.company,
      legal_name: body.legal_name || null,
      trading_name: body.trading_name,
      holding_company: body.holding_company || null,
      annual_billing_run_date: body.annual_billing_run_date || null,
      payment_terms: body.payment_terms || null,
      category: body.category || null,
      accounts_status: body.accounts_status || 'active',
      acc_contact: body.acc_contact || null,
      sales_rep: body.sales_rep || null,
      date_added: body.date_added || new Date().toISOString(),
      switchboard: body.switchboard || null,
      cell_no: body.cell_no || null,
      email: body.email || null,
      send_accounts_to_contact: body.send_accounts_to_contact || null,
      send_accounts_to_email_for_statements_and_multibilling: body.send_accounts_to_email_for_statements_and_multibilling || null,
      vat_number: body.vat_number || null,
      vat_exempt_number: body.vat_exempt_number || null,
      registration_number: body.registration_number || null,
      creator: body.creator || null,
      modified_by: body.modified_by || null,
      date_modified: body.date_modified || new Date().toISOString(),
      physical_address_1: body.physical_address_1 || null,
      physical_address_2: body.physical_address_2 || null,
      physical_address_3: body.physical_address_3 || null,
      physical_area: body.physical_area || null,
      physical_province: body.physical_province || null,
      physical_code: body.physical_code || null,
      physical_country: body.physical_country || null,
      postal_address_1: body.postal_address_1 || null,
      postal_address_2: body.postal_address_2 || null,
      postal_area: body.postal_area || null,
      postal_province: body.postal_province || null,
      postal_code: body.postal_code || null,
      postal_country: body.postal_country || null,
      branch_person: body.branch_person || null,
      branch_person_number: body.branch_person_number || null,
      branch_person_email: body.branch_person_email || null,
      count_of_products: body.count_of_products || null,
    };

    // Insert the customer
    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting customer:', error);
      return NextResponse.json({ 
        error: 'Failed to create customer account',
        details: error.message 
      }, { status: 500 });
    }

    // Update customers_grouped table
    try {
      // Check if a record exists for this company group
      const { data: existingGroup, error: groupError } = await supabase
        .from('customers_grouped')
        .select('*')
        .eq('company_group', body.company)
        .single();

      if (groupError && groupError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking existing group:', groupError);
        // Continue without failing the main operation
      } else if (existingGroup) {
        // Update existing record - append new account number to all_new_account_numbers
        const existingAccountNumbers = existingGroup.all_new_account_numbers || '';
        const updatedAccountNumbers = existingAccountNumbers 
          ? `${existingAccountNumbers},${body.account_number}`
          : body.account_number;

        const { error: updateError } = await supabase
          .from('customers_grouped')
          .update({
            all_new_account_numbers: updatedAccountNumbers,
            cost_code: body.account_number
          })
          .eq('id', existingGroup.id);

        if (updateError) {
          console.error('Error updating customers_grouped:', updateError);
        }
      } else {
        // Create new record in customers_grouped
        const groupedData = {
          company_group: body.company,
          legal_names: body.legal_name || null,
          all_account_numbers: body.account_number,
          all_new_account_numbers: body.account_number,
          cost_code: body.account_number
        };

        const { error: insertGroupError } = await supabase
          .from('customers_grouped')
          .insert([groupedData]);

        if (insertGroupError) {
          console.error('Error inserting into customers_grouped:', insertGroupError);
        }
      }
    } catch (groupedError) {
      console.error('Error handling customers_grouped:', groupedError);
      // Don't fail the main operation if grouped table update fails
    }

    return NextResponse.json({ 
      success: true,
      message: 'Customer account created successfully',
      data: data 
    });

  } catch (error) {
    console.error('Error in customers POST:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 