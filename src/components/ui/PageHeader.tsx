import { CalendarDays } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  date?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, date, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-border bg-white dark:border-border-dark dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">{title}</h1>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
            {date && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-3 py-1 text-xs font-medium text-brand-600 dark:border-border-dark dark:bg-slate-800/50 dark:text-brand-400">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.5} />
                {date}
              </div>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
