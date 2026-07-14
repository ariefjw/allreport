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

export function buildScheduledTimestamp(
  operationalDate: string,
  scheduleTime: string,
  isCrossDay: boolean
): string {
  const d = new Date(`${operationalDate}T00:00:00${WIB_OFFSET}`);
  if (!isCrossDay) {
    d.setDate(d.getDate() + 1);
  }
  const parts = scheduleTime.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const s = parts[2] ?? 0;
  d.setHours(h, m, s, 0);
  return d.toISOString();
}

export function combineScheduledDateWithTime(
  scheduledTimestamp: string,
  timeStr: string
): string {
  const scheduled = new Date(scheduledTimestamp);
  const parts = timeStr.split(":").map(Number);
  scheduled.setHours(parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, 0);
  return scheduled.toISOString();
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
