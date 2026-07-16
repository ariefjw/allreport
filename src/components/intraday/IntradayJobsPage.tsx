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
import { formatTimeHM, getTodayDisplay, isTimeReached } from "@/lib/utils";
import type { DailyIntradayLog } from "@/types";
import { Upload } from "lucide-react";

interface UseIntradayJobsResult {
  batches: DailyIntradayLog[];
  loading: boolean;
  error: string | null;
  updateFinishedTime: (id: string, time: string | null) => Promise<void>;
  mutate?: () => Promise<DailyIntradayLog[] | undefined>; // from SWR/React Query
}

type ImportPayload = {
  id: string;
  finishedTime: string; // "HH:mm"
}[];

function parseIntradayReport(
  text: string,
  batches: DailyIntradayLog[],
): ImportPayload {
  const lines = text.split("\n");
  const results: ImportPayload = [];
  const batchMap = new Map(batches.map((b) => [b.batchNumber, b]));

  // Regex to find "- batch X: ... finished HH:MM"
  const lineRegex = /-\s*batch\s*(\d+):.*finished\s*(\d{2}:\d{2})/;

  for (const line of lines) {
    const match = line.trim().match(lineRegex);
    if (match) {
      const batchNumber = parseInt(match[1], 10);
      const finishedTime = match[2]; // "HH:mm"

      const batchData = batchMap.get(batchNumber);
      // IMPORTANT: only add if the batch exists and doesn't have a finished time yet in the current state
      if (batchData && !batchData.finishedTimestamp) {
        results.push({
          id: batchData.id,
          finishedTime: finishedTime,
        });
      }
    }
  }
  return results;
}

export function IntradayJobsPage() {
  // NOTE: The `useIntradayJobs` hook should expose a `mutate` function (from SWR/React Query)
  // to allow for programmatic re-fetching of data.
  const { batches, loading, error, updateFinishedTime, mutate } =
    useIntradayJobs() as UseIntradayJobsResult;

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const completedCount = batches.filter((b) => b.finishedTimestamp).length;
  const now = new Date();

  const handleImport = async () => {
    setIsImporting(true);
    setImportError(null);

    const payload = parseIntradayReport(importText, batches);

    if (payload.length === 0) {
      setImportError(
        "No new batch times found in the text to import, or they are already completed.",
      );
      setIsImporting(false);
      return;
    }

    try {
      const response = await fetch("/api/intraday-jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to import data.");
      }

      // Success
      setIsImportModalOpen(false);
      setImportText("");

      // Re-fetch data to show updates
      if (mutate) {
        mutate();
      } else {
        // Fallback if mutate is not available
        window.location.reload();
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setImportError(e.message);
      } else {
        setImportError("An unknown error occurred during import.");
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Intraday Job Monitoring"
        description={`${INTRADAY_JOB_NAME} — every 30 min (08:30–17:30)`}
        date={getTodayDisplay()}
        actions={
          <>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-10 px-4 py-2"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Report
            </button>
            <CopyButton
              label="Copy Intraday Report"
              onCopy={async () => {
                console.log(
                  "[DEBUG] batches at copy time:",
                  JSON.stringify(
                    batches.map((b) => ({
                      batch: b.batchNumber,
                      finished: b.finishedTimestamp,
                    })),
                  ),
                );
                return generateIntradayReportText(batches);
              }}
            />
            <CopyButton
              label="Copy Finished Time"
              variant="secondary"
              onCopy={async () => generateIntradayFinishedTimeText(batches)}
            />
          </>
        }
      />

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="m-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Import Intraday Report
              </h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              >
                &times;
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Paste the report text below. The system will only update batches
              that are not yet marked as finished.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`cbs_mspayment_intraday\n*13/May/2026*\n- batch 1: started 08:30 finished 08:44\n- batch 2: started 09:30 finished 09:43`}
              className="mt-4 h-48 w-full rounded-md border-slate-300 bg-slate-50 p-2 font-mono text-sm shadow-sm focus:border-slate-500 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
            />
            {importError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {importError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setIsImportModalOpen(false)}
                disabled={isImporting}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-10 px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || !importText}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300 bg-slate-900 text-slate-50 hover:bg-slate-900/90 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90 h-10 px-4 py-2"
              >
                {isImporting ? "Importing..." : "Import & Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        {loading && (
          <p className="py-8 text-center text-sm text-slate-500">
            Loading batches...
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {completedCount}
                  </span>
                  {" / "}
                  {batches.length} batches completed
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {INTRADAY_BATCH_TIMES.length} batches · every 30 min · report
                  shows batches whose start time has passed
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {batches.map((batch) => {
                const isActive = isTimeReached(batch.startedTime, now);
                return (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    isActive={isActive}
                    onFinishedTimeChange={updateFinishedTime}
                  />
                );
              })}
            </div>
          </>
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
  batch: DailyIntradayLog;
  isActive: boolean;
  onFinishedTimeChange: (id: string, time: string | null) => Promise<void>;
}) {
  if (!batch) return null;

  const startedDisplay = batch.startedTime ? String(batch.startedTime).substring(0, 5) : "--:--";

  let finishedDisplay = "";
  if (batch.finishedTimestamp) {
    const d = new Date(batch.finishedTimestamp);
    // Hitung GMT+7 secara matematis agar formatnya bersih 100% "HH:mm" tanpa spasi tersembunyi
    const gmt7Date = new Date(d.getTime() + 7 * 3600000);
    const hh = String(gmt7Date.getUTCHours()).padStart(2, "0");
    const mm = String(gmt7Date.getUTCMinutes()).padStart(2, "0");
    const ss = String(gmt7Date.getUTCSeconds()).padStart(2, "0");
    finishedDisplay = `${hh}:${mm}`;
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${
        isActive
          ? "border-slate-200 dark:border-slate-800"
          : "border-slate-100 opacity-60 dark:border-slate-800/50"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
              batch.finishedTimestamp
                ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                : isActive
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            {batch.batchNumber}
          </span>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Batch {batch.batchNumber}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Started: {startedDisplay}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-11 sm:pl-0">
          {!isActive && (
            <span className="text-xs text-slate-400">Not yet started</span>
          )}
          {isActive && (
            <div className="w-28">
              <TimeInput
                value={finishedDisplay}
                onChange={(time) => onFinishedTimeChange(batch.id, time)}
                label="Finished"
              />
            </div>
          )}
          {batch.finishedTimestamp && (
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
              Done
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
