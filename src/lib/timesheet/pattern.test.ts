import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSchedule } from "./parser";
import { cycleDay, expectedShifts, isOvertimeDay, isOvertimeSegment, matchesPattern, normalSegmentIndex, countTotalHours, previewRows, autoOvertimeFlags } from "./pattern";

describe("8-day shift pattern", () => {
  it("maps day-of-month to the correct cycle day", () => {
    assert.equal(cycleDay(1), 1);
    assert.equal(cycleDay(2), 2);
    assert.equal(cycleDay(8), 0);
    assert.equal(cycleDay(9), 1);
    assert.equal(cycleDay(17), 1);
    assert.equal(cycleDay(31), 7);
  });

  it("exposes the expected shift per cycle day", () => {
    assert.equal(expectedShifts(8), null);
    assert.deepEqual(expectedShifts(1), ["23:00", "07:00"]);
    assert.equal(expectedShifts(3), null);
    assert.deepEqual(expectedShifts(4), ["07:00", "15:00"]);
    assert.deepEqual(expectedShifts(7), ["15:00", "23:00"]);
    assert.deepEqual(expectedShifts(6), ["15:00", "23:00"]);
  });

  it("accepts a single shift that matches the pattern exactly", () => {
    assert.ok(matchesPattern(2, [["23:00", "07:00"]]));
    assert.ok(!isOvertimeDay(5, [["07:00", "15:00"]]));
    assert.ok(matchesPattern(7, [["15:00", "23:00"]]));
  });

  it("flags working an off day", () => {
    assert.ok(isOvertimeDay(3, [["23:00", "07:00"]]));
    assert.ok(isOvertimeDay(8, [["07:00", "15:00"]]));
  });

  it("flags taking off on a working day", () => {
    assert.ok(isOvertimeDay(1, []));
    assert.ok(isOvertimeDay(5, []));
  });

  it("flags an extra // segment on a single-shift day", () => {
    assert.ok(isOvertimeDay(13, [["07:00", "15:00"], ["15:00", "19:00"]]));
    assert.ok(isOvertimeDay(22, [["07:00", "15:00"], ["15:00", "23:00"]]));
  });

  it("flags shifted check-in or check-out times", () => {
    assert.ok(isOvertimeDay(5, [["07:00", "14:30"]]));
    // day 7 is an afternoon day, so a morning shift does not match
    assert.ok(isOvertimeDay(7, [["07:00", "15:00"]]));
    assert.ok(isOvertimeDay(2, [["23:00", "06:00"]]));
  });

  it("tolerates single-digit hour input", () => {
    assert.ok(matchesPattern(5, [["7:00", "15:00"]]));
    assert.ok(matchesPattern(2, [["23:00", "7:00"]]));
  });
});

describe("segment-level overtime (pola + //)", () => {
  const extraSegment = parseSchedule("13\tX\t07:00 - 15:00 // 15:00 - 19:00")[13];
  const extraFirst = parseSchedule("22\tX\t07:00 - 15:00 // 15:00 - 23:00")[22];
  const single = parseSchedule("5\tX\t07:00 - 15:00")[5];
  const offDay = parseSchedule("8\tX\toff")[8];
  const workedOffDay = parseSchedule("8\tX\t23:00 - 07:00")[8];

  it("picks the only sepola segment as normal", () => {
    assert.equal(normalSegmentIndex(13, extraSegment), 0);
    assert.equal(normalSegmentIndex(22, extraFirst), 1);
    assert.equal(normalSegmentIndex(5, single), 0);
  });

  it("has no normal segment on an off day", () => {
    assert.equal(normalSegmentIndex(8, offDay), -1);
    assert.equal(normalSegmentIndex(8, workedOffDay), -1);
  });

  it("flags exactly the non-matching segment", () => {
    assert.deepEqual(extraSegment.map((_, i) => isOvertimeSegment(13, extraSegment, i)), [false, true]);
    assert.deepEqual(extraFirst.map((_, i) => isOvertimeSegment(22, extraFirst, i)), [true, false]);
    assert.deepEqual(single.map((_, i) => isOvertimeSegment(5, single, i)), [false]);
    assert.deepEqual(workedOffDay.map((_, i) => isOvertimeSegment(8, workedOffDay, i)), [true]);
  });
});

