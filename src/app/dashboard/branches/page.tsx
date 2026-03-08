"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { Plus, Pencil, Trash2, GitBranch, MapPin, Phone } from "lucide-react";
import { getBranches, createBranch, updateBranch, deleteBranch } from "../actions";
import type { Branch } from "@/types";

export default function BranchesPage() {
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", name_ar: "", address: "", phone: "" });

  const tenantId = user?.tenant_id;

  const load = useCallback(async () => {
    if (!tenantId) return;
    try { setBranches(await getBranches(tenantId) || []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ name: "", name_ar: "", address: "", phone: "" }); setShowDialog(true); };
  const openEdit = (b: Branch) => { setEditing(b); setForm({ name: b.name, name_ar: b.name_ar || "", address: b.address || "", phone: b.phone || "" }); setShowDialog(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!tenantId) return; setSaving(true);
    try {
      if (editing) { await updateBranch(editing.id, form); }
      else { await createBranch({ ...form, tenant_id: tenantId }); }
      setShowDialog(false); load();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return; setSaving(true);
    try { await deleteBranch(deleteId); setDeleteId(null); load(); }
    catch (err) { console.error(err); } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Branches" titleAr="الفروع" />
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">{branches.length} {isRTL ? "فرع" : "branches"}</p>
          <Button onClick={openAdd}><Plus className="h-4 w-4" />{isRTL ? "إضافة فرع" : "Add Branch"}</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
        ) : branches.length === 0 ? (
          <Card><CardContent className="p-12 text-center"><GitBranch className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">{isRTL ? "لا توجد فروع" : "No branches"}</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b, i) => (
              <Card key={b.id} className={`animate-fade-in stagger-${Math.min(i+1,5)} hover:shadow-md transition-shadow`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{b.name}</h3>
                      {b.name_ar && <p className="text-sm text-muted-foreground font-cairo">{b.name_ar}</p>}
                    </div>
                    <Badge variant={b.is_active ? "success" : "secondary"}>{b.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}</Badge>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {b.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{b.address}</div>}
                    {b.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{b.phone}</div>}
                  </div>
                  <div className="flex gap-1 mt-4 pt-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Pencil className="h-4 w-4 mr-1" />{isRTL ? "تعديل" : "Edit"}</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(b.id)}><Trash2 className="h-4 w-4 mr-1" />{isRTL ? "حذف" : "Delete"}</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent onClose={() => setShowDialog(false)}>
          <DialogHeader><DialogTitle>{editing ? (isRTL ? "تعديل الفرع" : "Edit Branch") : (isRTL ? "إضافة فرع" : "Add Branch")}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{isRTL ? "الاسم (EN)" : "Name"}</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="space-y-2"><Label>{isRTL ? "الاسم (AR)" : "Name (Arabic)"}</Label><Input value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} dir="rtl" /></div>
            </div>
            <div className="space-y-2"><Label>{isRTL ? "العنوان" : "Address"}</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            <div className="space-y-2"><Label>{isRTL ? "الهاتف" : "Phone"}</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" isLoading={saving}>{isRTL ? "حفظ" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent onClose={() => setDeleteId(null)}>
          <DialogHeader><DialogTitle>{isRTL ? "حذف الفرع" : "Delete Branch"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{isRTL ? "سيتم حذف هذا الفرع وجميع بياناته." : "This branch and all its data will be deleted."}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={handleDelete} isLoading={saving}>{isRTL ? "حذف" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
