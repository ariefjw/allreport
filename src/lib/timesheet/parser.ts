export type Schedule = Record<number, [string, string][]>;

function normalizeTime(t: string): string {
  t = t.trim();
  if (t.includes(":")) return t;
  return t.padStart(2, "0") + ":00";
}

export function parseSchedule(rawData: string): Schedule {
  const schedule: Schedule = {};
  for (const rawLine of rawData.trim().split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    let parts = line.split("\t").filter(Boolean);
    if (parts.length < 3) parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 3) continue;
    const day = Number(parts[0]);
    if (!Number.isInteger(day) || day < 1 || day > 31) continue;
    const shifts: [string, string][] = [];
    for (const seg of parts[2].split("//")) {
      const segTrim = seg.trim();
      if (!segTrim) continue;
      if (segTrim.toLowerCase() === "off") continue;
      if (!segTrim.includes("-")) continue;
      const time = segTrim.replace(/ /g, "").split("-");
      if (time.length === 2) shifts.push([normalizeTime(time[0]), normalizeTime(time[1])]);
    }
    schedule[day] = shifts;
  }
  return schedule;
}
