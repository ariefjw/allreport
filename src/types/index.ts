export type JobStatus = "*WAITING*" | "*RUNNING*" | "*DONE*" | "*FAILED*";

export interface MasterJob {
  id: number;
  jobName: string;
  defaultScheduleTime: string;
  isCrossDay: boolean;
}

export interface DailyMonitoringLog {
  id: string;
  operationalDate: string;
  jobId: number;
  jobName: string;
  scheduledTimestamp: string;
  endTimestamp: string | null;
  status: JobStatus;
  updatedAt: string;
}

export interface MasterIntradayBatch {
  id: number;
  batchNumber: number;
  defaultStartedTime: string;
}

export interface DailyIntradayLog {
  id: string;
  operationalDate: string;
  batchId: number;
  batchNumber: number;
  startedTime: string;
  finishedTimestamp: string | null;
  updatedAt: string;
}

export interface DailyErrorLog {
  id: string;
  operationalDate: string;
  errorTitle: string;
  errorTextLog: string;
  screenshotUrl: string | null;
  createdAt: string;
}

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: "critical" | "intraday" | "error";
}
