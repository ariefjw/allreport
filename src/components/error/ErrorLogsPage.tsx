"use client";

import { useState, useCallback } from "react";
import { useErrorLogs } from "@/hooks/useErrorLogs";
import type { DailyErrorLog } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { ImagePasteZone } from "@/components/ui/ImagePasteZone";
import { generateErrorReportText } from "@/lib/report-generators/error";
import { getTodayDisplay } from "@/lib/utils";

export function ErrorLogsPage() {
  const { logs, loading, error, createLog } = useErrorLogs();
  const [title, setTitle] = useState("");
  const [errorText, setErrorText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleImageChange = useCallback((file: File | null, preview: string | null) => {
    setImageFile(file);
    setImagePreview(preview);
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !errorText.trim()) return;

    setSaving(true);
    setSaveError(null);

    try {
      await createLog({
        errorTitle: title.trim(),
        errorTextLog: errorText.trim(),
        screenshotFile: imageFile,
      });
      setTitle("");
      setErrorText("");
      setImageFile(null);
      setImagePreview(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [title, errorText, imageFile, createLog]);

  return (
    <>
      <PageHeader
        title="Error / Incident Log"
        description="Document operational errors with screenshots"
        date={getTodayDisplay()}
        actions={
          <CopyButton
            label="Copy Error Report"
            onCopy={async () => generateErrorReportText(logs)}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            New Error Report
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Error Title / Issue
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Timeout Airflow Job cbs_tradefinance_to_landing"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Error Log Detail
              </label>
              <textarea
                value={errorText}
                onChange={(e) => setErrorText(e.target.value)}
                placeholder="Paste error stack trace or log message here..."
                rows={8}
                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm leading-relaxed text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Screenshot Evidence
              </label>
              <ImagePasteZone preview={imagePreview} onImageChange={handleImageChange} />
            </div>

            {saveError && (
              <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim() || !errorText.trim()}
              className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Saving..." : "Simpan Report Eror"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Today&apos;s Incidents ({logs.length})
          </h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading incidents...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No incidents recorded today.</p>
          ) : (
            logs.map((log) => <ErrorLogCard key={log.id} log={log} />)
          )}
        </div>
      </div>
    </>
  );
}

function ErrorLogCard({ log }: { log: DailyErrorLog }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{log.errorTitle}</p>
          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {log.errorTextLog}
          </p>
        </div>
        {log.screenshotUrl && (
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={log.screenshotUrl}
              alt="Error screenshot"
              className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
            />
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        {new Date(log.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
