import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { updateIntradayJob } from "@/lib/services/intraday-jobs";
import { mapIntradayLog } from "@/lib/db/mappers";
import { patchIntradayJobSchema } from "@/lib/api/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const body = patchIntradayJobSchema.parse(await request.json());

    const row = await updateIntradayJob(supabase!, id, {
      finishedTime: body.finishedTime,
      startedTime: body.startedTime,
    });
    return NextResponse.json(mapIntradayLog(row));
  } catch (error) {
    return handleApiError(error);
  }
}
