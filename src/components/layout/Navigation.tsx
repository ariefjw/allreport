"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Clock, AlertTriangle, LogOut } from "lucide-react";
import type { NavItem } from "@/types";
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

function NavTab({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-4 ${
        isActive ? "text-ink" : "text-muted hover:text-body"
      }`}
    >
      <NavIcon icon={item.icon} className="h-4 w-4" strokeWidth={isActive ? 2 : 1.5} />
      <span className="hidden sm:inline">{item.label}</span>
      <span className="sm:hidden">{item.shortLabel}</span>
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
      )}
    </Link>
  );
}

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/80 backdrop-blur-lg">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
              <Zap className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            </div>
            <p className="text-sm font-semibold text-ink max-sm:hidden">Job Track</p>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavTab key={item.href} item={item} />
            ))}
          </nav>
        </div>
        <form
          action={logoutAction}
          onSubmit={(e) => {
            if (!confirm("Are you sure you want to sign out?")) {
              e.preventDefault();
            }
          }}
        >
          <button type="submit" className="btn-ghost gap-1.5 px-2.5 py-1.5 text-xs">
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </form>
      </div>
    </header>
  );
}

export function MobileThemeBar() {
  return null;
}
