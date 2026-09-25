import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { registerPushToken, removePushToken } from "@/lib/services/push";
import { z } from "zod";

const registerSchema = z.object({ token: z.string().min(10), platform: z.string().optional() });

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, response } = await requireAuth();
    if (response) return response;
    const body = registerSchema.parse(await request.json());
    const row = await registerPushToken(supabase!, user!.id, body.token, body.platform ?? "android");
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;
    const { token } = z.object({ token: z.string().min(10) }).parse(await request.json());
    await removePushToken(supabase!, token);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
