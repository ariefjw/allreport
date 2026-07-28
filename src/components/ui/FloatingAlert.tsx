"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell, X } from "lucide-react";

interface FloatingAlertProps {
  message: string;
  type?: "failed" | "warning" | "info" | "alarm";
  visible: boolean;
  persistent?: boolean;
  onDismiss?: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

const TYPE_STYLES = {
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-info/30 bg-info/10 text-info",
  alarm: "border-accent/30 bg-accent/10 text-accent",
};

export function FloatingAlert({ message, type = "failed", visible, persistent, onDismiss, onAction, actionLabel }: FloatingAlertProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      if (!persistent) {
        const timer = setTimeout(() => setShow(false), 8000);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [visible, persistent]);

  if (!show) return null;

  return (
    <>
      {persistent && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" />
      )}
      <div className={`fixed bottom-20 right-4 z-50 animate-in slide-in-from-right-2 md:bottom-6 ${persistent ? "left-4 md:left-auto" : ""}`}>
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${TYPE_STYLES[type]}`}>
          {type === "alarm" ? (
            <Bell className="h-4 w-4 shrink-0 animate-pulse" strokeWidth={2} />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          )}
          <span className="font-medium">{message}</span>
          {onAction && actionLabel && (
            <button
              onClick={onAction}
              className="ml-1 rounded-md bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/30"
            >
              {actionLabel}
            </button>
          )}
          {onDismiss && (
            <button onClick={() => { setShow(false); onDismiss(); }} className="ml-1 shrink-0 opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
