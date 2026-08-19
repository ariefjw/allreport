import type { DailyIntradayLog } from "@/types";

export type IntradayImportItem = {
  id: string;
  startedTime?: string;
  finishedTime?: string;
};

export function normalizeImportTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export function parseIntradayReport(text: string, batches: DailyIntradayLog[]): IntradayImportItem[] {
  const lines = text.split("\n");
  const results: IntradayImportItem[] = [];
  const batchMap = new Map(batches.map((b) => [b.batchNumber, b]));
  const lineRegex = /-\s*batch\s*(\d+):\s*started\s*(\d{2}:\d{2})(?:\s*finished\s*(\d{2}:\d{2}))?/i;

  for (const line of lines) {
    const match = line.trim().match(lineRegex);
    if (!match) continue;

    const batchNumber = parseInt(match[1], 10);
    const startedTime = normalizeImportTime(match[2]);
    const finishedTime = match[3] ? normalizeImportTime(match[3]) : undefined;
    const batch = batchMap.get(batchNumber);
    if (!batch) continue;

    const item: IntradayImportItem = { id: batch.id };
    if (startedTime !== batch.startedTime.substring(0, 8)) {
      item.startedTime = startedTime;
    }
    if (finishedTime && !batch.finishedTimestamp) {
      item.finishedTime = finishedTime;
    }
    if (item.startedTime || item.finishedTime) {
      results.push(item);
    }
  }

  return results;
}
