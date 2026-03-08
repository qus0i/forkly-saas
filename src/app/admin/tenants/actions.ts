"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function getTenants() {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createTenant(formData: {
  name: string;
  name_ar: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}) {
  const supabase = await createServiceClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", formData.slug)
    .single();

  if (existing) {
    throw new Error("Subdomain already exists");
  }

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: formData.name,
      name_ar: formData.name_ar,
      slug: formData.slug.toLowerCase(),
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
    })
    .select()
    .single();

  if (tenantError) throw new Error(tenantError.message);

  // Create admin user in Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: formData.admin_email,
    password: formData.admin_password,
    email_confirm: true,
  });

  if (authError) {
    // Rollback tenant creation
    await supabase.from("tenants").delete().eq("id", tenant.id);
    throw new Error(authError.message);
  }

  // Create profile for admin
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authUser.user.id,
    tenant_id: tenant.id,
    email: formData.admin_email,
    full_name: formData.admin_name,
    full_name_ar: formData.admin_name,
    role: "restaurant_admin",
    is_active: true,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    await supabase.from("tenants").delete().eq("id", tenant.id);
    throw new Error(profileError.message);
  }

  return tenant;
}

export async function updateTenant(
  id: string,
  data: {
    name?: string;
    name_ar?: string;
    slug?: string;
    primary_color?: string;
    secondary_color?: string;
  }
) {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("tenants")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function toggleTenantFreeze(id: string, freeze: boolean) {
  const supabase = await createServiceClient();

  // Freeze/unfreeze tenant
  const { error: tenantError } = await supabase
    .from("tenants")
    .update({ is_active: !freeze, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (tenantError) throw new Error(tenantError.message);

  // Freeze/unfreeze all users in this tenant
  const { error: usersError } = await supabase
    .from("profiles")
    .update({ is_active: !freeze })
    .eq("tenant_id", id);

  if (usersError) throw new Error(usersError.message);
}

export async function deleteTenant(id: string) {
  const supabase = await createServiceClient();

  // Get all users in this tenant to delete from auth
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", id);

  // Delete auth users
  if (profiles) {
    for (const profile of profiles) {
      await supabase.auth.admin.deleteUser(profile.id);
    }
  }

  // Delete tenant (cascades to all related data)
  const { error } = await supabase.from("tenants").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateTenantAdminPassword(tenantId: string, newPassword: string) {
  const supabase = await createServiceClient();

  // Find the restaurant_admin for this tenant
  const { data: adminProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role", "restaurant_admin")
    .single();

  if (profileError || !adminProfile) {
    throw new Error("Could not find admin user for this tenant");
  }

  // Update password in Auth
  const { error: authError } = await supabase.auth.admin.updateUserById(adminProfile.id, {
    password: newPassword,
  });

  if (authError) throw new Error(authError.message);
}
