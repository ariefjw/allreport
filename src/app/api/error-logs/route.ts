import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { getErrorLogs, createErrorLog } from "@/lib/services/error-logs";
import { mapErrorLog } from "@/lib/db/mappers";

export async function GET() {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const rows = await getErrorLogs(supabase!);
    return NextResponse.json(rows.map(mapErrorLog));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const formData = await request.formData();
    const errorTitle = formData.get("errorTitle") as string;
    const errorTextLog = formData.get("errorTextLog") as string;
    const screenshot = formData.get("screenshot") as File | null;

    if (!errorTitle?.trim() || !errorTextLog?.trim()) {
      return NextResponse.json({ error: "Title and log are required" }, { status: 400 });
    }

    const row = await createErrorLog(supabase!, {
      errorTitle: errorTitle.trim(),
      errorTextLog: errorTextLog.trim(),
      screenshotFile: screenshot && screenshot.size > 0 ? screenshot : null,
    });

    return NextResponse.json(mapErrorLog(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
