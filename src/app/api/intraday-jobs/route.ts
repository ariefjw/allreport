import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { getIntradayJobs } from "@/lib/services/intraday-jobs";
import { mapIntradayLog } from "@/lib/db/mappers";

export async function GET() {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const rows = await getIntradayJobs(supabase!);
    return NextResponse.json(rows.map(mapIntradayLog));
  } catch (error) {
    return handleApiError(error);
  }
}
