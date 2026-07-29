"use client";

import { useState, useMemo } from "react";
import { useCriticalJobs } from "@/hooks/useCriticalJobs";
import { useReportReminder } from "@/hooks/useReportReminder";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { ImportModal } from "@/components/ui/ImportModal";
import { KpiBar } from "@/components/ui/KpiBar";
import { JobGroup } from "@/components/ui/JobGroup";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TimeInput } from "@/components/ui/TimeInput";
import { generateCriticalReportText, generateCriticalDurationText } from "@/lib/report-generators/critical";
import { formatTimeHM, getTodayDisplay } from "@/lib/utils";
import { Upload, RotateCcw, XCircle } from "lucide-react";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { DailyMonitoringLog } from "@/types";

function useGroupedJobs(jobs: DailyMonitoringLog[]) {
  return useMemo(() => {
    const groups: Record<string, DailyMonitoringLog[]> = {
      "*FAILED*": [],
      "*RUNNING*": [],
      "*DONE*": [],
      "*WAITING*": [],
    };
    jobs.forEach((job) => {
      groups[job.status]?.push(job);
    });
    return groups;
  }, [jobs]);
}

export function CriticalJobsPage() {
  const { jobs, loading, updateEndTime, markFailed, resetJob, bulkImportEndTimes } = useCriticalJobs();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (searchText && !job.jobName.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [jobs, searchText, statusFilter]);
  const grouped = useGroupedJobs(filteredJobs);

  useReportReminder(jobs);

  const summary = {
    waiting: grouped["*WAITING*"].length,
    running: grouped["*RUNNING*"].length,
    done: grouped["*DONE*"].length,
    failed: grouped["*FAILED*"].length,
  };

  const jobIndex = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((job, i) => map.set(job.id, i + 1));
    return map;
  }, [jobs]);

  const handleImport = async (text: string) => {
    try {
      const payload: { id: string; endTime: string }[] = [];
      const lines = text.split('\n');

      let currentMatchedJobId: string | null = null;

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        const jobNameMatch = trimmedLine.match(/^\d+\.\s*(.+)$/);

        if (jobNameMatch) {
          const extractedJobName = jobNameMatch[1].toLowerCase().trim();

          const matchedJob = jobs.find((job) =>
            extractedJobName.includes(job.jobName.toLowerCase()) ||
            job.jobName.toLowerCase().includes(extractedJobName)
          );

          if (matchedJob) {
            currentMatchedJobId = matchedJob.id;
          } else {
            currentMatchedJobId = null;
          }
        }
        else if (currentMatchedJobId && trimmedLine.includes('-')) {
          const timeParts = trimmedLine.split('-');
          const endTimeRaw = timeParts[1] ? timeParts[1].trim() : "";

          if (endTimeRaw) {
            const timeMatch = endTimeRaw.match(/^([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])/);

            if (timeMatch) {
              let timeString = timeMatch[0].replace('.', ':');
              if (timeString.length === 4) {
                 timeString = `0${timeString}`;
              }

              payload.push({
                id: currentMatchedJobId,
                endTime: timeString
              });
            }
          }

          currentMatchedJobId = null;
        }
      });

      if (payload.length === 0) {
        alert("No completed job names with matching time format detected.");
        return;
      }

      await bulkImportEndTimes(payload);
      setIsImportModalOpen(false);
    } catch (err) {
      console.error("Gagal import:", err);
      alert(err instanceof Error ? err.message : "Failed to save import");
    }
  };

  const sections: { status: string; title: string; defaultExpanded: boolean }[] = [
    { status: "*FAILED*", title: "Failed", defaultExpanded: true },
    { status: "*RUNNING*", title: "Running", defaultExpanded: true },
    { status: "*DONE*", title: "Done", defaultExpanded: false },
    { status: "*WAITING*", title: "Waiting", defaultExpanded: false },
  ];

  const headerActions = (
    <>
      <CopyButton
        label="Copy Report"
        onCopy={async () => generateCriticalReportText(jobs)}
      />
      <CopyButton
        label="Copy Duration"
        variant="secondary"
        onCopy={async () => generateCriticalDurationText(jobs)}
      />
      <button
        onClick={() => setIsImportModalOpen(true)}
        className="btn-primary"
      >
        <Upload className="h-4 w-4" strokeWidth={1.5} />
        Import
      </button>
    </>
  );

  const mobileActions = (
    <>
      <CopyButton
        label="Copy Duration"
        variant="secondary"
        onCopy={async () => generateCriticalDurationText(jobs)}
      />
      <button
        onClick={() => setIsImportModalOpen(true)}
        className="btn-primary"
      >
        <Upload className="h-4 w-4" strokeWidth={1.5} />
        Import
      </button>
      <CopyButton
        label="Copy Report"
        onCopy={async () => generateCriticalReportText(jobs)}
      />
    </>
  );

  return (
    <>
      <PageHeader
        title="Critical Job Priority"
        description="Airflow batch job monitoring"
        date={getTodayDisplay()}
        glow="amber"
        actions={headerActions}
        mobileActions={mobileActions}
      />

      <KpiBar {...summary} />

      <div className="mx-auto max-w-6xl">
        <div className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-6">
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="input h-8 min-w-0 flex-1 px-3 py-0 text-xs sm:w-52 sm:flex-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input h-8 w-auto px-3 py-0 text-xs"
          >
            <option value="all">All Status</option>
            <option value="*FAILED*">Failed</option>
            <option value="*RUNNING*">Running</option>
            <option value="*DONE*">Done</option>
            <option value="*WAITING*">Waiting</option>
          </select>
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-status-running animate-pulse" />
              Refreshing...
            </span>
          )}
        </div>
        {sections.map(({ status, title, defaultExpanded }) => {
          const items = grouped[status];
          if (!items?.length) return null;

          return (
            <JobGroup key={status} status={status} title={title} count={items.length} defaultExpanded={defaultExpanded}>
              {items.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  displayNumber={jobIndex.get(job.id) ?? 0}
                  onEndTimeChange={updateEndTime}
                  onMarkFailed={markFailed}
                  onResetJob={resetJob}
                />
              ))}
            </JobGroup>
          );
        })}

        {loading && <div className="px-4 py-4 sm:px-6"><SkeletonCard /></div>}
        {!loading && jobs.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">No jobs loaded.</p>
        )}
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        title="Import Job Report"
        description="Paste teks laporan di sini untuk melakukan update."
      />
    </>
  );
}

