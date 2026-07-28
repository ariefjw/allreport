"use client";

import { useState, useEffect, useCallback } from "react";
import type { AlarmSchedule } from "@/types";

export function useAlarms() {
  const [alarms, setAlarms] = useState<AlarmSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/alarms");
      if (!res.ok) throw new Error("Failed to fetch alarms");
      const data = await res.json();
      setAlarms(data);
    } catch (err) {
      console.error("Failed to fetch alarms:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: { alarmTime: string; label?: string; daysOfWeek?: number; targetPage?: string }) => {
      const res = await fetch("/api/alarms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to create alarm");
      const created = await res.json();
      setAlarms((prev) => [...prev, created].sort((a, b) => a.alarmTime.localeCompare(b.alarmTime)));
      return created;
    },
    []
  );

  const update = useCallback(
    async (id: string, input: Partial<{ alarmTime: string; label: string; daysOfWeek: number; targetPage: string | null; enabled: boolean }>) => {
      const res = await fetch(`/api/alarms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to update alarm");
      const updated = await res.json();
      setAlarms((prev) => prev.map((a) => (a.id === id ? updated : a)));
      return updated;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/alarms/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete alarm");
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { alarms, loading, refresh, create, update, remove };
}
