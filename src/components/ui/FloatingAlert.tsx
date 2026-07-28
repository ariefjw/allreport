"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface FloatingAlertProps {
  message: string;
  type?: "failed" | "warning" | "info";
  visible: boolean;
  onDismiss?: () => void;
}

const TYPE_STYLES = {
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-info/30 bg-info/10 text-info",
};

export function FloatingAlert({ message, type = "failed", visible, onDismiss }: FloatingAlertProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 8000);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [visible]);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-right-2 md:bottom-6">
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${TYPE_STYLES[type]}`}>
        <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="font-medium">{message}</span>
        {onDismiss && (
          <button onClick={() => { setShow(false); onDismiss(); }} className="ml-2 shrink-0 opacity-60 hover:opacity-100">
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
