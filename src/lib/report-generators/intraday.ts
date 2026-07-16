import type { DailyIntradayLog } from "@/types";
import { formatDateReport, parseTimeString, isTimeReached } from "@/lib/utils";
import { INTRADAY_JOB_NAME } from "@/lib/mock-data";

function formatTimeFromString(time: string): string {
  const { hours, minutes } = parseTimeString(time);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Helper untuk mendapatkan objek Date dengan nilai waktu lokal GMT+7 (Asia/Jakarta).
 * Memastikan fungsi eksternal seperti formatDateReport dan isTimeReached 
 * membaca tanggal dan jam yang benar meski server berada di UTC.
 */
function getNowGMT7(): Date {
  const now = new Date();
  // Konversi waktu saat ini ke string berdasarkan zona waktu Jakarta
  const gmt7String = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  // Buat ulang objek Date dari string tersebut
  return new Date(gmt7String);
}

export function generateIntradayReportText(batches: DailyIntradayLog[]): string {
  // Gunakan Date yang sudah disesuaikan ke GMT+7
  const now = getNowGMT7();
  const dateStr = formatDateReport(now);

  const visibleBatches = batches.filter((b) => isTimeReached(b.startedTime, now));

  const batchLines = visibleBatches.map((batch) => {
    const started = formatTimeFromString(batch.startedTime);
    const finished = batch.finishedTimestamp
      ? formatTimeFromString(batch.finishedTimestamp)
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
      const [h, m, s] = batch.finishedTimestamp.split(":");
      return `${h}:${m}:${s ?? "00"}`;
    })
    .join("\n");
}
