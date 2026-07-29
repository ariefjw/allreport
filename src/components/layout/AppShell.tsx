"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { TopNav } from "./Navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isReady, isAuthenticated } = useAuth();
  const isAuthPage = pathname === "/login";

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border border-hairline-strong border-t-ink" />
          <p className="text-xs text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav />
      <main className="pb-16 md:pb-0">{children}</main>
    </div>
  );
}
