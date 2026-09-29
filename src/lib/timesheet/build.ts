import type { SupabaseClient } from "@supabase/supabase-js";
import { parseSchedule } from "./parser";
import { getHolidays } from "./holidays";
import { generateTimesheetBuffer, type SignatureEmbed } from "./excel";
import { MONTHS_INDONESIA_FULL, type EmployeeData } from "./constants";
import { sumHours } from "./pattern";

export { sumHours };

export interface BuildTimesheetInput {
  employee: EmployeeData;
  scheduleText: string;
  month: number;
  year: number;
  autoHoliday: boolean;
  manualHolidays?: string | null;
  /** When present, skip the holiday lookup entirely and reuse the recorded days. */
  storedHolidayDays?: number[] | null;
  signatureDataUrl: string | null;
  signatureMime: string | null;
  /** Dibutuhkan saat autoHoliday aktif: sumber libur ada di tabel holidays_cache. */
  supabase?: SupabaseClient | null;
  /** Checklist lembur dari user, kunci = `hari:indeksSegmen`. Null = pakai hari libur nasional. */
  overtimeFlags?: Record<string, boolean> | null;
}

export interface BuildTimesheetResult {
  buffer: Buffer;
  holidayDays: number[];
  totalHours: number;
  hasSignature: boolean;
  fileName: string;
}

function parseManualHolidays(raw?: string | null): number[] {
  const days: number[] = [];
  if (!raw) return days;
  for (const part of raw.split(",")) {
    const value = parseInt(part.trim(), 10);
    if (!Number.isNaN(value) && value >= 1 && value <= 31) days.push(value);
  }
  return days;
}

export async function buildTimesheet(input: BuildTimesheetInput): Promise<BuildTimesheetResult> {
  const schedule = parseSchedule(input.scheduleText);
  if (!Object.keys(schedule).length) throw new Error("Format jadwal tidak dikenali");

  const holidayDays = new Set<number>();
  if (input.storedHolidayDays) {
    for (const day of input.storedHolidayDays) holidayDays.add(day);
  } else if (input.autoHoliday) {
    if (!input.supabase) throw new Error("Sumber data libur tidak tersedia");
    const { holidays, errors } = await getHolidays(input.supabase, input.year, input.month);
    for (const day of holidays) holidayDays.add(day);
    if (errors.length) console.warn("[Timesheet] hari libur:", errors.join(" | "));
  }
  for (const day of parseManualHolidays(input.manualHolidays)) holidayDays.add(day);

  const signature: SignatureEmbed | null =
    input.signatureDataUrl && input.signatureMime
      ? { dataUrl: input.signatureDataUrl, mime: input.signatureMime === "image/jpeg" ? "image/jpeg" : "image/png" }
      : null;

  const buffer = await generateTimesheetBuffer(
    input.employee,
    schedule,
    input.month,
    input.year,
    holidayDays,
    signature,
    input.overtimeFlags ? new Map(Object.entries(input.overtimeFlags)) : null
  );

  const sortedDays = [...holidayDays].sort((a, b) => a - b);
  return {
    buffer,
    holidayDays: sortedDays,
    totalHours: sumHours(schedule),
    hasSignature: !!signature,
    fileName: `Timesheet SMBC ${MONTHS_INDONESIA_FULL[input.month]} ${input.year} - ${input.employee.fullName}.xlsx`,
  };
}

export const TIMESHEET_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
