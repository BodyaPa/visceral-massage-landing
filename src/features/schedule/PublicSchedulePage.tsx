"use client";

import {useEffect, useMemo, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateBookingMutation} from "@/features/bookings/bookings.api";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {useListPublicAvailabilityQuery} from "@/features/schedule/schedule.api";
import AtaraksiaCalendar, {
    toCalendarView,
    type AtaraksiaCalendarEvent
} from "@/features/schedule/AtaraksiaCalendar";
import {useListServicesQuery} from "@/features/services/services.api";
import type {PublicScheduleAvailabilityBlock} from "@/types/schedule";

const views = ["month", "week", "day", "list"] as const;
const periods = [7, 31] as const;
const emptySlots: PublicScheduleAvailabilityBlock[] = [];
type CalendarView = typeof views[number];

export default function PublicSchedulePage() {
    const t = useTranslations("calendar.page");
    const locale = useLocale();
    const toast = useToast();
    const [selectedView, setSelectedView] = useState<CalendarView>("month");
    const [period, setPeriod] = useState<(typeof periods)[number]>(31);
    const [officeId, setOfficeId] = useState<number | "">("");
    const [specialistId, setSpecialistId] = useState<number | "">("");
    const [serviceId, setServiceId] = useState<number | "">("");
    const [reminderOptIn, setReminderOptIn] = useState(false);
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const range = useMemo(() => buildRange(period), [period]);
    const {data: officesData, isFetching: officesFetching} = useListPublicOfficesQuery({size: 100});
    const {data: servicesData, isFetching: servicesFetching} = useListServicesQuery({lang: locale as Locale, size: 100});
    const {data, isFetching, isError, refetch} = useListPublicAvailabilityQuery({from: range.from, to: range.to, officeId});
    const [createBooking, {isLoading: isBooking}] = useCreateBookingMutation();
    const slots = data ?? emptySlots;
    const offices = officesData?.content ?? [];
    const services = servicesData?.content ?? [];
    const specialists = useMemo(() => uniqueSpecialists(slots), [slots]);
    const selectedService = services.find((service) => service.id === serviceId);
    const selectedOffice = offices.find((office) => office.id === officeId);
    const selectedSpecialist = specialists.find((specialist) => specialist.id === specialistId);
    const filteredSlots = specialistId === "" ? slots : slots.filter((slot) => slot.specialistId === specialistId);
    const upcomingSlots = filteredSlots.slice(0, 6);

    useEffect(() => {
        if (window.matchMedia("(max-width: 639px)").matches) setSelectedView("list");
    }, []);

    useEffect(() => {
        if (specialistId !== "" && !specialists.some((specialist) => specialist.id === specialistId)) setSpecialistId("");
    }, [specialistId, specialists]);

    function resetFilters() {
        setOfficeId("");
        setSpecialistId("");
        setServiceId("");
        setPeriod(31);
    }

    async function bookSlot(slot: PublicScheduleAvailabilityBlock) {
        if (serviceId === "") {
            toast.error(t("booking.selectService"));
            return;
        }

        try {
            const booking = await createBooking({availabilityBlockId: slot.id, serviceId, reminderOptIn}).unwrap();
            toast.success(booking.externalPaymentUrl ? t("booking.createdWithPayment") : t("booking.created"));
            void refetch();
        } catch {
            toast.error(t("booking.error"));
        }
    }

    return (
        <main className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <header className="border-b border-stone-200 pb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{t("eyebrow")}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">{t("title")}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">{t("subtitle")}</p>
            </header>

            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="border-b border-stone-200 bg-stone-50/80 px-5 py-5 sm:px-6">
                    <h2 className="text-base font-semibold text-stone-950">{t("bookingPanel.title")}</h2>
                    <p className="mt-1 text-sm text-stone-500">{t("bookingPanel.subtitle")}</p>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
                    <SelectField label={t("filters.service")}>
                        <select className={inputClass} disabled={servicesFetching} onChange={(event) => setServiceId(toId(event.target.value))} value={serviceId}>
                            <option value="">{t("filters.selectService")}</option>
                            {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
                        </select>
                    </SelectField>
                    <SelectField label={t("filters.office")}>
                        <select className={inputClass} disabled={officesFetching} onChange={(event) => setOfficeId(toId(event.target.value))} value={officeId}>
                            <option value="">{t("filters.allOffices")}</option>
                            {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
                        </select>
                    </SelectField>
                    <SelectField label={t("filters.specialist")}>
                        <select className={inputClass} onChange={(event) => setSpecialistId(toId(event.target.value))} value={specialistId}>
                            <option value="">{t("filters.allSpecialists")}</option>
                            {specialists.map((specialist) => <option key={specialist.id} value={specialist.id}>{specialist.name}</option>)}
                        </select>
                    </SelectField>
                    <SelectField label={t("filters.period")}>
                        <select className={inputClass} onChange={(event) => setPeriod(Number(event.target.value) as 7 | 31)} value={period}>
                            {periods.map((days) => <option key={days} value={days}>{t(`periods.days${days}`)}</option>)}
                        </select>
                    </SelectField>
                </div>
                <div className="grid gap-5 border-t border-stone-200 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,auto)] lg:items-center">
                    <div className="grid items-center gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <SummaryItem label={t("summary.service")} value={selectedService?.title ?? t("summary.notSelected")} />
                        <SummaryItem label={t("summary.duration")} value={selectedService ? t("summary.minutes", {count: selectedService.durationMinutes}) : "—"} />
                        <SummaryItem label={t("summary.price")} value={selectedService ? formatAmount(selectedService.basePrice, locale) : "—"} />
                        <SummaryItem label={t("summary.place")} value={selectedOffice?.name ?? selectedSpecialist?.name ?? t("summary.anyAvailable")} />
                    </div>
                    <label className="flex min-h-full items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                        <input checked={reminderOptIn} className="mt-0.5 h-4 w-4 accent-stone-900" onChange={(event) => setReminderOptIn(event.target.checked)} type="checkbox" />
                        <span><strong className="block font-medium text-stone-900">{t("booking.reminderOptIn")}</strong><span className="mt-0.5 block text-xs leading-5 text-stone-500">{t("booking.reminderHint")}</span></span>
                    </label>
                </div>
            </section>

            <section>
                <SectionHeading title={t("upcomingTitle")} description={t("upcomingDescription")} meta={isFetching ? t("loading") : t("slotCount", {count: filteredSlots.length})} />
                {upcomingSlots.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {upcomingSlots.map((slot) => <ScheduleSlotCard booking={isBooking} key={slot.id} locale={locale} onBook={bookSlot} service={selectedService?.title} slot={slot} t={t} />)}
                    </div>
                ) : !isFetching ? (
                    <EmptyState onReset={resetFilters} onShowAllOffices={() => setOfficeId("")} onNextPeriod={() => setPeriod(31)} t={t} />
                ) : null}
            </section>

            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <SectionHeading title={t("calendarTitle")} description={t("calendarDescription")} meta={formatCalendarLabel(selectedView, range, locale)} />
                    <div className="grid w-full grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 sm:flex sm:w-auto">
                        {views.map((view) => (
                            <button aria-pressed={selectedView === view} className={selectedView === view ? activeViewClass : viewClass} key={view} onClick={() => setSelectedView(view)} type="button">
                                {t(`views.${view}`)}
                            </button>
                        ))}
                    </div>
                </div>
                {isError ? <p className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:m-6">{t("loadError")}</p> : null}
                <PublicScheduleCalendar currentDate={currentDate} locale={locale} onBook={bookSlot} onNavigate={setCurrentDate} slots={filteredSlots} t={t} view={selectedView} />
            </section>
        </main>
    );
}

type T = ReturnType<typeof useTranslations<"calendar.page">>;
const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors focus:border-stone-800";
const viewClass = "rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-white";
const activeViewClass = "rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white shadow-sm";

function SelectField({children, label}: {children: React.ReactNode; label: string}) {
    return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</span>{children}</label>;
}

function SummaryItem({label, value}: {label: string; value: string}) {
    return <div><p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</p><p className="mt-1 truncate text-sm font-medium text-stone-800">{value}</p></div>;
}

function SectionHeading({description, meta, title}: {description: string; meta: string; title: string}) {
    return <div><div className="inline-flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold text-stone-950">{title}</h2><span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-500">{meta}</span></div><p className="mt-1.5 text-sm leading-6 text-stone-500">{description}</p></div>;
}

function EmptyState({onNextPeriod, onReset, onShowAllOffices, t}: {onNextPeriod: () => void; onReset: () => void; onShowAllOffices: () => void; t: T}) {
    return (
        <div className="mt-5 flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 px-5 py-8 text-center">
            <div className="w-full max-w-2xl">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-lg text-stone-500" aria-hidden="true">⌁</div>
            <h3 className="mt-4 text-base font-semibold text-stone-900">{t("emptyState.title")}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-500">{t("emptyState.body")}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700" onClick={onReset} type="button">{t("emptyState.reset")}</button>
                <button className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100" onClick={onShowAllOffices} type="button">{t("emptyState.allOffices")}</button>
                <button className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100" onClick={onNextPeriod} type="button">{t("emptyState.nextPeriod")}</button>
            </div>
            </div>
        </div>
    );
}

function PublicScheduleCalendar({currentDate, locale, onBook, onNavigate, slots, t, view}: {currentDate: Date; locale: string; onBook: (slot: PublicScheduleAvailabilityBlock) => void; onNavigate: (date: Date) => void; slots: PublicScheduleAvailabilityBlock[]; t: T; view: CalendarView}) {
    if (slots.length === 0) return <div className="flex min-h-72 items-center justify-center border-t border-stone-100 bg-[linear-gradient(to_right,#e7e5e4_1px,transparent_1px),linear-gradient(to_bottom,#e7e5e4_1px,transparent_1px)] bg-[size:72px_72px] p-6"><p className="max-w-md rounded-xl border border-stone-200 bg-white px-5 py-4 text-center text-sm leading-6 text-stone-500 shadow-sm">{t("calendarEmpty")}</p></div>;

    const slotByEventId = new Map(slots.map((slot) => [`slot-${slot.id}`, slot]));
    const events: AtaraksiaCalendarEvent[] = slots.map((slot) => ({
        id: `slot-${slot.id}`,
        title: `${slot.specialistName} · ${slot.officeName ?? t("withoutOffice")}`,
        start: new Date(slot.startsAt),
        end: new Date(slot.endsAt),
        tone: "available"
    }));

    return (
        <div className="p-4 sm:p-6">
            <AtaraksiaCalendar
                culture={locale === "ua" ? "uk" : locale}
                date={currentDate}
                events={events}
                onNavigate={onNavigate}
                onSelectEvent={(event) => {
                    const slot = slotByEventId.get(event.id);
                    if (slot) void onBook(slot);
                }}
                view={toCalendarView(view)}
            />
        </div>
    );
}

function ScheduleSlotCard({booking, locale, onBook, service, slot, t}: {booking: boolean; locale: string; onBook: (slot: PublicScheduleAvailabilityBlock) => void; service?: string; slot: PublicScheduleAvailabilityBlock; t: T}) {
    return (
        <article className="group flex min-w-0 flex-col rounded-xl border border-stone-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{formatWeekday(slot.startsAt, locale)}</p><p className="mt-1 text-base font-semibold text-stone-950">{formatDate(slot.startsAt, locale)}</p></div><span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-800">{formatTime(slot.startsAt, locale)}</span></div>
            <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 text-sm"><p className="font-medium text-stone-800">{service ?? t("summary.selectServiceHint")}</p><p className="text-stone-500">{slot.specialistName}</p><p className="text-stone-500">{slot.officeName ?? t("withoutOffice")} · {formatTime(slot.startsAt, locale)}–{formatTime(slot.endsAt, locale)}</p></div>
            <button className="mt-4 w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={booking} onClick={() => onBook(slot)} type="button">{booking ? t("booking.saving") : t("booking.action")}</button>
        </article>
    );
}

function buildRange(days: number) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + days);
    return {from: from.toISOString(), to: to.toISOString()};
}

