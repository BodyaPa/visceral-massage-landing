"use client";

import {useLocale, useTranslations} from "next-intl";
import {useEffect, useMemo, useState} from "react";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {bookingServiceTitle} from "@/features/bookings/bookingTitles";
import {
    useConfirmPaymentMutation,
    useCreateFinanceExpenseMutation,
    useGetFinanceSettingsQuery,
    useGetFinanceSummaryQuery,
    useListFinanceBookingsQuery,
    useListFinanceExpensesQuery,
    useListSpecialistFinanceSettingsQuery,
    useMarkSpecialistPayoutPaidMutation,
    useUpdateFinanceSettingsMutation,
    useUpdateSpecialistFinanceSettingsMutation
} from "@/features/bookings/bookings.api";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {API_URL} from "@/shared/constants/env";
import type {BookingStatus, FinanceBooking, FinanceExpense, FinanceSpecialistSettings} from "@/types/bookings";
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
    const [bookingToConfirm, setBookingToConfirm] = useState<FinanceBooking | null>(null);
    const {data: officesData} = useListPublicOfficesQuery({size: 100});
    const activeOffices = useMemo(() => officesData?.content ?? [], [officesData?.content]);
    const bookingStatusFilter = tab === "pending" ? "AWAITING_PAYMENT_CONFIRMATION" : status;
    const {data, isFetching, isError} = useListFinanceBookingsQuery({
        status: bookingStatusFilter,
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
    const [markPayoutPaid, {isLoading: isMarkingPayout}] = useMarkSpecialistPayoutPaidMutation();
    const allBookings = useMemo(() => data?.content ?? [], [data?.content]);
    const expenses = useMemo(() => expensesData?.content ?? [], [expensesData?.content]);
    const bookings = allBookings;
    const pendingCount = summary?.pendingCount ?? 0;
    const confirmedCount = summary?.confirmedCount ?? 0;
    const income = summary?.income ?? 0;
    const specialistEarnings = summary?.specialistEarnings ?? 0;
    const businessIncome = summary?.businessIncome ?? income;
    const expenseTotal = summary?.expenses ?? 0;
    const taxableIncome = summary?.taxableIncome ?? Math.max(businessIncome - expenseTotal, 0);
    const estimatedTax = summary?.estimatedTax ?? 0;
    const quarterlyTaxPercent = summary?.quarterlyTaxPercent ?? 0;
    const result = summary?.result ?? 0;

    async function confirm(bookingId: number) {
        try {
            await confirmPayment(bookingId).unwrap();
            setSelectedBooking(null);
            setBookingToConfirm(null);
            toast.success(t("confirmed"));
        } catch {
            toast.error(t("confirmError"));
        }
    }

    function requestConfirm(booking: FinanceBooking) {
        setBookingToConfirm(booking);
    }

    async function markPayout(bookingId: number) {
        try {
            await markPayoutPaid(bookingId).unwrap();
            setSelectedBooking(null);
            toast.success(t("payout.markedPaid"));
        } catch {
            toast.error(t("payout.markError"));
        }
    }

    return (
        <section className="w-full min-w-0 max-w-[1180px] space-y-5 overflow-x-clip">
            <header className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{t("eyebrow")}</p>
                        <h1 className="mt-2 break-words text-2xl font-semibold text-stone-950 sm:text-3xl">{t("title")}</h1>
                        <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-stone-600">{t("subtitle")}</p>
                    </div>
                    <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-4">
                        <Filter label={t("filters.status")}>
                            <select className={inputClass} disabled={tab === "pending"} onChange={(event) => setStatus(event.target.value as BookingStatus | "")} value={bookingStatusFilter}>
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
                <div className="mt-6 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <SummaryCard label={t("summary.pending")} tone="warning" value={String(pendingCount)} />
                    <SummaryCard label={t("summary.confirmed")} tone="success" value={String(confirmedCount)} />
                    <SummaryCard label={t("summary.income")} value={formatAmount(income, locale)} />
                    <SummaryCard label={t("summary.specialistEarnings")} value={formatAmount(specialistEarnings, locale)} />
                    <SummaryCard label={t("summary.businessIncome")} value={formatAmount(businessIncome, locale)} />
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
                    <BookingSection bookings={bookings} confirming={isConfirming} isFetching={isFetching} locale={locale} markingPayout={isMarkingPayout} onConfirm={requestConfirm} onMarkPayout={markPayout} onSelect={setSelectedBooking} tab={tab} t={t} />
                ) : null}
                {tab === "expenses" ? <ExpensesSection expenses={expenses} isError={expensesError} isFetching={expensesFetching} locale={locale} offices={activeOffices} t={t} /> : null}
                {tab === "reports" ? <ReportsSection businessIncome={businessIncome} estimatedTax={estimatedTax} expenses={expenseTotal} income={income} locale={locale} officeId={officeId} quarterlyTaxPercent={quarterlyTaxPercent} specialistEarnings={specialistEarnings} status={status} taxableIncome={taxableIncome} t={t} to={to} from={from} /> : null}
            </section>

            {selectedBooking ? <BookingDetails booking={selectedBooking} confirming={isConfirming} locale={locale} markingPayout={isMarkingPayout} onClose={() => setSelectedBooking(null)} onConfirm={requestConfirm} onMarkPayout={markPayout} t={t} /> : null}
            {bookingToConfirm ? <PaymentReviewModal booking={bookingToConfirm} confirming={isConfirming} locale={locale} onClose={() => setBookingToConfirm(null)} onConfirm={confirm} t={t} /> : null}
        </section>
    );
}

