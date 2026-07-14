import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateErrorReportText } from "./error";
import type { DailyErrorLog } from "@/types";

describe("error report generator", () => {
  it("includes title, detail, and screenshot url", () => {
    const logs: DailyErrorLog[] = [
      {
        id: "err-1",
        operationalDate: "2026-07-14",
        errorTitle: "Timeout job",
        errorTextLog: "Task failed after 3600s",
        screenshotUrl: "https://example.com/shot.png",
        createdAt: new Date().toISOString(),
      },
    ];

    const report = generateErrorReportText(logs);
    assert.match(report, /REPORT ERROR OPERATIONAL/);
    assert.match(report, /Timeout job/);
    assert.match(report, /Task failed after 3600s/);
    assert.match(report, /https:\/\/example\.com\/shot\.png/);
  });
});
