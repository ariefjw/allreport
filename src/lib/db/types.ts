import type { JobStatus } from "@/types";

export interface DbMasterJob {
  id: number;
  job_name: string;
  default_schedule_time: string;
  is_cross_day: boolean;
}

export interface DbDailyMonitoringLog {
  id: string;
  operational_date: string;
  job_id: number;
  job_name: string;
  scheduled_timestamp: string;
  end_timestamp: string | null;
  status: JobStatus;
  updated_at: string;
}

export interface DbDailyIntradayLog {
  id: string;
  operational_date: string;
  batch_id: number;
  batch_number: number;
  started_time: string;
  finished_timestamp: string | null;
  updated_at: string;
}

export interface DbDailyErrorLog {
  id: string;
  operational_date: string;
  error_title: string;
  error_text_log: string;
  screenshot_url: string | null;
  created_at: string;
}

export interface DbMasterIntradayBatch {
  id: number;
  intraday_job_id: number;
  batch_number: number;
  default_started_time: string;
}
