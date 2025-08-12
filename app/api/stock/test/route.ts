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

    // Test basic query
    const { data, error } = await supabase
      .from('stock')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error in stock test query:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Stock test endpoint working',
      stock_count: data?.length || 0,
      sample_data: data?.slice(0, 2) || [],
      user_id: user.id
    });

  } catch (error) {
    console.error('Error in stock test endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create test stock items
    const testStockItems = [
      {
        description: 'GPS Tracking Device',
        code: 'GPS-001',
        supplier: 'TechCorp',
        quantity: '10',
        stock_type: 'tracking',
        cost_excl_vat_zar: '1500.00',
        total_value: '15000.00',
        USD: '100.00'
      },
      {
        description: 'SIM Card 4G',
        code: 'SIM-001',
        supplier: 'MobileNet',
        quantity: '25',
        stock_type: 'communication',
        cost_excl_vat_zar: '50.00',
        total_value: '1250.00',
        USD: '3.50'
      },
      {
        description: 'Mounting Bracket',
        code: 'MB-001',
        supplier: 'HardwareCo',
        quantity: '15',
        stock_type: 'hardware',
        cost_excl_vat_zar: '200.00',
        total_value: '3000.00',
        USD: '13.50'
      },
      {
        description: '4G Antenna',
        code: 'ANT-001',
        supplier: 'SignalTech',
        quantity: '8',
        stock_type: 'hardware',
        cost_excl_vat_zar: '300.00',
        total_value: '2400.00',
        USD: '20.00'
      },
      {
        description: 'Power Cable',
        code: 'CBL-001',
        supplier: 'PowerCorp',
        quantity: '30',
        stock_type: 'hardware',
        cost_excl_vat_zar: '75.00',
        total_value: '2250.00',
        USD: '5.00'
      }
    ];

    const { data, error } = await supabase
      .from('stock')
      .insert(testStockItems)
      .select('*');

    if (error) {
      console.error('Error creating test stock items:', error);
      return NextResponse.json({ error: 'Failed to create test stock items', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Test stock items created successfully',
      stock_items: data
    });

  } catch (error) {
    console.error('Error in stock test POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
