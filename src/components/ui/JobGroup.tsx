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

const STATUS_BORDER: Record<string, string> = {
  "*FAILED*": "border-l-red-500",
  "*RUNNING*": "border-l-amber-500",
  "*DONE*": "border-l-green-500",
  "*WAITING*": "border-l-slate-400",
  "failed": "border-l-red-500",
  "active": "border-l-amber-500",
  "done": "border-l-green-500",
  "waiting": "border-l-slate-400",
};

const STATUS_COLOR: Record<string, string> = {
  "*FAILED*": "text-red-600 dark:text-red-400",
  "*RUNNING*": "text-amber-600 dark:text-amber-400",
  "*DONE*": "text-green-600 dark:text-green-400",
  "*WAITING*": "text-slate-500 dark:text-slate-400",
  "failed": "text-red-600 dark:text-red-400",
  "active": "text-amber-600 dark:text-amber-400",
  "done": "text-green-600 dark:text-green-400",
  "waiting": "text-slate-500 dark:text-slate-400",
};

const STATUS_BADGE: Record<string, string> = {
  "*FAILED*": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  "*RUNNING*": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "*DONE*": "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  "*WAITING*": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "failed": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  "active": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "done": "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  "waiting": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function JobGroup({ title, count, defaultExpanded = false, children, status }: JobGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (count === 0) return null;

  return (
    <div id={`group-${status}`} className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center gap-3 border-l-2 px-5 py-3.5 text-left transition-all duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 ${STATUS_BORDER[status] ?? "border-l-transparent"}`}
      >
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-0" : "-rotate-90"}`}
          strokeWidth={2}
        />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</span>
        <span className={`ml-auto inline-flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${STATUS_BADGE[status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
          {count}
        </span>
      </button>
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="divide-y divide-border dark:divide-border-dark">{children}</div>
        </div>
      </div>
    </div>
  );
}
