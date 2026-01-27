// /middleware.ts
import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes to prevent interference
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Handle session updates using the SSR approach
  const response = await updateSession(request);

  // Skip auth checks for these paths
  const publicPaths = ['/auth', '/_next', '/favicon.ico', '/api/auth'];
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return response;
  }

  // Create Supabase client for role-based routing
  const { createServerClient } = await import("@supabase/ssr");
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get user and role from users table
  const { data: { user } } = await supabase.auth.getUser();
  const userData = user ? (await supabase
    .from('users')
    .select('role, first_login')
    .eq('id', user.id)
    .single()).data : null;
  
  const role = userData?.role?.toLowerCase();
  const isFirstLogin = userData?.first_login === true;

  // Check for first-time login and redirect to password change
  if (user && isFirstLogin && !request.nextUrl.pathname.startsWith('/auth/first-time-login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/first-time-login';
    return NextResponse.redirect(url);
  }

  // Role-based routing
  if (user && role && !isFirstLogin) {
    const currentPath = request.nextUrl.pathname.split('/')[2];
    const allowedRoles = ['accounts', 'admin', 'fc', 'inv', 'master', 'tech'];

    // Case 1: Accessing base protected route
    if (request.nextUrl.pathname === '/protected') {
      const url = request.nextUrl.clone();
      url.pathname = `/protected/${role}`;
      return NextResponse.redirect(url);
    }

    // Case 2: Accessing wrong role path (skip for master users - they can view any role)
    if (
      role !== 'master' &&
      currentPath &&
      allowedRoles.includes(currentPath) &&
      currentPath !== role
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/protected/${role}`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};