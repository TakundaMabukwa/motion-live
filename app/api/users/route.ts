import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

    // Create service role client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    });

    // Get users from public.users table filtered by @soltrack.co.za emails
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .ilike('email', '%@soltrack.co.za');
    
    if (usersError) {
      console.error('Users error details:', {
        message: usersError.message,
        code: usersError.code,
        details: usersError.details,
        hint: usersError.hint
      });
      return NextResponse.json({ 
        error: 'Failed to fetch users from database', 
        details: usersError.message 
      }, { status: 500 });
    }

    console.log(`Fetched ${users?.length || 0} users from public.users`);

    // Use direct SQL query to join public.users with auth.users
    // This is more reliable than fetching separately and combining
    const { data: combinedUsers, error: queryError } = await supabaseAdmin.rpc('get_users_with_auth', {
      email_pattern: '%@soltrack.co.za'
    });

    if (queryError) {
      console.error('RPC query error:', queryError);
      // Fallback: If the function doesn't exist, create it on the fly
      console.log('Function might not exist, trying direct approach...');
      
      // Get auth data for the specific user IDs
      const userIds = users.map(u => u.id);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        console.error('Auth error:', authError);
        return NextResponse.json({ 
          error: 'Failed to fetch auth data', 
          details: authError.message 
        }, { status: 500 });
      }

      // Create a map and combine
      const authUserMap = new Map(authData.users.map(au => [au.id, au]));
      
      const fallbackUsers = users.map(user => {
        const authUser = authUserMap.get(user.id);
        return {
          ...user,
          last_sign_in_at: authUser?.last_sign_in_at || null,
        };
      }).sort((a, b) => {
        if (!a.last_sign_in_at && !b.last_sign_in_at) return 0;
        if (!a.last_sign_in_at) return 1;
        if (!b.last_sign_in_at) return -1;
        return new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime();
      });
      
      return NextResponse.json({ users: fallbackUsers });
    }

    console.log(`Fetched ${combinedUsers?.length || 0} users with auth data via RPC`);

    return NextResponse.json({ users: combinedUsers });
  } catch (error: any) {
    console.error('Error fetching users:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({ 
      error: 'Failed to fetch users', 
      details: error.message 
    }, { status: 500 });
  }
}