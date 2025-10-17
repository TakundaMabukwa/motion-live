"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { redirectToRoleDashboard } from "@/lib/auth-utils";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // Authenticate user using SSR approach
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!user) throw new Error("Authentication failed");

      // Get user data from users table including first_login status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, first_login')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      if (!userData?.role) throw new Error("Role not assigned");

      // Check if this is a first-time login
      if (userData.first_login === true) {
        // Redirect to first-time password change page
        router.push('/auth/first-time-login');
        return;
      }

      // Redirect to role-specific dashboard using utility function
      await redirectToRoleDashboard(router, user.id);

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 items-center px-4", className)} {...props}>
      <Card className="w-full max-w-md rounded-xl shadow-xl">
        <CardHeader className="text-center pt-6">
          <CardTitle className="text-3xl font-semibold">Sign In</CardTitle>
          <CardDescription className="text-blue-600">
            Access the fleet management dashboard to manage your vehicles,
            drivers, and trips.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="inline-block ml-auto text-sm text-blue-600 hover:underline underline-offset-2"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex items-center gap-3">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="remember" className="text-sm font-medium text-gray-700">
                  Remember me
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>

          <div className="mt-4 text-sm text-center">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}