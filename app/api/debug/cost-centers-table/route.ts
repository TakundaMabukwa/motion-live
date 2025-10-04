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

    console.log('Debug: Checking cost_centers table structure and data');

    // Get table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('cost_centers')
      .select('*')
      .limit(0);

    // Get sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('cost_centers')
      .select('*')
      .limit(10);

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('cost_centers')
      .select('*', { count: 'exact', head: true });

    // Get unique cost_codes
    const { data: uniqueCostCodes, error: uniqueError } = await supabase
      .from('cost_centers')
      .select('cost_code')
      .not('cost_code', 'is', null);

    const uniqueCodes = uniqueCostCodes ? 
      [...new Set(uniqueCostCodes.map(item => item.cost_code))].slice(0, 20) : [];

    return NextResponse.json({
      success: true,
      tableExists: !tableError,
      tableError: tableError?.message,
      totalRecords: totalCount || 0,
      sampleData: sampleData || [],
      uniqueCostCodes: uniqueCodes,
      sampleCount: sampleData?.length || 0,
      message: `Found ${totalCount || 0} records in cost_centers table`
    });

  } catch (error) {
    console.error('Error in debug cost-centers-table:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
