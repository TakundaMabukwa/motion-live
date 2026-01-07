import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Try to get user, but don't fail if session is missing
    const { data: { user } } = await supabase.auth.getUser();
    
    // Log for debugging
    if (!user) {
      console.warn('No user session found in product-items API');
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const getFilters = searchParams.get('filters');

    // If filters requested, return unique types and categories
    if (getFilters === 'true') {
      const { data: products, error } = await supabase
        .from('product_items')
        .select('type, category');

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch filters', details: error.message },
          { status: 500 }
        );
      }

      const types = [...new Set(products?.map(p => p.type).filter(Boolean))].sort();
      const categories = [...new Set(products?.map(p => p.category).filter(Boolean))].sort();

      return NextResponse.json({ types, categories });
    }

    let query = supabase
      .from('product_items')
      .select('*')
      .order('product', { ascending: true });

    // Filter by type if provided (case-insensitive)
    if (type && type !== 'all') {
      query = query.ilike('type', type);
    }

    // Filter by category if provided (case-insensitive)
    if (category && category !== 'all') {
      query = query.ilike('category', category);
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