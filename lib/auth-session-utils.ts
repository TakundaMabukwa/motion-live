import { createClient } from "@/lib/supabase/client";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Checks if the user has a valid session and redirects to login if not
 * @param router - Next.js router instance
 * @returns Promise<boolean> - true if session is valid, false if redirected to login
 */
export async function checkAuthSession(router: AppRouterInstance): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session check error:', error);
      router.push('/auth/login');
      return false;
    }
    
    if (!session) {
      console.log('No active session found, redirecting to login');
      router.push('/auth/login');
      return false;
    }
    
    // Check if session is expired
    if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
      console.log('Session expired, redirecting to login');
      router.push('/auth/login');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking auth session:', error);
    router.push('/auth/login');
    return false;
  }
}

/**
 * Refreshes the current session
 * @returns Promise<boolean> - true if session was refreshed successfully
 */
export async function refreshAuthSession(): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Session refresh error:', error);
      return false;
    }
    
    if (!data.session) {
      console.log('No session after refresh');
      return false;
    }
    
    console.log('Session refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
}

/**
 * Handles authentication errors and attempts session recovery
 * @param error - The error that occurred
 * @param router - Next.js router instance
 * @returns Promise<boolean> - true if error was handled, false if should redirect to login
 */
export async function handleAuthError(error: any, router: AppRouterInstance): Promise<boolean> {
  console.error('Authentication error:', error);
  
  // Check if it's a session-related error
  if (error?.message?.includes('AuthSessionMissingError') || 
      error?.message?.includes('session') ||
      error?.message?.includes('unauthorized')) {
    
    // Try to refresh the session first
    const refreshed = await refreshAuthSession();
    
    if (refreshed) {
      console.log('Session refreshed, retrying...');
      return true; // Session was refreshed, can retry
    } else {
      console.log('Session refresh failed, redirecting to login');
      router.push('/auth/login');
      return false;
    }
  }
  
  // For other errors, redirect to login
  router.push('/auth/login');
  return false;
}
