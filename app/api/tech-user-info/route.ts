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

    // Get user info from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, tech_admin')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a technician
    if (userData.role !== 'tech') {
      return NextResponse.json({ error: 'Access denied. Technician role required.' }, { status: 403 });
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role
      },
      isTechAdmin: userData.tech_admin || false
    });

  } catch (error) {
    console.error('Error in tech-user-info GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}





