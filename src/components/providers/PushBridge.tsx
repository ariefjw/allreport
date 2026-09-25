"use client";

import { usePushRegistration } from "@/hooks/usePushRegistration";

export function PushBridge() {
  usePushRegistration();
  return null;
}
