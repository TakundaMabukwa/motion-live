import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get a sample of payments_ data
    const { data: payments, error } = await supabase
      .from('payments_')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error fetching payments_ data:', error);
      return NextResponse.json({
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }

    // Get count of all records
    const { count, error: countError } = await supabase
      .from('payments_')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      totalRecords: count,
      sampleData: payments,
      message: `Found ${count} records in payments_ table`
    });

  } catch (error) {
    console.error('Error in payments test API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


