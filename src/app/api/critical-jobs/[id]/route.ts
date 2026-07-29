import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import {
  updateCriticalJobEndTime,
  markCriticalJobFailed,
  resetCriticalJob,
} from "@/lib/services/critical-jobs";
import { mapCriticalLog } from "@/lib/db/mappers";
import { patchCriticalJobSchema } from "@/lib/api/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const body = patchCriticalJobSchema.parse(await request.json());

    if (body.action === "mark_failed") {
      const row = await markCriticalJobFailed(supabase!, id);
      return NextResponse.json(mapCriticalLog(row));
    }

    if (body.action === "reset") {
      const row = await resetCriticalJob(supabase!, id);
      return NextResponse.json(mapCriticalLog(row));
    }

    if ("endTime" in body) {
      const row = await updateCriticalJobEndTime(supabase!, id, body.endTime ?? null);
      return NextResponse.json(mapCriticalLog(row));
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
