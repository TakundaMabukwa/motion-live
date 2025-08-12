import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Process each stock update
    for (const update of stock_updates) {
      try {
        const { id, current_quantity, new_quantity, difference } = update;

        // Validate the update
        if (!id || typeof new_quantity !== 'number' || new_quantity < 0) {
          errors.push(`Invalid data for item ${id}`);
          continue;
        }

        // Get current stock item to calculate new total value
        const { data: currentStock, error: fetchError } = await supabase
          .from('stock')
          .select('cost_excl_vat_zar')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error(`Error fetching stock item ${id}:`, fetchError);
          errors.push(`Failed to fetch item ${id}: ${fetchError.message}`);
          continue;
        }

        // Calculate new total value
        const costPerUnit = parseFloat(currentStock.cost_excl_vat_zar || '0');
        const newTotalValue = (new_quantity * costPerUnit).toFixed(2);

        // Update the stock quantity and total value
        const { error: updateError } = await supabase
          .from('stock')
          .update({ 
            quantity: new_quantity.toString(),
            total_value: newTotalValue,
            created_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error(`Error updating stock item ${id}:`, updateError);
          errors.push(`Failed to update item ${id}: ${updateError.message}`);
          continue;
        }

        // Log the stock take change
        const { error: logError } = await supabase
          .from('stock_take_log')
          .insert({
            stock_item_id: id,
            previous_quantity: current_quantity,
            new_quantity: new_quantity,
            difference: difference,
            stock_take_date: stock_take_date,
            notes: notes,
            performed_by: user.id,
            created_at: new Date().toISOString()
          });

        if (logError) {
          console.error(`Error logging stock take for item ${id}:`, logError);
          // Don't fail the entire operation for logging errors
        }

        updatedCount++;
      } catch (error) {
        console.error(`Error processing stock update for item ${update.id}:`, error);
        errors.push(`Error processing item ${update.id}: ${error.message}`);
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