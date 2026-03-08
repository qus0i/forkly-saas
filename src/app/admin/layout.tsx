"use client";

import { LocaleProvider } from "@/contexts/locale-context";
import { AuthProvider } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-h-screen">{children}</main>
        </div>
      </AuthProvider>
    </LocaleProvider>
  );
}
