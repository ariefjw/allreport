"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useErrorLogs } from "@/hooks/useErrorLogs";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { ImagePasteZone } from "@/components/ui/ImagePasteZone";
import { getTodayDisplay } from "@/lib/utils";

export function ErrorLogsPage() {
  const { logs, loading, error, createLog, deleteLog, deleteMultipleLogs } = useErrorLogs();
  const [errorText, setErrorText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase.channel('snippet-room');
    channel.on('broadcast', { event: 'snippet-update' }, (payload) => {
      setErrorText(payload.payload.text);
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const handleTextChange = (val: string) => {
    setErrorText(val);
    supabase.channel('snippet-room').send({
      type: 'broadcast',
      event: 'snippet-update',
      payload: { text: val },
    });
  };

  const handleImageChange = useCallback((file: File | null, preview: string | null) => {
    setImageFile(file);
    setImagePreview(preview);
  }, []);

  const handleSaveImage = useCallback(async () => {
    if (!imageFile) return;

    setSaving(true);
    setSaveError(null);

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    const autoTitle = `Screenshot ${timeStr}`;

    try {
      await createLog({
        errorTitle: autoTitle,
        screenshotFile: imageFile,
      });
      setImageFile(null);
      setImagePreview(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [imageFile, createLog]);

  const screenshots = useMemo(
    () => logs.filter((log) => log.screenshotUrl),
    [logs]
  );

  const handleSingleDelete = useCallback(async (log: typeof screenshots[number]) => {
    if (!window.confirm(`Delete "${log.errorTitle}"?`)) return;
    await deleteLog(log.id, log.screenshotUrl);
  }, [deleteLog]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const items = screenshots.filter((s) => selectedIds.has(s.id));
    if (!window.confirm(`Delete ${items.length} screenshot${items.length > 1 ? "s" : ""}?`)) return;
    setDeleting(true);
    try {
      await deleteMultipleLogs(items.map((s) => ({ id: s.id, screenshotUrl: s.screenshotUrl })));
      setSelectedIds(new Set());
      setSelectMode(false);
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, screenshots, deleteMultipleLogs]);

  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  return (
    <>
      <PageHeader
        title="Error / Incident Log"
        description="Document operational errors with screenshots"
        date={getTodayDisplay()}
        actions={
          <CopyButton
            label="Copy Text"
            onCopy={async () => errorText}
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
            Live Snippet
          </h2>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-[#0d1117]">
              <div className="bg-slate-200/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-white/5 dark:text-slate-400">
                Log Text
              </div>
              <textarea
                value={errorText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Type or paste logs here..."
                rows={8}
                spellCheck={false}
                className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-800 focus:outline-none dark:text-slate-300"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                Screenshot
              </p>
              <ImagePasteZone preview={imagePreview} onImageChange={handleImageChange} />
            </div>

            {saveError && (
              <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveImage}
                disabled={saving || !imageFile}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Uploading..." : "Save Screenshot"}
              </button>
            </div>
          </div>
        </div>

        {screenshots.length > 0 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Saved Screenshots ({screenshots.length})
              </h2>
              <div className="flex items-center gap-2">
                {selectMode && selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchDelete}
                    disabled={deleting}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? "Deleting..." : `Delete (${selectedIds.size})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleSelectMode}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectMode
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {selectMode ? "Cancel" : "Select"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {screenshots.map((log) => (
                <div
                  key={log.id}
                  className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-900 ${
                    selectMode && selectedIds.has(log.id)
                      ? "border-indigo-500 ring-2 ring-indigo-400"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {selectMode ? (
                    <button
                      type="button"
                      onClick={() => toggleSelect(log.id)}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <div className="absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border-2 border-white bg-white/80 dark:border-slate-300 dark:bg-slate-800/80">
                          {selectedIds.has(log.id) && (
                            <svg className="h-3 w-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={log.screenshotUrl!}
                          alt={log.errorTitle}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                          {log.errorTitle}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString("en-ID", {
                            timeZone: "Asia/Jakarta",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSingleDelete(log)}
                        className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                        title="Delete screenshot"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <a
                        href={log.screenshotUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={log.screenshotUrl!}
                            alt={log.errorTitle}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                        <div className="p-2">
                          <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                            {log.errorTitle}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(log.createdAt).toLocaleTimeString("en-ID", {
                              timeZone: "Asia/Jakarta",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </a>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && screenshots.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            No screenshots saved yet.
          </p>
        )}
      </div>
    </>
  );
}
