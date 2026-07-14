
---

# PRODUCT REQUIREMENT DOCUMENT (PRD)

## Automated Job Monitoring & Reporting Application (Job Track Central)

### 1. Informasi Dokumen & Proyek

* **Nama Produk:** Job Track Central (Automated Job Monitoring & Reporting)
* **Versi Dokumen:** 2.0 (Final - Full Specifications)
* **Tanggal:** 28 Juni 2026
* **Status Dokumen:** Ready for Development
* **Target Lingkungan Deploy:** Frontend & API di **Vercel** (Serverless Architecture), Database & Storage di **Supabase**.

---

### 2. Latar Belakang & Tujuan

Dalam operasional data perbankan harian, pemantauan terhadap *batch jobs* (khususnya berbasis Apache Airflow) merupakan aktivitas kritikal untuk menjamin ketersediaan data pada *Data Lake* dan *Enterprise Data Warehouse* (EDW). Pelaporan status operasional ini saat ini masih membutuhkan intervensi manual yang cukup intensif.

Aplikasi **Job Track Central** ini dibangun sebagai aplikasi berbasis web *fullstack serverless* yang responsif (mobile-friendly). Tujuannya adalah mengotomatiskan penentuan status pemrosesan *job*, mempercepat penyusunan teks laporan berkala, menyederhanakan dokumentasi insiden eror, serta mempermudah ekstraksi metrik kinerja operasional langsung ke spreadsheet (Excel) tanpa risiko data sel yang bergeser.

---

### 3. Arsitektur & Teknologi (Tech Stack)
* **Frontend Framework:** Next.js (React.js) – Di-deploy sepenuhnya ke **Vercel**. Wajib menggunakan sistem *File-based Routing* (App Router) untuk memisahkan setiap modul laporan ke dalam halaman (*Page*) dan rute (*Route*) yang independen guna mengoptimalkan performa mobile (*code splitting*).
* **Navigation UX:** Menyediakan komponen *Navigation Bar* (responsif berupa *Bottom Navigation* pada tampilan mobile atau *Sidebar* pada tampilan desktop) untuk memudahkan perpindahan antar halaman laporan tanpa perlu memuat ulang seluruh aplikasi.
* **Backend Framework:** Next.js Serverless API Routes – Berjalan di atas infrastruktur serverless Vercel, menghilangkan kebutuhan manajemen server VPS terpisah.
* **Database & BaaS:** **Supabase (PostgreSQL)** – Digunakan untuk penyimpanan data relasional, pencatatan waktu (*timestamp*), dan manajemen state.
* **Cloud Storage:** **Supabase Storage** – Bucket khusus bernama `error-screenshots` untuk menyimpan gambar bukti eror.
* **Protokol Komunikasi:** Supabase JS SDK dengan optimasi *Connection Pooling* untuk mendukung eksekusi serverless yang cepat.

---

### 4. Skema Database (Supabase / PostgreSQL)

Jalankan skrip SQL berikut pada Editor SQL Supabase untuk membentuk struktur tabel dasar aplikasi:

