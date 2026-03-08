"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { ChefHat, Clock, CheckCircle2, XCircle, Package, Printer, ArrowRight } from "lucide-react";
import { getOrders, updateOrderStatus, getBranches } from "../actions";
import type { Branch } from "@/types";
import { formatDateTime } from "@/lib/utils";

interface OrderWithRelations {
  id: string;
  order_number: string;
  branch_id: string;
  status: string;
  notes: string | null;
  required_date: string | null;
  created_at: string;
  branches: { name: string; name_ar: string | null } | null;
  profiles: { full_name: string; full_name_ar: string | null } | null;
  order_items: { id: string; item_name: string; item_name_ar: string | null; quantity: number; unit: string | null; notes: string | null }[];
}

const statusFlow: Record<string, string[]> = {
  new: ["accepted", "rejected"],
  accepted: ["ready"],
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500",
  accepted: "bg-green-500",
  rejected: "bg-red-500",
  ready: "bg-purple-500",
  delivered: "bg-emerald-500",
};

const statusLabels: Record<string, { en: string; ar: string }> = {
  new: { en: "New", ar: "جديد" },
  accepted: { en: "Accepted", ar: "مقبول" },
  rejected: { en: "Rejected", ar: "مرفوض" },
  ready: { en: "Ready", ar: "جاهز" },
  delivered: { en: "Delivered", ar: "تم التسليم" },
};

export default function KitchenPage() {
  const { isRTL, locale } = useLocale();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("new");
  const [filterBranch, setFilterBranch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const tenantId = user?.tenant_id;

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [ordersData, branchesData] = await Promise.all([
        getOrders(tenantId, { status: filterStatus || undefined, branch_id: filterBranch || undefined }),
        getBranches(tenantId),
      ]);
      setOrders((ordersData || []) as unknown as OrderWithRelations[]);
      setBranches(branchesData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tenantId, filterStatus, filterBranch]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      load();
    } catch (err) { console.error(err); }
    finally { setUpdating(null); }
  };

  const counts = {
    new: orders.filter(o => o.status === "new").length,
    accepted: orders.filter(o => o.status === "accepted").length,
    ready: orders.filter(o => o.status === "ready").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Kitchen Dashboard" titleAr="لوحة المطبخ" />
      <div className="p-6 lg:p-8 space-y-6">
        {/* Stat pills */}
        <div className="flex flex-wrap gap-3">
          {[
            { key: "new", label: isRTL ? "جديدة" : "New", count: orders.filter(o => o.status === "new").length, color: "bg-blue-500" },
            { key: "accepted", label: isRTL ? "مقبولة" : "Accepted", count: orders.filter(o => o.status === "accepted").length, color: "bg-green-500" },
            { key: "ready", label: isRTL ? "جاهزة" : "Ready", count: orders.filter(o => o.status === "ready").length, color: "bg-purple-500" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterStatus === s.key ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${s.color} mr-2 rtl:mr-0 rtl:ml-2`} />
              {s.label} ({s.count})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            options={[
              { value: "", label: isRTL ? "كل الحالات" : "All Statuses" },
              { value: "new", label: isRTL ? "جديد" : "New" },
              { value: "accepted", label: isRTL ? "مقبول" : "Accepted" },
              { value: "rejected", label: isRTL ? "مرفوض" : "Rejected" },
              { value: "ready", label: isRTL ? "جاهز" : "Ready" },
            ]}
            className="w-48"
          />
          <Select
            value={filterBranch}
            onChange={e => setFilterBranch(e.target.value)}
            options={[
              { value: "", label: isRTL ? "كل الفروع" : "All Branches" },
              ...branches.map(b => ({ value: b.id, label: isRTL ? b.name_ar || b.name : b.name })),
            ]}
            className="w-48"
          />
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ChefHat className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">{isRTL ? "لا توجد طلبات" : "No orders found"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((order, i) => (
              <Card key={order.id} className={`animate-fade-in stagger-${Math.min(i + 1, 5)} hover:shadow-md transition-shadow`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      <code className="text-xs bg-muted px-2 py-1 rounded mr-2 rtl:mr-0 rtl:ml-2">{order.order_number}</code>
                    </CardTitle>
                    <Badge className={`${statusColors[order.status]} text-white border-0`}>
                      {isRTL ? statusLabels[order.status]?.ar : statusLabels[order.status]?.en}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">
                      {isRTL ? order.branches?.name_ar || order.branches?.name : order.branches?.name}
                    </span>
                    <span>•</span>
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDateTime(order.created_at, locale)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Items */}
                  <div className="space-y-1.5">
                    {order.order_items?.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-dashed last:border-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{isRTL ? item.item_name_ar || item.item_name : item.item_name}</span>
                        </div>
                        <span className="font-mono font-medium">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{order.notes}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {statusFlow[order.status]?.map(nextStatus => (
                      <Button
                        key={nextStatus}
                        size="sm"
                        variant={nextStatus === "rejected" ? "destructive" : "default"}
                        className="flex-1"
                        isLoading={updating === order.id}
                        onClick={() => handleStatusUpdate(order.id, nextStatus)}
                      >
                        {nextStatus === "rejected" ? <XCircle className="h-4 w-4" /> : nextStatus === "accepted" ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                        {isRTL ? statusLabels[nextStatus]?.ar : statusLabels[nextStatus]?.en}
                      </Button>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => window.print()}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
