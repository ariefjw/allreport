import { createBrowserClient } from "@supabase/ssr";

function assertEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing ${name}. Check your .env.local file.`);
  }
  return value;
}

function assertBrowserKey(key: string | undefined): string {
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy the Publishable key from Supabase Dashboard → Settings → API Keys."
    );
  }

  // Supabase new key format: sb_secret_* must NEVER be used in the browser
  if (key.startsWith("sb_secret_") || key.includes("service_role")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY contains a secret key. " +
        "Use the Publishable (anon) key for the browser, and put the Secret key only in SUPABASE_SERVICE_ROLE_KEY (server-side)."
    );
  }

  return key;
}

export function createClient() {
  return createBrowserClient(
    assertEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    assertBrowserKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
