import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { token, action } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Missing QR token" }, { status: 400 });
  }

  if (!action || !["check_in", "check_out"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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

  // Get employee profile
  const { data: profile } = await db
    .from("profiles")
    .select("id, tenant_id, is_active, full_name, full_name_ar")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "Account is frozen" }, { status: 403 });
  }

  // Validate QR token — use maybeSingle to avoid single() errors
  const { data: qr, error: qrError } = await db
    .from("branch_qr_codes")
    .select("id, branch_id, tenant_id, is_active")
    .eq("qr_token", token)
    .maybeSingle();

  if (qrError) {
    console.error("[QR Scan] DB error looking up token:", qrError.message, "Token:", token);
    return NextResponse.json({ error: `Database error: ${qrError.message}` }, { status: 500 });
  }

  if (!qr) {
    console.error("[QR Scan] Token not found in DB. Token:", token);
    return NextResponse.json({ error: `QR token not found. Token prefix: ${token.substring(0, 20)}...` }, { status: 400 });
  }

  if (!qr.is_active) {
    console.error("[QR Scan] Token found but is_active=false. Token:", token);
    return NextResponse.json({ error: "QR code is deactivated (is_active=false)" }, { status: 400 });
  }

  // TENANT ISOLATION
  if (profile.tenant_id !== qr.tenant_id) {
    return NextResponse.json(
      { error: "Access denied: this QR code belongs to a different organization" },
      { status: 403 }
    );
  }

  // Get branch name for display
  const { data: branch } = await db
    .from("branches")
    .select("name, name_ar")
    .eq("id", qr.branch_id)
    .single();

  const branchName = branch?.name_ar || branch?.name || "";

  if (action === "check_in") {
    const { data: openLog } = await db
      .from("attendance_logs")
      .select("id")
      .eq("employee_id", user.id)
      .is("check_out", null)
      .maybeSingle();

    if (openLog) {
      return NextResponse.json({ error: "You are already checked in" }, { status: 400 });
    }

    const { error } = await db.from("attendance_logs").insert({
      tenant_id: qr.tenant_id,
      employee_id: user.id,
      branch_id: qr.branch_id,
      check_in: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      action: "check_in",
      name: profile.full_name_ar || profile.full_name,
      branchName,
    });
  }

  if (action === "check_out") {
    const { data: openLog } = await db
      .from("attendance_logs")
      .select("id")
      .eq("employee_id", user.id)
      .is("check_out", null)
      .maybeSingle();

    if (!openLog) {
      return NextResponse.json({ error: "You are not checked in" }, { status: 400 });
    }

    const { error } = await db
      .from("attendance_logs")
      .update({ check_out: new Date().toISOString() })
      .eq("id", openLog.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      action: "check_out",
      name: profile.full_name_ar || profile.full_name,
      branchName,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
