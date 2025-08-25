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
    const accountPrefix = searchParams.get('prefix');

    if (!accountPrefix) {
      return NextResponse.json({ error: 'Account prefix is required' }, { status: 400 });
    }

    console.log('Fetching cost centers for account prefix:', accountPrefix);

    // Query cost_centers table to find records where new_account_number starts with the prefix
    // Using the exact pattern: SELECT * FROM cost_centers WHERE new_account_number LIKE 'KARG%'
    const { data: costCenters, error } = await supabase
      .from('cost_centers')
      .select('*')
      .like('new_account_number', `${accountPrefix}%`)
      .order('new_account_number', { ascending: true });

    if (error) {
      console.error('Error fetching cost centers:', error);
      return NextResponse.json({ error: 'Failed to fetch cost centers' }, { status: 500 });
    }

    console.log(`Found ${costCenters?.length || 0} cost centers for prefix ${accountPrefix}`);

    return NextResponse.json({ 
      success: true,
      costCenters: costCenters || [],
      prefix: accountPrefix
    });

  } catch (error) {
    console.error('Error in cost centers client GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
