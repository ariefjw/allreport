"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { DailyMonitoringLog } from "@/types";
import { getCriticalOperationalDate } from "@/lib/operational-date";

export function useCriticalJobs() {
  const { isReady, isAuthenticated } = useAuth();
  const [jobs, setJobs] = useState<DailyMonitoringLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/critical-jobs");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to fetch critical jobs");
    }
    return res.json() as Promise<DailyMonitoringLog[]>;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchJobs();
      setJobs(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, [fetchJobs]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [isReady, isAuthenticated, refresh]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;

    const supabase = createClient();
    const operationalDate = getCriticalOperationalDate();

    const channel = supabase
      .channel("critical-jobs-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_monitoring_log",
          filter: `operational_date=eq.${operationalDate}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    const interval = setInterval(refresh, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isReady, isAuthenticated, refresh]);

  const updateEndTime = useCallback(
    async (id: string, endTime: string | null) => {
      const res = await fetch(`/api/critical-jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endTime }),
      });
      if (!res.ok) throw new Error("Failed to update end time");
      const updated = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    },
    []
  );

  const markFailed = useCallback(async (id: string) => {
    const res = await fetch(`/api/critical-jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_failed" }),
    });
    if (!res.ok) throw new Error("Failed to mark as failed");
    const updated = await res.json();
    setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
  }, []);

  const bulkImportEndTimes = useCallback(
    async (data: { id: string; endTime: string }[]) => {
      const res = await fetch("/api/critical-jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to import jobs");
      }
      
      // Refresh all data from server to ensure consistency
      await refresh();
    },
    [refresh]
  );

  return { jobs, loading, error, updateEndTime, markFailed, refresh, bulkImportEndTimes };
}
