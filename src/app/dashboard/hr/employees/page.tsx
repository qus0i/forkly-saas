"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { Plus, Pencil, Trash2, Search, Users, UserCheck, UserX } from "lucide-react";
import { getProfiles, createProfile, updateProfile, deleteProfile, getBranches } from "../../actions";
import type { Branch } from "@/types";

interface ProfileWithBranch {
  id: string; email: string; full_name: string; full_name_ar: string | null;
  role: string; branch_id: string | null; is_active: boolean; created_at: string;
  branches: { name: string; name_ar: string | null } | null;
}

export default function EmployeesPage() {
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<ProfileWithBranch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<ProfileWithBranch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ full_name: "", full_name_ar: "", email: "", password: "", role: "employee", branch_id: "" });

  const tenantId = user?.tenant_id;

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [emps, brs] = await Promise.all([getProfiles(tenantId), getBranches(tenantId)]);
      setEmployees((emps || []).filter((p: { role: string }) => p.role !== "system_admin") as unknown as ProfileWithBranch[]);
      setBranches(brs || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const roleOptions = [
    { value: "restaurant_admin", label: isRTL ? "مدير المطعم" : "Restaurant Admin" },
    { value: "kitchen_manager", label: isRTL ? "مدير المشغل" : "Kitchen Manager" },
    { value: "branch_manager", label: isRTL ? "مدير الفرع" : "Branch Manager" },
    { value: "hr_manager", label: isRTL ? "مدير الموارد البشرية" : "HR Manager" },
    { value: "employee", label: isRTL ? "موظف" : "Employee" },
  ];

  const openAdd = () => { setEditing(null); setError(""); setForm({ full_name: "", full_name_ar: "", email: "", password: "", role: "employee", branch_id: "" }); setShowDialog(true); };
  const openEdit = (e: ProfileWithBranch) => { setEditing(e); setError(""); setForm({ full_name: e.full_name, full_name_ar: e.full_name_ar || "", email: e.email, password: "", role: e.role, branch_id: e.branch_id || "" }); setShowDialog(true); };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); if (!tenantId) return; setSaving(true); setError("");
    try {
      if (editing) {
        await updateProfile(editing.id, { full_name: form.full_name, full_name_ar: form.full_name_ar, role: form.role, branch_id: form.branch_id || null });
      } else {
        await createProfile({ tenant_id: tenantId, email: form.email, password: form.password, full_name: form.full_name, full_name_ar: form.full_name_ar, role: form.role, branch_id: form.branch_id || undefined });
      }
      setShowDialog(false); load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return; setSaving(true);
    try { await deleteProfile(deleteId); setDeleteId(null); load(); }
    catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try { await updateProfile(id, { is_active: !isActive }); load(); }
    catch (err) { console.error(err); }
  };

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.full_name_ar && e.full_name_ar.includes(search))
  );

  const activeCount = employees.filter(e => e.is_active).length;

  return (
    <div className="min-h-screen bg-background">
      <Header title="Employees" titleAr="الموظفون" />
      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="animate-fade-in"><CardContent className="p-5 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-foreground/5 flex items-center justify-center"><Users className="h-6 w-6" /></div><div><p className="text-sm text-muted-foreground">{isRTL ? "الإجمالي" : "Total"}</p><p className="text-2xl font-bold">{employees.length}</p></div></CardContent></Card>
          <Card className="animate-fade-in stagger-1"><CardContent className="p-5 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center"><UserCheck className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-muted-foreground">{isRTL ? "نشط" : "Active"}</p><p className="text-2xl font-bold text-green-600">{activeCount}</p></div></CardContent></Card>
          <Card className="animate-fade-in stagger-2"><CardContent className="p-5 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center"><UserX className="h-6 w-6 text-red-600" /></div><div><p className="text-sm text-muted-foreground">{isRTL ? "مجمّد" : "Frozen"}</p><p className="text-2xl font-bold text-red-600">{employees.length - activeCount}</p></div></CardContent></Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:w-80"><Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={isRTL ? "بحث..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rtl:pl-3 rtl:pr-10" /></div>
          <Button onClick={openAdd}><Plus className="h-4 w-4" />{isRTL ? "إضافة موظف" : "Add Employee"}</Button>
        </div>

        <Card>
          {loading ? (<CardContent className="p-12 text-center"><div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin mx-auto" /></CardContent>) : filtered.length === 0 ? (<CardContent className="p-12 text-center"><Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">{isRTL ? "لا يوجد موظفون" : "No employees"}</p></CardContent>) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                <TableHead>{isRTL ? "البريد" : "Email"}</TableHead>
                <TableHead>{isRTL ? "الدور" : "Role"}</TableHead>
                <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-right rtl:text-left">{isRTL ? "إجراءات" : "Actions"}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(emp => (
                  <TableRow key={emp.id} className="animate-fade-in">
                    <TableCell><div><p className="font-medium">{emp.full_name}</p>{emp.full_name_ar && <p className="text-sm text-muted-foreground font-cairo">{emp.full_name_ar}</p>}</div></TableCell>
                    <TableCell className="text-sm">{emp.email}</TableCell>
                    <TableCell><Badge variant="outline">{roleOptions.find(r => r.value === emp.role)?.label || emp.role}</Badge></TableCell>
                    <TableCell>{isRTL ? emp.branches?.name_ar || emp.branches?.name || "—" : emp.branches?.name || "—"}</TableCell>
                    <TableCell>
                      <button onClick={() => handleToggleActive(emp.id, emp.is_active)}>
                        <Badge variant={emp.is_active ? "success" : "destructive"} className="cursor-pointer">
                          {emp.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "مجمّد" : "Frozen")}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end rtl:justify-start gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleteId(emp.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)} className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? (isRTL ? "تعديل الموظف" : "Edit Employee") : (isRTL ? "إضافة موظف" : "Add Employee")}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "الاسم (EN)" : "Name"}</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
              <div className="space-y-2"><Label>{isRTL ? "الاسم (AR)" : "Name (Arabic)"}</Label><Input value={form.full_name_ar} onChange={e => setForm({...form, full_name_ar: e.target.value})} dir="rtl" /></div>
            </div>
            {!editing && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div className="space-y-2"><Label>{isRTL ? "كلمة المرور" : "Password"}</Label><Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} /></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "الدور" : "Role"}</Label><Select value={form.role} onChange={e => setForm({...form, role: e.target.value})} options={roleOptions} /></div>
              <div className="space-y-2"><Label>{isRTL ? "الفرع" : "Branch"}</Label><Select value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})} options={[{ value: "", label: isRTL ? "بدون فرع" : "No Branch" }, ...branches.map(b => ({ value: b.id, label: isRTL ? b.name_ar || b.name : b.name }))]} /></div>
            </div>
            {error && <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" isLoading={saving}>{isRTL ? "حفظ" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent onClose={() => setDeleteId(null)}>
          <DialogHeader><DialogTitle>{isRTL ? "حذف الموظف" : "Delete Employee"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{isRTL ? "سيتم حذف هذا الموظف نهائياً." : "This employee will be permanently deleted."}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={handleDelete} isLoading={saving}>{isRTL ? "حذف" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
