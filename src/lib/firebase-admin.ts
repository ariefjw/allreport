import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging as _getMessaging } from "firebase-admin/messaging";

let cached: App | null = null;

function getServiceAccount(): Parameters<typeof cert>[0] | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Parameters<typeof cert>[0];
  } catch {
    return null;
  }
}

export function getAdmin(): App {
  if (cached) return cached;
  if (getApps().length > 0 && getApps()[0]) {
    cached = getApps()[0] as App;
    return cached;
  }
  const sa = getServiceAccount();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (sa) {
    cached = initializeApp({ credential: cert(sa), projectId });
  } else if (projectId) {
    cached = initializeApp({ projectId } as never);
  } else {
    cached = initializeApp();
  }
  return cached;
}

export function getMessaging() {
  getAdmin();
  return _getMessaging();
}
