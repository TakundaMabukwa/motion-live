import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication failed', details: authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.error('No user found');
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
    }

    console.log('Fetching boot stock for user:', user.email);
    
    // Test basic connection first
    const { data: testData, error: testError } = await supabase
      .from('technician_boot_stock')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('Table access test failed:', testError);
      return NextResponse.json({ 
        error: 'Database table access failed', 
        details: testError.message,
        code: testError.code 
      }, { status: 500 });
    }
    
    console.log('Table access test passed, found records:', testData?.length || 0);
    
    // Now try the full query
    const { data: bootStock, error } = await supabase
      .from('technician_boot_stock')
      .select(`
        id,
        quantity,
        ip_addresses,
        catalog_item_id,
        boot_stock_catalog!catalog_item_id (
          code,
          description,
          stock_type,
          supplier,
          cost_excl_vat_zar
        )
      `)
      .eq('technician_email', user.email);

    if (error) {
      console.error('Boot stock query error:', error);
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: error.message,
        code: error.code,
        hint: error.hint 
      }, { status: 500 });
    }

    console.log('Raw boot stock data:', bootStock);
    console.log('Boot stock count:', bootStock?.length || 0);



    const formattedStock = bootStock?.map(item => ({
      id: item.id,
      description: item.boot_stock_catalog?.description,
      code: item.boot_stock_catalog?.code,
      supplier: item.boot_stock_catalog?.supplier,
      stock_type: item.boot_stock_catalog?.stock_type,
      quantity: item.quantity?.toString(),
      ip_addresses: item.ip_addresses
    })) || [];

    console.log('Formatted stock data:', formattedStock);
    console.log('Returning stock count:', formattedStock.length);

    return NextResponse.json({ stock: formattedStock });
  } catch (error) {
    console.error('Boot stock API error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}