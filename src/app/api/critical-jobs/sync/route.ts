import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { ensureCriticalDailyLogs, syncCriticalRunningStatus } from "@/lib/services/critical-jobs";

export async function GET() {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    await ensureCriticalDailyLogs(supabase!);
    await syncCriticalRunningStatus(supabase!);

    return NextResponse.json({ synced: true });
  } catch (error) {
    return handleApiError(error);
  }
}
