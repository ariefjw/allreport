import { createClient } from "@supabase/supabase-js";

function assertEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}. Check your .env.local file.`);
  }
  return value;
}

export function createAdminClient() {
  return createClient(
    assertEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    assertEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