type T = ReturnType<typeof useTranslations<"admin.finance.page">>;
const inputClass = "h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none transition-colors focus:border-stone-800";
const tabClass = "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-white hover:text-stone-900";
const activeTabClass = "whitespace-nowrap rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm";

function Filter({children, label}: {children: React.ReactNode; label: string}) {
    return <label className="block min-w-0"><span className="mb-1.5 block break-words text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</span>{children}</label>;
}

function SummaryCard({label, muted = false, tone = "neutral", value}: {label: string; muted?: boolean; tone?: "neutral" | "success" | "warning"; value: string}) {
    const valueClass = muted ? "text-stone-400" : tone === "success" ? "text-emerald-800" : tone === "warning" ? "text-amber-800" : "text-stone-950";
    return <div className="flex min-h-24 min-w-0 flex-col justify-center rounded-xl border border-stone-200 bg-stone-50 px-4 py-4"><p className={`break-words text-xl font-semibold ${valueClass}`}>{value}</p><p className="mt-2 break-words text-xs font-medium text-stone-500">{label}</p></div>;
}

function BookingSection({bookings, confirming, isFetching, locale, markingPayout, onConfirm, onMarkPayout, onSelect, tab, t}: {bookings: FinanceBooking[]; confirming: boolean; isFetching: boolean; locale: string; markingPayout: boolean; onConfirm: (booking: FinanceBooking) => void; onMarkPayout: (id: number) => void; onSelect: (booking: FinanceBooking) => void; tab: "pending" | "transactions"; t: T}) {
    return (
        <div className="p-4 sm:p-5">
            <div className="mb-4"><h2 className="text-base font-semibold text-stone-950">{t(`${tab}.title`)}</h2><p className="mt-1 text-sm text-stone-500">{t(`${tab}.subtitle`)}</p></div>
            {isFetching ? <p className="py-8 text-center text-sm text-stone-500">{t("loading")}</p> : null}
            {!isFetching && bookings.length === 0 ? <EmptyState body={t(`${tab}.empty`)} title={t(`${tab}.emptyTitle`)} /> : null}
            <div className="space-y-2 lg:hidden">
                {bookings.map((booking) => <BookingCard booking={booking} confirming={confirming} key={booking.id} locale={locale} markingPayout={markingPayout} onConfirm={onConfirm} onMarkPayout={onMarkPayout} onSelect={onSelect} t={t} />)}
            </div>
            {bookings.length > 0 ? (
                <div className="hidden overflow-x-auto rounded-lg border border-stone-200 lg:block">
                    <table className="w-full border-collapse bg-white text-left text-sm">
                        <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-3 py-2 font-semibold">{t("table.client")}</th><th className="px-3 py-2 font-semibold">{t("table.service")}</th><th className="px-3 py-2 font-semibold">{t("table.specialist")}</th><th className="px-3 py-2 font-semibold">{t("table.when")}</th><th className="px-3 py-2 font-semibold">{t("table.office")}</th><th className="px-3 py-2 text-right font-semibold">{t("table.amount")}</th><th className="px-3 py-2 font-semibold">{t("table.status")}</th><th className="px-3 py-2 font-semibold">{t("table.action")}</th></tr></thead>
                        <tbody>{bookings.map((booking) => <BookingRow booking={booking} confirming={confirming} key={booking.id} locale={locale} markingPayout={markingPayout} onConfirm={onConfirm} onMarkPayout={onMarkPayout} onSelect={onSelect} t={t} />)}</tbody>
                    </table>
                </div>
            ) : null}
        </div>
    );
}

