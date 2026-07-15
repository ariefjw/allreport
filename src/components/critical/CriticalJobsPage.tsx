"use client";

import { useState } from "react";
import { useCriticalJobs } from "@/hooks/useCriticalJobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { ImportModal } from "@/components/ui/ImportModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TimeInput } from "@/components/ui/TimeInput";
import {
  generateCriticalReportText,
  generateCriticalDurationText,
} from "@/lib/report-generators/critical";
import { formatTimeHM, getTodayDisplay } from "@/lib/utils";
import type { DailyMonitoringLog } from "@/types";

export function CriticalJobsPage() {
  const { jobs, loading, error, updateEndTime, markFailed, bulkImportEndTimes } =
    useCriticalJobs();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const doneCount = jobs.filter((j) => j.status === "*DONE*").length;
  const runningCount = jobs.filter((j) => j.status === "*RUNNING*").length;
  const failedCount = jobs.filter((j) => j.status === "*FAILED*").length;

  const handleImport = async (text: string) => {
    const lines = text.split('\n'); 
    const importData: { id: string; endTime: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Look for a line that starts with a number and a dot, but make it optional.
      // Then capture the rest of the line as the job name.
      const jobMatch = line.match(/^(?:\d{1,2}\.\s*)?(.+)/);

      if (jobMatch && jobMatch[1]) {
        const jobName = jobMatch[1].trim();
        const nextLine = lines[i + 1]?.trim();

        if (nextLine) {
          // Look for a time pattern, which can be HH:mm - HH:mm or just HH:mm
          const timeMatch = nextLine.match(/(?:(\d{2}:\d{2})\s*-\s*)?(\d{2}:\d{2})/);
          if (timeMatch && timeMatch[2]) {
            const endTime = timeMatch[2];

            // Find the job in our state that matches the parsed name
            const job = jobs.find(
              (j) => j.jobName.trim().toLowerCase() === jobName.toLowerCase()
            );

            if (job) {
              importData.push({ id: job.id, endTime });
              // Skip the next line since we've processed it as part of the current job
              i++;
            }
          }
        }
      }
    }

    if (importData.length === 0) {
      alert("No valid job times were found in the pasted text.");
      return;
    }

    try {
      await bulkImportEndTimes(importData);
      alert(`Successfully imported end times for ${importData.length} jobs.`);
    } catch (err) {
      console.error("Import failed:", err);
      alert(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Critical Job Priority"
        description="Airflow batch job monitoring — 42 daily jobs"
        date={getTodayDisplay()}
        actions={
          <>
            <CopyButton
              label="Copy Update Report"
              onCopy={async () => generateCriticalReportText(jobs)}
            />
            <CopyButton
              label="Copy Running Duration"
              variant="secondary"
              onCopy={async () => generateCriticalDurationText(jobs)}
            />
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="ml-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Import Report
            </button>
          </>
        }
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        title="Import Critical Jobs Report"
        description="Paste the report text below. The system will extract end times and automatically fill in the data for jobs that are not yet completed."
      />

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        {loading && (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading jobs...
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <StatCard label="Done" value={doneCount} color="text-green-600" />
              <StatCard
                label="Running"
                value={runningCount}
                color="text-amber-600"
              />
              <StatCard
                label="Failed"
                value={failedCount}
                color="text-red-600"
              />
            </div>

            <div className="space-y-2">
              {jobs.map((job, index) => (
                <JobCard
                  key={job.id}
                  index={index}
                  job={job}
                  onEndTimeChange={updateEndTime}
                  onMarkFailed={markFailed}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function JobCard({
  index,
  job,
  onEndTimeChange,
  onMarkFailed,
}: {
  index: number;
  job: DailyMonitoringLog;
  onEndTimeChange: (id: string, time: string | null) => Promise<void>;
  onMarkFailed: (id: string) => Promise<void>;
}) {
  const scheduled = new Date(job.scheduledTimestamp);
  const scheduleDisplay = formatTimeHM(scheduled);
  const canInputEndTime = job.status === "*RUNNING*" || job.status === "*DONE*";
  const canMarkFailed = job.status === "*RUNNING*";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {index + 1}
            </span>
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {job.jobName}
            </p>
          </div>
          <p className="mt-1 pl-8 text-xs text-slate-500 dark:text-slate-400">
            Scheduled: {scheduleDisplay}
            {job.endTimestamp && (
              <> → End: {formatTimeHM(new Date(job.endTimestamp))}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 pl-8 sm:pl-0">
          <StatusBadge status={job.status} />

          {canInputEndTime && (
            <div className="w-28">
              <TimeInput
                value={
                  job.endTimestamp
                    ? new Date(job.endTimestamp).toTimeString().slice(0, 8)
                    : null
                }
                onChange={(time) => onEndTimeChange(job.id, time)}
                disabled={job.status === "*FAILED*"}
                label="End Time"
              />
            </div>
          )}

          {canMarkFailed && (
            <button
              type="button"
              onClick={() => onMarkFailed(job.id)}
              className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
            >
              Mark Failed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
