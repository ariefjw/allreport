import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbTimesheetEntry, DbTimesheetProfile } from "@/lib/db/types";
import { ALLOWED_SIGNATURE_MIME, MAX_SIGNATURE_BYTES, SIGNATURE_URL_TTL, TIMESHEET_BUCKET } from "@/lib/timesheet/constants";
import type { EmployeeData } from "@/lib/timesheet/constants";

export { ALLOWED_SIGNATURE_MIME, MAX_SIGNATURE_BYTES, SIGNATURE_URL_TTL, TIMESHEET_BUCKET };

export interface TimesheetProfileInput {
  employeeNo: string;
  fullName: string;
}

export interface TimesheetProfileView extends DbTimesheetProfile {
  signature_preview_url: string | null;
}

function assertSignatureFile(file: File | null | undefined) {
  if (!file || file.size === 0) return null;
  if (!(ALLOWED_SIGNATURE_MIME as readonly string[]).includes(file.type)) {
    throw new Error("Tanda tangan harus berformat PNG atau JPG");
  }
  if (file.size > MAX_SIGNATURE_BYTES) {
    throw new Error("Ukuran tanda tangan maksimal 1MB");
  }
  return file;
}

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<TimesheetProfileView | null> {
  const { data, error } = await supabase
    .from("timesheet_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return attachPreview(supabase, data as DbTimesheetProfile);
}

async function attachPreview(supabase: SupabaseClient, row: DbTimesheetProfile): Promise<TimesheetProfileView> {
  if (!row.signature_path) return { ...row, signature_preview_url: null };
  const { data, error } = await supabase.storage
    .from(TIMESHEET_BUCKET)
    .createSignedUrl(row.signature_path, SIGNATURE_URL_TTL);
  if (error) {
    console.warn("[Timesheet] signed url issue:", error.message);
    return { ...row, signature_preview_url: null };
  }
  return { ...row, signature_preview_url: data.signedUrl };
}

export async function upsertProfile(
  supabase: SupabaseClient,
  userId: string,
  input: TimesheetProfileInput,
  signatureFile?: File | null
): Promise<TimesheetProfileView> {
  const file = assertSignatureFile(signatureFile);
  const payload: Record<string, unknown> = {
    user_id: userId,
    employee_no: input.employeeNo,
    full_name: input.fullName,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("timesheet_profiles")
    .select("signature_path")
    .eq("user_id", userId)
    .maybeSingle();

  if (file) {
    const ext = file.type === "image/jpeg" ? "jpg" : "png";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(TIMESHEET_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) throw uploadError;

    if (existing?.signature_path && existing.signature_path !== path) {
      await supabase.storage.from(TIMESHEET_BUCKET).remove([existing.signature_path]);
    }
    payload.signature_path = path;
    payload.signature_mime = file.type;
  }

  const { data, error } = await supabase
    .from("timesheet_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return attachPreview(supabase, data as DbTimesheetProfile);
}

export async function deleteSignature(supabase: SupabaseClient, userId: string): Promise<TimesheetProfileView | null> {
  const { data: row, error: readError } = await supabase
    .from("timesheet_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;
  if (!row) return null;
  const profile = row as DbTimesheetProfile;

  if (profile.signature_path) {
    const { error: rmError } = await supabase.storage.from(TIMESHEET_BUCKET).remove([profile.signature_path]);
    if (rmError) console.warn("[Timesheet] storage delete issue:", rmError.message);
  }

  const { data: updated, error } = await supabase
    .from("timesheet_profiles")
    .update({ signature_path: null, signature_mime: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return attachPreview(supabase, updated as DbTimesheetProfile);
}

export async function getSignatureDataUrl(
  supabase: SupabaseClient,
  path: string | null,
  mime: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(TIMESHEET_BUCKET).download(path);
  if (error) {
    console.warn("[Timesheet] signature download issue:", error.message);
    return null;
  }
  const bytes = Buffer.from(await data.arrayBuffer());
  const type = mime && ALLOWED_SIGNATURE_MIME.includes(mime as (typeof ALLOWED_SIGNATURE_MIME)[number]) ? mime : "image/png";
  return `data:${type};base64,${bytes.toString("base64")}`;
}

export async function listEntries(
  supabase: SupabaseClient,
  userId: string,
  filters: { year?: number; month?: number } = {}
): Promise<DbTimesheetEntry[]> {
  let query = supabase
    .from("timesheet_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (filters.year) query = query.eq("operational_year", filters.year);
  if (filters.month) query = query.eq("operational_month", filters.month);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbTimesheetEntry[];
}

export interface CreateEntryInput {
  month: number;
  year: number;
  /** Snapshot of what was written into the file (employeeNo/fullName from the
   *  profile, the other four from the request body). */
  employee: EmployeeData;
  scheduleText: string;
  autoHoliday: boolean;
  manualHolidays: string | null;
  holidayDays: number[];
  totalHours: number | null;
  hasSignature: boolean;
}

export async function createEntry(
  supabase: SupabaseClient,
  userId: string,
  input: CreateEntryInput
): Promise<DbTimesheetEntry> {
  const { data, error } = await supabase
    .from("timesheet_entries")
    .insert({
      user_id: userId,
      operational_month: input.month,
      operational_year: input.year,
      employee_no: input.employee.employeeNo,
      full_name: input.employee.fullName,
      organization: input.employee.organization,
      position: input.employee.position,
      client: input.employee.client,
      project: input.employee.project,
      schedule_text: input.scheduleText,
      auto_holiday: input.autoHoliday,
      manual_holidays: input.manualHolidays,
      holiday_days: input.holidayDays,
      total_hours: input.totalHours,
      has_signature: input.hasSignature,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DbTimesheetEntry;
}

export async function getEntry(supabase: SupabaseClient, userId: string, id: string): Promise<DbTimesheetEntry | null> {
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as DbTimesheetEntry) ?? null;
}
