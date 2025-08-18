import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Get total count first
    const { count: totalCount } = await supabase
      .from('vehicle_invoices')
      .select('*', { count: 'exact', head: true });

    // Build query for vehicle invoices
    let query = supabase
      .from('vehicle_invoices')
      .select('*');

    // Add search filter if provided
    if (search) {
      query = query.or(`company.ilike.%${search}%,new_account_number.ilike.%${search}%`);
    }

    // Get all invoices
    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching vehicle invoices:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicle invoices' }, { status: 500 });
    }

    // Get current date for overdue calculations
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const paymentDueDay = 21; // Payment due on 21st of each month

    // Function to calculate overdue amount
    const getOverdueAmount = (oneMonth, secondMonth, thirdMonth, amountDue) => {
      if (currentDay < paymentDueDay) {
        // Before 21st - no overdue
        return 0;
      }
      
      // After 21st - calculate overdue based on months
      let overdue = 0;
      
      if (currentMonth === 1) {
        // January - check previous year's months
        overdue += (oneMonth || 0) + (secondMonth || 0) + (thirdMonth || 0);
      } else if (currentMonth === 2) {
        // February - check previous year's months
        overdue += (secondMonth || 0) + (thirdMonth || 0);
      } else if (currentMonth === 3) {
        // March - check previous year's third month
        overdue += (thirdMonth || 0);
      } else {
        // Other months - check current year's previous months
        overdue += (oneMonth || 0) + (secondMonth || 0) + (thirdMonth || 0);
      }
      
      return overdue;
    };

    // Group by CODE part (before the dash) of new_account_number
    const customerSummaries = {};
    invoices.forEach(invoice => {
      const accountNumber = invoice.new_account_number;
      if (!accountNumber) return;

      // Extract CODE part (before the dash)
      const codeMatch = accountNumber.match(/^([^-]+)/);
      if (!codeMatch) return;
      
      const code = codeMatch[1]; // This is the CODE part

      if (!customerSummaries[code]) {
        customerSummaries[code] = {
          code,
          company: invoice.company,
          totalMonthlyAmount: 0,
          totalAmountDue: 0,
          totalOverdue: 0,
          vehicleCount: 0,
          vehicles: [],
          accountNumbers: new Set() // Track all account numbers with this code
        };
      }

      // Helper function to safely convert to number
      const safeNumber = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      };

      // Add monthly amounts (full amounts that should be paid)
      const monthlyAmount = safeNumber(invoice.one_month) + safeNumber(invoice['2nd_month']) + safeNumber(invoice['3rd_month']);
      customerSummaries[code].totalMonthlyAmount += monthlyAmount;
      
      // Add amount due
      customerSummaries[code].totalAmountDue += safeNumber(invoice.amount_due);
      
      // Calculate overdue amount for this invoice
      const overdueAmount = getOverdueAmount(
        safeNumber(invoice.one_month), 
        safeNumber(invoice['2nd_month']), 
        safeNumber(invoice['3rd_month']), 
        safeNumber(invoice.amount_due)
      );
      customerSummaries[code].totalOverdue += overdueAmount;
      
      // Count vehicles and store vehicle data
      customerSummaries[code].vehicleCount += 1;
      customerSummaries[code].accountNumbers.add(invoice.new_account_number);
      
      customerSummaries[code].vehicles.push({
        doc_no: invoice.doc_no,
        stock_code: invoice.stock_code,
        stock_description: invoice.stock_description,
        account_number: invoice.new_account_number,
        total_ex_vat: safeNumber(invoice.total_ex_vat),
        total_vat: safeNumber(invoice.total_vat),
        total_incl_vat: safeNumber(invoice.total_incl_vat),
        one_month: safeNumber(invoice.one_month),
        '2nd_month': safeNumber(invoice['2nd_month']),
        '3rd_month': safeNumber(invoice['3rd_month']),
        amount_due: safeNumber(invoice.amount_due),
        monthly_amount: monthlyAmount // Store the monthly amount for this vehicle
      });
    });

    // Convert to array and sort by overdue amount (highest first)
    const customers = Object.values(customerSummaries)
      .map(customer => ({
        ...customer,
        accountNumbers: Array.from(customer.accountNumbers) // Convert Set to Array
      }))
      .sort((a, b) => b.totalOverdue - a.totalOverdue);

    // Apply pagination
    const paginatedCustomers = customers.slice(offset, offset + limit);
    const hasMore = offset + limit < customers.length;

    return NextResponse.json({
      customers: paginatedCustomers,
      pagination: {
        page,
        limit,
        total: customers.length,
        hasMore
      }
    });

  } catch (error) {
    console.error('Error in vehicle invoices API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
