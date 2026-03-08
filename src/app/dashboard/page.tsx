"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import {
  ShoppingCart,
  Package,
  GitBranch,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";
import { getDashboardStats } from "./actions";
import Link from "next/link";

interface Stats {
  branches: number;
  items: number;
  employees: number;
  newOrders: number;
  todayAttendance: number;
}

export default function DashboardPage() {
  const { isRTL } = useLocale();
  const { user, tenant } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const tenantId = user?.tenant_id;

  const loadStats = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await getDashboardStats(tenantId);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const statCards = [
    {
      title: isRTL ? "الطلبات الجديدة" : "New Orders",
      value: stats?.newOrders ?? "—",
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      href: "/dashboard/orders",
    },
    {
      title: isRTL ? "المواد" : "Items",
      value: stats?.items ?? "—",
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/20",
      href: "/dashboard/items",
    },
    {
      title: isRTL ? "الفروع" : "Branches",
      value: stats?.branches ?? "—",
      icon: GitBranch,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      href: "/dashboard/branches",
    },
    {
      title: isRTL ? "الموظفون" : "Employees",
      value: stats?.employees ?? "—",
      icon: Users,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/20",
      href: "/dashboard/hr/employees",
    },
    {
      title: isRTL ? "التقارير" : "Reports",
      value: "↗",
      icon: TrendingUp,
      color: "text-pink-600",
      bg: "bg-pink-50 dark:bg-pink-950/20",
      href: "/dashboard/reports",
    },
    {
      title: isRTL ? "الحضور اليوم" : "Today's Attendance",
      value: stats?.todayAttendance ?? "—",
      icon: Clock,
      color: "text-cyan-600",
      bg: "bg-cyan-50 dark:bg-cyan-950/20",
      href: "/dashboard/hr/attendance",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header title="Dashboard" titleAr="لوحة التحكم" />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Welcome */}
        <div className="animate-fade-in">
          <h2 className={`text-2xl font-bold tracking-tight ${isRTL ? "font-cairo" : ""}`}>
            {isRTL
              ? `مرحباً، ${user?.full_name_ar || user?.full_name || ""}`
              : `Welcome, ${user?.full_name || ""}`}
          </h2>
          <p className="text-muted-foreground mt-1">
            {tenant?.name
              ? isRTL
                ? `${tenant.name_ar || tenant.name} — لوحة التحكم`
                : `${tenant.name} — Dashboard Overview`
              : isRTL
                ? "لوحة التحكم"
                : "Dashboard Overview"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, i) => (
            <Link key={stat.title} href={stat.href}>
              <Card
                className={`hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer animate-fade-in stagger-${Math.min(i + 1, 5)}`}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    {loading ? (
                      <div className="h-8 w-12 bg-muted animate-pulse rounded mt-1" />
                    ) : (
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick summary */}
        {!loading && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="animate-fade-in">
              <CardContent className="p-6">
                <h3 className={`font-semibold mb-4 ${isRTL ? "font-cairo" : ""}`}>
                  {isRTL ? "ملخص اليوم" : "Today's Summary"}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground text-sm">{isRTL ? "الطلبات الجديدة" : "New Orders"}</span>
                    <span className="font-bold text-blue-600">{stats.newOrders}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground text-sm">{isRTL ? "حضور الموظفين" : "Employee Check-ins"}</span>
                    <span className="font-bold text-cyan-600">{stats.todayAttendance}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground text-sm">{isRTL ? "إجمالي الفروع" : "Total Branches"}</span>
                    <span className="font-bold text-emerald-600">{stats.branches}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground text-sm">{isRTL ? "إجمالي الموظفين" : "Total Employees"}</span>
                    <span className="font-bold text-orange-600">{stats.employees}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardContent className="p-6">
                <h3 className={`font-semibold mb-4 ${isRTL ? "font-cairo" : ""}`}>
                  {isRTL ? "المخزون" : "Inventory"}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground text-sm">{isRTL ? "إجمالي المواد" : "Total Items"}</span>
                    <span className="font-bold text-purple-600">{stats.items}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground text-sm">{isRTL ? "الفروع النشطة" : "Active Branches"}</span>
                    <span className="font-bold text-emerald-600">{stats.branches}</span>
                  </div>
                </div>
                <Link
                  href="/dashboard/reports"
                  className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  {isRTL ? "عرض التقارير الكاملة ←" : "View full reports →"}
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
