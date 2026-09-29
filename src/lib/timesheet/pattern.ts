import type { Schedule } from "./parser";

export type Shift = readonly [string, string];

const WEEKDAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Durasi satu segmen dalam jam, memakai rumus sama dengan kolom I di Excel. */
export function hoursBetween(cin: string, cout: string): number {
  const [h1, m1] = cin.split(":").map(Number);
  const [h2, m2] = cout.split(":").map(Number);
  const start = h1 * 60 + (m1 || 0);
  const end = h2 * 60 + (m2 || 0);
  const diff = ((end - start) % 1440 + 1440) % 1440;
  return Math.floor(diff / 60);
}

/** Total jam keseluruhan, tidak membedakan lembur atau normal. */
export function sumHours(schedule: Schedule): number {
  let total = 0;
  for (const shifts of Object.values(schedule)) {
    for (const [cin, cout] of shifts) total += hoursBetween(cin, cout);
  }
  return total;
}

export interface PreviewRow {
  /** Kunci stabil `hari:indeksSegmen`, dipakai untuk menyimpan checklist user. */
  key: string;
  day: number;
  weekday: string;
  cin: string | null;
  cout: string | null;
  /** True bila hari tersebut libur nasional (otomatis dicentang di modal). */
  isHoliday: boolean;
}

/**
 * Daftar baris yang akan tampil di Excel: satu baris per segmen, ditambah satu
 * baris OFF untuk hari kosong. Dipakai modal checklist sebelum generate.
 */
export function previewRows(
  schedule: Schedule,
  year: number,
  month: number,
  holidays: Set<number> = new Set()
): PreviewRow[] {
  const rows: PreviewRow[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const weekday = WEEKDAYS_ID[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
    const shifts = schedule[day] ?? [];
    const isHoliday = holidays.has(day);
    if (!shifts.length) {
      rows.push({ key: `${day}:off`, day, weekday, cin: null, cout: null, isHoliday });
      continue;
    }
    shifts.forEach(([cin, cout], i) => {
      rows.push({ key: `${day}:${i}`, day, weekday, cin, cout, isHoliday });
    });
  }
  return rows;
}