"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Clock, AlertTriangle, LogOut } from "lucide-react";
import type { NavItem } from "@/types";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { logoutAction } from "@/app/login/actions";

const NAV_ITEMS: NavItem[] = [
  { href: "/critical-jobs", label: "Critical Jobs", shortLabel: "Critical", icon: "critical" },
  { href: "/intraday-jobs", label: "Intraday Jobs", shortLabel: "Intraday", icon: "intraday" },
  { href: "/error-logs", label: "Error Logs", shortLabel: "Errors", icon: "error" },
];

const ICON_MAP = {
  critical: Zap,
  intraday: Clock,
  error: AlertTriangle,
};

function NavIcon({ icon, className, strokeWidth: sw }: { icon: NavItem["icon"]; className?: string; strokeWidth?: number }) {
  const Icon = ICON_MAP[icon];
  return <Icon className={className ?? "w-5 h-5"} strokeWidth={sw ?? 1.5} />;
}

function NavLink({ item, mobile }: { item: NavItem; mobile?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  if (mobile) {
    return (
      <Link
        href={item.href}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
          isActive
            ? "text-brand-600 dark:text-brand-400"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        <NavIcon icon={item.icon} className="w-5 h-5" />
        <span>{item.shortLabel}</span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        isActive
          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-500 dark:bg-brand-400" />
      )}
      <NavIcon icon={item.icon} className="w-4 h-4" strokeWidth={isActive ? 2 : 1.5} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-white dark:md:border-border-dark dark:md:bg-slate-900">
      <div className="flex h-16 items-center gap-3 border-b border-border bg-gradient-to-r from-brand-600 to-brand-700 px-6 dark:border-border-dark">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm">
          <Zap className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Job Track Central</p>
          <p className="text-[11px] font-medium text-white/70">Monitoring Dashboard</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
      <div className="border-t border-border p-4 dark:border-border-dark">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Theme</span>
          <ThemeToggle />
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/90 backdrop-blur-lg safe-bottom dark:border-border-dark dark:bg-slate-900/90 md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} mobile />
        ))}
      </div>
    </nav>
  );
}

export function MobileThemeBar() {
  return (
    <div className="flex items-center justify-end border-b border-border bg-white px-4 py-2 dark:border-border-dark dark:bg-slate-900 md:hidden">
      <ThemeToggle />
    </div>
  );
}

function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="btn-secondary w-full"
      >
        <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
        Sign Out
      </button>
    </form>
  );
}
