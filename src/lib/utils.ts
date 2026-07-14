export function formatDateReport(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatTimeHM(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function formatTimeHMS(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function parseTimeString(time: string): { hours: number; minutes: number; seconds: number } {
  const parts = time.split(":");
  return {
    hours: parseInt(parts[0] ?? "0", 10),
    minutes: parseInt(parts[1] ?? "0", 10),
    seconds: parseInt(parts[2] ?? "0", 10),
  };
}

export function timeStringToDate(baseDate: Date, time: string): Date {
  const { hours, minutes, seconds } = parseTimeString(time);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, seconds, 0);
  return result;
}

export function hhmmssToTimeString(digits: string): string | null {
  const cleaned = digits.replace(/\D/g, "").slice(0, 6);
  if (cleaned.length !== 6) return null;
  const h = parseInt(cleaned.slice(0, 2), 10);
  const m = parseInt(cleaned.slice(2, 4), 10);
  const s = parseInt(cleaned.slice(4, 6), 10);
  if (h > 23 || m > 59 || s > 59) return null;
  return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}:${cleaned.slice(4, 6)}`;
}

export function formatHHMMSSMask(digits: string): string {
  const cleaned = digits.replace(/\D/g, "").slice(0, 6);
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}:${cleaned.slice(4)}`;
}

export function calcDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return "00:00:00";
  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function isTimeReached(startTime: string, now: Date = new Date()): boolean {
  const { hours, minutes } = parseTimeString(startTime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = hours * 60 + minutes;
  return nowMinutes >= startMinutes;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

import { getOperationalDate as getOpDate } from "@/lib/operational-date";

export { getOpDate as getOperationalDate };

export function getTodayDisplay(): string {
  return formatDateReport(new Date());
}
