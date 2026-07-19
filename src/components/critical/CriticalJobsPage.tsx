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
  // Variabel loading, error, doneCount, dll dihapus agar tidak memicu error ESLint "never used"
  const { jobs, updateEndTime, markFailed, resetJob, bulkImportEndTimes } = useCriticalJobs();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleImport = async (text: string) => {
    try {
      const payload: { id: string; endTime: string }[] = [];
      const lines = text.split('\n');
      
      let currentMatchedJobId: string | null = null;

      lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return; // Lewati baris kosong

        // 1. Deteksi baris yang berisi nama job (contoh: "1.cbs_tradefinance_to_landing")
        // Regex ini mencari format angka, titik, lalu mengambil teks setelahnya
        const jobNameMatch = trimmedLine.match(/^\d+\.\s*(.+)$/);
        
        if (jobNameMatch) {
          const extractedJobName = jobNameMatch[1].toLowerCase().trim();
          
          // Cari job di state 'jobs' yang namanya cocok
          const matchedJob = jobs.find((job) => 
            extractedJobName.includes(job.jobName.toLowerCase()) || 
            job.jobName.toLowerCase().includes(extractedJobName)
          );
          
          if (matchedJob) {
            currentMatchedJobId = matchedJob.id; // Simpan ID untuk baris berikutnya
          } else {
            currentMatchedJobId = null;
          }
        } 
        // 2. Deteksi baris waktu di bawahnya (contoh: "22:30 - 22:40")
        else if (currentMatchedJobId && trimmedLine.includes('-')) {
          const timeParts = trimmedLine.split('-');
          // Ambil teks SETELAH tanda strip (-)
          const endTimeRaw = timeParts[1] ? timeParts[1].trim() : "";
          
          // Jika ada isinya, validasi apakah itu format jam HH:mm
          if (endTimeRaw) {
            const timeMatch = endTimeRaw.match(/^([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])/);
            
            if (timeMatch) {
              let timeString = timeMatch[0].replace('.', ':');
              if (timeString.length === 4) {
                 timeString = `0${timeString}`; // Standardisasi misal "2:30" jadi "02:30"
              }
              
              payload.push({
                id: currentMatchedJobId,
                endTime: timeString 
              });
            }
          }
          
          // Reset ID setelah dicek agar tidak salah masuk ke job lain
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

  return (
    <>
      <PageHeader
        title="Critical Job Priority"
        description="Airflow batch job monitoring"
        date={getTodayDisplay()}
        actions={
          <div className="relative z-50 flex items-center gap-3">
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
        title="Import Job Report"
        description="Paste teks laporan di sini untuk melakukan update."
      />

      <div className="space-y-2 mt-4">
        {jobs.map((job, index) => (
          <JobCard 
            key={job.id} 
            index={index} 
            job={job} 
            onEndTimeChange={updateEndTime} 
            onMarkFailed={markFailed} 
            onResetJob={resetJob}
          />
        ))}
      </div>
    </>
  );
}

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
