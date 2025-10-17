import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface StockItem {
  count: number;
  description: string;
}

interface SupplierStock {
  [itemCode: string]: StockItem;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { stock_updates, stock_take_date, notes } = body;

    if (!stock_updates || !Array.isArray(stock_updates)) {
      return NextResponse.json({ error: 'Invalid stock updates data' }, { status: 400 });
    }

    // Get current technician stock
    const { data: currentTechStock, error: fetchError } = await supabase
      .from('tech_stock')
      .select('stock')
      .eq('technician_email', user.email)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching technician stock:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const currentStock = currentTechStock?.stock || {};
    let updatedCount = 0;
    const errors = [];

    // Process each stock update
    for (const update of stock_updates) {
      try {
        const { id, current_quantity, new_quantity, difference } = update;

        // Validate the update
        if (!id || typeof new_quantity !== 'number' || new_quantity < 0) {
          errors.push(`Invalid data for item ${id}`);
          continue;
        }

        // Find the supplier that contains this item code
        let itemFound = false;
        for (const [, supplierItems] of Object.entries(currentStock as Record<string, SupplierStock>)) {
          if (supplierItems[id]) {
            // Update the count in the nested structure
            supplierItems[id].count = new_quantity;
            itemFound = true;
            break;
          }
        }

        if (!itemFound) {
          errors.push(`Item ${id} not found in stock`);
          continue;
        }

        updatedCount++;
      } catch (error) {
        console.error(`Error processing stock update for item ${update.id}:`, error);
        errors.push(`Error processing item ${update.id}: ${(error as Error).message}`);
      }
    }

    // Update the technician stock
    const { error: updateError } = await supabase
      .from('tech_stock')
      .upsert({
        technician_email: user.email,
        stock: currentStock,
        created_at: new Date().toISOString()
      });

    if (updateError) {
      console.error('Error updating technician stock:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the stock take change (optional - you might want to create a log table for this)
    // For now, we'll skip the logging as the structure changed

    // Return results
    const response = {
      success: true,
      updated_count: updatedCount,
      total_items: stock_updates.length,
      errors: errors.length > 0 ? errors : undefined
    };

    if (errors.length > 0) {
      console.warn('Stock take completed with errors:', errors);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in stock take POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch stock take history
    const { data: stockTakeHistory, error } = await supabase
      .from('stock_take_log')
      .select(`
        *,
        stock_item:stock(description, code, supplier, stock_type)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching stock take history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      stock_take_history: stockTakeHistory || [],
      total: stockTakeHistory?.length || 0
    });

  } catch (error) {
    console.error('Error in stock take history GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 