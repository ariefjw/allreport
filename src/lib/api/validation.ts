import { z } from "zod";
import { DEFAULT_TIMESHEET_PROFILE } from "@/lib/timesheet/constants";

export const patchCriticalJobSchema = z.object({
  endTime: z.string().nullable().optional(),
  action: z.enum(["mark_failed", "reset", "pause", "resume"]).optional(),
});

export const patchIntradayJobSchema = z.object({
  finishedTime: z.string().nullable().optional(),
  startedTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
});

export const createAlarmSchema = z.object({
  alarmTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  label: z.string().optional(),
  daysOfWeek: z.number().int().min(0).max(127).optional(),
  targetPage: z.string().optional(),
});

export const patchAlarmSchema = z.object({
  alarmTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  label: z.string().optional(),
  daysOfWeek: z.number().int().min(0).max(127).optional(),
  targetPage: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
});

export const timesheetProfileSchema = z.object({
  employeeNo: z.string().trim().min(1).max(64),
  fullName: z.string().trim().min(1).max(128),
});

export const generateTimesheetSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  autoHoliday: z.coerce.boolean().default(true),
  manualHolidays: z.string().optional().default(""),
  schedule: z.string().min(1, "Jadwal wajib diisi"),
  // Form defaults, sent per request and snapshotted into timesheet_entries.
  organization: z.string().trim().min(1).max(128).default(DEFAULT_TIMESHEET_PROFILE.organization),
  position: z.string().trim().min(1).max(128).default(DEFAULT_TIMESHEET_PROFILE.position),
  client: z.string().trim().min(1).max(128).default(DEFAULT_TIMESHEET_PROFILE.client),
  project: z.string().trim().min(1).max(128).default(DEFAULT_TIMESHEET_PROFILE.project),
  // Checklist lembur pilihan user (kunci `hari:indeksSegmen`); tanpa ini pakai pola otomatis.
  overtimeFlags: z.record(z.string().max(16), z.boolean()).optional(),
});

export const listTimesheetEntriesSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});
