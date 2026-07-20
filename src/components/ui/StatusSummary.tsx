"use client";

interface StatusSummaryProps {
  waiting: number;
  running: number;
  done: number;
  failed: number;
}

const ITEMS = [
  { status: "*WAITING*", label: "Waiting", key: "waiting" as const, dot: "bg-slate-400" },
  { status: "*RUNNING*", label: "Running", key: "running" as const, dot: "bg-amber-400" },
  { status: "*DONE*", label: "Done", key: "done" as const, dot: "bg-green-400" },
  { status: "*FAILED*", label: "Failed", key: "failed" as const, dot: "bg-red-400" },
];

export function StatusSummary({ waiting, running, done, failed }: StatusSummaryProps) {
  const counts = { waiting, running, done, failed };

  const handleClick = (status: string) => {
    const el = document.getElementById(`group-${status}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2 sm:gap-6 sm:px-6">
        {ITEMS.map((item) => {
          const count = counts[item.key];
          return (
            <button
              key={item.status}
              onClick={() => handleClick(item.status)}
              className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80"
            >
              <span className={`h-2 w-2 rounded-full ${item.dot}`} />
              <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
              <span className="text-slate-700 dark:text-slate-200">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
