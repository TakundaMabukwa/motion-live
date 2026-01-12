import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get auth data first to get last_sign_in_at
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Auth access denied. Check service role key.' }, { status: 403 });
    }

    // Get users from public.users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('Users error:', usersError);
      throw usersError;
    }

    // Combine users table data with auth last_sign_in_at
    const combinedUsers = users.map(user => {
      const authUser = authData.users.find(au => au.id === user.id);
      return {
        ...user,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        auth_created_at: authUser?.created_at || null
      };
    });

    return NextResponse.json({ users: combinedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users', details: error.message }, { status: 500 });
  }
}