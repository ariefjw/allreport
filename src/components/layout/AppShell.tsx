"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Sidebar, BottomNav, MobileThemeBar } from "./Navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isReady, isAuthenticated } = useAuth();
  const isAuthPage = pathname === "/login";

  // Same hooks every render — only the returned UI branches
  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <MobileThemeBar />
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
