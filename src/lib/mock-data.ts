import type { DailyMonitoringLog, DailyIntradayLog, MasterJob } from "@/types";
import { getOperationalDate, getCriticalOperationalDate } from "@/lib/operational-date";

const MASTER_JOBS: Omit<MasterJob, "id">[] = [
  { jobName: "cbs_tradefinance_to_landing", defaultScheduleTime: "22:30:00", isCrossDay: true },
  { jobName: "cbs_loan_to_landing", defaultScheduleTime: "22:30:00", isCrossDay: true },
  { jobName: "cbs_deposit_to_landing", defaultScheduleTime: "23:00:00", isCrossDay: true },
  { jobName: "dag_ers_job (egl)", defaultScheduleTime: "00:00:00", isCrossDay: false },
  { jobName: "dag_cbs_payment_job", defaultScheduleTime: "00:30:00", isCrossDay: false },
  { jobName: "dag_cbs_transfer_job", defaultScheduleTime: "01:00:00", isCrossDay: false },
  { jobName: "dag_cbs_card_job", defaultScheduleTime: "01:30:00", isCrossDay: false },
  { jobName: "dag_cbs_loan_job", defaultScheduleTime: "02:00:00", isCrossDay: false },
  { jobName: "dag_cbs_deposit_job", defaultScheduleTime: "02:30:00", isCrossDay: false },
  { jobName: "dag_cbs_fx_job", defaultScheduleTime: "03:00:00", isCrossDay: false },
  { jobName: "dag_cbs_trade_job", defaultScheduleTime: "03:30:00", isCrossDay: false },
  { jobName: "dag_cbs_treasury_job", defaultScheduleTime: "04:00:00", isCrossDay: false },
  { jobName: "dag_cbs_investment_job", defaultScheduleTime: "04:30:00", isCrossDay: false },
  { jobName: "dag_cbs_insurance_job", defaultScheduleTime: "05:00:00", isCrossDay: false },
  { jobName: "dag_cbs_wealth_job", defaultScheduleTime: "05:30:00", isCrossDay: false },
  { jobName: "dag_cbs_retail_job", defaultScheduleTime: "06:00:00", isCrossDay: false },
  { jobName: "dag_cbs_corporate_job", defaultScheduleTime: "06:30:00", isCrossDay: false },
  { jobName: "dag_cbs_sme_job", defaultScheduleTime: "07:00:00", isCrossDay: false },
  { jobName: "dag_cbs_digital_job", defaultScheduleTime: "07:30:00", isCrossDay: false },
  { jobName: "dag_cbs_channel_job", defaultScheduleTime: "08:00:00", isCrossDay: false },
  { jobName: "dag_cbs_atm_job", defaultScheduleTime: "08:30:00", isCrossDay: false },
  { jobName: "dag_cbs_pos_job", defaultScheduleTime: "09:00:00", isCrossDay: false },
  { jobName: "dag_cbs_mobile_job", defaultScheduleTime: "09:30:00", isCrossDay: false },
  { jobName: "dag_cbs_internet_job", defaultScheduleTime: "10:00:00", isCrossDay: false },
  { jobName: "dag_cbs_branch_job", defaultScheduleTime: "10:30:00", isCrossDay: false },
  { jobName: "dag_cbs_callcenter_job", defaultScheduleTime: "11:00:00", isCrossDay: false },
  { jobName: "dag_cbs_compliance_job", defaultScheduleTime: "11:30:00", isCrossDay: false },
  { jobName: "dag_cbs_risk_job", defaultScheduleTime: "12:00:00", isCrossDay: false },
  { jobName: "dag_cbs_audit_job", defaultScheduleTime: "12:30:00", isCrossDay: false },
  { jobName: "dag_cbs_finance_job", defaultScheduleTime: "13:00:00", isCrossDay: false },
  { jobName: "dag_cbs_accounting_job", defaultScheduleTime: "13:30:00", isCrossDay: false },
  { jobName: "dag_cbs_hr_job", defaultScheduleTime: "14:00:00", isCrossDay: false },
  { jobName: "dag_cbs_it_job", defaultScheduleTime: "14:30:00", isCrossDay: false },
  { jobName: "dag_cbs_security_job", defaultScheduleTime: "15:00:00", isCrossDay: false },
  { jobName: "dag_cbs_ops_job", defaultScheduleTime: "15:30:00", isCrossDay: false },
  { jobName: "dag_cbs_report_job", defaultScheduleTime: "16:00:00", isCrossDay: false },
  { jobName: "dag_cbs_archive_job", defaultScheduleTime: "16:30:00", isCrossDay: false },
  { jobName: "dag_cbs_backup_job", defaultScheduleTime: "17:00:00", isCrossDay: false },
  { jobName: "dag_cbs_cleanup_job", defaultScheduleTime: "17:30:00", isCrossDay: false },
  { jobName: "dag_cbs_reconcile_job", defaultScheduleTime: "18:00:00", isCrossDay: false },
  { jobName: "dag_cbs_validate_job", defaultScheduleTime: "18:30:00", isCrossDay: false },
];

