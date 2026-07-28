"use client";

interface KpiBarProps {
  waiting: number;
  running: number;
  done: number;
  failed: number;
}

const ITEMS = [
  {
    key: "waiting" as const,
    label: "Waiting",
    dot: "bg-status-waiting",
    text: "text-muted",
    pulse: false,
  },
  {
    key: "running" as const,
    label: "Running",
    dot: "bg-status-running",
    text: "text-status-running",
    pulse: true,
  },
  {
    key: "done" as const,
    label: "Done",
    dot: "bg-status-done",
    text: "text-status-done",
    pulse: false,
  },
  {
    key: "failed" as const,
    label: "Failed",
    dot: "bg-status-failed",
    text: "text-status-failed",
    pulse: false,
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.25)]",
  },
];

export function KpiBar({ waiting, running, done, failed }: KpiBarProps) {
  const counts = { waiting, running, done, failed };

  const handleClick = (status: string) => {
    const el = document.getElementById(`group-*${status.toUpperCase()}*`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="border-b border-hairline">
      <div className="mx-auto flex max-w-6xl flex-wrap items-stretch gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
        {ITEMS.map((item) => {
          const count = counts[item.key];
          return (
            <button
              key={item.key}
              onClick={() => handleClick(item.key)}
              className={`flex flex-1 basis-[calc(50%-4px)] items-center gap-2 rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-xs transition-all duration-150 hover:bg-surface-elevated sm:basis-auto sm:px-4 sm:py-2.5 ${item.glow ?? ""}`}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dot} ${item.pulse ? "animate-pulse" : ""}`}
              />
              <div className="flex flex-1 items-center justify-between gap-2">
                <span className="text-muted">{item.label}</span>
                <span className={`font-bold tabular-nums ${item.text}`}>{count}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
