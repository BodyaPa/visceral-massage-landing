"use client";

import {useLocale, useTranslations} from "next-intl";
import {useMemo, useState} from "react";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {
    useConfirmPaymentMutation,
    useCreateFinanceExpenseMutation,
    useGetFinanceSummaryQuery,
    useListFinanceBookingsQuery,
    useListFinanceExpensesQuery
} from "@/features/bookings/bookings.api";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import type {BookingStatus, FinanceBooking, FinanceExpense} from "@/types/bookings";
import type {Office} from "@/types/offices";

const statuses: Array<BookingStatus | ""> = ["", "AWAITING_PAYMENT_CONFIRMATION", "CONFIRMED", "CANCELLED"];
const tabs = ["pending", "transactions", "expenses", "reports"] as const;
type FinanceTab = typeof tabs[number];

export default function FinanceBookingsManagement() {
    const t = useTranslations("admin.finance.page");
    const locale = useLocale();
    const toast = useToast();
    const [tab, setTab] = useState<FinanceTab>("pending");
    const [status, setStatus] = useState<BookingStatus | "">("");
    const [officeId, setOfficeId] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [selectedBooking, setSelectedBooking] = useState<FinanceBooking | null>(null);
    const {data: officesData} = useListPublicOfficesQuery({size: 100});
    const activeOffices = useMemo(() => officesData?.content ?? [], [officesData?.content]);
    const {data, isFetching, isError} = useListFinanceBookingsQuery({
        status: "",
        officeId: officeId ? Number(officeId) : undefined,
        from: toStartOfDayIso(from),
        to: toNextDayIso(to)
    });
    const {data: summary, isError: summaryError} = useGetFinanceSummaryQuery({
        officeId: officeId ? Number(officeId) : undefined,
        from: toStartOfDayIso(from),
        to: toNextDayIso(to),
        expenseFrom: from || undefined,
        expenseTo: to || undefined
    });
    const {data: expensesData, isFetching: expensesFetching, isError: expensesError} = useListFinanceExpensesQuery({
        officeId: officeId ? Number(officeId) : undefined,
        from: from || undefined,
        to: to || undefined
    });
    const [confirmPayment, {isLoading: isConfirming}] = useConfirmPaymentMutation();
    const allBookings = useMemo(() => data?.content ?? [], [data?.content]);
    const expenses = useMemo(() => expensesData?.content ?? [], [expensesData?.content]);
    const financeScope = allBookings;
    const bookings = financeScope.filter((booking) => {
        if (tab === "pending" && booking.status !== "AWAITING_PAYMENT_CONFIRMATION") return false;
        if (status && booking.status !== status) return false;
        return true;
    });
    const pendingCount = summary?.pendingCount ?? 0;
    const confirmedCount = summary?.confirmedCount ?? 0;
    const income = summary?.income ?? 0;
    const expenseTotal = summary?.expenses ?? 0;
    const result = summary?.result ?? 0;

    async function confirm(bookingId: number) {
        try {
            await confirmPayment(bookingId).unwrap();
            setSelectedBooking(null);
            toast.success(t("confirmed"));
        } catch {
            toast.error(t("confirmError"));
        }
    }

    return (
        <section className="min-w-0 max-w-[1180px] space-y-5">
            <header className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{t("eyebrow")}</p>
                        <h1 className="mt-2 text-2xl font-semibold text-stone-950 sm:text-3xl">{t("title")}</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{t("subtitle")}</p>
                    </div>
                    <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-4">
                        <Filter label={t("filters.status")}>
                            <select className={inputClass} onChange={(event) => setStatus(event.target.value as BookingStatus | "")} value={status}>
                                {statuses.map((item) => <option key={item || "all"} value={item}>{item ? t(`statuses.${item}`) : t("statuses.all")}</option>)}
                            </select>
                        </Filter>
                        <Filter label={t("filters.office")}>
                            <select className={inputClass} onChange={(event) => setOfficeId(event.target.value)} value={officeId}>
                                <option value="">{t("filters.allOffices")}</option>
                                {activeOffices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                        </Filter>
                        <Filter label={t("filters.from")}><input className={inputClass} onChange={(event) => setFrom(event.target.value)} type="date" value={from} /></Filter>
                        <Filter label={t("filters.to")}><input className={inputClass} onChange={(event) => setTo(event.target.value)} type="date" value={to} /></Filter>
                    </div>
                </div>
                <div className="mt-6 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    <SummaryCard label={t("summary.pending")} tone="warning" value={String(pendingCount)} />
                    <SummaryCard label={t("summary.confirmed")} tone="success" value={String(confirmedCount)} />
                    <SummaryCard label={t("summary.income")} value={formatAmount(income, locale)} />
                    <SummaryCard label={t("summary.expenses")} value={formatAmount(expenseTotal, locale)} />
                    <SummaryCard label={t("summary.result")} value={formatAmount(result, locale)} />
                </div>
            </header>

            <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 bg-stone-50 p-3" aria-label={t("tabs.label")}>
                    {tabs.map((item) => <button aria-pressed={tab === item} className={tab === item ? activeTabClass : tabClass} key={item} onClick={() => setTab(item)} type="button">{t(`tabs.${item}`)}</button>)}
                </nav>

                {isError ? <p className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("loadError")}</p> : null}
                {summaryError ? <p className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("loadError")}</p> : null}
                {tab === "pending" || tab === "transactions" ? (
                    <BookingSection bookings={bookings} confirming={isConfirming} isFetching={isFetching} locale={locale} onConfirm={confirm} onSelect={setSelectedBooking} tab={tab} t={t} />
                ) : null}
                {tab === "expenses" ? <ExpensesSection expenses={expenses} isError={expensesError} isFetching={expensesFetching} locale={locale} offices={activeOffices} t={t} /> : null}
                {tab === "reports" ? <ReportsSection expenses={expenseTotal} income={income} locale={locale} t={t} /> : null}
            </section>

            {selectedBooking ? <BookingDetails booking={selectedBooking} confirming={isConfirming} locale={locale} onClose={() => setSelectedBooking(null)} onConfirm={confirm} t={t} /> : null}
        </section>
    );
}

