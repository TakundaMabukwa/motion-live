import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;
    const { destination } = await request.json();

    if (!id || !destination) {
      return NextResponse.json(
        { error: 'Job ID and destination are required' },
        { status: 400 }
      );
    }

    const destinationNormalized = String(destination).trim().toLowerCase();
    const roleAliasMap: Record<string, 'admin' | 'accounts' | 'fc'> = {
      admin: 'admin',
      accounts: 'accounts',
      account: 'accounts',
      fc: 'fc',
      finance: 'fc'
    };
    const targetRole = roleAliasMap[destinationNormalized];

    if (!targetRole) {
      return NextResponse.json(
        {
          error: 'Invalid destination role',
          allowed_roles: ['admin', 'accounts', 'fc']
        },
        { status: 400 }
      );
    }

    // When moving to FC, mark the job as completed and run the same
    // completion flow used by PATCH /api/job-cards/[id].
    if (targetRole === 'fc') {
      const completionPayload = {
        role: 'fc',
        move_to: 'fc',
        status: 'completed',
        job_status: 'Completed',
        completion_date: new Date().toISOString(),
        end_time: new Date().toISOString()
      };

      const patchUrl = `${new URL(request.url).origin}/api/job-cards/${id}`;
      const patchResponse = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.headers.get('Authorization') || '',
          Cookie: request.headers.get('Cookie') || ''
        },
        body: JSON.stringify(completionPayload)
      });

      const patchBody = await patchResponse.json().catch(() => ({}));

      if (!patchResponse.ok) {
        return NextResponse.json(
          {
            error: 'Failed to complete and move job to FC',
            details: patchBody?.error || patchBody?.details || 'Unknown error'
          },
          { status: patchResponse.status }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Job moved to FC and marked as completed',
        job: patchBody
      });
    }

    const { data, error } = await supabase
      .from('job_cards')
      .update({
        status: `moved_to_${targetRole}`,
        role: targetRole,
        move_to: targetRole
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: `Job moved to ${destination}`,
      job: data
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error moving job card:', error);
    return NextResponse.json(
      { error: 'Failed to move job card', details: errorMessage },
      { status: 500 }
    );
  }
}
