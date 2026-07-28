"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

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

  const base = variant === "primary" ? "btn-primary" : "btn-secondary";

  const copiedClasses = copied
    ? "bg-emerald-600 text-white ring-0 shadow-lg shadow-emerald-600/20 hover:bg-emerald-600 dark:bg-emerald-500 dark:text-white"
    : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`whitespace-nowrap ${base} ${copiedClasses}`}
    >
      {copied ? (
        <Check className="h-4 w-4" strokeWidth={2} />
      ) : (
        <Copy className="h-4 w-4" strokeWidth={1.5} />
      )}
      <span>{copied ? "Copied!" : label}</span>
    </button>
  );
}
