"use client";

import { useState } from "react";
import { useCriticalJobs } from "@/hooks/useCriticalJobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { ImportModal } from "@/components/ui/ImportModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TimeInput } from "@/components/ui/TimeInput";
import { generateCriticalReportText, generateCriticalDurationText } from "@/lib/report-generators/critical";
import { formatTimeHM, getTodayDisplay } from "@/lib/utils";
import type { DailyMonitoringLog } from "@/types";

export function CriticalJobsPage() {
  const { jobs, loading, error, updateEndTime, markFailed, bulkImportEndTimes } = useCriticalJobs();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const doneCount = jobs.filter((j) => j.status === "*DONE*").length;
  const runningCount = jobs.filter((j) => j.status === "*RUNNING*").length;
  const failedCount = jobs.filter((j) => j.status === "*FAILED*").length;

    const handleImport = async (text: string) => {
    const lines = text.split('\n');
    const importData: { id: string; endTime: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Cari baris yang mengandung nama job (mengabaikan nomor di depan seperti "40.")
      const job = jobs.find(j => line.includes(j.jobName) || line.includes(j.jobName.split('_')[0]));
      
      if (job) {
        // Cari waktu di baris ini atau baris berikutnya
        // Pola: menangkap angka HH:mm di mana saja dalam baris
        const timeMatch = (lines[i] + (lines[i+1] || "")).match(/(\d{2}:\d{2})/);
        
        // PENTING: Jangan import jika baris mengandung kata status yang belum selesai
        const isPending = /WAITING|RUNNING/i.test(lines[i] + (lines[i+1] || ""));
        
        if (timeMatch && !isPending) {
          importData.push({ id: job.id, endTime: timeMatch[1] + ":00" });
        }
      }
    }

    if (importData.length === 0) {
      alert("No valid completed times found. Pastikan tidak ada status WAITING/RUNNING.");
      return;
    }

    try {
      await bulkImportEndTimes(importData);
      alert(`Successfully imported ${importData.length} jobs.`);
      setIsImportModalOpen(false);
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
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
            <CopyButton label="Copy Report" onCopy={async () => generateCriticalReportText(jobs)} />
            <button onClick={() => setIsImportModalOpen(true)} className="ml-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Import Report</button>
          </>
        }
      />

      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImport} title="Import Report" description="Paste report text." />

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <StatCard label="Done" value={doneCount} color="text-green-600" />
          <StatCard label="Running" value={runningCount} color="text-amber-600" />
          <StatCard label="Failed" value={failedCount} color="text-red-600" />
        </div>

        <div className="space-y-2">
          {jobs.map((job, index) => (
            <JobCard key={job.id} index={index} job={job} onEndTimeChange={updateEndTime} onMarkFailed={markFailed} />
          ))}
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function JobCard({ index, job, onEndTimeChange, onMarkFailed }: { index: number; job: DailyMonitoringLog; onEndTimeChange: (id: string, time: string | null) => Promise<void>; onMarkFailed: (id: string) => Promise<void>; }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{job.jobName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scheduled: {formatTimeHM(new Date(job.scheduledTimestamp))}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />
          {job.status === "*RUNNING*" && (
            <div className="w-28">
              <TimeInput value={job.endTimestamp ? new Date(job.endTimestamp).toTimeString().slice(0, 8) : null} onChange={(t) => onEndTimeChange(job.id, t)} label="End Time" />
            </div>
          )}
          {job.status === "*RUNNING*" && (
            <button onClick={() => onMarkFailed(job.id)} className="rounded-lg border px-3 py-2 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400">Mark Failed</button>
          )}
        </div>
      </div>
    </div>
  );
}
