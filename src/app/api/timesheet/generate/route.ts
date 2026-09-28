import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { getProfile, getSignatureDataUrl, createEntry } from "@/lib/services/timesheet";
import { buildTimesheet, TIMESHEET_CONTENT_TYPE } from "@/lib/timesheet/build";
import { generateTimesheetSchema } from "@/lib/api/validation";

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const parsed = generateTimesheetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Input tidak valid", issues: parsed.error.issues }, { status: 400 });
    }
    const input = parsed.data;

    const profile = await getProfile(supabase!, user!.id);
    if (!profile) {
      return NextResponse.json({ error: "Lengkapi Data Karyawan terlebih dahulu" }, { status: 400 });
    }

    const signatureDataUrl = await getSignatureDataUrl(supabase!, profile.signature_path, profile.signature_mime);

    // employeeNo/fullName come from the profile (server-side, tamper-proof);
    // the other four are the form's defaults, sent per request and snapshotted.
    const employee = {
      employeeNo: profile.employee_no,
      fullName: profile.full_name,
      organization: input.organization,
      position: input.position,
      client: input.client,
      project: input.project,
    };

    const built = await buildTimesheet({
      employee,
      scheduleText: input.schedule,
      month: input.month,
      year: input.year,
      autoHoliday: input.autoHoliday,
      manualHolidays: input.manualHolidays,
      signatureDataUrl,
      signatureMime: profile.signature_mime,
      overtimeFlags: input.overtimeFlags,
      supabase: supabase!,
    });

    try {
      await createEntry(supabase!, user!.id, {
        month: input.month,
        year: input.year,
        employee,
        scheduleText: input.schedule,
        autoHoliday: input.autoHoliday,
        manualHolidays: input.manualHolidays || null,
        holidayDays: built.holidayDays,
        totalHours: built.totalHours,
        hasSignature: built.hasSignature,
      });
    } catch (historyError) {
      console.warn("[Timesheet] riwayat tidak tersimpan:", historyError);
    }

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
