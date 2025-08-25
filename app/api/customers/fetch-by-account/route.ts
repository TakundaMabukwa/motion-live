import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'Account number is required' 
      }, { status: 400 });
    }

    console.log('Fetching customer data for account number:', accountNumber);

    // First try to find customer by new_account_number
    let { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('new_account_number', accountNumber)
      .single();

    // If not found, try account_number as fallback
    if (error && error.code === 'PGRST116') {
      console.log('Customer not found by new_account_number, trying account_number...');
      const { data: fallbackCustomer, error: fallbackError } = await supabase
        .from('customers')
        .select('*')
        .eq('account_number', accountNumber)
        .single();
      
      if (!fallbackError && fallbackCustomer) {
        customer = fallbackCustomer;
        error = null;
        console.log('Customer found using fallback account_number field');
      } else {
        error = fallbackError;
      }
    }

    if (error) {
      console.error('Error fetching customer data:', error);
      if (error.code === 'PGRST116') {
        // No customer found with this account number
        return NextResponse.json({ 
          success: false, 
          error: 'No customer found with this account number',
          details: error.message 
        }, { status: 404 });
      }
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch customer data',
        details: error.message 
      }, { status: 500 });
    }

    if (!customer) {
      return NextResponse.json({ 
        success: false, 
        error: 'No customer found with this account number' 
      }, { status: 404 });
    }

    console.log('Customer data found:', {
      id: customer.id,
      new_account_number: customer.new_account_number,
      trading_name: customer.trading_name,
      company: customer.company,
      email: customer.email,
      cell_no: customer.cell_no,
      switchboard: customer.switchboard
    });

    return NextResponse.json({
      success: true,
      customer: customer
    });

  } catch (error) {
    console.error('Unexpected error in fetch-by-account:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
