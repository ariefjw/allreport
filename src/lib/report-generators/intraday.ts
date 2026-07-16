import type { DailyIntradayLog } from "@/types";
import { formatDateReport, isTimeReached } from "@/lib/utils";
import { INTRADAY_JOB_NAME } from "@/lib/mock-data";

export function generateIntradayReportText(batches: DailyIntradayLog[]): string {
  const now = new Date();
  const dateStr = formatDateReport(now);

  const visibleBatches = batches.filter((b) => isTimeReached(b.startedTime, now));

  const batchLines = visibleBatches.map((batch) => {
    // Ambil jam start (HH:mm)
    const started = batch.startedTime.substring(0, 5);
    
    // Ambil jam finished (HH:mm:ss) dari database
    let finished = "";
    if (batch.finishedTimestamp) {
        // Karena sekarang sudah tersimpan dalam format WIB yang benar di DB,
        // kita tinggal ambil 5 karakter pertama (HH:mm)
        const rawFinished = batch.finishedTimestamp.toString();
        // Coba cari pola HH:mm:ss atau HH:mm
        const match = rawFinished.match(/(\d{2}):(\d{2})/);
        if (match) {
            finished = `${match[1]}:${match[2]}`;
        }
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
      // Langsung ambil HH:mm:ss tanpa parsing rumit
      return batch.finishedTimestamp.substring(0, 8);
    })
    .join("\n");
}
