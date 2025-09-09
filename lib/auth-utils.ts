import { createClient } from "@/lib/supabase/client";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface UserRole {
  role: string;
  id: string;
  email: string;
}

/**
 * Redirects user to their role-specific dashboard
 * @param router - Next.js router instance
 * @param userId - User ID to fetch role for
 * @param fallbackPath - Fallback path if role is not found (default: '/protected')
 */
export async function redirectToRoleDashboard(
  router: AppRouterInstance,
  userId: string,
  fallbackPath: string = '/protected'
): Promise<void> {
  const supabase = createClient();
  
  try {
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      router.push(fallbackPath);
      return;
    }

    if (userData?.role) {
      const rolePath = userData.role.toLowerCase();
      const allowedRoles = ['accounts', 'admin', 'fc', 'inv', 'master', 'tech'];
      
      if (allowedRoles.includes(rolePath)) {
        router.push(`/protected/${rolePath}`);
      } else {
        router.push(fallbackPath);
      }
    } else {
      router.push(fallbackPath);
    }
  } catch (error) {
    console.error('Error in redirectToRoleDashboard:', error);
    router.push(fallbackPath);
  }
}

/**
 * Gets user role information
 * @param userId - User ID to fetch role for
 * @returns Promise<UserRole | null>
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = createClient();
  
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (error || !userData) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role
    };
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return null;
  }
}

/**
 * Checks if user has completed first-time login setup
 * @param userId - User ID to check
 * @returns Promise<boolean>
 */
export async function isFirstTimeLogin(userId: string): Promise<boolean> {
  const supabase = createClient();
  
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('first_login')
      .eq('id', userId)
      .single();

    if (error || !userData) {
      console.error('Error checking first login status:', error);
      return true; // Default to first login if we can't determine
    }

    return userData.first_login === true;
  } catch (error) {
    console.error('Error in isFirstTimeLogin:', error);
    return true; // Default to first login if we can't determine
  }
}