type T = ReturnType<typeof useTranslations<"admin.finance.page">>;
const inputClass = "h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition-colors focus:border-stone-800";
const tabClass = "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-white hover:text-stone-900";
const activeTabClass = "whitespace-nowrap rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm";

function Filter({children, label}: {children: React.ReactNode; label: string}) {
    return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</span>{children}</label>;
}

function SummaryCard({label, muted = false, tone = "neutral", value}: {label: string; muted?: boolean; tone?: "neutral" | "success" | "warning"; value: string}) {
    const valueClass = muted ? "text-stone-400" : tone === "success" ? "text-emerald-800" : tone === "warning" ? "text-amber-800" : "text-stone-950";
    return <div className="flex min-h-24 flex-col justify-center rounded-xl border border-stone-200 bg-stone-50 px-4 py-4"><p className={`text-xl font-semibold ${valueClass}`}>{value}</p><p className="mt-2 text-xs font-medium text-stone-500">{label}</p></div>;
}

function BookingSection({bookings, confirming, isFetching, locale, onConfirm, onSelect, tab, t}: {bookings: FinanceBooking[]; confirming: boolean; isFetching: boolean; locale: string; onConfirm: (id: number) => void; onSelect: (booking: FinanceBooking) => void; tab: "pending" | "transactions"; t: T}) {
    return (
        <div className="p-4 sm:p-5">
            <div className="mb-4"><h2 className="text-base font-semibold text-stone-950">{t(`${tab}.title`)}</h2><p className="mt-1 text-sm text-stone-500">{t(`${tab}.subtitle`)}</p></div>
            {isFetching ? <p className="py-8 text-center text-sm text-stone-500">{t("loading")}</p> : null}
            {!isFetching && bookings.length === 0 ? <EmptyState body={t(`${tab}.empty`)} title={t(`${tab}.emptyTitle`)} /> : null}
            <div className="space-y-2 lg:hidden">
                {bookings.map((booking) => <BookingCard booking={booking} confirming={confirming} key={booking.id} locale={locale} onConfirm={onConfirm} onSelect={onSelect} t={t} />)}
            </div>
            {bookings.length > 0 ? (
                <div className="hidden overflow-hidden rounded-lg border border-stone-200 lg:block">
                    <table className="w-full border-collapse bg-white text-left text-sm">
                        <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-3 py-2 font-semibold">{t("table.client")}</th><th className="px-3 py-2 font-semibold">{t("table.service")}</th><th className="px-3 py-2 font-semibold">{t("table.specialist")}</th><th className="px-3 py-2 font-semibold">{t("table.when")}</th><th className="px-3 py-2 font-semibold">{t("table.office")}</th><th className="px-3 py-2 text-right font-semibold">{t("table.amount")}</th><th className="px-3 py-2 font-semibold">{t("table.status")}</th><th className="px-3 py-2 font-semibold">{t("table.action")}</th></tr></thead>
                        <tbody>{bookings.map((booking) => <BookingRow booking={booking} confirming={confirming} key={booking.id} locale={locale} onConfirm={onConfirm} onSelect={onSelect} t={t} />)}</tbody>
                    </table>
                </div>
            ) : null}
        </div>
    );
}

