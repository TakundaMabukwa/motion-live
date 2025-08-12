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