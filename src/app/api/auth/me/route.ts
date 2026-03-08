import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

  // Auth client (uses cookies to get current user)
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

  const { data: { user }, error } = await authClient.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ user: null, tenant: null });
  }

  // Service client (bypasses RLS to fetch profile data)
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ user: null, tenant: null });
  }

  let tenant = null;
  if (profile.tenant_id) {
    const { data: tenantData } = await serviceClient
      .from("tenants")
      .select("*")
      .eq("id", profile.tenant_id)
      .single();
    tenant = tenantData;
  }

  return NextResponse.json({ user: profile, tenant });
}
