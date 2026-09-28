import { describe, it } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { generateTimesheetBuffer } from "./excel";
import { parseSchedule } from "./parser";
import { countTotalHours } from "./build";
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
  overtimeFlags?: Record<string, boolean>;
}) {
  const buffer = await generateTimesheetBuffer(
    EMPLOYEE,
    parseSchedule(scheduleText(options.days, options.multiShiftDays ?? [])),
    options.month,
    2026,
    new Set(),
    options.withSignature === false ? null : { dataUrl: ONE_PX_PNG, mime: "image/png" },
    options.overtimeFlags ? new Map(Object.entries(options.overtimeFlags)) : null
  );
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Table 1");
  assert.ok(ws, 'sheet "Table 1" exists');
  return ws!;
}

async function generate(schedule: string) {
  const buffer = await generateTimesheetBuffer(
    EMPLOYEE,
    parseSchedule(schedule),
    7,
    2026,
    new Set(),
    null
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

/** Jadwal 31 hari yang benar: siklus = tanggal % 8, dengan dua hari multi-shift. */
function realScheduleText(): string {
  const lines: string[] = [];
  for (let day = 1; day <= 31; day++) {
    const cycle = day % 8;
    const shift = cycle === 0 || cycle === 3 ? "off" : cycle <= 2 ? "23:00 - 07:00" : cycle <= 5 ? "07:00 - 15:00" : "15:00 - 23:00";
    const actual =
      day === 13 ? "07:00 - 15:00 // 15:00 - 19:00" : day === 22 ? "07:00 - 15:00 // 15:00 - 23:00" : shift;
    lines.push(`${day}\tSenin\t${actual}`);
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

describe("pattern-based overtime column", () => {
  it("writes a static Lembur/Normal flag instead of a formula", async () => {
    const ws = await render({ month: 7, days: 31 });
    // day 1 sits at cycle day 1 (expects 23:00 - 07:00) but the schedule works 07:00 - 15:00
    assert.equal(ws.getCell("L12").value, "Lembur");
    assert.equal(typeof ws.getCell("L12").value, "string");
    // day 5 sits at cycle day 5 and matches 07:00 - 15:00
    assert.equal(ws.getCell("L16").value, "Normal");
  });

  it("marks every row of a pattern-compliant month as Normal", async () => {
    // cycle day = date % 8: 0/3 off, 1/2 night, 4/5 morning, 6/7 afternoon
    const lines: string[] = [];
    for (let day = 1; day <= 31; day++) {
      const cycle = day % 8;
      const shift = cycle === 0 || cycle === 3 ? "off" : cycle <= 2 ? "23:00 - 07:00" : cycle <= 5 ? "07:00 - 15:00" : "15:00 - 23:00";
      lines.push(`${day}\tSenin\t${shift}`);
    }
    const ws = await generate(lines.join("\n"));
    for (let row = 12; row < 12 + 31; row++) {
      assert.equal(ws.getCell(`L${row}`).value, "Normal", `row ${row}`);
    }
  });

  it("keeps the overtime summary formula on F6", async () => {
    const ws = await render({ month: 7, days: 31 });
    const f6 = ws.getCell("F6").value as { formula?: string };
    assert.match(String(f6.formula), /SUMIF\(L\d+:L\d+,"Lembur"/);
  });

  it("marks only the extra // segment of a multi-shift day as Lembur", async () => {
    const ws = await generate(realScheduleText());
    // day 13 and day 22 are the only multi-shift days, so rows shift after day 13
    assert.equal(ws.getCell("L24").value, "Normal");
    assert.equal(ws.getCell("L25").value, "Lembur");
    assert.equal(ws.getCell("L34").value, "Lembur");
    assert.equal(ws.getCell("L35").value, "Normal");
    assert.equal(ws.getCell("L12").value, "Normal");
    assert.equal(ws.getCell("L14").value, "Normal");
  });

  it("lets the user's checklist override the automatic rule", async () => {
    // auto: day 1 = Lembur (pola mau 23:00 - 07:00), day 5 = Normal
    const ws = await render({ month: 7, days: 31, overtimeFlags: { "1:0": false, "5:0": true } });
    assert.equal(ws.getCell("L12").value, "Normal");
    assert.equal(ws.getCell("L16").value, "Lembur");
  });

  it("falls back to the automatic rule for keys the user never saw", async () => {
    const ws = await render({ month: 7, days: 31, overtimeFlags: { "1:0": false } });
    assert.equal(ws.getCell("L12").value, "Normal");
    assert.equal(ws.getCell("L16").value, "Normal");
    assert.equal(ws.getCell("L13").value, "Lembur"); // day 2, never flagged
  });
});

describe("countTotalHours", () => {
  it("matches Excel HOUR(MOD(checkout-checkin,1)) per row", () => {
    assert.equal(countTotalHours(parseSchedule("1\tSenin\t07:00 - 15:00")).total, 8);
  });

  it("handles cross-midnight shifts", () => {
    assert.equal(countTotalHours(parseSchedule("1\tSenin\t23:00 - 07:00")).total, 8);
  });

  it("adds up every shift of a multi-shift day", () => {
    assert.equal(countTotalHours(parseSchedule("1\tSenin\t12 - 16 // 16 - 00")).total, 12);
  });

  it("ignores off days", () => {
    assert.equal(countTotalHours(parseSchedule("1\tSenin\toff")).total, 0);
  });
});
