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
import { Plus, Pencil, Trash2, Search, FolderTree, GripVertical } from "lucide-react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "../actions";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", name_ar: "", sort_order: 0 });

  const tenantId = user?.tenant_id;

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await getCategories(tenantId);
      setCategories(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", name_ar: "", sort_order: categories.length });
    setShowDialog(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, name_ar: cat.name_ar || "", sort_order: cat.sort_order });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, form);
      } else {
        await createCategory({ ...form, tenant_id: tenantId });
      }
      setShowDialog(false);
      load();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteCategory(deleteId);
      setDeleteId(null);
      load();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.name_ar && c.name_ar.includes(search))
  );

  return (
    <div className="min-h-screen bg-background">
      <Header title="Categories" titleAr="الفئات" />
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={isRTL ? "بحث..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rtl:pl-3 rtl:pr-10" />
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4" />{isRTL ? "إضافة فئة" : "Add Category"}</Button>
        </div>

        <Card>
          {loading ? (
            <CardContent className="p-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin mx-auto" />
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="p-12 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{isRTL ? "لا توجد فئات" : "No categories found"}</p>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right rtl:text-left">{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((cat, i) => (
                  <TableRow key={cat.id} className="animate-fade-in">
                    <TableCell><GripVertical className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="font-cairo">{cat.name_ar}</TableCell>
                    <TableCell>
                      <Badge variant={cat.is_active ? "success" : "secondary"}>
                        {cat.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end rtl:justify-start gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleteId(cat.id)}><Trash2 className="h-4 w-4" /></Button>
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
        <DialogContent onClose={() => setShowDialog(false)}>
          <DialogHeader>
            <DialogTitle>{editing ? (isRTL ? "تعديل الفئة" : "Edit Category") : (isRTL ? "إضافة فئة" : "Add Category")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم (EN)" : "Name"}</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Chicken" />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الاسم (AR)" : "Name (Arabic)"}</Label>
              <Input value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} placeholder="مثلاً: دجاج" dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الترتيب" : "Sort Order"}</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value) || 0})} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
              <Button type="submit" isLoading={saving}>{isRTL ? "حفظ" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent onClose={() => setDeleteId(null)}>
          <DialogHeader><DialogTitle>{isRTL ? "حذف الفئة" : "Delete Category"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{isRTL ? "سيتم حذف هذه الفئة نهائياً." : "This category will be permanently deleted."}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={handleDelete} isLoading={saving}>{isRTL ? "حذف" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
