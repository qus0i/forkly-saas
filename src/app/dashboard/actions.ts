"use server";

import { createServiceClient } from "@/lib/supabase/server";

// ═══════════════ CATEGORIES ═══════════════

export async function getCategories(tenantId: string) {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function createCategory(data: {
  tenant_id: string;
  name: string;
  name_ar: string;
  sort_order?: number;
}) {
  const supabase = await createServiceClient();
  const { data: cat, error } = await supabase
    .from("categories")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return cat;
}

export async function updateCategory(id: string, data: {
  name?: string;
  name_ar?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("categories").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ═══════════════ ITEMS ═══════════════

export async function getItems(tenantId: string, categoryId?: string) {
  const supabase = await createServiceClient();
  let query = supabase
    .from("items")
    .select("*, categories(name, name_ar)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function createItem(data: {
  tenant_id: string;
  name: string;
  name_ar: string;
  category_id: string;
  sku?: string;
  unit?: string;
}) {
  const supabase = await createServiceClient();
  const { data: item, error } = await supabase
    .from("items")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return item;
}

export async function updateItem(id: string, data: {
  name?: string;
  name_ar?: string;
  category_id?: string;
  sku?: string;
  unit?: string;
  is_active?: boolean;
}) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("items").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteItem(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ═══════════════ ORDERS ═══════════════

export async function getOrders(tenantId: string, filters?: {
  status?: string;
  branch_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const supabase = await createServiceClient();
  let query = supabase
    .from("orders")
    .select("*, branches(name, name_ar), profiles!orders_created_by_fkey(full_name, full_name_ar), order_items(*)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.branch_id) query = query.eq("branch_id", filters.branch_id);
  if (filters?.date_from) query = query.gte("created_at", filters.date_from);
  if (filters?.date_to) {
    const endOfDay = new Date(filters.date_to);
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setMilliseconds(endOfDay.getMilliseconds() - 1);
    query = query.lte("created_at", endOfDay.toISOString());
  }

  const { data, error } = await query.limit(200);
  if (error) throw new Error(error.message);
  return data;
}

export async function createOrder(data: {
  tenant_id: string;
  branch_id: string;
  created_by: string;
  notes?: string;
  required_date?: string;
  items: { item_id: string; item_name: string; item_name_ar: string; quantity: number; unit: string; notes?: string }[];
}) {
  const supabase = await createServiceClient();

  // Generate order number
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", data.tenant_id)
    .gte("created_at", now.toISOString().slice(0, 10));
  const orderNumber = `ORD-${dateStr}-${String((count || 0) + 1).padStart(3, "0")}`;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      tenant_id: data.tenant_id,
      order_number: orderNumber,
      branch_id: data.branch_id,
      created_by: data.created_by,
      notes: data.notes || null,
      required_date: data.required_date || null,
      status: "new",
    })
    .select()
    .single();

  if (orderError) throw new Error(orderError.message);

  // Insert order items
  const orderItems = data.items.map((item) => ({
    order_id: order.id,
    item_id: item.item_id,
    item_name: item.item_name,
    item_name_ar: item.item_name_ar || item.item_name,
    quantity: item.quantity,
    unit: item.unit,
    notes: item.notes || null,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw new Error(itemsError.message);

  return order;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

// ═══════════════ BRANCHES ═══════════════

export async function getBranches(tenantId: string) {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function createBranch(data: {
  tenant_id: string;
  name: string;
  name_ar: string;
  address?: string;
  phone?: string;
}) {
  const supabase = await createServiceClient();
  const { data: branch, error } = await supabase
    .from("branches")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return branch;
}

export async function updateBranch(id: string, data: {
  name?: string;
  name_ar?: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
  auto_checkout_hours?: number;
}) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("branches").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBranch(id: string) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ═══════════════ USERS/PROFILES ═══════════════

export async function getProfiles(tenantId: string, role?: string) {
  const supabase = await createServiceClient();
  let query = supabase
    .from("profiles")
    .select("*, branches(name, name_ar)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (role) query = query.eq("role", role);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function createProfile(data: {
  tenant_id: string;
  email: string;
  password: string;
  full_name: string;
  full_name_ar: string;
  role: string;
  branch_id?: string;
}) {
  const supabase = await createServiceClient();

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);

  // Create profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authUser.user.id,
    tenant_id: data.tenant_id,
    email: data.email,
    full_name: data.full_name,
    full_name_ar: data.full_name_ar || data.full_name,
    role: data.role,
    branch_id: data.branch_id || null,
    is_active: true,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(profileError.message);
  }

  return authUser.user;
}

export async function updateProfile(id: string, data: {
  full_name?: string;
  full_name_ar?: string;
  role?: string;
  branch_id?: string | null;
  is_active?: boolean;
}) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProfile(id: string) {
  const supabase = await createServiceClient();
  await supabase.auth.admin.deleteUser(id);
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ═══════════════ REPORTS ═══════════════

export async function getOrderReport(tenantId: string, filters?: {
  branch_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const supabase = await createServiceClient();
  let query = supabase
    .from("orders")
    .select("*, branches(name, name_ar), order_items(*)")
    .eq("tenant_id", tenantId);

  if (filters?.branch_id) query = query.eq("branch_id", filters.branch_id);
  if (filters?.date_from) query = query.gte("created_at", filters.date_from);
  if (filters?.date_to) query = query.lte("created_at", filters.date_to + "T23:59:59");

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// ═══════════════ DASHBOARD STATS ═══════════════

export async function getDashboardStats(tenantId: string) {
  const supabase = await createServiceClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [branches, items, employees, newOrders, attendance] = await Promise.all([
    supabase.from("branches").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true).neq("role", "system_admin"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "new"),
    supabase.from("attendance_logs").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("check_in", todayStart.toISOString()),
  ]);

  return {
    branches: branches.count ?? 0,
    items: items.count ?? 0,
    employees: employees.count ?? 0,
    newOrders: newOrders.count ?? 0,
    todayAttendance: attendance.count ?? 0,
  };
}
