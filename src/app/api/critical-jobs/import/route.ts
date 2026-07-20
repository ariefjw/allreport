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

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "bulk_import_critical_jobs",
      { payload: importData }
    );

    if (rpcError) {
      console.error("RPC error during bulk import:", rpcError);
      return NextResponse.json(
        { error: `Bulk import failed: ${rpcError.message}` },
        { status: 500 },
      );
    }

    const updates = (rpcResult as { updated_id: string; updated_end_timestamp: string }[] | null) ?? [];

    return NextResponse.json({
      message: `Import complete. Updated ${updates.length} of ${importData.length} jobs.`,
      successfulUpdates: updates.length,
      updates: updates.map((u) => ({
        id: u.updated_id,
        endTimestamp: u.updated_end_timestamp,
      })),
    });
  } catch (error) {
    console.error("Unhandled error in POST /api/critical-jobs/import:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 },
    );
  }
}