function BookingRow({booking, confirming, locale, markingPayout, onConfirm, onMarkPayout, onSelect, t}: {booking: FinanceBooking; confirming: boolean; locale: string; markingPayout: boolean; onConfirm: (booking: FinanceBooking) => void; onMarkPayout: (id: number) => void; onSelect: (booking: FinanceBooking) => void; t: T}) {
    return <tr className="border-t border-stone-100 align-top transition-colors hover:bg-stone-50"><td className="px-3 py-3"><button className="text-left font-medium text-stone-950 hover:underline" onClick={() => onSelect(booking)} type="button">{booking.clientName}</button><p className="mt-1 text-xs text-stone-500">{booking.clientContact ?? t("unknownContact")}</p></td><td className="px-3 py-3 text-stone-700">{bookingServiceTitle(booking, locale)}</td><td className="px-3 py-3 text-stone-700">{booking.specialistName}</td><td className="px-3 py-3 text-stone-700">{formatDateTime(booking.startsAt, locale)}</td><td className="px-3 py-3 text-stone-700">{booking.officeName ?? t("withoutOffice")}</td><td className="px-3 py-3 text-right"><MoneyBreakdown booking={booking} locale={locale} t={t} /></td><td className="px-3 py-3"><div className="space-y-1"><StatusBadge status={booking.status} t={t} /><PayoutBadge booking={booking} t={t} /></div></td><td className="px-3 py-3"><FinanceAction booking={booking} confirming={confirming} markingPayout={markingPayout} onConfirm={onConfirm} onMarkPayout={onMarkPayout} t={t} /></td></tr>;
}

function BookingCard({booking, confirming, locale, markingPayout, onConfirm, onMarkPayout, onSelect, t}: {booking: FinanceBooking; confirming: boolean; locale: string; markingPayout: boolean; onConfirm: (booking: FinanceBooking) => void; onMarkPayout: (id: number) => void; onSelect: (booking: FinanceBooking) => void; t: T}) {
    return <article className="max-w-full rounded-xl border border-stone-200 bg-white p-4"><div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><button className="break-words text-left font-semibold text-stone-950 hover:underline" onClick={() => onSelect(booking)} type="button">{booking.clientName}</button><p className="mt-1 break-words text-xs text-stone-500">{bookingServiceTitle(booking, locale)} · {booking.specialistName}</p></div><div className="space-y-1"><StatusBadge status={booking.status} t={t} /><PayoutBadge booking={booking} t={t} /></div></div><div className="mt-3 grid min-w-0 grid-cols-1 gap-3 border-t border-stone-100 pt-3 text-xs text-stone-500 sm:grid-cols-2"><span className="break-words">{formatDateTime(booking.startsAt, locale)}</span><span className="break-words sm:text-right">{booking.officeName ?? t("withoutOffice")}</span><MoneyBreakdown booking={booking} locale={locale} t={t} /><div className="sm:text-right"><FinanceAction booking={booking} confirming={confirming} markingPayout={markingPayout} onConfirm={onConfirm} onMarkPayout={onMarkPayout} t={t} /></div></div></article>;
}

