"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, AlertCircle, Upload, Trash2, RefreshCw, FileText, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FloatingAlert } from "@/components/ui/FloatingAlert";
import { MONTHS_INDONESIA, MONTHS_INDONESIA_FULL, MAX_SIGNATURE_BYTES, DEFAULT_TIMESHEET_PROFILE } from "@/lib/timesheet/constants";
import { parseSchedule } from "@/lib/timesheet/parser";
import { autoOvertimeFlags, previewRows, type PreviewRow } from "@/lib/timesheet/pattern";
import { OvertimeModal } from "@/components/ui/OvertimeModal";
import { useTimesheet, type TimesheetProfileFields } from "@/hooks/useTimesheet";
import type { TimesheetEntry } from "@/types";

// Only these two are persisted per user (plus the signature upload).
const IDENTITY_FIELDS = { employeeNo: "", fullName: "" };

// Never persisted: shown in the form but always reset to these defaults.
const DEFAULT_FIELDS = { ...DEFAULT_TIMESHEET_PROFILE };

const MONTH_LABEL = (month: number, year: number) =>
  `${MONTHS_INDONESIA_FULL[month as keyof typeof MONTHS_INDONESIA_FULL]} ${year}`;

function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function TimesheetPage() {
  const { profile, entries, loading, refreshProfile, loadEntries, saveProfile, removeSignature, download } =
    useTimesheet();

  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savedName, setSavedName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  // Tahap 1: hasil parse + checklist lembur yang dipilih user (hanya di sesi browser).
  const [preview, setPreview] = useState<{ rows: PreviewRow[]; flags: Record<string, boolean> } | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [form, setForm] = useState({
    ...IDENTITY_FIELDS,
    ...DEFAULT_FIELDS,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    autoHoliday: true,
    manualHolidays: "",
    schedule: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      employeeNo: profile.employeeNo,
      fullName: profile.fullName,
    }));
    setSignaturePreview(profile.signaturePreviewUrl);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      await loadEntries(form.year, form.month);
    } catch {
      // history is non-critical; keep the page usable
    }
  }, [loadEntries, form.year, form.month]);

  useEffect(() => {
    if (loading) return;
    refreshHistory();
  }, [loading, refreshHistory]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : false;
    // Jadwal/periode berubah = daftar checklist di modal jadi basi.
    if (name === "schedule" || name === "month" || name === "year") setPreview(null);
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setError("");
    if (file && !["image/png", "image/jpeg"].includes(file.type)) {
      setError("Tanda tangan harus berformat PNG atau JPG.");
      e.target.value = "";
      return;
    }
    if (file && file.size > MAX_SIGNATURE_BYTES) {
      setError("Ukuran tanda tangan maksimal 1MB.");
      e.target.value = "";
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSignatureFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setSignaturePreview(url);
    } else {
      setSignaturePreview(profile?.signaturePreviewUrl ?? null);
    }
  };

  const handleDeleteSignature = async () => {
    setError("");
    try {
      await removeSignature();
      setSignatureFile(null);
      setSignaturePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const persistProfile = useCallback(
    async (fields: TimesheetProfileFields) => {
      const saved = await saveProfile(fields, signatureFile);
      setSignatureFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setSignaturePreview(saved.signaturePreviewUrl);
      return saved;
    },
    [saveProfile, signatureFile]
  );

  const identityFields = (): TimesheetProfileFields => ({
    employeeNo: form.employeeNo.trim(),
    fullName: form.fullName.trim(),
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSavingProfile(true);
    try {
      await persistProfile(identityFields());
      await refreshProfile();
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingProfile(false);
    }
  };

  // Tahap 1: parse jadwal lalu buka modal checklist lembur.
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const fields = identityFields();
    if (Object.values(fields).some((v) => !v)) {
      setError("Silakan lengkapi Employee No dan Full Name terlebih dahulu.");
      return;
    }
    if (!form.schedule.trim()) {
      setError("Silakan isi data jadwal terlebih dahulu.");
      return;
    }

    setLoadingPreview(true);
    try {
      const saved = await persistProfile(fields);
      await refreshProfile();

      const month = Number(form.month);
      const year = Number(form.year);
      const schedule = parseSchedule(form.schedule);
      if (!Object.keys(schedule).length) throw new Error("Format jadwal tidak dikenali");

      setSavedName(saved.fullName);
      setPreview({
        rows: previewRows(schedule, year, month),
        flags: Object.fromEntries(autoOvertimeFlags(schedule)),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingPreview(false);
    }
  };

  // Tahap 2: generate Excel memakai checklist yang dipilih user.
  const handleConfirmGenerate = async () => {
    if (!preview) return;
    setError("");
    setSuccess(false);
    setLoadingGenerate(true);
    try {
      const res = await fetch("/api/timesheet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: Number(form.month),
          year: Number(form.year),
          autoHoliday: form.autoHoliday,
          manualHolidays: form.manualHolidays,
          schedule: form.schedule,
          organization: form.organization.trim() || DEFAULT_TIMESHEET_PROFILE.organization,
          position: form.position.trim() || DEFAULT_TIMESHEET_PROFILE.position,
          client: form.client.trim() || DEFAULT_TIMESHEET_PROFILE.client,
          project: form.project.trim() || DEFAULT_TIMESHEET_PROFILE.project,
          overtimeFlags: preview.flags,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal membuat timesheet");
      }

      saveBlob(
        await res.blob(),
        `Timesheet SMBC ${MONTH_LABEL(Number(form.month), Number(form.year))} - ${savedName || profile?.fullName}.xlsx`
      );
      setPreview(null);
      await refreshHistory();
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingGenerate(false);
    }
  };

  const applyEntrySchedule = (entry: TimesheetEntry) => {
    setForm((prev) => ({
      ...prev,
      schedule: entry.scheduleText,
      month: entry.month,
      year: entry.year,
    }));
    setSuccess(false);
  };

  const redownloadEntry = async (entry: TimesheetEntry) => {
    setError("");
    try {
      const blob = await download(`/api/timesheet/entries/${entry.id}`);
      saveBlob(blob, `Timesheet SMBC ${MONTH_LABEL(entry.month, entry.year)} - ${entry.fullName}.xlsx`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const employeeFieldsFilled = [form.employeeNo, form.fullName].every((v) => v.trim().length > 0);

  const toggleFlag = (key: string, checked: boolean) => {
    setPreview((prev) => (prev ? { ...prev, flags: { ...prev.flags, [key]: checked } } : prev));
  };

  const resetFlags = () => {
    const schedule = parseSchedule(form.schedule);
    const flags = Object.fromEntries(autoOvertimeFlags(schedule));
    setPreview((prev) => (prev ? { ...prev, flags } : prev));
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Timesheet Generator"
        description="Generate timesheet Excel berdasarkan jadwal shift bulan ini. Employee No, Full Name, dan tanda tangan disimpan per akun."
      />

      {error && <FloatingAlert message={error} type="failed" visible={!!error} onDismiss={() => setError("")} />}
      {success && <FloatingAlert message="Berhasil disimpan!" type="info" visible={true} onDismiss={() => setSuccess(false)} />}

      <form onSubmit={handleGenerate} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sidebar Data Karyawan */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-ink">Data Karyawan</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Employee No</label>
                <input name="employeeNo" value={form.employeeNo} onChange={handleChange} className="input text-sm" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Full Name</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} className="input text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Bulan</label>
                  <select name="month" value={form.month} onChange={handleChange} className="input text-sm">
                    {Object.entries(MONTHS_INDONESIA).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Tahun</label>
                  <input name="year" type="number" value={form.year} onChange={handleChange} className="input text-sm" required />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="btn-secondary w-full justify-center gap-2 py-2 text-xs"
              >
                {savingProfile ? "Menyimpan..." : "Simpan Data Karyawan"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-ink">Data Perusahaan</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Organization</label>
                <input name="organization" value={form.organization} onChange={handleChange} className="input text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Position</label>
                <input name="position" value={form.position} onChange={handleChange} className="input text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Client</label>
                <input name="client" value={form.client} onChange={handleChange} className="input text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Project</label>
                <input name="project" value={form.project} onChange={handleChange} className="input text-sm" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Tanda Tangan</h2>
              <span className="text-[11px] text-muted">opsional</span>
            </div>
            <p className="mb-3 text-xs text-body">
              JPG/PNG maks 1MB. Akan disisipkan pada kolom &ldquo;Pemohon&rdquo; di Excel.
            </p>
            <div className="space-y-3">
              <div className="flex min-h-[88px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-hairline-strong bg-canvas p-3">
                {signaturePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signaturePreview} alt="Pratinjau tanda tangan" className="max-h-20 w-auto object-contain" />
                ) : (
                  <span className="text-xs text-muted">Belum ada tanda tangan</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="signature"
                accept="image/png,image/jpeg"
                onChange={handleSignatureChange}
                className="hidden"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary flex-1 justify-center gap-2 py-2 text-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Pilih Gambar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSignature}
                  disabled={!profile?.signaturePreviewUrl}
                  className="btn-secondary justify-center gap-2 px-3 py-2 text-xs disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-ink">Libur Nasional</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="autoHoliday" checked={form.autoHoliday} onChange={handleChange} className="h-4 w-4 rounded border-hairline accent-accent" />
                <span className="text-sm text-body">Ambil otomatis dari API</span>
              </label>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Tambahan libur manual (pisahkan dengan koma)</label>
                <input name="manualHolidays" value={form.manualHolidays} onChange={handleChange} placeholder="Contoh: 1, 15, 20" className="input text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-hairline-strong bg-canvas p-4 text-sm text-muted">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="mb-2 font-medium text-ink">Format Data Jadwal</p>
                <p className="mb-2">Paste jadwal format 3 kolom (Tgl, Hari, Jam/off). Pemisah bisa tab atau spasi.</p>
                <pre className="rounded bg-background p-2 text-xs font-mono text-body">
                  1   Rabu   07:00 - 15:00{"\n"}
                  2   Kamis  15:00 - 23:00{"\n"}
                  4   Sabtu  off{"\n"}
                  8   Senin  12 - 16 // 16 - 00
                </pre>
              </div>
            </div>

            <textarea
              name="schedule"
              value={form.schedule}
              onChange={handleChange}
              placeholder="Paste data jadwal di sini..."
              className="input min-h-[350px] w-full font-mono text-sm leading-relaxed"
              required
            />
          </div>

          <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <FileText className="h-4 w-4 text-accent" />
                Riwayat {MONTH_LABEL(Number(form.month), Number(form.year))}
              </h2>
              <button type="button" onClick={refreshHistory} className="flex items-center gap-1 text-xs text-muted hover:text-ink">
                <RefreshCw className="h-3.5 w-3.5" /> Muat ulang
              </button>
            </div>
            {entries.length === 0 ? (
              <p className="text-xs text-muted">Belum ada timesheet tersimpan untuk periode ini.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {MONTH_LABEL(entry.month, entry.year)}
                        {entry.hasSignature && <span className="ml-2 text-[11px] text-accent">+ ttd</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(entry.createdAt).toLocaleString("id-ID")}
                        {entry.totalHours != null && ` · ${entry.totalHours} jam`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => applyEntrySchedule(entry)} className="btn-secondary px-3 py-1.5 text-xs">
                        Pakai jadwal
                      </button>
                      <button
                        type="button"
                        onClick={() => redownloadEntry(entry)}
                        className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                      >
                        <Download className="h-3.5 w-3.5" /> Unduh
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={loadingPreview || loadingGenerate || loading}
            className="btn-primary w-full justify-center gap-2 py-3 text-sm"
          >
            {loadingPreview ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-transparent" />
                Mengecek jadwal...
              </span>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                {employeeFieldsFilled ? "Pilih Hari Lembur" : "Lengkapi Data Karyawan"}
              </>
            )}
          </button>
        </div>
      </form>

      <OvertimeModal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        rows={preview?.rows ?? []}
        flags={preview?.flags ?? {}}
        monthLabel={MONTH_LABEL(Number(form.month), Number(form.year))}
        busy={loadingGenerate}
        error={error || null}
        onToggle={toggleFlag}
        onReset={resetFlags}
        onConfirm={handleConfirmGenerate}
      />
    </main>
  );
}
