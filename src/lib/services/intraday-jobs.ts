import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbDailyIntradayLog, DbMasterIntradayBatch } from "@/lib/db/types";
import { getOperationalDate, combineOperationalDateWithTime } from "@/lib/operational-date";

export async function ensureIntradayDailyLogs(supabase: SupabaseClient) {
  const operationalDate = getOperationalDate();

  const { count } = await supabase
    .from("daily_intraday_log")
    .select("*", { count: "exact", head: true })
    .eq("operational_date", operationalDate);

  if (count && count > 0) return;

  const { data: batches, error: batchError } = await supabase
    .from("master_intraday_batches")
    .select("*")
    .order("batch_number");

  if (batchError) throw batchError;
  if (!batches?.length) throw new Error("No intraday batches found. Run supabase/schema.sql seed.");

  const rows = (batches as DbMasterIntradayBatch[]).map((batch) => ({
    operational_date: operationalDate,
    batch_id: batch.id,
    batch_number: batch.batch_number,
    started_time: batch.default_started_time,
  }));

  const { error } = await supabase.from("daily_intraday_log").insert(rows);
  if (error) throw error;
}

export async function getIntradayJobs(supabase: SupabaseClient) {
  await ensureIntradayDailyLogs(supabase);

  const operationalDate = getOperationalDate();
  const { data, error } = await supabase
    .from("daily_intraday_log")
    .select("*")
    .eq("operational_date", operationalDate)
    .order("batch_number");

  if (error) throw error;
  return data as DbDailyIntradayLog[];
}

export async function updateIntradayFinishedTime(
  supabase: SupabaseClient,
  id: string,
  finishedTime: string | null
) {
  const { data: existing, error: fetchError } = await supabase
    .from("daily_intraday_log")
    .select("operational_date")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const finishedTimestamp = finishedTime
    ? combineOperationalDateWithTime(existing.operational_date, finishedTime)
    : null;

  const { data, error } = await supabase
    .from("daily_intraday_log")
    .update({
      finished_timestamp: finishedTimestamp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DbDailyIntradayLog;
}
