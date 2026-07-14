"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/types";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { logoutAction } from "@/app/login/actions";

const NAV_ITEMS: NavItem[] = [
  { href: "/critical-jobs", label: "Critical Jobs", shortLabel: "Critical", icon: "critical" },
  { href: "/intraday-jobs", label: "Intraday Jobs", shortLabel: "Intraday", icon: "intraday" },
  { href: "/error-logs", label: "Error Logs", shortLabel: "Errors", icon: "error" },
];

function NavIcon({ icon, className }: { icon: NavItem["icon"]; className?: string }) {
  const cn = className ?? "w-5 h-5";
  switch (icon) {
    case "critical":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      );
    case "intraday":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "error":
      return (
        <svg className={cn} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
  }
}

function NavLink({ item, mobile }: { item: NavItem; mobile?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? mobile
            ? "text-brand-600 dark:text-brand-400"
            : "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
          : mobile
            ? "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      } ${mobile ? "flex-col gap-1 px-2 py-1.5 text-xs" : ""}`}
    >
      <NavIcon icon={item.icon} className={mobile ? "w-6 h-6" : "w-5 h-5"} />
      <span>{mobile ? item.shortLabel : item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-200 md:bg-white dark:md:border-slate-800 dark:md:bg-slate-900">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6 dark:border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <NavIcon icon="critical" className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Job Track Central</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Monitoring Dashboard</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white safe-bottom dark:border-slate-800 dark:bg-slate-900 md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <NavIcon icon={item.icon} className="w-6 h-6" />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileThemeBar() {
  return (
    <div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 md:hidden">
      <ThemeToggle />
    </div>
  );
}

function SignOutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Sign Out
      </button>
    </form>
  );
}
