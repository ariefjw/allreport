import { z } from "zod";

export const patchCriticalJobSchema = z.object({
  endTime: z.string().nullable().optional(),
  action: z.enum(["mark_failed", "reset"]).optional(),
});

export const patchIntradayJobSchema = z.object({
  finishedTime: z.string().nullable().optional(),
});

export const createErrorLogSchema = z.object({
  errorTitle: z.string().optional(),
  errorTextLog: z.string().optional(),
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
