import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { updateIntradayFinishedTime } from "@/lib/services/intraday-jobs";
import { mapIntradayLog } from "@/lib/db/mappers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const body = await request.json();

    const row = await updateIntradayFinishedTime(
      supabase!,
      id,
      body.finishedTime ?? null
    );
    return NextResponse.json(mapIntradayLog(row));
  } catch (error) {
    return handleApiError(error);
  }
}
