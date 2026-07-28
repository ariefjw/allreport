"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useRealtimeClock } from "@/hooks/useRealtimeClock";
import { useAlarms } from "@/hooks/useAlarms";
import { FloatingAlert } from "@/components/ui/FloatingAlert";

interface AlarmContextValue {
  ringing: boolean;
  activeAlarms: { label: string; id: string }[];
  dismissAlarm: (id: string) => void;
  showPanel: boolean;
  setShowPanel: (show: boolean) => void;
}

const AlarmContext = createContext<AlarmContextValue>({
  ringing: false,
  activeAlarms: [],
  dismissAlarm: () => {},
  showPanel: false,
  setShowPanel: () => {},
});

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const { timeStr, hours, minutes, seconds } = useRealtimeClock();
  const { alarms, refresh } = useAlarms();
  const [activeAlarms, setActiveAlarms] = useState<{ label: string; id: string }[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const lastTriggered = useRef<Map<string, number>>(new Map());
  const titleFlashId = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismissAlarm = useCallback((id: string) => {
    setActiveAlarms((prev) => prev.filter((a) => a.id !== id));
    lastTriggered.current.set(id, Date.now());
  }, []);

  const stopTitleFlash = useCallback(() => {
    if (titleFlashId.current) {
      clearInterval(titleFlashId.current);
      titleFlashId.current = null;
      document.title = "Job Track Central";
    }
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
          new Notification("⏰ Alarm", {
            body: alarm.label || `Alarm at ${alarm.alarmTime}`,
          });
        } catch {
          /* browser notif may fail silently */
        }
      }

      // Layer 3: Document title flash
      stopTitleFlash();
      let toggle = true;
      titleFlashId.current = setInterval(() => {
        document.title = toggle ? "🔔 Alarm!" : "Job Track Central";
        toggle = !toggle;
      }, 1000);
      setTimeout(stopTitleFlash, 10_000);

      // Layer 4: Speech Synthesis
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(alarm.label || "Alarm");
          utterance.lang = "id-ID";
          window.speechSynthesis.speak(utterance);
        } catch {
          /* speech may fail */
        }
      }
    },
    [stopTitleFlash]
  );

  // Alarm check every second
  useEffect(() => {
    const active = alarms.filter(
      (a) =>
        a.enabled &&
        (a.daysOfWeek & (1 << new Date().getDay())) !== 0
    );

    const match = active.find((a) => a.alarmTime === timeStr);
    if (match) {
      triggerAlarm(match);
    }
  }, [timeStr, alarms, triggerAlarm]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Cleanup title flash on unmount
  useEffect(() => {
    return () => {
      if (titleFlashId.current) clearInterval(titleFlashId.current);
    };
  }, []);

  const latest = activeAlarms[activeAlarms.length - 1];

  return (
    <AlarmContext.Provider value={{ ringing: activeAlarms.length > 0, activeAlarms, dismissAlarm, showPanel, setShowPanel }}>
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
    </AlarmContext.Provider>
  );
}

export function useAlarmContext() {
  return useContext(AlarmContext);
}
