"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { DailyErrorLog } from "@/types";
import { getOperationalDate } from "@/lib/operational-date";

export function useErrorLogs() {
  const { isReady, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<DailyErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    const res = await fetch("/api/error-logs");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to fetch error logs");
    }
    return res.json() as Promise<DailyErrorLog[]>;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLogs();
      setLogs(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, [fetchLogs]);

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
      .channel("error-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_error_log",
          filter: `operational_date=eq.${operationalDate}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady, isAuthenticated, refresh]);

  const createLog = useCallback(
    async (input: {
      errorTitle: string;
      errorTextLog: string;
      screenshotFile?: File | null;
    }) => {
      const formData = new FormData();
      formData.append("errorTitle", input.errorTitle);
      formData.append("errorTextLog", input.errorTextLog);
      if (input.screenshotFile) {
        formData.append("screenshot", input.screenshotFile);
      }

      const res = await fetch("/api/error-logs", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save error log");
      }

      const created = await res.json();
      setLogs((prev) => [created, ...prev]);
      return created as DailyErrorLog;
    },
    []
  );

  return { logs, loading, error, createLog, refresh };
}
