"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { UtensilsCrossed, Mail, Lock, ArrowRight, Globe } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<"en" | "ar">("en");

  const isRTL = locale === "ar";

  const t = {
    en: {
      welcome: "Welcome to Forkly",
      subtitle: "Restaurant Management Platform",
      signIn: "Sign in to your account",
      email: "Email Address",
      emailPlaceholder: "you@example.com",
      password: "Password",
      passwordPlaceholder: "Enter your password",
      login: "Sign In",
      loggingIn: "Signing in...",
      error: "Invalid email or password",
      frozen: "Account has been frozen",
    },
    ar: {
      welcome: "مرحباً بك في فوركلي",
      subtitle: "منصة إدارة المطاعم",
      signIn: "سجّل دخولك للمتابعة",
      email: "البريد الإلكتروني",
      emailPlaceholder: "you@example.com",
      password: "كلمة المرور",
      passwordPlaceholder: "أدخل كلمة المرور",
      login: "تسجيل الدخول",
      loggingIn: "جاري تسجيل الدخول...",
      error: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      frozen: "تم تجميد الحساب",
    },
  };

  const text = t[locale];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setError(text.frozen);
        } else {
          setError(text.error);
        }
        setLoading(false);
        return;
      }

      // Redirect based on role
      window.location.href = data.redirectTo || "/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      setError(text.error);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-foreground/[0.02] to-transparent rounded-full" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-foreground/[0.02] to-transparent rounded-full" />
        {/* Grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.03) 1px, transparent 0)`,
          backgroundSize: "40px 40px"
        }} />
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground text-background mb-4 shadow-lg">
            <UtensilsCrossed className="h-8 w-8" />
          </div>
          <h1 className={`text-3xl font-bold tracking-tight ${isRTL ? "font-cairo" : ""}`}>
            {text.welcome}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">{text.subtitle}</p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <p className={`text-sm text-muted-foreground mb-6 ${isRTL ? "font-cairo" : ""}`}>
              {text.signIn}
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className={isRTL ? "font-cairo" : ""}>
                  {text.email}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={text.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 rtl:pl-3 rtl:pr-10 h-11"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className={isRTL ? "font-cairo" : ""}>
                  {text.password}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={text.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 rtl:pl-3 rtl:pr-10 h-11"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-semibold"
                isLoading={loading}
              >
                {loading ? text.loggingIn : text.login}
                {!loading && <ArrowRight className="h-4 w-4 ml-2 rtl:ml-0 rtl:mr-2" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Language toggle */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="h-4 w-4" />
            {locale === "en" ? "العربية" : "English"}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          © 2026 Forkly. All rights reserved.
        </p>
      </div>
    </div>
  );
}
