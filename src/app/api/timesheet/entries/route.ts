import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { listEntries } from "@/lib/services/timesheet";
import { listTimesheetEntriesSchema } from "@/lib/api/validation";
import { mapTimesheetEntry } from "@/lib/db/mappers";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, response } = await requireAuth();
    if (response) return response;

    const parsed = listTimesheetEntriesSchema.safeParse({
      year: request.nextUrl.searchParams.get("year") ?? undefined,
      month: request.nextUrl.searchParams.get("month") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Filter tidak valid", issues: parsed.error.issues }, { status: 400 });
    }

    const rows = await listEntries(supabase!, user!.id, parsed.data);
    return NextResponse.json(rows.map(mapTimesheetEntry));
  } catch (error) {
    return handleApiError(error);
  }
}
