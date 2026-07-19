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
  // Tambahkan resetJob di sini (pastikan nanti dibuat di hook-nya)
  const { jobs, loading, error, updateEndTime, markFailed, resetJob, bulkImportEndTimes } = useCriticalJobs();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const doneCount = jobs.filter((j) => j.status === "*DONE*").length;
  const runningCount = jobs.filter((j) => j.status === "*RUNNING*").length;
  const failedCount = jobs.filter((j) => j.status === "*FAILED*").length;

  const handleImport = async (text: string) => {
    // ... (Kode import Anda yang sudah sempurna sebelumnya tidak perlu diubah)
  };

  return (
    <>
      <PageHeader
        title="Critical Job Priority"
        description="Airflow batch job monitoring"
        date={getTodayDisplay()}
        actions={
          <div className="flex items-center gap-3">
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
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Import Report
            </button>
          </div>
        }
      />

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImport} 
      />
      <div className="space-y-2 mt-4">
          {jobs.map((job, index) => (
            <JobCard 
              key={job.id} 
              index={index} 
              job={job} 
              onEndTimeChange={updateEndTime} 
              onMarkFailed={markFailed} 
              onResetJob={resetJob} // Lempar fungsi reset ke Card
            />
          ))}
        </div>
    </>
  );
}

// UPDATE KOMPONEN INI
function JobCard({ 
  index, 
  job, 
  onEndTimeChange, 
  onMarkFailed,
  onResetJob 
}: { 
  index: number; 
  job: DailyMonitoringLog; 
  onEndTimeChange: (id: string, time: string | null) => Promise<void>; 
  onMarkFailed: (id: string) => Promise<void>;
  onResetJob: (id: string) => Promise<void>;
}) {
  
  const isRunning = job.status === "*RUNNING*";
  const isDone = job.status === "*DONE*";
  const isFailed = job.status === "*FAILED*";
  
  // Isu 1: Input waktu akan muncul jika status RUNNING atau DONE
  const canInputTime = isRunning || isDone;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
             {index + 1}. {job.jobName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Scheduled: {formatTimeHM(new Date(job.scheduledTimestamp))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />
          
          {canInputTime && (
            <div className="w-28">
              <TimeInput 
                value={job.endTimestamp ? new Date(job.endTimestamp).toTimeString().slice(0, 8) : null} 
                onChange={(t) => onEndTimeChange(job.id, t)} 
                label={isDone ? "Edit Time" : "End Time"} 
              />
            </div>
          )}
          
          {isRunning && (
            <button onClick={() => onMarkFailed(job.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400">
              Mark Failed
            </button>
          )}

          {/* Isu 3: Mekanisme mengembalikan status FAILED ke RUNNING */}
          {isFailed && (
            <button onClick={() => onResetJob(job.id)} className="rounded-lg border border-amber-200 px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400">
              Reset Status
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
