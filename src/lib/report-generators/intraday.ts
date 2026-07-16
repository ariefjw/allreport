import type { DailyIntradayLog } from "@/types";
import { formatDateReport, isTimeReached } from "@/lib/utils";
import { INTRADAY_JOB_NAME } from "@/lib/mock-data";

// Helper untuk mengambil jam mutlak GMT+7 (WIB) tanpa terpengaruh zona waktu server
function getWibTimeParts(isoString: string) {
  const d = new Date(isoString);
  // Geser waktu UTC ke WIB (+7 jam)
  const wibDate = new Date(d.getTime() + 7 * 3600000);
  
  return {
    hh: String(wibDate.getUTCHours()).padStart(2, "0"),
    mm: String(wibDate.getUTCMinutes()).padStart(2, "0"),
    ss: String(wibDate.getUTCSeconds()).padStart(2, "0"),
  };
}

export function generateIntradayReportText(batches: DailyIntradayLog[]): string {
  const now = new Date();
  const dateStr = formatDateReport(now);

  const visibleBatches = batches.filter((b) => isTimeReached(b.startedTime, now));

  const batchLines = visibleBatches.map((batch) => {
    // startedTime biasanya "HH:mm:ss"
    const started = batch.startedTime.substring(0, 5); 
    
    let finished = "";
    if (batch.finishedTimestamp) {
      const { hh, mm } = getWibTimeParts(batch.finishedTimestamp);
      finished = `${hh}:${mm}`;
    }

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
      const { hh, mm, ss } = getWibTimeParts(batch.finishedTimestamp);
      return `${hh}:${mm}:${ss}`;
    })
    .join("\n");
}
