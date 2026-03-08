import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const cookieStore = await cookies();

  // Auth client (sets the session cookie)
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error: authError } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 401 });
  }

  // Service client (bypasses RLS to get profile)
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role, is_active, tenant_id")
    .eq("id", data.user.id)
    .single();

  if (profile && !profile.is_active) {
    await authClient.auth.signOut();
    return NextResponse.json({ error: "Account is frozen" }, { status: 403 });
  }

  const roleRedirects: Record<string, string> = {
    system_admin: "/admin/tenants",
    restaurant_admin: "/dashboard",
    kitchen_manager: "/dashboard/kitchen",
    branch_manager: "/dashboard/orders/new",
    hr_manager: "/dashboard/hr/employees",
    employee: "/attendance/scan",
  };

  const redirectTo = profile?.role
    ? (roleRedirects[profile.role] ?? "/dashboard")
    : "/dashboard";

  return NextResponse.json({
    success: true,
    redirectTo,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: profile?.role,
    },
  });
}
