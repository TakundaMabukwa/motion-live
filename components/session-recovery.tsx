"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SessionRecoveryProps {
  children: React.ReactNode;
}

export function SessionRecovery({ children }: SessionRecoveryProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          router.push('/auth/login');
          return;
        }
        
        if (!session) {
          console.log('No session found, redirecting to login');
          router.push('/auth/login');
          return;
        }
        
        // Check if session is expired
        if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
          console.log('Session expired, attempting refresh...');
          
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            console.log('Session refresh failed, redirecting to login');
            router.push('/auth/login');
            return;
          }
          
          console.log('Session refreshed successfully');
        }
        
        setHasSession(true);
      } catch (error) {
        console.error('Error checking session:', error);
        router.push('/auth/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="mx-auto border-b-2 border-blue-600 rounded-full w-8 h-8 animate-spin"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