function BookingRow({booking, confirming, locale, onConfirm, onSelect, t}: {booking: FinanceBooking; confirming: boolean; locale: string; onConfirm: (id: number) => void; onSelect: (booking: FinanceBooking) => void; t: T}) {
    return <tr className="border-t border-stone-100 align-top transition-colors hover:bg-stone-50"><td className="px-3 py-3"><button className="text-left font-medium text-stone-950 hover:underline" onClick={() => onSelect(booking)} type="button">{booking.clientName}</button><p className="mt-1 text-xs text-stone-500">{booking.clientContact ?? t("unknownContact")}</p></td><td className="px-3 py-3 text-stone-700">{booking.serviceTitleUa}</td><td className="px-3 py-3 text-stone-700">{booking.specialistName}</td><td className="px-3 py-3 text-stone-700">{formatDateTime(booking.startsAt, locale)}</td><td className="px-3 py-3 text-stone-700">{booking.officeName ?? t("withoutOffice")}</td><td className="px-3 py-3 text-right font-medium text-stone-950">{formatAmount(booking.bookedPrice, locale)}</td><td className="px-3 py-3"><StatusBadge status={booking.status} t={t} /></td><td className="px-3 py-3"><ActionButton booking={booking} confirming={confirming} onConfirm={onConfirm} t={t} /></td></tr>;
}

function BookingCard({booking, confirming, locale, onConfirm, onSelect, t}: {booking: FinanceBooking; confirming: boolean; locale: string; onConfirm: (id: number) => void; onSelect: (booking: FinanceBooking) => void; t: T}) {
    return <article className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><button className="text-left font-semibold text-stone-950 hover:underline" onClick={() => onSelect(booking)} type="button">{booking.clientName}</button><p className="mt-1 text-xs text-stone-500">{booking.serviceTitleUa} · {booking.specialistName}</p></div><StatusBadge status={booking.status} t={t} /></div><div className="mt-3 grid grid-cols-2 gap-3 border-t border-stone-100 pt-3 text-xs text-stone-500"><span>{formatDateTime(booking.startsAt, locale)}</span><span className="text-right">{booking.officeName ?? t("withoutOffice")}</span><strong className="text-sm text-stone-950">{formatAmount(booking.bookedPrice, locale)}</strong><div className="text-right"><ActionButton booking={booking} confirming={confirming} onConfirm={onConfirm} t={t} /></div></div></article>;
}

