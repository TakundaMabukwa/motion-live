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
    const allNewAccountNumbers = searchParams.get('all_new_account_numbers');

    if (!allNewAccountNumbers) {
      return NextResponse.json({ error: 'all_new_account_numbers parameter is required' }, { status: 400 });
    }

    console.log('Fetching cost centers for account numbers:', allNewAccountNumbers);

    // Parse, deduplicate and normalize account numbers
    const accountNumbers = [...new Set(
      allNewAccountNumbers
        .split(',')
        .map(num => num.trim().toUpperCase())
        .filter(num => num)
    )];
    
    if (accountNumbers.length === 0) {
      return NextResponse.json({ 
        success: true,
        costCenters: [],
        accountNumbers: []
      });
    }

    console.log('Deduplicated account numbers:', accountNumbers);

    // Single optimized query with case-insensitive matching
    const { data: costCenters, error } = await supabase
      .from('cost_centers')
      .select('*')
      .or(accountNumbers.map(num => `cost_code.ilike.${num}`).join(','))
      .order('cost_code', { ascending: true });

    if (error) {
      console.error('Error fetching cost centers:', error);
      return NextResponse.json({ error: 'Failed to fetch cost centers' }, { status: 500 });
    }

    console.log(`Found ${costCenters?.length || 0} cost centers for account numbers:`, accountNumbers);

    return NextResponse.json({ 
      success: true,
      costCenters: costCenters || [],
      accountNumbers: accountNumbers,
      matchedCount: costCenters?.length || 0
    });

  } catch (error) {
    console.error('Error in cost centers client GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
