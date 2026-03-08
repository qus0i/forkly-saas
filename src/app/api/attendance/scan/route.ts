import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Missing QR token" }, { status: 400 });
  }

  const cookieStore = await cookies();

  // Get authenticated user from session cookie
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Use service client for all DB operations (bypasses RLS issues)
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get employee profile — include is_active and tenant_id
  const { data: profile } = await db
    .from("profiles")
    .select("id, tenant_id, is_active, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "Account is frozen" }, { status: 403 });
  }

  // Validate QR token — must be active
  const { data: qr } = await db
    .from("branch_qr_codes")
    .select("id, branch_id, tenant_id, is_active")
    .eq("qr_token", token)
    .single();

  if (!qr || !qr.is_active) {
    return NextResponse.json({ error: "Invalid or expired QR code" }, { status: 400 });
  }

  // ✅ TENANT ISOLATION: employee must belong to the same tenant as the QR code
  if (profile.tenant_id !== qr.tenant_id) {
    return NextResponse.json(
      { error: "Access denied: this QR code belongs to a different organization" },
      { status: 403 }
    );
  }

  // Check for open attendance log (already checked in)
  const { data: openLog } = await db
    .from("attendance_logs")
    .select("id")
    .eq("employee_id", user.id)
    .is("check_out", null)
    .maybeSingle();

  if (openLog) {
    // Check out
    const { error } = await db
      .from("attendance_logs")
      .update({ check_out: new Date().toISOString() })
      .eq("id", openLog.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: "check_out", name: profile.full_name });
  }

  // Check in
  const { error } = await db
    .from("attendance_logs")
    .insert({
      tenant_id: qr.tenant_id,
      employee_id: user.id,
      branch_id: qr.branch_id,
      check_in: new Date().toISOString(),
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ action: "check_in", name: profile.full_name });
}
