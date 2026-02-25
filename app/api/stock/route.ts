import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type InventoryCategoryRow = {
  code: string | null;
  description: string | null;
  total_count: number | null;
} | null;

type InventoryItemRow = {
  id: number;
  serial_number: string | null;
  status: string | null;
  category_code: string | null;
  assigned_to_technician: string | null;
  assigned_date: string | null;
  job_card_id: string | null;
  container: string | null;
  direction: string | null;
  notes: string | null;
  inventory_categories: InventoryCategoryRow;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const supplier = searchParams.get('supplier');
    const category = searchParams.get('category');
    const view = searchParams.get('view'); // 'thresholds' or 'stock-take'

    // Fetch inventory in recursive batches so large datasets (>1000 rows) are fully returned.
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;
    const stock: InventoryItemRow[] = [];

    while (hasMore) {
      let batchQuery = supabase
        .from('inventory_items')
        .select(`
          id,
          serial_number,
          status,
          category_code,
          assigned_to_technician,
          assigned_date,
          job_card_id,
          container,
          direction,
          notes,
          inventory_categories!inventory_items_category_fkey (
            code,
            description,
            total_count
          )
        `)
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (search) {
        batchQuery = batchQuery.or(`serial_number.ilike.%${search}%`);
      }

      if (supplier) {
        batchQuery = batchQuery.eq('supplier', supplier);
      }

      if (category) {
        batchQuery = batchQuery.eq('category_code', category);
      }

      const { data: batch, error: batchError } = await batchQuery;

      if (batchError) {
        console.error('Error fetching inventory items batch:', batchError);
        return NextResponse.json({ error: batchError.message }, { status: 500 });
      }

      if (!batch || batch.length === 0) {
        break;
      }

      stock.push(...batch);

      if (batch.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }

    let processedStock;
    
    if (view === 'thresholds') {
      // Group items by category for thresholds view
      const categoryGroups = {};
      stock?.forEach((item) => {
        const categoryCode = item.category_code;
        if (!categoryGroups[categoryCode]) {
          categoryGroups[categoryCode] = {
            id: categoryCode,
            description: item.inventory_categories?.description || categoryCode,
            code: item.inventory_categories?.code || categoryCode,
            supplier: 'N/A',
            stock_type: item.inventory_categories?.description || 'N/A',
            quantity: 0,
            serial_number: categoryCode,
            status: 'CATEGORY',
            category_code: categoryCode
          };
        }
        if (item.status === 'IN STOCK') {
          categoryGroups[categoryCode].quantity += 1;
        }
      });
      processedStock = Object.values(categoryGroups) || [];
    } else {
      // Return individual items for stock take
      processedStock = stock?.map(item => {
        const categoryDesc = item.inventory_categories?.description || item.category_code;
        return {
          id: item.id,
          description: categoryDesc,
          code: item.category_code,
          supplier: 'N/A',
          stock_type: categoryDesc,
          quantity: '1',
          serial_number: item.serial_number,
          status: item.status,
          category_code: item.category_code,
          category_description: categoryDesc,
          category: {
            description: categoryDesc,
            code: item.category_code
          }
        };
      }) || [];
    }

    return NextResponse.json({ stock: processedStock });
  } catch (error) {
    console.error('Error in stock GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, new_quantity } = body;

    if (!id || typeof new_quantity !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Update individual inventory item status
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ 
        status: new_quantity > 0 ? 'IN STOCK' : 'OUT OF STOCK',
        date_adjusted: new Date().toISOString().split('T')[0]
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating stock:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in stock PATCH:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, serial_number } = body;

    if (!id || !serial_number) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Update inventory item serial number
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ 
        serial_number: serial_number,
        date_adjusted: new Date().toISOString().split('T')[0]
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating serial number:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in stock PUT:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    const body = await request.json();
    const { category_code, serial_number } = body;

    if (!category_code || !serial_number) {
      return NextResponse.json({ error: 'Category code and serial number are required' }, { status: 400 });
    }

    // Create new inventory item
    const { data: newItem, error: insertError } = await supabase
      .from('inventory_items')
      .insert({
        category_code: category_code,
        serial_number: serial_number,
        status: 'IN STOCK',
        date_adjusted: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating inventory item:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Error in stock POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 
