import type { DailyIntradayLog } from "@/types";
import { formatDateReport, parseTimeString, isTimeReached } from "@/lib/utils";
import { INTRADAY_JOB_NAME } from "@/lib/mock-data";

// Helper untuk waktu mulai (format "08:30:00")
function formatTimeFromShortString(time: string): string {
  if (!time) return "";
  const { hours, minutes } = parseTimeString(time);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Helper untuk waktu selesai dari Supabase (format UTC ISO "2026-07-16T08:30:00Z")
function formatTimeFromISO(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  // Pastikan output selalu GMT+7 (WIB) berapapun zona waktu servernya
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function generateIntradayReportText(batches: DailyIntradayLog[]): string {
  const now = new Date();
  const dateStr = formatDateReport(now);

  const visibleBatches = batches.filter((b) => b.startedTime ? isTimeReached(b.startedTime, now) : false);

  const batchLines = visibleBatches.map((batch) => {
    const started = formatTimeFromShortString(batch.startedTime);
    // Gunakan fungsi ISO khusus agar tidak kacau
    const finished = batch.finishedTimestamp
      ? formatTimeFromISO(batch.finishedTimestamp)
      : "";

    return `- batch ${batch.batchNumber}: started ${started}${finished ? ` finished ${finished}` : ""}`;
  });

  return [
    INTRADAY_JOB_NAME,
    `*${dateStr}*`,
    ...batchLines,
    "",
  ].join("\n");
}

export function generateIntradayFinishedTimeText(batches: DailyIntradayLog[]): string {
  return batches
    .map((batch) => {
      if (!batch.finishedTimestamp) return "";
      const d = new Date(batch.finishedTimestamp);
      // Format ke HH:mm:ss dalam GMT+7
      return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(d);
    })
    .join("\n");
}
