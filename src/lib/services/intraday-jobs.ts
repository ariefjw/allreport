import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbDailyIntradayLog, DbMasterIntradayBatch } from "@/lib/db/types";
import { getOperationalDate, combineOperationalDateWithTime } from "@/lib/operational-date";

export async function ensureIntradayDailyLogs(supabase: SupabaseClient, userId?: string) {
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
    ...(userId ? { user_id: userId } : {}),
  }));

  const { error } = await supabase.from("daily_intraday_log").insert(rows);
  if (error) throw error;
}

export async function getIntradayJobs(supabase: SupabaseClient, userId?: string) {
  await ensureIntradayDailyLogs(supabase, userId);

  const operationalDate = getOperationalDate();
  const { data, error } = await supabase
    .from("daily_intraday_log")
    .select("*")
    .eq("operational_date", operationalDate)
    .order("batch_number");

  if (error) throw error;
  return data as DbDailyIntradayLog[];
}

function normalizeTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export async function updateIntradayJob(
  supabase: SupabaseClient,
  id: string,
  input: { finishedTime?: string | null; startedTime?: string }
) {
  const { data: existing, error: fetchError } = await supabase
    .from("daily_intraday_log")
    .select("operational_date")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.finishedTime !== undefined) {
    updates.finished_timestamp = input.finishedTime
      ? combineOperationalDateWithTime(existing.operational_date, input.finishedTime)
      : null;
  }

  if (input.startedTime !== undefined) {
    updates.started_time = normalizeTime(input.startedTime);
  }

  const { data, error } = await supabase
    .from("daily_intraday_log")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as DbDailyIntradayLog;
}
