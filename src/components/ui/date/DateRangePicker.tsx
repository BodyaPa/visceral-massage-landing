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
    const languageTag = locale === "ua" ? "uk-UA" : "en-GB";
    const displayFrom = selected.from?.toLocaleDateString(languageTag);
    const displayTo = selected.to?.toLocaleDateString(languageTag);
    return <Popover label={label} trigger={({open, toggle}) => <Button aria-expanded={open} aria-haspopup="dialog" onClick={toggle} variant="secondary">{displayFrom ? `${displayFrom}${displayTo ? ` — ${displayTo}` : ""}` : placeholder}</Button>}>{(close) => <DayPicker locale={locale === "ua" ? uk : enUS} mode="range" month={month} onMonthChange={setMonth} onSelect={(range) => {onChange({from: formatDate(range?.from), to: formatDate(range?.to)});if(range?.from && range.to) close();}} selected={selected} />}</Popover>;
}
