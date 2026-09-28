import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MONTHS_INDONESIA_FULL, type EmployeeData } from "./constants";
import { fitImageSize, readImageSize } from "./image-size";
import { isOvertimeDay, isOvertimeSegment } from "./pattern";
import type { Schedule } from "./parser";

export interface SignatureEmbed {
  dataUrl: string;
  mime: "image/png" | "image/jpeg";
}

const SIG_LABEL_ROW = 45;
const SIG_AREA_TOP_OFFSET = 45;
const SIG_NAME_ROW_OFFSET = 7;
const SIG_MAX_WIDTH = 190;
const SIG_MAX_HEIGHT = 92;

// The template never changes at runtime: read it from disk once and reuse the bytes.
let templateBufferPromise: Promise<Buffer> | null = null;
function getTemplateBuffer(): Promise<Buffer> {
  templateBufferPromise ??= readFile(resolve(process.cwd(), "src/lib/timesheet/template.xlsx"));
  return templateBufferPromise;
}

export async function generateTimesheetBuffer(
  data: EmployeeData,
  schedule: Schedule,
  month: number,
  year: number,
  holidays: Set<number> = new Set(),
  signature: SignatureEmbed | null = null,
  overtimeFlags: Map<string, boolean> | null = null,
): Promise<Buffer> {
  const buf = await getTemplateBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Table 1");
  if (!ws) throw new Error('Sheet "Table 1" not found');

  // The bundled template ships with a hardcoded personal signature scan.
  // Drop it so the output only ever carries the signed-in user's signature.
  const media = (ws as unknown as { _media?: { type?: string }[] })._media;
  if (Array.isArray(media)) {
    for (let i = media.length - 1; i >= 0; i--) {
      if (media[i]?.type === "image") media.splice(i, 1);
    }
  }

  ws.getCell("A5").value = `Name :                 ${data.fullName}`;
  ws.getCell("A6").value = `Position :              ${data.position}`;
  ws.getCell("A7").value = `Periode :              ${MONTHS_INDONESIA_FULL[month]} ${year}`;
  ws.getCell("A8").value = `Client :                 ${data.client}`;
  ws.getCell("A9").value = `Project :               ${data.project}`;

  const lastDay = new Date(year, month, 0).getDate();

  type Entry = [number, string | null, string | null, string | null, string, boolean];
  const entries: Entry[] = [];
  const flagOf = (key: string, auto: boolean) => (overtimeFlags?.has(key) ? overtimeFlags.get(key)! : auto);
  for (let day = 1; day <= lastDay; day++) {
    const shifts = schedule[day] ?? [];
    const isHoliday = holidays.has(day);
    if (!shifts.length) {
      // Hari off tidak punya segmen; pakai penilaian level hari (0 jam, tetap beri tanda).
      entries.push([day, null, null, isHoliday ? null : "", "OFF", flagOf(`${day}:off`, isOvertimeDay(day, shifts))]);
    } else {
      shifts.forEach(([cin, cout], i) => {
        entries.push([
          day,
          cin,
          cout,
          isHoliday ? "YES" : "NO",
          "Standby",
          flagOf(`${day}:${i}`, isOvertimeSegment(day, shifts, i)),
        ]);
      });
    }
  }

  const totalRows = entries.length;
  const firstRow = 12;
  const templateRows = 31;
  const extra = totalRows - templateRows;
  if (extra > 0) ws.spliceRows(43, 0, ...Array(extra).fill([]));
  else if (extra < 0) ws.spliceRows(firstRow + totalRows, Math.abs(extra));
  const lastRow = firstRow + totalRows - 1;

  const borderAll = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };
  const borderLeftBottom = { left: { style: "thin" as const }, bottom: { style: "thin" as const } };
  const borderLrBottom = { left: { style: "thin" as const }, right: { style: "thin" as const }, bottom: { style: "thin" as const } };

  for (let i = 0; i < entries.length; i++) {
    const r = firstRow + i;
    const [day, cin, cout, jVal, kVal, overtime] = entries[i];
    const row = ws.getRow(r);
    const vals: Record<string, unknown> = {
      A: data.employeeNo,
      B: data.fullName,
      C: data.organization,
      D: data.position,
      E: { formula: `IF(I${r}>0,"WFO","")` },
      F: { formula: `DATE(${year},${month},${day})` },
      G: cin,
      H: cout,
      I: cin == null ? 0 : { formula: `HOUR(MOD(H${r}-G${r},1))` },
      J: jVal,
      K: kVal,
      L: overtime ? "Lembur" : "Normal",
    };
    for (const col of ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const) {
      const c = ws.getCell(`${col}${r}`);
      const v = vals[col];
      c.value = v as ExcelJS.CellValue;
      if (col === "F") c.numFmt = "dd/mm/yyyy";
      if (col === "I") c.numFmt = '0" Hours"';
      if (col === "L") c.alignment = { horizontal: "left", vertical: "middle" };
      else c.alignment = { horizontal: "center", vertical: "middle" };
      if (col === "A" || col === "B" || col === "C" || col === "D" || col === "E" || col === "F" || col === "G" || col === "H") c.border = borderAll;
      else if (col === "I" || col === "J") c.border = borderLeftBottom;
      else if (col === "K") c.border = borderLrBottom;
      if (col === "A") c.font = { name: "Times New Roman", size: 12 };
      else if (col === "G" || col === "H") c.font = { name: "Calibri", size: 12 };
      else if (col === "L") c.font = { name: "Times New Roman", size: 10 };
      else c.font = { name: "Arial", size: 12 };
      if (col !== "A" && col !== "G" && col !== "H" && col !== "L") c.font = { name: "Arial", size: 12 };
    }
    row.commit();
  }

  ws.getCell("F5").value = { formula: `SUM(I${firstRow}:I${lastRow})` } as unknown as ExcelJS.CellValue;
  ws.getCell("F6").value = { formula: `SUMIF(L${firstRow}:L${lastRow},"Lembur",I${firstRow}:I${lastRow})` } as unknown as ExcelJS.CellValue;
  ws.getColumn("L").hidden = true;

  // The signature block lives at rows 45 (label) / 52 (name) in the template.
  // spliceRows above shifts it by `extra`, so anchor dynamically.
  const sigLabelRow = SIG_LABEL_ROW + extra;
  ws.getCell(`B${sigLabelRow + SIG_NAME_ROW_OFFSET}`).value = `(${data.fullName})`;

  if (signature?.dataUrl) {
    const base64 = signature.dataUrl.replace(/^data:image\/[a-z+.-]+;base64,/, "");
    const raw = Buffer.from(base64, "base64");
    const size = fitImageSize(readImageSize(raw), SIG_MAX_WIDTH, SIG_MAX_HEIGHT);
    const imageId = wb.addImage({ base64, extension: signature.mime === "image/jpeg" ? "jpeg" : "png" });
    ws.addImage(imageId, {
      tl: { col: 1.1, row: SIG_AREA_TOP_OFFSET + extra },
      ext: { width: size.width, height: size.height },
      editAs: "oneCell",
    });
  }

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
