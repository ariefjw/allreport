import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  try {
    const { supabase, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid payload format. Expected an array." },
        { status: 400 }
      );
    }

    if (body.length === 0) {
      return NextResponse.json(
        { message: "No batches to import." },
        { status: 200 }
      );
    }

    const { data: rpcResult, error: rpcError } = await supabase!.rpc(
      "bulk_import_intraday_jobs",
      { payload: body }
    );

    if (rpcError) {
      console.error("RPC error during bulk intraday import:", rpcError);
      return NextResponse.json(
        { error: `Bulk import failed: ${rpcError.message}` },
        { status: 500 }
      );
    }

    const updates = (rpcResult as { updated_id: string; updated_finished_timestamp: string }[] | null) ?? [];

    return NextResponse.json({
      message: `Import complete. Updated ${updates.length} of ${body.length} batches.`,
      successfulUpdates: updates.length,
      updates: updates.map((u) => ({
        id: u.updated_id,
        finishedTimestamp: u.updated_finished_timestamp,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
