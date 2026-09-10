import type { DailyMonitoringLog } from "@/types";

export interface PredictionResult {
  id: string;
  jobName: string;
  scheduledTime: string;
  predictedEndTime: Date;
  delayMinutes: number;
  cause: string;
}

// L0 -> L1 Median Gaps
const GAP_CMS_MINUTES = 18;
const GAP_HIST_MINUTES = 14;

const L0_CMS_ID = 4; // cms_cccore_to_datalake
const L1_CMS_ID = 8; // ods_cms_data_metric
const L0_EQ_NET_IDS = [6, 18, 19]; // equation_batch_btpmis, equation_batch_data_metric, NET_POS_HIST_RLUD_Job (ymis excluded)
const L1_HIST_ID = 20; // ods_to_staging_and_history_data_metric

// C=ods_cms, H=ods_hist, B=max(both), CC=cccore
// g = median gap; ponytail: tambah tabel job_dependencies bila perlu
const L2_CONFIG: Record<string, { p: "C" | "H" | "B" | "CC"; g: number }> = {
  "tfms_daily_metric_net": { p: "CC", g: 44 },
  "eadvis_batch_airflow": { p: "H", g: 5 },
  "cms_dlk_to_efs": { p: "B", g: 59 },
  "cbs_loaniq_to_ods": { p: "H", g: 80 },
  "cbs_tradefinance_to_ods": { p: "H", g: 77 },
  "cbs_treasury_to_ods": { p: "H", g: 75 },
  "cbs_mspayment": { p: "H", g: 78 },
  "dag_exus_job": { p: "B", g: 68 },
};

function getJobById(jobs: DailyMonitoringLog[], id: number) {
  return jobs.find((j) => j.jobId === id);
}

function getBaseTime(job: DailyMonitoringLog | undefined): Date | null {
  if (!job) return null;
  if (job.status === "*DONE*" && job.endTimestamp) {
    return new Date(job.endTimestamp);
  }
  if (job.status === "*RUNNING*") {
    return new Date(Date.now() + 5 * 60000);
  }
  return null;
}

