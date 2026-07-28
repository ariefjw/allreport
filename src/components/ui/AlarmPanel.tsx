"use client";

import { useState } from "react";
import { X, Plus, Trash2, Bell, BellOff } from "lucide-react";
import { useAlarmContext } from "@/components/providers/AlarmProvider";
import type { AlarmSchedule } from "@/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysBitmask(labels: string[]): number {
  let mask = 0;
  for (const label of labels) {
    const idx = DAY_LABELS.indexOf(label);
    if (idx >= 0) mask |= 1 << idx;
  }
  return mask;
}

function bitmaskToDays(mask: number): string[] {
  return DAY_LABELS.filter((_, i) => mask & (1 << i));
}

interface AlarmPanelProps {
  onClose: () => void;
}

export function AlarmPanel({ onClose }: AlarmPanelProps) {
  const { alarms, create, update, remove, loading, masterEnabled, setMasterEnabled } = useAlarmContext();
  const [showForm, setShowForm] = useState(false);
  const [time, setTime] = useState("08:00");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);

  const handleAdd = async () => {
    if (!time) return;
    try {
      await create({
        alarmTime: `${time}:00`,
        label: label || undefined,
        daysOfWeek: daysBitmask(days),
      });
      setShowForm(false);
      setLabel("");
    } catch (err) {
      console.error("Failed to create alarm:", err);
    }
  };

  const handleToggle = async (alarm: AlarmSchedule) => {
    await update(alarm.id, { enabled: !alarm.enabled });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this alarm?")) return;
    await remove(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[65vh] w-full flex-col rounded-2xl bg-surface sm:max-h-[75vh] sm:mx-4 sm:max-w-md">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Alarm Schedule</h2>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
              <div
                onClick={() => setMasterEnabled(!masterEnabled)}
                className={`relative h-4 w-7 rounded-full transition-colors ${
                  masterEnabled ? "bg-accent" : "bg-hairline-strong"
                }`}
              >
                <div
                  className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                    masterEnabled ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </div>
              {masterEnabled ? "Active" : "Disabled"}
            </label>
            <button onClick={onClose} className="btn-ghost p-1">
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-8 text-center text-xs text-muted">Loading alarms...</p>
          ) : alarms.length === 0 && !showForm ? (
            <p className="py-8 text-center text-xs text-muted">No alarms yet.</p>
          ) : (
            <div className="space-y-2">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                    alarm.enabled ? "border-hairline-strong bg-surface-elevated" : "border-hairline bg-surface opacity-50"
                  }`}
                >
                  <button onClick={() => handleToggle(alarm)} className="shrink-0 text-muted hover:text-ink">
                    {alarm.enabled ? <Bell className="h-4 w-4 text-accent" strokeWidth={1.5} /> : <BellOff className="h-4 w-4" strokeWidth={1.5} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-sm font-semibold tabular-nums text-ink">{alarm.alarmTime.slice(0, 5)}</span>
                      {alarm.label && <span className="truncate text-xs text-muted">{alarm.label}</span>}
                    </div>
                    <div className="mt-0.5 flex gap-1">
                      {bitmaskToDays(alarm.daysOfWeek).map((d) => (
                        <span key={d} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(alarm.id)} className="shrink-0 text-muted hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showForm && (
            <div className="mt-4 space-y-3 rounded-lg border border-hairline-strong bg-surface-elevated p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="input w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Label (optional)</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Check report"
                  className="input w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        days.includes(d) ? "bg-accent text-white" : "bg-surface text-muted ring-1 ring-hairline-strong hover:text-ink"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={handleAdd} className="btn-primary flex-1">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {!showForm && (
          <div className="border-t border-hairline px-5 py-3">
            <button onClick={() => setShowForm(true)} className="btn-primary w-full gap-2">
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Add Alarm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
