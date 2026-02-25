import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { job_status, annuity_end_date } = body;

    if (!job_status) {
      return NextResponse.json({ error: 'job_status is required' }, { status: 400 });
    }

    // Update the customer quote with the new job_status
    const updatePayload: {
      job_status: string;
      updated_at: string;
      updated_by: string;
      decommission_date?: string;
    } = {
      job_status: job_status,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    if (annuity_end_date) {
      updatePayload.decommission_date = annuity_end_date;
    }

    const { data, error } = await supabase
      .from('customer_quotes')
      .update(updatePayload)
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
      data: {
        id: data.id,
        job_status: data.job_status,
        updated_at: data.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating customer quote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
