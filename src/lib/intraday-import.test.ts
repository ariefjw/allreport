import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseIntradayReport } from "./intraday-import";
import type { DailyIntradayLog } from "@/types";

function batch(input: Partial<DailyIntradayLog> & { id: string; batchNumber: number; startedTime: string }): DailyIntradayLog {
  return {
    operationalDate: "2026-08-19",
    batchId: input.batchNumber,
    finishedTimestamp: null,
    updatedAt: "2026-08-19T00:00:00.000Z",
    ...input,
  };
}

describe("intraday import parser", () => {
  it("imports finished time for unfinished batches", () => {
    const batches = [batch({ id: "b1", batchNumber: 1, startedTime: "08:30:00" })];

    const result = parseIntradayReport(
      "- batch 1: started 08:30 finished 08:44",
      batches
    );

    assert.deepEqual(result, [{ id: "b1", finishedTime: "08:44:00" }]);
  });

  it("imports start time override when started time differs", () => {
    const batches = [batch({ id: "b2", batchNumber: 2, startedTime: "09:00:00" })];

    const result = parseIntradayReport(
      "- batch 2: started 09:15 finished 09:30",
      batches
    );

    assert.deepEqual(result, [{ id: "b2", startedTime: "09:15:00", finishedTime: "09:30:00" }]);
  });

  it("can import start time override without finished time", () => {
    const batches = [batch({ id: "b3", batchNumber: 3, startedTime: "09:30:00" })];

    const result = parseIntradayReport("- batch 3: started 09:45", batches);

    assert.deepEqual(result, [{ id: "b3", startedTime: "09:45:00" }]);
  });

  it("does not import finished time for already completed batches", () => {
    const batches = [
      batch({
        id: "b4",
        batchNumber: 4,
        startedTime: "10:00:00",
        finishedTimestamp: "2026-08-19T03:10:00.000Z",
      }),
    ];

    const result = parseIntradayReport(
      "- batch 4: started 10:00 finished 10:14",
      batches
    );

    assert.deepEqual(result, []);
  });
});
