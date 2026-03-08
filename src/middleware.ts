import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Extract subdomain
  // In development: use query param ?tenant=slug or header
  // In production: extract from hostname
  let tenantSlug: string | null = null;

  // Production: saj.forkly.cloud -> slug = "saj"
  if (hostname.includes("forkly.cloud")) {
    const parts = hostname.split(".");
    if (parts.length > 2 && parts[0] !== "www") {
      tenantSlug = parts[0];
    }
  }

  // Development: check query param or use "admin" as default
  if (!tenantSlug) {
    const paramSlug = request.nextUrl.searchParams.get("tenant");
    if (paramSlug) {
      tenantSlug = paramSlug;
    }
  }

  // Set tenant slug in headers for downstream use
  if (tenantSlug) {
    response.headers.set("x-tenant-slug", tenantSlug);
  }

  // Auth guard: redirect to login if not authenticated
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/api/") || pathname.startsWith("/attendance/");
  
  if (!user && !isAuthRoute && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    if (tenantSlug) {
      loginUrl.searchParams.set("tenant", tenantSlug);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and trying to access login, redirect to appropriate dashboard
  if (user && pathname === "/login") {
    // Check profile role to determine redirect
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const roleRedirects: Record<string, string> = {
      system_admin: "/admin/tenants",
      restaurant_admin: "/dashboard",
      kitchen_manager: "/dashboard/kitchen",
      branch_manager: "/dashboard/orders/new",
      hr_manager: "/dashboard/hr/employees",
      employee: "/attendance/scan",
    };

    const dest = profile?.role
      ? (roleRedirects[profile.role] ?? "/dashboard")
      : "/dashboard";

    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
