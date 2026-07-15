const WIB = "Asia/Jakarta";
const WIB_OFFSET = "+07:00";

export function getOperationalTimezone(): string {
  return (
    process.env.OPERATIONAL_TIMEZONE ??
    process.env.NEXT_PUBLIC_OPERATIONAL_TIMEZONE ??
    WIB
  );
}

export function getOperationalDate(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: getOperationalTimezone(),
  });
}

export function getCriticalOperationalDate(): string {
  const now = new Date();
  
  const wibString = now.toLocaleString("en-US", {
    timeZone: WIB,
    hour12: false,
  });
  const wibDate = new Date(wibString);
  const hours = wibDate.getHours();

  if (hours < 21) {
    wibDate.setDate(wibDate.getDate() - 1);
  }

  const yyyy = wibDate.getFullYear();
  const mm = String(wibDate.getMonth() + 1).padStart(2, "0");
  const dd = String(wibDate.getDate()).padStart(2, "0");
  
  return `${yyyy}-${mm}-${dd}`;
}

export function buildScheduledTimestamp(
  operationalDate: string,
  scheduleTime: string,
  isCrossDay: boolean
): string {
  const dateObj = new Date(`${operationalDate}T12:00:00Z`);
  if (!isCrossDay) {
    dateObj.setUTCDate(dateObj.getUTCDate() + 1);
  }
  const targetDateStr = dateObj.toISOString().split("T")[0];

  const parts = scheduleTime.split(":");
  const h = String(parts[0] ?? 0).padStart(2, "0");
  const m = String(parts[1] ?? 0).padStart(2, "0");
  const s = String(parts[2] ?? 0).padStart(2, "0");

  return new Date(`${targetDateStr}T${h}:${m}:${s}${WIB_OFFSET}`).toISOString();
}

export function combineScheduledDateWithTime(
  scheduledTimestamp: string,
  timeStr: string
): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const wibDateStr = fmt.format(new Date(scheduledTimestamp));

  const parts = timeStr.split(":");
  const h = String(parts[0] ?? 0).padStart(2, "0");
  const m = String(parts[1] ?? 0).padStart(2, "0");
  const s = String(parts[2] ?? 0).padStart(2, "0");

  return new Date(`${wibDateStr}T${h}:${m}:${s}${WIB_OFFSET}`).toISOString();
}

export function combineOperationalDateWithTime(
  operationalDate: string,
  timeStr: string
): string {
  const parts = timeStr.split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(
    `${operationalDate}T${pad(parts[0] ?? 0)}:${pad(parts[1] ?? 0)}:${pad(parts[2] ?? 0)}${WIB_OFFSET}`
  ).toISOString();
}
