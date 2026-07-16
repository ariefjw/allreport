import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ImportPayload = {
  id: string; 
  endTime: string; 
}[];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let importData: ImportPayload;
    try {
      importData = await request.json();
      if (!Array.isArray(importData)) {
        throw new Error("Invalid payload format: expected an array.");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    if (importData.length === 0) {
      return NextResponse.json(
        { message: "No jobs to import." },
        { status: 200 },
      );
    }

    const jobIdsToUpdate = importData.map((j) => j.id);
    const { data: jobsToUpdate, error: fetchError } = await supabase
      .from("daily_monitoring_log")
      .select("id, scheduled_timestamp")
      .in("id", jobIdsToUpdate)
      .is("end_timestamp", null); 

    if (fetchError) {
      console.error("Error fetching jobs to update:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch jobs for update." },
        { status: 500 },
      );
    }

    const updatePromises = importData.map(({ id, endTime }) => {
      const jobData = jobsToUpdate.find((j) => j.id === id);

      if (!jobData) {
        return Promise.resolve({ data: null, error: null, count: 0 });
      }

      // ---------------------------------------------------------------------
      // FIX ISSUE 2: Blokir data siluman!
      // Jika endTime kosong, undefined, atau hanya teks (misal: "WAITING"), 
      // batalkan update untuk baris ini (skip) agar tidak terisi otomatis.
      // ---------------------------------------------------------------------
      if (!endTime || !/^\d{1,2}:\d{2}/.test(endTime.trim())) {
        return Promise.resolve({ data: null, error: null, count: 0 });
      }

      const scheduled = new Date(jobData.scheduled_timestamp);
      
      const [hours, minutes, seconds] = endTime.split(":").map(Number);
      const safeHours = hours || 0;
      const safeMinutes = minutes || 0;
      const safeSeconds = seconds || 0;

      const end = new Date(scheduled);
      
      // ---------------------------------------------------------------------
      // FIX ISSUE 1: Sinkronisasi Zona Waktu Vercel vs WIB
      // Kurangi 7 jam saat menyimpan ke database (contoh: 22 jadi 15).
      // Saat diambil ke layar, otomatis ditambah 7 jam kembali ke 22.
      // ---------------------------------------------------------------------
      end.setUTCHours(safeHours - 7, safeMinutes, safeSeconds, 0);

      // Logika perpindahan hari (Jika job baru selesai lewat tengah malam)
      if (end < scheduled) {
        end.setUTCDate(end.getUTCDate() + 1);
      }

      const endTimestampISO = end.toISOString();

      return supabase
        .from("daily_monitoring_log")
        .update({
          end_timestamp: endTimestampISO,
          status: "*DONE*",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .is("end_timestamp", null)
        .select(); 
    });

    try {
      const results = await Promise.all(updatePromises);

      let successfulUpdates = 0;
      results.forEach((res) => {
        if (res.error) {
          console.warn(`Failed to update critical job`, res.error);
        } else if (res.data && res.data.length > 0) {
          successfulUpdates++;
        }
      });

      return NextResponse.json({
        message: `Import complete. Updated ${successfulUpdates} of ${importData.length} jobs.`,
        successfulUpdates,
      });
    } catch (error) {
      console.error("Error during bulk critical job import DB operation:", error);
      return NextResponse.json(
        { error: "An unexpected error occurred during the database update." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Unhandled error in POST /api/critical-jobs/import:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 },
    );
  }
}