function uniqueSpecialists(slots: PublicScheduleAvailabilityBlock[]) {
    const specialists = new Map<number, string>();
    for (const slot of slots) specialists.set(slot.specialistId, slot.specialistName);
    return Array.from(specialists, ([id, name]) => ({id, name}));
}

function toId(value: string): number | "" {
    return value ? Number(value) : "";
}

function formatDate(value: string, locale: string) {
    return new Intl.DateTimeFormat(toLanguageTag(locale), {day: "numeric", month: "long"}).format(new Date(value));
}

function formatWeekday(value: string, locale: string) {
    return new Intl.DateTimeFormat(toLanguageTag(locale), {weekday: "long"}).format(new Date(value));
}

function formatTime(value: string, locale: string) {
    return new Intl.DateTimeFormat(toLanguageTag(locale), {hour: "2-digit", minute: "2-digit"}).format(new Date(value));
}

function formatAmount(value: number, locale: string) {
    return new Intl.NumberFormat(locale === "ua" ? "uk-UA" : "en-US", {currency: "UAH", maximumFractionDigits: 0, style: "currency"}).format(value);
}

function formatCalendarLabel(view: CalendarView, range: {from: string; to: string}, locale: string) {
    const languageTag = toLanguageTag(locale);
    const from = new Date(range.from);
    const to = new Date(range.to);

    if (view === "month") {
        return new Intl.DateTimeFormat(languageTag, {month: "long", year: "numeric"}).format(from);
    }
    if (view === "day") {
        return new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "long", weekday: "long"}).format(from);
    }
    return `${new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "short"}).format(from)} – ${new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "short"}).format(to)}`;
}

function toLanguageTag(locale: string) {
    return locale === "ua" ? "uk" : locale;
}
