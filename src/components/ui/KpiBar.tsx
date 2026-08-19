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
    glow: "shadow-destructive-sm",
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
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-3 py-2.5 sm:flex sm:flex-wrap sm:items-stretch sm:gap-3 sm:px-6">
        {ITEMS.map((item) => {
          const count = counts[item.key];
          return (
            <button
              key={item.key}
              onClick={() => handleClick(item.key)}
              className={`kpi-tile text-sm ${item.glow ?? ""}`}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dot} ${item.pulse ? "animate-pulse" : ""}`}
              />
              <span className="text-xs font-medium text-muted">{item.label}</span>
              <span className={`kpi-count ${item.text}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
