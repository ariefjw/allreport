"use client";

import { useState, useCallback, useEffect } from "react";
import { formatHHMMSSMask, hhmmssToTimeString } from "@/lib/utils";

interface TimeInputProps {
  value: string | null;
  onChange: (time: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export function TimeInput({
  value,
  onChange,
  disabled = false,
  placeholder = "HHMMSS",
  label,
}: TimeInputProps) {
  const [digits, setDigits] = useState(() => {
    if (!value) return "";
    return value.replace(/:/g, "");
  });
  const [focused, setFocused] = useState(false);

  // KUNCI JAWABAN 1: Sinkronisasi state internal saat nilai dari DB (WIB) masuk
  useEffect(() => {
    if (value) {
      setDigits(value.replace(/:/g, ""));
    } else {
      setDigits("");
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "").slice(0, 6);
      setDigits(raw);

      if (raw.length === 6) {
        const parsed = hhmmssToTimeString(raw);
        onChange(parsed);
      } else if (raw.length === 0) {
        onChange(null);
      }
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (digits.length > 0 && digits.length < 6) {
      let padded = digits;
      if (digits.length <= 4) {
        padded = digits.padEnd(4, "0") + "00";
      } else {
        padded = digits.padEnd(6, "0");
      }
      setDigits(padded);
      const parsed = hhmmssToTimeString(padded);
      if (parsed) {
        onChange(parsed);
      }
    }
  }, [digits, onChange]);

  const displayValue = focused || digits.length > 0 ? formatHHMMSSMask(digits) : "";

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      )}
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className="input px-3 py-2 text-center font-mono text-sm tracking-widest"
        maxLength={8}
        autoComplete="off"
      />
    </div>
  );
}
