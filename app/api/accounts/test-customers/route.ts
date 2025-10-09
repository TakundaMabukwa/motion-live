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

    // Get a sample of customers_grouped data
    const { data: customers, error } = await supabase
      .from('customers_grouped')
      .select('id, company_group, all_new_account_numbers')
      .limit(3);

    if (error) {
      console.error('Error fetching customers_grouped data:', error);
      return NextResponse.json({
        error: `Database error: ${error.message}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sampleCustomers: customers,
      message: `Found ${customers?.length || 0} sample customers`
    });

  } catch (error) {
    console.error('Error in customers test API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}




