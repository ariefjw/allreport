"use client";

import { useState, useEffect } from "react";
import { WIB } from "@/lib/operational-date";

export function useRealtimeClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return { timeStr: "", hours: 0, minutes: 0, seconds: 0 };
  }

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: WIB,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const timeStr = fmt.format(now);
  const [hStr, mStr, sStr] = timeStr.split(":");
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  const seconds = parseInt(sStr, 10);

  return { timeStr, hours, minutes, seconds };
}
