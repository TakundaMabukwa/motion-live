import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { id } = params;
  const { destination } = await request.json();

  if (!id || !destination) {
    return NextResponse.json(
      { error: 'Job ID and destination are required' },
      { status: 400 }
    );
  }

  try {
    // This is a simplified example. You'll need to adjust this based on your
    // database schema and how you track a job's state.
    // For example, you might update a 'status' or 'current_role' column.
    const { data, error } = await supabase
      .from('job_cards')
      .update({
        // Example: 'moved_to_admin', 'moved_to_fc', etc.
        // You might have a more sophisticated status system.
        status: `moved_to_${destination.toLowerCase()}`,
      })
      .eq('id', id)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error moving job card:', error);
    return NextResponse.json(
      { error: 'Failed to move job card', details: error.message },
      { status: 500 }
    );
  }
}
