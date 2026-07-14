/**
 * Integration test: DB read/write for intraday, critical, and error logs.
 * Usage: npx tsx scripts/test-db-integration.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import {
  ensureIntradayDailyLogs,
  getIntradayJobs,
  updateIntradayFinishedTime,
} from "../src/lib/services/intraday-jobs";
import { getCriticalJobs } from "../src/lib/services/critical-jobs";
import { createErrorLog, getErrorLogs } from "../src/lib/services/error-logs";
import { mapIntradayLog } from "../src/lib/db/mappers";
import {
  generateIntradayReportText,
  generateIntradayFinishedTimeText,
} from "../src/lib/report-generators/intraday";
import { generateCriticalReportText } from "../src/lib/report-generators/critical";
import { generateErrorReportText } from "../src/lib/report-generators/error";
import { INTRADAY_BATCH_TIMES } from "../src/lib/intraday-schedule";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.error("Missing .env.local — copy from .env.local.example");
    process.exit(1);
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  });

  console.log("1. Checking master intraday batch schedule...");
  const { data: masterBatches, error: masterError } = await supabase
    .from("master_intraday_batches")
    .select("batch_number, default_started_time")
    .order("batch_number");

  if (masterError) throw masterError;
  assert(masterBatches?.length === INTRADAY_BATCH_TIMES.length, `Expected ${INTRADAY_BATCH_TIMES.length} master batches, got ${masterBatches?.length}`);

  const firstTime = String(masterBatches![0].default_started_time).slice(0, 8);
  const lastTime = String(masterBatches!.at(-1)!.default_started_time).slice(0, 8);
  assert(firstTime === "08:30:00", `First batch should be 08:30:00, got ${firstTime}`);
  assert(lastTime === "17:30:00", `Last batch should be 17:30:00, got ${lastTime}`);
  console.log(`   OK — ${masterBatches!.length} batches (${firstTime} → ${lastTime})`);

  console.log("2. Ensuring daily intraday logs...");
  await ensureIntradayDailyLogs(supabase);
  const intradayRows = await getIntradayJobs(supabase);
  assert(intradayRows.length === INTRADAY_BATCH_TIMES.length, `Expected ${INTRADAY_BATCH_TIMES.length} daily intraday rows`);
  console.log(`   OK — ${intradayRows.length} daily intraday rows`);

  console.log("3. Saving finished time to DB...");
  const target = intradayRows[0];
  const saved = await updateIntradayFinishedTime(supabase, target.id, "09:15:00");
  assert(saved.finished_timestamp !== null, "finished_timestamp should be saved");
  const mapped = mapIntradayLog(saved);
  assert(mapped.finishedTimestamp === "09:15:00", `Expected 09:15:00, got ${mapped.finishedTimestamp}`);
  console.log(`   OK — batch ${target.batch_number} finished at ${mapped.finishedTimestamp}`);

  console.log("4. Testing copy report text generation...");
  const batches = intradayRows.map(mapIntradayLog);
  const report = generateIntradayReportText(batches);
  const finishedList = generateIntradayFinishedTimeText(batches);
  assert(report.includes("cbs_mspayment_intraday"), "Intraday report missing job name");
  assert(report.includes("batch 1:"), "Intraday report missing batch line");
  assert(typeof finishedList === "string", "Finished time list should be a string");
  console.log("   OK — intraday report generated");
  console.log("   Sample report:\n---\n" + report.split("\n").slice(0, 5).join("\n") + "\n---");

  console.log("5. Testing critical jobs fetch + report...");
  const criticalRows = await getCriticalJobs(supabase);
  assert(criticalRows.length > 0, "Expected critical jobs");
  const criticalReport = generateCriticalReportText(
    criticalRows.map((row) => ({
      id: row.id,
      operationalDate: row.operational_date,
      jobId: row.job_id,
      jobName: row.job_name,
      scheduledTimestamp: row.scheduled_timestamp,
      endTimestamp: row.end_timestamp,
      status: row.status,
      updatedAt: row.updated_at,
    }))
  );
  assert(criticalReport.includes("Dear all,"), "Critical report missing header");
  console.log(`   OK — ${criticalRows.length} critical jobs, report generated`);

  console.log("6. Testing error log save + report...");
  const created = await createErrorLog(supabase, {
    errorTitle: `[TEST] Integration ${Date.now()}`,
    errorTextLog: "Automated integration test entry — safe to delete",
    screenshotFile: null,
  });
  assert(created.id, "Error log should be created");
  const errorRows = await getErrorLogs(supabase);
  assert(errorRows.some((r) => r.id === created.id), "Created error log not found on re-fetch");
  const errorReport = generateErrorReportText(
    errorRows.slice(0, 3).map((row) => ({
      id: row.id,
      operationalDate: row.operational_date,
      errorTitle: row.error_title,
      errorTextLog: row.error_text_log,
      screenshotUrl: row.screenshot_url,
      createdAt: row.created_at,
    }))
  );
  assert(errorReport.includes("REPORT ERROR OPERATIONAL"), "Error report missing header");
  console.log(`   OK — error log saved (id: ${created.id})`);

  console.log("\nAll integration checks passed.");
}

main().catch((err) => {
  console.error("\nIntegration test failed:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
