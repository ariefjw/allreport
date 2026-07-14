import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbDailyErrorLog } from "@/lib/db/types";
import { getOperationalDate } from "@/lib/operational-date";

export async function getErrorLogs(supabase: SupabaseClient) {
  const operationalDate = getOperationalDate();
  const { data, error } = await supabase
    .from("daily_error_log")
    .select("*")
    .eq("operational_date", operationalDate)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as DbDailyErrorLog[];
}

export async function createErrorLog(
  supabase: SupabaseClient,
  input: {
    errorTitle: string;
    errorTextLog: string;
    screenshotFile?: File | null;
  }
) {
  let screenshotUrl: string | null = null;

  if (input.screenshotFile) {
    const ext = input.screenshotFile.type.split("/")[1] ?? "png";
    const fileName = `err_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("error-screenshots")
      .upload(fileName, input.screenshotFile, {
        contentType: input.screenshotFile.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage
      .from("error-screenshots")
      .getPublicUrl(fileName);

    screenshotUrl = publicUrl.publicUrl;
  }

  const { data, error } = await supabase
    .from("daily_error_log")
    .insert({
      operational_date: getOperationalDate(),
      error_title: input.errorTitle,
      error_text_log: input.errorTextLog,
      screenshot_url: screenshotUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbDailyErrorLog;
}
