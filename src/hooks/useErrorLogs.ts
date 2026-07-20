"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import type { DailyErrorLog } from "@/types";

export function useErrorLogs() {
  const { isReady, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<DailyErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Inisialisasi Supabase
  const supabase = useMemo(() => createClient(), []);

  const fetchLogs = useCallback(async () => {
    // ... (Logika fetch API Anda saat ini, misal fetch("/api/error-logs"))
    const res = await fetch("/api/error-logs");
    if (!res.ok) throw new Error("Failed to fetch logs");
    return res.json();
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

  // 2. Initial Fetch
  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [isReady, isAuthenticated, refresh]);

  // 3. ✨ INI BAGIAN REAL-TIME NYA ✨
  useEffect(() => {
    if (!isReady || !isAuthenticated) return;

    // Mendengarkan setiap ada data (snippet) baru yang masuk ke tabel
    const channel = supabase
      .channel("error-snippets-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT", // Hanya dengarkan saat ada snippet baru yang dibuat
          schema: "public",
          table: "daily_error_log", // GANTI dengan nama tabel error log Anda di Supabase!
        },
        (payload) => {
          console.log("Snippet baru terdeteksi dari user lain!", payload);
          refresh(); // Langsung perbarui layar secara otomatis
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady, isAuthenticated, refresh, supabase]);

  const createLog = useCallback(async (data: { errorTitle: string; errorTextLog?: string; screenshotFile?: File | null }) => {
  const formData = new FormData();
  formData.append("errorTitle", data.errorTitle);
  if (data.errorTextLog) formData.append("errorTextLog", data.errorTextLog);
  if (data.screenshotFile) formData.append("screenshot", data.screenshotFile);

  // 2. KIRIM SEBAGAI FORMDATA
  const res = await fetch("/api/error-logs", {
    method: "POST",
    // PENTING: Hapus header Content-Type! 
    // Browser akan mengisi 'multipart/form-data' secara otomatis dengan boundary yang unik.
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to save log");
  }
  
  await refresh();
}, [refresh]);

  // Tambahkan di dalam useErrorLogs()
const broadcastSnippet = useCallback((text: string) => {
  supabase.channel('snippet-room').send({
    type: 'broadcast',
    event: 'snippet-update',
    payload: { text },
  });
}, [supabase]);

  const deleteLog = useCallback(async (id: string, screenshotUrl: string | null) => {
    const params = new URLSearchParams({ id });
    if (screenshotUrl) params.set("screenshotUrl", screenshotUrl);

    const res = await fetch(`/api/error-logs?${params}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to delete");
    }
    await refresh();
  }, [refresh]);

  const deleteMultipleLogs = useCallback(async (items: { id: string; screenshotUrl: string | null }[]) => {
    await Promise.all(items.map((item) => deleteLog(item.id, item.screenshotUrl)));
  }, [deleteLog]);

  return { logs, loading, error, createLog, refresh, broadcastSnippet, deleteLog, deleteMultipleLogs };
}