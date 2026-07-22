"use client";

import { useEffect, useRef } from "react";
import type { DailyMonitoringLog } from "@/types";

function getWIBTime(): { hours: number } {
  const now = new Date();
  const wib = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  return { hours: wib.getHours() };
}

function jobsHaveStarted(jobs: DailyMonitoringLog[]): boolean {
  return jobs.some((j) => j.status !== "*WAITING*");
}

function formatSummary(jobs: DailyMonitoringLog[]): string {
  let waiting = 0, running = 0, done = 0, failed = 0;
  for (const j of jobs) {
    if (j.status === "*WAITING*") waiting++;
    else if (j.status === "*RUNNING*") running++;
    else if (j.status === "*DONE*") done++;
    else if (j.status === "*FAILED*") failed++;
  }
  const total = jobs.length;
  const pct = total > 0 ? Math.round(((done + failed) / total) * 100) : 0;
  return `${running} RUNNING · ${done} DONE · ${failed} FAILED · ${waiting} WAITING\nProgress: ${pct}%`;
}

export function useReportReminder(jobs: DailyMonitoringLog[]) {
  const lastNotifiedHour = useRef<number | null>(null);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const interval = setInterval(() => {
      const { hours } = getWIBTime();
      const now = new Date();
      if (now.getMinutes() !== 0) return;
      if (lastNotifiedHour.current === hours) return;
      if (!jobsHaveStarted(jobs)) return;

      lastNotifiedHour.current = hours;
      const hh = String(hours).padStart(2, "0");

      new Notification(`Job Track Central — ${hh}:00`, {
        body: formatSummary(jobs),
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [jobs]);
}
