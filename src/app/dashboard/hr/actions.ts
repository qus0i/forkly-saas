"use server";

import { createServiceClient } from "@/lib/supabase/server";

// ═══════════════ ATTENDANCE ═══════════════

export async function getAttendanceLogs(tenantId: string, filters?: {
  employee_id?: string;
  branch_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const supabase = await createServiceClient();
  let query = supabase
    .from("attendance_logs")
    .select("*, profiles!attendance_logs_employee_id_fkey(full_name, full_name_ar, email), branches(name, name_ar)")
    .eq("tenant_id", tenantId)
    .order("check_in", { ascending: false });

  if (filters?.employee_id) query = query.eq("employee_id", filters.employee_id);
  if (filters?.branch_id) query = query.eq("branch_id", filters.branch_id);
  if (filters?.date_from) query = query.gte("check_in", filters.date_from);
  if (filters?.date_to) {
    // Build end-of-day safely using Date API to avoid invalid dates (e.g. April 31)
    const endOfDay = new Date(filters.date_to);
    endOfDay.setDate(endOfDay.getDate() + 1); // advance to next day midnight
    endOfDay.setMilliseconds(endOfDay.getMilliseconds() - 1); // subtract 1ms = 23:59:59.999
    query = query.lte("check_in", endOfDay.toISOString());
  }

  const { data, error } = await query.limit(500);
  if (error) throw new Error(error.message);
  return data;
}

export async function checkInEmployee(tenantId: string, employeeId: string, branchId: string) {
  const supabase = await createServiceClient();

  // Check if already checked in (no check_out)
  const { data: openLog } = await supabase
    .from("attendance_logs")
    .select("id")
    .eq("employee_id", employeeId)
    .is("check_out", null)
    .single();

  if (openLog) {
    // Check out instead
    const { error } = await supabase
      .from("attendance_logs")
      .update({ check_out: new Date().toISOString() })
      .eq("id", openLog.id);
    if (error) throw new Error(error.message);
    return { action: "check_out" };
  }

  // Check in
  const { error } = await supabase.from("attendance_logs").insert({
    tenant_id: tenantId,
    employee_id: employeeId,
    branch_id: branchId,
    check_in: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { action: "check_in" };
}

// ═══════════════ QR CODES ═══════════════

export async function getBranchQRCodes(tenantId: string) {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("branch_qr_codes")
    .select("*, branches(name, name_ar)")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return data;
}

export async function generateBranchQR(tenantId: string, branchId: string) {
  const supabase = await createServiceClient();
  const qrToken = `forkly-${tenantId}-${branchId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Deactivate old QR for this branch
  await supabase
    .from("branch_qr_codes")
    .update({ is_active: false })
    .eq("branch_id", branchId)
    .eq("tenant_id", tenantId);

  const { data, error } = await supabase
    .from("branch_qr_codes")
    .insert({ tenant_id: tenantId, branch_id: branchId, qr_token: qrToken, is_active: true })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ═══════════════ PAYROLL ═══════════════

export async function getEmployeePayroll(employeeId: string) {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("employee_payroll")
    .select("*")
    .eq("employee_id", employeeId)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

export async function upsertPayroll(data: {
  employee_id: string;
  tenant_id: string;
  base_salary: number;
  base_hours: number;
  overtime_rate: number;
}) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("employee_payroll")
    .upsert(data, { onConflict: "employee_id" });
  if (error) throw new Error(error.message);
}

export async function getPayrollAdjustments(employeeId: string, month?: string) {
  const supabase = await createServiceClient();
  let query = supabase
    .from("payroll_adjustments")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (month) query = query.eq("month", month);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function addPayrollAdjustment(data: {
  employee_id: string;
  tenant_id: string;
  type: string;
  amount: number;
  description: string;
  month: string;
  created_by: string;
}) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("payroll_adjustments").insert(data);
  if (error) throw new Error(error.message);
}

export async function deletePayrollAdjustment(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("payroll_adjustments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ═══════════════ AUTO-CHECKOUT ═══════════════

export async function runAutoCheckout(tenantId: string) {
  const supabase = await createServiceClient();

  // Get branches with auto-checkout settings
  const { data: branches } = await supabase
    .from("branches")
    .select("id, auto_checkout_hours")
    .eq("tenant_id", tenantId);

  if (!branches) return;

  for (const branch of branches) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - branch.auto_checkout_hours);

    const { error } = await supabase
      .from("attendance_logs")
      .update({ check_out: new Date().toISOString(), is_auto_checkout: true })
      .eq("branch_id", branch.id)
      .is("check_out", null)
      .lt("check_in", cutoff.toISOString());

    if (error) console.error("Auto-checkout error:", error);
  }
}
