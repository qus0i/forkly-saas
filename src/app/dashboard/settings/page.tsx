"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/contexts/locale-context";
import { useAuth } from "@/contexts/auth-context";
import { Settings, Sun, Moon, Languages } from "lucide-react";

export default function SettingsPage() {
  const { locale, setLocale, isRTL } = useLocale();
  const { user, tenant } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Settings" titleAr="الإعدادات" />
      <div className="p-6 lg:p-8 space-y-6 max-w-2xl">
        {/* Account */}
        <Card className="animate-fade-in">
          <CardHeader><CardTitle>{isRTL ? "الحساب" : "Account"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{isRTL ? "الاسم" : "Name"}</span><span className="font-medium">{user?.full_name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{isRTL ? "البريد" : "Email"}</span><span className="font-medium">{user?.email}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{isRTL ? "الدور" : "Role"}</span><span className="font-medium">{user?.role.replace(/_/g, " ")}</span></div>
            {tenant && <div className="flex justify-between text-sm"><span className="text-muted-foreground">{isRTL ? "المطعم" : "Restaurant"}</span><span className="font-medium">{tenant.name}</span></div>}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="animate-fade-in stagger-1">
          <CardHeader><CardTitle>{isRTL ? "المظهر" : "Appearance"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <div>
                  <p className="font-medium text-sm">{isRTL ? "الوضع الداكن" : "Dark Mode"}</p>
                  <p className="text-xs text-muted-foreground">{isRTL ? "تبديل السمة" : "Toggle theme"}</p>
                </div>
              </div>
              <button onClick={toggleDark} className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? "bg-foreground" : "bg-muted"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${darkMode ? "left-[26px]" : "left-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Languages className="h-5 w-5" />
                <div>
                  <p className="font-medium text-sm">{isRTL ? "اللغة" : "Language"}</p>
                  <p className="text-xs text-muted-foreground">{isRTL ? "تغيير اللغة" : "Change language"}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setLocale(locale === "en" ? "ar" : "en")}>
                {locale === "en" ? "العربية" : "English"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="animate-fade-in stagger-2">
          <CardHeader><CardTitle>{isRTL ? "معلومات النظام" : "System Info"}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? "الإصدار" : "Version"}</span><span>1.0.0</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{isRTL ? "المنصة" : "Platform"}</span><span>Forkly Cloud</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
