"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, LogOut, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function ScanContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success_in" | "success_out" | "error">("loading");
  const [message, setMessage] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid QR code");
      return;
    }

    const processAttendance = async () => {
      try {
        const res = await fetch("/api/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          // Show Arabic-friendly messages
          const msg = data.error || "An error occurred";
          if (msg.includes("Not authenticated")) {
            setMessage("يجب تسجيل الدخول أولاً / Please sign in first");
          } else if (msg.includes("frozen")) {
            setMessage("الحساب مجمّد. تواصل مع المدير / Account is frozen");
          } else if (msg.includes("different organization")) {
            setMessage("رمز QR لا ينتمي لمؤسستك / Wrong organization QR");
          } else if (msg.includes("expired")) {
            setMessage("رمز QR منتهي الصلاحية / Expired QR code");
          } else {
            setMessage(msg);
          }
          return;
        }

        setEmployeeName(data.name || "");
        if (data.action === "check_in") {
          setStatus("success_in");
          setMessage("تم تسجيل الدخول بنجاح! / Checked in successfully!");
        } else {
          setStatus("success_out");
          setMessage("تم تسجيل الخروج بنجاح! / Checked out successfully!");
        }
      } catch {
        setStatus("error");
        setMessage("حدث خطأ في الاتصال / Network error");
      }
    };

    processAttendance();
  }, [token]);

  const icons = {
    loading: <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />,
    success_in: <LogIn className="h-12 w-12 text-green-600" />,
    success_out: <LogOut className="h-12 w-12 text-blue-600" />,
    error: <XCircle className="h-12 w-12 text-red-600" />,
  };

  const bgColors = {
    loading: "bg-muted/30",
    success_in: "bg-green-50 dark:bg-green-950/20",
    success_out: "bg-blue-50 dark:bg-blue-950/20",
    error: "bg-red-50 dark:bg-red-950/20",
  };

  return (
    <Card className="w-full max-w-sm animate-fade-in">
      <CardContent className="p-8 text-center space-y-4">
        <div className={`w-20 h-20 rounded-full ${bgColors[status]} flex items-center justify-center mx-auto`}>
          {icons[status]}
        </div>

        {employeeName && (
          <p className="text-sm font-medium text-muted-foreground">{employeeName}</p>
        )}

        <h1 className="text-xl font-bold">
          {status === "loading"
            ? "جارٍ المعالجة... / Processing..."
            : status === "success_in"
            ? "✓ تم تسجيل الدخول / Checked In"
            : status === "success_out"
            ? "✓ تم تسجيل الخروج / Checked Out"
            : "خطأ / Error"}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>

        {(status === "success_in" || status === "success_out") && (
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleTimeString("ar-JO")}
          </p>
        )}

        {status === "error" && message.includes("sign in") && (
          <Button onClick={() => router.push("/login")} className="w-full mt-2">
            تسجيل الدخول / Login
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AttendanceScanPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Suspense fallback={
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
            <p className="mt-4 text-muted-foreground">جارٍ التحميل... / Loading...</p>
          </CardContent>
        </Card>
      }>
        <ScanContent />
      </Suspense>
    </div>
  );
}
