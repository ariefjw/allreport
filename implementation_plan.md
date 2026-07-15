# Implementasi Fitur Import Laporan (Critical Jobs)

Fitur ini akan memungkinkan pengguna menempelkan (*paste*) teks laporan yang sudah ada (misalnya dari WhatsApp/Email) dan sistem akan secara otomatis mengekstrak waktu selesai (*end time*) untuk mengisi data di database.

## User Review Required
Tolong periksa apakah alur dan aturan di bawah ini sudah sesuai dengan yang Anda harapkan:

1. **Alur UI (User Interface):**
   - Akan ada tombol baru **"Import Report"** di halaman Critical Jobs (di sebelah tombol Copy Report).
   - Saat diklik, akan muncul *pop-up* (modal) berisi kotak teks (*textarea*). Pengguna dapat mem-*paste* teks laporan ke dalam kotak tersebut lalu menekan "Submit".

2. **Aturan "Hanya Mengisi Data yang Kosong" (Sangat Penting):**
   - Sistem akan memproses laporan dan mencari Job yang memiliki waktu selesai (contoh: `22:30 - 22:45`).
   - Sistem akan menyimpan waktu `22:45` ke database **HANYA JIKA** Job tersebut saat ini statusnya di sistem masih kosong/belum selesai (`end_timestamp` adalah `NULL`).
   - **Jika di sistem Job tersebut sudah memiliki *End Time***, maka data dari *import* **akan diabaikan** untuk Job tersebut. 
   - Ini memastikan perlindungan data; cara satu-satunya untuk merevisi/mengganti *End Time* yang sudah telanjur terisi di sistem adalah dengan mengubahnya langsung secara manual melalui *textbox* pada halaman web.

3. **Logika Ekstraksi Teks:**
   - Sistem akan membaca baris yang berformat `[angka].[nama_job]`.
   - Sistem akan membaca baris di bawahnya yang berformat `[jam_mulai] - [jam_selesai]`.
   - Jika `[jam_selesai]` valid (contoh: `23:15`), maka akan disiapkan sebagai data input.

## Proposed Changes

### `src/components/critical/CriticalJobsPage.tsx`
- Menambahkan *state* untuk modal `isImportModalOpen`.
- Menambahkan komponen Modal/Dialog sederhana dengan *textarea* untuk input teks.
- Menambahkan fungsi *parser* di *frontend* untuk membedah teks laporan dan mencocokkannya dengan daftar `jobs` yang ada di layar (berdasarkan `jobName`), untuk mendapatkan `id` masing-masing job beserta `endTime`-nya.

### `src/hooks/useCriticalJobs.ts`
- Menambahkan fungsi `bulkImportEndTimes(data: { id: string, endTime: string }[])` yang akan memanggil API baru.

### `src/app/api/critical-jobs/import/route.ts` [NEW]
- Membuat *endpoint* API baru `POST /api/critical-jobs/import`.
- Endpoint ini akan menerima *array* data.
- API akan melakukan *loop* ke database Supabase dan memanggil fungsi *update*, dengan pengamanan khusus:
  ```typescript
  // Contoh proteksi di backend
  await supabase
    .from("daily_monitoring_log")
    .update({ 
      end_timestamp: calculatedEndTimestamp, 
      status: "*DONE*" 
    })
    .eq("id", job.id)
    .is("end_timestamp", null); // <--- KUNCI: Hanya update jika belum terisi!
  ```

## Verification Plan
1. Menyalin teks laporan yang terisi sebagian.
2. Melakukan import dan memastikan bahwa job yang kosong berhasil terisi.
3. Mencoba mengimpor teks laporan yang mencoba mengubah job yang sudah terisi sebelumnya, dan memastikan bahwa sistem menolak perubahan tersebut.
4. Memastikan *textbox* manual di UI tetap bisa mengubah job yang sudah terisi.
