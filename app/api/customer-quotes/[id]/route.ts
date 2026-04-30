import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function extractMissingColumnName(message?: string | null): string | null {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the customer quote
    const { data, error } = await supabase
      .from('customer_quotes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch customer quote',
        details: error.message 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Customer quote not found' },
        { status: 404 }
      );
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const hasField = (field: string) => Object.prototype.hasOwnProperty.call(body, field);
    const updatePayload: Record<string, unknown> = {};

    const updatableFields = [
      'job_type',
      'job_sub_type',
      'job_description',
      'purchase_type',
      'quotation_job_type',
      'customer_name',
      'customer_email',
      'customer_phone',
      'customer_address',
      'contact_person',
      'decommission_date',
      'annuity_end_date',
      'move_to_role',
      'vehicle_registration',
      'vehicle_make',
      'vehicle_model',
      'vehicle_year',
      'vin_number',
      'odormeter',
      'quote_notes',
      'quote_email_subject',
      'quote_email_body',
      'quote_email_footer',
      'quotation_products',
      'quotation_subtotal',
      'quotation_vat_amount',
      'quotation_total_amount',
      'status',
      'quote_status',
      'job_status',
      'new_account_number',
      'account_id',
      'special_instructions',
      'work_notes',
      'deinstall_vehicles',
      'deinstall_stock_items',
      'stock_received'
    ];

    for (const field of updatableFields) {
      if (hasField(field)) {
        updatePayload[field] = body[field];
      }
    }

    const updateAttemptPayload: Record<string, unknown> = {
      ...updatePayload,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };
    let data: Record<string, unknown> | null = null;
    let error: { code?: string | null; message?: string | null } | null = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const updateResult = await supabase
        .from('customer_quotes')
        .update(updateAttemptPayload)
        .eq('id', id)
        .select()
        .maybeSingle();

      data = updateResult.data as Record<string, unknown> | null;
      error = updateResult.error as typeof error;

      if (!error) {
        break;
      }

      const missingColumn = extractMissingColumnName(error.message);
      if (error.code === 'PGRST204' && missingColumn && Object.prototype.hasOwnProperty.call(updateAttemptPayload, missingColumn)) {
        delete updateAttemptPayload[missingColumn];
        continue;
      }

      break;
    }

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to update customer quote',
        details: error.message 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Customer quote not found' },
        { status: 404 }
      );
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the customer quote
    const { data, error } = await supabase
      .from('customer_quotes')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to delete customer quote',
        details: error.message 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Customer quote not found' },
        { status: 404 }
      );
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
