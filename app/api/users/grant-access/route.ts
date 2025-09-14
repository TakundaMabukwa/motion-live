import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Create a NEW user account for the email provided in the popup form
    const { data: authData, error: authError2 } = await supabase.auth.signUp({
      email: email, // This is the email from the popup form
      password: 'Password@12', // Auto-generated password for the new user
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

    // Wait for the user to be created in the database with retry logic
    let userData = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    console.log(`Looking for user with email: ${email}`);
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // First check if user exists in auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email === email);
      console.log(`Attempt ${attempts + 1}: Auth user found:`, !!authUser);
      
      // Then check our custom users table
      const { data: foundUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      console.log(`Attempt ${attempts + 1}: Custom users table result:`, { foundUser: !!foundUser, error: userError?.message });
      
      if (foundUser && !userError) {
        userData = foundUser;
        break;
      }
      
      // If user exists in auth but not in our table, create the record
      if (authUser && !foundUser && userError?.code === 'PGRST116') {
        console.log('User exists in auth but not in users table, creating record...');
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{
            id: authUser.id,
            email: email,
            role: role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select('*')
          .single();
        
        if (newUser && !createError) {
          userData = newUser;
          console.log('Successfully created user record in users table');
          break;
        } else {
          console.error('Error creating user record:', createError);
        }
      }
      
      attempts++;
      console.log(`Attempt ${attempts}: User not found yet, retrying...`);
    }

    if (!userData) {
      return NextResponse.json({ 
        error: 'User not found in database after creation. Please try again.' 
      }, { status: 500 });
    }

    // Update the user's role (if not already set during creation)
    let updatedUser = userData;
    if (userData.role !== role) {
      const { data: roleUpdatedUser, error: updateError } = await supabase
        .from('users')
        .update({ role: role })
        .eq('id', userData.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating user role:', updateError);
        return NextResponse.json({ 
          error: 'Failed to assign role',
          details: updateError.message 
        }, { status: 500 });
      }

      if (roleUpdatedUser) {
        updatedUser = roleUpdatedUser;
      }
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
        const userId = userData.id;
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

    // Send email with credentials to the new user
    try {
      // Get system name for email
      const { data: systemData } = await supabase
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
        // Don't fail the main operation if email fails
      } else {
        console.log('Email sent successfully to:', email);
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the main operation if email fails
    }

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
