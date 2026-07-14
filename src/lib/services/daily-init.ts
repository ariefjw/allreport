import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureCriticalDailyLogs } from "./critical-jobs";
import { ensureIntradayDailyLogs } from "./intraday-jobs";

export async function initializeDailySheets(supabase: SupabaseClient) {
  await ensureCriticalDailyLogs(supabase);
  await ensureIntradayDailyLogs(supabase);
}
