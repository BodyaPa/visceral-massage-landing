"use client";

import {useState} from "react";
import {DayPicker} from "react-day-picker";
import {enUS, uk} from "date-fns/locale";
import type {Locale} from "@/i18n";
import Button from "@/components/ui/button/Button";
import Popover from "@/components/ui/overlay/Popover";
import {formatDate, parseDate} from "./dateValue";

export default function DatePicker({value, onChange, label, placeholder, locale, disabled}: {value: string; onChange: (value: string) => void; label: string; placeholder: string; locale: Locale; disabled?: boolean}) {
    const [month, setMonth] = useState(parseDate(value) ?? new Date());
    return <Popover label={label} trigger={({open, toggle}) => <Button aria-expanded={open} disabled={disabled} onClick={toggle} variant="secondary">{value || placeholder}</Button>}><DayPicker captionLayout="dropdown" locale={locale === "ua" ? uk : enUS} mode="single" month={month} onMonthChange={setMonth} onSelect={(date) => onChange(formatDate(date))} selected={parseDate(value)} /></Popover>;
}
