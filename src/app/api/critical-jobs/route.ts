import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { getCriticalJobs } from "@/lib/services/critical-jobs";
import { mapCriticalLog } from "@/lib/db/mappers";

export async function GET() {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const rows = await getCriticalJobs(supabase!);
    return NextResponse.json(rows.map(mapCriticalLog));
  } catch (error) {
    return handleApiError(error);
  }
}
