import type { SupabaseClient } from "@supabase/supabase-js";
import { MONTHS_INDONESIA } from "./constants";

/**
 * Libur nasional resmi per tahun (SKB 3 Menteri), format "MM-DD".
 * Tahun 2025-2027 sudah di-seed ke tabel `holidays_cache` (source = 'local'),
 * tahun lain diisi cron harian dari API publik (source = 'api').
 */
const SEED_YEARS = new Set([2025, 2026, 2027]);

export type HolidaySource = "local" | "api";

const monthDay = (md: string) => Number(md.slice(3));
const monthOf = (md: string) => Number(md.slice(0, 2));

function daysFrom(list: readonly string[], month: number): Set<number> {
  const days = new Set<number>();
  for (const md of list) if (monthOf(md) === month) days.add(monthDay(md));
  return days;
}

const API_PROVIDERS = [
  (year: number) => `https://indonesian-public-holidays.vercel.app/api?year=${year}`,
  (year: number) => `https://api-hari-libur.vercel.app/api?year=${year}`,
];

/**
 * Ambil daftar libur nasional tahun berjalan dari API publik.
 * Mencoba semua provider, mengembalikan error per provider bila semuanya gagal.
 */
export async function fetchApiHolidays(year: number): Promise<{ days: Set<string>; errors: string[] }> {
  const errors: string[] = [];
  for (const buildUrl of API_PROVIDERS) {
    try {
      const res = await fetch(buildUrl(year), {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: unknown[] = Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? [];
      const days = new Set<string>();
      for (const item of list) {
        if (typeof item !== "object" || item === null || !("date" in item)) continue;
        const rec = item as Record<string, unknown>;
        if (rec.is_national_holiday === false) continue;
        const parts = String(rec.date).split("-");
        if (parts.length === 3 && Number(parts[0]) === year) days.add(`${parts[1]}-${parts[2]}`);
      }
      if (days.size) return { days, errors: [] };
      errors.push(`Tidak ada hari libur untuk tahun ${year}`);
    } catch (e) {
      errors.push(`API ${buildUrl(year)}: ${String(e)}`);
    }
  }
  return { days: new Set(), errors };
}

/**
 * Simpan ke `holidays_cache`.
 * Tahun seed SKB (2025-2027) tidak pernah ditimpa oleh data API —
 * data resmi harus tetap menang.
 */
export async function saveHolidayCache(
  supabase: SupabaseClient,
  year: number,
  days: readonly string[],
  source: HolidaySource
): Promise<{ skipped: boolean; error?: string }> {
  if (source === "api" && SEED_YEARS.has(year)) return { skipped: true };

  const { error } = await supabase.from("holidays_cache").upsert({
    year,
    days: [...days].sort(),
    source,
    fetched_at: new Date().toISOString(),
  });
  return error ? { skipped: false, error: error.message } : { skipped: false };
}

export interface HolidayDeps {
  /** Overridable untuk test; default = fetchApiHolidays. */
  fetchHolidays?: (year: number) => Promise<{ days: Set<string>; errors: string[] }>;
}

/**
 * Libur nasional per bulan, diambil dari `holidays_cache` (Supabase).
 * Cache miss -> API -> ditulis balik ke cache supaya request berikutnya cepat.
 */
export async function getHolidays(
  supabase: SupabaseClient,
  year: number,
  month: number,
  deps: HolidayDeps = {}
): Promise<{ holidays: Set<number>; errors: string[] }> {
  const { data, error } = await supabase
    .from("holidays_cache")
    .select("days")
    .eq("year", year)
    .maybeSingle();

  if (!error && data && Array.isArray(data.days) && (data.days as string[]).length > 0) {
    return { holidays: daysFrom(data.days as string[], month), errors: [] };
  }

  const fetchHolidays = deps.fetchHolidays ?? fetchApiHolidays;
  const { days, errors } = await fetchHolidays(year);

  if (days.size) {
    // hangatkan cache; kegagalan menulis tidak merusak hasil
    await saveHolidayCache(supabase, year, [...days], "api");
  }

  const holidays = daysFrom([...days], month);
  if (!holidays.size && !errors.length) {
    errors.push(`Tidak ada hari libur untuk ${MONTHS_INDONESIA[month]} ${year}`);
  }
  return { holidays, errors };
}
