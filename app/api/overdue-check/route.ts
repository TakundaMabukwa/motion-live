import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current date and calculate overdue periods
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Payment is due on 21st of each month
    const paymentDueDay = 21;
    
    // Calculate overdue months based on current date vs payment due date
    let monthsLate = 0;
    if (currentDay > paymentDueDay) {
      monthsLate = 1; // Current month is overdue
    }

    // Fetch all vehicle invoices
    const { data: invoices, error } = await supabase
      .from('vehicle_invoices')
      .select('*');

    if (error) {
      console.error('Error fetching vehicle invoices for overdue check:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicle invoices' }, { status: 500 });
    }

    // Process invoices to calculate overdue amounts
    const overdueAccounts = {};
    let totalOverdueAmount = 0;
    let totalAccountsWithOverdue = 0;

    invoices?.forEach(invoice => {
      const monthlyAmount = parseFloat(invoice.one_month) || 0;
      
      if (monthlyAmount > 0) {
        // Calculate overdue amounts for different periods
        const overdue1_30 = monthsLate >= 1 ? monthlyAmount : 0;
        const overdue31_60 = monthsLate >= 2 ? monthlyAmount : 0;
        const overdue61_90 = monthsLate >= 3 ? monthlyAmount : 0;
        const overdue91_plus = monthsLate >= 4 ? monthlyAmount : 0;
        
        const totalOverdue = overdue1_30 + overdue31_60 + overdue61_90 + overdue91_plus;

        if (totalOverdue > 0) {
          const accountNumber = invoice.new_account_number;
          if (!accountNumber) return;

          if (!overdueAccounts[accountNumber]) {
            overdueAccounts[accountNumber] = {
              accountNumber,
              company: invoice.company,
              totalMonthlyAmount: 0,
              totalOverdue: 0,
              overdue1_30: 0,
              overdue31_60: 0,
              overdue61_90: 0,
              overdue91_plus: 0,
              vehicleCount: 0
            };
          }

          overdueAccounts[accountNumber].totalMonthlyAmount += monthlyAmount;
          overdueAccounts[accountNumber].totalOverdue += totalOverdue;
          overdueAccounts[accountNumber].overdue1_30 += overdue1_30;
          overdueAccounts[accountNumber].overdue31_60 += overdue31_60;
          overdueAccounts[accountNumber].overdue61_90 += overdue61_90;
          overdueAccounts[accountNumber].overdue91_plus += overdue91_plus;
          overdueAccounts[accountNumber].vehicleCount += 1;

          totalOverdueAmount += totalOverdue;
        }
      }
    });

    totalAccountsWithOverdue = Object.keys(overdueAccounts).length;

    // Sort accounts by total overdue amount (highest first)
    const sortedOverdueAccounts = Object.values(overdueAccounts)
      .sort((a: any, b: any) => b.totalOverdue - a.totalOverdue);

    // Log the overdue check results
    console.log(`[${new Date().toISOString()}] Overdue Check Results:`, {
      totalAccountsWithOverdue,
      totalOverdueAmount,
      monthsLate,
      topOverdueAccounts: sortedOverdueAccounts.slice(0, 5).map(acc => ({
        company: acc.company,
        accountNumber: acc.accountNumber,
        totalOverdue: acc.totalOverdue
      }))
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalAccountsWithOverdue,
        totalOverdueAmount,
        monthsLate,
        paymentDueDay
      },
      topOverdueAccounts: sortedOverdueAccounts.slice(0, 10),
      allOverdueAccounts: sortedOverdueAccounts
    });

  } catch (error) {
    console.error('Error in overdue check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { forceRefresh = false } = body;
    
    // This endpoint can be called with POST to force a refresh
    // Useful for admin dashboards or when data needs to be updated immediately
    
    const supabase = await createClient();
    
    // Get current date and calculate overdue periods
    const now = new Date();
    const currentDay = now.getDate();
    const paymentDueDay = 21;
    
    let monthsLate = 0;
    if (currentDay > paymentDueDay) {
      monthsLate = 1;
    }

    // Fetch all vehicle invoices
    const { data: invoices, error } = await supabase
      .from('vehicle_invoices')
      .select('*');

    if (error) {
      console.error('Error fetching vehicle invoices for overdue check:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicle invoices' }, { status: 500 });
    }

    // Process invoices to calculate overdue amounts
    const overdueAccounts = {};
    let totalOverdueAmount = 0;
    let totalAccountsWithOverdue = 0;

    invoices?.forEach(invoice => {
      const monthlyAmount = parseFloat(invoice.one_month) || 0;
      
      if (monthlyAmount > 0) {
        const overdue1_30 = monthsLate >= 1 ? monthlyAmount : 0;
        const overdue31_60 = monthsLate >= 2 ? monthlyAmount : 0;
        const overdue61_90 = monthsLate >= 3 ? monthlyAmount : 0;
        const overdue91_plus = monthsLate >= 4 ? monthlyAmount : 0;
        
        const totalOverdue = overdue1_30 + overdue31_60 + overdue61_90 + overdue91_plus;

        if (totalOverdue > 0) {
          const accountNumber = invoice.new_account_number;
          if (!accountNumber) return;

          if (!overdueAccounts[accountNumber]) {
            overdueAccounts[accountNumber] = {
              accountNumber,
              company: invoice.company,
              totalMonthlyAmount: 0,
              totalOverdue: 0,
              overdue1_30: 0,
              overdue31_60: 0,
              overdue61_90: 0,
              overdue91_plus: 0,
              vehicleCount: 0
            };
          }

          overdueAccounts[accountNumber].totalMonthlyAmount += monthlyAmount;
          overdueAccounts[accountNumber].totalOverdue += totalOverdue;
          overdueAccounts[accountNumber].overdue1_30 += overdue1_30;
          overdueAccounts[accountNumber].overdue31_60 += overdue31_60;
          overdueAccounts[accountNumber].overdue61_90 += overdue61_90;
          overdueAccounts[accountNumber].overdue91_plus += overdue91_plus;
          overdueAccounts[accountNumber].vehicleCount += 1;

          totalOverdueAmount += totalOverdue;
        }
      }
    });

    totalAccountsWithOverdue = Object.keys(overdueAccounts).length;

    const sortedOverdueAccounts = Object.values(overdueAccounts)
      .sort((a: any, b: any) => b.totalOverdue - a.totalOverdue);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      forceRefresh,
      summary: {
        totalAccountsWithOverdue,
        totalOverdueAmount,
        monthsLate,
        paymentDueDay
      },
      topOverdueAccounts: sortedOverdueAccounts.slice(0, 10),
      allOverdueAccounts: sortedOverdueAccounts
    });

  } catch (error) {
    console.error('Error in overdue check POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
