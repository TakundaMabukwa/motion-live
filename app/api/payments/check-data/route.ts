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

    // Get total count of records
    const { count, error: countError } = await supabase
      .from('payments_')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ error: `Count error: ${countError.message}` }, { status: 500 });
    }

    // Get sample of real data
    const { data: sampleData, error: sampleError } = await supabase
      .from('payments_')
      .select('cost_code, due_amount, paid_amount, company, reference, created_at')
      .limit(10)
      .order('created_at', { ascending: false });

    if (sampleError) {
      return NextResponse.json({ error: `Sample error: ${sampleError.message}` }, { status: 500 });
    }

    // Calculate totals from all data
    const { data: allData, error: allError } = await supabase
      .from('payments_')
      .select('due_amount, paid_amount');

    if (allError) {
      return NextResponse.json({ error: `All data error: ${allError.message}` }, { status: 500 });
    }

    // Calculate totals
    const totals = allData?.reduce((acc, payment) => {
      const dueAmount = parseFloat(payment.due_amount) || 0;
      const paidAmount = parseFloat(payment.paid_amount) || 0;

      return {
        totalDueAmount: acc.totalDueAmount + dueAmount,
        totalPaidAmount: acc.totalPaidAmount + paidAmount,
        totalBalanceDue: acc.totalBalanceDue + (dueAmount - paidAmount),
        totalRecords: acc.totalRecords + 1
      };
    }, {
      totalDueAmount: 0,
      totalPaidAmount: 0,
      totalBalanceDue: 0,
      totalRecords: 0
    }) || {
      totalDueAmount: 0,
      totalPaidAmount: 0,
      totalBalanceDue: 0,
      totalRecords: 0
    };

    return NextResponse.json({
      success: true,
      totalRecords: count,
      sampleData: sampleData,
      calculatedTotals: totals,
      message: `Found ${count} records in payments_ table`
    });

  } catch (error) {
    console.error('Error in check payments data API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

