import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeDailySheets } from "@/lib/services/daily-init";
import { handleApiError } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  return runDailyInit(request);
}

export async function POST(request: NextRequest) {
  return runDailyInit(request);
}

async function runDailyInit(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    await initializeDailySheets(supabase);

    return NextResponse.json({ success: true, date: new Date().toISOString() });
  } catch (error) {
    return handleApiError(error);
  }
}
