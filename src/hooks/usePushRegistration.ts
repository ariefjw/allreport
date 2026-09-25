"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export function usePushRegistration() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listeners: Array<{ remove: () => Promise<void> }> = [];

    (async () => {
      try {
        await PushNotifications.createChannel({
          id: "alarms",
          name: "Alarms",
          importance: 5,
          visibility: 1,
          sound: "default",
          vibrationPattern: [200, 100, 200],
          lights: true,
        } as never);
      } catch {}

      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== "granted") {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== "granted") return;

      await PushNotifications.register();

      const reg = await PushNotifications.addListener("registration", async ({ value }) => {
        try {
          await fetch("/api/push/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: value, platform: "android" }),
          });
        } catch {}
      });
      listeners.push(reg);

      const err = await PushNotifications.addListener("registrationError", () => {});
      listeners.push(err);

      const received = await PushNotifications.addListener("pushNotificationReceived", () => {});
      listeners.push(received);

      const action = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const target = (notification.data as Record<string, string> | undefined)?.targetPage;
        if (target) router.push(target);
      });
      listeners.push(action);
    })();

    return () => {
      listeners.forEach((l) => l.remove().catch(() => {}));
    };
  }, [router]);
}
