"use client";

interface StatusSummaryProps {
  waiting: number;
  running: number;
  done: number;
  failed: number;
}

const ITEMS = [
  { status: "*WAITING*", label: "Waiting", key: "waiting" as const, dot: "bg-status-waiting", bg: "bg-slate-50 dark:bg-slate-800/50", text: "text-slate-600 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700" },
  { status: "*RUNNING*", label: "Running", key: "running" as const, dot: "bg-status-running", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/20" },
  { status: "*DONE*", label: "Done", key: "done" as const, dot: "bg-status-done", bg: "bg-green-50 dark:bg-green-500/10", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-500/20" },
  { status: "*FAILED*", label: "Failed", key: "failed" as const, dot: "bg-status-failed", bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-500/20" },
];

export function StatusSummary({ waiting, running, done, failed }: StatusSummaryProps) {
  const counts = { waiting, running, done, failed };

  const handleClick = (status: string) => {
    const el = document.getElementById(`group-${status}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md dark:bg-slate-900/90 dark:border-border-dark">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        {ITEMS.map((item) => {
          const count = counts[item.key];
          return (
            <button
              key={item.status}
              onClick={() => handleClick(item.status)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-150 hover:shadow-sm sm:flex-none sm:px-4 ${item.bg} ${item.text} ${item.border}`}
            >
              <span className={`h-2 w-2 rounded-full ${item.dot} ${item.key === "running" ? "animate-pulse" : ""}`} />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="font-bold tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
