import { NextResponse } from 'next/server';
import { UnauthorizedError } from '@/lib/errors';

/**
 * Get the authenticated user from the request
 * @returns The authenticated user or throws an UnauthorizedError
 */
export async function getAuthenticatedUser() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new UnauthorizedError('Authentication required');
  }
  
  return user;
}

/**
 * Get the authenticated user's role from the request
 * @returns The user and their role from the users table
 * @throws UnauthorizedError if the user is not authenticated
 */
export async function getUserWithRole() {
  const user = await getAuthenticatedUser();
  
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .single();
    
  if (error || !data) {
    throw new UnauthorizedError('User profile not found');
  }
  
  return {
    user,
    role: data.role,
    profile: data
  };
}

/**
 * Create an unauthorized response
 * @returns NextResponse with 401 status
 */
export function createUnauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
