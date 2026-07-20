"use client";

import { useState, useCallback, useRef } from "react";

interface ImagePasteZoneProps {
  preview: string | null;
  onImageChange: (file: File | null, previewUrl: string | null) => void;
}

export function ImagePasteZone({ preview, onImageChange }: ImagePasteZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const url = URL.createObjectURL(file);
            onImageChange(file, url);
          }
          break;
        }
      }
    },
    [onImageChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        onImageChange(file, url);
      }
    },
    [onImageChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file?.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        onImageChange(file, url);
      }
      e.target.value = "";
    },
    [onImageChange]
  );

  const handleRemove = () => {
    if (preview) URL.revokeObjectURL(preview);
    onImageChange(null, null);
  };

  return (
    <div
      ref={zoneRef}
      tabIndex={0}
      onPaste={handlePaste}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 ${
        isDragOver
          ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
          : preview
            ? "border-green-300 bg-green-50/50 dark:border-green-600 dark:bg-green-500/10"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-slate-500"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Error screenshot preview"
            className="mx-auto max-h-48 rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="text-center">
          <svg
            className="mx-auto h-10 w-10 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            Paste screenshot here
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Click this area, then press <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-700 dark:text-slate-300">Ctrl+V</kbd>
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Choose from files
          </button>
        </div>
      )}
    </div>
  );
}
