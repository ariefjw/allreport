import type { DailyMonitoringLog } from "@/types";
import { formatDateReport, formatTimeHM, calcDuration } from "@/lib/utils";

export function generateCriticalReportText(jobs: DailyMonitoringLog[]): string {
  const now = new Date();
  const dateStr = formatDateReport(now);
  const timeStr = formatTimeHM(now);

  const lines = jobs.map((job, index) => {
    const scheduled = new Date(job.scheduledTimestamp);
    const startTime = formatTimeHM(scheduled);
    const endTime = job.endTimestamp ? formatTimeHM(new Date(job.endTimestamp)) : "";

    return [
      `${index + 1}.${job.jobName}`,
      `${startTime} - ${endTime}`,
      job.status,
    ].join("\n");
  });

  return [
    "Dear all,",
    "Berikut update status job priority airflow",
    `*${dateStr}* - *${timeStr}*`,
    "",
    lines.join("\n\n"),
    "",
  ].join("\n");
}

export function generateCriticalDurationText(jobs: DailyMonitoringLog[]): string {
  return jobs
    .map((job) => {
      if (job.status !== "*DONE*" || !job.endTimestamp) return "";
      const start = new Date(job.scheduledTimestamp);
      const end = new Date(job.endTimestamp);
      return calcDuration(start, end);
    })
    .join("\n");
}
