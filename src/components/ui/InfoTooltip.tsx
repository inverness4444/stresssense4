type Props = { text: string };

export function InfoTooltip({ text }: Props) {
  return (
    <span className="group relative inline-flex cursor-help items-center">
      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
        i
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-52 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}
