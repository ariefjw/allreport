import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { updateAlarm, deleteAlarm } from "@/lib/services/alarms";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const body = await request.json();
    const alarm = await updateAlarm(supabase!, id, body);
    return NextResponse.json(alarm);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    await deleteAlarm(supabase!, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