function MoneyBreakdown({booking, locale, t}: {booking: FinanceBooking; locale: string; t: T}) {
    return <div className="min-w-0"><strong className="break-words text-sm text-stone-950">{formatAmount(booking.bookedPrice, locale)}</strong><p className="mt-1 break-words text-xs text-stone-500">{t("table.businessShare")}: {formatAmount(booking.businessShare, locale)}</p><p className="mt-0.5 break-words text-xs text-stone-500">{t("table.specialistShare")}: {formatAmount(booking.specialistShare, locale)} · {formatPercent(booking.specialistSharePercent, locale)}</p></div>;
}

function PayoutBadge({booking, t}: {booking: FinanceBooking; t: T}) {
    if (booking.status !== "CONFIRMED") return null;
    const tone = booking.specialistPayoutStatus === "PAID" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800";
    return <span className={`inline-flex max-w-full break-words rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{t(`payout.statuses.${booking.specialistPayoutStatus}`)}</span>;
}

function FinanceAction({booking, confirming, markingPayout, onConfirm, onMarkPayout, t}: {booking: FinanceBooking; confirming: boolean; markingPayout: boolean; onConfirm: (booking: FinanceBooking) => void; onMarkPayout: (id: number) => void; t: T}) {
    if (booking.status === "AWAITING_PAYMENT_CONFIRMATION") {
        return <div className="flex min-w-0 flex-col items-start gap-2"><button className="max-w-full rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-700 disabled:bg-stone-300" disabled={confirming} onClick={() => onConfirm(booking)} type="button">{confirming ? t("confirming") : t("confirm")}</button>{booking.externalPaymentUrl ? <a className="break-all text-xs font-medium text-emerald-800 underline-offset-2 hover:underline" href={booking.externalPaymentUrl} rel="noreferrer" target="_blank">{t("details.paymentLink")}</a> : null}</div>;
    }
    if (booking.status === "CONFIRMED" && booking.specialistPayoutStatus === "PENDING") {
        return <button className="max-w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:text-stone-400" disabled={markingPayout} onClick={() => onMarkPayout(booking.id)} type="button">{markingPayout ? t("payout.marking") : t("payout.markPaid")}</button>;
    }
    return <span className="text-xs text-stone-400">—</span>;
}

function StatusBadge({status, t}: {status: BookingStatus; t: T}) {
    const tone = status === "CONFIRMED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "AWAITING_PAYMENT_CONFIRMATION" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-stone-200 bg-stone-100 text-stone-600";
    return <span className={`inline-flex max-w-full break-words rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{t(`statuses.${status}`)}</span>;
}

function ExpensesSection({expenses, isError, isFetching, locale, offices, t}: {expenses: FinanceExpense[]; isError: boolean; isFetching: boolean; locale: string; offices: Office[]; t: T}) {
    return <div className="grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="min-w-0"><h2 className="break-words text-base font-semibold text-stone-950">{t("expenses.title")}</h2><p className="mt-1 break-words text-sm text-stone-500">{t("expenses.subtitle")}</p>{isFetching ? <p className="py-8 text-center text-sm text-stone-500">{t("expenses.loading")}</p> : null}{isError ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("expenses.loadError")}</p> : null}{!isFetching && !isError && expenses.length === 0 ? <div className="mt-4"><EmptyState body={t("expenses.empty")} title={t("expenses.emptyTitle")} /></div> : null}{expenses.length > 0 ? <div className="mt-4 space-y-2">{expenses.map((expense) => <ExpenseRow expense={expense} key={expense.id} locale={locale} t={t} />)}</div> : null}</div><ExpenseForm offices={offices} t={t} /></div>;
}

function ExpenseRow({expense, locale, t}: {expense: FinanceExpense; locale: string; t: T}) {
    return <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex min-w-0 flex-wrap items-center gap-2"><strong className="break-words text-sm text-stone-950">{expense.category}</strong><span className="max-w-full break-words rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">{expense.officeName ?? t("withoutOffice")}</span></div><p className="mt-2 break-words text-sm text-stone-600">{expense.description}</p><p className="mt-2 break-words text-xs text-stone-500">{formatDate(expense.expenseDate, locale)}</p></div><strong className="break-words text-sm text-stone-950 sm:shrink-0">{formatAmount(expense.amount, locale)}</strong></article>;
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
    return <aside className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="break-words text-xs leading-5 text-stone-500">{t("expenses.hint")}</p><div className="mt-4 space-y-3"><Filter label={t("expenses.amount")}><input className={inputClass} min="0.01" onChange={(event) => setAmount(event.target.value)} step="0.01" type="number" value={amount} /></Filter><Filter label={t("expenses.category")}><input className={inputClass} maxLength={80} onChange={(event) => setCategory(event.target.value)} value={category} /></Filter><Filter label={t("expenses.description")}><textarea className="min-h-20 w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-800" maxLength={500} onChange={(event) => setDescription(event.target.value)} value={description} /></Filter><Filter label={t("expenses.date")}><input className={inputClass} onChange={(event) => setExpenseDate(event.target.value)} type="date" value={expenseDate} /></Filter><Filter label={t("expenses.office")}><select className={inputClass} onChange={(event) => setOfficeId(event.target.value)} value={officeId}><option value="">{t("withoutOffice")}</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}</select></Filter><button className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={disabled} onClick={submit} type="button">{isLoading ? t("expenses.saving") : t("expenses.action")}</button></div></aside>;
}