function ActionButton({booking, confirming, onConfirm, t}: {booking: FinanceBooking; confirming: boolean; onConfirm: (id: number) => void; t: T}) {
    if (booking.status !== "AWAITING_PAYMENT_CONFIRMATION") return <span className="text-xs text-stone-400">—</span>;
    return <button className="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-700 disabled:bg-stone-300" disabled={confirming} onClick={() => onConfirm(booking.id)} type="button">{confirming ? t("confirming") : t("confirm")}</button>;
}

function StatusBadge({status, t}: {status: BookingStatus; t: T}) {
    const tone = status === "CONFIRMED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "AWAITING_PAYMENT_CONFIRMATION" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-stone-200 bg-stone-100 text-stone-600";
    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{t(`statuses.${status}`)}</span>;
}

function ExpensesSection({expenses, isError, isFetching, locale, offices, t}: {expenses: FinanceExpense[]; isError: boolean; isFetching: boolean; locale: string; offices: Office[]; t: T}) {
    return <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]"><div><h2 className="text-base font-semibold text-stone-950">{t("expenses.title")}</h2><p className="mt-1 text-sm text-stone-500">{t("expenses.subtitle")}</p>{isFetching ? <p className="py-8 text-center text-sm text-stone-500">{t("expenses.loading")}</p> : null}{isError ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("expenses.loadError")}</p> : null}{!isFetching && !isError && expenses.length === 0 ? <div className="mt-4"><EmptyState body={t("expenses.empty")} title={t("expenses.emptyTitle")} /></div> : null}{expenses.length > 0 ? <div className="mt-4 space-y-2">{expenses.map((expense) => <ExpenseRow expense={expense} key={expense.id} locale={locale} t={t} />)}</div> : null}</div><ExpenseForm offices={offices} t={t} /></div>;
}

function ExpenseRow({expense, locale, t}: {expense: FinanceExpense; locale: string; t: T}) {
    return <article className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-stone-950">{expense.category}</strong><span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">{expense.officeName ?? t("withoutOffice")}</span></div><p className="mt-2 text-sm text-stone-600">{expense.description}</p><p className="mt-2 text-xs text-stone-500">{formatDate(expense.expenseDate, locale)}</p></div><strong className="shrink-0 text-sm text-stone-950">{formatAmount(expense.amount, locale)}</strong></article>;
}

function ExpenseForm({offices, t}: {offices: Office[]; t: T}) {
    const toast = useToast();
    const [createExpense, {isLoading}] = useCreateFinanceExpenseMutation();
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [officeId, setOfficeId] = useState("");

    async function submit() {
        try {
            await createExpense({amount: Number(amount), category, description, expenseDate, officeId: officeId ? Number(officeId) : null}).unwrap();
            setAmount("");
            setCategory("");
            setDescription("");
            toast.success(t("expenses.created"));
        } catch {
            toast.error(t("expenses.createError"));
        }
    }

    const disabled = isLoading || !amount || Number(amount) <= 0 || !category.trim() || !description.trim() || !expenseDate;
    return <aside className="rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs leading-5 text-stone-500">{t("expenses.hint")}</p><div className="mt-4 space-y-3"><Filter label={t("expenses.amount")}><input className={inputClass} min="0.01" onChange={(event) => setAmount(event.target.value)} step="0.01" type="number" value={amount} /></Filter><Filter label={t("expenses.category")}><input className={inputClass} maxLength={80} onChange={(event) => setCategory(event.target.value)} value={category} /></Filter><Filter label={t("expenses.description")}><textarea className="min-h-20 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-800" maxLength={500} onChange={(event) => setDescription(event.target.value)} value={description} /></Filter><Filter label={t("expenses.date")}><input className={inputClass} onChange={(event) => setExpenseDate(event.target.value)} type="date" value={expenseDate} /></Filter><Filter label={t("expenses.office")}><select className={inputClass} onChange={(event) => setOfficeId(event.target.value)} value={officeId}><option value="">{t("withoutOffice")}</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}</select></Filter><button className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={disabled} onClick={submit} type="button">{isLoading ? t("expenses.saving") : t("expenses.action")}</button></div></aside>;
}

