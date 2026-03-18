import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accounts = searchParams.get('accounts');
    const prefix = searchParams.get('prefix');
    const all = searchParams.get('all');

    if (!accounts && !prefix && all !== '1') {
      return NextResponse.json(
        { error: 'Account numbers, prefix, or all=1 required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    if (all === '1') {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, created_at, company, cost_code, validated')
        .order('cost_code', { ascending: true });

      if (error) {
        console.error('Error fetching all cost centers:', error);
        return NextResponse.json(
          { error: 'Failed to fetch cost centers', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(data || []);
    }

    // Prefix mode: fetch all cost centers for a client prefix like EDGE-
    if (prefix) {
      const cleanPrefix = prefix.trim().replace(/-+$/, '');
      if (!cleanPrefix) {
        return NextResponse.json([], { status: 200 });
      }

      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, created_at, company, cost_code, validated')
        .ilike('cost_code', `${cleanPrefix}-%`)
        .order('cost_code', { ascending: true });

      if (error) {
        console.error('Error fetching cost centers by prefix:', error);
        return NextResponse.json(
          { error: 'Failed to fetch cost centers', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(data || []);
    }

    // Parse comma-separated account numbers
    const accountArray = accounts.split(',').map(a => a.trim()).filter(a => a);
    console.log('Fetching cost centers for accounts:', accountArray);

    // Fetch from cost_centers table where cost_code matches any account number
    const { data, error } = await supabase
      .from('cost_centers')
      .select('id, created_at, company, cost_code, validated')
      .in('cost_code', accountArray)
      .order('cost_code', { ascending: true });

    // If cost_centers table doesn't have data, try fetching distinct cost_code from customers_grouped
    if ((!data || data.length === 0) && accountArray.length > 0) {
      console.log('No cost centers found, checking customers_grouped');
      const { data: customerData } = await supabase
        .from('customers_grouped')
        .select('cost_code')
        .in('all_new_account_numbers', accountArray);
      if (customerData && customerData.length > 0) {
        // Get unique cost codes
        const uniqueCostCodes = [...new Set(customerData.map(c => c.cost_code).filter(code => code))];
        
        // Try to fetch validated status from cost_centers table
        const { data: ccData } = await supabase
          .from('cost_centers')
          .select('cost_code, validated')
          .in('cost_code', uniqueCostCodes);
        
        const validatedMap = {};
        if (ccData) {
          ccData.forEach(cc => {
            validatedMap[cc.cost_code] = cc.validated || false;
          });
        }
        
        const costCodes = uniqueCostCodes.map(code => ({
          cost_code: code,
          company: '',
          id: null,
          created_at: null,
          validated: validatedMap[code] || false
        }));
        console.log('Cost codes from customers_grouped:', costCodes);
        return NextResponse.json(costCodes);
      }
    }

    if (error) {
      console.error('Error fetching cost centers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cost centers', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (e) {
    return NextResponse.json(
      { error: 'Unexpected error', details: e.message },
      { status: 500 }
    );
  }
}