function ReportsSection({businessIncome, estimatedTax, expenses, from, income, locale, officeId, quarterlyTaxPercent, specialistEarnings, status, taxableIncome, t, to}: {businessIncome: number; estimatedTax: number; expenses: number; from: string; income: number; locale: string; officeId: string; quarterlyTaxPercent: number; specialistEarnings: number; status: BookingStatus | ""; taxableIncome: number; t: T; to: string}) {
    const pdfUrl = financeExportUrl("pdf", {from, locale, officeId, status, to});
    const xlsxUrl = financeExportUrl("xlsx", {from, locale, officeId, status, to});
    return <div className="grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="min-w-0"><h2 className="break-words text-base font-semibold text-stone-950">{t("reports.title")}</h2><p className="mt-1 break-words text-sm text-stone-500">{t("reports.subtitle")}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><SummaryCard label={t("reports.income")} value={formatAmount(income, locale)} /><SummaryCard label={t("reports.specialistEarnings")} value={formatAmount(specialistEarnings, locale)} /><SummaryCard label={t("reports.businessIncome")} value={formatAmount(businessIncome, locale)} /><SummaryCard label={t("reports.expenses")} value={formatAmount(expenses, locale)} /><SummaryCard label={t("reports.taxable")} value={formatAmount(taxableIncome, locale)} /><SummaryCard label={t("reports.estimatedTax", {value: formatPercent(quarterlyTaxPercent, locale)})} value={formatAmount(estimatedTax, locale)} /></div><CalculationBreakdown businessIncome={businessIncome} estimatedTax={estimatedTax} expenses={expenses} income={income} locale={locale} quarterlyTaxPercent={quarterlyTaxPercent} specialistEarnings={specialistEarnings} taxableIncome={taxableIncome} t={t} /></div><div className="min-w-0 space-y-4"><TaxSettingsPanel locale={locale} t={t} /><SpecialistSettingsPanel locale={locale} t={t} /><div className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4"><h3 className="break-words text-sm font-semibold text-stone-900">{t("reports.exportTitle")}</h3><p className="mt-1 break-words text-xs leading-5 text-stone-500">{t("reports.exportHint")}</p><div className="mt-4 grid gap-2"><a className={downloadButtonClass} href={pdfUrl}>{t("reports.pdf")}</a><a className={downloadButtonClass} href={xlsxUrl}>{t("reports.excel")}</a></div></div></div></div>;
}

