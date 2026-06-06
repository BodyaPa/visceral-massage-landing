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
    useCreateSpecialistEventMutation,
    useDeleteAvailabilityMutation,
    useListAvailabilityQuery,
    useListSpecialistEventEnrollmentsQuery,
    useListSpecialistEventsQuery,
    useUpdateAvailabilityMutation,
    useUpdateSpecialistEventMutation
} from "@/features/schedule/schedule.api";
import AtaraksiaCalendar, {
    toCalendarView,
    type AtaraksiaCalendarEvent
} from "@/features/schedule/AtaraksiaCalendar";
import type {ScheduleBlockStatus, SpecialistAvailabilityBlock, SpecialistFixedEvent, SpecialistFixedEventEnrollment, SpecialistFixedEventInput} from "@/types/schedule";
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
type ManualBookingSlot = {
    key: string;
    block: SpecialistAvailabilityBlock;
    startsAt: string;
    endsAt: string;
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
    const {data: events = [], isFetching: eventsFetching, isError: eventsError, refetch: refetchEvents} = useListSpecialistEventsQuery(range);
    const {data: eventEnrollments = [], isFetching: eventEnrollmentsFetching, isError: eventEnrollmentsError} = useListSpecialistEventEnrollmentsQuery(range);
    const {data: bookings = [], isFetching: bookingsFetching, isError: bookingsError} = useListSpecialistBookingsQuery(range);
    const {data: officesData, isFetching: officesFetching, isError: officesError} = useListPublicOfficesQuery({size: 100});
    const {data: servicesData, isFetching: servicesFetching, isError: servicesError} = useListServicesQuery({lang: locale as Locale, size: 100});
    const blocks = data ?? emptyBlocks;
    const offices = officesData?.content ?? [];
    const services = servicesData?.content ?? [];
    const [createAvailability, {isLoading: isCreating}] = useCreateAvailabilityMutation();
    const [createSpecialistEvent, {isLoading: isCreatingEvent}] = useCreateSpecialistEventMutation();
    const [updateSpecialistEvent, {isLoading: isUpdatingEvent}] = useUpdateSpecialistEventMutation();
    const [updateAvailability, {isLoading: isUpdatingAvailability}] = useUpdateAvailabilityMutation();
    const [deleteAvailability, {isLoading: isDeleting}] = useDeleteAvailabilityMutation();
    const [selectedView, setSelectedView] = useState<CalendarView>("week");
    const [form, setForm] = useState<AvailabilityForm>(() => buildDefaultForm());
    const [editingBlock, setEditingBlock] = useState<SpecialistAvailabilityBlock | null>(null);
    const [editingEvent, setEditingEvent] = useState<SpecialistFixedEvent | null>(null);
    const availableCount = blocks.filter((block) => block.status === "AVAILABLE" && !block.booked).length;
    const blockedCount = blocks.filter((block) => block.status === "BLOCKED").length;
    const availableBlocks = blocks.filter((block) => block.status === "AVAILABLE");
    const blockedBlocks = blocks.filter((block) => block.status === "BLOCKED");
    const eventServices = services.filter((service) => service.bookingMode === "FIXED_EVENT");
    const individualServices = services.filter((service) => service.bookingMode === "INDIVIDUAL_APPOINTMENT");

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

            const body = {
                officeId: form.officeId ? Number(form.officeId) : null,
                status: form.status,
                startsAt,
                endsAt,
                notes: form.notes.trim() || null
            };

            if (editingBlock) {
                await updateAvailability({id: editingBlock.id, body}).unwrap();
                setEditingBlock(null);
                toast.success(scheduleCopy(locale).availabilityUpdated);
            } else {
                await createAvailability(body).unwrap();
                toast.success(t("form.created"));
            }

            setForm((current) => ({...current, notes: ""}));
        } catch {
            toast.error(t("form.saveError"));
        }
    }

    function editAvailability(block: SpecialistAvailabilityBlock) {
        setEditingBlock(block);
        setForm({
            officeId: block.officeId === null ? "" : String(block.officeId),
            status: block.status,
            startsAt: toDateTimeLocalValue(new Date(block.startsAt)),
            endsAt: toDateTimeLocalValue(new Date(block.endsAt)),
            notes: block.notes ?? ""
        });
        document.getElementById("availability-form")?.scrollIntoView({behavior: "smooth"});
    }

    function cancelAvailabilityEdit() {
        setEditingBlock(null);
        setForm(buildDefaultForm());
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
                    <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("eyebrow")}</p>
                            <h1 className="mt-2 break-words text-2xl font-semibold text-stone-950 sm:text-3xl">{t("title")}</h1>
                            <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-stone-600">{t("description")}</p>
                        </div>
                        <button className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 lg:w-auto" onClick={() => document.getElementById("availability-form")?.scrollIntoView({behavior: "smooth"})} type="button">
                            {t("actions.create")}
                        </button>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <StatCard label={t("stats.available")} value={availableCount} tone="success" />
                        <StatCard label={t("stats.blocked")} value={blockedCount} tone="warning" />
                        <StatCard label={scheduleCopy(locale).eventsTitle} value={events.length} />
                        <StatCard label={t("stats.bookings")} value={bookings.length} />
                    </div>
                </header>

                <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex min-w-0 flex-col gap-3 border-b border-stone-200 bg-stone-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-stone-950">{t("calendar.title")}</h2>
                            <p className="mt-1 break-words text-sm text-stone-500">{formatCalendarTitle(selectedView, currentDate, locale)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800" title={t("calendar.source")}>{isFetching ? t("calendar.loading") : t("calendar.connected")}</span>
                        </div>
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 border-b border-stone-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-1">
                            <button className={controlButtonClass} onClick={() => setCurrentDate((date) => navigateDate(date, selectedView, -1))} type="button">←</button>
                            <button className={controlButtonClass} onClick={() => setCurrentDate(new Date())} type="button">{t("controls.today")}</button>
                            <button className={controlButtonClass} onClick={() => setCurrentDate((date) => navigateDate(date, selectedView, 1))} type="button">→</button>
                        </div>
                        <div className="grid w-full min-w-0 grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 sm:flex sm:w-auto">
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
                        <LegendItem className="border-sky-200 bg-sky-50" label={scheduleCopy(locale).eventsTitle} />
                    </div>

                    {isError ? <p className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("calendar.loadError")}</p> : null}

                    <div className="min-w-0 p-3 sm:p-4">
                        <CalendarSurface bookings={bookings} blocks={blocks} currentDate={currentDate} events={events} locale={locale} onNavigate={setCurrentDate} selectedView={selectedView} t={t} />
                    </div>
                    <p className="border-t border-stone-100 px-4 py-3 text-xs leading-5 text-stone-500">{t("calendar.source")}</p>
                </section>

                <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                    <ScheduleBlockList
                        blocks={availableBlocks}
                        deleting={isDeleting}
                        locale={locale}
                        onDelete={removeAvailability}
                        onEdit={editAvailability}
                        subtitle={scheduleCopy(locale).availabilityListHint}
                        title={scheduleCopy(locale).availabilityTitle}
                        t={t}
                    />
                </section>
                <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                    <ScheduleBlockList
                        blocks={blockedBlocks}
                        deleting={isDeleting}
                        locale={locale}
                        onDelete={removeAvailability}
                        onEdit={editAvailability}
                        subtitle={scheduleCopy(locale).blocksListHint}
                        title={scheduleCopy(locale).blocksTitle}
                        t={t}
                    />
                </section>
            </div>

            <aside className="min-w-0 space-y-5">
                <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm 2xl:sticky 2xl:top-4" id="availability-form">
                    <div className="border-b border-stone-100 pb-3">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                            <h2 className="min-w-0 break-words text-base font-semibold text-stone-950">{editingBlock ? scheduleCopy(locale).editAvailability : form.status === "AVAILABLE" ? t("form.availableTitle") : t("form.blockedTitle")}</h2>
                            {editingBlock ? <button className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100" onClick={cancelAvailabilityEdit} type="button">{scheduleCopy(locale).cancelEdit}</button> : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{t("form.hint")}</p>
                        {editingBlock?.booked ? <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{scheduleCopy(locale).bookedBlockEditHint}</p> : null}
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
                            disabled={isCreating || isUpdatingAvailability}
                            onClick={saveAvailability}
                            type="button"
                        >
                            {isCreating || isUpdatingAvailability ? t("form.saving") : editingBlock ? scheduleCopy(locale).saveAvailability : form.status === "AVAILABLE" ? t("actions.availability") : t("actions.blocking")}
                        </button>
                    </div>
                </section>
                <FixedEventForm
                    copy={scheduleCopy(locale)}
                    editingEvent={editingEvent}
                    isLoading={isCreatingEvent || isUpdatingEvent}
                    offices={offices}
                    officesFetching={officesFetching}
                    onCreate={async (body) => {
                        try {
                            if (editingEvent) {
                                await updateSpecialistEvent({id: editingEvent.id, body}).unwrap();
                                toast.success(scheduleCopy(locale).eventUpdated);
                            } else {
                                await createSpecialistEvent(body).unwrap();
                                toast.success(scheduleCopy(locale).eventCreated);
                            }
                            setEditingEvent(null);
                            void refetchEvents();
                        } catch {
                            toast.error(scheduleCopy(locale).eventError);
                        }
                    }}
                    onCancelEdit={() => setEditingEvent(null)}
                    services={eventServices}
                    servicesFetching={servicesFetching}
                />
                <ManualBookingForm
                    blocks={blocks}
                    bookings={bookings}
                    events={events}
                    locale={locale}
                    services={individualServices}
                    servicesError={servicesError}
                    servicesFetching={servicesFetching}
                    onCreated={refetchAvailability}
                    t={t}
                />
                <EventsPanel
                    copy={scheduleCopy(locale)}
                    events={events}
                    isError={eventsError}
                    isFetching={eventsFetching}
                    locale={locale}
                    onDeactivate={async (event) => {
                        try {
                            await updateSpecialistEvent({id: event.id, body: eventToInput(event, false)}).unwrap();
                            void refetchEvents();
                            toast.success(scheduleCopy(locale).eventUpdated);
                        } catch {
                            toast.error(scheduleCopy(locale).eventError);
                        }
                    }}
                    onEdit={setEditingEvent}
                />
                <EventEnrollmentsPanel
                    copy={scheduleCopy(locale)}
                    enrollments={eventEnrollments}
                    isError={eventEnrollmentsError}
                    isFetching={eventEnrollmentsFetching}
                    locale={locale}
                />
                <BookingsPanel bookings={bookings} isError={bookingsError} isFetching={bookingsFetching} locale={locale} t={t} />
                <PreparedPanel title={t("exceptions.title")} body={t("exceptions.body")} empty={t("exceptions.empty")} />
            </aside>
        </section>
    );
}

