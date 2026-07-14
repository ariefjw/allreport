import type { DailyErrorLog } from "@/types";
import { formatDateReport } from "@/lib/utils";

export function generateErrorReportText(logs: DailyErrorLog[]): string {
  const dateStr = formatDateReport(new Date());

  const entries = logs.map((log, index) => {
    const screenshot = log.screenshotUrl ?? "[No screenshot attached]";
    return [
      `${index + 1}. Isu: ${log.errorTitle}`,
      `   Detail: ${log.errorTextLog}`,
      `   Bukti: ${screenshot}`,
    ].join("\n");
  });

  return [
    "REPORT ERROR OPERATIONAL",
    `Tanggal: *${dateStr}*`,
    "",
    ...entries,
    "",
  ].join("\n");
}
