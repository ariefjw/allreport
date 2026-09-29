import { describe, it } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { generateTimesheetBuffer } from "./excel";
import { parseSchedule } from "./parser";
import { sumHours } from "./build";
import type { EmployeeData } from "./constants";

const EMPLOYEE: EmployeeData = {
  employeeNo: "0525006",
  fullName: "Test User",
  organization: "Professional Services",
  position: "IT Support",
  client: "PT. Bank BTPN Tbk",
  project: "IT Big Data Operations",
};

const ONE_PX_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function scheduleText(days: number, multiShiftDays: number[] = []): string {
  const lines: string[] = [];
  for (let day = 1; day <= days; day++) {
    lines.push(
      multiShiftDays.includes(day)
        ? `${day}\tSenin\t12:00 - 16:00 // 16:00 - 00:00`
        : `${day}\tSenin\t07:00 - 15:00`
    );
  }
  return lines.join("\n");
}

async function render(options: {
  month: number;
  days: number;
  multiShiftDays?: number[];
  withSignature?: boolean;
  holidays?: number[];
  overtimeFlags?: Record<string, boolean>;
}) {
  const buffer = await generateTimesheetBuffer(
    EMPLOYEE,
    parseSchedule(scheduleText(options.days, options.multiShiftDays ?? [])),
    options.month,
    2026,
    new Set(options.holidays ?? []),
    options.withSignature === false ? null : { dataUrl: ONE_PX_PNG, mime: "image/png" },
    options.overtimeFlags ? new Map(Object.entries(options.overtimeFlags)) : null
  );
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Table 1");
  assert.ok(ws, 'sheet "Table 1" exists');
  return ws!;
}

async function generate(schedule: string, overtimeFlags?: Record<string, boolean>) {
  const buffer = await generateTimesheetBuffer(
    EMPLOYEE,
    parseSchedule(schedule),
    7,
    2026,
    new Set(),
    null,
    overtimeFlags ? new Map(Object.entries(overtimeFlags)) : null
  );
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Table 1");
  assert.ok(ws, 'sheet "Table 1" exists');
  return ws!;
}

function imageAnchorRow(ws: ExcelJS.Worksheet): number {
  const [image] = ws.getImages();
  const anchor = image.range as unknown as { tl?: { col?: number; row?: number } } | undefined;
  return anchor?.tl?.row as number;
}

/** Jadwal 31 hari sungguhan: semua hari kerja 1 segmen, kecuali tgl 13 & 22. */
function realScheduleText(): string {
  const lines: string[] = [];
  for (let day = 1; day <= 31; day++) {
    const shift =
      day === 13 ? "07:00 - 15:00 // 15:00 - 19:00" : day === 22 ? "07:00 - 15:00 // 15:00 - 23:00" : "07:00 - 15:00";
    lines.push(`${day}\tSenin\t${shift}`);
  }
  return lines.join("\n");
}

describe("timesheet excel signature anchoring", () => {
  it("31-day month keeps the signature name at row 52", async () => {
    const ws = await render({ month: 7, days: 31 });
    assert.equal(ws.getCell("B52").value, "(Test User)");
    assert.equal(ws.getCell("B53").value, "Karyawan");
  });

  it("28-day month shifts the signature block up", async () => {
    const ws = await render({ month: 2, days: 28 });
    // spliceRows removes the 3 trailing template data rows: 45 -> 42, 52 -> 49
    assert.equal(ws.getCell("B49").value, "(Test User)");
    assert.equal(ws.getCell("B50").value, "Karyawan");
    assert.equal(ws.getCell("B52").value ?? null, null);
  });

  it("multi-shift rows push the signature block down", async () => {
    const ws = await render({ month: 7, days: 31, multiShiftDays: [1, 2] });
    // 31 days + 2 extra shift rows = 33 rows -> 2 rows spliced in at 43 -> 52 -> 54
    assert.equal(ws.getCell("B54").value, "(Test User)");
    assert.equal(ws.getCell("B55").value, "Karyawan");
  });

  it("never leaks the template's hard-coded name", async () => {
    for (const args of [{ month: 2, days: 28 }, { month: 7, days: 31 }]) {
      const ws = await render(args);
      for (let row = 38; row <= 60; row++) {
        const value = String(ws.getCell(`B${row}`).value ?? "");
        assert.ok(!value.includes("Arief Joko Wicaksono"), `row ${row} leaked the template name`);
      }
    }
  });

  it("embeds the signature image when provided", async () => {
    const ws = await render({ month: 7, days: 31 });
    assert.equal(ws.getImages().length, 1);
  });

  it("embeds nothing when the signature is absent", async () => {
    const ws = await render({ month: 7, days: 31, withSignature: false });
    assert.equal(ws.getImages().length, 0);
  });

  it("anchors the image inside the shifted signature block", async () => {
    const shifted = await render({ month: 2, days: 28 });
    // label row 45 - 3 = 42 (1-indexed) -> area top is 43 (1-indexed) -> 42 (0-indexed)
    assert.equal(imageAnchorRow(shifted), 42);

    const flat = await render({ month: 7, days: 31 });
    // label row 45 -> area top 46 (1-indexed) -> 45 (0-indexed)
    assert.equal(imageAnchorRow(flat), 45);
  });
});

