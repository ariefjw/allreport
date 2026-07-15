import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ImportPayload = {
  id: string; // This is the UUID of the daily_monitoring_log entry
  endTime: string; // "HH:mm:ss"
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
    } catch (_error) {
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

    // Fetch the original scheduled_timestamp for all jobs to be updated
    // This is needed to correctly calculate the end_timestamp's date, especially for cross-day jobs
    const jobIdsToUpdate = importData.map((j) => j.id);
    const { data: jobsToUpdate, error: fetchError } = await supabase
      .from("daily_monitoring_log")
      .select("id, scheduled_timestamp")
      .in("id", jobIdsToUpdate)
      .is("end_timestamp", null); // Only fetch jobs that can be updated

    if (fetchError) {
      console.error("Error fetching jobs to update:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch jobs for update." },
        { status: 500 },
      );
    }

    const updatePromises = importData.map(({ id, endTime }) => {
      const jobData = jobsToUpdate.find((j) => j.id === id);

      // If job is not found in our fetch (already has an end_timestamp or invalid id), skip it.
      if (!jobData) {
        return Promise.resolve({ data: null, error: null, count: 0 });
      }

      const scheduled = new Date(jobData.scheduled_timestamp);
      const [hours, minutes, seconds] = endTime.split(":").map(Number);

      // Create a new Date object for the end time, starting with the scheduled date's components
      const end = new Date(scheduled);
      // Set the time from the payload. Using setUTCHours for ISO string consistency.
      end.setUTCHours(hours, minutes, seconds, 0);

      // If the calculated end time is earlier than the scheduled time, it must have finished on the next day.
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
        .is("end_timestamp", null); // Double safety check
    });

    try {
      const results = await Promise.all(updatePromises);

      let successfulUpdates = 0;
      results.forEach((res) => {
        if (res.error) {
          console.warn(`Failed to update critical job`, res.error);
        } else if (res.count && res.count > 0) {
          successfulUpdates++;
        }
      });

      return NextResponse.json({
        message: `Import complete. Updated ${successfulUpdates} of ${importData.length} jobs.`,
        successfulUpdates,
      });
    } catch (error) {
      console.error(
        "Error during bulk critical job import DB operation:",
        error,
      );
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
