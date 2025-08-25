import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Starting accounts vehicle-amounts request');
    
    // Create Supabase server client
    const supabase = await createClient();
    console.log('API: Supabase client created');
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('API: Authentication failed', { authError, user: !!user });
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    console.log('API: User authenticated successfully');

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix');
    
    if (!prefix) {
      return NextResponse.json(
        { error: 'Prefix parameter is required' },
        { status: 400 }
      );
    }

    console.log('API: Fetching vehicle amounts for prefix:', prefix);

    // Fetch vehicle amounts for this prefix
    console.log(`API: Fetching vehicle invoices for prefix: ${prefix}`);
    const { data: vehicleInvoices, error: vehicleError } = await supabase
      .from('vehicle_invoices')
      .select('*')
      .ilike('new_account_number', `${prefix}%`);

    if (vehicleError) {
      console.error('API: Error fetching vehicle invoices:', vehicleError);
      return NextResponse.json(
        { error: 'Failed to fetch vehicle amounts', details: vehicleError.message },
        { status: 500 }
      );
    }

    console.log(`API: Found ${vehicleInvoices?.length || 0} vehicle invoices for prefix ${prefix}`);

    // Get current date for overdue calculations
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const paymentDueDay = 21; // Payment due on 21st of each month

                  // Function to calculate amount due - show total monthly amounts for all accounts with same prefix
              const getAmountDue = (oneMonth, secondMonth, thirdMonth) => {
                // For accounts section, we want to show the total monthly amounts
                // This represents what the client owes for their monthly subscriptions
                // Ensure we handle null, undefined, and string values properly
                const one = typeof oneMonth === 'string' ? parseFloat(oneMonth) || 0 : (oneMonth || 0);
                const two = typeof secondMonth === 'string' ? parseFloat(secondMonth) || 0 : (secondMonth || 0);
                const three = typeof thirdMonth === 'string' ? parseFloat(thirdMonth) || 0 : (thirdMonth || 0);
                
                return one + two + three;
              };

              // Function to calculate overdue amount based on current date
              const getOverdueAmount = (oneMonth, secondMonth, thirdMonth) => {
                const currentDate = new Date();
                const currentDay = currentDate.getDate();
                const currentMonth = currentDate.getMonth() + 1;
                const paymentDueDay = 21;

                // If before 21st of month, no overdue
                if (currentDay < paymentDueDay) {
                  return 0;
                }

                // After 21st, calculate overdue based on months
                let overdue = 0;
                if (currentMonth === 1) {
                  // January - previous year's months
                  overdue += (oneMonth || 0) + (secondMonth || 0) + (thirdMonth || 0);
                } else if (currentMonth === 2) {
                  // February - previous year's months
                  overdue += (secondMonth || 0) + (thirdMonth || 0);
                } else if (currentMonth === 3) {
                  // March - previous year's month
                  overdue += (thirdMonth || 0);
                } else {
                  // Other months - current year's previous months
                  overdue += (oneMonth || 0) + (secondMonth || 0) + (thirdMonth || 0);
                }
                
                return overdue;
              };

    // Count unique clients from vehicle invoices
    const uniqueClients = new Set();
    (vehicleInvoices || []).forEach(invoice => {
      if (invoice.new_account_number) {
        uniqueClients.add(invoice.new_account_number);
      }
    });

        // Calculate totals
    const vehicleAmounts = (vehicleInvoices || []).reduce((acc, invoice) => {
      const oneMonth = parseFloat(invoice.one_month) || 0;
      const secondMonth = parseFloat(invoice['2nd_month']) || 0;
      const thirdMonth = parseFloat(invoice['3rd_month']) || 0;
      
      // Calculate monthly amount (what they owe monthly)
      const monthlyAmount = getAmountDue(oneMonth, secondMonth, thirdMonth);
      
      // Calculate overdue amount (what's actually due now)
      const overdueAmount = getOverdueAmount(oneMonth, secondMonth, thirdMonth);

      console.log(`API: Invoice ${invoice.id}: one_month=${oneMonth}, 2nd_month=${secondMonth}, 3rd_month=${thirdMonth}, monthlyAmount=${monthlyAmount}, overdueAmount=${overdueAmount}`);

      return {
        totalMonthlyAmount: acc.totalMonthlyAmount + monthlyAmount,
        totalAmountDue: acc.totalAmountDue + overdueAmount, // This is what's actually due now
        vehicleCount: acc.vehicleCount + 1,
        uniqueClientCount: uniqueClients.size
      };
    }, { totalMonthlyAmount: 0, totalAmountDue: 0, vehicleCount: 0, uniqueClientCount: 0 });

    console.log(`API: Final amounts for prefix ${prefix}:`, vehicleAmounts);

    console.log('API: Vehicle amounts calculated', { 
      prefix, 
      vehicleCount: vehicleAmounts.vehicleCount,
      totalMonthlyAmount: vehicleAmounts.totalMonthlyAmount,
      totalAmountDue: vehicleAmounts.totalAmountDue
    });

    return NextResponse.json({
      success: true,
      prefix,
      ...vehicleAmounts,
      vehicleInvoices: vehicleInvoices || []
    });

  } catch (error) {
    console.error('API: Unexpected error:', error);
    console.error('API: Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
