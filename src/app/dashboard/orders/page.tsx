"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { ClipboardList, Package, Clock } from "lucide-react";
import { getOrders, getBranches } from "../actions";
import type { Branch } from "@/types";
import { formatDateTime } from "@/lib/utils";

interface OrderWithRelations {
  id: string; order_number: string; branch_id: string; status: string; notes: string | null;
  required_date: string | null; created_at: string;
  branches: { name: string; name_ar: string | null } | null;
  profiles: { full_name: string; full_name_ar: string | null } | null;
  order_items: { id: string; item_name: string; item_name_ar: string | null; quantity: number; unit: string | null }[];
}

const statusLabels: Record<string, { en: string; ar: string }> = {
  new: { en: "New", ar: "جديد" }, accepted: { en: "Accepted", ar: "مقبول" },
  rejected: { en: "Rejected", ar: "مرفوض" }, preparing: { en: "Preparing", ar: "قيد التحضير" },
  ready: { en: "Ready", ar: "جاهز" }, delivered: { en: "Delivered", ar: "تم التسليم" },
  cancelled: { en: "Cancelled", ar: "ملغي" },
};

const statusVariant: Record<string, "info" | "success" | "warning" | "destructive" | "secondary"> = {
  new: "info", accepted: "success", rejected: "destructive", preparing: "warning",
  ready: "info", delivered: "success", cancelled: "secondary",
};

export default function OrdersPage() {
  const { isRTL, locale } = useLocale();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tenantId = user?.tenant_id;

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const filters: { status?: string; branch_id?: string } = {};
      if (filterStatus) filters.status = filterStatus;
      if (filterBranch) filters.branch_id = filterBranch;
      if (user?.role === "branch_manager" && user.branch_id) filters.branch_id = user.branch_id;
      const [o, b] = await Promise.all([getOrders(tenantId, filters), getBranches(tenantId)]);
      setOrders((o || []) as unknown as OrderWithRelations[]);
      setBranches(b || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tenantId, filterStatus, filterBranch, user]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Order History" titleAr="سجل الطلبات" />
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-wrap gap-3">
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            options={[{ value: "", label: isRTL ? "كل الحالات" : "All" }, ...Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: isRTL ? v.ar : v.en }))]}
            className="w-44" />
          {user?.role !== "branch_manager" && (
            <Select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
              options={[{ value: "", label: isRTL ? "كل الفروع" : "All Branches" }, ...branches.map(b => ({ value: b.id, label: isRTL ? b.name_ar || b.name : b.name }))]}
              className="w-44" />
          )}
        </div>

        <Card>
          {loading ? (
            <CardContent className="p-12 text-center"><div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin mx-auto" /></CardContent>
          ) : orders.length === 0 ? (
            <CardContent className="p-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{isRTL ? "لا توجد طلبات" : "No orders found"}</p>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "رقم الطلب" : "Order #"}</TableHead>
                  <TableHead>{isRTL ? "الفرع" : "Branch"}</TableHead>
                  <TableHead>{isRTL ? "العناصر" : "Items"}</TableHead>
                  <TableHead>{isRTL ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "التاريخ" : "Date"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <React.Fragment key={order.id}>
                    <TableRow className="cursor-pointer animate-fade-in" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                      <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{order.order_number}</code></TableCell>
                      <TableCell className="font-medium">{isRTL ? order.branches?.name_ar || order.branches?.name : order.branches?.name}</TableCell>
                      <TableCell><Badge variant="outline">{order.order_items?.length || 0} {isRTL ? "عناصر" : "items"}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant[order.status]}>{isRTL ? statusLabels[order.status]?.ar : statusLabels[order.status]?.en}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm"><div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatDateTime(order.created_at, locale)}</div></TableCell>
                    </TableRow>
                    {expandedId === order.id && (
                      <TableRow key={`${order.id}-detail`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <div className="space-y-2">
                            {order.order_items?.map(item => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2"><Package className="h-3.5 w-3.5 text-muted-foreground" /><span>{isRTL ? item.item_name_ar || item.item_name : item.item_name}</span></div>
                                <span className="font-mono">{item.quantity} {item.unit}</span>
                              </div>
                            ))}
                            {order.notes && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">{isRTL ? "ملاحظات:" : "Notes:"} {order.notes}</p>}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
