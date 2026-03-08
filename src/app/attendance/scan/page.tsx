"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, LogOut, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

type PageState = "login" | "loading" | "ready" | "success_in" | "success_out" | "error";

function ScanContent() {
  const params = useSearchParams();
  const token = params.get("token");

  const [state, setState] = useState<PageState>("login");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionTime, setActionTime] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    if (!token) {
      setState("error");
      setError("رمز QR غير صالح / Invalid QR code");
      return;
    }
    // Try to check if already authenticated
    checkAuth();
  }, [token]);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data.user && data.user.is_active) {
        setEmployeeName(data.user.full_name_ar || data.user.full_name);
        // Check attendance status
        await checkAttendanceStatus();
        setState("ready");
      } else {
        setState("login");
      }
    } catch {
      setState("login");
    }
  };

  const checkAttendanceStatus = async () => {
    try {
      const res = await fetch("/api/attendance/status", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setIsCheckedIn(data.isCheckedIn);
        if (data.branchName) setBranchName(data.branchName);
      }
    } catch {
      // ignore
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("frozen")) {
          setError("الحساب مجمّد. تواصل مع المدير");
        } else if (data.error?.includes("Invalid")) {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        } else {
          setError(data.error || "حدث خطأ");
        }
        return;
      }

      // Successfully logged in — now check auth and load attendance status
      await checkAuth();
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAttendance = async (action: "check_in" | "check_out") => {
    if (!token) return;
    setActionLoading(true);
    setError("");

    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token, action }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("different organization")) {
          setError("رمز QR لا ينتمي لمؤسستك");
        } else if (data.error?.includes("frozen")) {
          setError("الحساب مجمّد");
        } else if (data.error?.includes("expired")) {
          setError("رمز QR منتهي الصلاحية");
        } else if (data.error?.includes("already checked in")) {
          setError("أنت مسجّل دخول مسبقاً");
        } else if (data.error?.includes("not checked in")) {
          setError("لم تسجّل دخول بعد");
        } else {
          setError(data.error || "حدث خطأ");
        }
        return;
      }

      setActionTime(new Date().toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" }));
      if (data.branchName) setBranchName(data.branchName);

      if (action === "check_in") {
        setState("success_in");
        setIsCheckedIn(true);
      } else {
        setState("success_out");
        setIsCheckedIn(false);
      }
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setActionLoading(false);
    }
  };

  // ═══════════════ ERROR STATE ═══════════════
  if (state === "error" && !token) {
    return (
      <Card className="w-full max-w-sm animate-fade-in">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mx-auto">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-xl font-bold">خطأ / Error</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════ LOGIN FORM ═══════════════
  if (state === "login") {
    return (
      <Card className="w-full max-w-sm animate-fade-in">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">تسجيل الحضور</h1>
            <p className="text-sm text-muted-foreground">سجّل دخولك للمتابعة</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={loginLoading}>
              <LogIn className="h-4 w-4 mr-2" />
              تسجيل الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════ READY — CHECK-IN / CHECK-OUT ═══════════════
  if (state === "ready") {
    return (
      <Card className="w-full max-w-sm animate-fade-in">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">مرحباً {employeeName}</h1>
            <p className="text-sm text-muted-foreground">
              {isCheckedIn ? "أنت مسجّل دخول حالياً ✓" : "اختر العملية المطلوبة"}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {/* CHECK IN */}
            <Button
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAttendance("check_in")}
              disabled={actionLoading || isCheckedIn}
            >
              {actionLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <LogIn className="h-5 w-5 mr-2" />
              )}
              تسجيل الدخول
            </Button>

            {/* CHECK OUT */}
            <Button
              className="w-full h-14 text-lg bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleAttendance("check_out")}
              disabled={actionLoading || !isCheckedIn}
            >
              {actionLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <LogOut className="h-5 w-5 mr-2" />
              )}
              تسجيل الخروج
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {new Date().toLocaleDateString("ar-JO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════ SUCCESS IN / OUT ═══════════════
  if (state === "success_in" || state === "success_out") {
    const isIn = state === "success_in";
    return (
      <Card className="w-full max-w-sm animate-fade-in">
        <CardContent className="p-8 text-center space-y-4">
          <div className={`w-20 h-20 rounded-full ${isIn ? "bg-green-50 dark:bg-green-950/20" : "bg-blue-50 dark:bg-blue-950/20"} flex items-center justify-center mx-auto`}>
            <CheckCircle2 className={`h-12 w-12 ${isIn ? "text-green-600" : "text-blue-600"}`} />
          </div>

          <h1 className="text-xl font-bold">
            {isIn ? "✓ تم تسجيل الدخول" : "✓ تم تسجيل الخروج"}
          </h1>

          <div className="space-y-1">
            <p className="text-sm font-medium">{employeeName}</p>
            {branchName && <p className="text-xs text-muted-foreground">الفرع: {branchName}</p>}
            <p className="text-lg font-mono font-bold text-primary">{actionTime}</p>
          </div>

          <div className="pt-4 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setState("ready");
                setError("");
                checkAttendanceStatus();
              }}
            >
              رجوع
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ═══════════════ LOADING ═══════════════
  return (
    <Card className="w-full max-w-sm">
      <CardContent className="p-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
        <p className="mt-4 text-muted-foreground">جارٍ التحميل...</p>
      </CardContent>
    </Card>
  );
}

export default function AttendanceScanPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Suspense fallback={
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
            <p className="mt-4 text-muted-foreground">جارٍ التحميل...</p>
          </CardContent>
        </Card>
      }>
        <ScanContent />
      </Suspense>
    </div>
  );
}
