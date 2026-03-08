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
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { getItems, createItem, updateItem, deleteItem, getCategories } from "../actions";
import type { Item, Category } from "@/types";

export default function ItemsPage() {
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const [items, setItems] = useState<(Item & { categories?: { name: string; name_ar: string } })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", name_ar: "", category_id: "", sku: "", unit: "kg" });

  const tenantId = user?.tenant_id;

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [itemsData, catsData] = await Promise.all([
        getItems(tenantId, filterCat || undefined),
        getCategories(tenantId),
      ]);
      setItems(itemsData || []);
      setCategories(catsData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tenantId, filterCat]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", name_ar: "", category_id: categories[0]?.id || "", sku: "", unit: "kg" });
    setShowDialog(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({ name: item.name, name_ar: item.name_ar || "", category_id: item.category_id || "", sku: item.sku || "", unit: item.unit });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      if (editing) {
        await updateItem(editing.id, form);
      } else {
        await createItem({ ...form, tenant_id: tenantId });
      }
      setShowDialog(false);
      load();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try { await deleteItem(deleteId); setDeleteId(null); load(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.name_ar && item.name_ar.includes(search)) ||
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const unitOptions = [
    { value: "kg", label: isRTL ? "كغ" : "kg" },
    { value: "g", label: isRTL ? "غرام" : "g" },
    { value: "liter", label: isRTL ? "لتر" : "liter" },
    { value: "pcs", label: isRTL ? "قطعة" : "pcs" },
    { value: "box", label: isRTL ? "صندوق" : "box" },
    { value: "pack", label: isRTL ? "عبوة" : "pack" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header title="Items" titleAr="المواد" />
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={isRTL ? "بحث..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rtl:pl-3 rtl:pr-10" />
            </div>
            <Select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              options={[{ value: "", label: isRTL ? "كل الفئات" : "All Categories" }, ...categories.map(c => ({ value: c.id, label: isRTL ? c.name_ar || c.name : c.name }))]}
              className="w-48"
            />
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4" />{isRTL ? "إضافة مادة" : "Add Item"}</Button>
        </div>

        <Card>
          {loading ? (
            <CardContent className="p-12 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin mx-auto" />
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{isRTL ? "لا توجد مواد" : "No items found"}</p>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{isRTL ? "الفئة" : "Category"}</TableHead>
                  <TableHead>{isRTL ? "الرمز" : "SKU"}</TableHead>
                  <TableHead>{isRTL ? "الوحدة" : "Unit"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead className="text-right rtl:text-left">{isRTL ? "إجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id} className="animate-fade-in">
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.name_ar && <p className="text-sm text-muted-foreground font-cairo">{item.name_ar}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {isRTL ? (item.categories as { name_ar: string })?.name_ar || (item.categories as { name: string })?.name : (item.categories as { name: string })?.name || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.sku || "—"}</code></TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "success" : "secondary"}>
                        {item.is_active ? (isRTL ? "نشط" : "Active") : (isRTL ? "غير نشط" : "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end rtl:justify-start gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editing ? (isRTL ? "تعديل المادة" : "Edit Item") : (isRTL ? "إضافة مادة" : "Add Item")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم (EN)" : "Name"}</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Chicken Breast" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الاسم (AR)" : "Name (Arabic)"}</Label>
                <Input value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} placeholder="مثلاً: صدور دجاج" dir="rtl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "الفئة" : "Category"}</Label>
              <Select
                value={form.category_id}
                onChange={e => setForm({...form, category_id: e.target.value})}
                options={categories.map(c => ({ value: c.id, label: isRTL ? c.name_ar || c.name : c.name }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? "الرمز (SKU)" : "SKU"}</Label>
                <Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="CHK-001" />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "الوحدة" : "Unit"}</Label>
                <Select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} options={unitOptions} />
              </div>
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
          <DialogHeader><DialogTitle>{isRTL ? "حذف المادة" : "Delete Item"}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{isRTL ? "سيتم حذف هذه المادة نهائياً." : "This item will be permanently deleted."}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{isRTL ? "إلغاء" : "Cancel"}</Button>
            <Button variant="destructive" onClick={handleDelete} isLoading={saving}>{isRTL ? "حذف" : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
