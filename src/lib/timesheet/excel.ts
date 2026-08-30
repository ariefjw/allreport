import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MONTHS_INDONESIA, type EmployeeData } from "./constants";
import type { Schedule } from "./parser";

export async function generateTimesheetBuffer(
  data: EmployeeData,
  schedule: Schedule,
  month: number,
  year: number,
  holidays: Set<number> = new Set(),
): Promise<Buffer> {
  const templatePath = resolve(process.cwd(), "src/lib/timesheet/template.xlsx");
  const buf = await readFile(templatePath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Table 1");
  if (!ws) throw new Error('Sheet "Table 1" not found');

  ws.getCell("A5").value = `Name :                 ${data.fullName}`;
  ws.getCell("A6").value = `Position :              ${data.position}`;
  ws.getCell("A7").value = `Periode :              ${MONTHS_INDONESIA[month]} ${year}`;
  ws.getCell("A8").value = `Client :                 ${data.client}`;
  ws.getCell("A9").value = `Project :               ${data.project}`;

  const lastDay = new Date(year, month, 0).getDate();
  type Entry = [number, string | null, string | null, string | null, string];
  const entries: Entry[] = [];
  for (let day = 1; day <= lastDay; day++) {
    const shifts = schedule[day] ?? [];
    const isHoliday = holidays.has(day);
    if (!shifts.length) entries.push([day, null, null, isHoliday ? null : "", "OFF"]);
    else for (const [cin, cout] of shifts) entries.push([day, cin, cout, isHoliday ? "YES" : "NO", "Standby"]);
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
    const [day, cin, cout, jVal, kVal] = entries[i];
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
      L: cin == null ? 0 : { formula: `IF(OR(I${r}=4,J${r}="YES"),"Lembur","0")` },
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

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
