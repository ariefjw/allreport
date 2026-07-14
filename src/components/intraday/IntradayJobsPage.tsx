"use client";

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

export function IntradayJobsPage() {
  const { batches, loading, error, updateFinishedTime } = useIntradayJobs();

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
            <CopyButton
              label="Copy Intraday Report"
              onCopy={async () => {
                console.log("[DEBUG] batches at copy time:", JSON.stringify(batches.map(b => ({ batch: b.batchNumber, finished: b.finishedTimestamp }))));
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

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        {loading && (
          <p className="py-8 text-center text-sm text-slate-500">Loading batches...</p>
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
                  <span className="font-semibold text-green-600 dark:text-green-400">{completedCount}</span>
                  {" / "}
                  {batches.length} batches completed
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {INTRADAY_BATCH_TIMES.length} batches · every 30 min · report shows batches whose start time has passed
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
  const startedDisplay = formatTimeHM(
    new Date(`1970-01-01T${batch.startedTime}`)
  );

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${
        isActive ? "border-slate-200 dark:border-slate-800" : "border-slate-100 opacity-60 dark:border-slate-800/50"
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
            <p className="text-xs text-slate-500 dark:text-slate-400">Started: {startedDisplay}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-11 sm:pl-0">
          {!isActive && (
            <span className="text-xs text-slate-400">Not yet started</span>
          )}
          {isActive && (
            <div className="w-28">
              <TimeInput
                value={batch.finishedTimestamp}
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
