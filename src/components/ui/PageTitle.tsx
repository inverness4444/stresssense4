type Props = { title: string; subtitle?: string; actions?: React.ReactNode };

export function PageTitle({ title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
