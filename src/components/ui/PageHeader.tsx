import { CalendarDays } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  date?: string;
  actions?: React.ReactNode;
  mobileActions?: React.ReactNode;
  glow?: "amber" | "blue" | "red";
}

const GLOW_MAP = {
  amber: "bg-[radial-gradient(ellipse_80%_40%_at_50%_-20%,var(--color-glow-amber),transparent)]",
  blue: "bg-[radial-gradient(ellipse_80%_40%_at_50%_-20%,var(--color-glow-blue),transparent)]",
  red: "bg-[radial-gradient(ellipse_80%_40%_at_50%_-20%,var(--color-glow-red),transparent)]",
};

export function PageHeader({ title, description, date, actions, mobileActions, glow }: PageHeaderProps) {
  return (
    <>
      <div className={`border-b border-hairline ${glow ? GLOW_MAP[glow] : ""}`}>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-muted">{description}</p>
              )}
              {date && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-hairline-strong bg-surface-elevated px-3 py-1 text-xs font-medium text-muted">
                  <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {date}
                </div>
              )}
            </div>
            {actions && <div className="hidden shrink-0 flex-wrap items-center gap-2 md:flex">{actions}</div>}
          </div>
        </div>
      </div>
      {mobileActions && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-hairline bg-canvas/90 backdrop-blur-lg safe-bottom md:hidden">
          <div className="grid grid-cols-2 gap-1.5 px-3 py-2.5 [&>*:last-child]:col-span-2 [&>*]:w-full">
            {mobileActions}
          </div>
        </div>
      )}
    </>
  );
}
