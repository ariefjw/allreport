import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlarmSchedule } from "@/types";
import type { DbAlarmSchedule } from "@/lib/db/types";

function mapAlarm(row: DbAlarmSchedule): AlarmSchedule {
  return {
    id: row.id,
    alarmTime: row.alarm_time.slice(0, 8),
    label: row.label,
    daysOfWeek: row.days_of_week,
    targetPage: row.target_page,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAlarms(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("alarm_schedules")
    .select("*")
    .eq("user_id", userId)
    .order("alarm_time");

  if (error) throw error;
  return (data as DbAlarmSchedule[]).map(mapAlarm);
}

export async function createAlarm(
  supabase: SupabaseClient,
  userId: string,
  input: { alarmTime: string; label: string; daysOfWeek: number; targetPage?: string }
) {
  const { data, error } = await supabase
    .from("alarm_schedules")
    .insert({
      user_id: userId,
      alarm_time: input.alarmTime,
      label: input.label,
      days_of_week: input.daysOfWeek,
      target_page: input.targetPage ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapAlarm(data as DbAlarmSchedule);
}

export async function updateAlarm(
  supabase: SupabaseClient,
  id: string,
  input: Partial<{ alarmTime: string; label: string; daysOfWeek: number; targetPage: string | null; enabled: boolean }>
) {
  const updates: Record<string, unknown> = {};
  if (input.alarmTime !== undefined) updates.alarm_time = input.alarmTime;
  if (input.label !== undefined) updates.label = input.label;
  if (input.daysOfWeek !== undefined) updates.days_of_week = input.daysOfWeek;
  if (input.targetPage !== undefined) updates.target_page = input.targetPage;
  if (input.enabled !== undefined) updates.enabled = input.enabled;

  const { data, error } = await supabase
    .from("alarm_schedules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapAlarm(data as DbAlarmSchedule);
}

export async function deleteAlarm(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("alarm_schedules").delete().eq("id", id);
  if (error) throw error;
}
