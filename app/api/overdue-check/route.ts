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

    // First, fetch payments data for overdue accounts
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*');

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    // Then fetch vehicle invoices to get company names and link data
    const { data: invoices, error: invoicesError } = await supabase
      .from('vehicle_invoices')
      .select('*')
      .eq('stock_code', 'MONLTHY SUBSCRIPTION');

    if (invoicesError) {
      console.error('Error fetching vehicle invoices for overdue check:', invoicesError);
      return NextResponse.json({ error: 'Failed to fetch vehicle invoices' }, { status: 500 });
    }

    // Create a map of account numbers to company names from vehicle_invoices
    const accountCompanyMap = {};
    invoices?.forEach(invoice => {
      if (invoice.new_account_number && invoice.company) {
        accountCompanyMap[invoice.new_account_number] = invoice.company;
      }
    });

    // Process payments and link with company names
    const processedOverdueAccounts = [];
    let totalOverdueAmount = 0;
    let totalAccountsWithOverdue = 0;

    paymentsData?.forEach(payment => {
      const accountNumber = payment.new_account_number;
      if (!accountNumber) return;

      // Get company name from vehicle_invoices, fallback to 'Unknown Company'
      const company = accountCompanyMap[accountNumber] || 'Unknown Company';
      
      // Calculate total overdue amount
      const totalOverdue = (payment.overdue || 0) + 
                          (payment.first_month || 0) + 
                          (payment.second_month || 0) + 
                          (payment.third_month || 0) + 
                          (payment.amount_due || 0);

      // Count vehicles for this account from vehicle_invoices
      const accountVehicles = invoices?.filter(inv => inv.new_account_number === accountNumber) || [];
      const vehicleCount = accountVehicles.length;

      // Calculate monthly amount from vehicle invoices
      const totalMonthlyAmount = accountVehicles.reduce((sum, inv) => {
        return sum + (parseFloat(inv.total_incl_vat) || 0);
      }, 0);

      if (totalOverdue > 0) {
        totalAccountsWithOverdue++;
        totalOverdueAmount += totalOverdue;
      }

      processedOverdueAccounts.push({
        accountNumber: payment.new_account_number,
        company: company,
        totalMonthlyAmount: totalMonthlyAmount,
        totalOverdue: totalOverdue,
        overdue1_30: payment.first_month || 0,
        overdue31_60: payment.second_month || 0,
        overdue61_90: payment.third_month || 0,
        overdue91_plus: payment.amount_due || 0,
        vehicleCount: vehicleCount,
        dueDate: payment.due_date,
        paymentReference: payment.payment_reference,
        // Original overdue amounts for reference
        overdue: payment.overdue || 0,
        firstMonth: payment.first_month || 0,
        secondMonth: payment.second_month || 0,
        thirdMonth: payment.third_month || 0,
        amountDue: payment.amount_due || 0
      });
    });

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

    // First, fetch payments data for overdue accounts
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*');

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    // Then fetch vehicle invoices to get company names and link data
    const { data: invoices, error: invoicesError } = await supabase
      .from('vehicle_invoices')
      .select('*')
      .eq('stock_code', 'MONLTHY SUBSCRIPTION');

    if (invoicesError) {
      console.error('Error fetching vehicle invoices for overdue check:', invoicesError);
      return NextResponse.json({ error: 'Failed to fetch vehicle invoices' }, { status: 500 });
    }

    // Create a map of account numbers to company names from vehicle_invoices
    const accountCompanyMap = {};
    invoices?.forEach(invoice => {
      if (invoice.new_account_number && invoice.company) {
        accountCompanyMap[invoice.new_account_number] = invoice.company;
      }
    });

    // Process payments and link with company names
    const processedOverdueAccounts = [];
    let totalOverdueAmount = 0;
    let totalAccountsWithOverdue = 0;

    paymentsData?.forEach(payment => {
      const accountNumber = payment.new_account_number;
      if (!accountNumber) return;

      // Get company name from vehicle_invoices, fallback to 'Unknown Company'
      const company = accountCompanyMap[accountNumber] || 'Unknown Company';
      
      // Calculate total overdue amount
      const totalOverdue = (payment.overdue || 0) + 
                          (payment.first_month || 0) + 
                          (payment.second_month || 0) + 
                          (payment.third_month || 0) + 
                          (payment.amount_due || 0);

      // Count vehicles for this account from vehicle_invoices
      const accountVehicles = invoices?.filter(inv => inv.new_account_number === accountNumber) || [];
      const vehicleCount = accountVehicles.length;

      // Calculate monthly amount from vehicle invoices
      const totalMonthlyAmount = accountVehicles.reduce((sum, inv) => {
        return sum + (parseFloat(inv.total_incl_vat) || 0);
      }, 0);

      if (totalOverdue > 0) {
        totalAccountsWithOverdue++;
        totalOverdueAmount += totalOverdue;
      }

      processedOverdueAccounts.push({
        accountNumber: payment.new_account_number,
        company: company,
        totalMonthlyAmount: totalMonthlyAmount,
        totalOverdue: totalOverdue,
        overdue1_30: payment.first_month || 0,
        overdue31_60: payment.second_month || 0,
        overdue61_90: payment.third_month || 0,
        overdue91_plus: payment.amount_due || 0,
        vehicleCount: vehicleCount,
        dueDate: payment.due_date,
        paymentReference: payment.payment_reference,
        // Original overdue amounts for reference
        overdue: payment.overdue || 0,
        firstMonth: payment.first_month || 0,
        secondMonth: payment.second_month || 0,
        thirdMonth: payment.third_month || 0,
        amountDue: payment.amount_due || 0
      });
    });

    const sortedOverdueAccounts = processedOverdueAccounts
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
