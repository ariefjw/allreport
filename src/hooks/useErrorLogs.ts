"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { DailyErrorLog } from "@/types";

export const LIVE_SNIPPET_TITLE = "__live_snippet__";

export function useErrorLogs(selectedDate?: string) {
  const { isReady, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<DailyErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchLogs = useCallback(async (date?: string) => {
    const url = date ? `/api/error-logs?date=${date}` : "/api/error-logs";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch logs");
    return res.json() as Promise<DailyErrorLog[]>;
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLogs(await fetchLogs(selectedDate));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, [fetchLogs, selectedDate]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [isReady, isAuthenticated, refresh]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !selectedDate) return;
    const channel = supabase
      .channel(`error-logs-${selectedDate}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "daily_error_log",
        filter: `operational_date=eq.${selectedDate}`,
      }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isReady, isAuthenticated, refresh, selectedDate, supabase]);

  const createLog = useCallback(async (data: { errorTitle: string; errorTextLog?: string; screenshotFile?: File | null }) => {
    const formData = new FormData();
    formData.append("errorTitle", data.errorTitle);
    if (data.errorTextLog) formData.append("errorTextLog", data.errorTextLog);
    if (data.screenshotFile) formData.append("screenshot", data.screenshotFile);
    const res = await fetch("/api/error-logs", { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to save log");
    }
    await refresh();
  }, [refresh]);

  const saveSnippet = useCallback(async (date: string, text: string) => {
    const res = await fetch("/api/error-logs/snippet", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, text }),
    });
    if (!res.ok) throw new Error("Failed to save snippet");
  }, []);

  const deleteSnippet = useCallback(async (date: string) => {
    const res = await fetch(`/api/error-logs/snippet?date=${date}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete snippet");
    await refresh();
  }, [refresh]);

  const deleteLog = useCallback(async (id: string, screenshotUrl: string | null) => {
    const params = new URLSearchParams({ id });
    if (screenshotUrl) params.set("screenshotUrl", screenshotUrl);
    const res = await fetch(`/api/error-logs?${params}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    await refresh();
  }, [refresh]);

  const deleteMultipleLogs = useCallback(async (items: { id: string; screenshotUrl: string | null }[]) => {
    await Promise.all(items.map((item) => deleteLog(item.id, item.screenshotUrl)));
  }, [deleteLog]);

  return { logs, loading, error, createLog, saveSnippet, deleteSnippet, refresh, deleteLog, deleteMultipleLogs };
}
