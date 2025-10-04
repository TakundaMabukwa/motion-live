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
      
      // Calculate total overdue amount using balance_due from payments_ table
      // Ensure proper number conversion to avoid NaN
      const totalOverdue = parseFloat(payment.balance_due) || 0;
      
      // Extract overdue amounts by period from payments_ table
      const overdue1_30 = parseFloat(payment.overdue_30_days) || 0;
      const overdue31_60 = parseFloat(payment.overdue_60_days) || 0;
      const overdue61_90 = parseFloat(payment.overdue_90_days) || 0;
      const overdue91_plus = Math.max(0, totalOverdue - overdue1_30 - overdue31_60 - overdue61_90);

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
        overdue1_30: overdue1_30,
        overdue31_60: overdue31_60,
        overdue61_90: overdue61_90,
        overdue91_plus: overdue91_plus,
        vehicleCount: 0, // Will be populated separately
        dueDate: payment.due_date,
        paymentReference: '',
        // New payments_ table fields for reference
        paymentStatus: payment.payment_status,
        billingMonth: payment.billing_month,
        lastUpdated: payment.last_updated,
        overdue30Days: parseFloat(payment.overdue_30_days) || 0,
        overdue60Days: parseFloat(payment.overdue_60_days) || 0,
        overdue90Days: parseFloat(payment.overdue_90_days) || 0
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
        totalOverdueAmount: parseFloat(totalOverdueAmount.toFixed(2)), // Ensure proper number formatting
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
      
      // Calculate total overdue amount using balance_due from payments_ table
      // Ensure proper number conversion to avoid NaN
      const totalOverdue = parseFloat(payment.balance_due) || 0;
      
      // Extract overdue amounts by period from payments_ table
      const overdue1_30 = parseFloat(payment.overdue_30_days) || 0;
      const overdue31_60 = parseFloat(payment.overdue_60_days) || 0;
      const overdue61_90 = parseFloat(payment.overdue_90_days) || 0;
      const overdue91_plus = Math.max(0, totalOverdue - overdue1_30 - overdue31_60 - overdue61_90);

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
        overdue1_30: overdue1_30,
        overdue31_60: overdue31_60,
        overdue61_90: overdue61_90,
        overdue91_plus: overdue91_plus,
        vehicleCount: 0, // Will be populated separately
        dueDate: payment.due_date,
        paymentReference: '',
        // New payments_ table fields for reference
        paymentStatus: payment.payment_status,
        billingMonth: payment.billing_month,
        lastUpdated: payment.last_updated,
        overdue30Days: parseFloat(payment.overdue_30_days) || 0,
        overdue60Days: parseFloat(payment.overdue_60_days) || 0,
        overdue90Days: parseFloat(payment.overdue_90_days) || 0
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

    const sortedOverdueAccounts = processedOverdueAccounts
      .sort((a: any, b: any) => b.totalOverdue - a.totalOverdue);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      forceRefresh,
      summary: {
        totalAccountsWithOverdue,
        totalOverdueAmount: parseFloat(totalOverdueAmount.toFixed(2)), // Ensure proper number formatting
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