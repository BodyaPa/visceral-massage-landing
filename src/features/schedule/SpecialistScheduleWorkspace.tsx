"use client";

import {useEffect, useMemo, useState} from "react";
import type {ReactNode} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateManualBookingMutation, useListSpecialistBookingsQuery} from "@/features/bookings/bookings.api";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {useListServicesQuery} from "@/features/services/services.api";
import {
    useCreateAvailabilityMutation,
    useDeleteAvailabilityMutation,
    useListAvailabilityQuery
} from "@/features/schedule/schedule.api";
import AtaraksiaCalendar, {
    toCalendarView,
    type AtaraksiaCalendarEvent
} from "@/features/schedule/AtaraksiaCalendar";
import type {ScheduleBlockStatus, SpecialistAvailabilityBlock} from "@/types/schedule";
import type {SpecialistBooking} from "@/types/bookings";
import type {PublicService} from "@/types/services";
import type {Locale} from "@/i18n";

const views = ["month", "week", "day", "list"] as const;
const emptyBlocks: SpecialistAvailabilityBlock[] = [];
type CalendarView = typeof views[number];

type AvailabilityForm = {
    officeId: string;
    status: ScheduleBlockStatus;
    startsAt: string;
    endsAt: string;
    notes: string;
};

export default function SpecialistScheduleWorkspace() {
    const t = useTranslations("admin.specialist.page");
    const locale = useLocale();
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const range = useMemo(() => buildCalendarRange(currentDate), [currentDate]);
    const {data, isFetching, isError, refetch: refetchAvailability} = useListAvailabilityQuery(range, {
        pollingInterval: 30_000,
        skipPollingIfUnfocused: true
    });
    const {data: bookings = [], isFetching: bookingsFetching, isError: bookingsError} = useListSpecialistBookingsQuery(range);
    const {data: officesData, isFetching: officesFetching, isError: officesError} = useListPublicOfficesQuery({size: 100});
    const {data: servicesData, isFetching: servicesFetching, isError: servicesError} = useListServicesQuery({lang: locale as Locale, size: 100});
    const blocks = data ?? emptyBlocks;
    const offices = officesData?.content ?? [];
    const services = servicesData?.content ?? [];
    const [createAvailability, {isLoading: isCreating}] = useCreateAvailabilityMutation();
    const [deleteAvailability, {isLoading: isDeleting}] = useDeleteAvailabilityMutation();
    const [selectedView, setSelectedView] = useState<CalendarView>("week");
    const [form, setForm] = useState<AvailabilityForm>(() => buildDefaultForm());
    const availableCount = blocks.filter((block) => block.status === "AVAILABLE" && !block.booked).length;
    const blockedCount = blocks.filter((block) => block.status === "BLOCKED").length;

    useEffect(() => {
        const mobileQuery = window.matchMedia("(max-width: 639px)");

        if (mobileQuery.matches) {
            setSelectedView("day");
        }
    }, []);

    function updateForm<K extends keyof AvailabilityForm>(field: K, value: AvailabilityForm[K]) {
        setForm((current) => ({...current, [field]: value}));
    }

    async function saveAvailability() {
        try {
            const startsAt = toIsoDateTime(form.startsAt);
            const endsAt = toIsoDateTime(form.endsAt);

            if (!startsAt || !endsAt) {
                toast.error(t("form.invalidRange"));
                return;
            }

            await createAvailability({
                officeId: form.officeId ? Number(form.officeId) : null,
                status: form.status,
                startsAt,
                endsAt,
                notes: form.notes.trim() || null
            }).unwrap();

            setForm((current) => ({...current, notes: ""}));
            toast.success(t("form.created"));
        } catch {
            toast.error(t("form.saveError"));
        }
    }

    async function removeAvailability(blockId: number) {
        try {
            await deleteAvailability(blockId).unwrap();
            toast.success(t("form.deleted"));
        } catch {
            toast.error(t("form.deleteError"));
        }
    }

    return (
        <section className="grid w-full min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
                <header className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("eyebrow")}</p>
                            <h1 className="mt-2 text-2xl font-semibold text-stone-950 sm:text-3xl">{t("title")}</h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{t("description")}</p>
                        </div>
                        <button className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 lg:w-auto" onClick={() => document.getElementById("availability-form")?.scrollIntoView({behavior: "smooth"})} type="button">
                            {t("actions.create")}
                        </button>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <StatCard label={t("stats.available")} value={availableCount} tone="success" />
                        <StatCard label={t("stats.blocked")} value={blockedCount} tone="warning" />
                        <StatCard label={t("stats.bookings")} value={bookings.length} />
                    </div>
                </header>

                <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-stone-200 bg-stone-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-stone-950">{t("calendar.title")}</h2>
                            <p className="mt-1 text-sm text-stone-500">{formatCalendarTitle(selectedView, currentDate, locale)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800" title={t("calendar.source")}>{isFetching ? t("calendar.loading") : t("calendar.connected")}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-1">
                            <button className={controlButtonClass} onClick={() => setCurrentDate((date) => navigateDate(date, selectedView, -1))} type="button">←</button>
                            <button className={controlButtonClass} onClick={() => setCurrentDate(new Date())} type="button">{t("controls.today")}</button>
                            <button className={controlButtonClass} onClick={() => setCurrentDate((date) => navigateDate(date, selectedView, 1))} type="button">→</button>
                        </div>
                        <div className="grid grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 sm:flex">
                            {views.map((view) => (
                                <button aria-pressed={view === selectedView} className={view === selectedView ? activeViewClass : viewClass} key={view} onClick={() => setSelectedView(view)} type="button">
                                    {t(`views.${view}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 border-b border-stone-200 px-4 py-3">
                        <LegendItem className="border-emerald-200 bg-emerald-50" label={t("legend.available")} />
                        <LegendItem className="border-amber-200 bg-amber-50" label={t("legend.blocked")} />
                        <LegendItem className="border-stone-400 bg-stone-700" label={t("legend.booking")} />
                    </div>

                    {isError ? <p className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("calendar.loadError")}</p> : null}

                    <div className="p-4">
                        <CalendarSurface bookings={bookings} blocks={blocks} currentDate={currentDate} locale={locale} onNavigate={setCurrentDate} selectedView={selectedView} t={t} />
                    </div>
                    <p className="border-t border-stone-100 px-4 py-3 text-xs leading-5 text-stone-500">{t("calendar.source")}</p>
                </section>

                <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                    <ScheduleBlockList
                        blocks={blocks}
                        deleting={isDeleting}
                        locale={locale}
                        onDelete={removeAvailability}
                        t={t}
                    />
                </section>
            </div>

            <aside className="min-w-0 space-y-5">
                <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm 2xl:sticky 2xl:top-4" id="availability-form">
                    <div className="border-b border-stone-100 pb-3">
                        <h2 className="text-base font-semibold text-stone-950">{form.status === "AVAILABLE" ? t("form.availableTitle") : t("form.blockedTitle")}</h2>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{t("form.hint")}</p>
                    </div>
                    <div className="mt-5 space-y-4">
                        <Field help={t("help.type")} label={t("form.status")}>
                            <select
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => updateForm("status", event.target.value as ScheduleBlockStatus)}
                                value={form.status}
                            >
                                <option value="AVAILABLE">{t("statuses.available")}</option>
                                <option value="BLOCKED">{t("statuses.blocked")}</option>
                            </select>
                        </Field>
                        <Field label={t("form.office")}>
                            <select
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                disabled={officesFetching}
                                onChange={(event) => updateForm("officeId", event.target.value)}
                                value={form.officeId}
                            >
                                <option value="">{officesFetching ? t("form.officesLoading") : t("form.noOffice")}</option>
                                {offices.map((office) => (
                                    <option key={office.id} value={office.id}>
                                        {office.name}
                                    </option>
                                ))}
                            </select>
                            {officesError ? <span className="mt-1 block text-xs text-red-700">{t("form.officesLoadError")}</span> : null}
                        </Field>
                        <Field label={t("form.startsAt")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => updateForm("startsAt", event.target.value)}
                                type="datetime-local"
                                value={form.startsAt}
                            />
                        </Field>
                        <Field label={t("form.endsAt")}>
                            <input
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                onChange={(event) => updateForm("endsAt", event.target.value)}
                                type="datetime-local"
                                value={form.endsAt}
                            />
                        </Field>
                        <Field label={t("form.notes")}>
                            <textarea
                                className="min-h-20 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                maxLength={500}
                                onChange={(event) => updateForm("notes", event.target.value)}
                                value={form.notes}
                            />
                        </Field>
                        <button
                            className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                            disabled={isCreating}
                            onClick={saveAvailability}
                            type="button"
                        >
                            {isCreating ? t("form.saving") : form.status === "AVAILABLE" ? t("actions.availability") : t("actions.blocking")}
                        </button>
                    </div>
                </section>
                <ManualBookingForm
                    blocks={blocks}
                    locale={locale}
                    services={services}
                    servicesError={servicesError}
                    servicesFetching={servicesFetching}
                    onCreated={refetchAvailability}
                    t={t}
                />
                <BookingsPanel bookings={bookings} isError={bookingsError} isFetching={bookingsFetching} locale={locale} t={t} />
                <PreparedPanel title={t("exceptions.title")} body={t("exceptions.body")} empty={t("exceptions.empty")} />
            </aside>
        </section>
    );
}

type T = ReturnType<typeof useTranslations<"admin.specialist.page">>;

const controlButtonClass = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white";
const viewClass = "rounded-md px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-white";
const activeViewClass = "rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white shadow-sm";

function CalendarSurface({bookings, blocks, currentDate, locale, onNavigate, selectedView, t}: {bookings: SpecialistBooking[]; blocks: SpecialistAvailabilityBlock[]; currentDate: Date; locale: string; onNavigate: (date: Date) => void; selectedView: CalendarView; t: T}) {
    if (selectedView === "list") {
        return <ScheduleBlockList blocks={blocks} deleting={false} locale={locale} onDelete={() => undefined} t={t} viewOnly />;
    }

    const events: AtaraksiaCalendarEvent[] = [
        ...blocks.map((block) => ({
            id: `block-${block.id}`,
            title: [block.booked ? t("legend.booked") : null, block.officeName, block.notes].filter(Boolean).join(" · ") || (block.status === "AVAILABLE" ? t("legend.available") : t("legend.blocked")),
            start: new Date(block.startsAt),
            end: new Date(block.endsAt),
            tone: block.booked ? "booking" as const : block.status === "AVAILABLE" ? "available" as const : "blocked" as const
        })),
        ...bookings.map((booking) => ({
            id: `booking-${booking.id}`,
            title: `${booking.clientName} · ${booking.serviceTitleUa}`,
            start: new Date(booking.startsAt),
            end: new Date(booking.endsAt),
            tone: "booking" as const
        }))
    ];

    return <AtaraksiaCalendar culture={locale === "ua" ? "uk" : locale} date={currentDate} events={events} onNavigate={onNavigate} view={toCalendarView(selectedView)} />;
}

function ScheduleBlockList({
    blocks,
    deleting,
    locale,
    onDelete,
    t,
    viewOnly = false
}: {
    blocks: SpecialistAvailabilityBlock[];
    deleting: boolean;
    locale: string;
    onDelete: (id: number) => void;
    t: T;
    viewOnly?: boolean;
}) {
    return (
        <div className={viewOnly ? "rounded-lg border border-stone-200 bg-white p-3" : ""}>
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-900">{t("blocks.title")}</h3>
                <span className="text-xs text-stone-500">{blocks.length}</span>
            </div>
            <div className="mt-3 space-y-2">
                {blocks.map((block) => (
                    <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between" key={block.id}>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge booked={block.booked} status={block.status} t={t} />
                                <span className="text-sm font-medium text-stone-900">
                                    {formatDateTime(block.startsAt, locale)} - {formatDateTime(block.endsAt, locale)}
                                </span>
                            </div>
                            {block.officeName || block.notes ? (
                                <p className="mt-1 break-words text-xs text-stone-500">
                                    {[block.officeName, block.notes].filter(Boolean).join(" · ")}
                                </p>
                            ) : null}
                        </div>
                        {!viewOnly ? <button
                            className="w-fit rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                            disabled={deleting}
                            onClick={() => onDelete(block.id)}
                            type="button"
                        >
                            {t("blocks.delete")}
                        </button> : null}
                    </div>
                ))}
                {blocks.length === 0 ? <p className="text-sm text-stone-500">{t("blocks.empty")}</p> : null}
            </div>
        </div>
    );
}

function StatusBadge({booked = false, status, t}: {booked?: boolean; status: ScheduleBlockStatus; t: T}) {
    const className = booked
        ? "border-stone-300 bg-stone-700 text-white"
        : status === "AVAILABLE"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-800";

    return (
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
            {booked ? t("statuses.booked") : status === "AVAILABLE" ? t("statuses.available") : t("statuses.blocked")}
        </span>
    );
}

function Field({children, help, label}: {children: ReactNode; help?: string; label: string}) {
    return (
        <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-stone-500">{label}{help ? <span className="cursor-help text-stone-400" title={help}>ⓘ</span> : null}</span>
            {children}
        </label>
    );
}

function PreparedPanel({body, empty, title}: {body: string; empty: string; title: string}) {
    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2><span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">0</span></div>
            <p className="mt-2 text-xs leading-5 text-stone-500">{body}</p>
            <p className="mt-3 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">{empty}</p>
        </section>
    );
}

function ManualBookingForm({
    blocks,
    locale,
    onCreated,
    services,
    servicesError,
    servicesFetching,
    t
}: {
    blocks: SpecialistAvailabilityBlock[];
    locale: string;
    onCreated: () => void;
    services: PublicService[];
    servicesError: boolean;
    servicesFetching: boolean;
    t: T;
}) {
    const toast = useToast();
    const [createManualBooking, {isLoading}] = useCreateManualBookingMutation();
    const [clientIdentifier, setClientIdentifier] = useState("");
    const [availabilityBlockId, setAvailabilityBlockId] = useState("");
    const [serviceId, setServiceId] = useState("");
    const [reminderOptIn, setReminderOptIn] = useState(false);
    const availableBlocks = blocks.filter((block) => block.status === "AVAILABLE" && !block.booked);

    async function submit() {
        try {
            await createManualBooking({
                clientIdentifier: clientIdentifier.trim(),
                availabilityBlockId: Number(availabilityBlockId),
                serviceId: Number(serviceId),
                reminderOptIn
            }).unwrap();
            setClientIdentifier("");
            setAvailabilityBlockId("");
            setReminderOptIn(false);
            onCreated();
            toast.success(t("manualBooking.created"));
        } catch {
            toast.error(t("manualBooking.error"));
        }
    }

    const disabled = isLoading || !clientIdentifier.trim() || !availabilityBlockId || !serviceId;

    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{t("manualBooking.title")}</h2>
            <p className="mt-2 text-xs leading-5 text-stone-500">{t("manualBooking.body")}</p>
            <div className="mt-4 space-y-3">
                <Field label={t("manualBooking.client")}>
                    <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => setClientIdentifier(event.target.value)} placeholder={t("manualBooking.clientPlaceholder")} value={clientIdentifier} />
                </Field>
                <Field label={t("manualBooking.service")}>
                    <select className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" disabled={servicesFetching} onChange={(event) => setServiceId(event.target.value)} value={serviceId}>
                        <option value="">{servicesFetching ? t("manualBooking.loadingServices") : t("manualBooking.selectService")}</option>
                        {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
                    </select>
                    {servicesError ? <span className="mt-1 block text-xs text-red-700">{t("manualBooking.servicesError")}</span> : null}
                </Field>
                <Field label={t("manualBooking.slot")}>
                    <select className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => setAvailabilityBlockId(event.target.value)} value={availabilityBlockId}>
                        <option value="">{t("manualBooking.selectSlot")}</option>
                        {availableBlocks.map((block) => <option key={block.id} value={block.id}>{formatDateTime(block.startsAt, locale)} · {block.officeName ?? t("form.noOffice")}</option>)}
                    </select>
                </Field>
                <label className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700">
                    <input checked={reminderOptIn} className="mt-0.5" onChange={(event) => setReminderOptIn(event.target.checked)} type="checkbox" />
                    <span><strong className="block font-medium text-stone-900">{t("manualBooking.reminder")}</strong><span className="mt-1 block text-xs leading-5 text-stone-500">{t("manualBooking.reminderHint")}</span></span>
                </label>
                <button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={disabled} onClick={submit} type="button">
                    {isLoading ? t("manualBooking.saving") : t("manualBooking.action")}
                </button>
            </div>
        </section>
    );
}

function BookingsPanel({bookings, isError, isFetching, locale, t}: {bookings: SpecialistBooking[]; isError: boolean; isFetching: boolean; locale: string; t: T}) {
    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{t("bookings.title")}</h2>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">{bookings.length}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-500">{t("bookings.body")}</p>
            {isFetching ? <p className="mt-3 text-sm text-stone-500">{t("bookings.loading")}</p> : null}
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("bookings.loadError")}</p> : null}
            {!isFetching && !isError && bookings.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">{t("bookings.empty")}</p> : null}
            {bookings.length > 0 ? (
                <div className="mt-3 space-y-2">
                    {bookings.slice(0, 6).map((booking) => (
                        <article className="rounded-lg border border-stone-200 bg-stone-50 p-3" key={booking.id}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-stone-900">{booking.clientName}</p>
                                    <p className="mt-0.5 truncate text-xs text-stone-500">{booking.serviceTitleUa}</p>
                                </div>
                                <BookingStatusBadge status={booking.status} t={t} />
                            </div>
                            <p className="mt-2 text-xs font-medium text-stone-700">{formatDateTime(booking.startsAt, locale)}</p>
                            <p className="mt-1 truncate text-xs text-stone-500">{[booking.officeName, booking.clientContact].filter(Boolean).join(" · ")}</p>
                        </article>
                    ))}
                </div>
            ) : null}
        </section>
    );
}

function BookingStatusBadge({status, t}: {status: SpecialistBooking["status"]; t: T}) {
    const className = status === "CONFIRMED"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
    return <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${className}`}>{t(`bookings.statuses.${status}`)}</span>;
}

function StatCard({label, tone = "neutral", value}: {label: string; tone?: "neutral" | "success" | "warning"; value: number}) {
    const valueClass = tone === "success" ? "text-emerald-800" : tone === "warning" ? "text-amber-800" : "text-stone-950";
    return <div className="flex min-h-24 flex-col justify-center rounded-xl border border-stone-200 bg-stone-50 px-4 py-4"><p className={`text-2xl font-semibold ${valueClass}`}>{value}</p><p className="mt-2 text-xs font-medium text-stone-500">{label}</p></div>;
}

function LegendItem({className, label}: {className: string; label: string}) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600">
            <span className={`h-2.5 w-2.5 rounded-full border ${className}`} aria-hidden="true" />
            {label}
        </span>
    );
}

function buildCalendarRange(date: Date) {
    const from = new Date(date);
    from.setDate(from.getDate() - 31);
    from.setHours(0, 0, 0, 0);

    const to = new Date(date);
    to.setDate(to.getDate() + 62);
    to.setHours(23, 59, 59, 999);

    return {
        from: from.toISOString(),
        to: to.toISOString()
    };
}

function buildDefaultForm(): AvailabilityForm {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);

    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    return {
        officeId: "",
        status: "AVAILABLE",
        startsAt: toDateTimeLocalValue(start),
        endsAt: toDateTimeLocalValue(end),
        notes: ""
    };
}

function toDateTimeLocalValue(date: Date) {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    return offsetDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function formatDateTime(value: string, locale: string) {
    const languageTag = locale === "ua" ? "uk" : locale;

    return new Intl.DateTimeFormat(languageTag, {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "short"
    }).format(new Date(value));
}

function formatCalendarTitle(view: CalendarView, currentDate: Date, locale: string) {
    const languageTag = locale === "ua" ? "uk" : locale;

    if (view === "month") {
        return new Intl.DateTimeFormat(languageTag, {month: "long", year: "numeric"}).format(currentDate);
    }
    if (view === "day") {
        return new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "long", weekday: "long"}).format(currentDate);
    }

    const monday = startOfWeek(currentDate);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return `${new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "short"}).format(monday)} – ${new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "short", year: "numeric"}).format(sunday)}`;
}

function startOfWeek(date: Date) {
    const monday = new Date(date);
    const day = monday.getDay();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
    return monday;
}

function navigateDate(date: Date, view: CalendarView, direction: -1 | 1) {
    const next = new Date(date);
    if (view === "month") next.setMonth(next.getMonth() + direction);
    else if (view === "day") next.setDate(next.getDate() + direction);
    else next.setDate(next.getDate() + direction * 7);
    return next;
}
