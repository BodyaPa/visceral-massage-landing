"use client";

import {useLocale} from "next-intl";
import type {Locale} from "@/i18n";
import DateRangePicker from "./DateRangePicker";

type DateRangeFieldProps = {
    className?: string;
    from: string;
    fromLabel: string;
    label: string;
    onChange: (range: {from: string; to: string}) => void;
    to: string;
    toLabel: string;
};

export default function DateRangeField({className, from, fromLabel, label, onChange, to, toLabel}: DateRangeFieldProps) {
    const locale = useLocale() as Locale;
    return (
        <fieldset className={className}>
            <legend className="mb-1.5 block break-words text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</legend>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-2">
                <DateRangePicker from={from} label={label} locale={locale} onChange={onChange} placeholder={`${fromLabel} — ${toLabel}`} to={to} />
            </div>
        </fieldset>
    );
}
