"use client";

import { useEffect, useState } from "react";
import { Copy, X, BrainCircuit, AlertTriangle } from "lucide-react";
import { formatTimeHM } from "@/lib/utils";
import type { PredictionResult } from "@/lib/prediction";

interface PredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictions: PredictionResult[];
}

export function PredictionModal({ isOpen, onClose, predictions }: PredictionModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleCopy = async () => {
    if (predictions.length === 0) return;
    
    let text = "*PREDIKSI DELAY JOB PRIORITAS*\n";
    text += `Waktu kalkulasi: ${formatTimeHM(new Date())} WIB\n\n`;
    
    predictions.forEach((p, i) => {
      text += `${i + 1}. ${p.jobName}\n`;
      text += `   Estimasi Selesai : *${formatTimeHM(p.predictedEndTime)}*\n`;
      text += `   Delay            : +${p.delayMinutes} menit\n`;
      text += `   Sebab            : ${p.cause}\n\n`;
    });

    try {
      await navigator.clipboard.writeText(text);
      alert("Prediksi disalin ke clipboard");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl rounded-xl border border-hairline-strong bg-surface-elevated p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Tutup</span>
        </button>

        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Prediksi Waktu Selesai (AI)</h2>
            <p className="mt-1 text-sm text-muted">
              Kalkulasi otomatis waktu rilis antrean (sensing) berdasarkan pola data historis.
            </p>
          </div>
        </div>

        {predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-hairline p-8 text-center">
            <AlertTriangle className="mb-3 h-8 w-8 text-muted opacity-50" />
            <p className="text-sm font-medium text-ink">Tidak ada antrean delay</p>
            <p className="mt-1 text-xs text-muted">Semua job berjalan sesuai jadwal normal atau tidak ada job RUNNING yang tertahan hulu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-hairline">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-hairline text-xs font-semibold text-muted">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Job Name</th>
                  <th className="px-4 py-3 text-center">Scheduled</th>
                  <th className="px-4 py-3 text-center text-status-running">Estimasi Selesai</th>
                  <th className="px-4 py-3">Penyebab Tertahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {predictions.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 text-muted">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-ink break-words max-w-[200px]">{p.jobName}</td>
                    <td className="px-4 py-3 text-center text-muted tabular-nums">
                      {formatTimeHM(new Date(p.scheduledTime))}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-status-running tabular-nums bg-status-running/5">
                      {formatTimeHM(p.predictedEndTime)}
                      <span className="block text-[10px] font-normal text-status-failed">+{p.delayMinutes}m</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted max-w-[250px] truncate" title={p.cause}>
                      {p.cause}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">
            Tutup
          </button>
          <button 
            onClick={handleCopy} 
            className="btn-primary"
            disabled={predictions.length === 0}
          >
            <Copy className="h-4 w-4" />
            Copy Laporan
          </button>
        </div>
      </div>
    </div>
  );
}
