"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import type { TimesheetEntry, TimesheetProfile } from "@/types";

export interface TimesheetProfileFields {
  employeeNo: string;
  fullName: string;
}

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return body.error ?? fallback;
}

export function useTimesheet() {
  const { isReady, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<TimesheetProfile | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const res = await fetch("/api/timesheet/profile");
    if (!res.ok) throw new Error(await readError(res, "Gagal memuat profil"));
    const data = (await res.json()) as TimesheetProfile | null;
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    refreshProfile()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat profil"))
      .finally(() => setLoading(false));
  }, [isReady, isAuthenticated, refreshProfile]);

  const loadEntries = useCallback(async (year: number, month?: number) => {
    const params = new URLSearchParams({ year: String(year) });
    if (month) params.set("month", String(month));
    const res = await fetch(`/api/timesheet/entries?${params}`);
    if (!res.ok) throw new Error(await readError(res, "Gagal memuat riwayat"));
    const rows = (await res.json()) as TimesheetEntry[];
    setEntries(rows);
    return rows;
  }, []);

  const saveProfile = useCallback(
    async (fields: TimesheetProfileFields, signatureFile?: File | null) => {
      const formData = new FormData();
      formData.append("employeeNo", fields.employeeNo);
      formData.append("fullName", fields.fullName);
      if (signatureFile && signatureFile.size > 0) formData.append("signature", signatureFile);

      const res = await fetch("/api/timesheet/profile", { method: "PUT", body: formData });
      if (!res.ok) throw new Error(await readError(res, "Gagal menyimpan profil"));
      const data = (await res.json()) as TimesheetProfile;
      setProfile(data);
      return data;
    },
    []
  );

  const removeSignature = useCallback(async () => {
    const res = await fetch("/api/timesheet/signature", { method: "DELETE" });
    if (!res.ok) throw new Error(await readError(res, "Gagal menghapus tanda tangan"));
    const data = (await res.json()) as TimesheetProfile;
    setProfile(data);
    return data;
  }, []);

  const download = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(path, init);
    if (!res.ok) throw new Error(await readError(res, "Gagal membuat timesheet"));
    return res.blob();
  }, []);

  return {
    profile,
    entries,
    loading,
    error,
    refreshProfile,
    loadEntries,
    saveProfile,
    removeSignature,
    download,
    ready: isReady && isAuthenticated,
  };
}