```sql
-- =========================================================================
-- MASTER DATA SCHEMAS (Template Dasar)
-- =========================================================================

-- 1. Master Template untuk Modul 1 (Critical Job Priority Airflow)
CREATE TABLE master_jobs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(255) NOT NULL UNIQUE,
    default_schedule_time TIME NOT NULL,
    is_cross_day BOOLEAN DEFAULT FALSE, -- TRUE untuk Job 1-3 (22:30, 23:00), FALSE untuk sisanya
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Master Template untuk Modul 2 (Intraday Job)
CREATE TABLE master_intraday_jobs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(255) NOT NULL UNIQUE, -- Contoh: 'cbs_mspayment_intraday'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Master Template Detail Batch untuk Modul 2
CREATE TABLE master_intraday_batches (
    id SERIAL PRIMARY KEY,
    intraday_job_id INT REFERENCES master_intraday_jobs(id) ON DELETE CASCADE,
    batch_number INT NOT NULL,
    default_started_time TIME NOT NULL, -- Contoh: 08:30:00, 09:30:00, dst.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- TRANSACTAL LOG SCHEMAS (Catatan Harian)
-- =========================================================================

-- 4. Log Harian Modul 1 (Critical Job Log)
CREATE TABLE daily_monitoring_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operational_date DATE NOT NULL,
    job_id INT REFERENCES master_jobs(id) ON DELETE CASCADE,
    job_name VARCHAR(255) NOT NULL,
    scheduled_timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- Gabungan Tanggal + Jam riil kalender
    end_timestamp TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT '*WAITING*' NOT NULL,      -- *WAITING*, *RUNNING*, *DONE*, *FAILED*
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Log Harian Modul 2 (Intraday Batch Log)
CREATE TABLE daily_intraday_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operational_date DATE NOT NULL,
    batch_id INT REFERENCES master_intraday_batches(id) ON DELETE CASCADE,
    batch_number INT NOT NULL,
    started_time TIME NOT NULL,
    finished_timestamp TIMESTAMP WITH TIME ZONE, -- Diisi manual format HHMMSS oleh user
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Log Insiden Modul 3 (Error Log - Ad-hoc)
CREATE TABLE daily_error_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operational_date DATE NOT NULL DEFAULT CURRENT_DATE,
    error_title VARCHAR(255) NOT NULL,
    error_text_log TEXT NOT NULL,
    screenshot_url TEXT, -- URL Publik menuju Supabase Storage Bucket
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- OPTIMIZATION INDEXES
-- =========================================================================
CREATE INDEX idx_mod1_date_order ON daily_monitoring_log(operational_date, job_id);
CREATE INDEX idx_mod2_date_order ON daily_intraday_log(operational_date, batch_number);
CREATE INDEX idx_mod3_date ON daily_error_log(operational_date);

```

---

### 5. Spesifikasi Modul Fungsional

#### MODUL 1: REPORT JOB CRITICAL

* **F-01-01: Auto-Generation Lembar Kerja Harian**
* Setiap hari baru dimulai, sistem *serverless* otomatis mendeteksi Tanggal Operasional baru (*Operational Date*).
* Sistem menduplikasi 42 list job dari `master_jobs` ke tabel `daily_monitoring_log` dengan status inisiasi awal `*WAITING*`.
* **Logika Lintas Hari (Cross-Day Logic):** Job urutan 1 s.d 3 (Schedule 22:30 & 23:00) disimpan menggunakan *timestamp* tanggal kalender **Hari H-0**. Job urutan 4 s.d 42 (Schedule 00:00 s.d pagi) otomatis digeser menggunakan *timestamp* tanggal kalender **Hari H+1**.


* **F-01-02: Otomatisasi Perubahan Status (State Machine)**
* `*WAITING*` → `*RUNNING*`: Berubah otomatis tanpa intervensi ketika waktu server saat ini telah menyentuh atau melewati nilai `scheduled_timestamp` penuh (Tanggal + Jam).
* `*RUNNING*` → `*DONE*`: Berubah otomatis seketika setelah pengguna mengisi input data komponen `End Time`.
* `*RUNNING*` → `*FAILED*`: Diubah secara manual oleh pengguna dengan menekan tombol `[ Mark Failed ]` di dashboard jika terjadi kendala pada Airflow.


* **F-01-03: Input Optimalisasi Mobile untuk End Time**
* **Mekanisme UI:** Pengguna menginput jam selesai secara manual berupa deretan 6 digit angka tanpa simbol pemisah (`HHMMSS`). Contoh: Mengetik angka `052714` untuk merekam jam `05:27:14`.
* **UX Smartphone:** Kolom input form wajib menggunakan atribut HTML `inputmode="numeric"` atau `type="tel"`. Saat dibuka via smartphone, keyboard bawaan HP wajib **langsung memicu layout angka murni (numeric pad)** tanpa tanda baca.
* **Visual Masking:** Layar browser menampilkan auto-format bertanda titik dua (`HH:MM:SS`) secara real-time saat pengetikan untuk mempermudah pengecekan visual sebelum disimpan.


