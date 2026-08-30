import { NextResponse } from "next/server";
import { parseSchedule } from "@/lib/timesheet/parser";
import { getHolidays } from "@/lib/timesheet/holidays";
import { generateTimesheetBuffer } from "@/lib/timesheet/excel";
import { MONTHS_INDONESIA } from "@/lib/timesheet/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employee, schedule: rawSchedule, month, year, autoHoliday, manualHolidays } = body;
    if (!employee || !rawSchedule || !month || !year) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const schedule = parseSchedule(rawSchedule);
    if (!Object.keys(schedule).length) return NextResponse.json({ error: "Format jadwal tidak dikenali" }, { status: 400 });

    const holidays = new Set<number>();
    if (autoHoliday) {
      const { holidays: h } = await getHolidays(Number(year), Number(month));
      for (const val of h) holidays.add(val);
    }
    if (manualHolidays) {
      for (const x of manualHolidays.split(",")) {
        const val = parseInt(x.trim(), 10);
        if (!isNaN(val)) holidays.add(val);
      }
    }

    const buf = await generateTimesheetBuffer(employee, schedule, Number(month), Number(year), holidays);
    const filename = `Timesheet SMBC ${MONTHS_INDONESIA[Number(month)]} ${year} - ${employee.fullName}.xlsx`;
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: unknown) {
    console.error("Timesheet generation error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
