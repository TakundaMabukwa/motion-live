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
      // Search directly in new_account_number column (starts with search term)
      query = query.ilike('new_account_number', `${search}%`);
    }

    // Get all invoices - fetch in chunks to ensure we get everything
    let allInvoices = [];
    let invoicesHasMore = true;
    let currentOffset = 0;
    const chunkSize = 1000; // Fetch 1000 records at a time
    
    while (invoicesHasMore) {
      const { data: chunk, error: chunkError } = await query
        .range(currentOffset, currentOffset + chunkSize - 1);
      
      if (chunkError) {
        console.error('Error fetching invoice chunk:', chunkError);
        break;
      }
      
      if (chunk && chunk.length > 0) {
        allInvoices = allInvoices.concat(chunk);
        currentOffset += chunkSize;
        invoicesHasMore = chunk.length === chunkSize; // If we got less than chunkSize, we've reached the end
      } else {
        invoicesHasMore = false;
      }
    }
    
    const invoices = allInvoices;

    if (!invoices || invoices.length === 0) {
      console.log('No vehicle invoices found');
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

    // Get customers data to get legal names - fetch in chunks to ensure we get everything
    let allCustomers = [];
    let customersHasMore = true;
    let customersOffset = 0;
    const customersChunkSize = 1000;
    
    while (customersHasMore) {
      const { data: customersChunk, error: customersChunkError } = await supabase
        .from('customers')
        .select('new_account_number, legal_name, company')
        .range(customersOffset, customersOffset + customersChunkSize - 1);
      
      if (customersChunkError) {
        console.error('Error fetching customers chunk:', customersChunkError);
        break;
      }
      
      if (customersChunk && customersChunk.length > 0) {
        allCustomers = allCustomers.concat(customersChunk);
        customersOffset += customersChunkSize;
        customersHasMore = customersChunk.length === customersChunkSize;
      } else {
        customersHasMore = false;
      }
    }
    
         const customersData = allCustomers;

     // Check if we successfully fetched customers data
     if (!customersData || customersData.length === 0) {
       console.log('No customers data found');
     }

    // Get payments data for the matching account numbers
    let paymentsData = {};
    if (search) {
      // Get all payments where new_account_number starts with the search term
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('new_account_number, total_amount, amount_due')
        .ilike('new_account_number', `${search}%`);
      
      if (paymentsError) {
        console.error('Error fetching payments data:', paymentsError);
      } else if (payments) {
        // Group payments by the CODE part (before the dash)
        payments.forEach(payment => {
          const accountNumber = payment.new_account_number;
          if (!accountNumber) return;

          // Extract CODE part (before the dash)
          const codeMatch = accountNumber.match(/^([^-]+)/);
          if (!codeMatch) return;
          
          const code = codeMatch[1];
          
          if (!paymentsData[code]) {
            paymentsData[code] = {
              totalAmount: 0,
              amountDue: 0
            };
          }
          
          paymentsData[code].totalAmount += (payment.total_amount || 0);
          paymentsData[code].amountDue += (payment.amount_due || 0);
        });
      }
    }

    // Create a map for quick lookup of customer data by new_account_number
    const customerMap = {};
    customersData.forEach(customer => {
      if (customer.new_account_number) {
        customerMap[customer.new_account_number] = customer;
      }
    });

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
        // Get customer data for this code
        const customerData = customerMap[accountNumber];
        const paymentsInfo = paymentsData[code] || { totalAmount: 0, amountDue: 0 };
        customerSummaries[code] = {
          code,
          company: invoice.company,
          legal_name: customerData?.legal_name || null,
          totalMonthlyAmount: 0,
          totalAmountDue: 0,
          totalOverdue: 0,
          vehicleCount: 0,
          vehicles: [],
          accountNumbers: new Set(), // Track all account numbers with this code
          paymentsTotalAmount: paymentsInfo.totalAmount,
          paymentsAmountDue: paymentsInfo.amountDue
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
        company: invoice.company,
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
