"use client";

import { useState } from "react";
import { useIntradayJobs } from "@/hooks/useIntradayJobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { TimeInput } from "@/components/ui/TimeInput";
import { INTRADAY_JOB_NAME } from "@/lib/mock-data";
import { INTRADAY_BATCH_TIMES } from "@/lib/intraday-schedule";
import {
  generateIntradayReportText,
  generateIntradayFinishedTimeText,
} from "@/lib/report-generators/intraday";
import { getTodayDisplay, isTimeReached } from "@/lib/utils";
import type { DailyIntradayLog } from "@/types";
import { Upload } from "lucide-react";

// Helper: Ubah format DB (ISO/Spasi) ke WIB String "HH:mm:ss"
function shiftToWIB(timestamp: string | null): string | null {
  if (!timestamp) return null;
  try {
    const cleanStr = timestamp.replace(" ", "T").replace("+00", "Z");
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return timestamp;
    
    const wib = new Date(d.getTime() + 7 * 3600000);
    return `${String(wib.getUTCHours()).padStart(2, "0")}:${String(wib.getUTCMinutes()).padStart(2, "0")}:${String(wib.getUTCSeconds()).padStart(2, "0")}`;
  } catch { return timestamp; }
}

export function IntradayJobsPage() {
  const { batches, loading, error, updateFinishedTime, mutate } = useIntradayJobs();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const completedCount = batches.filter((b) => b.finishedTimestamp).length;
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Intraday Job Monitoring"
        description={`${INTRADAY_JOB_NAME} — every 30 min (08:30–17:30)`}
        date={getTodayDisplay()}
        actions={
          <>
            <button onClick={() => setIsImportModalOpen(true)} className="inline-flex items-center justify-center rounded-md text-sm font-medium border bg-white h-10 px-4 py-2 hover:bg-slate-100">
              <Upload className="mr-2 h-4 w-4" /> Import Report
            </button>
            <CopyButton label="Copy Intraday Report" onCopy={async () => generateIntradayReportText(batches)} />
            <CopyButton label="Copy Finished Time" variant="secondary" onCopy={async () => generateIntradayFinishedTimeText(batches)} />
          </>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-4">
        {!loading && !error && (
          <div className="space-y-2">
            {batches.map((batch) => (
              <BatchCard
                key={batch.id}
                batch={batch}
                isActive={isTimeReached(batch.startedTime, now)}
                onFinishedTimeChange={updateFinishedTime}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function BatchCard({
  batch,
  isActive,
  onFinishedTimeChange,
}: {
  batch: any;
  isActive: boolean;
  onFinishedTimeChange: (id: string, time: string | null) => Promise<void>;
}) {
  const startedDisplay = batch.startedTime.substring(0, 5);
  // Konversi data DB ke format WIB untuk ditampilkan di input
  const wibTime = shiftToWIB(batch.finishedTimestamp);

  return (
    <div className={`rounded-xl border bg-white p-4 ${isActive ? "border-slate-200" : "opacity-60"}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">Batch {batch.batchNumber}</p>
          <p className="text-xs text-slate-500">Started: {startedDisplay}</p>
        </div>
        
        {isActive && (
          <div className="w-28">
            <TimeInput
              value={wibTime}
              onChange={(time) => {
                if (!time) {
                  onFinishedTimeChange(batch.id, null);
                  return;
                }
                // Trik: Kurangi 7 jam sebelum kirim ke API agar 
                // combineOperationalDateWithTime di backend yang akan menambahkannya kembali
                const [h, m, s] = time.split(':').map(Number);
                const d = new Date();
                d.setHours(h - 7); 
                d.setMinutes(m);
                d.setSeconds(s || 0);
                
                const timeToSend = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
                onFinishedTimeChange(batch.id, timeToSend);
              }}
              label="Finished"
            />
          </div>
        )}
      </div>
    </div>
  );
}