function ReportsSection({expenses, income, locale, t}: {expenses: number; income: number; locale: string; t: T}) {
    return <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]"><div><h2 className="text-base font-semibold text-stone-950">{t("reports.title")}</h2><p className="mt-1 text-sm text-stone-500">{t("reports.subtitle")}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><SummaryCard label={t("reports.income")} value={formatAmount(income, locale)} /><SummaryCard label={t("reports.expenses")} value={formatAmount(expenses, locale)} /><SummaryCard label={t("reports.taxable")} value={formatAmount(Math.max(income - expenses, 0), locale)} /><SummaryCard label={t("reports.estimatedTax")} muted value={formatAmount(0, locale)} /></div></div><div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><h3 className="text-sm font-semibold text-stone-900">{t("reports.exportTitle")}</h3><p className="mt-1 text-xs leading-5 text-stone-500">{t("reports.exportHint")}</p><div className="mt-4 grid gap-2"><button className={disabledButtonClass} disabled title={t("reports.disabledHint")} type="button">{t("reports.pdf")}</button><button className={disabledButtonClass} disabled title={t("reports.disabledHint")} type="button">{t("reports.excel")}</button></div></div></div>;
}

const disabledButtonClass = "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-400 disabled:cursor-not-allowed";

function EmptyState({body, title}: {body: string; title: string}) {
    return <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-6 text-center"><div><h3 className="text-sm font-semibold text-stone-900">{title}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-500">{body}</p></div></div>;
}

function BookingDetails({booking, confirming, locale, onClose, onConfirm, t}: {booking: FinanceBooking; confirming: boolean; locale: string; onClose: () => void; onConfirm: (id: number) => void; t: T}) {
    return <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/30" onClick={onClose} role="presentation"><aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("details.eyebrow")}</p><h2 className="mt-1 text-xl font-semibold text-stone-950">{booking.clientName}</h2></div><button aria-label={t("details.close")} className="rounded-lg border border-stone-200 px-3 py-2 text-stone-600 hover:bg-stone-100" onClick={onClose} type="button">×</button></div><dl className="mt-5 space-y-4"><Detail label={t("table.service")} value={booking.serviceTitleUa} /><Detail label={t("table.specialist")} value={booking.specialistName} /><Detail label={t("table.office")} value={booking.officeName ?? t("withoutOffice")} /><Detail label={t("table.when")} value={formatDateTime(booking.startsAt, locale)} /><Detail label={t("table.amount")} value={formatAmount(booking.bookedPrice, locale)} /><div><dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{t("table.status")}</dt><dd className="mt-1"><StatusBadge status={booking.status} t={t} /></dd></div></dl><div className="mt-6"><ActionButton booking={booking} confirming={confirming} onConfirm={onConfirm} t={t} /></div></aside></div>;
}

function Detail({label, value}: {label: string; value: string}) {
    return <div><dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 text-sm text-stone-900">{value}</dd></div>;
}

function formatDateTime(value: string, locale: string) {
    return new Intl.DateTimeFormat(locale === "ua" ? "uk" : locale, {dateStyle: "medium", timeStyle: "short"}).format(new Date(value));
}

function formatDate(value: string, locale: string) {
    return new Intl.DateTimeFormat(locale === "ua" ? "uk" : locale, {dateStyle: "medium"}).format(new Date(`${value}T00:00:00`));
}

function formatAmount(value: number, locale: string) {
    return new Intl.NumberFormat(locale === "ua" ? "uk-UA" : "en-US", {currency: "UAH", style: "currency"}).format(value);
}

function toStartOfDayIso(value: string) {
    return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

function toNextDayIso(value: string) {
    if (!value) return undefined;
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + 1);
    return date.toISOString();
}
