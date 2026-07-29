import type { JobStatus } from "@/types";

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; dot: string; text: string; pulse?: boolean; glow?: string }
> = {
  "*WAITING*": {
    label: "Waiting",
    dot: "bg-status-waiting",
    text: "text-status-waiting",
  },
  "*RUNNING*": {
    label: "Running",
    dot: "bg-status-running",
    text: "text-status-running",
    pulse: true,
  },
  "*DONE*": {
    label: "Done",
    dot: "bg-status-done",
    text: "text-status-done",
  },
  "*FAILED*": {
    label: "Failed",
    dot: "bg-status-failed",
    text: "text-status-failed",
    glow: "shadow-destructive",
  },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const config = STATUS_CONFIG[status];
  const dotClass = `h-2 w-2 rounded-full ${config.dot} ${config.pulse ? "animate-pulse" : ""}`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-hairline-strong bg-surface-elevated px-3 py-1 text-xs font-semibold leading-none ${config.text} ${config.glow ?? ""}`}
    >
      <span className={dotClass} />
      {config.label}
    </span>
  );
}
