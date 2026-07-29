import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  updateCriticalJobEndTime,
  markCriticalJobFailed,
  resetCriticalJob,
} from "../critical-jobs";

function mockSupabase(overrides: Record<string, unknown> = {}) {
  const supabase = {
    from: () => supabase,
    select: () => supabase,
    eq: () => supabase,
    single: () => supabase,
    lte: () => supabase,
    order: () => supabase,
    update: () => supabase,
    insert: () => supabase,
    ...overrides,
  };
  return supabase;
}

describe("critical-jobs service", () => {
  it("markCriticalJobFailed updates status to *FAILED*", async () => {
    const expected = {
      id: "test-id",
      status: "*FAILED*",
      operational_date: "2026-07-28",
      job_id: 1,
    };

    const supabase = mockSupabase({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: expected, error: null }),
          }),
        }),
      }),
    });

    const result = await markCriticalJobFailed(supabase as never, "test-id");
    assert.equal(result.status, "*FAILED*");
    assert.equal(result.id, "test-id");
  });

  it("resetCriticalJob clears end_timestamp and sets *RUNNING*", async () => {
    const expected = {
      id: "test-id",
      status: "*RUNNING*",
      end_timestamp: null,
    };

    const supabase = mockSupabase({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: expected, error: null }),
          }),
        }),
      }),
    });

    const result = await resetCriticalJob(supabase as never, "test-id");
    assert.equal(result.status, "*RUNNING*");
    assert.equal(result.end_timestamp, null);
  });

  it("updateCriticalJobEndTime throws on missing job", async () => {
    const supabase = mockSupabase({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: new Error("Not found") }),
        }),
      }),
    });

    await assert.rejects(
      () => updateCriticalJobEndTime(supabase as never, "invalid-id", "01:00:00"),
      /Not found/
    );
  });
});