describe("previewRows + autoOvertimeFlags", () => {
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

  it("pre-checks only the segment that deviates from the pattern", () => {
    const flags = autoOvertimeFlags(schedule);
    assert.equal(flags.get("1:0"), false);
    assert.equal(flags.get("2:0"), false);
    assert.equal(flags.get("13:0"), false);
    assert.equal(flags.get("13:1"), true);
    assert.ok(!flags.has("3:off"));
  });
});

describe("countTotalHours split", () => {
  it("keeps matching days in normal hours", () => {
    const s = parseSchedule("1\tX\toff\n2\tX\t23:00 - 07:00\n5\tX\t07:00 - 15:00");
    assert.deepEqual(countTotalHours(s), { normal: 16, overtime: 0, total: 16 });
  });

  it("moves every hour of a mismatched day to overtime", () => {
    // day 3 is an off day; working it is fully overtime
    const s = parseSchedule("3\tX\t07:00 - 15:00");
    assert.deepEqual(countTotalHours(s), { normal: 0, overtime: 8, total: 8 });
  });

  it("splits a multi-shift day: sepola = normal, sisanya lembur", () => {
    // day 13 expects 07:00 - 15:00, so only the extra 4h segment is overtime
    const s = parseSchedule("13\tX\t07:00 - 15:00 // 15:00 - 19:00");
    assert.deepEqual(countTotalHours(s), { normal: 8, overtime: 4, total: 12 });
  });

  it("treats the non-matching segment as overtime even when it comes first", () => {
    // day 22 expects 15:00 - 23:00, which is the second segment
    const s = parseSchedule("22\tX\t07:00 - 15:00 // 15:00 - 23:00");
    assert.deepEqual(countTotalHours(s), { normal: 8, overtime: 8, total: 16 });
  });

  it("never marks two segments of the same day as normal", () => {
    const s = parseSchedule("5\tX\t07:00 - 15:00 // 07:00 - 15:00");
    assert.deepEqual(countTotalHours(s), { normal: 8, overtime: 8, total: 16 });
  });

  it("keeps short cross-midnight shifts intact", () => {
    const s = parseSchedule("2\tX\t23:00 - 07:00");
    assert.deepEqual(countTotalHours(s), { normal: 8, overtime: 0, total: 8 });
  });
});

describe("real 31-day schedule", () => {
  const text = [
    "1\tKamis\t23:00 - 07:00",
    "2\tJumat\t23:00 - 07:00",
    "3\tSabtu\toff",
    "4\tMinggu\t07:00 - 15:00",
    "5\tSenin\t07:00 - 15:00",
    "6\tSelasa\t15:00 - 23:00",
    "7\tRabu\t15:00 - 23:00",
    "8\tKamis\toff",
    "9\tJumat\t23:00 - 07:00",
    "10\tSabtu\t23:00 - 07:00",
    "11\tMinggu\toff",
    "12\tSenin\t07:00 - 15:00",
    "13\tSelasa\t07:00 - 15:00 // 15:00 - 19:00",
    "14\tRabu\t15:00 - 23:00",
    "15\tKamis\t15:00 - 23:00",
    "16\tJumat\toff",
    "17\tSabtu\t23:00 - 07:00",
    "18\tMinggu\t23:00 - 07:00",
    "19\tSenin\toff",
    "20\tSelasa\t07:00 - 15:00",
    "21\tRabu\t07:00 - 15:00",
    "22\tKamis\t07:00 - 15:00 // 15:00 - 23:00",
    "23\tJumat\t15:00 - 23:00",
    "24\tSabtu\toff",
    "25\tMinggu\t23:00 - 07:00",
    "26\tSenin\t23:00 - 07:00",
    "27\tSelasa\toff",
    "28\tRabu\t07:00 - 15:00",
    "29\tKamis\t07:00 - 15:00",
    "30\tJumat\t15:00 - 23:00",
    "31\tSabtu\t15:00 - 23:00",
  ].join("\n");

  const schedule = parseSchedule(text);

  it("marks only the two multi-shift days as overtime", () => {
    const overtime: number[] = [];
    for (let day = 1; day <= 31; day++) {
      if (isOvertimeDay(day, schedule[day] ?? [])) overtime.push(day);
    }
    assert.deepEqual(overtime, [13, 22]);
  });

  it("splits hours as 192 normal / 12 overtime", () => {
    assert.deepEqual(countTotalHours(schedule), { normal: 192, overtime: 12, total: 204 });
  });
});
