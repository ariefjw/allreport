import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateIntradayReportText,
  generateIntradayFinishedTimeText,
} from "./intraday";
import type { DailyIntradayLog } from "@/types";

function makeBatch(
  batchNumber: number,
  startedTime: string,
  finishedTimestamp: string | null = null
): DailyIntradayLog {
  return {
    id: `id-${batchNumber}`,
    operationalDate: "2026-07-14",
    batchId: batchNumber,
    batchNumber,
    startedTime,
    finishedTimestamp,
    updatedAt: new Date().toISOString(),
  };
}

describe("intraday report generators", () => {
  it("includes only batches whose start time has passed", () => {
    const batches = [
      makeBatch(1, "08:30:00", "09:00:00"),
      makeBatch(2, "09:00:00"),
      makeBatch(3, "23:59:00"),
    ];

    const now = new Date("2026-07-14T10:00:00+07:00");
    const originalDate = Date;
    global.Date = class extends originalDate {
      constructor(...args: ConstructorParameters<typeof originalDate>) {
        if (args.length === 0) {
          super(now.getTime());
        } else {
          super(...args);
        }
      }
      static now() {
        return now.getTime();
      }
    } as typeof Date;

    try {
      const report = generateIntradayReportText(batches);
      assert.match(report, /batch 1: started 08:30 finished 09:00/);
      assert.match(report, /batch 2: started 09:00/);
      assert.doesNotMatch(report, /batch 3/);
      assert.match(report, /cbs_mspayment_intraday/);
    } finally {
      global.Date = originalDate;
    }
  });

  it("formats finished time list with HH:MM:SS lines", () => {
    const batches = [
      makeBatch(1, "08:30:00", "08:45:00"),
      makeBatch(2, "09:00:00", null),
      makeBatch(3, "09:30:00", "09:50:30"),
    ];

    const text = generateIntradayFinishedTimeText(batches);
    assert.equal(text, "08:45:00\n\n09:50:30");
  });
});
