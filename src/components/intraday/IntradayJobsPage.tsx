"use client";

import { useState } from "react";
import { useIntradayJobs } from "@/hooks/useIntradayJobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { TimeInput } from "@/components/ui/TimeInput";
import { INTRADAY_JOB_NAME } from "@/lib/mock-data";
import { generateIntradayReportText, generateIntradayFinishedTimeText } from "@/lib/report-generators/intraday";
import { getTodayDisplay, isTimeReached } from "@/lib/utils";
import type { DailyIntradayLog } from "@/types";
import { Upload } from "lucide-react";

// Helper: Ubah format DB ke WIB
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
  const { batches, loading, error, updateFinishedTime, refresh } = useIntradayJobs();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const now = new Date();

  const handleImport = async () => {
    const lines = importText.split("\n");
    const payload = lines
      .map(line => line.match(/-\s*batch\s*(\d+):.*finished\s*(\d{2}:\d{2})/))
      .filter(match => match !== null)
      .map(match => {
        const batch = batches.find(b => b.batchNumber === parseInt(match![1], 10));
        return batch && !batch.finishedTimestamp ? { id: batch.id, finishedTime: match![2] } : null;
      })
      .filter((p): p is { id: string; finishedTime: string } => p !== null);

    if (payload.length > 0) {
      await fetch("/api/intraday-jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      refresh();
      setIsImportModalOpen(false);
      setImportText("");
    }
  };

  return (
    <>
      <PageHeader
        title="Intraday Job Monitoring"
        description={INTRADAY_JOB_NAME}
        date={getTodayDisplay()}
        actions={
          <>
            <button onClick={() => setIsImportModalOpen(true)} className="inline-flex items-center rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100">
              <Upload className="mr-2 h-4 w-4" /> Import
            </button>
            <CopyButton label="Copy Report" onCopy={async () => generateIntradayReportText(batches)} />
          </>
        }
      />

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} className="w-full h-40 border p-2" placeholder="Paste report here..." />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={handleImport} className="px-4 py-2 bg-slate-900 text-white rounded">Import</button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-4 space-y-2">
        {!loading && !error && batches.map((batch: DailyIntradayLog) => (
          <BatchCard key={batch.id} batch={batch} isActive={isTimeReached(batch.startedTime, now)} onFinishedTimeChange={updateFinishedTime} />
        ))}
      </div>
    </>
  );
}

function BatchCard({ batch, isActive, onFinishedTimeChange }: { batch: DailyIntradayLog; isActive: boolean; onFinishedTimeChange: (id: string, time: string | null) => Promise<void>; }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${isActive ? "border-slate-200" : "opacity-60"}`}>
      <div className="flex justify-between items-center">
        <div><p className="font-medium">Batch {batch.batchNumber}</p></div>
        {isActive && (
          <div className="w-28">
            <TimeInput value={shiftToWIB(batch.finishedTimestamp)} onChange={(t) => {
              if (!t) { onFinishedTimeChange(batch.id, null); return; }
              const [h, m, s] = t.split(':').map(Number);
              const d = new Date(); d.setHours(h - 7); d.setMinutes(m); d.setSeconds(s || 0);
              onFinishedTimeChange(batch.id, `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`);
            }} label="Finished" />
          </div>
        )}
      </div>
    </div>
  );
}
