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

export interface DbAlarmSchedule {
  id: string;
  user_id: string;
  alarm_time: string;
  label: string;
  days_of_week: number;
  target_page: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbAuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  changed_by: string | null;
  old_data: unknown;
  new_data: unknown;
  created_at: string;
}

export interface DbPushToken {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  created_at: string;
}

export interface DbTimesheetProfile {
  id: string;
  user_id: string;
  employee_no: string;
  full_name: string;
  signature_path: string | null;
  signature_mime: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTimesheetEntry {
  id: string;
  user_id: string;
  operational_month: number;
  operational_year: number;
  employee_no: string;
  full_name: string;
  organization: string;
  position: string;
  client: string;
  project: string;
  schedule_text: string;
  auto_holiday: boolean;
  manual_holidays: string | null;
  holiday_days: number[];
  total_hours: number | null;
  has_signature: boolean;
  created_at: string;
}
