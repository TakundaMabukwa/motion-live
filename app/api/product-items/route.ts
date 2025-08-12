import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query = supabase
      .from('product_items')
      .select('*')
      .order('product', { ascending: true });

    // Filter by type if provided
    if (type) {
      query = query.eq('type', type);
    }

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    // Search functionality
    if (search) {
      query = query.or(`product.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch product items', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ products: products || [] });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch product items', 
        details: error.message 
      },
      { status: 500 }
    );
  }
} 