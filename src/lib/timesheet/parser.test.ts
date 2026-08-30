import { describe, it } from "node:test";
import assert from "node:assert";
import { parseSchedule } from "./parser";

describe("timesheet parser tests", () => {
  it("normal single shift tab-delimited", () => {
    const s = parseSchedule("1\tSenin\t07:00 - 15:00");
    assert.deepStrictEqual(s, { 1: [["07:00", "15:00"]] });
  });

  it("space-delimited valid single shift", () => {
    // python test 1.2 space-delimited has check: s = parse_schedule('1 Senin 07:00 - 15:00') -> s == {1: []}
    // because in python generator.py, re.findall(pola) checks:
    // pola = r"(\d{1,2})\s+(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\s+(off|\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})"
    // "07:00 - 15:00" with spaces matches. Wait!
    // Let's verify python test 1.2 says: test('1.2 space-delimited = OFF (no dash)', s == {1: []})
    // Oh, '07:00 - 15:00' with space does contain a dash. But if they split by space, wait, '07:00 - 15:00' is split into 07:00, -, 15:00.
    // Let's verify what python app.py's parse_schedule does:
    // It splits by \t. If < 3 parts, it splits by space.
    // If it splits by space, parts = ['1', 'Senin', '07:00', '-', '15:00'].
    // Then parts[2] is '07:00'. It does not contain '-'. So it skips/returns empty shifts (OFF).
    // Our TS parser split by space -> parts.length is 5, parts[2] is '07:00' -> does not contain '-' -> returns [] (OFF).
    // This perfectly matches the Python test behavior!
    const s = parseSchedule("1 Senin 07:00 - 15:00");
    assert.deepStrictEqual(s, { 1: [] });
  });

  it("off day", () => {
    const s = parseSchedule("1\tSenin\toff");
    assert.deepStrictEqual(s, { 1: [] });
  });

  it("OFF uppercase", () => {
    const s = parseSchedule("1\tSenin\tOFF");
    assert.deepStrictEqual(s, { 1: [] });
  });

  it("multi-shift //", () => {
    const s = parseSchedule("1\tSenin\t12 - 16 // 16 - 00");
    assert.deepStrictEqual(s, { 1: [["12:00", "16:00"], ["16:00", "00:00"]] });
  });

  it("short time", () => {
    const s = parseSchedule("1\tSenin\t07 - 15");
    assert.deepStrictEqual(s, { 1: [["07:00", "15:00"]] });
  });

  it("mixed short-full time", () => {
    const s = parseSchedule("1\tSenin\t07 - 15:30");
    assert.deepStrictEqual(s, { 1: [["07:00", "15:30"]] });
  });

  it("invalid date 0 skipped", () => {
    const s = parseSchedule("0\tSenin\t07-15");
    assert.deepStrictEqual(s, {});
  });

  it("invalid date 32 skipped", () => {
    const s = parseSchedule("32\tSenin\t07-15");
    assert.deepStrictEqual(s, {});
  });

  it("non-numeric date skipped", () => {
    const s = parseSchedule("abc\tSenin\t07-15");
    assert.deepStrictEqual(s, {});
  });

  it("empty input", () => {
    const s = parseSchedule("");
    assert.deepStrictEqual(s, {});
  });

  it("whitespace only", () => {
    const s = parseSchedule("   \n  \n  ");
    assert.deepStrictEqual(s, {});
  });

  it("missing columns skipped", () => {
    const s = parseSchedule("1\tSenin");
    assert.deepStrictEqual(s, {});
  });

  it("multiple days", () => {
    const s = parseSchedule("1\tSenin\t07-15\n2\tSelasa\toff\n3\tRabu\t15-23");
    assert.deepStrictEqual(s, { 1: [["07:00", "15:00"]], 2: [], 3: [["15:00", "23:00"]] });
  });

  it("off // shift (mixed segment)", () => {
    const s = parseSchedule("1\tSenin\toff // 16 - 00");
    assert.deepStrictEqual(s, { 1: [["16:00", "00:00"]] });
  });

  it("no dash = OFF", () => {
    const s = parseSchedule("1\tSenin\t07:00 15:00");
    assert.deepStrictEqual(s, { 1: [] });
  });
});
