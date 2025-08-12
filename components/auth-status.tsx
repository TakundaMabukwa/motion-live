"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthStatus() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cookies, setCookies] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    };

    // Get cookies
    const getCookies = () => {
      const allCookies = document.cookie.split(';');
      const authCookies = allCookies.filter(cookie => 
        cookie.includes('sb-') || cookie.includes('supabase')
      );
      setCookies(authCookies);
    };

    getSession();
    getCookies();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user || null);
        getCookies();
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleRefresh = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user || null);
    
    const allCookies = document.cookie.split(';');
    const authCookies = allCookies.filter(cookie => 
      cookie.includes('sb-') || cookie.includes('supabase')
    );
    setCookies(authCookies);
  };

  if (loading) {
    return <div>Loading auth status...</div>;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Auth Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <strong>User:</strong> {user ? user.email : 'Not logged in'}
        </div>
        <div>
          <strong>Session:</strong> {session ? 'Active' : 'No session'}
        </div>
        <div>
          <strong>User ID:</strong> {user?.id || 'N/A'}
        </div>
        <div>
          <strong>Auth Cookies:</strong>
          <ul className="mt-2 text-xs">
            {cookies.map((cookie, index) => (
              <li key={index} className="break-all">
                {cookie.trim()}
              </li>
            ))}
          </ul>
        </div>
        <Button onClick={handleRefresh} size="sm">
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
} 