type T = ReturnType<typeof useTranslations<"admin.specialist.page">>;

const controlButtonClass = "max-w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white";
const viewClass = "min-w-0 rounded-md px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-white";
const activeViewClass = "min-w-0 rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white shadow-sm";

function CalendarSurface({bookings, blocks, currentDate, events, locale, onNavigate, selectedView, t}: {bookings: SpecialistBooking[]; blocks: SpecialistAvailabilityBlock[]; currentDate: Date; events: SpecialistFixedEvent[]; locale: string; onNavigate: (date: Date) => void; selectedView: CalendarView; t: T}) {
    if (selectedView === "list") {
        return <ScheduleBlockList blocks={blocks} deleting={false} locale={locale} onDelete={() => undefined} t={t} title={scheduleCopy(locale).availabilityTitle} viewOnly />;
    }

    const calendarEvents: AtaraksiaCalendarEvent[] = [
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
        })),
        ...events.map((event) => ({
            id: `event-${event.id}`,
            title: `${event.serviceTitle} · ${event.enrolledCount}/${event.capacity}`,
            start: new Date(event.startsAt),
            end: new Date(event.endsAt),
            tone: "booking" as const
        }))
    ];

    return <AtaraksiaCalendar culture={locale === "ua" ? "uk" : locale} date={currentDate} events={calendarEvents} onNavigate={onNavigate} view={toCalendarView(selectedView)} />;
}

