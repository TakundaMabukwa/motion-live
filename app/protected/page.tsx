import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";


export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  // Get the current user to check their role
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Check user's role from the users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    // If user has master role, redirect to master route
    if (userData?.role === 'master') {
      redirect('/protected/master');
    }
    
    // If user has other roles, redirect accordingly
    if (userData?.role) {
      redirect(`/protected/${userData.role}`);
    }
  }

  return (
    <div className="flex flex-col flex-1 gap-12 w-full">
      <div className="w-full">
        <div className="flex items-center gap-3 bg-accent p-3 px-5 rounded-md text-foreground text-sm">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated
          user
        </div>
      </div>
      <div className="flex flex-col items-start gap-2">
        <h2 className="mb-4 font-bold text-2xl">Your user details</h2>
        <pre className="p-3 border rounded max-h-32 overflow-auto font-mono text-xs">
          {JSON.stringify(data.claims, null, 2)}
        </pre>
      </div>
      <div>
        <h2 className="mb-4 font-bold text-2xl">Next steps</h2>
        <p className="text-muted-foreground">
          You can now access the protected routes in this application.
        </p>
      </div>
    </div>
  );
}
