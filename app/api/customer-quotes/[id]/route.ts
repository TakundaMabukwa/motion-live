import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the customer quote
    const { data, error } = await supabase
      .from('customer_quotes')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch customer quote',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching customer quote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Update the customer quote
    const { data, error } = await supabase
      .from('customer_quotes')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to update customer quote',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer quote updated successfully',
      data
    });

  } catch (error) {
    console.error('Error updating customer quote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the customer quote
    const { error } = await supabase
      .from('customer_quotes')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to delete customer quote',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer quote deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting customer quote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
