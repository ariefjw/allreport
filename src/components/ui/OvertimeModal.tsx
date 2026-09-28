"use client";

import { X, Download, RotateCcw, Clock } from "lucide-react";
import { hoursBetween, type PreviewRow } from "@/lib/timesheet/pattern";

interface OvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: PreviewRow[];
  flags: Record<string, boolean>;
  monthLabel: string;
  busy: boolean;
  error?: string | null;
  onToggle: (key: string, checked: boolean) => void;
  onReset: () => void;
  onConfirm: () => void;
}

export function OvertimeModal({
  isOpen,
  onClose,
  rows,
  flags,
  monthLabel,
  busy,
  error,
  onToggle,
  onReset,
  onConfirm,
}: OvertimeModalProps) {
  if (!isOpen) return null;

  const segments = rows.filter((r) => r.cin && r.cout);
  const overtimeRows = segments.filter((r) => flags[r.key]);
  const overtimeHours = overtimeRows.reduce((sum, r) => sum + hoursBetween(r.cin!, r.cout!), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mask p-4 backdrop-blur-sm">
      <div className="card flex max-h-[90vh] w-full max-w-3xl flex-col">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Pilih Hari Lembur</h2>
            <p className="mt-0.5 text-sm text-muted">
              {monthLabel} · Centang shift yang dihitung lembur. Default sudah diisi otomatis dari pola 8 hari.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost p-1.5">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="card-body flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-canvas px-2.5 py-1 text-body">
              {segments.length} shift
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-accent">
              <Clock className="h-3.5 w-3.5" />
              {overtimeRows.length} lembur · {overtimeHours} jam
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-hairline">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-canvas text-left text-xs font-semibold text-muted">
                <tr>
                  <th className="px-3 py-2.5">Tanggal</th>
                  <th className="px-3 py-2.5">Hari</th>
                  <th className="px-3 py-2.5">Masuk</th>
                  <th className="px-3 py-2.5">Keluar</th>
                  <th className="px-3 py-2.5 text-right">Jam</th>
                  <th className="px-3 py-2.5 text-center">Lembur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((row) => {
                  const worked = !!(row.cin && row.cout);
                  return (
                    <tr key={row.key} className={worked ? undefined : "bg-canvas/50"}>
                      <td className="px-3 py-2 tabular-nums text-ink">{row.day}</td>
                      <td className="px-3 py-2 text-body">{row.weekday}</td>
                      <td className="px-3 py-2 font-mono text-body">{row.cin ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-body">{row.cout ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted">
                        {worked ? `${hoursBetween(row.cin!, row.cout!)} jam` : "OFF"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Lembur tanggal ${row.day}`}
                          checked={worked ? !!flags[row.key] : false}
                          disabled={!worked || busy}
                          onChange={(e) => onToggle(row.key, e.target.checked)}
                          className="h-4 w-4 rounded border-hairline accent-accent"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onReset}
              disabled={busy}
              className="btn-secondary gap-2 py-2 text-xs disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Kembali ke otomatis
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">
                Batal
              </button>
              <button type="button" onClick={onConfirm} disabled={busy} className="btn-primary gap-2">
                <Download className="h-4 w-4" />
                {busy ? "Membuat Timesheet..." : "Buat Excel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
