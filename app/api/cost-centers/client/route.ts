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

    // Parse comma-separated account numbers and normalize them
    const accountNumbers = allNewAccountNumbers
      .split(',')
      .map(num => num.trim())
      .filter(num => num)
      .map(num => num.toUpperCase()); // Normalize to uppercase
    
    if (accountNumbers.length === 0) {
      return NextResponse.json({ 
        success: true,
        costCenters: [],
        accountNumbers: []
      });
    }

    console.log('Parsed and normalized account numbers:', accountNumbers);

    // Query cost_centers table using case-insensitive matching
    // First try exact match with normalized case
    let { data: costCenters, error } = await supabase
      .from('cost_centers')
      .select('*')
      .in('cost_code', accountNumbers)
      .order('cost_code', { ascending: true });

    // If no exact matches found, try case-insensitive search
    if (!costCenters || costCenters.length === 0) {
      console.log('No exact matches found, trying case-insensitive search...');
      
      // Build case-insensitive query using OR conditions
      const caseInsensitiveConditions = accountNumbers.map(num => 
        `cost_code.ilike.%${num}%`
      ).join(',');
      
      const { data: caseInsensitiveResults, error: caseInsensitiveError } = await supabase
        .from('cost_centers')
        .select('*')
        .or(caseInsensitiveConditions)
        .order('cost_code', { ascending: true });
      
      if (caseInsensitiveError) {
        console.error('Case-insensitive search error:', caseInsensitiveError);
      } else {
        costCenters = caseInsensitiveResults;
        console.log('Case-insensitive search results:', costCenters?.length || 0);
      }
    }

    // If still no results, try trimming whitespace from cost_code in database
    if (!costCenters || costCenters.length === 0) {
      console.log('No case-insensitive matches found, trying whitespace-trimmed search...');
      
      // Get all cost centers and filter manually to handle whitespace
      const { data: allCostCenters, error: allError } = await supabase
        .from('cost_centers')
        .select('*')
        .order('cost_code', { ascending: true });
      
      if (!allError && allCostCenters) {
        // Filter manually to handle whitespace in cost_code
        costCenters = allCostCenters.filter(center => {
          const normalizedCostCode = center.cost_code?.trim().toUpperCase();
          return accountNumbers.includes(normalizedCostCode);
        });
        console.log('Whitespace-trimmed search results:', costCenters?.length || 0);
      }
    }

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