* **F-01-04: Generator Teks Laporan Utama (Copy Report Text)**
* Menyediakan tombol global `[ 📋 Copy Update Report ]`. Ketika ditekan, sistem menyusun string rangkuman teks laporan harian ke dalam *clipboard* pengguna.
* **Aturan Format Waktu:** Komponen detik pada waktu selesai **dipotong secara mutlak (truncated)**, teks hanya menampilkan jam dan menit (`HH:MM`).
* **Format Hasil Salinan Teks:**
```text
Dear all,
Berikut update status job priority airflow
*28/Jun/2026* - *07:10*

1.cbs_tradefinance_to_landing
22:30 - 22:47
*DONE*

36.dag_ers_job (egl)
04:00 - 
*RUNNING*

```




* **F-01-05: Generator Durasi Kerja untuk Excel (Copy Running Duration)**
* Menyediakan tombol khusus `[ 📊 Copy Running Duration ]`. Digunakan untuk mengekstrak metrik performa durasi kerja harian dalam urutan vertikal agar saat di-*paste* di Microsoft Excel langsung mengisi baris-baris ke bawah dalam satu kolom tunggal yang rapi.
* **Aturan Integritas Data (Urutan Baris):** Sistem wajib mengurutkan data durasi secara mutlak dari nomor urut job master 1 sampai 42.
* **Logika Output per Baris:**
* Jika status **`*DONE*`**: Hitung selisih waktu secara presisi: `end_timestamp - scheduled_timestamp`. Output ditulis lengkap dengan detiknya: `HH:MM:SS`.
* Jika status **`*WAITING*`** atau **`*RUNNING*`**: Durasi belum final, sistem **wajib menghasilkan string kosong / baris kosong (`""`)** agar koordinat sel Excel di bawahnya tidak bergeser naik atau tertukar.


* **Struktur String Clipboard:** Array dirangkai menggunakan pemisah karakter baris baru (`\n`). Contoh data mentah pada clipboard: `00:17:00\n00:08:00\n\n\n02:19:00`.



---

#### MODUL 2: REPORT JOB INTRADAY

* **F-02-01: Auto-Generation Batch Intraday**
* Setiap hari baru dimulai, sistem otomatis membaca tabel `master_intraday_batches` dan membuat 10 baris data aktif baru di tabel `daily_intraday_log` sesuai tanggal hari tersebut dengan nilai kolom `finished_timestamp` diinisialisasi kosong (*null*). Seluruh proses berjalan di tanggal hari kalender yang sama.


* **F-02-02: Input Mobile Friendly untuk Finished Time**
* Mengadopsi penuh fitur **F-01-03**. Input manual dikerjakan dengan mengetik 6 digit angka murni (`HHMMSS`) dan form wajib mengaktifkan *numeric keyboard pad* secara otomatis pada perangkat smartphone (`inputmode="numeric"`).


* **F-02-03: Generator Teks Laporan Intraday Dinamis (Conditional Row Generation)**
* Menyediakan tombol global `[ 📋 Copy Intraday Report ]` untuk merangkai teks pelaporan per *batch*.
* **Aturan Penyaringan Waktu Baru (Critical UX):** Sistem hanya akan memasukkan baris *batch* ke dalam teks laporan jika **Waktu Server Saat Ini (Current Time)** sudah **melewati atau sama dengan** jam `Started Time` dari *batch* tersebut. Jika waktu belum terlewati, baris *batch* tersebut **mutlak disembunyikan** dari susunan teks.
* **Aturan Format Waktu:** Format jam *started* dan *finished* dipotong hanya sampai tingkat menit (`HH:MM`).
* **Contoh Kasus (Klik dilakukan jam 11:45):** Sistem mendeteksi waktu rilis batch 1 s.d 4 (08:30 s.d 11:30) sudah terlewati, sedangkan batch 5 (12:30) ke atas belum waktunya. Teks laporan otomatis terpotong bersih hanya sampai batch 4:
```text
cbs_mspayment_intraday
*13/May/2026*
- batch 1: started 08:30 finished 08:44
- batch 2: started 09:30 finished 09:43
- batch 3: started 10:30 finished 10:44
- batch 4: started 11:30 finished 11:43

```




