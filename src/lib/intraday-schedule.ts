/** Intraday batches run every 30 minutes from 08:30 to 17:30 WIB. */
export const INTRADAY_START = "08:30:00";
export const INTRADAY_END = "17:30:00";
export const INTRADAY_INTERVAL_MINUTES = 30;

export function generateIntradayBatchTimes(
  start = INTRADAY_START,
  end = INTRADAY_END,
  intervalMinutes = INTRADAY_INTERVAL_MINUTES
): string[] {
  const parse = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  const format = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  };

  const times: string[] = [];
  let cursor = parse(start);
  const endMinutes = parse(end);

  while (cursor <= endMinutes) {
    times.push(format(cursor));
    cursor += intervalMinutes;
  }

  return times;
}

export const INTRADAY_BATCH_TIMES = generateIntradayBatchTimes();
