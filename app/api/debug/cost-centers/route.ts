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
    const prefix = searchParams.get('prefix');

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

    // If a specific prefix is provided, test the LIKE query
    if (prefix) {
      console.log(`Debug: Testing LIKE query for prefix: ${prefix}`);
      
      const { data: prefixCostCenters, error: prefixError } = await supabase
        .from('cost_centers')
        .select('*')
        .like('new_account_number', `${prefix}%`);

      if (prefixError) {
        console.error('Error with prefix query:', prefixError);
        return NextResponse.json({ error: 'Prefix query failed', details: prefixError.message }, { status: 500 });
      }

      console.log(`Debug: Found ${prefixCostCenters?.length || 0} cost centers for prefix ${prefix}`);

      // Also test with different patterns
      const { data: startsWithData, error: startsWithError } = await supabase
        .from('cost_centers')
        .select('*')
        .ilike('new_account_number', `${prefix}%`);

      console.log(`Debug: ILIKE query found ${startsWithData?.length || 0} results`);

      return NextResponse.json({
        success: true,
        debug: {
          tableSample: allCostCenters,
          totalRecords: allCostCenters?.length || 0,
          prefixQuery: {
            prefix: prefix,
            pattern: `${prefix}%`,
            results: prefixCostCenters || [],
            count: prefixCostCenters?.length || 0
          },
          alternativeQuery: {
            pattern: `${prefix}%`,
            results: startsWithData || [],
            count: startsWithData?.length || 0
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
