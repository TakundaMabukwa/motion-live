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

    console.log('Debug: Checking cost_centers table');

    // First, let's see the table structure and sample data
    const { data: allCostCenters, error: allError } = await supabase
      .from('cost_centers')
      .select('*')
      .limit(10);

    if (allError) {
      console.error('Error fetching all cost centers:', allError);
      return NextResponse.json({ error: 'Failed to fetch cost centers', details: allError.message }, { status: 500 });
    }

    console.log('Debug: All cost centers sample:', allCostCenters);

    // If specific account numbers are provided, test the IN query
    if (allNewAccountNumbers) {
      console.log(`Debug: Testing IN query for account numbers: ${allNewAccountNumbers}`);
      
      // Parse comma-separated account numbers and normalize them
      const accountNumbers = allNewAccountNumbers
        .split(',')
        .map(num => num.trim())
        .filter(num => num)
        .map(num => num.toUpperCase()); // Normalize to uppercase
      
      console.log('Debug: Normalized account numbers:', accountNumbers);
      
      // Test exact match first
      const { data: exactMatches, error: exactError } = await supabase
        .from('cost_centers')
        .select('*')
        .in('cost_code', accountNumbers);
      
      // Test case-insensitive match
      const caseInsensitiveConditions = accountNumbers.map(num => 
        `cost_code.ilike.%${num}%`
      ).join(',');
      
      const { data: caseInsensitiveMatches, error: caseInsensitiveError } = await supabase
        .from('cost_centers')
        .select('*')
        .or(caseInsensitiveConditions);
      
      // Test manual filtering for whitespace
      const { data: allCostCenters, error: allError } = await supabase
        .from('cost_centers')
        .select('*');
      
      let whitespaceMatches = [];
      if (!allError && allCostCenters) {
        whitespaceMatches = allCostCenters.filter(center => {
          const normalizedCostCode = center.cost_code?.trim().toUpperCase();
          return accountNumbers.includes(normalizedCostCode);
        });
      }
      
      const matchingCostCenters = exactMatches || [];
      const matchingError = exactError;

      if (matchingError) {
        console.error('Error with matching query:', matchingError);
        return NextResponse.json({ error: 'Matching query failed', details: matchingError.message }, { status: 500 });
      }

      console.log(`Debug: Found ${matchingCostCenters?.length || 0} cost centers for account numbers:`, accountNumbers);

      return NextResponse.json({
        success: true,
        debug: {
          tableSample: allCostCenters,
          totalRecords: allCostCenters?.length || 0,
          accountNumbersQuery: {
            originalInput: allNewAccountNumbers,
            normalizedAccountNumbers: accountNumbers,
            exactMatches: {
              results: exactMatches || [],
              count: exactMatches?.length || 0,
              error: exactError
            },
            caseInsensitiveMatches: {
              results: caseInsensitiveMatches || [],
              count: caseInsensitiveMatches?.length || 0,
              error: caseInsensitiveError
            },
            whitespaceTrimmedMatches: {
              results: whitespaceMatches || [],
              count: whitespaceMatches?.length || 0
            },
            finalResults: {
              results: matchingCostCenters || [],
              count: matchingCostCenters?.length || 0
            }
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      debug: {
        tableSample: allCostCenters,
        totalRecords: allCostCenters?.length || 0,
        message: 'No prefix provided, showing table sample only'
      }
    });

  } catch (error) {
    console.error('Error in cost centers debug GET:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
