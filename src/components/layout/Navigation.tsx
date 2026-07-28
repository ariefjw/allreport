"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Clock, AlertTriangle, Bell, LogOut } from "lucide-react";
import type { NavItem } from "@/types";
import { logoutAction } from "@/app/login/actions";
import { useRealtimeClock } from "@/hooks/useRealtimeClock";
import { useAlarmContext } from "@/components/providers/AlarmProvider";
import { AlarmPanel } from "@/components/ui/AlarmPanel";

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
      className={`relative flex items-center gap-2 px-1.5 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-4 ${
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
  const { timeStr } = useRealtimeClock();
  const { ringing, showPanel, setShowPanel } = useAlarmContext();

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
        <div className="flex items-center gap-1 sm:gap-2">
          {timeStr && (
            <span className="hidden font-mono text-xs tabular-nums text-muted sm:inline">
              <span className="text-ink">{timeStr.slice(0, 5)}</span>
              <span className="text-muted/60">:{timeStr.slice(6, 8)}</span>
            </span>
          )}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`btn-ghost relative gap-1 px-1.5 py-1.5 sm:px-2 ${
              ringing ? "text-accent" : ""
            }`}
            aria-label="Alarms"
          >
            <Bell className="h-3.5 w-3.5" strokeWidth={ringing ? 2 : 1.5} />
            {ringing && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
            )}
          </button>
          <form
            action={logoutAction}
            onSubmit={(e) => {
              if (!confirm("Are you sure you want to sign out?")) {
                e.preventDefault();
              }
            }}
          >
            <button type="submit" className="btn-ghost gap-1.5 px-1.5 py-1.5 text-xs sm:px-2.5">
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </div>
      {showPanel && <AlarmPanel onClose={() => setShowPanel(false)} />}
    </header>
  );
}

export function MobileThemeBar() {
  return null;
}
