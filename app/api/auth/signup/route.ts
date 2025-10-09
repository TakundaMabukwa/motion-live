import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated (admin creating the account)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, email_confirm } = body;
    
    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 });
    }

    // Create the user account
    const defaultPw = '123456';
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password || defaultPw,
    });

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ 
        error: 'Failed to create user account',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'User account created successfully',
      data: data 
    });

  } catch (error) {
    console.error('Error in auth signup:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
