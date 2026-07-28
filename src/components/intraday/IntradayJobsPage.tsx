"use client";

import { useState, useMemo, useEffect } from "react";
import { useIntradayJobs } from "@/hooks/useIntradayJobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { KpiBar } from "@/components/ui/KpiBar";
import { JobGroup } from "@/components/ui/JobGroup";
import { TimeInput } from "@/components/ui/TimeInput";
import { INTRADAY_JOB_NAME } from "@/lib/mock-data";
import {
  generateIntradayReportText,
  generateIntradayFinishedTimeText,
} from "@/lib/report-generators/intraday";
import { getTodayDisplay, isTimeReached } from "@/lib/utils";
import { Upload } from "lucide-react";
import { ImportModal } from "@/components/ui/ImportModal";
import { SkeletonCard } from "@/components/ui/Skeleton";
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
  active: { label: "Active", short: "RUN", dot: "bg-status-running", text: "text-status-running" },
  done: { label: "Done", short: "DONE", dot: "bg-status-done", text: "text-status-done" },
  waiting: { label: "Waiting", short: "WAIT", dot: "bg-status-waiting", text: "text-muted" },
};

export function IntradayJobsPage() {
  const { batches, loading, error, updateFinishedTime, bulkImportFinishedTimes } = useIntradayJobs();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      if (statusFilter === "all") return true;
      const status = getBatchStatus(batch, now);
      if (statusFilter === "active" && status !== "active") return false;
      if (statusFilter === "done" && status !== "done") return false;
      if (statusFilter === "waiting" && status !== "waiting") return false;
      return true;
    }).filter((batch) => {
      if (!searchText) return true;
      return String(batch.batchNumber).includes(searchText) ||
        batch.startedTime.includes(searchText);
    });
  }, [batches, searchText, statusFilter, now]);

  const grouped = useMemo(() => {
    const groups: Record<string, DailyIntradayLog[]> = {
      active: [],
      done: [],
      waiting: [],
    };
    filteredBatches.forEach((batch) => {
      const status = getBatchStatus(batch, now);
      groups[status]?.push(batch);
    });
    return groups;
  }, [filteredBatches, now]);

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

  const sections: { status: string; title: string; defaultExpanded: boolean }[] = [
    { status: "active", title: "Active", defaultExpanded: true },
    { status: "done", title: "Done", defaultExpanded: false },
    { status: "waiting", title: "Waiting", defaultExpanded: false },
  ];

  const headerActions = (
    <>
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
    </>
  );

  return (
    <>
      <PageHeader
        title="Intraday Job Monitoring"
        description={`${INTRADAY_JOB_NAME} — every 30 min (08:30–17:30)`}
        date={getTodayDisplay()}
        glow="blue"
        actions={headerActions}
        mobileActions={headerActions}
      />

      <KpiBar {...summary} />

      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <input
            type="text"
            placeholder="Search batch..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="input h-8 px-3 py-0 text-xs sm:w-40"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input h-8 w-auto px-3 py-0 text-xs"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
            <option value="waiting">Waiting</option>
          </select>
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-status-running animate-pulse" />
              Refreshing...
            </span>
          )}
        </div>
        {error && <p className="mx-4 mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive sm:mx-6">{error}</p>}

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
          <p className="py-12 text-center text-sm text-muted">No batches loaded.</p>
        )}
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
        }}
        onImport={async (text) => {
          const payload = parseIntradayReport(text, batches);
          if (payload.length === 0) {
            throw new Error("No new batch times found in the text to import, or they are already completed.");
          }
          await bulkImportFinishedTimes(payload);
        }}
        title="Import Intraday Report"
        description="Paste the report text below. Only unfinished batches will be updated."
        placeholder="cbs_mspayment_intraday\n*13/May/2026*\n- batch 1: started 08:30 finished 08:44\n- batch 2: started 09:30 finished 09:43"
      />
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
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-white/[0.02]">
      <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
        isDone
          ? "bg-status-done/15 text-status-done"
          : isActive
            ? "bg-status-running/15 text-status-running"
            : "bg-surface-elevated text-muted"
      }`}>
        {batch.batchNumber}
      </span>
      <span className="text-xs tabular-nums text-muted whitespace-nowrap">{startedDisplay}</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
        <span className={`h-2 w-2 rounded-full ${cfg.dot} ${status === "active" ? "animate-pulse" : ""}`} />
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
