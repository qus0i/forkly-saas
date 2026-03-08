import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

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
    return NextResponse.json({ isCheckedIn: false }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check for open attendance log (checked in but not checked out)
  const { data: openLog } = await db
    .from("attendance_logs")
    .select("id, branch_id, branches(name, name_ar)")
    .eq("employee_id", user.id)
    .is("check_out", null)
    .maybeSingle();

  if (openLog) {
    const branch = openLog.branches as unknown as { name: string; name_ar: string | null } | null;
    return NextResponse.json({
      isCheckedIn: true,
      branchName: branch?.name_ar || branch?.name || "",
    });
  }

  return NextResponse.json({ isCheckedIn: false });
}
