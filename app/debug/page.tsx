import { AuthStatus } from "@/components/auth-status";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DebugPage() {
  const supabase = await createClient();
  
  // Get server-side session info
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-6 mx-auto p-6 container">
      <h1 className="font-bold text-2xl">Auth Debug Page</h1>
      
      <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-semibold text-xl">Server-Side Auth Info</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
            <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
            <p><strong>Session:</strong> {session ? 'Active' : 'No session'}</p>
            <p><strong>Session Expires:</strong> {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="font-semibold text-xl">Client-Side Auth Info</h2>
          <AuthStatus />
        </div>
      </div>
    </div>
  );
} 