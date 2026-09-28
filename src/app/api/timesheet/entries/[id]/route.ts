import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { getEntry, getProfile, getSignatureDataUrl } from "@/lib/services/timesheet";
import { buildTimesheet, TIMESHEET_CONTENT_TYPE } from "@/lib/timesheet/build";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const entry = await getEntry(supabase!, user!.id, id);
    if (!entry) return NextResponse.json({ error: "Timesheet tidak ditemukan" }, { status: 404 });

    const profile = await getProfile(supabase!, user!.id);
    const signatureDataUrl = profile ? await getSignatureDataUrl(supabase!, profile.signature_path, profile.signature_mime) : null;

    const built = await buildTimesheet({
      employee: {
        employeeNo: entry.employee_no,
        fullName: entry.full_name,
        organization: entry.organization,
        position: entry.position,
        client: entry.client,
        project: entry.project,
      },
      scheduleText: entry.schedule_text,
      month: entry.operational_month,
      year: entry.operational_year,
      autoHoliday: entry.auto_holiday,
      manualHolidays: entry.manual_holidays,
      storedHolidayDays: entry.holiday_days,
      signatureDataUrl,
      signatureMime: profile?.signature_mime ?? null,
      supabase: supabase!,
    });

    return new NextResponse(built.buffer as unknown as BodyInit, {
      headers: {
        "Content-Disposition": `attachment; filename="${built.fileName}"`,
        "Content-Type": TIMESHEET_CONTENT_TYPE,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
