import type { Schedule } from "./parser";

export type Shift = readonly [string, string];

/** Panjang siklus pola shift, dalam hari. */
export const CYCLE_LENGTH = 8;

/**
 * Pola shift normal yang selalu berlaku, tidak peduli hari libur atau kondisi lain.
 * Indeks siklus = tanggal % 8 (bukan tanggal - 1), nilai = [check-in, check-out]
 * atau null untuk off.
 *
 *   0 off              tgl 8, 16, 24     4 07:00 - 15:00   tgl 4, 12, 20, 28
 *   1 23:00 - 07:00   tgl 1, 9, 17, 25   5 07:00 - 15:00   tgl 5, 13, 21, 29
 *   2 23:00 - 07:00   tgl 2, 10, 18, 26  6 15:00 - 23:00   tgl 6, 14, 22, 30
 *   3 off              tgl 3, 11, 19, 27  7 15:00 - 23:00   tgl 7, 15, 23, 31
 */
const PATTERN: ReadonlyArray<Shift | null> = [
  null,
  ["23:00", "07:00"],
  ["23:00", "07:00"],
  null,
  ["07:00", "15:00"],
  ["07:00", "15:00"],
  ["15:00", "23:00"],
  ["15:00", "23:00"],
];

export function cycleDay(dayOfMonth: number): number {
  return dayOfMonth % CYCLE_LENGTH;
}

export function expectedShifts(dayOfMonth: number): Shift | null {
  return PATTERN[cycleDay(dayOfMonth)] ?? null;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m || 0);
}

/**
 * Sehari dianggap sesuai pola bila isinya persis sama dengan pola:
 * off saat pola off, atau tepat satu shift dengan jam yang sama.
 * Segmen `//` tambahan, jam berbeda, atau off saat pola menuntut kerja = tidak sesuai.
 */
export function matchesPattern(dayOfMonth: number, shifts: readonly Shift[]): boolean {
  const expected = expectedShifts(dayOfMonth);
  if (!expected) return shifts.length === 0;
  if (shifts.length !== 1) return false;
  return matchesExactly(expected, shifts[0]);
}

/** Tidak sesuai pola = lembur. */
export function isOvertimeDay(dayOfMonth: number, shifts: readonly Shift[]): boolean {
  return !matchesPattern(dayOfMonth, shifts);
}

function matchesExactly(expected: Shift, shift: Shift): boolean {
  return toMinutes(shift[0]) === toMinutes(expected[0]) && toMinutes(shift[1]) === toMinutes(expected[1]);
}

/**
 * Gabungan pola + `//`: hanya boleh ada satu segmen Normal, yaitu segmen yang
 * persis sama dengan pola. Segmen `//` lain selalu lembur, walau jamnya ada
 * di pola. Hari off = tidak ada segmen normal (semua lembur).
 * Hasilnya -1 bila tidak ada segmen yang bisa dianggap normal.
 */
export function normalSegmentIndex(dayOfMonth: number, shifts: readonly Shift[]): number {
  const expected = expectedShifts(dayOfMonth);
  if (!expected || shifts.length === 0) return -1;
  return shifts.findIndex((shift) => matchesExactly(expected, shift));
}

/** Segmen ke-i pada hari ini dihitung lembur. */
export function isOvertimeSegment(dayOfMonth: number, shifts: readonly Shift[], index: number): boolean {
  return index !== normalSegmentIndex(dayOfMonth, shifts);
}

/** Durasi satu segmen dalam jam, memakai rumus sama dengan kolom I di Excel. */
export function hoursBetween(cin: string, cout: string): number {
  const start = toMinutes(cin);
  const end = toMinutes(cout);
  const diff = ((end - start) % 1440 + 1440) % 1440;
  return Math.floor(diff / 60);
}

function shiftHours(shift: Shift): number {
  return hoursBetween(shift[0], shift[1]);
}

/** Total jam per hari, dipisah per segmen: yang sepola = normal, sisanya lembur. */
export function countTotalHours(schedule: Schedule): { normal: number; overtime: number; total: number } {
  let normal = 0;
  let overtime = 0;
  for (const [dayKey, shifts] of Object.entries(schedule)) {
    const normalIndex = normalSegmentIndex(Number(dayKey), shifts);
    shifts.forEach((shift, i) => {
      if (i === normalIndex) normal += shiftHours(shift);
      else overtime += shiftHours(shift);
    });
  }
  return { normal, overtime, total: normal + overtime };
}

const WEEKDAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export interface PreviewRow {
  /** Kunci stabil `hari:indeksSegmen`, dipakai untuk menyimpan checklist user. */
  key: string;
  day: number;
  weekday: string;
  cin: string | null;
  cout: string | null;
  autoOvertime: boolean;
}

/**
 * Daftar baris yang akan tampil di Excel: satu baris per segmen, ditambah satu
 * baris OFF untuk hari kosong. Dipakai modal checklist sebelum generate.
 */
export function previewRows(schedule: Schedule, year: number, month: number): PreviewRow[] {
  const rows: PreviewRow[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const weekday = WEEKDAYS_ID[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
    const shifts = schedule[day] ?? [];
    if (!shifts.length) {
      rows.push({ key: `${day}:off`, day, weekday, cin: null, cout: null, autoOvertime: false });
      continue;
    }
    shifts.forEach(([cin, cout], i) => {
      rows.push({
        key: `${day}:${i}`,
        day,
        weekday,
        cin,
        cout,
        autoOvertime: isOvertimeSegment(day, shifts, i),
      });
    });
  }
  return rows;
}

/** Checklist default yang dihitung dari pola, sebelum diubah user. */
export function autoOvertimeFlags(schedule: Schedule): Map<string, boolean> {
  const flags = new Map<string, boolean>();
  for (const [dayKey, shifts] of Object.entries(schedule)) {
    const day = Number(dayKey);
    if (!shifts.length) continue;
    shifts.forEach((_, i) => flags.set(`${day}:${i}`, isOvertimeSegment(day, shifts, i)));
  }
  return flags;
}
