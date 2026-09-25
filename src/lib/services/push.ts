import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbPushToken } from "@/lib/db/types";

export async function registerPushToken(supabase: SupabaseClient, userId: string, token: string, platform = "android") {
  const { data, error } = await supabase
    .from("push_tokens")
    .upsert({ user_id: userId, token, platform }, { onConflict: "token" })
    .select()
    .single();
  if (error) throw error;
  return data as DbPushToken;
}

export async function removePushToken(supabase: SupabaseClient, token: string) {
  const { error } = await supabase.from("push_tokens").delete().eq("token", token);
  if (error) throw error;
}

export async function getPushTokensForUsers(supabase: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase.from("push_tokens").select("*").in("user_id", userIds);
  if (error) throw error;
  return data as DbPushToken[];
}

export async function getDueAlarms(supabase: SupabaseClient, nowTime: string, dow: number) {
  const { data, error } = await supabase
    .from("alarm_schedules")
    .select("*")
    .eq("enabled", true);
  if (error) throw error;
  const rows = (data ?? []) as import("@/lib/db/types").DbAlarmSchedule[];
  return rows.filter((r) => (r.days_of_week & (1 << dow)) !== 0 && r.alarm_time.slice(0, 5) === nowTime.slice(0, 5));
}
