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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { redirectToRoleDashboard } from "@/lib/auth-utils";

export function FirstTimePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Validate password strength
      const validationError = validatePassword(password);
      if (validationError) {
        throw new Error(validationError);
      }

      // Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: password 
      });
      
      if (updateError) throw updateError;

      // Refresh the session after password update to ensure it's valid
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Session refresh after password update failed:', refreshError);
        // Don't throw error, continue with the flow
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Failed to get user information");

      // Update first_login flag in users table
      
      const { data: updateData, error: dbError } = await supabase
        .from('users')
        .update({ first_login: false })
        .eq('id', user.id)
        .select();

      if (dbError) {
        console.error('Database update error:', dbError);
        console.error('Error details:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        });
        throw new Error(`Failed to update user status: ${dbError.message}`);
      }


      setRedirecting(true);
      
      try {
        // Redirect to role-specific dashboard using utility function
        await redirectToRoleDashboard(router, user.id);
        
        // If we get here, redirect might not have worked, show success message
        setTimeout(() => {
          setSuccess(true);
          setRedirecting(false);
        }, 2000);
      } catch (redirectError) {
        console.error('Redirect error:', redirectError);
        setSuccess(true);
        setRedirecting(false);
      }

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRedirect = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await redirectToRoleDashboard(router, user.id);
    } else {
      router.push('/protected');
    }
  };

  if (redirecting) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Password Updated Successfully
            </CardTitle>
            <CardDescription>
              Your password has been changed successfully. Redirecting to your dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Password Updated Successfully
            </CardTitle>
            <CardDescription>
              Your password has been changed successfully. You are now logged in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleManualRedirect} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            First Time Login
          </CardTitle>
          <CardDescription>
            Welcome! For security reasons, you must change your default password before accessing the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange}>
            <div className="flex flex-col gap-6">
              <div className="gap-2 grid">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your new password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Password must be at least 8 characters with uppercase, lowercase, and numbers.
                </p>
              </div>
              <div className="gap-2 grid">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating Password..." : "Update Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
