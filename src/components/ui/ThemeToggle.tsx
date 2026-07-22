"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className="relative flex h-8 w-14 items-center rounded-full bg-slate-200/80 p-1 transition-colors dark:bg-slate-700/80"
    >
      <span
        className={`absolute flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-200 dark:bg-slate-900 ${
          theme === "dark" ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {theme === "light" ? (
          <Sun className="h-3.5 w-3.5 text-amber-500" strokeWidth={2} />
        ) : (
          <Moon className="h-3.5 w-3.5 text-slate-300" strokeWidth={2} />
        )}
      </span>
    </button>
  );
}
