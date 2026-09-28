import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/api/auth";
import { fetchApiHolidays, saveHolidayCache } from "@/lib/timesheet/holidays";

/**
 * Refresh `holidays_cache` dari API libur nasional publik.
 * Dipanggil pg_cron setiap hari 03:00/03:20/03:40 UTC (retry) lewat pg_net.
 * Tahun seed SKB (2025-2027) sengaja tidak ditimpa oleh data API.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nowYear = new Date().getUTCFullYear();
    const years = [nowYear - 1, nowYear, nowYear + 1, nowYear + 2];
    const supabase = createAdminClient();

    const refreshed: number[] = [];
    const skipped: number[] = [];
    const failed: { year: number; errors: string[] }[] = [];

    for (const year of years) {
      const { days, errors } = await fetchApiHolidays(year);
      if (!days.size) {
        failed.push({ year, errors });
        continue;
      }
      const result = await saveHolidayCache(supabase, year, [...days], "api");
      if (result.error) {
        failed.push({ year, errors: [`Simpan cache: ${result.error}`] });
        continue;
      }
      (result.skipped ? skipped : refreshed).push(year);
    }

    return NextResponse.json({ success: failed.length === 0, refreshed, skipped, failed, year: nowYear });
  } catch (error) {
    return handleApiError(error);
  }
}
