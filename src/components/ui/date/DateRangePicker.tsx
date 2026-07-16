"use client";

import {useState} from "react";
import {DayPicker, type DateRange} from "react-day-picker";
import {enUS, uk} from "date-fns/locale";
import type {Locale} from "@/i18n";
import Button from "@/components/ui/button/Button";
import Popover from "@/components/ui/overlay/Popover";
import {formatDate, parseDate} from "./dateValue";

export default function DateRangePicker({from, to, onChange, label, placeholder, locale}: {from: string; to: string; onChange: (range: {from: string; to: string}) => void; label: string; placeholder: string; locale: Locale}) {
    const selected: DateRange = {from: parseDate(from), to: parseDate(to)};
    const [month, setMonth] = useState(selected.from ?? new Date());
    return <Popover label={label} trigger={({open, toggle}) => <Button aria-expanded={open} onClick={toggle} variant="secondary">{from ? `${from}${to ? ` — ${to}` : ""}` : placeholder}</Button>}><DayPicker locale={locale === "ua" ? uk : enUS} mode="range" month={month} onMonthChange={setMonth} onSelect={(range) => onChange({from: formatDate(range?.from), to: formatDate(range?.to)})} selected={selected} /></Popover>;
}
