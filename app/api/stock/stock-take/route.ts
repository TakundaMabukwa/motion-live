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

    let updatedCount = 0;
    const errors = [];

    // Process each stock update using new inventory system
    for (const update of stock_updates) {
      try {
        const { id, current_quantity, new_quantity, difference } = update;

        // Validate the update
        if (!id || typeof new_quantity !== 'number' || new_quantity < 0) {
          errors.push(`Invalid data for item ${id}`);
          continue;
        }

        // Update inventory category total_count
        const { error: updateError } = await supabase
          .from('inventory_categories')
          .update({ 
            total_count: new_quantity,
            date_adjusted: new Date().toISOString().split('T')[0]
          })
          .eq('code', id);

        if (updateError) {
          errors.push(`Failed to update item ${id}: ${updateError.message}`);
          continue;
        }

        updatedCount++;
      } catch (error) {
        console.error(`Error processing stock update for item ${update.id}:`, error);
        errors.push(`Error processing item ${update.id}: ${(error as Error).message}`);
      }
    }

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