function CalculationBreakdown({businessIncome, estimatedTax, expenses, income, locale, quarterlyTaxPercent, specialistEarnings, taxableIncome, t}: {businessIncome: number; estimatedTax: number; expenses: number; income: number; locale: string; quarterlyTaxPercent: number; specialistEarnings: number; taxableIncome: number; t: T}) {
    const rows = [
        {label: t("calculation.gross"), value: formatAmount(income, locale)},
        {label: t("calculation.specialist"), value: `- ${formatAmount(specialistEarnings, locale)}`},
        {label: t("calculation.business"), value: formatAmount(businessIncome, locale)},
        {label: t("calculation.expenses"), value: `- ${formatAmount(expenses, locale)}`},
        {label: t("calculation.taxable"), value: formatAmount(taxableIncome, locale)},
        {label: t("calculation.tax", {value: formatPercent(quarterlyTaxPercent, locale)}), value: `- ${formatAmount(estimatedTax, locale)}`},
        {label: t("calculation.result"), value: formatAmount(businessIncome - expenses, locale)}
    ];

    return <section className="mt-4 min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4"><h3 className="break-words text-sm font-semibold text-stone-900">{t("calculation.title")}</h3><p className="mt-1 break-words text-xs leading-5 text-stone-500">{t("calculation.subtitle")}</p><dl className="mt-4 divide-y divide-stone-200">{rows.map((row) => <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-sm" key={row.label}><dt className="min-w-0 break-words text-stone-600">{row.label}</dt><dd className="break-words text-right font-semibold text-stone-950">{row.value}</dd></div>)}</dl></section>;
}

function TaxSettingsPanel({locale, t}: {locale: string; t: T}) {
    const toast = useToast();
    const {data: settings, isError, isFetching} = useGetFinanceSettingsQuery();
    const [percent, setPercent] = useState("");
    const [updateSettings, {isLoading}] = useUpdateFinanceSettingsMutation();

    useEffect(() => {
        if (settings) {
            setPercent(String(settings.quarterlyTaxPercent));
        }
    }, [settings]);

    async function save() {
        try {
            await updateSettings({quarterlyTaxPercent: Number(percent)}).unwrap();
            toast.success(t("taxSettings.saved"));
        } catch {
            toast.error(t("taxSettings.saveError"));
        }
    }

    const numericPercent = Number(percent);
    const disabled = isLoading || percent === "" || Number.isNaN(numericPercent) || numericPercent < 0 || numericPercent > 100;

    return <div className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4"><h3 className="break-words text-sm font-semibold text-stone-900">{t("taxSettings.title")}</h3><p className="mt-1 break-words text-xs leading-5 text-stone-500">{t("taxSettings.subtitle")}</p>{isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{t("taxSettings.loadError")}</p> : null}{!isError && isFetching ? <p className="mt-3 text-xs text-stone-500">{t("taxSettings.loading")}</p> : null}<div className="mt-4 space-y-3"><Filter label={t("taxSettings.percent")}><input className={inputClass} max="100" min="0" onChange={(event) => setPercent(event.target.value)} step="0.01" type="number" value={percent} /></Filter>{settings ? <p className="break-words text-xs text-stone-500">{t("taxSettings.current", {value: formatPercent(settings.quarterlyTaxPercent, locale)})}</p> : null}<button className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={disabled} onClick={save} type="button">{isLoading ? t("taxSettings.saving") : t("taxSettings.save")}</button><p className="break-words text-xs leading-5 text-stone-500">{t("taxSettings.hint")}</p></div></div>;
}

function SpecialistSettingsPanel({locale, t}: {locale: string; t: T}) {
    const toast = useToast();
    const {data: settings = [], isError, isFetching} = useListSpecialistFinanceSettingsQuery();
    const [selectedId, setSelectedId] = useState("");
    const [percent, setPercent] = useState("");
    const [updateSettings, {isLoading}] = useUpdateSpecialistFinanceSettingsMutation();
    const selectedSettings = selectedId ? settings.find((item) => item.specialistId === Number(selectedId)) : undefined;

    useEffect(() => {
        if (!selectedId && settings.length > 0) {
            setSelectedId(String(settings[0].specialistId));
        }
    }, [selectedId, settings]);

    useEffect(() => {
        if (selectedSettings) {
            setPercent(String(selectedSettings.specialistSharePercent));
        }
    }, [selectedSettings]);

    async function save() {
        if (!selectedSettings) return;

        try {
            await updateSettings({
                specialistId: selectedSettings.specialistId,
                specialistSharePercent: Number(percent)
            }).unwrap();
            toast.success(t("settings.saved"));
        } catch {
            toast.error(t("settings.saveError"));
        }
    }

    const numericPercent = Number(percent);
    const disabled = isLoading || !selectedSettings || percent === "" || Number.isNaN(numericPercent) || numericPercent < 0 || numericPercent > 100;

    return <div className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-4"><h3 className="break-words text-sm font-semibold text-stone-900">{t("settings.title")}</h3><p className="mt-1 break-words text-xs leading-5 text-stone-500">{t("settings.subtitle")}</p>{isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{t("settings.loadError")}</p> : null}{!isError && isFetching ? <p className="mt-3 text-xs text-stone-500">{t("settings.loading")}</p> : null}{!isError && settings.length === 0 && !isFetching ? <p className="mt-3 text-xs text-stone-500">{t("settings.empty")}</p> : null}{settings.length > 0 ? <div className="mt-4 space-y-3"><Filter label={t("settings.specialist")}><select className={inputClass} onChange={(event) => setSelectedId(event.target.value)} value={selectedId}>{settings.map((item) => <option key={item.specialistId} value={item.specialistId}>{specialistName(item, t)}</option>)}</select></Filter><Filter label={t("settings.sharePercent")}><input className={inputClass} max="100" min="0" onChange={(event) => setPercent(event.target.value)} step="0.01" type="number" value={percent} /></Filter>{selectedSettings ? <p className="break-words text-xs text-stone-500">{t("settings.current", {value: formatPercent(selectedSettings.specialistSharePercent, locale)})}</p> : null}<button className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={disabled} onClick={save} type="button">{isLoading ? t("settings.saving") : t("settings.save")}</button><p className="break-words text-xs leading-5 text-stone-500">{t("settings.hint")}</p></div> : null}</div>;
}

function specialistName(settings: FinanceSpecialistSettings, t: T) {
    return settings.specialistName.trim() || t("settings.unnamedSpecialist");
}

const downloadButtonClass = "max-w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100";

function EmptyState({body, title}: {body: string; title: string}) {
    return <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-6 text-center"><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-stone-900">{title}</h3><p className="mx-auto mt-2 max-w-lg break-words text-sm leading-6 text-stone-500">{body}</p></div></div>;
}

function BookingDetails({booking, confirming, locale, markingPayout, onClose, onConfirm, onMarkPayout, t}: {booking: FinanceBooking; confirming: boolean; locale: string; markingPayout: boolean; onClose: () => void; onConfirm: (booking: FinanceBooking) => void; onMarkPayout: (id: number) => void; t: T}) {
    return <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/30" onClick={onClose} role="presentation"><aside className="h-full w-full max-w-md overflow-y-auto bg-white p-4 shadow-2xl sm:p-5" onClick={(event) => event.stopPropagation()}><div className="flex min-w-0 items-start justify-between gap-3 border-b border-stone-200 pb-4"><div className="min-w-0"><p className="break-words text-xs font-semibold uppercase tracking-wide text-stone-500">{t("details.eyebrow")}</p><h2 className="mt-1 break-words text-xl font-semibold text-stone-950">{booking.clientName}</h2></div><button aria-label={t("details.close")} className="shrink-0 rounded-lg border border-stone-200 px-3 py-2 text-stone-600 hover:bg-stone-100" onClick={onClose} type="button">×</button></div><dl className="mt-5 space-y-4"><Detail label={t("table.service")} value={bookingServiceTitle(booking, locale)} /><Detail label={t("table.specialist")} value={booking.specialistName} /><Detail label={t("table.office")} value={booking.officeName ?? t("withoutOffice")} /><Detail label={t("table.when")} value={formatDateTime(booking.startsAt, locale)} /><Detail label={t("table.amount")} value={formatAmount(booking.bookedPrice, locale)} /><Detail label={t("table.businessShare")} value={formatAmount(booking.businessShare, locale)} /><Detail label={t("table.specialistShare")} value={`${formatAmount(booking.specialistShare, locale)} · ${formatPercent(booking.specialistSharePercent, locale)}`} /><Detail label={t("payout.label")} value={t(`payout.statuses.${booking.specialistPayoutStatus}`)} />{booking.specialistPayoutPaidAt ? <Detail label={t("payout.paidAt")} value={formatDateTime(booking.specialistPayoutPaidAt, locale)} /> : null}{booking.externalPaymentUrl ? <DetailLink label={t("details.paymentLink")} value={booking.externalPaymentUrl} /> : null}<div><dt className="break-words text-xs font-medium uppercase tracking-wide text-stone-500">{t("table.status")}</dt><dd className="mt-1"><StatusBadge status={booking.status} t={t} /></dd></div></dl><div className="mt-6"><FinanceAction booking={booking} confirming={confirming} markingPayout={markingPayout} onConfirm={onConfirm} onMarkPayout={onMarkPayout} t={t} /></div></aside></div>;
}

function PaymentReviewModal({booking, confirming, locale, onClose, onConfirm, t}: {booking: FinanceBooking; confirming: boolean; locale: string; onClose: () => void; onConfirm: (id: number) => void; t: T}) {
    const [verified, setVerified] = useState(false);
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/40 p-4" onClick={onClose} role="presentation"><section aria-modal="true" className="w-full max-w-lg rounded-xl bg-white p-4 shadow-2xl sm:p-5" onClick={(event) => event.stopPropagation()} role="dialog"><div className="flex min-w-0 items-start justify-between gap-3 border-b border-stone-200 pb-4"><div className="min-w-0"><p className="break-words text-xs font-semibold uppercase tracking-wide text-amber-700">{t("paymentReview.eyebrow")}</p><h2 className="mt-1 break-words text-xl font-semibold text-stone-950">{t("paymentReview.title")}</h2><p className="mt-2 break-words text-sm leading-6 text-stone-600">{t("paymentReview.body")}</p></div><button aria-label={t("details.close")} className="shrink-0 rounded-lg border border-stone-200 px-3 py-2 text-stone-600 hover:bg-stone-100" onClick={onClose} type="button">×</button></div><dl className="mt-5 grid gap-3 sm:grid-cols-2"><Detail label={t("table.client")} value={booking.clientName} /><Detail label={t("table.service")} value={bookingServiceTitle(booking, locale)} /><Detail label={t("table.when")} value={formatDateTime(booking.startsAt, locale)} /><Detail label={t("table.amount")} value={formatAmount(booking.bookedPrice, locale)} /><Detail label={t("table.specialist")} value={booking.specialistName} /><Detail label={t("table.office")} value={booking.officeName ?? t("withoutOffice")} /></dl>{booking.externalPaymentUrl ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><DetailLink label={t("details.paymentLink")} value={booking.externalPaymentUrl} /></div> : <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("paymentReview.noPaymentLink")}</p>}<label className="mt-5 flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700"><input checked={verified} className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900" onChange={(event) => setVerified(event.target.checked)} type="checkbox" /><span className="min-w-0"><strong className="block break-words text-stone-950">{t("paymentReview.verified")}</strong><span className="mt-1 block break-words text-xs leading-5 text-stone-500">{t("paymentReview.verifyHint")}</span></span></label><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100" onClick={onClose} type="button">{t("paymentReview.cancel")}</button><button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={!verified || confirming} onClick={() => onConfirm(booking.id)} type="button">{confirming ? t("confirming") : t("paymentReview.confirm")}</button></div></section></div>;
}

function Detail({label, value}: {label: string; value: string}) {
    return <div className="min-w-0"><dt className="break-words text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 break-words text-sm text-stone-900">{value}</dd></div>;
}

function DetailLink({label, value}: {label: string; value: string}) {
    return <div><dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1"><a className="break-all text-sm font-medium text-emerald-800 underline-offset-2 hover:underline" href={value} rel="noreferrer" target="_blank">{value}</a></dd></div>;
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

function formatPercent(value: number, locale: string) {
    return new Intl.NumberFormat(locale === "ua" ? "uk-UA" : "en-US", {maximumFractionDigits: 2, style: "percent"}).format(value / 100);
}

function financeExportUrl(format: "pdf" | "xlsx", {from, locale, officeId, status, to}: {from: string; locale: string; officeId: string; status: BookingStatus | ""; to: string}) {
    const params = new URLSearchParams();
    params.set("locale", locale === "en" ? "en" : "ua");
    if (status) params.set("status", status);
    if (officeId) params.set("officeId", officeId);
    if (from) params.set("from", toStartOfDayIso(from) ?? "");
    if (to) params.set("to", toNextDayIso(to) ?? "");
    return `${API_URL}/api/admin/finance/export/${format}?${params.toString()}`;
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
