"use client";

import { useState, useMemo, useEffect } from "react";
import { useIntradayJobs } from "@/hooks/useIntradayJobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { StatusSummary } from "@/components/ui/StatusSummary";
import { JobGroup } from "@/components/ui/JobGroup";
import { TimeInput } from "@/components/ui/TimeInput";
import { INTRADAY_JOB_NAME } from "@/lib/mock-data";
import {
  generateIntradayReportText,
  generateIntradayFinishedTimeText,
} from "@/lib/report-generators/intraday";
import { getTodayDisplay, isTimeReached } from "@/lib/utils";
import { Upload, X } from "lucide-react";
import type { DailyIntradayLog } from "@/types";

function shiftToWIB(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return timestamp;

  let h = parseInt(match[1], 10);
  const m = match[2];
  const s = match[3];

  h = (h + 7) % 24;

  return `${String(h).padStart(2, "0")}:${m}:${s}`;
}

function getBatchStatus(batch: DailyIntradayLog, now: Date): string {
  if (batch.finishedTimestamp) return "done";
  if (isTimeReached(batch.startedTime, now)) return "active";
  return "waiting";
}

type ImportPayload = {
  id: string;
  finishedTime: string;
}[];

function parseIntradayReport(text: string, batches: DailyIntradayLog[]): ImportPayload {
  const lines = text.split("\n");
  const results: ImportPayload = [];
  const batchMap = new Map(batches.map((b) => [b.batchNumber, b]));
  const lineRegex = /-\s*batch\s*(\d+):.*finished\s*(\d{2}:\d{2})/;

  for (const line of lines) {
    const match = line.trim().match(lineRegex);
    if (match) {
      const batchNumber = parseInt(match[1], 10);
      const finishedTime = match[2];
      const batchData = batchMap.get(batchNumber);
      if (batchData && !batchData.finishedTimestamp) {
        results.push({ id: batchData.id, finishedTime: finishedTime });
      }
    }
  }
  return results;
}

const STATUS_CFG: Record<string, { label: string; short: string; dot: string; text: string }> = {
  active: { label: "Active", short: "RUN", dot: "bg-amber-400", text: "text-amber-600" },
  done: { label: "Done", short: "DONE", dot: "bg-green-400", text: "text-green-600" },
  waiting: { label: "Waiting", short: "WAIT", dot: "bg-slate-300", text: "text-slate-400" },
};

export function IntradayJobsPage() {
  const { batches, loading, error, updateFinishedTime, bulkImportFinishedTimes } = useIntradayJobs();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, DailyIntradayLog[]> = {
      active: [],
      done: [],
      waiting: [],
    };
    batches.forEach((batch) => {
      const status = getBatchStatus(batch, now);
      groups[status]?.push(batch);
    });
    return groups;
  }, [batches, now]);

  const summary = {
    waiting: grouped.waiting.length,
    running: grouped.active.length,
    done: grouped.done.length,
    failed: 0,
  };

  const getReportReadyBatches = () => {
    return batches.map((b) => ({
      ...b,
      finishedTimestamp: shiftToWIB(b.finishedTimestamp),
    }));
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportError(null);
    const payload = parseIntradayReport(importText, batches);

    if (payload.length === 0) {
      setImportError("No new batch times found in the text to import, or they are already completed.");
      setIsImporting(false);
      return;
    }

    try {
      await bulkImportFinishedTimes(payload);
      setIsImportModalOpen(false);
      setImportText("");
    } catch (e: unknown) {
      if (e instanceof Error) setImportError(e.message);
      else setImportError("An unknown error occurred during import.");
    } finally {
      setIsImporting(false);
    }
  };

  const sections: { status: string; title: string; defaultExpanded: boolean }[] = [
    { status: "active", title: "Active", defaultExpanded: true },
    { status: "done", title: "Done", defaultExpanded: false },
    { status: "waiting", title: "Waiting", defaultExpanded: false },
  ];

  return (
    <>
      <PageHeader
        title="Intraday Job Monitoring"
        description={`${INTRADAY_JOB_NAME} — every 30 min (08:30–17:30)`}
        date={getTodayDisplay()}
        actions={
          <div className="flex items-center gap-2">
            <CopyButton
              label="Copy Intraday Report"
              onCopy={async () => generateIntradayReportText(getReportReadyBatches())}
            />
            <CopyButton
              label="Copy Finished Time"
              variant="secondary"
              onCopy={async () => generateIntradayFinishedTimeText(getReportReadyBatches())}
            />
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="btn-primary"
            >
              <Upload className="h-4 w-4" strokeWidth={1.5} />
              Import
            </button>
          </div>
        }
      />

      <StatusSummary {...summary} />

      <div className="mx-auto max-w-6xl">
        {loading && <p className="py-8 text-center text-sm text-slate-500">Loading batches...</p>}
        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

        {!loading && !error && sections.map(({ status, title, defaultExpanded }) => {
          const items = grouped[status];
          if (!items?.length) return null;

          return (
            <JobGroup key={status} status={status} title={title} count={items.length} defaultExpanded={defaultExpanded}>
              {items.map((batch) => (
                <BatchRow
                  key={batch.id}
                  batch={batch}
                  onFinishedTimeChange={updateFinishedTime}
                />
              ))}
            </JobGroup>
          );
        })}

        {!loading && !error && batches.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">No batches loaded.</p>
        )}
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card m-4 w-full max-w-lg">
            <div className="card-header flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Import Intraday Report
                </h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Paste the report text below. Only unfinished batches will be updated.
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="btn-ghost p-1.5"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="card-body">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`cbs_mspayment_intraday\n*13/May/2026*\n- batch 1: started 08:30 finished 08:44\n- batch 2: started 09:30 finished 09:43`}
                className="input h-48 resize-none font-mono text-sm"
              />
              {importError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{importError}</p>}
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isImporting}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting || !importText}
                  className="btn-primary"
                >
                  {isImporting ? "Importing..." : "Import & Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BatchRow({
  batch,
  onFinishedTimeChange,
}: {
  batch: DailyIntradayLog;
  onFinishedTimeChange: (id: string, time: string | null) => Promise<void>;
}) {
  const isDone = !!batch.finishedTimestamp;
  const isActive = !isDone && isTimeReached(batch.startedTime, new Date());
  const status = isDone ? "done" : isActive ? "active" : "waiting";
  const cfg = STATUS_CFG[status];
  const safeFinishedTimestamp = shiftToWIB(batch.finishedTimestamp);
  const startedDisplay = batch.startedTime.substring(0, 5);

  return (
    <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
        isDone
          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
          : isActive
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
      }`}>
        {batch.batchNumber}
      </span>
      <span className="text-xs tabular-nums text-slate-500">{startedDisplay}</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${status === "active" ? "animate-pulse" : ""}`} />
        <span className="hidden sm:inline">{cfg.short}</span>
      </span>
      {(isActive || isDone) && (
        <div className="w-20 shrink-0 sm:w-24">
          <TimeInput
            value={safeFinishedTimestamp}
            onChange={(time) => onFinishedTimeChange(batch.id, time)}
          />
        </div>
      )}
    </div>
  );
}
