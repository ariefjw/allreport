"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useRealtimeClock } from "@/hooks/useRealtimeClock";
import { useAlarms } from "@/hooks/useAlarms";
import { FloatingAlert } from "@/components/ui/FloatingAlert";
import { AlarmPanel } from "@/components/ui/AlarmPanel";

import type { AlarmSchedule } from "@/types";

interface AlarmContextValue {
  ringing: boolean;
  activeAlarms: { label: string; id: string }[];
  dismissAlarm: (id: string) => void;
  showPanel: boolean;
  setShowPanel: (show: boolean) => void;
  alarms: AlarmSchedule[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (input: { alarmTime: string; label?: string; daysOfWeek?: number; targetPage?: string }) => Promise<AlarmSchedule>;
  update: (id: string, input: Partial<{ alarmTime: string; label: string; daysOfWeek: number; targetPage: string | null; enabled: boolean }>) => Promise<AlarmSchedule>;
  remove: (id: string) => Promise<void>;
  masterEnabled: boolean;
  setMasterEnabled: (v: boolean) => void;
}

const AlarmContext = createContext<AlarmContextValue>({
  ringing: false,
  activeAlarms: [],
  dismissAlarm: () => {},
  showPanel: false,
  setShowPanel: () => {},
  alarms: [],
  loading: false,
  refresh: async () => {},
  create: async () => { throw new Error("not implemented"); },
  update: async () => { throw new Error("not implemented"); },
  remove: async () => {},
  masterEnabled: true,
  setMasterEnabled: () => {},
});

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const { timeStr } = useRealtimeClock();
  const { alarms, loading, refresh, create, update, remove } = useAlarms();
  const [activeAlarms, setActiveAlarms] = useState<{ label: string; id: string }[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const lastTriggered = useRef<Map<string, number>>(new Map());
  const titleFlashId = useRef<ReturnType<typeof setInterval> | null>(null);
  const beepRef = useRef<{ ctx: AudioContext; gain: GainNode; interval: ReturnType<typeof setInterval> } | null>(null);
  const faviconRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const origFaviconRef = useRef("");

  const stopBeep = useCallback(() => {
    if (beepRef.current) {
      clearInterval(beepRef.current.interval);
      beepRef.current.ctx.close().catch(() => {});
      beepRef.current = null;
    }
  }, []);

  const startBeep = useCallback(() => {
    stopBeep();
    try {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(gain);
      osc.start();

      const interval = setInterval(() => {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      }, 500);

      beepRef.current = { ctx, gain, interval };
    } catch {
      /* web audio may fail */
    }
  }, [stopBeep]);

  const stopFaviconFlash = useCallback(() => {
    if (faviconRef.current) {
      clearInterval(faviconRef.current);
      faviconRef.current = null;
    }
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link && origFaviconRef.current) {
      link.href = origFaviconRef.current;
    }
  }, []);

  const startFaviconFlash = useCallback(() => {
    stopFaviconFlash();
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) origFaviconRef.current = link.href;

    let toggle = true;
    faviconRef.current = setInterval(() => {
      const el = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (el) {
        el.href = toggle
          ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='80' font-size='80'%3E🔔%3C/text%3E%3C/svg%3E"
          : origFaviconRef.current;
        toggle = !toggle;
      }
    }, 1000);
  }, [stopFaviconFlash]);

  const stopTitleFlash = useCallback(() => {
    if (titleFlashId.current) {
      clearInterval(titleFlashId.current);
      titleFlashId.current = null;
      document.title = "Job Track Central";
    }
  }, []);

  const startTitleFlash = useCallback(() => {
    stopTitleFlash();
    let toggle = true;
    titleFlashId.current = setInterval(() => {
      document.title = toggle ? "🔔 Alarm!" : "Job Track Central";
      toggle = !toggle;
    }, 1000);
  }, [stopTitleFlash]);

  const dismissAlarm = useCallback((id: string) => {
    setActiveAlarms((prev) => prev.filter((a) => a.id !== id));
    lastTriggered.current.set(id, Date.now());
  }, []);

  const triggerAlarm = useCallback(
    (alarm: { id: string; label: string; alarmTime: string }) => {
      const now = Date.now();
      const last = lastTriggered.current.get(alarm.id) ?? 0;
      if (now - last < 60_000) return;

      lastTriggered.current.set(alarm.id, now);

      setActiveAlarms((prev) => {
        if (prev.some((a) => a.id === alarm.id)) return prev;
        return [...prev, { label: alarm.label || alarm.alarmTime, id: alarm.id }];
      });

      // Layer 1: Browser Notification
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          const notif = new Notification("⏰ Alarm", {
            body: alarm.label || `Alarm at ${alarm.alarmTime}`,
            tag: alarm.id,
            requireInteraction: true,
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch {
          /* browser notif may fail silently */
        }
      }

      // Layer 2: Sound — pip pip looping
      startBeep();

      // Layer 3: Document title flash (until dismissed)
      startTitleFlash();

      // Layer 4: Favicon flash (until dismissed)
      startFaviconFlash();

      // Layer 5: Haptic feedback (mobile)
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch {
          /* vibrate may fail */
        }
      }
    },
    [startBeep, startTitleFlash, startFaviconFlash]
  );

  // Alarm check every second
  useEffect(() => {
    if (!masterEnabled) return;

    const active = alarms.filter(
      (a) =>
        a.enabled &&
        (a.daysOfWeek & (1 << new Date().getDay())) !== 0
    );

    const match = active.find((a) => a.alarmTime === timeStr);
    if (match) {
      triggerAlarm(match);
    }
  }, [timeStr, alarms, triggerAlarm, masterEnabled]);

  // Stop all noise/flash when no alarms active
  useEffect(() => {
    if (activeAlarms.length === 0) {
      stopBeep();
      stopFaviconFlash();
      stopTitleFlash();
    }
  }, [activeAlarms, stopBeep, stopFaviconFlash, stopTitleFlash]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (titleFlashId.current) clearInterval(titleFlashId.current);
      if (faviconRef.current) clearInterval(faviconRef.current);
      stopBeep();
    };
  }, [stopBeep]);

  const latest = activeAlarms[activeAlarms.length - 1];

  return (
    <AlarmContext.Provider value={{ ringing: activeAlarms.length > 0, activeAlarms, dismissAlarm, showPanel, setShowPanel, alarms, loading, refresh, create, update, remove, masterEnabled, setMasterEnabled }}>
      {children}
      {latest && (
        <FloatingAlert
          message={latest.label || "Alarm"}
          type="alarm"
          visible
          persistent
          onDismiss={() => dismissAlarm(latest.id)}
          actionLabel="OK"
          onAction={() => dismissAlarm(latest.id)}
        />
      )}
      {showPanel && <AlarmPanel onClose={() => setShowPanel(false)} />}
    </AlarmContext.Provider>
  );
}

export function useAlarmContext() {
  return useContext(AlarmContext);
}