* **F-02-04: Copy Waktu Selesai untuk Excel (Copy Finished Time)**
* Menyediakan tombol khusus `[ 📊 Copy Finished Time ]` untuk mengekstrak catatan jam selesai riil secara vertikal ke satu kolom Excel.
* **Aturan Kepatuhan Baris Spreadsheet:** Berbeda dengan teks laporan utama (F-02-03) yang menyembunyikan baris, fitur ekstraksi Excel ini **wajib tetap menyertakan baris kosong (`""` atau `\n`)** untuk setiap *batch* yang belum berjalan atau belum selesai diinput. Hal ini demi menjamin konsistensi urutan Baris 1 sampai Baris 10 di Excel tidak acak-acakan.
* **Format Waktu:** Menggunakan format presisi penuh bertingkat detik yaitu **`HH:MM:SS`**.



---

#### MODUL 3: REPORT ERROR / INCIDENT LOG

* **F-03-01: Rich Text / Large Area Log Input**
* Menyediakan komponen teks area (`<textarea>`) berkapasitas besar pada form input insiden eror harian. Komponen ini digunakan untuk menyimpan teks pesan kesalahan mentah sistem (*error stack trace dump*) tanpa merusak format pemisah baris baru teks asli.


* **F-03-02: Smart Paste Image Container (Ctrl + V Support)**
* **Spesifikasi UX Utama:** Menyediakan satu area kotak kontainer dropzone tangkapan layar eror pada halaman web.
* **Logika Penangkapan Objek:** Frontend aplikasi dikonfigurasi menggunakan Event Listener JavaScript `onPaste`. Pengguna cukup melakukan screenshot eror menggunakan komputer/laptop (`PrintScreen` / `Snipping Tool`), lalu mengklik area kontainer di web aplikasi dan menekan kombinasi tombol **`Ctrl + V`**.
* **Alur Kerja Serverless:**
1. JavaScript menangkap file objek *blob* gambar dari *clipboard*.
2. Sistem menampilkan pratinjau gambar (*image preview*) instan di layar dashboard.
3. Saat tombol `[ Simpan Report Eror ]` ditekan, fungsi backend serverless mengunggah file gambar tersebut secara otomatis ke dalam Supabase Storage Bucket bernama `error-screenshots` dengan UUID nama unik (Format: `err_[timestamp].png`).
4. Sistem mengambil URL Publik file gambar tersebut dan menyimpannya ke kolom `screenshot_url` di dalam tabel database `daily_error_log`.




* **F-03-03: Generator Ringkasan Teks Laporan Insiden**
* Menyediakan tombol `[ 📋 Copy Error Report ]`. Saat ditekan, sistem menyusun laporan berformat teks untuk dikirim ke grup koordinasi:
```text
REPORT ERROR OPERATIONAL
Tanggal: *28/Jun/2026*

1. Isu: Timeout Airflow Job cbs_tradefinance_to_landing
   Detail: [Isi Teks Log Error]
   Bukti: [Link URL Screenshot Publik Supabase]

```





---

### 6. Kebutuhan Non-Fungsional (Non-Functional Requirements)
1. **Pemisahan Halaman (Route Isolation):** Setiap jenis laporan wajib memiliki URL/Route yang unik (`/critical-jobs`, `/intraday-jobs`, `/error-logs`). State management (seperti data input sementara sebelum disimpan) harus terisolasi di masing-masing page agar tidak terjadi tabrakan data (*data leaks*) antar laporan.
2. **Kecepatan Memuat Halaman (Performance):** Karena dijalankan pada arsitektur serverless Vercel dan Supabase API, respon halaman utama monitoring saat dibuka di perangkat mobile wajib berada di bawah 2 detik pada koneksi internet standar (4G/5G).
3. **Keamanan Data (Data Security):** Karena merupakan sistem monitoring data perbankan, seluruh transmisi data wajib menggunakan protokol terenkripsi HTTPS. Akses ke dashboard ini sebaiknya dilindungi oleh fitur Supabase Auth sederhana (Email & Password) agar hanya pengguna terdaftar (tim operasional data) yang dapat melakukan perubahan status.
4. **Real-time Refresh UI:** Dashboard utama disarankan mengaktifkan fitur *Real-time Subscription* dari Supabase agar perubahan status otomatis (*Waiting → Running*) langsung tecermin di layar browser Anda tanpa perlu menekan tombol *refresh* manual.