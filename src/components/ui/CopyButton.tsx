"use client";

import { useState, useCallback } from "react";

interface CopyButtonProps {
  label: string;
  onCopy: () => Promise<string>;
  variant?: "primary" | "secondary";
}

export function CopyButton({ label, onCopy, variant = "primary" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      const text = await onCopy();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may fail silently */
    } finally {
      setLoading(false);
    }
  }, [onCopy]);

  const baseClasses =
    "group relative inline-flex items-center justify-center overflow-hidden rounded-xl px-5 py-2.5 text-[13px] font-medium tracking-wide transition-all duration-200 active:scale-[0.97] disabled:opacity-50";

  const variantClasses =
    variant === "primary"
      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:shadow-white/5 dark:hover:bg-slate-100"
      : "bg-transparent text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800/50 dark:hover:ring-slate-600";

  const copiedClasses = copied
    ? "bg-emerald-600 text-white ring-0 shadow-lg shadow-emerald-600/20 dark:bg-emerald-500 dark:text-white"
    : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${baseClasses} ${copied ? copiedClasses : variantClasses}`}
    >
      <span className="relative z-10">
        {copied ? "Copied to clipboard" : label}
      </span>
    </button>
  );
}
