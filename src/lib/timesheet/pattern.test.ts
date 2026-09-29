import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSchedule } from "./parser";
import { hoursBetween, sumHours, previewRows } from "./pattern";

describe("hoursBetween", () => {
  it("matches Excel HOUR(MOD(checkout-checkin,1))", () => {
    assert.equal(hoursBetween("07:00", "15:00"), 8);
  });

  it("handles cross-midnight shifts", () => {
    assert.equal(hoursBetween("23:00", "07:00"), 8);
  });

  it("tolerates single-digit hour input", () => {
    assert.equal(hoursBetween("7:00", "15:00"), 8);
    assert.equal(hoursBetween("12", "16"), 4);
  });

  it("truncates partial hours like Excel HOUR() does", () => {
    assert.equal(hoursBetween("07:00", "15:30"), 8);
  });
});

describe("sumHours", () => {
  it("adds up every shift of the schedule", () => {
    assert.equal(sumHours(parseSchedule("1\tX\t07:00 - 15:00")), 8);
    assert.equal(sumHours(parseSchedule("1\tX\t12 - 16 // 16 - 00")), 12);
  });

  it("ignores off days", () => {
    assert.equal(sumHours(parseSchedule("1\tX\toff")), 0);
  });
});

describe("previewRows", () => {
  const schedule = parseSchedule(
    ["1\tSenin\t23:00 - 07:00", "2\tSelasa\t23:00 - 07:00", "3\tRabu\toff", "13\tSelasa\t07:00 - 15:00 // 15:00 - 19:00"].join("\n")
  );

  it("emits one row per segment plus an OFF row for every empty day", () => {
    const rows = previewRows(schedule, 2026, 7);
    assert.equal(rows.length, 32); // 31 hari, tanggal 13 punya 2 segmen
    assert.equal(rows.filter((r) => !r.cin).length, 28);
    assert.deepEqual(
      rows.filter((r) => r.cin).map((r) => r.key),
      ["1:0", "2:0", "13:0", "13:1"]
    );
  });

  it("derives the weekday from the date, not from the pasted text", () => {
    const rows = previewRows(schedule, 2026, 7);
    assert.equal(rows[0].weekday, "Rabu");
    assert.equal(rows[1].weekday, "Kamis");
    assert.equal(rows[2].weekday, "Jumat");
  });

  it("marks national holidays and nothing else", () => {
    const rows = previewRows(schedule, 2026, 7, new Set([13]));
    const holidays = rows.filter((r) => r.isHoliday).map((r) => r.key);
    // Both segments of day 13 are flagged; no other day is touched.
    assert.deepEqual(holidays, ["13:0", "13:1"]);
  });

  it("keeps every row unchecked when there are no holidays", () => {
    const rows = previewRows(schedule, 2026, 7);
    assert.equal(rows.some((r) => r.isHoliday), false);
  });

  it("does not classify overtime from the shift pattern", () => {
    // 13:0 sepola dengan pola, 13:1 tambahan `//` — keduanya tetap sama saja.
    const rows = previewRows(schedule, 2026, 7);
    const day13 = rows.filter((r) => r.day === 13);
    assert.equal(day13[0].isHoliday, day13[1].isHoliday);
  });
});
