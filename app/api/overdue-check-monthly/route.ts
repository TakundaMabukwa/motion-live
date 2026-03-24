import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateOverdueBuckets } from '@/lib/server/account-invoice-payments';

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

    // Helper function to calculate months overdue based on due_date
    const calculateMonthsOverdue = (dueDate: string) => {
      if (!dueDate) return 0;
      
      const due = new Date(dueDate);
      const today = new Date();
      
      // Calculate the difference in months
      const yearDiff = today.getFullYear() - due.getFullYear();
      const monthDiff = today.getMonth() - due.getMonth();
      const totalMonthsDiff = yearDiff * 12 + monthDiff;
      
      // If we're past the due day of the month, add 1 more month
      if (today.getDate() > due.getDate()) {
        return totalMonthsDiff + 1;
      }
      
      return Math.max(0, totalMonthsDiff);
    };

    // Fetch overdue payments data from our new payments_ table
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments_')
      .select('*')
      .gt('balance_due', 0); // Only accounts with outstanding balance

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    // Process payments and link with company names
    const processedOverdueAccounts = [];
    let totalOverdueAmount = 0;
    let totalAccountsWithOverdue = 0;

    paymentsData?.forEach(payment => {
      const costCode = payment.cost_code;
      if (!costCode) return;

      // Get company name from payments_ table, fallback to 'Unknown Company'
      const company = payment.company || 'Unknown Company';
      
      const aging = calculateOverdueBuckets({
        balanceDue: payment.balance_due,
        dueDate: payment.due_date,
      });
      const totalOverdue = parseFloat(payment.balance_due) || 0;
      const monthsOverdue = calculateMonthsOverdue(payment.due_date);
      const overdue1Month = aging.days30;
      const overdue2Months = aging.days60;
      const overdue3Months = aging.days90;
      const overdue4PlusMonths = aging.days91Plus;

      // Get monthly due amount
      const totalMonthlyAmount = parseFloat(payment.due_amount) || 0;

      if (totalOverdue > 0) {
        totalAccountsWithOverdue++;
        totalOverdueAmount += totalOverdue;
      }

      processedOverdueAccounts.push({
        accountNumber: costCode,
        company: company,
        totalMonthlyAmount: totalMonthlyAmount,
        totalOverdue: totalOverdue,
        // Month-based overdue amounts
        overdue1Month: overdue1Month,
        overdue2Months: overdue2Months,
        overdue3Months: overdue3Months,
        overdue4PlusMonths: overdue4PlusMonths,
        // Keep day-based for backward compatibility
        overdue1_30: aging.days30,
        overdue31_60: aging.days60,
        overdue61_90: aging.days90,
        overdue91_plus: aging.days91Plus,
        vehicleCount: 0, // Will be populated separately
        dueDate: payment.due_date,
        paymentReference: payment.reference || '',
        // New payments_ table fields for reference
        paymentStatus: payment.payment_status,
        billingMonth: payment.billing_month,
        lastUpdated: payment.last_updated,
        monthsOverdue: monthsOverdue,
        // Keep day-based fields for backward compatibility
        overdue30Days: aging.days30,
        overdue60Days: aging.days60,
        overdue90Days: aging.days90 + aging.days91Plus
      });
    });

    // Fetch vehicle counts for each cost code
    try {
      const allCostCodes = [...new Set(paymentsData?.map(p => p.cost_code).filter(Boolean))];
      if (allCostCodes.length > 0) {
        const { data: vehicleCounts } = await supabase
          .from('vehicles')
          .select('new_account_number')
          .in('new_account_number', allCostCodes);

        // Create a map of cost codes to vehicle counts
        const vehicleCountMap = {};
        vehicleCounts?.forEach(vehicle => {
          const code = vehicle.new_account_number;
          vehicleCountMap[code] = (vehicleCountMap[code] || 0) + 1;
        });

        // Update vehicle counts in processed accounts
        processedOverdueAccounts.forEach(account => {
          account.vehicleCount = vehicleCountMap[account.accountNumber] || 0;
        });
      }
    } catch (vehicleError) {
      console.error('Warning: Could not fetch vehicle counts:', vehicleError);
    }

    // Sort accounts by total overdue amount (highest first)
    const sortedOverdueAccounts = processedOverdueAccounts
      .sort((a: any, b: any) => b.totalOverdue - a.totalOverdue);

    // Log the overdue check results
    console.log(`[${new Date().toISOString()}] Monthly Overdue Check Results:`, {
      totalAccountsWithOverdue,
      totalOverdueAmount,
      monthsLate,
      topOverdueAccounts: sortedOverdueAccounts.slice(0, 5).map(acc => ({
        company: acc.company,
        accountNumber: acc.accountNumber,
        totalOverdue: acc.totalOverdue,
        monthsOverdue: acc.monthsOverdue
      }))
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalAccountsWithOverdue,
        totalOverdueAmount: parseFloat(totalOverdueAmount.toFixed(2)),
        monthsLate,
        paymentDueDay
      },
      topOverdueAccounts: sortedOverdueAccounts.slice(0, 10),
      allOverdueAccounts: sortedOverdueAccounts
    });

  } catch (error) {
    console.error('Error in monthly overdue check:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { forceRefresh = false } = body;
    
    // This endpoint can be called with POST to force a refresh
    return await GET(request);
  } catch (error) {
    console.error('Error in monthly overdue check POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
