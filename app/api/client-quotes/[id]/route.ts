import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function extractMissingColumnName(message?: string | null): string | null {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const { data, error } = await supabase
      .from('client_quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch client quote',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching client quote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, annuity_end_date, destination } = body;
    const { id } = await params;

    if (action === 'approve') {
      
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

      const normalize = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const isDeinstall =
        normalize(clientQuote.job_type).includes('deinstall') ||
        normalize(clientQuote.quotation_job_type).includes('deinstall');
      const isDecommission =
        normalize(clientQuote.job_sub_type).includes('decommission') ||
        normalize(clientQuote.job_description).includes('decommission');
      const isDecommissionJobCard = isDeinstall && isDecommission;

      const destinationFromQuote = String(clientQuote.move_to_role || '').trim().toLowerCase();
      const destinationNormalized = String(destination || destinationFromQuote || 'none').trim().toLowerCase();
      const validDestinations = new Set(['none', 'inv', 'admin', 'accounts']);

      if (!validDestinations.has(destinationNormalized)) {
        return NextResponse.json(
          {
            error: 'Invalid destination',
            allowed_destinations: ['inv', 'admin', 'accounts', 'none']
          },
          { status: 400 }
        );
      }

      const annuityEndDate = annuity_end_date || clientQuote.annuity_end_date || null;
      if (isDeinstall && !annuityEndDate) {
        return NextResponse.json(
          { error: 'annuity_end_date is required for de-install quotes' },
          { status: 400 }
        );
      }

      if (isDecommissionJobCard) {
        if (!annuityEndDate) {
          return NextResponse.json(
            { error: 'annuity_end_date is required for decommission quotes' },
            { status: 400 }
          );
        }

        if (!['inv', 'admin', 'accounts'].includes(destinationNormalized)) {
          return NextResponse.json(
            { error: 'destination role is required for decommission quotes' },
            { status: 400 }
          );
        }
      }

      const decommissionDate = clientQuote.decommission_date || null;
      const resolvedMoveToRole = isDecommissionJobCard && destinationNormalized !== 'none'
        ? destinationNormalized
        : null;
      const routingDestination = isDecommissionJobCard ? destinationNormalized : 'none';

      const routingFields: {
        status: string;
        role?: 'admin' | 'inv' | 'accounts';
        move_to?: 'admin' | 'inv' | 'accounts';
      } =
        routingDestination === 'admin'
          ? { role: 'admin', move_to: 'admin', status: 'admin_created' }
          : routingDestination === 'inv'
          ? { role: 'inv', move_to: 'inv', status: 'pending' }
          : routingDestination === 'accounts'
          ? { role: 'accounts', move_to: 'accounts', status: 'pending' }
          : { status: 'pending' };

      // Create a copy of the client quote in job_cards table - don't move the original
      const jobCardData = {
        // Basic job information
        job_type: clientQuote.job_type || 'install',
        job_description: clientQuote.job_description || '',
        priority: clientQuote.priority || 'medium',
        status: routingFields.status,
        job_status: 'pending',
        ...(routingFields.role ? { role: routingFields.role } : {}),
        ...(routingFields.move_to ? { move_to: routingFields.move_to } : {}),
        
        // Customer information
        customer_name: clientQuote.customer_name || '',
        customer_email: clientQuote.customer_email || '',
        customer_phone: clientQuote.customer_phone || '',
        customer_address: clientQuote.customer_address || '',
        contact_person: clientQuote.contact_person || '',
        decommission_date: decommissionDate,
        annuity_end_date: annuityEndDate,
        account_id: clientQuote.account_id,
        new_account_number: clientQuote.new_account_number, // Copy the new_account_number field
        
        // Vehicle information
        vehicle_registration: clientQuote.vehicle_registration || '',
        vehicle_make: clientQuote.vehicle_make || '',
        vehicle_model: clientQuote.vehicle_model || '',
        vehicle_year: clientQuote.vehicle_year || null,
        vin_numer: clientQuote.vin_number || null,
        odormeter: clientQuote.odormeter || null,
        
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
      
      // Insert or update by job_number so repeated approvals don't fail with unique violations.
      const { data: jobCard, error: insertError } = await supabase
        .from('job_cards')
        .upsert(jobCardData, { onConflict: 'job_number' })
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
      const approveUpdatePayload: Record<string, unknown> = {
        status: 'approved',
        job_status: 'approved',
        decommission_date: decommissionDate,
        annuity_end_date: annuityEndDate,
        move_to_role: resolvedMoveToRole || clientQuote.move_to_role || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      };
      let updateError: { code?: string | null; message?: string | null; details?: string | null } | null = null;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const updateResult = await supabase
          .from('client_quotes')
          .update(approveUpdatePayload)
          .eq('id', id);

        updateError = updateResult.error as typeof updateError;
        if (!updateError) {
          break;
        }

        const missingColumn = extractMissingColumnName(updateError.message);
        if (updateError.code === 'PGRST204' && missingColumn && Object.prototype.hasOwnProperty.call(approveUpdatePayload, missingColumn)) {
          delete approveUpdatePayload[missingColumn];
          continue;
        }

        break;
      }

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
        data: { quoteId: id, status: 'declined' }
      });
    }

    // Regular update (no action specified)
    // Whitelist known client_quotes columns to avoid DB errors on unexpected keys.
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
      'work_notes'
    ];

    for (const field of updatableFields) {
      if (hasField(field)) {
        updatePayload[field] = body[field];
      }
    }

    const regularUpdatePayload: Record<string, unknown> = {
      ...updatePayload,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };
    let data: Record<string, unknown> | null = null;
    let error: { code?: string | null; message?: string | null; details?: string | null } | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const updateResult = await supabase
        .from('client_quotes')
        .update(regularUpdatePayload)
        .eq('id', id)
        .select()
        .single();

      data = updateResult.data as Record<string, unknown> | null;
      error = updateResult.error as typeof error;

      if (!error) {
        break;
      }

      const missingColumn = extractMissingColumnName(error.message);
      if (error.code === 'PGRST204' && missingColumn && Object.prototype.hasOwnProperty.call(regularUpdatePayload, missingColumn)) {
        delete regularUpdatePayload[missingColumn];
        continue;
      }

      break;
    }

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: 'Failed to update client quote',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Client quote updated successfully',
      data
    });

  } catch (error) {
    console.error('Error processing client quote:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
