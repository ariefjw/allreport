import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { getProfile, upsertProfile } from "@/lib/services/timesheet";
import { timesheetProfileSchema } from "@/lib/api/validation";
import { mapTimesheetProfile } from "@/lib/db/mappers";

export async function GET() {
  try {
    const { supabase, user, response } = await requireAuth();
    if (response) return response;
    const profile = await getProfile(supabase!, user!.id);
    return NextResponse.json(profile ? mapTimesheetProfile(profile) : null);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, response } = await requireAuth();
    if (response) return response;

    const formData = await request.formData();
    const parsed = timesheetProfileSchema.safeParse({
      employeeNo: formData.get("employeeNo"),
      fullName: formData.get("fullName"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Data karyawan tidak lengkap", issues: parsed.error.issues }, { status: 400 });
    }

    const signature = formData.get("signature");
    const signatureFile = signature instanceof File && signature.size > 0 ? signature : null;

    const profile = await upsertProfile(supabase!, user!.id, parsed.data, signatureFile);
    return NextResponse.json(mapTimesheetProfile(profile));
  } catch (error) {
    return handleApiError(error);
  }
}
