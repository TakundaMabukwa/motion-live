import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type InventoryCategoryRow = {
  code: string | null;
  description: string | null;
  total_count: number | null;
} | null;

type InventoryItemRow = {
  id: number;
  created_at: string | null;
  serial_number: string | null;
  date_adjusted: string | null;
  container: string | null;
  direction: string | null;
  status: string | null;
  category_code: string | null;
  assigned_to_technician: string | null;
  assigned_date: string | null;
  job_card_id: string | null;
  company: string | null;
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
          created_at,
          serial_number,
          date_adjusted,
          status,
          category_code,
          assigned_to_technician,
          assigned_date,
          job_card_id,
          container,
          direction,
          company,
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

    const processedStock = stock?.map(item => {
      const categoryDesc = item.inventory_categories?.description || item.category_code;
      const quantity = item.status === 'IN STOCK' ? '1' : '0';
      return {
        id: item.id,
        created_at: item.created_at,
        description: categoryDesc,
        code: item.category_code,
        supplier: 'N/A',
        stock_type: categoryDesc,
        quantity,
        serial_number: item.serial_number,
        date_adjusted: item.date_adjusted,
        status: item.status,
        category_code: item.category_code,
        category_description: categoryDesc,
        assigned_to_technician: item.assigned_to_technician,
        assigned_date: item.assigned_date,
        job_card_id: item.job_card_id,
        container: item.container,
        direction: item.direction,
        company: item.company,
        notes: item.notes,
        category: {
          description: categoryDesc,
          code: item.category_code
        }
      };
    }) || [];

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
