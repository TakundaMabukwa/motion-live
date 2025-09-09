import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, first_login, role')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json({ 
        error: 'Failed to fetch user data',
        details: userError 
      }, { status: 500 });
    }

    return NextResponse.json({
      authUser: {
        id: user.id,
        email: user.email
      },
      dbUser: userData
    });

  } catch (error) {
    console.error('Error in debug-user API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update first_login to false
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ first_login: false })
      .eq('id', user.id)
      .select();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update user',
        details: updateError 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updatedData: updateData
    });

  } catch (error) {
    console.error('Error in debug-user POST API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

