interface PageHeaderProps {
  title: string;
  description?: string;
  date?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, date, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-slate-100">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
            {date && (
              <p className="mt-1 text-xs font-medium text-brand-600 dark:text-brand-400">
                Operational Date: {date}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
