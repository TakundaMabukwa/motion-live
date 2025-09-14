import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendUserCredentials } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if the current user is authenticated (admin granting access to someone else)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role, systemId } = body;
    
    // email = the email of the NEW user we're creating (from the popup form)
    // role = the role to assign to the NEW user
    // systemId = the system to give the NEW user access to
    
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

    // Check if the NEW user already exists in our users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 400 });
    }

    // Create service client for all operations (bypasses RLS)
    console.log('Service role key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('Service role key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
    
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create a NEW user account for the email provided in the popup form
    // Using service client to avoid session creation and RLS issues
    const { data: authData, error: authError2 } = await serviceSupabase.auth.admin.createUser({
      email: email,
      password: 'Password@12',
      email_confirm: true,
    });

    if (authError2) {
      console.error('Error creating user:', authError2);
      return NextResponse.json({ 
        error: 'Failed to create user account',
        details: authError2.message 
      }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ 
        error: 'User creation failed - no user data returned' 
      }, { status: 500 });
    }

    // Check if user already exists in our custom users table
    const { data: existingUserRecord, error: checkError } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    let userData;
    
    if (existingUserRecord && !checkError) {
      // User already exists, update their role if needed
      console.log('User already exists in users table, updating role...');
      const { data: updatedUser, error: updateError } = await serviceSupabase
        .from('users')
        .update({ role: role })
        .eq('id', authData.user.id)
        .select('*')
        .single();
      
      if (updateError) {
        console.error('Error updating user role:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update user role',
          details: updateError.message 
        }, { status: 500 });
      }
      
      userData = updatedUser;
    } else {
      // User doesn't exist, create new record
      console.log('Creating new user record in users table...');
      const { data: newUser, error: createError } = await serviceSupabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: email,
          role: role,
          created_at: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating user record:', createError);
        return NextResponse.json({ 
          error: 'Failed to create user record in database',
          details: createError.message 
        }, { status: 500 });
      }

      if (!newUser) {
        return NextResponse.json({ 
          error: 'User record creation failed' 
        }, { status: 500 });
      }

      userData = newUser;
    }

    // Role is already set during user creation, no need to update
    const updatedUser = userData;

    // Update the systems table to add the user to the selected system
    try {
      // First, get the current system data using service client
      const { data: systemData, error: systemFetchError } = await serviceSupabase
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
        const userId = userData.id;
        if (!existingUsers.includes(userId)) {
          const updatedUsers = [...existingUsers, userId];
          
          // Update the system with the new user list using service client
          const { error: systemUpdateError } = await serviceSupabase
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

    // Send email with credentials to the new user (non-blocking with timeout)
    const sendEmailAsync = async () => {
      try {
        // Get system name for email using service client
        const { data: systemData } = await serviceSupabase
          .from('systems')
          .select('system_name, system_url')
          .eq('id', systemId)
          .single();

        const systemName = systemData?.system_name || 'System';
        const systemUrl = systemData?.system_url || '';

        const emailResult = await sendUserCredentials({
          email: email,
          password: 'Password@12',
          role: role,
          systemName: systemName,
          systemUrl: systemUrl
        });

        if (!emailResult.success) {
          console.error('Failed to send email:', emailResult.error);
        } else {
          console.log('Email sent successfully to:', email);
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    };

    // Start email sending in background with timeout
    const emailPromise = sendEmailAsync();
    const emailTimeout = new Promise((resolve) => {
      setTimeout(() => {
        console.log('Email sending timed out, continuing with response');
        resolve(null);
      }, 8000); // 8 second timeout
    });

    // Race between email completion and timeout - don't await
    Promise.race([emailPromise, emailTimeout]).catch(err => {
      console.error('Email promise error:', err);
    });

    return NextResponse.json({ 
      success: true,
      message: 'Access granted successfully',
      data: {
        user: updatedUser,
        authUser: authData.user
      }
    });

  } catch (error) {
    console.error('Error in grant access:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
