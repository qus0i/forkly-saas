"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import {
  LayoutDashboard,
  ChefHat,
  ShoppingCart,
  ClipboardList,
  Package,
  FolderTree,
  GitBranch,
  BarChart3,
  Users,
  Clock,
  DollarSign,
  Settings,
  Store,
  LogOut,
  Languages,
  Menu,
  X,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavLink {
  title: string;
  titleAr: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navLinks: NavLink[] = [
  // System Admin
  { title: "Restaurants", titleAr: "المطاعم", href: "/admin/tenants", icon: <Store className="h-5 w-5" />, roles: ["system_admin"] },
  // Restaurant-level nav
  { title: "Dashboard", titleAr: "لوحة التحكم", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" />, roles: ["restaurant_admin"] },
  // Kitchen
  { title: "Kitchen", titleAr: "المطبخ", href: "/dashboard/kitchen", icon: <ChefHat className="h-5 w-5" />, roles: ["kitchen_manager", "restaurant_admin"] },
  { title: "Items", titleAr: "المواد", href: "/dashboard/items", icon: <Package className="h-5 w-5" />, roles: ["kitchen_manager", "restaurant_admin"] },
  { title: "Categories", titleAr: "الفئات", href: "/dashboard/categories", icon: <FolderTree className="h-5 w-5" />, roles: ["kitchen_manager", "restaurant_admin"] },
  // Branch
  { title: "New Order", titleAr: "طلب جديد", href: "/dashboard/orders/new", icon: <ShoppingCart className="h-5 w-5" />, roles: ["branch_manager", "restaurant_admin"] },
  { title: "Order History", titleAr: "سجل الطلبات", href: "/dashboard/orders", icon: <ClipboardList className="h-5 w-5" />, roles: ["branch_manager", "kitchen_manager", "restaurant_admin"] },
  // Shared
  { title: "Branches", titleAr: "الفروع", href: "/dashboard/branches", icon: <GitBranch className="h-5 w-5" />, roles: ["restaurant_admin"] },
  { title: "Reports", titleAr: "التقارير", href: "/dashboard/reports", icon: <BarChart3 className="h-5 w-5" />, roles: ["kitchen_manager", "branch_manager", "restaurant_admin"] },
  // HR
  { title: "Employees", titleAr: "الموظفون", href: "/dashboard/hr/employees", icon: <Users className="h-5 w-5" />, roles: ["hr_manager", "restaurant_admin"] },
  { title: "Attendance", titleAr: "الحضور", href: "/dashboard/hr/attendance", icon: <Clock className="h-5 w-5" />, roles: ["hr_manager", "restaurant_admin"] },
  { title: "Payroll", titleAr: "الرواتب", href: "/dashboard/hr/payroll", icon: <DollarSign className="h-5 w-5" />, roles: ["hr_manager", "restaurant_admin"] },
  // Settings
  { title: "Settings", titleAr: "الإعدادات", href: "/dashboard/settings", icon: <Settings className="h-5 w-5" />, roles: ["restaurant_admin", "system_admin"] },
];

export function Sidebar() {
  const { locale, setLocale, isRTL } = useLocale();
  const { user, tenant, signOut } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredLinks = navLinks.filter(
    (link) => user && link.roles.includes(user.role)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-foreground">
          <UtensilsCrossed className="h-5 w-5 text-background" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight">
              {tenant?.name || "Forkly"}
            </span>
            {tenant && (
              <span className="text-[10px] text-muted-foreground leading-none">
                {tenant.slug}.forkly.cloud
              </span>
            )}
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {filteredLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {link.icon}
              {!collapsed && (
                <span>{isRTL ? link.titleAr : link.title}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/50 p-3 space-y-1">
        <button
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent w-full transition-colors"
        >
          <Languages className="h-5 w-5" />
          {!collapsed && <span>{locale === "en" ? "العربية" : "English"}</span>}
        </button>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 w-full transition-colors"
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && (
            <span>{isRTL ? "تسجيل الخروج" : "Logout"}</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 rtl:left-auto rtl:right-4 z-50 lg:hidden p-2 rounded-lg bg-background border shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div
            className={cn(
              "absolute top-0 h-full w-72 bg-background border-r shadow-xl",
              isRTL ? "right-0 border-l" : "left-0 border-r"
            )}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1 rounded-md hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-background/95 backdrop-blur-sm h-screen sticky top-0 transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {sidebarContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 rtl:-left-3 rtl:right-auto top-20 w-6 h-6 rounded-full border bg-background shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
        >
          <svg
            className={cn("h-3 w-3 transition-transform", collapsed ? "rotate-180" : "", isRTL ? "rotate-180" : "")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </aside>
    </>
  );
}
