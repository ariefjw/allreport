import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { getErrorLogs, createErrorLog, deleteErrorLog } from "@/lib/services/error-logs";
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
    const errorTitle = formData.get("errorTitle") as string | null;
    const errorTextLog = formData.get("errorTextLog") as string | null;
    const screenshot = formData.get("screenshot") as File | null;

    const row = await createErrorLog(supabase!, {
      errorTitle: errorTitle?.trim() || undefined,
      errorTextLog: errorTextLog?.trim() || undefined,
      screenshotFile: screenshot && screenshot.size > 0 ? screenshot : null,
    });

    return NextResponse.json(mapErrorLog(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const screenshotUrl = request.nextUrl.searchParams.get("screenshotUrl");

    await deleteErrorLog(supabase!, id, screenshotUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
