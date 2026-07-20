"use client";

import { useState } from "react";
import type { ReactNode } from "react";

interface JobGroupProps {
  title: string;
  count: number;
  defaultExpanded?: boolean;
  children: ReactNode;
  status: string;
}

export function JobGroup({ title, count, defaultExpanded = false, children, status }: JobGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (count === 0) return null;

  return (
    <div id={`group-${status}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <span className={`text-[10px] transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
        {title}
        <span className="ml-auto text-slate-400 dark:text-slate-500">{count}</span>
      </button>
      {expanded && <div>{children}</div>}
    </div>
  );
}
