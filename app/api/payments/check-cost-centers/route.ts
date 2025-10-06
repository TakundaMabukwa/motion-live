import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountNumbers } = await request.json();

    if (!accountNumbers || !Array.isArray(accountNumbers) || accountNumbers.length === 0) {
      return NextResponse.json({ hasCostCenters: false });
    }

    console.log('Checking cost centers for account numbers:', accountNumbers);

    // Check if any of these account numbers exist in payments_ table
    const { data: payments, error: paymentsError } = await supabase
      .from('payments_')
      .select('cost_code')
      .in('cost_code', accountNumbers)
      .limit(1); // We only need to know if at least one exists

    if (paymentsError) {
      console.error('Error checking cost centers:', paymentsError);
      return NextResponse.json({ hasCostCenters: false });
    }

    const hasCostCenters = payments && payments.length > 0;
    console.log(`Cost centers check result: ${hasCostCenters} for ${accountNumbers.length} account numbers`);

    return NextResponse.json({ hasCostCenters });

  } catch (error: any) {
    console.error('Error in check-cost-centers API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      hasCostCenters: false
    }, { status: 500 });
  }
}
