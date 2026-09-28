import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { deleteSignature } from "@/lib/services/timesheet";
import { mapTimesheetProfile } from "@/lib/db/mappers";

export async function DELETE() {
  try {
    const { supabase, user, response } = await requireAuth();
    if (response) return response;
    const profile = await deleteSignature(supabase!, user!.id);
    if (!profile) return NextResponse.json({ error: "Profil belum dibuat" }, { status: 404 });
    return NextResponse.json(mapTimesheetProfile(profile));
  } catch (error) {
    return handleApiError(error);
  }
}
