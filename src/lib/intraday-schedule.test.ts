import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateIntradayBatchTimes,
  INTRADAY_BATCH_TIMES,
} from "./intraday-schedule";

describe("intraday schedule", () => {
  it("generates 19 batches from 08:30 to 17:30 every 30 minutes", () => {
    const times = generateIntradayBatchTimes();
    assert.equal(times.length, 19);
    assert.deepEqual(times[0], "08:30:00");
    assert.deepEqual(times[1], "09:00:00");
    assert.deepEqual(times[times.length - 1], "17:30:00");
  });

  it("exports constant matching generator output", () => {
    assert.deepEqual(INTRADAY_BATCH_TIMES, generateIntradayBatchTimes());
  });
});
