"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { ShoppingCart, Plus, Minus, Trash2, Send, Search, Package } from "lucide-react";
import { getItems, getCategories, createOrder } from "../../actions";
import type { Item, Category } from "@/types";
import { useRouter } from "next/navigation";

interface CartItem {
  item_id: string;
  item_name: string;
  item_name_ar: string;
  quantity: number;
  unit: string;
  notes: string;
}

export default function NewOrderPage() {
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<(Item & { categories?: { name: string; name_ar: string } })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const tenantId = user?.tenant_id;
  const branchId = user?.branch_id;

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [itemsData, catsData] = await Promise.all([
        getItems(tenantId, filterCat || undefined),
        getCategories(tenantId),
      ]);
      setItems((itemsData || []).filter((i: Item) => i.is_active));
      setCategories(catsData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tenantId, filterCat]);

  useEffect(() => { load(); }, [load]);

  const addToCart = (item: Item) => {
    const existing = cart.find(c => c.item_id === item.id);
    if (existing) {
      setCart(cart.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { item_id: item.id, item_name: item.name, item_name_ar: item.name_ar || item.name, quantity: 1, unit: item.unit, notes: "" }]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.item_id === itemId) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : c;
      }
      return c;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.item_id !== itemId));
  };

  const handleSubmit = async () => {
    if (!tenantId || !branchId || !user || cart.length === 0) return;
    setSubmitting(true);
    try {
      await createOrder({
        tenant_id: tenantId,
        branch_id: branchId,
        created_by: user.id,
        notes: notes || undefined,
        required_date: requiredDate || undefined,
        items: cart,
      });
      setSuccess(true);
      setCart([]);
      setNotes("");
      setTimeout(() => router.push("/dashboard/orders"), 1500);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.name_ar && item.name_ar.includes(search))
  );

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <Send className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold">{isRTL ? "تم إرسال الطلب بنجاح!" : "Order Submitted!"}</h2>
          <p className="text-muted-foreground mt-2">{isRTL ? "جاري التحويل..." : "Redirecting..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="New Order" titleAr="طلب جديد" />
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items Browser */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={isRTL ? "بحث عن مادة..." : "Search items..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rtl:pl-3 rtl:pr-10" />
              </div>
              <Select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                options={[{ value: "", label: isRTL ? "كل الفئات" : "All" }, ...categories.map(c => ({ value: c.id, label: isRTL ? c.name_ar || c.name : c.name }))]}
                className="w-40"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map(item => {
                  const inCart = cart.find(c => c.item_id === item.id);
                  return (
                    <Card
                      key={item.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${inCart ? "ring-2 ring-foreground" : ""}`}
                      onClick={() => addToCart(item)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{isRTL ? item.name_ar || item.name : item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {isRTL ? (item.categories as { name_ar: string })?.name_ar || (item.categories as { name: string })?.name : (item.categories as { name: string })?.name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{item.unit}</span>
                          </div>
                        </div>
                        {inCart ? (
                          <Badge>{inCart.quantity}</Badge>
                        ) : (
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  <h3 className="font-semibold">{isRTL ? "سلة الطلب" : "Order Cart"}</h3>
                  <Badge variant="secondary" className="ml-auto rtl:ml-0 rtl:mr-auto">{cart.length}</Badge>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{isRTL ? "اختر المواد المراد طلبها" : "Select items to order"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.item_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{isRTL ? item.item_name_ar : item.item_name}</p>
                          <p className="text-xs text-muted-foreground">{item.unit}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.item_id, -1)} className="w-7 h-7 rounded-md bg-background border flex items-center justify-center hover:bg-accent">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.item_id, 1)} className="w-7 h-7 rounded-md bg-background border flex items-center justify-center hover:bg-accent">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(item.item_id)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    <Label className="text-xs">{isRTL ? "التاريخ المطلوب" : "Required Date"}</Label>
                    <Input type="date" value={requiredDate} onChange={e => setRequiredDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{isRTL ? "ملاحظات" : "Notes"}</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={isRTL ? "ملاحظات إضافية..." : "Additional notes..."} className="min-h-[60px]" />
                  </div>
                </div>

                <Button className="w-full" size="lg" disabled={cart.length === 0} isLoading={submitting} onClick={handleSubmit}>
                  <Send className="h-4 w-4" />
                  {isRTL ? `إرسال الطلب (${cart.length})` : `Submit Order (${cart.length})`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
