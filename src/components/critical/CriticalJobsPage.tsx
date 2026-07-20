"use client";

import { useState, useMemo } from "react";
import { useCriticalJobs } from "@/hooks/useCriticalJobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { ImportModal } from "@/components/ui/ImportModal";
import { StatusSummary } from "@/components/ui/StatusSummary";
import { JobGroup } from "@/components/ui/JobGroup";
import { TimeInput } from "@/components/ui/TimeInput";
import { generateCriticalReportText, generateCriticalDurationText } from "@/lib/report-generators/critical";
import { formatTimeHM, getTodayDisplay } from "@/lib/utils";
import type { DailyMonitoringLog } from "@/types";

const STATUS_LABEL: Record<string, { short: string; dot: string; text: string }> = {
  "*RUNNING*": { short: "RUN", dot: "bg-amber-400", text: "text-amber-600" },
  "*DONE*": { short: "DONE", dot: "bg-green-400", text: "text-green-600" },
  "*FAILED*": { short: "FAIL", dot: "bg-red-400", text: "text-red-600" },
  "*WAITING*": { short: "WAIT", dot: "bg-slate-300", text: "text-slate-400" },
};

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
  const { jobs, updateEndTime, markFailed, resetJob, bulkImportEndTimes } = useCriticalJobs();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const grouped = useGroupedJobs(jobs);

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
        alert("Tidak ada nama job DONE dengan format jam yang cocok terdeteksi.");
        return;
      }

      await bulkImportEndTimes(payload);
      setIsImportModalOpen(false);
    } catch (err) {
      console.error("Gagal import:", err);
      alert(err instanceof Error ? err.message : "Gagal menyimpan import");
    }
  };

  const sections: { status: string; title: string; defaultExpanded: boolean }[] = [
    { status: "*FAILED*", title: "Failed", defaultExpanded: true },
    { status: "*RUNNING*", title: "Running", defaultExpanded: true },
    { status: "*DONE*", title: "Done", defaultExpanded: false },
    { status: "*WAITING*", title: "Waiting", defaultExpanded: false },
  ];

  return (
    <>
      <PageHeader
        title="Critical Job Priority"
        description="Airflow batch job monitoring"
        date={getTodayDisplay()}
        actions={
          <div className="relative z-50 flex items-center gap-2">
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
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Import
            </button>
          </div>
        }
      />

      <StatusSummary {...summary} />

      <div className="mx-auto max-w-6xl">
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

        {jobs.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">No jobs loaded.</p>
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
  const statusCfg = STATUS_LABEL[job.status];

  return (
    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-sm dark:border-slate-800">
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-slate-800 dark:text-slate-200">
        <span className="shrink-0 text-xs tabular-nums text-slate-400">{displayNumber}.</span>
        {job.jobName}
      </span>
      <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
        {formatTimeHM(new Date(job.scheduledTimestamp))}
      </span>
      <span className={`flex shrink-0 items-center gap-1 text-xs font-medium ${statusCfg.text}`}>
        <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
        <span className="hidden sm:inline">{statusCfg.short}</span>
      </span>
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
          onClick={() => onMarkFailed(job.id)}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          aria-label="Mark Failed"
        >
          ✕
        </button>
      )}
      {isFailed && (
        <button
          onClick={() => onResetJob(job.id)}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
          aria-label="Reset"
        >
          ↻
        </button>
      )}
    </div>
  );
}
