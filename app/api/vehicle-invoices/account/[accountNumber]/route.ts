import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { accountNumber: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountNumber = params.accountNumber;

    // Get current date and calculate overdue periods
    const now = new Date();
    const currentDay = now.getDate();
    const paymentDueDay = 21;
    
    // Calculate overdue months based on current date vs payment due date
    let monthsLate = 0;
    if (currentDay > paymentDueDay) {
      monthsLate = 1; // Current month is overdue
    }

    // Fetch all vehicle invoices for this specific account
    const { data: invoices, error } = await supabase
      .from('vehicle_invoices')
      .select('*')
      .eq('new_account_number', accountNumber);

    if (error) {
      console.error('Error fetching vehicle invoices for account:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicle invoices' }, { status: 500 });
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        success: true,
        accountNumber,
        vehicles: [],
        message: 'No vehicles found for this account'
      });
    }

    // Process invoices to calculate overdue amounts and format vehicle data
    const vehicles = invoices.map(invoice => {
      const monthlyAmount = parseFloat(invoice.total_incl_vat) || 0;
      
      // Calculate overdue amounts for different periods
      const overdue1_30 = monthsLate >= 1 ? monthlyAmount : 0;
      const overdue31_60 = monthsLate >= 2 ? monthlyAmount : 0;
      const overdue61_90 = monthsLate >= 3 ? monthlyAmount : 0;
      const overdue91_plus = monthsLate >= 4 ? monthlyAmount : 0;
      
      const totalOverdue = overdue1_30 + overdue31_60 + overdue61_90 + overdue91_plus;

      return {
        id: invoice.id,
        stock_code: invoice.stock_code,
        stock_description: invoice.stock_description,
        one_month: invoice.one_month,
        '2nd_month': invoice['2nd_month'],
        '3rd_month': invoice['3rd_month'],
        total_ex_vat: invoice.total_ex_vat,
        total_vat: invoice.total_vat,
        total_incl_vat: invoice.total_incl_vat,
        group_name: invoice.group_name,
        beame: invoice.beame,
        beame_2: invoice.beame_2,
        beame_3: invoice.beame_3,
        ip_address: invoice.ip_address,
        new_account_number: invoice.new_account_number,
        company: invoice.company,
        doc_no: invoice.doc_no,
        monthlyAmount,
        overdue1_30,
        overdue31_60,
        overdue61_90,
        overdue91_plus,
        totalOverdue,
        monthsLate,
        isOverdue: totalOverdue > 0
      };
    });

    // Sort vehicles by monthly amount (highest first)
    const sortedVehicles = vehicles.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

    // Calculate account summary
    const totalMonthlyAmount = vehicles.reduce((sum, v) => sum + v.monthlyAmount, 0);
    const totalOverdueAmount = vehicles.reduce((sum, v) => sum + v.totalOverdue, 0);

    return NextResponse.json({
      success: true,
      accountNumber,
      company: invoices[0]?.company || 'Unknown',
      vehicles: sortedVehicles,
      summary: {
        totalVehicles: vehicles.length,
        totalMonthlyAmount,
        totalOverdueAmount,
        monthsLate
      }
    });

  } catch (error) {
    console.error('Error in account vehicle fetch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
