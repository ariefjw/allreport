import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateCriticalReportText, generateCriticalDurationText } from "./critical";
import type { DailyMonitoringLog } from "@/types";

const sampleJob: DailyMonitoringLog = {
  id: "job-1",
  operationalDate: "2026-07-14",
  jobId: 1,
  jobName: "dag_cbs_payment_job",
  scheduledTimestamp: "2026-07-14T00:30:00+07:00",
  endTimestamp: "2026-07-14T01:15:00+07:00",
  status: "*DONE*",
  updatedAt: new Date().toISOString(),
};

describe("critical report generators", () => {
  it("builds update report with job lines", () => {
    const report = generateCriticalReportText([sampleJob]);
    assert.match(report, /Dear all,/);
    assert.match(report, /dag_cbs_payment_job/);
    assert.match(report, /\*DONE\*/);
  });

  it("builds duration lines for completed jobs", () => {
    const duration = generateCriticalDurationText([sampleJob]);
    assert.equal(duration, "00:45:00");
  });
});
