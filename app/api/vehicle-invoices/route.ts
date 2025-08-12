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
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get current date and calculate overdue periods
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Payment is due on 20th or 21st of each month
    const paymentDueDay = 21;
    
    // Calculate overdue periods
    const getOverdueAmount = (monthlyAmount: number, monthsLate: number) => {
      if (monthsLate <= 0) return 0;
      return monthlyAmount * monthsLate;
    };

    // Build query for vehicle invoices
    let query = supabase
      .from('vehicle_invoices')
      .select('*');

    // Add search filter if provided
    if (search) {
      query = query.or(`company.ilike.%${search}%,new_account_number.ilike.%${search}%`);
    }

    // Get total count first
    const { count: totalCount } = await supabase
      .from('vehicle_invoices')
      .select('*', { count: 'exact', head: true });

    // Apply pagination
    const { data: invoices, error } = await query
      .range(offset, offset + limit - 1)
      .order('company', { ascending: true });

    if (error) {
      console.error('Error fetching vehicle invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicle invoices' }, { status: 500 });
    }

    // Process invoices to calculate overdue amounts
    const processedInvoices = invoices?.map(invoice => {
      const monthlyAmount = parseFloat(invoice.one_month) || 0;
      
      // Calculate overdue months based on current date vs payment due date
      let monthsLate = 0;
      if (currentDay > paymentDueDay) {
        monthsLate = 1; // Current month is overdue
      }
      
      // Calculate overdue amounts for different periods
      const overdue1_30 = monthsLate >= 1 ? monthlyAmount : 0;
      const overdue31_60 = monthsLate >= 2 ? monthlyAmount : 0;
      const overdue61_90 = monthsLate >= 3 ? monthlyAmount : 0;
      const overdue91_plus = monthsLate >= 4 ? monthlyAmount : 0;
      
      const totalOverdue = overdue1_30 + overdue31_60 + overdue61_90 + overdue91_plus;

      return {
        ...invoice,
        monthlyAmount,
        overdue1_30,
        overdue31_60,
        overdue61_90,
        overdue91_plus,
        totalOverdue,
        monthsLate,
        isOverdue: totalOverdue > 0
      };
    }) || [];

    // Group by account number to get customer summaries
    const customerSummaries = {};
    processedInvoices.forEach(invoice => {
      const accountNumber = invoice.new_account_number;
      if (!accountNumber) return;

      if (!customerSummaries[accountNumber]) {
        customerSummaries[accountNumber] = {
          accountNumber,
          company: invoice.company,
          totalMonthlyAmount: 0,
          totalOverdue: 0,
          overdue1_30: 0,
          overdue31_60: 0,
          overdue61_90: 0,
          overdue91_plus: 0,
          vehicleCount: 0,
          invoices: []
        };
      }

      customerSummaries[accountNumber].totalMonthlyAmount += invoice.monthlyAmount;
      customerSummaries[accountNumber].totalOverdue += invoice.totalOverdue;
      customerSummaries[accountNumber].overdue1_30 += invoice.overdue1_30;
      customerSummaries[accountNumber].overdue31_60 += invoice.overdue31_60;
      customerSummaries[accountNumber].overdue61_90 += invoice.overdue61_90;
      customerSummaries[accountNumber].overdue91_plus += invoice.overdue91_plus;
      customerSummaries[accountNumber].vehicleCount += 1;
      customerSummaries[accountNumber].invoices.push(invoice);
    });

    // Convert to array and sort by total overdue amount
    const customers = Object.values(customerSummaries)
      .sort((a: any, b: any) => b.totalOverdue - a.totalOverdue);

    return NextResponse.json({
      customers,
      invoices: processedInvoices,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('Error in vehicle invoices GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
