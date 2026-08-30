import { MONTHS_INDONESIA } from "./constants";

export async function getHolidays(year: number, month: number): Promise<{ holidays: Set<number>; errors: string[] }> {
  const errors: string[] = [];
  const urls = [
    `https://indonesian-public-holidays.vercel.app/api?year=${year}`,
    `https://api-hari-libur.vercel.app/api?year=${year}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: unknown[] = Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? [];
      const holidays = new Set<number>();
      for (const item of list) {
        if (typeof item !== "object" || item === null || !("date" in item)) continue;
        const rec = item as Record<string, unknown>;
        if (rec.is_national_holiday === false) continue;
        const parts = String(rec.date).split("-");
        if (parts.length === 3 && Number(parts[0]) === year && Number(parts[1]) === month) holidays.add(Number(parts[2]));
      }
      if (holidays.size) return { holidays, errors };
      errors.push(`Tidak ada hari libur untuk ${MONTHS_INDONESIA[month]} ${year}`);
    } catch (e) {
      errors.push(`API ${url}: ${String(e)}`);
    }
  }
  return { holidays: new Set(), errors };
}