describe("overtime column (checklist user + libur nasional)", () => {
  it("writes a static Lembur/Normal value instead of a formula", async () => {
    const ws = await render({ month: 7, days: 31 });
    assert.equal(ws.getCell("L12").value, "Normal");
    assert.equal(typeof ws.getCell("L12").value, "string");
  });

  it("marks nothing as lembur when there is no holiday and no checklist", async () => {
    const ws = await generate(realScheduleText());
    for (let row = 12; row < 12 + 33; row++) {
      assert.equal(ws.getCell(`L${row}`).value, "Normal", `row ${row}`);
    }
  });

  it("keeps the overtime summary formula on F6", async () => {
    const ws = await render({ month: 7, days: 31 });
    const f6 = ws.getCell("F6").value as { formula?: string };
    assert.match(String(f6.formula), /SUMIF\(L\d+:L\d+,"Lembur"/);
  });

  it("follows the user's checklist exactly, including the extra // segment", async () => {
    // day 13 and day 22 are the only multi-shift days, so rows shift after day 13
    const ws = await generate(realScheduleText(), { "13:0": false, "13:1": true, "22:0": true, "22:1": false });
    assert.equal(ws.getCell("L24").value, "Normal");
    assert.equal(ws.getCell("L25").value, "Lembur");
    assert.equal(ws.getCell("L34").value, "Lembur");
    assert.equal(ws.getCell("L35").value, "Normal");
    assert.equal(ws.getCell("L12").value, "Normal");
  });

  it("lets the user uncheck a national holiday", async () => {
    const ws = await render({ month: 7, days: 31, holidays: [17, 25], overtimeFlags: { "17:0": true, "25:0": false } });
    assert.equal(ws.getCell("L28").value, "Lembur"); // day 17, user kept it
    assert.equal(ws.getCell("L36").value, "Normal"); // day 25, user cleared it
  });

  it("falls back to the national holiday when a key is missing from the checklist", async () => {
    const ws = await render({ month: 7, days: 31, holidays: [17], overtimeFlags: { "1:0": true } });
    assert.equal(ws.getCell("L12").value, "Lembur"); // day 1, from the checklist
    assert.equal(ws.getCell("L28").value, "Lembur"); // day 17, from the holiday list
    assert.equal(ws.getCell("L16").value, "Normal"); // day 5, neither
  });

  it("marks a worked national holiday as YES in column J", async () => {
    const ws = await render({ month: 7, days: 31, holidays: [17] });
    assert.equal(ws.getCell("J28").value, "YES");
    assert.equal(ws.getCell("J12").value, "NO");
  });
});

describe("sumHours", () => {
  it("matches Excel HOUR(MOD(checkout-checkin,1)) per row", () => {
    assert.equal(sumHours(parseSchedule("1\tSenin\t07:00 - 15:00")), 8);
  });

  it("handles cross-midnight shifts", () => {
    assert.equal(sumHours(parseSchedule("1\tSenin\t23:00 - 07:00")), 8);
  });

  it("adds up every shift of a multi-shift day", () => {
    assert.equal(sumHours(parseSchedule("1\tSenin\t12 - 16 // 16 - 00")), 12);
  });

  it("ignores off days", () => {
    assert.equal(sumHours(parseSchedule("1\tSenin\toff")), 0);
  });
});
