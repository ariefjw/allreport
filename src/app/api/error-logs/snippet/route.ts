import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";
import { mapErrorLog } from "@/lib/db/mappers";

const SNIPPET_TITLE = "__live_snippet__";

function validDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function PUT(request: NextRequest) {
  try {
    const { response } = await requireAuth();
    if (response) return response;
    const supabase = await createClient();
    const body = await request.json() as { date?: string; text?: string };
    const date = body.date ?? null;
    if (!validDate(date) || typeof body.text !== "string") {
      return NextResponse.json({ error: "date and text are required" }, { status: 400 });
    }

    const { data: existing, error: findError } = await supabase
      .from("daily_error_log")
      .select("id")
      .eq("operational_date", date as string)
      .eq("error_title", SNIPPET_TITLE)
      .maybeSingle();
    if (findError) throw findError;

    const payload = {
      operational_date: date as string,
      error_title: SNIPPET_TITLE,
      error_text_log: body.text,
      screenshot_url: null,
    };
    const query = existing
      ? supabase.from("daily_error_log").update(payload).eq("id", existing.id)
      : supabase.from("daily_error_log").insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return NextResponse.json(mapErrorLog(data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { response } = await requireAuth();
    if (response) return response;
    const date = request.nextUrl.searchParams.get("date");
    if (!validDate(date)) return NextResponse.json({ error: "date is required" }, { status: 400 });

    const supabase = await createClient();
    const { error } = await supabase
      .from("daily_error_log")
      .delete()
      .eq("operational_date", date)
      .eq("error_title", SNIPPET_TITLE);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
