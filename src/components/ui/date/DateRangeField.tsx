"use client";

type DateRangeFieldProps = {
    className?: string;
    from: string;
    fromLabel: string;
    label: string;
    onChange: (range: {from: string; to: string}) => void;
    to: string;
    toLabel: string;
};

const inputClass = "h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition-colors focus:border-stone-800";

export default function DateRangeField({className, from, fromLabel, label, onChange, to, toLabel}: DateRangeFieldProps) {
    return (
        <fieldset className={className}>
            <legend className="mb-1.5 block break-words text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</legend>
            <div className="grid min-w-0 grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 sm:grid-cols-2">
                <label className="min-w-0">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-stone-500">{fromLabel}</span>
                    <input className={inputClass} onChange={(event) => onChange({from: event.target.value, to})} type="date" value={from} />
                </label>
                <label className="min-w-0">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-stone-500">{toLabel}</span>
                    <input className={inputClass} min={from || undefined} onChange={(event) => onChange({from, to: event.target.value})} type="date" value={to} />
                </label>
            </div>
        </fieldset>
    );
}
