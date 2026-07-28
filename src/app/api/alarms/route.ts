import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { getAlarms, createAlarm } from "@/lib/services/alarms";

export async function GET() {
  try {
    const { supabase, user, response } = await requireAuth();
    if (response) return response;

    const alarms = await getAlarms(supabase!, user!.id);
    return NextResponse.json(alarms);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const alarm = await createAlarm(supabase!, user!.id, {
      alarmTime: body.alarmTime,
      label: body.label ?? "",
      daysOfWeek: body.daysOfWeek ?? 127,
      targetPage: body.targetPage,
    });
    return NextResponse.json(alarm, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
