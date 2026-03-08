"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useLocale } from "@/contexts/locale-context";
import {
  Plus,
  Store,
  CheckCircle2,
  Snowflake,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  ExternalLink,
  Search,
} from "lucide-react";
import {
  getTenants,
  createTenant,
  updateTenant,
  toggleTenantFreeze,
  deleteTenant,
  updateTenantAdminPassword,
} from "./actions";
import type { Tenant } from "@/types";

export default function TenantsPage() {
  const { t, isRTL } = useLocale();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showFreezeConfirm, setShowFreezeConfirm] = useState<{ id: string; freeze: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "",
    name_ar: "",
    slug: "",
    primary_color: "#000000",
    secondary_color: "#333333",
    admin_name: "",
    admin_email: "",
    admin_password: "",
  });

  const fetchTenants = useCallback(async () => {
    try {
      const data = await getTenants();
      setTenants(data || []);
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const resetForm = () => {
    setForm({
      name: "",
      name_ar: "",
      slug: "",
      primary_color: "#000000",
      secondary_color: "#333333",
      admin_name: "",
      admin_email: "",
      admin_password: "",
    });
    setEditingTenant(null);
    setError("");
  };

  const openAddDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setForm({
      name: tenant.name,
      name_ar: tenant.name_ar || "",
      slug: tenant.slug,
      primary_color: tenant.primary_color,
      secondary_color: tenant.secondary_color,
      admin_name: "",
      admin_email: "",
      admin_password: "",
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (editingTenant) {
        await updateTenant(editingTenant.id, {
          name: form.name,
          name_ar: form.name_ar,
          slug: form.slug,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
        });
        
        // Update admin password if provided
        if (form.admin_password) {
          await updateTenantAdminPassword(editingTenant.id, form.admin_password);
        }
      } else {
        await createTenant(form);
      }
      setShowDialog(false);
      resetForm();
      fetchTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleFreeze = async () => {
    if (!showFreezeConfirm) return;
    setSaving(true);
    try {
      await toggleTenantFreeze(showFreezeConfirm.id, showFreezeConfirm.freeze);
      setShowFreezeConfirm(null);
      fetchTenants();
    } catch (err) {
      console.error("Freeze error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    setSaving(true);
    try {
      await deleteTenant(showDeleteConfirm);
      setShowDeleteConfirm(null);
      fetchTenants();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.name_ar && t.name_ar.includes(search))
  );

  const activeCount = tenants.filter((t) => t.is_active).length;
  const frozenCount = tenants.filter((t) => !t.is_active).length;

  return (
    <div className="min-h-screen bg-background">
      <Header title="System Administration" titleAr="إدارة النظام" />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="animate-fade-in">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-foreground/5 flex items-center justify-center">
                <Store className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "إجمالي المطاعم" : "Total Restaurants"}
                </p>
                <p className="text-2xl font-bold">{tenants.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in stagger-1">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "نشطة" : "Active"}
                </p>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in stagger-2">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
                <Snowflake className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "مجمّدة" : "Frozen"}
                </p>
                <p className="text-2xl font-bold text-blue-600">{frozenCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? "بحث عن مطعم..." : "Search restaurants..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rtl:pl-3 rtl:pr-10"
            />
          </div>
          <Button onClick={openAddDialog} size="lg">
            <Plus className="h-4 w-4" />
            {isRTL ? "إضافة مطعم" : "Add Restaurant"}
          </Button>
        </div>

        {/* Table */}
        <Card>
          {loading ? (
            <CardContent className="p-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">
                {isRTL ? "جاري التحميل..." : "Loading..."}
              </p>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="p-12 text-center">
              <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {isRTL ? "لا توجد مطاعم" : "No restaurants found"}
              </p>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "المطعم" : "Restaurant"}</TableHead>
                  <TableHead>{isRTL ? "النطاق الفرعي" : "Subdomain"}</TableHead>
                  <TableHead>{isRTL ? "الألوان" : "Colors"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right rtl:text-left">{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tenant, i) => (
                  <TableRow key={tenant.id} className={`animate-fade-in stagger-${Math.min(i + 1, 5)}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        {tenant.name_ar && (
                          <p className="text-sm text-muted-foreground font-cairo">{tenant.name_ar}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs bg-muted px-2 py-1 rounded-md">
                          {tenant.slug}.forkly.cloud
                        </code>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                          style={{ backgroundColor: tenant.primary_color }}
                          title="Primary"
                        />
                        <div
                          className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                          style={{ backgroundColor: tenant.secondary_color }}
                          title="Secondary"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.is_active ? "success" : "info"}>
                        {tenant.is_active
                          ? isRTL ? "نشط" : "Active"
                          : isRTL ? "مجمّد" : "Frozen"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end rtl:justify-start gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditDialog(tenant)}
                          title={isRTL ? "تعديل" : "Edit"}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setShowFreezeConfirm({
                              id: tenant.id,
                              freeze: tenant.is_active,
                            })
                          }
                          title={tenant.is_active ? (isRTL ? "تجميد" : "Freeze") : (isRTL ? "إلغاء التجميد" : "Unfreeze")}
                        >
                          {tenant.is_active ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setShowDeleteConfirm(tenant.id)}
                          title={isRTL ? "حذف" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)} className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingTenant
                ? isRTL ? "تعديل المطعم" : "Edit Restaurant"
                : isRTL ? "إضافة مطعم جديد" : "Add New Restaurant"}
            </DialogTitle>
            <DialogDescription>
              {editingTenant
                ? isRTL ? "تعديل بيانات المطعم" : "Update restaurant details"
                : isRTL ? "أدخل بيانات المطعم الجديد" : "Enter the new restaurant details"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "اسم المطعم (EN)" : "Restaurant Name"}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Saj Restaurant"
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "اسم المطعم (AR)" : "Restaurant Name (Arabic)"}</Label>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                  placeholder="مثلاً: مطعم ساج"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "النطاق الفرعي" : "Subdomain"}</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  required
                  placeholder="saj"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  .forkly.cloud
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "اللون الأساسي" : "Primary Color"}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "اللون الفرعي" : "Secondary Color"}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondary_color}
                    onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <Input
                    value={form.secondary_color}
                    onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">
                {isRTL ? "بيانات مدير المطعم" : "Restaurant Admin Credentials"}
              </p>
            </div>
            {!editingTenant && (
              <>
                <div className="space-y-2">
                  <Label>{isRTL ? "اسم المدير" : "Admin Full Name"}</Label>
                  <Input
                    value={form.admin_name}
                    onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                    required={!editingTenant}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "البريد الإلكتروني" : "Admin Email"}</Label>
                  <Input
                    type="email"
                    value={form.admin_email}
                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                    required={!editingTenant}
                    placeholder="admin@restaurant.com"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>
                {isRTL ? "كلمة المرور" : "Password"}
                {editingTenant && (
                  <span className="text-muted-foreground text-xs ml-2 rtl:mr-2">
                    ({isRTL ? "اتركه فارغاً إذا لم ترد تغييره" : "leave blank to keep current"})
                  </span>
                )}
              </Label>
              <Input
                type="password"
                value={form.admin_password}
                onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                required={!editingTenant}
                minLength={6}
                placeholder={editingTenant ? "••••••••" : "••••••••"}
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                {isRTL ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" isLoading={saving}>
                {editingTenant
                  ? isRTL ? "حفظ التغييرات" : "Save Changes"
                  : isRTL ? "إضافة المطعم" : "Add Restaurant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Freeze Confirm Dialog */}
      <Dialog
        open={!!showFreezeConfirm}
        onOpenChange={() => setShowFreezeConfirm(null)}
      >
        <DialogContent onClose={() => setShowFreezeConfirm(null)}>
          <DialogHeader>
            <DialogTitle>
              {showFreezeConfirm?.freeze
                ? isRTL ? "تجميد المطعم" : "Freeze Restaurant"
                : isRTL ? "إلغاء تجميد المطعم" : "Unfreeze Restaurant"}
            </DialogTitle>
            <DialogDescription>
              {showFreezeConfirm?.freeze
                ? isRTL
                  ? "سيفقد جميع مستخدمي هذا المطعم صلاحياتهم. هل أنت متأكد؟"
                  : "All users of this restaurant will lose access. Are you sure?"
                : isRTL
                  ? "سيتم إعادة تفعيل المطعم وجميع مستخدميه."
                  : "The restaurant and all its users will be reactivated."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFreezeConfirm(null)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant={showFreezeConfirm?.freeze ? "destructive" : "default"}
              onClick={handleFreeze}
              isLoading={saving}
            >
              {showFreezeConfirm?.freeze
                ? isRTL ? "تجميد" : "Freeze"
                : isRTL ? "إلغاء التجميد" : "Unfreeze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!showDeleteConfirm}
        onOpenChange={() => setShowDeleteConfirm(null)}
      >
        <DialogContent onClose={() => setShowDeleteConfirm(null)}>
          <DialogHeader>
            <DialogTitle>{isRTL ? "حذف المطعم" : "Delete Restaurant"}</DialogTitle>
            <DialogDescription>
              {isRTL
                ? "سيتم حذف المطعم وجميع بياناته نهائياً. لا يمكن التراجع عن هذا الإجراء."
                : "This will permanently delete the restaurant and all its data. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={handleDelete} isLoading={saving}>
              {isRTL ? "حذف نهائياً" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
