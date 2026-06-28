import {API_URL} from "@/shared/constants/env";
import {formatCurrencyAmount, formatPercentAmount} from "@/shared/lib/i18n/formatNumbers";
import {toLanguageTag} from "@/shared/lib/i18n/toLanguageTag";
import type {BookingStatus} from "@/types/bookings";

type FinanceExportFilters = {
    from: string;
    locale: string;
    officeId: string;
    status: BookingStatus | "";
    to: string;
};

export function formatDateTime(value: string, locale: string) {
    return new Intl.DateTimeFormat(toLanguageTag(locale), {dateStyle: "medium", timeStyle: "short"}).format(new Date(value));
}

export function formatDate(value: string, locale: string) {
    return new Intl.DateTimeFormat(toLanguageTag(locale), {dateStyle: "medium"}).format(new Date(`${value}T00:00:00`));
}

export function formatAmount(value: number, locale: string) {
    return formatCurrencyAmount(value, locale);
}

export function formatPercent(value: number, locale: string) {
    return formatPercentAmount(value, locale);
}

export function financeExportUrl(format: "pdf" | "xlsx", {from, locale, officeId, status, to}: FinanceExportFilters) {
    const params = new URLSearchParams();
    params.set("locale", locale === "en" ? "en" : "ua");
    if (status) params.set("status", status);
    if (officeId) params.set("officeId", officeId);
    if (from) params.set("from", toStartOfDayIso(from) ?? "");
    if (to) params.set("to", toNextDayIso(to) ?? "");
    return `${API_URL}/api/admin/finance/export/${format}?${params.toString()}`;
}

export function toStartOfDayIso(value: string) {
    return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

export function toNextDayIso(value: string) {
    if (!value) return undefined;
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + 1);
    return date.toISOString();
}
