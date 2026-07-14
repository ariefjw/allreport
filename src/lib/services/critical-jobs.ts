import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbDailyMonitoringLog, DbMasterJob } from "@/lib/db/types";
import {
  getOperationalDate,
  buildScheduledTimestamp,
  combineScheduledDateWithTime,
} from "@/lib/operational-date";

export async function ensureCriticalDailyLogs(supabase: SupabaseClient) {
  const operationalDate = getOperationalDate();

  const { count } = await supabase
    .from("daily_monitoring_log")
    .select("*", { count: "exact", head: true })
    .eq("operational_date", operationalDate);

  if (count && count > 0) return;

  const { data: masterJobs, error: masterError } = await supabase
    .from("master_jobs")
    .select("*")
    .order("id");

  if (masterError) throw masterError;
  if (!masterJobs?.length) throw new Error("No master jobs found. Run supabase/schema.sql seed.");

  const rows = (masterJobs as DbMasterJob[]).map((job) => ({
    operational_date: operationalDate,
    job_id: job.id,
    job_name: job.job_name,
    scheduled_timestamp: buildScheduledTimestamp(
      operationalDate,
      job.default_schedule_time,
      job.is_cross_day
    ),
    status: "*WAITING*",
  }));

  const { error } = await supabase.from("daily_monitoring_log").insert(rows);
  if (error) throw error;
}

export async function syncCriticalRunningStatus(supabase: SupabaseClient) {
  const operationalDate = getOperationalDate();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("daily_monitoring_log")
    .update({ status: "*RUNNING*", updated_at: now })
    .eq("operational_date", operationalDate)
    .eq("status", "*WAITING*")
    .lte("scheduled_timestamp", now);

  if (error) throw error;
}

export async function getCriticalJobs(supabase: SupabaseClient) {
  await ensureCriticalDailyLogs(supabase);
  await syncCriticalRunningStatus(supabase);

  const operationalDate = getOperationalDate();
  const { data, error } = await supabase
    .from("daily_monitoring_log")
    .select("*")
    .eq("operational_date", operationalDate)
    .order("job_id");

  if (error) throw error;
  return data as DbDailyMonitoringLog[];
}

export async function updateCriticalJobEndTime(
  supabase: SupabaseClient,
  id: string,
  endTime: string | null
) {
  const { data: existing, error: fetchError } = await supabase
    .from("daily_monitoring_log")
    .select("scheduled_timestamp, status")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  if (!endTime) {
    const { data, error } = await supabase
      .from("daily_monitoring_log")
      .update({
        end_timestamp: null,
        status: "*RUNNING*",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as DbDailyMonitoringLog;
  }

  const endTimestamp = combineScheduledDateWithTime(
    existing.scheduled_timestamp,
    endTime
  );

  const { data, error } = await supabase
    .from("daily_monitoring_log")
    .update({
      end_timestamp: endTimestamp,
      status: "*DONE*",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DbDailyMonitoringLog;
}

export async function markCriticalJobFailed(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("daily_monitoring_log")
    .update({
      status: "*FAILED*",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DbDailyMonitoringLog;
}
