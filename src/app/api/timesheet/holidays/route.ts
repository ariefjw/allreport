import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { getHolidays } from "@/lib/timesheet/holidays";
import { z } from "zod";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

/**
 * Hari libur nasional untuk satu bulan, dipakai modal checklist agar hari libur
 * otomatis tercentang. Cache miss ditangani di lib holidays (isi otomatis).
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const parsed = querySchema.safeParse({
      year: request.nextUrl.searchParams.get("year"),
      month: request.nextUrl.searchParams.get("month"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Parameter tidak valid", issues: parsed.error.issues }, { status: 400 });
    }

    const { year, month } = parsed.data;
    const { holidays, errors } = await getHolidays(supabase!, year, month);
    if (errors.length) console.warn("[Timesheet] hari libur:", errors.join(" | "));
    return NextResponse.json({ year, month, days: [...holidays].sort((a, b) => a - b) });
  } catch (error) {
    return handleApiError(error);
  }
}
