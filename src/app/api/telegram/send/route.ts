import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { sendTelegramMessage } from "@/lib/telegram/client";

export async function POST(request: NextRequest) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    await sendTelegramMessage(text);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