function JobRow({
  job,
  displayNumber,
  onEndTimeChange,
  onMarkFailed,
  onResetJob,
}: {
  job: DailyMonitoringLog;
  displayNumber: number;
  onEndTimeChange: (id: string, time: string | null) => Promise<void>;
  onMarkFailed: (id: string) => Promise<void>;
  onResetJob: (id: string) => Promise<void>;
}) {
  const isRunning = job.status === "*RUNNING*";
  const isDone = job.status === "*DONE*";
  const isFailed = job.status === "*FAILED*";
  const canInputTime = isRunning || isDone;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-white/[0.02]">
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-surface-elevated text-[11px] font-medium tabular-nums text-muted">
        {displayNumber}
      </span>
      <span className="font-medium text-ink break-words pr-2">
        {job.jobName}
      </span>
      <span className="hidden text-xs text-muted sm:block whitespace-nowrap">
        {formatTimeHM(new Date(job.scheduledTimestamp))}
      </span>
      <StatusBadge status={job.status} />
      {canInputTime && (
        <div className="w-20 shrink-0 sm:w-24">
          <TimeInput
            value={job.endTimestamp ? new Date(job.endTimestamp).toTimeString().slice(0, 8) : null}
            onChange={(t) => onEndTimeChange(job.id, t)}
          />
        </div>
      )}
      {isRunning && (
        <button
          onClick={() => {
            if (window.confirm(`Mark "${job.jobName}" as failed?`)) {
              onMarkFailed(job.id);
            }
          }}
          className="btn-ghost p-1.5 text-status-failed hover:text-status-failed"
          aria-label="Mark Failed"
        >
          <XCircle className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}
      {isFailed && (
        <button
          onClick={() => {
            if (window.confirm(`Reset "${job.jobName}" to RUNNING?`)) {
              onResetJob(job.id);
            }
          }}
          className="btn-ghost p-1.5 text-status-running hover:text-status-running"
          aria-label="Reset"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
