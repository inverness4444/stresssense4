type Props = { title: string; subtitle?: string; actions?: React.ReactNode };

export function SectionHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
