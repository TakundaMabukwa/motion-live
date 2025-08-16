import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Logger } from '@/lib/logger';

const logger = new Logger('auth');

/**
 * Authenticate a request using the Supabase auth session cookie
 * @param req The Next.js request object
 * @returns The authenticated user or null if not authenticated
 */
export async function auth(req: NextRequest) {
  try {
    logger.debug('Authenticating request');
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      logger.warn('Authentication failed', { error: error.message });
      return null;
    }
    
    if (!user) {
      logger.debug('No authenticated user found');
      return null;
    }
    
    logger.debug('User authenticated successfully', { 
      userId: user.id, 
      email: user.email 
    });
    
    return user;
  } catch (error) {
    logger.error('Error during authentication', error as Error);
    return null;
  }
}