export function calculatePredictions(jobs: DailyMonitoringLog[]): PredictionResult[] {
  const results: PredictionResult[] = [];
  if (!jobs || jobs.length === 0) return results;

  // L1 CMS
  let predOdsCmsTime: Date | null = null;
  const cccore = getJobById(jobs, L0_CMS_ID);
  const odsCms = getJobById(jobs, L1_CMS_ID);
  const baseCccore = getBaseTime(cccore);
  
  if (baseCccore && odsCms?.status === "*RUNNING*") {
    predOdsCmsTime = new Date(baseCccore.getTime() + GAP_CMS_MINUTES * 60000);
    const delay = Math.round((predOdsCmsTime.getTime() - new Date(odsCms.scheduledTimestamp).getTime()) / 60000);
    if (delay > 0) {
      results.push({
        id: odsCms.id, jobName: odsCms.jobName, scheduledTime: odsCms.scheduledTimestamp,
        predictedEndTime: predOdsCmsTime, delayMinutes: delay, cause: `Menunggu cms_cccore_to_datalake (+${GAP_CMS_MINUTES}m)`,
      });
    }
  }

  // L1 Hist
  let predOdsHistTime: Date | null = null;
  const odsHist = getJobById(jobs, L1_HIST_ID);
  let maxEqNetTime = 0;
  let slowParentName = "";

  L0_EQ_NET_IDS.forEach((id) => {
    const p = getJobById(jobs, id);
    const base = getBaseTime(p);
    if (base && base.getTime() > maxEqNetTime) {
      maxEqNetTime = base.getTime();
      slowParentName = p!.jobName;
    }
  });

  if (maxEqNetTime > 0 && odsHist?.status === "*RUNNING*") {
    predOdsHistTime = new Date(maxEqNetTime + GAP_HIST_MINUTES * 60000);
    const delay = Math.round((predOdsHistTime.getTime() - new Date(odsHist.scheduledTimestamp).getTime()) / 60000);
    if (delay > 0) {
      results.push({
        id: odsHist.id, jobName: odsHist.jobName, scheduledTime: odsHist.scheduledTimestamp,
        predictedEndTime: predOdsHistTime, delayMinutes: delay, cause: `Menunggu ${slowParentName} (+${GAP_HIST_MINUTES}m)`,
      });
    }
  }

  // L2 Sensing
  const tCms = odsCms?.status === "*DONE*" && odsCms.endTimestamp ? new Date(odsCms.endTimestamp).getTime() : (predOdsCmsTime?.getTime() || getBaseTime(odsCms)?.getTime() || 0);
  const tHist = odsHist?.status === "*DONE*" && odsHist.endTimestamp ? new Date(odsHist.endTimestamp).getTime() : (predOdsHistTime?.getTime() || getBaseTime(odsHist)?.getTime() || 0);
  const tCccore = cccore?.status === "*DONE*" && cccore.endTimestamp ? new Date(cccore.endTimestamp).getTime() : (getBaseTime(cccore)?.getTime() || 0);

  const runningL2s = jobs.filter(j => j.status === "*RUNNING*" && L2_CONFIG[j.jobName]);

  const predictionsMap: Record<string, Date> = {};

  runningL2s.forEach(l2 => {
    const cfg = L2_CONFIG[l2.jobName];
    let baseRefTime = 0;
    let bottleneckName = "";
    let gap = cfg.g;

    if (cfg.p === "C" && tCms > 0) { baseRefTime = tCms; bottleneckName = "ods_cms_data_metric"; }
    else if (cfg.p === "H" && tHist > 0) { baseRefTime = tHist; bottleneckName = "ods_to_staging_and_history_data_metric"; }
    else if (cfg.p === "CC" && tCccore > 0) { baseRefTime = tCccore; bottleneckName = "cms_cccore_to_datalake"; }
    else if (cfg.p === "B" && (tCms > 0 || tHist > 0)) {
      if (tCms > tHist) { baseRefTime = tCms; bottleneckName = "ods_cms_data_metric"; }
      else { baseRefTime = tHist; bottleneckName = "ods_to_staging_and_history_data_metric"; }
    }

    // Dynamic Rule Overrides
    if (baseRefTime > 0) {
      const parentDateWib = new Date(baseRefTime).toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
      const parentHour = new Date(parentDateWib).getHours();
      const parentMin = new Date(parentDateWib).getMinutes();

      if (l2.jobName === "cms_dlk_to_efs" && parentHour >= 4) {
        gap = 22;
        bottleneckName += " (Late Rule)";
      }

      if (["cbs_loaniq_to_ods", "cbs_tradefinance_to_ods", "cbs_treasury_to_ods"].includes(l2.jobName)) {
        if (parentHour > 3 || (parentHour === 3 && parentMin >= 30)) {
           if (l2.jobName === "cbs_loaniq_to_ods") gap = 22;
           if (l2.jobName === "cbs_tradefinance_to_ods") gap = 24;
           if (l2.jobName === "cbs_treasury_to_ods") gap = 20;
           bottleneckName += " (Late Schedule Rule)";
        }
      }

      const predL2 = new Date(baseRefTime + gap * 60000);
      
      predictionsMap[l2.jobName] = predL2;

      const delay = Math.round((predL2.getTime() - new Date(l2.scheduledTimestamp).getTime()) / 60000);
      if (delay > 0 && l2.jobName !== "dag_exus_job") {
        results.push({
          id: l2.id, jobName: l2.jobName, scheduledTime: l2.scheduledTimestamp,
          predictedEndTime: predL2, delayMinutes: delay, cause: `Sensing dari ${bottleneckName} (+${gap}m)`,
        });
      }
    }
  });

  // Chained L3: dag_exus_job sensing ke cms_dlk_to_efs
  const exus = runningL2s.find(j => j.jobName === "dag_exus_job");
  if (exus) {
    let dlkTime = 0;
    const dlkJob = getJobById(jobs, 28); // cms_dlk_to_efs id
    if (dlkJob?.status === "*DONE*" && dlkJob.endTimestamp) dlkTime = new Date(dlkJob.endTimestamp).getTime();
    else if (predictionsMap["cms_dlk_to_efs"]) dlkTime = predictionsMap["cms_dlk_to_efs"].getTime();
    else dlkTime = getBaseTime(dlkJob)?.getTime() || 0;

    if (dlkTime > 0) {
      const parentDateWib = new Date(dlkTime).toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
      const parentHour = new Date(parentDateWib).getHours();
      const parentMin = new Date(parentDateWib).getMinutes();

      let gap = 11; // normal gap from cms_dlk to dag_exus
      let cause = `Sensing dari cms_dlk_to_efs (+11m)`;

      if (parentHour > 3 || (parentHour === 3 && parentMin >= 50)) {
         gap = 15;
         cause = `Sensing dari cms_dlk_to_efs (Independen lepas 03:50) (+15m)`;
      }

      const predExus = new Date(dlkTime + gap * 60000);
      const delay = Math.round((predExus.getTime() - new Date(exus.scheduledTimestamp).getTime()) / 60000);

      if (delay > 0) {
        results.push({
          id: exus.id, jobName: exus.jobName, scheduledTime: exus.scheduledTimestamp,
          predictedEndTime: predExus, delayMinutes: delay, cause,
        });
      }
    }
  }

  return results.sort((a, b) => b.predictedEndTime.getTime() - a.predictedEndTime.getTime());
}
