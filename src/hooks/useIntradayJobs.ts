"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { DailyIntradayLog } from "@/types";
import { getOperationalDate } from "@/lib/operational-date";

export function useIntradayJobs() {
  const { isReady, isAuthenticated } = useAuth();
  const [batches, setBatches] = useState<DailyIntradayLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    const res = await fetch("/api/intraday-jobs");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to fetch intraday jobs");
    }
    return res.json() as Promise<DailyIntradayLog[]>;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchBatches();
      setBatches(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, [fetchBatches]);

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
    const operationalDate = getOperationalDate();

    const channel = supabase
      .channel("intraday-jobs-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_intraday_log",
          filter: `operational_date=eq.${operationalDate}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady, isAuthenticated, refresh]);

  const updateFinishedTime = useCallback(
    async (id: string, finishedTime: string | null) => {
      const url = `/api/intraday-jobs/${id}`;
      console.log("[DEBUG] PATCH url:", url, "body:", { finishedTime });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finishedTime }),
      });
      console.log("[DEBUG] PATCH response status:", res.status);
      if (!res.ok) {
        const errBody = await res.text();
        console.error("[DEBUG] PATCH error body:", errBody);
        throw new Error("Failed to update finished time");
      }
      const updated = await res.json();
      console.log("[DEBUG] PATCH updated data:", JSON.stringify(updated));
      setBatches((prev) => prev.map((b) => (b.id === id ? updated : b)));
    },
    []
  );

  return { batches, loading, error, updateFinishedTime, refresh };
}
