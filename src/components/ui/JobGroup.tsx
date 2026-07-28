"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface JobGroupProps {
  title: string;
  count: number;
  defaultExpanded?: boolean;
  children: ReactNode;
  status: string;
}

const STATUS_ACCENT: Record<string, { strip: string; countBg: string }> = {
  "*FAILED*": { strip: "bg-[rgba(239,68,68,0.3)]", countBg: "bg-status-failed/15 text-status-failed" },
  "*RUNNING*": { strip: "bg-[rgba(245,158,11,0.3)]", countBg: "bg-status-running/15 text-status-running" },
  "*DONE*": { strip: "bg-[rgba(34,197,94,0.3)]", countBg: "bg-status-done/15 text-status-done" },
  "*WAITING*": { strip: "bg-[rgba(99,99,104,0.3)]", countBg: "bg-status-waiting/15 text-status-waiting" },
};

export function JobGroup({ title, count, defaultExpanded = false, children, status }: JobGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const accent = STATUS_ACCENT[status] ?? { strip: "bg-white/10", countBg: "bg-white/10 text-muted" };

  if (count === 0) return null;

  return (
    <div id={`group-${status}`} className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-all duration-150 hover:bg-white/[0.02]"
      >
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform duration-200 ${expanded ? "rotate-0" : "-rotate-90"}`}
          strokeWidth={2}
        />
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className={`ml-auto inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${accent.countBg}`}>
          {count}
        </span>
      </button>
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="divide-y divide-hairline">{children}</div>
        </div>
      </div>
    </div>
  );
}