function buildScheduledTimestamp(
  operationalDate: string,
  scheduleTime: string,
  isCrossDay: boolean
): string {
  const base = new Date(operationalDate + "T00:00:00");
  if (!isCrossDay) {
    base.setDate(base.getDate() + 1);
  }
  const [h, m, s] = scheduleTime.split(":").map(Number);
  base.setHours(h!, m!, s!, 0);
  return base.toISOString();
}

export function generateMockCriticalJobs(): DailyMonitoringLog[] {
  const operationalDate = getCriticalOperationalDate();
  const now = new Date();

  return MASTER_JOBS.map((job, index) => {
    const scheduledTimestamp = buildScheduledTimestamp(
      operationalDate,
      job.defaultScheduleTime,
      job.isCrossDay
    );
    const scheduled = new Date(scheduledTimestamp);

    let status: DailyMonitoringLog["status"] = "*WAITING*";
    let endTimestamp: string | null = null;

    if (now >= scheduled) {
      status = "*RUNNING*";
    }

    if (index === 0) {
      status = "*DONE*";
      const end = new Date(scheduled);
      end.setMinutes(end.getMinutes() + 17);
      endTimestamp = end.toISOString();
    } else if (index === 1) {
      status = "*DONE*";
      const end = new Date(scheduled);
      end.setMinutes(end.getMinutes() + 8);
      endTimestamp = end.toISOString();
    } else if (index === 35) {
      status = "*FAILED*";
    }

    return {
      id: `job-${index + 1}`,
      operationalDate,
      jobId: index + 1,
      jobName: job.jobName,
      scheduledTimestamp,
      endTimestamp,
      status,
      updatedAt: new Date().toISOString(),
    };
  });
}

import { INTRADAY_BATCH_TIMES } from "@/lib/intraday-schedule";

export const INTRADAY_JOB_NAME = "cbs_mspayment_intraday";

export { INTRADAY_BATCH_TIMES };

export function generateMockIntradayLogs(): DailyIntradayLog[] {
  const operationalDate = getOperationalDate();

  return INTRADAY_BATCH_TIMES.map((time, index) => ({
    id: `batch-${index + 1}`,
    operationalDate,
    batchId: index + 1,
    batchNumber: index + 1,
    startedTime: time,
    finishedTimestamp: index < 3 ? time.replace(/(\d{2}):(\d{2}):(\d{2})/, (_, h, m) => `${h}:${String(Number(m) + 14).padStart(2, "0")}:00`) : null,
    updatedAt: new Date().toISOString(),
  }));
}

export const MOCK_ERROR_LOGS = [
  {
    id: "err-1",
    operationalDate: getOperationalDate(),
    errorTitle: "Timeout Airflow Job cbs_tradefinance_to_landing",
    errorTextLog:
      "AirflowException: Task timeout after 3600 seconds\nDAG: cbs_tradefinance_to_landing\nTask: load_to_staging\nRetry: 3/3 exhausted",
    screenshotUrl: null,
    createdAt: new Date().toISOString(),
  },
];
