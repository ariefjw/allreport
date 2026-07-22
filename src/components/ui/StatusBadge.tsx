import type { JobStatus } from "@/types";

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; bg: string; text: string; dot: string; pulse?: boolean }
> = {
  "*WAITING*": {
    label: "Waiting",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-status-waiting",
  },
  "*RUNNING*": {
    label: "Running",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-status-running",
    pulse: true,
  },
  "*DONE*": {
    label: "Done",
    bg: "bg-green-50 dark:bg-green-500/10",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-status-done",
  },
  "*FAILED*": {
    label: "Failed",
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-status-failed",
  },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold leading-none ${config.bg} ${config.text}`}
    >
      <span className={`relative h-1.5 w-1.5 rounded-full ${config.dot} ${config.pulse ? "animate-pulse" : ""}`} />
      {config.label}
    </span>
  );
}
