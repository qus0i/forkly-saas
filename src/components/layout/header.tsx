"use client";

import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { cn } from "@/lib/utils";

export function Header({ title, titleAr }: { title: string; titleAr?: string }) {
  const { user } = useAuth();
  const { isRTL } = useLocale();

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-6 lg:px-8">
      <div className="flex items-center gap-4 lg:ml-0 ml-12 rtl:ml-0 rtl:mr-12 lg:rtl:mr-0">
        <h1 className={cn("text-xl font-bold tracking-tight", isRTL && "font-cairo")}>
          {isRTL && titleAr ? titleAr : title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right rtl:text-left hidden sm:block">
              <p className="text-sm font-medium leading-none">
                {isRTL ? user.full_name_ar || user.full_name : user.full_name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-bold">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
