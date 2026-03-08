"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { BarChart3, Package, TrendingUp, ArrowLeft, ArrowRight } from "lucide-react";
import { getOrderReport, getBranches } from "../actions";
import type { Branch } from "@/types";

interface ReportOrder {
  id: string; order_number: string; status: string; created_at: string;
  branches: { name: string; name_ar: string | null; id: string } | null;
  order_items: { item_name: string; item_name_ar: string | null; quantity: number; unit: string | null }[];
}

const FULFILLED_STATUSES = ["accepted", "ready", "delivered"];

export default function ReportsPage() {
  const { isRTL } = useLocale();
  const { user } = useAuth();
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Drill-down state
  const [drillBranch, setDrillBranch] = useState<{ id: string; name: string; nameAr: string } | null>(null);

  const tenantId = user?.tenant_id;

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const filters: { branch_id?: string; date_from?: string; date_to?: string } = {};
      if (filterBranch) filters.branch_id = filterBranch;
      if (user?.role === "branch_manager" && user.branch_id) filters.branch_id = user.branch_id;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      const [o, b] = await Promise.all([getOrderReport(tenantId, filters), getBranches(tenantId)]);
      setOrders((o || []) as unknown as ReportOrder[]);
      setBranches(b || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tenantId, filterBranch, dateFrom, dateTo, user]);

  useEffect(() => { load(); }, [load]);

  // Aggregate items — exclude rejected orders
  const getItemTotals = (orderList: ReportOrder[]) => {
    const totals: Record<string, { name: string; nameAr: string; qty: number; unit: string; orderCount: number }> = {};
    orderList
      .filter(o => FULFILLED_STATUSES.includes(o.status))
      .forEach(o => o.order_items?.forEach(i => {
        const key = i.item_name;
        if (!totals[key]) totals[key] = { name: i.item_name, nameAr: i.item_name_ar || i.item_name, qty: 0, unit: i.unit || "", orderCount: 0 };
        totals[key].qty += i.quantity;
        totals[key].orderCount += 1;
      }));
    return Object.values(totals).sort((a, b) => b.qty - a.qty);
  };

  const topItems = getItemTotals(orders);

  // Aggregate by branch
  const branchTotals: Record<string, { id: string; name: string; nameAr: string; count: number }> = {};
  orders.forEach(o => {
    const bName = o.branches?.name || "—";
    if (!branchTotals[bName]) branchTotals[bName] = {
      id: o.branches?.id || bName,
      name: bName,
      nameAr: o.branches?.name_ar || bName,
      count: 0,
    };
    branchTotals[bName].count += 1;
  });

  // Drill-down: items for selected branch
  const drillOrders = drillBranch
    ? orders.filter(o => o.branches?.id === drillBranch.id || o.branches?.name === drillBranch.name)
    : [];
  const drillItems = getItemTotals(drillOrders);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Reports" titleAr="التقارير" />
      <div className="p-6 lg:p-8 space-y-6">

        {/* Drill-down view */}
        {drillBranch ? (
          <>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setDrillBranch(null)}>
                {isRTL ? <ArrowRight className="h-4 w-4 ml-1" /> : <ArrowLeft className="h-4 w-4 mr-1" />}
                {isRTL ? "رجوع" : "Back"}
              </Button>
              <h2 className="text-lg font-bold">
                {isRTL ? `تقرير مواد: ${drillBranch.nameAr}` : `Items Report: ${drillBranch.name}`}
              </h2>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? "المواد المطلوبة" : "Requested Items"}</CardTitle>
              </CardHeader>
              <CardContent>
                {drillItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{isRTL ? "لا توجد مواد مقبولة لهذا الفرع" : "No fulfilled items for this branch"}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isRTL ? "المادة" : "Item"}</TableHead>
                        <TableHead>{isRTL ? "الكمية الإجمالية" : "Total Qty"}</TableHead>
                        <TableHead>{isRTL ? "عدد الطلبات" : "Orders"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drillItems.map(item => (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium">{isRTL ? item.nameAr : item.name}</TableCell>
                          <TableCell className="font-mono">{item.qty} {item.unit}</TableCell>
                          <TableCell>{item.orderCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              {user?.role !== "branch_manager" && (
                <div className="space-y-1">
                  <Label className="text-xs">{isRTL ? "الفرع" : "Branch"}</Label>
                  <Select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                    options={[{ value: "", label: isRTL ? "الكل" : "All" }, ...branches.map(b => ({ value: b.id, label: isRTL ? b.name_ar || b.name : b.name }))]}
                    className="w-44" />
                </div>
              )}
              <div className="space-y-1"><Label className="text-xs">{isRTL ? "من" : "From"}</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
              <div className="space-y-1"><Label className="text-xs">{isRTL ? "إلى" : "To"}</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="animate-fade-in">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center"><BarChart3 className="h-6 w-6 text-blue-600" /></div>
                  <div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الطلبات" : "Total Orders"}</p><p className="text-2xl font-bold">{orders.length}</p></div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in stagger-1">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center"><Package className="h-6 w-6 text-purple-600" /></div>
                  <div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي العناصر" : "Total Items"}</p><p className="text-2xl font-bold">{topItems.length}</p></div>
                </CardContent>
              </Card>
              <Card className="animate-fade-in stagger-2">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-emerald-600" /></div>
                  <div><p className="text-sm text-muted-foreground">{isRTL ? "الفروع" : "Branches"}</p><p className="text-2xl font-bold">{Object.keys(branchTotals).length}</p></div>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Items */}
                <Card>
                  <CardHeader><CardTitle>{isRTL ? "أكثر المواد طلباً" : "Top Items"}</CardTitle></CardHeader>
                  <CardContent>
                    {topItems.length === 0 ? <p className="text-muted-foreground text-sm">{isRTL ? "لا توجد بيانات" : "No data"}</p> : (
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>{isRTL ? "المادة" : "Item"}</TableHead>
                          <TableHead>{isRTL ? "الكمية" : "Quantity"}</TableHead>
                          <TableHead>{isRTL ? "الطلبات" : "Orders"}</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {topItems.slice(0, 15).map(item => (
                            <TableRow key={item.name}>
                              <TableCell className="font-medium">{isRTL ? item.nameAr : item.name}</TableCell>
                              <TableCell className="font-mono">{item.qty} {item.unit}</TableCell>
                              <TableCell>{item.orderCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* By Branch — clickable */}
                <Card>
                  <CardHeader>
                    <CardTitle>{isRTL ? "حسب الفرع" : "By Branch"}</CardTitle>
                    <p className="text-xs text-muted-foreground">{isRTL ? "اضغط على اسم الفرع لعرض تفاصيل موادّه" : "Click a branch to see its item details"}</p>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(branchTotals).length === 0 ? <p className="text-muted-foreground text-sm">{isRTL ? "لا توجد بيانات" : "No data"}</p> : (
                      <div className="space-y-3">
                        {Object.values(branchTotals).sort((a, b) => b.count - a.count).map(b => (
                          <button
                            key={b.name}
                            onClick={() => setDrillBranch({ id: b.id, name: b.name, nameAr: b.nameAr })}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                          >
                            <span className="font-medium text-blue-600 group-hover:underline">{isRTL ? b.nameAr : b.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">{b.count} {isRTL ? "طلب" : "orders"}</span>
                              {isRTL ? <ArrowLeft className="h-4 w-4 text-muted-foreground" /> : <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
