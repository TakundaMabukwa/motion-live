import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the job card by ID
    const { data: job, error: fetchError } = await supabase
      .from('job_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching job card:', fetchError);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);

  } catch (error) {
    console.error('Error in job-cards GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Get current job card to check if it's being completed
    const { data: currentJob, error: fetchError } = await supabase
      .from('job_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current job card:', fetchError);
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    // Check if job is being completed (status changing to 'Completed')
    const isBeingCompleted = body.job_status === 'Completed' && 
                            currentJob.job_status !== 'Completed';

    // Prepare update data - remove technician if job is being completed
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    // If job is being completed, remove technician assignment
    if (isBeingCompleted) {
      updateData.assigned_technician_id = null;
      updateData.technician_name = null;
      updateData.technician_phone = null;
    }

    // Update the job card
    const { data: updatedJob, error: updateError } = await supabase
      .from('job_cards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating job card:', updateError);
      return NextResponse.json({ error: 'Failed to update job card' }, { status: 500 });
    }

    // If job is being completed, handle vehicle addition based on job type
    if (isBeingCompleted) {
      try {
        // Call the add-vehicle endpoint internally (it will check job type)
        const addVehicleResponse = await fetch(`${request.nextUrl.origin}/api/job-cards/${id}/add-vehicle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({})
        });

        if (addVehicleResponse.ok) {
          const addVehicleResult = await addVehicleResponse.json();
          console.log('Job completion processed:', addVehicleResult.message);
        } else {
          console.error('Failed to process job completion:', await addVehicleResponse.text());
        }
      } catch (error) {
        console.error('Error processing job completion:', error);
        // Don't fail the job completion if vehicle processing fails
      }
    }

    return NextResponse.json(updatedJob);

  } catch (error) {
    console.error('Error in job-cards PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
