"use client";

import { useState } from "react";
import { Download, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FloatingAlert } from "@/components/ui/FloatingAlert";

const MONTHS_INDONESIA = {
  1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
  5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
  9: "September", 10: "Oktober", 11: "November", 12: "Desember",
};

export default function TimesheetPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    employeeNo: "0525006",
    fullName: "Arief Joko Wicaksono",
    organization: "Professional Services",
    position: "IT Support",
    client: "PT. Bank BTPN Tbk",
    project: "IT Big Data Operations",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    autoHoliday: true,
    manualHolidays: "",
    schedule: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : false;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.schedule.trim()) {
      setError("Silakan isi data jadwal terlebih dahulu.");
      return;
    }
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/timesheet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee: {
            employeeNo: form.employeeNo,
            fullName: form.fullName,
            organization: form.organization,
            position: form.position,
            client: form.client,
            project: form.project,
          },
          month: form.month,
          year: form.year,
          autoHoliday: form.autoHoliday,
          manualHolidays: form.manualHolidays,
          schedule: form.schedule,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Gagal membuat timesheet");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Timesheet SMBC ${MONTHS_INDONESIA[form.month as keyof typeof MONTHS_INDONESIA]} ${form.year} - ${form.fullName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Timesheet Generator"
        description="Generate timesheet Excel berdasarkan jadwal shift bulan ini."
      />

      {error && <FloatingAlert message={error} type="failed" visible={!!error} onDismiss={() => setError("")} />}
      {success && <FloatingAlert message="Timesheet berhasil didownload!" type="info" visible={true} onDismiss={() => setSuccess(false)} />}

      <form onSubmit={handleGenerate} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sidebar Data Karyawan */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-xl border border-hairline bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-ink">Data Karyawan</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Employee No</label>
                <input name="employeeNo" value={form.employeeNo} onChange={handleChange} className="input-field w-full text-sm" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Full Name</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} className="input-field w-full text-sm" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Organization</label>
                <input name="organization" value={form.organization} onChange={handleChange} className="input-field w-full text-sm" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Position</label>
                <input name="position" value={form.position} onChange={handleChange} className="input-field w-full text-sm" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Client</label>
                <input name="client" value={form.client} onChange={handleChange} className="input-field w-full text-sm" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Project</label>
                <input name="project" value={form.project} onChange={handleChange} className="input-field w-full text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Bulan</label>
                  <select name="month" value={form.month} onChange={handleChange} className="input-field w-full text-sm">
                    {Object.entries(MONTHS_INDONESIA).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Tahun</label>
                  <input name="year" type="number" value={form.year} onChange={handleChange} className="input-field w-full text-sm" required />
                </div>
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
                <input name="manualHolidays" value={form.manualHolidays} onChange={handleChange} placeholder="Contoh: 1, 15, 20" className="input-field w-full text-sm" />
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
              className="input-field min-h-[350px] w-full font-mono text-sm leading-relaxed"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center gap-2 py-3 text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-transparent" />
                Membuat Timesheet...
              </span>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate Timesheet
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
