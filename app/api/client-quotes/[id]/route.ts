import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params to get the ID
    const { id } = await params;
    
    // Delete the client quote
    const { error } = await supabase
      .from('client_quotes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to delete client quote',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Client quote deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting client quote:', error);
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
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      // Await params to get the ID
      const { id } = await params;
      
      // First, get the client quote data
      const { data: clientQuote, error: fetchError } = await supabase
        .from('client_quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching client quote:', fetchError);
        return NextResponse.json({ 
          error: 'Failed to fetch client quote',
          details: fetchError.message 
        }, { status: 500 });
      }

      // Create a copy of the client quote in job_cards table - don't move the original
      const jobCardData = {
        // Basic job information
        job_type: clientQuote.job_type || 'install',
        job_description: clientQuote.job_description || '',
        priority: clientQuote.priority || 'medium',
        status: 'pending',
        job_status: 'pending',
        
        // Customer information
        customer_name: clientQuote.customer_name || '',
        customer_email: clientQuote.customer_email || '',
        customer_phone: clientQuote.customer_phone || '',
        customer_address: clientQuote.customer_address || '',
        contact_person: clientQuote.contact_person || '',
        decommission_date: clientQuote.decommission_date || null,
        account_id: clientQuote.account_id,
        new_account_number: clientQuote.new_account_number, // Copy the new_account_number field
        
        // Vehicle information
        vehicle_registration: clientQuote.vehicle_registration || '',
        vehicle_make: clientQuote.vehicle_make || '',
        vehicle_model: clientQuote.vehicle_model || '',
        vehicle_year: clientQuote.vehicle_year || null,
        
        // Quotation details
        quotation_number: `APPROVED-${clientQuote.job_number}`,
        quote_date: clientQuote.quote_date || new Date().toISOString(),
        quote_expiry_date: clientQuote.quote_expiry_date || null,
        quote_status: 'approved',
        quote_type: 'internal',
        
        // Pricing
        quotation_products: clientQuote.quotation_products || [],
        quotation_subtotal: clientQuote.quotation_subtotal || 0,
        quotation_vat_amount: clientQuote.quotation_vat_amount || 0,
        quotation_total_amount: clientQuote.quotation_total_amount || 0,
        
        // Email content
        quote_email_subject: `Approved: ${clientQuote.job_number}`,
        quote_email_body: clientQuote.quote_email_body || '',
        quote_email_footer: clientQuote.quote_email_footer || '',
        quote_notes: clientQuote.quote_notes || '',
        
        // Additional fields
        special_instructions: clientQuote.special_instructions || clientQuote.quote_notes || '',
        purchase_type: clientQuote.purchase_type || 'purchase',
        quotation_job_type: clientQuote.job_type || 'install',
        
        // Required system fields
        job_number: clientQuote.job_number,
        created_by: user.id,
        updated_by: user.id
      };

      // Debug: Log the data being inserted
      console.log('Creating job card copy from client quote:', JSON.stringify(jobCardData, null, 2));
      
      // Insert copy into job_cards table
      const { data: jobCard, error: insertError } = await supabase
        .from('job_cards')
        .insert(jobCardData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating job card copy:', insertError);
        return NextResponse.json({ 
          error: 'Failed to create job card copy',
          details: insertError.message 
        }, { status: 500 });
      }

      // Update the client quote status to approved (don't move it)
      const { error: updateError } = await supabase
        .from('client_quotes')
        .update({ 
          status: 'approved',
          job_status: 'approved',
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating client quote status:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update client quote status',
          details: updateError.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Client quote approved and copied to job cards successfully',
        data: {
          jobCardId: jobCard.id,
          jobNumber: jobCard.job_number,
          originalQuoteId: id
        }
      });
    }

    if (action === 'decline') {
      // Await params to get the ID
      const { id } = await params;
      
      // Update the client quote status to declined (don't delete it)
      const { error: updateError } = await supabase
        .from('client_quotes')
        .update({ 
          status: 'declined',
          job_status: 'declined',
          updated_at: new Date().toISOString(),
          updated_by: user.id
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating client quote status to declined:', updateError);
        return NextResponse.json({ 
          error: 'Failed to decline client quote',
          details: updateError.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Client quote declined successfully',
        data: {
          quoteId: id,
          status: 'declined'
        }
      });
    }

    return NextResponse.json({
      error: 'Invalid action',
      details: 'Only approve or decline actions are supported'
    }, { status: 400 });

  } catch (error) {
    console.error('Error processing client quote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
