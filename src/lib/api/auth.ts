import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return { supabase: null, user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { supabase, user: session.user, response: null };
}

export function handleApiError(error: unknown) {
  console.error("[API Error]", error);
  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
