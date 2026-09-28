import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getHolidays, saveHolidayCache, type HolidaySource } from "./holidays";

type Row = { year: number; days: string[]; source: HolidaySource; fetched_at?: string };

/** Seed SKB 3 Menteri yang juga dimasukkan oleh migration 20260929_holidays_cache. */
const SEED: Row[] = [
  {
    year: 2025,
    source: "local",
    days: ["01-01", "01-27", "01-29", "03-29", "03-31", "04-01", "04-18", "04-20", "05-01", "05-12", "05-29", "06-01", "06-06", "06-27", "08-17", "09-05", "12-25"],
  },
  {
    year: 2026,
    source: "local",
    days: ["01-01", "01-16", "02-17", "03-19", "03-21", "03-22", "04-03", "04-05", "05-01", "05-14", "05-27", "05-31", "06-01", "06-16", "08-17", "08-25", "12-25"],
  },
  {
    year: 2027,
    source: "local",
    days: ["01-01", "01-05", "02-06", "03-08", "03-10", "03-11", "03-26", "03-28", "05-01", "05-06", "05-17", "05-20", "06-01", "06-06", "08-15", "08-17", "12-25", "12-26"],
  },
];

function fakeSupabase(seed: Row[] = SEED.map((r) => ({ ...r, days: [...r.days] }))) {
  const store = seed;
  const client = {
    from(table: string) {
      assert.equal(table, "holidays_cache");
      return {
        select() {
          return {
            eq(_col: string, value: number) {
              return {
                maybeSingle: async () => {
                  const found = store.find((r) => r.year === value);
                  return { data: found ? { year: found.year, days: found.days } : null, error: null };
                },
              };
            },
          };
        },
        upsert: async (payload: Row) => {
          const existing = store.find((r) => r.year === payload.year);
          if (existing) Object.assign(existing, payload);
          else store.push({ ...payload });
          return { error: null };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, store };
}

const noNetwork = {
  fetchHolidays: async (year: number) => ({
    days: new Set<string>([`12-25`]),
    errors: [`jaringan dimatikan untuk test (${year})`],
  }),
};

describe("holiday cache (Supabase, no network)", () => {
  it("serves 2026 national holidays from the cache", async () => {
    const { client } = fakeSupabase();
    const { holidays, errors } = await getHolidays(client, 2026, 3, noNetwork);
    assert.deepEqual([...holidays].sort((a, b) => a - b), [19, 21, 22]);
    assert.deepEqual(errors, []);
  });

  it("returns an empty month without calling the API", async () => {
    const { client } = fakeSupabase();
    let called = 0;
    const { holidays, errors } = await getHolidays(client, 2026, 9, {
      fetchHolidays: async (year) => {
        called++;
        return { days: new Set<string>(), errors: [`tidak boleh dipanggil (${year})`] };
      },
    });
    assert.equal(holidays.size, 0);
    assert.deepEqual(errors, []);
    assert.equal(called, 0);
  });

  it("keeps the yearly totals matching the published SKB counts", async () => {
    const { client } = fakeSupabase();
    const count = async (year: number) => {
      let total = 0;
      for (let month = 1; month <= 12; month++) total += (await getHolidays(client, year, month, noNetwork)).holidays.size;
      return total;
    };
    assert.equal(await count(2025), 17);
    assert.equal(await count(2026), 17);
    assert.equal(await count(2027), 18);
  });

  it("covers Idul Fitri 2025 (31 Mar - 1 Apr) and Idul Fitri 2027 (10-11 Mar)", async () => {
    const { client } = fakeSupabase();
    const mar2025 = await getHolidays(client, 2025, 3, noNetwork);
    assert.ok(mar2025.holidays.has(31));
    const apr2025 = await getHolidays(client, 2025, 4, noNetwork);
    assert.ok(apr2025.holidays.has(1));
    const mar2027 = await getHolidays(client, 2027, 3, noNetwork);
    assert.ok(mar2027.holidays.has(10) && mar2027.holidays.has(11));
  });

  it("answers in well under 50 ms without touching the network", async () => {
    const { client } = fakeSupabase();
    const start = performance.now();
    await getHolidays(client, 2026, 3, noNetwork);
    await getHolidays(client, 2026, 4, noNetwork);
    assert.ok(performance.now() - start < 50, "cache hit must not touch the network");
  });

  it("falls back to the API on a cache miss and warms the cache", async () => {
    const { client, store } = fakeSupabase([]);
    const { holidays, errors } = await getHolidays(client, 2030, 12, {
      fetchHolidays: async () => ({ days: new Set(["12-25", "12-31"]), errors: [] }),
    });
    assert.deepEqual([...holidays], [25, 31]);
    assert.deepEqual(errors, []);
    assert.deepEqual(store, [
      { year: 2030, days: ["12-25", "12-31"], source: "api", fetched_at: store[0].fetched_at },
    ]);
  });

  it("reports the API error when the cache is empty", async () => {
    const { client } = fakeSupabase([]);
    const { holidays, errors } = await getHolidays(client, 2030, 1, {
      fetchHolidays: async () => ({ days: new Set<string>(), errors: ["provider down"] }),
    });
    assert.equal(holidays.size, 0);
    assert.ok(errors.some((e) => e.includes("provider down")));
  });

  it("treats an empty cached row as a miss", async () => {
    const { client } = fakeSupabase([{ year: 2031, days: [], source: "api" }]);
    const { holidays } = await getHolidays(client, 2031, 1, {
      fetchHolidays: async () => ({ days: new Set(["01-01"]), errors: [] }),
    });
    assert.deepEqual([...holidays], [1]);
  });
});

describe("saveHolidayCache", () => {
  it("never lets API data overwrite the SKB seed years", async () => {
    const { client, store } = fakeSupabase();
    const result = await saveHolidayCache(client, 2026, ["01-01"], "api");
    assert.equal(result.skipped, true);
    assert.equal(result.error, undefined);
    assert.deepEqual(store.find((r) => r.year === 2026)?.days, SEED[1].days);
  });

  it("writes API data for years outside the seed", async () => {
    const { client, store } = fakeSupabase();
    const result = await saveHolidayCache(client, 2030, ["01-01", "12-25"], "api");
    assert.equal(result.skipped, false);
    assert.deepEqual(store.find((r) => r.year === 2030)?.days, ["01-01", "12-25"]);
  });
});
