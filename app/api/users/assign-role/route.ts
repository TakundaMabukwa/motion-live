import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated (admin assigning the role)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role, systemId } = body;
    
    // Validate required fields
    if (!email || !role || !systemId) {
      return NextResponse.json({ 
        error: 'Email, role, and system are required' 
      }, { status: 400 });
    }

    // Validate role
    const validRoles = ['fleet_manager', 'driver'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be either fleet_manager or driver' 
      }, { status: 400 });
    }

    // Update the user's role in the users table
    const { data, error } = await supabase
      .from('users')
      .update({ role: role })
      .eq('email', email)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      return NextResponse.json({ 
        error: 'Failed to assign role',
        details: error.message 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Update the systems table to add the user to the selected system
    try {
      // First, get the current system data
      const { data: systemData, error: systemFetchError } = await supabase
        .from('systems')
        .select('users')
        .eq('id', systemId)
        .single();

      if (systemFetchError) {
        console.error('Error fetching system data:', systemFetchError);
        // Continue without failing the main operation
      } else {
        // Parse existing users or initialize empty array
        const existingUsers = systemData?.users || [];
        
        // Add the new user ID if not already present
        const userId = data.id;
        if (!existingUsers.includes(userId)) {
          const updatedUsers = [...existingUsers, userId];
          
          // Update the system with the new user list
          const { error: systemUpdateError } = await supabase
            .from('systems')
            .update({ users: updatedUsers })
            .eq('id', systemId);

          if (systemUpdateError) {
            console.error('Error updating system users:', systemUpdateError);
            // Continue without failing the main operation
          }
        }
      }
    } catch (systemError) {
      console.error('Error handling system update:', systemError);
      // Continue without failing the main operation
    }

    return NextResponse.json({ 
      success: true,
      message: 'Role and system access assigned successfully',
      data: data 
    });

  } catch (error) {
    console.error('Error in assign role:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
