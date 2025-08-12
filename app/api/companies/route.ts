import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Temporarily disable authentication for testing
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Fetching MACS companies using SQL-like query...');

    // Use SQL-like query to get all vehicles where new_account_number starts with 'MACS'
    const { data: vehicles, error } = await supabase
      .from('vehicles_ip')
      .select('*')
      .like('new_account_number', 'MACS%');

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }

    console.log('Found vehicles with MACS accounts:', vehicles?.length || 0);

    // Group vehicles by company and count them
    const companyMap = new Map<string, { company: string; new_account_number: string; vehicle_count: number }>();
    
    vehicles?.forEach((vehicle) => {
      const company = vehicle.company || 'Unknown Company';
      const accountNumber = vehicle.new_account_number || '';
      
      if (!companyMap.has(company)) {
        companyMap.set(company, {
          company,
          new_account_number: accountNumber,
          vehicle_count: 0
        });
      }
      
      // Increment vehicle count for this company
      const existing = companyMap.get(company)!;
      existing.vehicle_count += 1;
    });

    // Convert map to array and sort by company name
    const uniqueCompanies = Array.from(companyMap.values())
      .sort((a, b) => a.company.localeCompare(b.company))
      .map((item, index) => ({
        id: index.toString(),
        company: item.company,
        new_account_number: item.new_account_number,
        vehicle_count: item.vehicle_count
      }));

    console.log('Processed unique MACS companies:', uniqueCompanies.length);
    console.log('MACS companies found:', uniqueCompanies.map(c => `${c.company} (${c.new_account_number})`));

    return NextResponse.json({
      success: true,
      companies: uniqueCompanies,
      count: uniqueCompanies.length
    });

  } catch (error) {
    console.error('Error in companies GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
