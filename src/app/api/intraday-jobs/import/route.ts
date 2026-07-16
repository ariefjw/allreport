import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api/auth";
import { updateIntradayFinishedTime } from "@/lib/services/intraday-jobs";

export async function POST(request: NextRequest) {
  try {
    // 1. Pastikan user sudah login / terautentikasi
    const { supabase, response } = await requireAuth();
    if (response) return response;

    // 2. Ambil data dari body request
    const body = await request.json();

    // 3. Validasi apakah body adalah array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid payload format. Expected an array." },
        { status: 400 }
      );
    }

    const updatedLogs = [];

    // 4. Lakukan perulangan untuk mengupdate setiap batch yang dikirim
    for (const item of body) {
      if (item.id && item.finishedTime) {
        // Kita gunakan fungsi update bawaan yang sudah pintar mengkonversi WIB ke UTC
        const updatedRow = await updateIntradayFinishedTime(
          supabase!,
          item.id,
          item.finishedTime
        );
        updatedLogs.push(updatedRow);
      }
    }

    // 5. Kembalikan respons JSON yang valid agar frontend tidak error
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${updatedLogs.length} batches.`,
      data: updatedLogs,
    });
  } catch (error) {
    // Tangkap error jika terjadi masalah di database/server
    return handleApiError(error);
  }
}
