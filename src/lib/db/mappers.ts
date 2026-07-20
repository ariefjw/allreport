import type {
  DailyMonitoringLog,
  DailyIntradayLog,
  DailyErrorLog,
} from "@/types";
import type {
  DbDailyMonitoringLog,
  DbDailyIntradayLog,
  DbDailyErrorLog,
} from "./types";

function formatTimeFromDb(time: string): string {
  if (time.includes("T")) {
    const d = new Date(time);
    return d.toISOString().slice(11, 19);
  }
  return time.length === 5 ? `${time}:00` : time;
}

function formatFinishedTime(ts: string | null): string | null {
  if (!ts) return null;
  return formatTimeFromDb(ts);
}

export function mapCriticalLog(row: DbDailyMonitoringLog): DailyMonitoringLog {
  return {
    id: row.id,
    operationalDate: row.operational_date,
    jobId: row.job_id,
    jobName: row.job_name,
    scheduledTimestamp: row.scheduled_timestamp,
    endTimestamp: row.end_timestamp,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export function mapIntradayLog(row: DbDailyIntradayLog): DailyIntradayLog {
  return {
    id: row.id,
    operationalDate: row.operational_date,
    batchId: row.batch_id,
    batchNumber: row.batch_number,
    startedTime: formatTimeFromDb(row.started_time),
    finishedTimestamp: formatFinishedTime(row.finished_timestamp),
    updatedAt: row.updated_at,
  };
}

export function mapErrorLog(row: DbDailyErrorLog): DailyErrorLog {
  return {
    id: row.id,
    operationalDate: row.operational_date,
    errorTitle: row.error_title,
    errorTextLog: row.error_text_log,
    screenshotUrl: row.screenshot_url,
    createdAt: row.created_at,
  };
}