function ScheduleBlockList({
    blocks,
    deleting,
    locale,
    onDelete,
    onEdit,
    subtitle,
    title,
    t,
    viewOnly = false
}: {
    blocks: SpecialistAvailabilityBlock[];
    deleting: boolean;
    locale: string;
    onDelete: (id: number) => void;
    onEdit?: (block: SpecialistAvailabilityBlock) => void;
    subtitle?: string;
    title?: string;
    t: T;
    viewOnly?: boolean;
}) {
    const copy = scheduleCopy(locale);

    return (
        <div className={viewOnly ? "min-w-0 rounded-lg border border-stone-200 bg-white p-3" : "min-w-0"}>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <h3 className="min-w-0 break-words text-sm font-semibold text-stone-900">{title ?? t("blocks.title")}</h3>
                <span className="text-xs text-stone-500">{blocks.length}</span>
            </div>
            {subtitle ? <p className="mt-1 break-words text-xs leading-5 text-stone-500">{subtitle}</p> : null}
            <div className="mt-3 space-y-2">
                {blocks.map((block) => (
                    <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between" key={block.id}>
                        <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <StatusBadge booked={block.booked} status={block.status} t={t} />
                                <span className="break-words text-sm font-medium text-stone-900">
                                    {formatDateTime(block.startsAt, locale)} - {formatDateTime(block.endsAt, locale)}
                                </span>
                            </div>
                            {block.officeName || block.notes ? (
                                <p className="mt-1 break-words text-xs text-stone-500">
                                    {[block.officeName, block.notes].filter(Boolean).join(" · ")}
                                </p>
                            ) : null}
                            {block.status === "AVAILABLE" ? (
                                <p className="mt-1 break-words text-xs text-stone-500">{copy.availabilityCutHint}</p>
                            ) : (
                                <p className="mt-1 break-words text-xs text-amber-700">{copy.blockCutHint}</p>
                            )}
                            {block.booked ? <p className="mt-1 break-words text-xs text-amber-700">{copy.bookedBlockLocked}</p> : null}
                        </div>
                        {!viewOnly ? (
                            <div className="flex flex-wrap gap-2">
                                {onEdit ? (
                                    <button
                                        className="w-fit rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100"
                                        onClick={() => onEdit(block)}
                                        type="button"
                                    >
                                        {copy.editBlock}
                                    </button>
                                ) : null}
                                <button
                                    className="w-fit rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                                    disabled={deleting || block.booked}
                                    onClick={() => onDelete(block.id)}
                                    title={block.booked ? copy.bookedBlockLocked : undefined}
                                    type="button"
                                >
                                    {t("blocks.delete")}
                                </button>
                            </div>
                        ) : null}
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
        <span className={`max-w-full break-words rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
            {booked ? t("statuses.booked") : status === "AVAILABLE" ? t("statuses.available") : t("statuses.blocked")}
        </span>
    );
}

function Field({children, help, label}: {children: ReactNode; help?: string; label: string}) {
    return (
        <label className="block min-w-0">
            <span className="mb-1 flex min-w-0 flex-wrap items-center gap-1 break-words text-xs font-medium uppercase tracking-wide text-stone-500">{label}{help ? <span className="cursor-help text-stone-400" title={help}>ⓘ</span> : null}</span>
            {children}
        </label>
    );
}

function PreparedPanel({body, empty, title}: {body: string; empty: string; title: string}) {
    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 break-words text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2><span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">0</span></div>
            <p className="mt-2 break-words text-xs leading-5 text-stone-500">{body}</p>
            <p className="mt-3 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">{empty}</p>
        </section>
    );
}

function FixedEventForm({
    copy,
    editingEvent,
    isLoading,
    offices,
    officesFetching,
    onCancelEdit,
    onCreate,
    services,
    servicesFetching
}: {
    copy: ReturnType<typeof scheduleCopy>;
    editingEvent: SpecialistFixedEvent | null;
    isLoading: boolean;
    offices: Array<{id: number; name: string}>;
    officesFetching: boolean;
    onCancelEdit: () => void;
    onCreate: (body: SpecialistFixedEventInput) => Promise<void>;
    services: PublicService[];
    servicesFetching: boolean;
}) {
    const [serviceId, setServiceId] = useState("");
    const [officeId, setOfficeId] = useState("");
    const [startsAt, setStartsAt] = useState(() => toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
    const [endsAt, setEndsAt] = useState(() => toDateTimeLocalValue(new Date(Date.now() + 25.5 * 60 * 60 * 1000)));
    const [capacity, setCapacity] = useState(5);
    const [note, setNote] = useState("");
    const [active, setActive] = useState(true);

    useEffect(() => {
        if (!editingEvent) return;
        setServiceId(String(editingEvent.serviceId));
        setOfficeId(editingEvent.officeId === null ? "" : String(editingEvent.officeId));
        setStartsAt(toDateTimeLocalValue(new Date(editingEvent.startsAt)));
        setEndsAt(toDateTimeLocalValue(new Date(editingEvent.endsAt)));
        setCapacity(editingEvent.capacity);
        setNote(editingEvent.note ?? "");
        setActive(editingEvent.active);
    }, [editingEvent]);

    async function submit() {
        const startsAtIso = toIsoDateTime(startsAt);
        const endsAtIso = toIsoDateTime(endsAt);
        if (!serviceId || !startsAtIso || !endsAtIso) return;
        await onCreate({
            serviceId: Number(serviceId),
            officeId: officeId ? Number(officeId) : null,
            startsAt: startsAtIso,
            endsAt: endsAtIso,
            capacity,
            note: note.trim() || null,
            active
        });
        setNote("");
    }

    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0 break-words text-sm font-semibold uppercase tracking-wide text-stone-500">{editingEvent ? copy.editEvent : copy.eventsTitle}</h2>
                {editingEvent ? <button className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100" onClick={onCancelEdit} type="button">{copy.cancelEdit}</button> : null}
            </div>
            <p className="mt-2 break-words text-xs leading-5 text-stone-500">{copy.eventFormHint}</p>
            <div className="mt-4 space-y-3">
                <Field label={copy.eventService}>
                    <select className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" disabled={servicesFetching} onChange={(event) => setServiceId(event.target.value)} value={serviceId}>
                        <option value="">{servicesFetching ? copy.loading : copy.selectEventService}</option>
                        {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
                    </select>
                </Field>
                <Field label={copy.office}>
                    <select className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" disabled={officesFetching} onChange={(event) => setOfficeId(event.target.value)} value={officeId}>
                        <option value="">{copy.noOffice}</option>
                        {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
                    </select>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={copy.startsAt}>
                        <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => setStartsAt(event.target.value)} type="datetime-local" value={startsAt} />
                    </Field>
                    <Field label={copy.endsAt}>
                        <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => setEndsAt(event.target.value)} type="datetime-local" value={endsAt} />
                    </Field>
                </div>
                <Field label={copy.capacity}>
                    <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" min={1} onChange={(event) => setCapacity(Number(event.target.value))} type="number" value={capacity} />
                </Field>
                <Field label={copy.note}>
                    <textarea className="min-h-20 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" maxLength={1000} onChange={(event) => setNote(event.target.value)} value={note} />
                </Field>
                <label className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                    <span className="min-w-0 break-words">{copy.active}</span>
                    <input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />
                </label>
                <button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={isLoading || !serviceId || capacity < 1} onClick={submit} type="button">
                    {isLoading ? copy.saving : editingEvent ? copy.saveEvent : copy.createEvent}
                </button>
            </div>
        </section>
    );
}

function EventsPanel({copy, events, isError, isFetching, locale, onDeactivate, onEdit}: {copy: ReturnType<typeof scheduleCopy>; events: SpecialistFixedEvent[]; isError: boolean; isFetching: boolean; locale: string; onDeactivate: (event: SpecialistFixedEvent) => void; onEdit: (event: SpecialistFixedEvent) => void}) {
    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0 break-words text-sm font-semibold uppercase tracking-wide text-stone-500">{copy.eventsTitle}</h2>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">{events.length}</span>
            </div>
            <p className="mt-2 break-words text-xs leading-5 text-stone-500">{copy.eventsBody}</p>
            {isFetching ? <p className="mt-3 text-sm text-stone-500">{copy.loading}</p> : null}
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copy.eventsError}</p> : null}
            <div className="mt-3 space-y-2">
                {events.slice(0, 6).map((event) => (
                    <article className="rounded-lg border border-stone-200 bg-stone-50 p-3" key={event.id}>
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="break-words text-sm font-semibold text-stone-900">{event.serviceTitle}</p>
                                <p className="mt-0.5 break-words text-xs text-stone-500">{event.officeName ?? copy.noOffice}</p>
                            </div>
                            <span className={event.active ? "shrink-0 rounded-full border border-stone-200 bg-white px-2 py-1 text-[10px] font-semibold text-stone-600" : "shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"}>{event.active ? `${event.enrolledCount}/${event.capacity}` : copy.inactive}</span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-stone-700">{formatDateTime(event.startsAt, locale)} - {formatDateTime(event.endsAt, locale)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button className="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100" onClick={() => onEdit(event)} type="button">{copy.editEvent}</button>
                            {event.active ? <button className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100" onClick={() => onDeactivate(event)} type="button">{copy.deactivateEvent}</button> : null}
                        </div>
                    </article>
                ))}
                {!isFetching && events.length === 0 ? <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">{copy.eventsEmpty}</p> : null}
            </div>
        </section>
    );
}

function EventEnrollmentsPanel({copy, enrollments, isError, isFetching, locale}: {copy: ReturnType<typeof scheduleCopy>; enrollments: SpecialistFixedEventEnrollment[]; isError: boolean; isFetching: boolean; locale: string}) {
    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0 break-words text-sm font-semibold uppercase tracking-wide text-stone-500">{copy.eventEnrollmentsTitle}</h2>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">{enrollments.length}</span>
            </div>
            <p className="mt-2 break-words text-xs leading-5 text-stone-500">{copy.eventEnrollmentsBody}</p>
            {isFetching ? <p className="mt-3 text-sm text-stone-500">{copy.loading}</p> : null}
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copy.eventEnrollmentsError}</p> : null}
            <div className="mt-3 space-y-2">
                {enrollments.slice(0, 8).map((enrollment) => (
                    <article className="rounded-lg border border-stone-200 bg-stone-50 p-3" key={enrollment.id}>
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="break-words text-sm font-semibold text-stone-900">{enrollment.clientName}</p>
                                <p className="mt-0.5 break-words text-xs text-stone-500">{enrollment.clientContact || copy.noClientContact}</p>
                            </div>
                            <span className={enrollment.status === "ACTIVE" ? "shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800" : "shrink-0 rounded-full border border-stone-200 bg-white px-2 py-1 text-[10px] font-semibold text-stone-500"}>
                                {enrollment.status === "ACTIVE" ? copy.enrollmentActive : copy.enrollmentCancelled}
                            </span>
                        </div>
                        <p className="mt-2 break-words text-xs font-medium text-stone-700">{enrollment.eventTitle}</p>
                        <p className="mt-1 break-words text-xs text-stone-500">{formatDateTime(enrollment.eventStartsAt, locale)} - {formatTime(enrollment.eventEndsAt, locale)}</p>
                        {enrollment.reminderOptIn ? <p className="mt-2 text-xs text-stone-500">{copy.reminderRequested}</p> : null}
                    </article>
                ))}
                {!isFetching && enrollments.length === 0 ? <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">{copy.eventEnrollmentsEmpty}</p> : null}
            </div>
        </section>
    );
}

function ManualBookingForm({
    blocks,
    bookings,
    events,
    locale,
    onCreated,
    services,
    servicesError,
    servicesFetching,
    t
}: {
    blocks: SpecialistAvailabilityBlock[];
    bookings: SpecialistBooking[];
    events: SpecialistFixedEvent[];
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
    const [selectedSlotKey, setSelectedSlotKey] = useState("");
    const [serviceId, setServiceId] = useState("");
    const [reminderOptIn, setReminderOptIn] = useState(false);
    const selectedService = services.find((service) => String(service.id) === serviceId);
    const manualSlots = useMemo(() => buildManualBookingSlots(blocks, bookings, events, selectedService), [blocks, bookings, events, selectedService]);
    const selectedSlot = manualSlots.find((slot) => slot.key === selectedSlotKey);
    const copy = scheduleCopy(locale);

    async function submit() {
        if (!selectedSlot) return;
        try {
            await createManualBooking({
                clientIdentifier: clientIdentifier.trim(),
                availabilityBlockId: selectedSlot.block.id,
                serviceId: Number(serviceId),
                startsAt: selectedSlot.startsAt,
                reminderOptIn
            }).unwrap();
            setClientIdentifier("");
            setSelectedSlotKey("");
            setReminderOptIn(false);
            onCreated();
            toast.success(t("manualBooking.created"));
        } catch {
            toast.error(t("manualBooking.error"));
        }
    }

    const disabled = isLoading || !clientIdentifier.trim() || !selectedSlot || !serviceId;

    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="break-words text-sm font-semibold uppercase tracking-wide text-stone-500">{t("manualBooking.title")}</h2>
            <p className="mt-2 break-words text-xs leading-5 text-stone-500">{t("manualBooking.body")}</p>
            <p className="mt-2 break-words rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">{copy.manualSlotCutHint}</p>
            <div className="mt-4 space-y-3">
                <Field label={t("manualBooking.client")}>
                    <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => setClientIdentifier(event.target.value)} placeholder={t("manualBooking.clientPlaceholder")} value={clientIdentifier} />
                </Field>
                <Field label={t("manualBooking.service")}>
                    <select
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                        disabled={servicesFetching}
                        onChange={(event) => {
                            setServiceId(event.target.value);
                            setSelectedSlotKey("");
                        }}
                        value={serviceId}
                    >
                        <option value="">{servicesFetching ? t("manualBooking.loadingServices") : t("manualBooking.selectService")}</option>
                        {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
                    </select>
                    {servicesError ? <span className="mt-1 block text-xs text-red-700">{t("manualBooking.servicesError")}</span> : null}
                </Field>
                <Field label={t("manualBooking.slot")}>
                    <select className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" disabled={!selectedService} onChange={(event) => setSelectedSlotKey(event.target.value)} value={selectedSlotKey}>
                        <option value="">{t("manualBooking.selectSlot")}</option>
                        {manualSlots.map((slot) => <option key={slot.key} value={slot.key}>{formatDateTime(slot.startsAt, locale)} - {formatTime(slot.endsAt, locale)} · {slot.block.officeName ?? t("form.noOffice")}</option>)}
                    </select>
                </Field>
                <label className="flex min-w-0 items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700">
                    <input checked={reminderOptIn} className="mt-0.5" onChange={(event) => setReminderOptIn(event.target.checked)} type="checkbox" />
                    <span className="min-w-0"><strong className="block break-words font-medium text-stone-900">{t("manualBooking.reminder")}</strong><span className="mt-1 block break-words text-xs leading-5 text-stone-500">{t("manualBooking.reminderHint")}</span></span>
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
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <h2 className="min-w-0 break-words text-sm font-semibold uppercase tracking-wide text-stone-500">{t("bookings.title")}</h2>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">{bookings.length}</span>
            </div>
            <p className="mt-2 break-words text-xs leading-5 text-stone-500">{t("bookings.body")}</p>
            {isFetching ? <p className="mt-3 text-sm text-stone-500">{t("bookings.loading")}</p> : null}
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("bookings.loadError")}</p> : null}
            {!isFetching && !isError && bookings.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">{t("bookings.empty")}</p> : null}
            {bookings.length > 0 ? (
                <div className="mt-3 space-y-2">
                    {bookings.slice(0, 6).map((booking) => (
                        <article className="rounded-lg border border-stone-200 bg-stone-50 p-3" key={booking.id}>
                            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-semibold text-stone-900">{booking.clientName}</p>
                                    <p className="mt-0.5 break-words text-xs text-stone-500">{booking.serviceTitleUa}</p>
                                </div>
                                <BookingStatusBadge status={booking.status} t={t} />
                            </div>
                            <p className="mt-2 break-words text-xs font-medium text-stone-700">{formatDateTime(booking.startsAt, locale)}</p>
                            <p className="mt-1 break-words text-xs text-stone-500">{[booking.officeName, booking.clientContact].filter(Boolean).join(" · ")}</p>
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
    return <span className={`max-w-full break-words rounded-full border px-2 py-1 text-[10px] font-semibold sm:shrink-0 ${className}`}>{t(`bookings.statuses.${status}`)}</span>;
}

function StatCard({label, tone = "neutral", value}: {label: string; tone?: "neutral" | "success" | "warning"; value: number}) {
    const valueClass = tone === "success" ? "text-emerald-800" : tone === "warning" ? "text-amber-800" : "text-stone-950";
    return <div className="flex min-h-24 min-w-0 flex-col justify-center rounded-xl border border-stone-200 bg-stone-50 px-4 py-4"><p className={`break-words text-2xl font-semibold ${valueClass}`}>{value}</p><p className="mt-2 break-words text-xs font-medium text-stone-500">{label}</p></div>;
}

function LegendItem({className, label}: {className: string; label: string}) {
    return (
        <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600">
            <span className={`h-2.5 w-2.5 rounded-full border ${className}`} aria-hidden="true" />
            <span className="min-w-0 break-words">{label}</span>
        </span>
    );
}

function eventToInput(event: SpecialistFixedEvent, active: boolean): SpecialistFixedEventInput {
    return {
        serviceId: event.serviceId,
        officeId: event.officeId,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        capacity: event.capacity,
        note: event.note,
        active
    };
}

function scheduleCopy(locale: string) {
    const ua = locale === "ua";
    return {
        availabilityTitle: ua ? "Доступність для індивідуальних записів" : "Individual appointment availability",
        blocksTitle: ua ? "Блокування / відпустка" : "Blocks / vacation",
        eventsTitle: ua ? "Події / групові сеанси" : "Events / group sessions",
        eventsBody: ua ? "Конкретні події з фіксованим часом і кількістю місць." : "Concrete sessions with fixed time and capacity.",
        eventFormHint: ua ? "Створіть подію, на яку користувачі записуються без вибору окремого слоту." : "Create a fixed session users enroll into directly.",
        eventService: ua ? "Послуга / подія" : "Service / event",
        selectEventService: ua ? "Оберіть event-послугу" : "Select event service",
        office: ua ? "Офіс" : "Office",
        noOffice: ua ? "Без офісу" : "No office",
        startsAt: ua ? "Початок" : "Start",
        endsAt: ua ? "Кінець" : "End",
        capacity: ua ? "Кількість місць" : "Capacity",
        note: ua ? "Опис / нотатка" : "Description / note",
        createEvent: ua ? "Створити подію" : "Create event",
        saveEvent: ua ? "Зберегти подію" : "Save event",
        editEvent: ua ? "Редагувати" : "Edit",
        cancelEdit: ua ? "Скасувати редагування" : "Cancel edit",
        deactivateEvent: ua ? "Вимкнути" : "Deactivate",
        active: ua ? "Активна подія" : "Active event",
        inactive: ua ? "Вимкнено" : "Inactive",
        saving: ua ? "Збереження..." : "Saving...",
        loading: ua ? "Завантаження..." : "Loading...",
        eventCreated: ua ? "Подію створено." : "Event created.",
        eventUpdated: ua ? "Подію оновлено." : "Event updated.",
        eventError: ua ? "Не вдалося створити подію." : "Unable to create event.",
        eventsError: ua ? "Не вдалося завантажити події." : "Unable to load events.",
        eventsEmpty: ua ? "Подій у цьому періоді ще немає." : "No events in this range yet.",
        eventEnrollmentsTitle: ua ? "Учасники подій" : "Event participants",
        eventEnrollmentsBody: ua ? "Записи користувачів на ваші fixed events у вибраному періоді." : "User enrollments for your fixed events in the selected range.",
        eventEnrollmentsError: ua ? "Не вдалося завантажити учасників подій." : "Unable to load event participants.",
        eventEnrollmentsEmpty: ua ? "У цьому періоді ще немає записів на події." : "No event enrollments in this range yet.",
        enrollmentActive: ua ? "Записаний" : "Enrolled",
        enrollmentCancelled: ua ? "Скасовано" : "Cancelled",
        noClientContact: ua ? "Контакт не вказано" : "No contact",
        reminderRequested: ua ? "Нагадування увімкнено" : "Reminder requested",
        editAvailability: ua ? "Редагування графіка" : "Edit schedule block",
        saveAvailability: ua ? "Зберегти зміни" : "Save changes",
        availabilityUpdated: ua ? "Графік оновлено." : "Schedule block updated.",
        editBlock: ua ? "Редагувати" : "Edit",
        availabilityListHint: ua ? "Це робочі вікна для індивідуальних записів. Бронювання, події й блокування автоматично вирізають із них час." : "These are working windows for individual appointments. Bookings, events and blocks automatically cut time out of them.",
        blocksListHint: ua ? "Ці періоди недоступні для індивідуальних записів і не є подіями для клієнтів." : "These periods are unavailable for individual appointments and are not client-facing events.",
        availabilityCutHint: ua ? "Вільні слоти генеруються всередині цього вікна." : "Free slots are generated inside this window.",
        blockCutHint: ua ? "Цей час буде недоступний у публічному календарі." : "This time will be unavailable in the public calendar.",
        manualSlotCutHint: ua ? "Слоти нижче рахуються з availability windows; бронювання, події та блокування прибирають зайнятий час зі списку." : "Slots below are calculated from availability windows; bookings, events and blocks remove occupied time from the list.",
        bookedBlockLocked: ua ? "Є історія бронювань: видалення заблоковане, час/тип/офіс краще не змінювати." : "Booking history exists: deletion is locked, and time/type/office should not be changed.",
        bookedBlockEditHint: ua ? "У цьому блоці є історія бронювань. Можна оновити нотатку, але backend не дозволить змінити час, тип або офіс." : "This block has booking history. You can update the note, but the backend will reject time, type or office changes."
    };
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

function buildManualBookingSlots(blocks: SpecialistAvailabilityBlock[], bookings: SpecialistBooking[], events: SpecialistFixedEvent[], service?: PublicService): ManualBookingSlot[] {
    if (!service) return [];

    const now = Date.now();
    const activeBookings = bookings.filter((booking) => booking.status !== "CANCELLED");
    const activeEvents = events.filter((event) => event.active);
    const blockedBlocks = blocks.filter((block) => block.status === "BLOCKED");
    const slots: ManualBookingSlot[] = [];

    for (const block of blocks) {
        if (block.status !== "AVAILABLE") continue;

        const blockEnd = new Date(block.endsAt);
        const slotStart = new Date(block.startsAt);

        while (slotStart.getTime() < blockEnd.getTime()) {
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + service.durationMinutes);

            if (slotEnd.getTime() > blockEnd.getTime()) break;

            const overlapsBooking = activeBookings.some((booking) => overlaps(slotStart, slotEnd, new Date(booking.startsAt), new Date(booking.endsAt)));
            const overlapsEvent = activeEvents.some((event) => overlaps(slotStart, slotEnd, new Date(event.startsAt), new Date(event.endsAt)));
            const overlapsBlocked = blockedBlocks.some((blocked) => overlaps(slotStart, slotEnd, new Date(blocked.startsAt), new Date(blocked.endsAt)));

            if (slotStart.getTime() > now && !overlapsBooking && !overlapsEvent && !overlapsBlocked) {
                const startsAt = slotStart.toISOString();
                slots.push({
                    key: `${block.id}-${startsAt}`,
                    block,
                    startsAt,
                    endsAt: slotEnd.toISOString()
                });
            }

            slotStart.setMinutes(slotStart.getMinutes() + service.durationMinutes);
        }
    }

    return slots.sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
}

function overlaps(firstStart: Date, firstEnd: Date, secondStart: Date, secondEnd: Date) {
    return firstStart < secondEnd && secondStart < firstEnd;
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

function formatTime(value: string, locale: string) {
    const languageTag = locale === "ua" ? "uk" : locale;

    return new Intl.DateTimeFormat(languageTag, {
        hour: "2-digit",
        minute: "2-digit"
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
