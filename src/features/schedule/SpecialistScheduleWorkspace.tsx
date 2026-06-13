"use client";

import {useEffect, useMemo, useState} from "react";
import type {ReactNode} from "react";
import {useLocale, useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateManualBookingMutation, useGetSpecialistFinanceOverviewQuery, useListSpecialistBookingsQuery} from "@/features/bookings/bookings.api";
import {bookingServiceTitle} from "@/features/bookings/bookingTitles";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {useListServicesQuery} from "@/features/services/services.api";
import {useListUsersQuery} from "@/features/users/users.api";
import {
    useCreateAvailabilityMutation,
    useCopyDayPlanMutation,
    useCreateSpecialistEventMutation,
    useDeleteAvailabilityMutation,
    useGetScheduleConfigQuery,
    useListAvailabilityQuery,
    useListSpecialistEventEnrollmentsQuery,
    useListSpecialistEventsQuery,
    useUpdateAvailabilityMutation,
    useUpdateSpecialistEventMutation
} from "@/features/schedule/schedule.api";
import AtaraksiaCalendar, {
    toCalendarView,
    type AtaraksiaCalendarEvent,
    type AtaraksiaCalendarMessages
} from "@/features/schedule/AtaraksiaCalendar";
import type {DayPlanCopyConflict, DayPlanCopyInput, DayPlanCopyResponse, ScheduleBlockStatus, ScheduleBlockType, SpecialistAvailabilityBlock, SpecialistFixedEvent, SpecialistFixedEventEnrollment, SpecialistFixedEventInput} from "@/types/schedule";
import type {SpecialistBooking, SpecialistFinanceOverview} from "@/types/bookings";
import type {PublicService} from "@/types/services";
import type {AdminUser} from "@/types/users";
import type {Locale} from "@/i18n";

const views = ["month", "week", "day", "list"] as const;
const emptyBlocks: SpecialistAvailabilityBlock[] = [];
const defaultAppointmentBufferMinutes = 30;
type CalendarView = typeof views[number];
type PlannerMode = "plan" | "bookings" | "agenda";

type Props = {
    canManageAllSpecialists: boolean;
    currentUserId: number;
};

type AvailabilityForm = {
    officeId: string;
    status: ScheduleBlockStatus;
    itemType: ScheduleBlockType;
    serviceId: string;
    capacity: number;
    startsAt: string;
    endsAt: string;
    notes: string;
};
type CalendarFilterState = {
    officeId: number | "";
    serviceId: number | "";
    itemType: "all" | ScheduleBlockType | "BOOKING" | "FIXED_EVENT" | "BUFFER";
    status: "all" | ScheduleBlockStatus | SpecialistBooking["status"] | "ACTIVE_EVENT" | "INACTIVE_EVENT";
};
type CalendarDetail = {
    title: string;
    tone: "available" | "blocked" | "booking" | "event" | "buffer";
    rows: Array<{label: string; value: string}>;
};
type CalendarBuffer = {
    id: string;
    startsAt: string;
    endsAt: string;
    specialistName: string;
    officeId: number | null;
    officeName: string | null;
};
type ManualBookingSlot = {
    key: string;
    block: SpecialistAvailabilityBlock;
    startsAt: string;
    endsAt: string;
};

export default function SpecialistScheduleWorkspace({canManageAllSpecialists, currentUserId}: Props) {
    const t = useTranslations("admin.specialist.page");
    const locale = useLocale();
    const copy = scheduleCopy(t);
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [selectedSpecialistId, setSelectedSpecialistId] = useState<number | "">(canManageAllSpecialists ? "" : currentUserId);
    const range = useMemo(() => buildCalendarRange(currentDate), [currentDate]);
    const scheduleQuery = useMemo(() => ({
        ...range,
        specialistId: selectedSpecialistId
    }), [range, selectedSpecialistId]);
    const {data, isFetching, isError, refetch: refetchAvailability} = useListAvailabilityQuery(scheduleQuery, {
        pollingInterval: 30_000,
        skipPollingIfUnfocused: true
    });
    const {data: events = [], isFetching: eventsFetching, isError: eventsError, refetch: refetchEvents} = useListSpecialistEventsQuery(scheduleQuery);
    const {data: eventEnrollments = [], isFetching: eventEnrollmentsFetching, isError: eventEnrollmentsError} = useListSpecialistEventEnrollmentsQuery(scheduleQuery);
    const {data: bookings = [], isFetching: bookingsFetching, isError: bookingsError} = useListSpecialistBookingsQuery(scheduleQuery);
    const {data: financeOverview, isFetching: financeOverviewFetching, isError: financeOverviewError} = useGetSpecialistFinanceOverviewQuery(range);
    const {data: specialistsData, isFetching: specialistsFetching, isError: specialistsError} = useListUsersQuery(
        {role: "SPECIALIST", enabled: true, size: 100},
        {skip: !canManageAllSpecialists}
    );
    const {data: officesData, isFetching: officesFetching, isError: officesError} = useListPublicOfficesQuery({size: 100});
    const {data: servicesData, isFetching: servicesFetching, isError: servicesError} = useListServicesQuery({lang: locale as Locale, size: 100});
    const {data: scheduleConfig} = useGetScheduleConfigQuery();
    const blocks = data ?? emptyBlocks;
    const offices = officesData?.content ?? [];
    const services = servicesData?.content ?? [];
    const specialists = specialistsData?.content ?? [];
    const [createAvailability, {isLoading: isCreating}] = useCreateAvailabilityMutation();
    const [copyDayPlan, {isLoading: isCopyingDayPlan}] = useCopyDayPlanMutation();
    const [createSpecialistEvent, {isLoading: isCreatingEvent}] = useCreateSpecialistEventMutation();
    const [updateSpecialistEvent, {isLoading: isUpdatingEvent}] = useUpdateSpecialistEventMutation();
    const [updateAvailability, {isLoading: isUpdatingAvailability}] = useUpdateAvailabilityMutation();
    const [deleteAvailability, {isLoading: isDeleting}] = useDeleteAvailabilityMutation();
    const [selectedView, setSelectedView] = useState<CalendarView>("week");
    const [plannerMode, setPlannerMode] = useState<PlannerMode>("plan");
    const [form, setForm] = useState<AvailabilityForm>(() => buildDefaultForm());
    const [editingBlock, setEditingBlock] = useState<SpecialistAvailabilityBlock | null>(null);
    const [editingEvent, setEditingEvent] = useState<SpecialistFixedEvent | null>(null);
    const [calendarFilters, setCalendarFilters] = useState<CalendarFilterState>({officeId: "", serviceId: "", itemType: "all", status: "all"});
    const [selectedCalendarDetail, setSelectedCalendarDetail] = useState<CalendarDetail | null>(null);
    const availableCount = blocks.filter((block) => block.status === "AVAILABLE" && !block.booked).length;
    const blockedCount = blocks.filter((block) => block.status === "BLOCKED").length;
    const availableBlocks = blocks.filter((block) => block.status === "AVAILABLE");
    const blockedBlocks = blocks.filter((block) => block.status === "BLOCKED");
    const eventServices = services.filter((service) => service.bookingMode === "FIXED_EVENT");
    const individualServices = services.filter((service) => service.bookingMode === "INDIVIDUAL_APPOINTMENT");
    const appointmentBufferMinutes = scheduleConfig?.appointmentBufferMinutes ?? defaultAppointmentBufferMinutes;
    const filteredCalendarBlocks = useMemo(() => filterCalendarBlocks(blocks, calendarFilters), [blocks, calendarFilters]);
    const filteredCalendarEvents = useMemo(() => filterCalendarEvents(events, calendarFilters), [events, calendarFilters]);
    const filteredCalendarBookings = useMemo(() => filterCalendarBookings(bookings, calendarFilters), [bookings, calendarFilters]);
    const filteredCalendarBuffers = useMemo(() => filterCalendarBuffers(buildCalendarBuffers(bookings, events, appointmentBufferMinutes), calendarFilters), [bookings, events, appointmentBufferMinutes, calendarFilters]);

    useEffect(() => {
        const mobileQuery = window.matchMedia("(max-width: 639px)");

        if (mobileQuery.matches) {
            setSelectedView("list");
            setPlannerMode("agenda");
        }
    }, []);

    function updateForm<K extends keyof AvailabilityForm>(field: K, value: AvailabilityForm[K]) {
        setForm((current) => ({...current, [field]: value}));
    }

    function updateCalendarFilter<K extends keyof CalendarFilterState>(field: K, value: CalendarFilterState[K]) {
        setCalendarFilters((current) => ({...current, [field]: value}));
    }

    function updateSlotService(serviceId: string) {
        const service = individualServices.find((item) => String(item.id) === serviceId);
        setForm((current) => {
            if (!service) {
                return {...current, serviceId};
            }
            const start = new Date(current.startsAt);
            if (Number.isNaN(start.getTime())) {
                return {...current, serviceId};
            }
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + service.durationMinutes);
            return {...current, serviceId, endsAt: toDateTimeLocalValue(end)};
        });
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
                specialistId: selectedSpecialistId === "" ? null : selectedSpecialistId,
                status: form.status,
                itemType: form.status === "BLOCKED" ? "BLOCK" : form.itemType,
                serviceId: form.status === "AVAILABLE" && form.itemType === "APPOINTMENT_SLOT" && form.serviceId ? Number(form.serviceId) : null,
                capacity: form.status === "AVAILABLE" && form.itemType === "APPOINTMENT_SLOT" ? form.capacity : null,
                startsAt,
                endsAt,
                notes: form.notes.trim() || null
            };

            if (editingBlock) {
                await updateAvailability({id: editingBlock.id, body}).unwrap();
                setEditingBlock(null);
                toast.success(copy.availabilityUpdated);
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
            itemType: block.itemType,
            serviceId: block.serviceId === null ? "" : String(block.serviceId),
            capacity: block.capacity ?? 1,
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
	                        <div className="flex w-full min-w-0 flex-col gap-2 lg:w-72">
	                            {canManageAllSpecialists ? (
	                                <label className="block min-w-0">
	                                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">{copy.specialistFilter}</span>
	                                    <select
	                                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-700"
	                                        disabled={specialistsFetching}
	                                        onChange={(event) => setSelectedSpecialistId(event.target.value ? Number(event.target.value) : "")}
	                                        value={selectedSpecialistId}
	                                    >
	                                        <option value="">{specialistsFetching ? copy.loading : copy.allSpecialists}</option>
	                                        {specialists.map((specialist) => (
	                                            <option key={specialist.id} value={specialist.id}>
	                                                {userDisplayName(specialist)}
	                                            </option>
	                                        ))}
	                                    </select>
	                                    {specialistsError ? <span className="mt-1 block text-xs text-red-700">{copy.specialistsError}</span> : null}
	                                </label>
	                            ) : null}
	                            <button className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700" onClick={() => document.getElementById("availability-form")?.scrollIntoView({behavior: "smooth"})} type="button">
	                                {t("actions.create")}
	                            </button>
	                        </div>
	                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label={t("stats.available")} value={availableCount} tone="success" />
                        <StatCard label={t("stats.blocked")} value={blockedCount} tone="warning" />
                        <StatCard label={copy.eventsTitle} value={events.length} />
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
                    <PlannerModeSwitch copy={copy} mode={plannerMode} onChange={setPlannerMode} />
                    <CalendarFilters
                        copy={copy}
                        filters={calendarFilters}
                        offices={offices}
                        onChange={updateCalendarFilter}
                        onReset={() => setCalendarFilters({officeId: "", serviceId: "", itemType: "all", status: "all"})}
                        services={services}
                    />
                        <div className="flex flex-wrap gap-2 border-b border-stone-200 px-4 py-3">
                            <LegendItem className="border-emerald-200 bg-emerald-50" label={t("legend.available")} />
                            <LegendItem className="border-amber-200 bg-amber-50" label={t("legend.blocked")} />
                            <LegendItem className="border-stone-400 bg-stone-700" label={t("legend.booking")} />
                            <LegendItem className="border-sky-200 bg-sky-50" label={copy.eventsTitle} />
                            <LegendItem className="border-stone-300 bg-stone-100" label={copy.buffer} />
                        </div>

                    {isError ? <p className="m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{t("calendar.loadError")}</p> : null}

                    <div className="min-w-0 p-3 sm:p-4">
                        <CalendarSurface
                            bookings={filteredCalendarBookings}
                            blocks={filteredCalendarBlocks}
                            buffers={filteredCalendarBuffers}
                            currentDate={currentDate}
                            events={filteredCalendarEvents}
                            locale={locale}
                            onNavigate={setCurrentDate}
                            onSelectDetail={setSelectedCalendarDetail}
                            plannerMode={plannerMode}
                            selectedView={selectedView}
                            copy={copy}
                            t={t}
                        />
                    </div>
                    <p className="border-t border-stone-100 px-4 py-3 text-xs leading-5 text-stone-500">{t("calendar.source")}</p>
                </section>
                {selectedCalendarDetail ? <CalendarDetailPanel closeLabel={copy.closeDetails} detail={selectedCalendarDetail} onClose={() => setSelectedCalendarDetail(null)} /> : null}

                <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                    <ScheduleBlockList
                        blocks={availableBlocks}
                        deleting={isDeleting}
                        locale={locale}
                        onDelete={removeAvailability}
                        onEdit={editAvailability}
                        subtitle={copy.availabilityListHint}
                        title={copy.availabilityTitle}
                        copy={copy}
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
                        subtitle={copy.blocksListHint}
                        title={copy.blocksTitle}
                        copy={copy}
                        t={t}
                    />
                </section>
            </div>

            <aside className="min-w-0 space-y-5">
                <SpecialistFinanceOverviewPanel copy={copy} isError={financeOverviewError} isFetching={financeOverviewFetching} locale={locale} overview={financeOverview} />
                <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm 2xl:sticky 2xl:top-4" id="availability-form">
                    <div className="border-b border-stone-100 pb-3">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                            <h2 className="min-w-0 break-words text-base font-semibold text-stone-950">{editingBlock ? copy.editAvailability : form.status === "AVAILABLE" ? t("form.availableTitle") : t("form.blockedTitle")}</h2>
                            {editingBlock ? <button className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100" onClick={cancelAvailabilityEdit} type="button">{copy.cancelEdit}</button> : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{t("form.hint")}</p>
                        {editingBlock?.booked ? <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{copy.bookedBlockEditHint}</p> : null}
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
                        {form.status === "AVAILABLE" ? (
                            <Field label={copy.itemType}>
                                <select
                                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                    onChange={(event) => updateForm("itemType", event.target.value as ScheduleBlockType)}
                                    value={form.itemType}
                                >
                                    <option value="APPOINTMENT_SLOT">{copy.appointmentSlot}</option>
                                    <option value="OPEN_RANGE">{copy.openRange}</option>
                                </select>
                            </Field>
                        ) : null}
                        {form.status === "AVAILABLE" && form.itemType === "APPOINTMENT_SLOT" ? (
                            <>
                                <Field label={copy.slotService}>
                                    <select
                                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                        disabled={servicesFetching}
                                        onChange={(event) => updateSlotService(event.target.value)}
                                        value={form.serviceId}
                                    >
                                        <option value="">{servicesFetching ? copy.loading : copy.selectSlotService}</option>
                                        {individualServices.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
                                    </select>
                                </Field>
                                <Field label={copy.capacity}>
                                    <input
                                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                                        min={1}
                                        onChange={(event) => updateForm("capacity", Number(event.target.value))}
                                        type="number"
                                        value={form.capacity}
                                    />
                                </Field>
                            </>
                        ) : null}
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
                            disabled={isCreating || isUpdatingAvailability || (form.status === "AVAILABLE" && form.itemType === "APPOINTMENT_SLOT" && !form.serviceId)}
                            onClick={saveAvailability}
                            type="button"
                        >
                            {isCreating || isUpdatingAvailability ? t("form.saving") : editingBlock ? copy.saveAvailability : form.status === "AVAILABLE" ? t("actions.availability") : t("actions.blocking")}
                        </button>
                    </div>
                </section>
                <FixedEventForm
                    copy={copy}
                    editingEvent={editingEvent}
                    isLoading={isCreatingEvent || isUpdatingEvent}
                    offices={offices}
                    officesFetching={officesFetching}
                    onCreate={async (body) => {
                        try {
                            if (editingEvent) {
                                await updateSpecialistEvent({id: editingEvent.id, body}).unwrap();
                                toast.success(copy.eventUpdated);
                            } else {
                                await createSpecialistEvent(body).unwrap();
                                toast.success(copy.eventCreated);
                            }
                            setEditingEvent(null);
                            void refetchEvents();
                        } catch {
                            toast.error(copy.eventError);
                        }
                    }}
                    onCancelEdit={() => setEditingEvent(null)}
                    selectedSpecialistId={selectedSpecialistId}
                    services={eventServices}
                    servicesFetching={servicesFetching}
                />
                <ManualBookingForm
                    blocks={blocks}
                    bookings={bookings}
                    appointmentBufferMinutes={appointmentBufferMinutes}
                    events={events}
                    locale={locale}
                    selectedSpecialistId={selectedSpecialistId}
                    services={individualServices}
                    servicesError={servicesError}
                    servicesFetching={servicesFetching}
                    copy={copy}
                    onCreated={refetchAvailability}
                    t={t}
                />
                <DayPlanTemplateForm
                    copy={copy}
                    individualServices={individualServices}
                    offices={offices}
                    onCreated={refetchAvailability}
                    selectedSpecialistId={selectedSpecialistId}
                />
                <DayPlanCopyForm
                    conflictsLabel={copy.copyConflicts}
                    copy={copy}
                    isLoading={isCopyingDayPlan}
                    locale={locale}
                    onCopy={async (body) => {
                        const response = await copyDayPlan({
                            ...body,
                            specialistId: selectedSpecialistId === "" ? null : selectedSpecialistId
                        }).unwrap();
                        void refetchAvailability();
                        void refetchEvents();
                        return response;
                    }}
                />
                <EventsPanel
                    copy={copy}
                    events={events}
                    isError={eventsError}
                    isFetching={eventsFetching}
                    locale={locale}
                    onDeactivate={async (event) => {
                        try {
                            await updateSpecialistEvent({id: event.id, body: eventToInput(event, false)}).unwrap();
                            void refetchEvents();
                            toast.success(copy.eventUpdated);
                        } catch {
                            toast.error(copy.eventError);
                        }
                    }}
                    onEdit={setEditingEvent}
                />
                <EventEnrollmentsPanel
                    copy={copy}
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
const compactSelectClass = "h-9 w-full rounded-lg border border-stone-300 bg-white px-2.5 text-sm text-stone-900 outline-none transition-colors focus:border-stone-800";

function CalendarSurface({
    bookings,
    blocks,
    buffers,
    copy,
    currentDate,
    events,
    locale,
    onNavigate,
    onSelectDetail,
    plannerMode,
    selectedView,
    t
}: {
    bookings: SpecialistBooking[];
    blocks: SpecialistAvailabilityBlock[];
    buffers: CalendarBuffer[];
    copy: ReturnType<typeof scheduleCopy>;
    currentDate: Date;
    events: SpecialistFixedEvent[];
    locale: string;
    onNavigate: (date: Date) => void;
    onSelectDetail: (detail: CalendarDetail) => void;
    plannerMode: PlannerMode;
    selectedView: CalendarView;
    t: T;
}) {
    const detailByEventId = new Map<string, CalendarDetail>();
    const visibleBlocks = plannerMode === "bookings" ? [] : blocks;
    const visibleBookings = plannerMode === "plan" ? [] : bookings;
    const visibleEvents = events;
    const visibleBuffers = plannerMode === "agenda" ? buffers : buffers.slice(0, 80);

    if (selectedView === "list") {
        return (
            <PlannerAgendaList
                bookings={visibleBookings}
                blocks={visibleBlocks}
                buffers={visibleBuffers}
                copy={copy}
                events={visibleEvents}
                locale={locale}
                onSelectDetail={onSelectDetail}
                t={t}
            />
        );
    }

    const calendarEvents: AtaraksiaCalendarEvent[] = [
        ...visibleBlocks.map((block) => {
            const id = `block-${block.id}`;
            detailByEventId.set(id, blockCalendarDetail(block, copy, locale, t));
            return {
                id,
                badge: formatTimeRange(block.startsAt, block.endsAt, locale),
                title: compactBlockCalendarLabel(block, copy, locale, t),
                meta: [block.specialistName, block.officeName].filter(Boolean).join(" · "),
                start: new Date(block.startsAt),
                end: new Date(block.endsAt),
                tone: block.booked ? "booking" as const : block.status === "AVAILABLE" ? "available" as const : "blocked" as const
            };
        }),
        ...visibleBookings.map((booking) => {
            const id = `booking-${booking.id}`;
            detailByEventId.set(id, bookingCalendarDetail(booking, copy, locale, t));
            return {
                id,
                badge: formatTimeRange(booking.startsAt, booking.endsAt, locale),
                title: bookingServiceTitle(booking, locale),
                meta: [booking.clientName, booking.officeName].filter(Boolean).join(" · "),
                start: new Date(booking.startsAt),
                end: new Date(booking.endsAt),
                tone: "booking" as const
            };
        }),
        ...visibleBuffers.map((buffer) => {
            const id = `buffer-${buffer.id}`;
            detailByEventId.set(id, bufferCalendarDetail(buffer, copy, locale));
            return {
                id,
                badge: formatTimeRange(buffer.startsAt, buffer.endsAt, locale),
                title: copy.buffer,
                meta: [buffer.specialistName, buffer.officeName].filter(Boolean).join(" · "),
                start: new Date(buffer.startsAt),
                end: new Date(buffer.endsAt),
                tone: "buffer" as const
            };
        }),
        ...visibleEvents.map((event) => {
            const id = `event-${event.id}`;
            detailByEventId.set(id, eventCalendarDetail(event, copy, locale));
            return {
                id,
                badge: formatTimeRange(event.startsAt, event.endsAt, locale),
                title: event.serviceTitle,
                meta: `${event.enrolledCount}/${event.capacity} · ${event.officeName ?? copy.noOffice}`,
                start: new Date(event.startsAt),
                end: new Date(event.endsAt),
                tone: "event" as const
            };
        })
    ];

    return (
        <AtaraksiaCalendar
            culture={locale === "ua" ? "uk" : locale}
            date={currentDate}
            events={calendarEvents}
            messages={copy.calendarMessages}
            onNavigate={onNavigate}
            onSelectEvent={(event) => {
                const detail = detailByEventId.get(event.id);
                if (detail) onSelectDetail(detail);
            }}
            variant="planner"
            view={toCalendarView(selectedView)}
        />
    );
}

function PlannerModeSwitch({copy, mode, onChange}: {copy: ReturnType<typeof scheduleCopy>; mode: PlannerMode; onChange: (mode: PlannerMode) => void}) {
    const options: Array<{label: string; value: PlannerMode}> = [
        {label: copy.planMode, value: "plan"},
        {label: copy.bookingsTitle, value: "bookings"},
        {label: copy.agendaMode, value: "agenda"}
    ];

    return (
        <div className="border-b border-stone-200 px-4 py-3">
            <div className="grid gap-1 rounded-lg bg-stone-100 p-1 sm:inline-grid sm:grid-cols-3">
                {options.map((option) => (
                    <button
                        aria-pressed={mode === option.value}
                        className={mode === option.value ? activeViewClass : viewClass}
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        type="button"
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function PlannerAgendaList({
    bookings,
    blocks,
    buffers,
    copy,
    events,
    locale,
    onSelectDetail,
    t
}: {
    bookings: SpecialistBooking[];
    blocks: SpecialistAvailabilityBlock[];
    buffers: CalendarBuffer[];
    copy: ReturnType<typeof scheduleCopy>;
    events: SpecialistFixedEvent[];
    locale: string;
    onSelectDetail: (detail: CalendarDetail) => void;
    t: T;
}) {
    const entries = [
        ...blocks.map((block) => ({detail: blockCalendarDetail(block, copy, locale, t), end: block.endsAt, id: `block-${block.id}`, specialistName: block.specialistName, start: block.startsAt, tone: block.booked ? "booking" as const : block.status === "AVAILABLE" ? "available" as const : "blocked" as const})),
        ...bookings.map((booking) => ({detail: bookingCalendarDetail(booking, copy, locale, t), end: booking.endsAt, id: `booking-${booking.id}`, specialistName: booking.specialistName, start: booking.startsAt, tone: "booking" as const})),
        ...events.map((event) => ({detail: eventCalendarDetail(event, copy, locale), end: event.endsAt, id: `event-${event.id}`, specialistName: event.specialistName, start: event.startsAt, tone: "event" as const})),
        ...buffers.map((buffer) => ({detail: bufferCalendarDetail(buffer, copy, locale), end: buffer.endsAt, id: `buffer-${buffer.id}`, specialistName: buffer.specialistName, start: buffer.startsAt, tone: "buffer" as const}))
    ].sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime()).slice(0, 160);

    if (entries.length === 0) {
        return <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">{t("blocks.empty")}</p>;
    }

    return (
        <div className="space-y-3">
            {entries.map((entry) => (
                <button className="grid w-full min-w-0 gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 text-left transition-colors hover:border-stone-400 hover:bg-stone-50 sm:grid-cols-[112px_minmax(0,1fr)]" key={entry.id} onClick={() => onSelectDetail(entry.detail)} type="button">
                    <span className="text-sm font-semibold text-stone-950">{formatTimeRange(entry.start, entry.end, locale)}</span>
                    <span className="min-w-0">
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${agendaToneDot(entry.tone)}`} aria-hidden="true" />
                            <span className="min-w-0 truncate text-sm font-semibold text-stone-950">{entry.detail.title}</span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-stone-500">{entry.specialistName}</span>
                    </span>
                </button>
            ))}
        </div>
    );
}

function CalendarFilters({
    copy,
    filters,
    offices,
    onChange,
    onReset,
    services
}: {
    copy: ReturnType<typeof scheduleCopy>;
    filters: CalendarFilterState;
    offices: Array<{id: number; name: string}>;
    onChange: <K extends keyof CalendarFilterState>(field: K, value: CalendarFilterState[K]) => void;
    onReset: () => void;
    services: PublicService[];
}) {
    return (
        <div className="border-b border-stone-200 bg-white px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
                <CompactSelect label={copy.office}>
                    <select className={compactSelectClass} onChange={(event) => onChange("officeId", toOptionalNumber(event.target.value))} value={filters.officeId}>
                        <option value="">{copy.allOffices}</option>
                        {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
                    </select>
                </CompactSelect>
                <CompactSelect label={copy.serviceFilter}>
                    <select className={compactSelectClass} onChange={(event) => onChange("serviceId", toOptionalNumber(event.target.value))} value={filters.serviceId}>
                        <option value="">{copy.allServices}</option>
                        {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
                    </select>
                </CompactSelect>
                <CompactSelect label={copy.itemFilter}>
                    <select className={compactSelectClass} onChange={(event) => onChange("itemType", event.target.value as CalendarFilterState["itemType"])} value={filters.itemType}>
                        <option value="all">{copy.allItems}</option>
                        <option value="APPOINTMENT_SLOT">{copy.appointmentSlot}</option>
                        <option value="OPEN_RANGE">{copy.openRange}</option>
                        <option value="BLOCK">{copy.blocksTitle}</option>
                        <option value="FIXED_EVENT">{copy.eventsTitle}</option>
                        <option value="BOOKING">{copy.bookingsTitle}</option>
                        <option value="BUFFER">{copy.buffer}</option>
                    </select>
                </CompactSelect>
                <CompactSelect label={copy.statusFilter}>
                    <select className={compactSelectClass} onChange={(event) => onChange("status", event.target.value as CalendarFilterState["status"])} value={filters.status}>
                        <option value="all">{copy.allStatuses}</option>
                        <option value="AVAILABLE">{copy.statusAvailable}</option>
                        <option value="BLOCKED">{copy.statusBlocked}</option>
                        <option value="AWAITING_PAYMENT_CONFIRMATION">{copy.statusAwaitingPayment}</option>
                        <option value="CONFIRMED">{copy.statusConfirmed}</option>
                        <option value="CANCELLED">{copy.statusCancelled}</option>
                        <option value="ACTIVE_EVENT">{copy.statusActiveEvent}</option>
                        <option value="INACTIVE_EVENT">{copy.statusInactiveEvent}</option>
                    </select>
                </CompactSelect>
                <div className="flex items-end">
                    <button className="h-9 w-full rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100 xl:w-auto" onClick={onReset} type="button">
                        {copy.resetFilters}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CompactSelect({children, label}: {children: ReactNode; label: string}) {
    return (
        <label className="min-w-0">
            <span className="mb-1 block break-words text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</span>
            {children}
        </label>
    );
}

function CalendarDetailPanel({closeLabel, detail, onClose}: {closeLabel: string; detail: CalendarDetail; onClose: () => void}) {
    const toneClass = detail.tone === "available"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : detail.tone === "blocked"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : detail.tone === "event"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : detail.tone === "buffer"
        ? "border-stone-300 bg-stone-100 text-stone-700"
        : "border-stone-300 bg-stone-800 text-white";

    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <span className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{detail.title}</span>
                </div>
                <button className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100" onClick={onClose} type="button">
                    {closeLabel}
                </button>
            </div>
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                {detail.rows.map((row) => (
                    <div className="min-w-0 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2" key={`${row.label}-${row.value}`}>
                        <dt className="break-words text-[11px] font-semibold uppercase tracking-wide text-stone-500">{row.label}</dt>
                        <dd className="mt-1 break-words text-sm font-medium text-stone-900">{row.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

function ScheduleBlockList({
    blocks,
    copy,
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
    copy: ReturnType<typeof scheduleCopy>;
    deleting: boolean;
    locale: string;
    onDelete: (id: number) => void;
    onEdit?: (block: SpecialistAvailabilityBlock) => void;
    subtitle?: string;
    title?: string;
    t: T;
    viewOnly?: boolean;
}) {
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
                                <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-[10px] font-semibold text-stone-600">{scheduleBlockTypeLabel(block, copy)}</span>
                                <span className="break-words text-sm font-medium text-stone-900">
                                    {formatDateTime(block.startsAt, locale)} - {formatDateTime(block.endsAt, locale)}
                                </span>
                            </div>
                            {block.officeName || block.serviceTitle || block.specialistName || block.notes ? (
                                <p className="mt-1 break-words text-xs text-stone-500">
                                    {[block.serviceTitle, block.officeName, block.specialistName, block.capacity ? `${copy.capacity}: ${block.capacity}` : null, block.notes].filter(Boolean).join(" · ")}
                                </p>
                            ) : null}
                            {block.status === "AVAILABLE" && block.itemType === "OPEN_RANGE" ? (
                                <p className="mt-1 break-words text-xs text-stone-500">{copy.availabilityCutHint}</p>
                            ) : block.status === "AVAILABLE" ? (
                                <p className="mt-1 break-words text-xs text-stone-500">{copy.appointmentSlotHint}</p>
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

function scheduleBlockLabel(block: SpecialistAvailabilityBlock, copy: ReturnType<typeof scheduleCopy>, t: T) {
    if (block.status === "BLOCKED") return t("legend.blocked");
    if (block.itemType === "APPOINTMENT_SLOT") return block.serviceTitle ?? copy.appointmentSlot;
    return t("legend.available");
}

function scheduleBlockTypeLabel(block: SpecialistAvailabilityBlock, copy: ReturnType<typeof scheduleCopy>) {
    if (block.itemType === "APPOINTMENT_SLOT") return copy.appointmentSlot;
    if (block.itemType === "BLOCK") return copy.blocksTitle;
    return copy.openRange;
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
    selectedSpecialistId,
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
    selectedSpecialistId: number | "";
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
            specialistId: selectedSpecialistId === "" ? null : selectedSpecialistId,
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

function DayPlanCopyForm({
    conflictsLabel,
    copy,
    isLoading,
    locale,
    onCopy
}: {
    conflictsLabel: string;
    copy: ReturnType<typeof scheduleCopy>;
    isLoading: boolean;
    locale: string;
    onCopy: (body: DayPlanCopyInput) => Promise<DayPlanCopyResponse>;
}) {
    const toast = useToast();
    const [sourceDate, setSourceDate] = useState(() => toDateInputValue(new Date()));
    const [targetDatesText, setTargetDatesText] = useState("");
    const [includeAvailability, setIncludeAvailability] = useState(true);
    const [includeFixedEvents, setIncludeFixedEvents] = useState(true);
    const [conflicts, setConflicts] = useState<DayPlanCopyConflict[]>([]);

    async function submit() {
        const targetDates = parseDateList(targetDatesText);
        if (!sourceDate || targetDates.length === 0) {
            toast.error(copy.copyInvalid);
            return;
        }
        try {
            const response = await onCopy({
                sourceDate,
                targetDates,
                includeAvailability,
                includeFixedEvents
            });
            setConflicts(response.conflicts);
            if (response.conflicts.length > 0) {
                toast.error(copy.copyHasConflicts);
                return;
            }
            setTargetDatesText("");
            toast.success(copy.copySuccess(response.copiedAvailabilityCount, response.copiedEventCount));
        } catch {
            toast.error(copy.copyError);
        }
    }

    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="break-words text-sm font-semibold uppercase tracking-wide text-stone-500">{copy.copyTitle}</h2>
            <p className="mt-2 break-words text-xs leading-5 text-stone-500">{copy.copyBody}</p>
            <div className="mt-4 space-y-3">
                <Field label={copy.copySourceDate}>
                    <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => setSourceDate(event.target.value)} type="date" value={sourceDate} />
                </Field>
                <Field label={copy.copyTargetDates}>
                    <textarea
                        className="min-h-20 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                        onChange={(event) => setTargetDatesText(event.target.value)}
                        placeholder={copy.copyTargetPlaceholder}
                        value={targetDatesText}
                    />
                </Field>
                <div className="grid gap-2">
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                        <span>{copy.copyAvailability}</span>
                        <input checked={includeAvailability} onChange={(event) => setIncludeAvailability(event.target.checked)} type="checkbox" />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
                        <span>{copy.copyEvents}</span>
                        <input checked={includeFixedEvents} onChange={(event) => setIncludeFixedEvents(event.target.checked)} type="checkbox" />
                    </label>
                </div>
                <button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={isLoading} onClick={submit} type="button">
                    {isLoading ? copy.saving : copy.copyAction}
                </button>
            </div>
            {conflicts.length > 0 ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{conflictsLabel}</p>
                    <div className="mt-2 space-y-2">
                        {conflicts.slice(0, 5).map((conflict, index) => (
                            <p className="break-words text-xs leading-5 text-amber-800" key={`${conflict.targetDate}-${conflict.startsAt}-${index}`}>
                                {conflict.targetDate}: {formatTime(conflict.startsAt, locale)} - {formatTime(conflict.endsAt, locale)} · {conflict.reason}
                            </p>
                        ))}
                    </div>
                </div>
            ) : null}
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
    appointmentBufferMinutes,
    blocks,
    bookings,
    copy,
    events,
    locale,
    onCreated,
    selectedSpecialistId,
    services,
    servicesError,
    servicesFetching,
    t
}: {
    appointmentBufferMinutes: number;
    blocks: SpecialistAvailabilityBlock[];
    bookings: SpecialistBooking[];
    copy: ReturnType<typeof scheduleCopy>;
    events: SpecialistFixedEvent[];
    locale: string;
    onCreated: () => void;
    selectedSpecialistId: number | "";
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
    const manualSlots = useMemo(() => buildManualBookingSlots(blocks, bookings, events, appointmentBufferMinutes, selectedService), [blocks, bookings, events, appointmentBufferMinutes, selectedService]);
    const selectedSlot = manualSlots.find((slot) => slot.key === selectedSlotKey);

    async function submit() {
        if (!selectedSlot) return;
        try {
            await createManualBooking({
                clientIdentifier: clientIdentifier.trim(),
                specialistId: selectedSpecialistId === "" ? null : selectedSpecialistId,
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

function DayPlanTemplateForm({
    copy,
    individualServices,
    offices,
    onCreated,
    selectedSpecialistId
}: {
    copy: ReturnType<typeof scheduleCopy>;
    individualServices: PublicService[];
    offices: Array<{id: number; name: string}>;
    onCreated: () => void;
    selectedSpecialistId: number | "";
}) {
    const toast = useToast();
    const [createAvailability, {isLoading}] = useCreateAvailabilityMutation();
    const [date, setDate] = useState(() => toDateInputValue(new Date()));
    const [officeId, setOfficeId] = useState("");
    const [serviceId, setServiceId] = useState("");
    const selectedService = individualServices.find((service) => String(service.id) === serviceId);
    const disabled = isLoading || !date || !selectedService;

    async function submit() {
        if (!selectedService) return;
        const plan = [
            {start: "09:00", end: "10:00", type: "slot"},
            {start: "10:00", end: "10:30", type: "break"},
            {start: "10:30", end: "11:30", type: "slot"},
            {start: "13:00", end: "14:00", type: "slot"},
            {start: "14:00", end: "14:30", type: "break"},
            {start: "14:30", end: "15:30", type: "slot"}
        ] as const;

        try {
            for (const item of plan) {
                await createAvailability({
                    capacity: item.type === "slot" ? 1 : null,
                    endsAt: toIsoDateAndTime(date, item.end),
                    itemType: item.type === "slot" ? "APPOINTMENT_SLOT" : "BLOCK",
                    notes: item.type === "slot" ? copy.templateSlotNote : copy.templateBreakNote,
                    officeId: officeId ? Number(officeId) : null,
                    serviceId: item.type === "slot" ? selectedService.id : null,
                    specialistId: selectedSpecialistId === "" ? null : selectedSpecialistId,
                    startsAt: toIsoDateAndTime(date, item.start),
                    status: item.type === "slot" ? "AVAILABLE" : "BLOCKED"
                }).unwrap();
            }
            toast.success(copy.templateCreated);
            onCreated();
        } catch {
            toast.error(copy.templateError);
        }
    }

    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="break-words text-sm font-semibold uppercase tracking-wide text-stone-500">{copy.templateTitle}</h2>
            <p className="mt-2 break-words text-xs leading-5 text-stone-500">{copy.templateBody}</p>
            <div className="mt-4 grid gap-3">
                <Field label={copy.copySourceDate}>
                    <input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
                </Field>
                <Field label={copy.office}>
                    <select className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => setOfficeId(event.target.value)} value={officeId}>
                        <option value="">{copy.noOffice}</option>
                        {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
                    </select>
                </Field>
                <Field label={copy.slotService}>
                    <select className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => setServiceId(event.target.value)} value={serviceId}>
                        <option value="">{copy.selectSlotService}</option>
                        {individualServices.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
                    </select>
                </Field>
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
                    09:00–10:00 · 10:00–10:30 · 10:30–11:30 · 13:00–14:00 · 14:00–14:30 · 14:30–15:30
                </div>
                <button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={disabled} onClick={submit} type="button">
                    {isLoading ? copy.saving : copy.templateAction}
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
                                    <p className="mt-0.5 break-words text-xs text-stone-500">{bookingServiceTitle(booking, locale)}</p>
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

function SpecialistFinanceOverviewPanel({copy, isError, isFetching, locale, overview}: {copy: ReturnType<typeof scheduleCopy>; isError: boolean; isFetching: boolean; locale: string; overview?: SpecialistFinanceOverview}) {
    return (
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="border-b border-stone-100 pb-3">
                <h2 className="break-words text-base font-semibold text-stone-950">{copy.financeTitle}</h2>
                <p className="mt-1 break-words text-xs leading-5 text-stone-500">{copy.financeBody}</p>
            </div>
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{copy.financeError}</p> : null}
            {!isError && isFetching ? <p className="mt-3 text-xs text-stone-500">{copy.loading}</p> : null}
            {overview ? (
                <div className="mt-4 grid gap-3">
                    <FinanceMetric label={copy.financeEarnings} value={formatAmount(overview.specialistEarnings, locale)} />
                    <FinanceMetric label={copy.financePendingEarnings} value={formatAmount(overview.pendingSpecialistEarnings, locale)} />
                    <FinanceMetric label={copy.financePayoutPending} value={formatAmount(overview.payoutPendingEarnings, locale)} />
                    <FinanceMetric label={copy.financePayoutPaid} value={formatAmount(overview.payoutPaidEarnings, locale)} />
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <FinanceMetric label={copy.financeCompleted} value={String(overview.completedCount)} />
                        <FinanceMetric label={copy.financePending} value={String(overview.pendingCount)} />
                        <FinanceMetric label={copy.financePayoutPendingCount} value={String(overview.payoutPendingCount)} />
                        <FinanceMetric label={copy.financePayoutPaidCount} value={String(overview.payoutPaidCount)} />
                        <FinanceMetric label={copy.financeWorked} value={formatMinutes(overview.workedMinutes, copy)} />
                        <FinanceMetric label={copy.financeSharePercent} value={formatPercent(overview.specialistSharePercent, locale)} />
                    </div>
                    <p className="break-words text-xs leading-5 text-stone-500">{copy.financeHint}</p>
                </div>
            ) : null}
        </section>
    );
}

function FinanceMetric({label, value}: {label: string; value: string}) {
    return <div className="min-w-0 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3"><p className="break-words text-base font-semibold text-stone-950">{value}</p><p className="mt-1 break-words text-xs font-medium text-stone-500">{label}</p></div>;
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

function agendaToneDot(tone: CalendarDetail["tone"]) {
    if (tone === "available") return "bg-emerald-500";
    if (tone === "blocked") return "bg-amber-500";
    if (tone === "event") return "bg-sky-500";
    if (tone === "buffer") return "bg-stone-400";
    return "bg-stone-800";
}

function eventToInput(event: SpecialistFixedEvent, active: boolean): SpecialistFixedEventInput {
    return {
        specialistId: event.specialistId,
        serviceId: event.serviceId,
        officeId: event.officeId,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        capacity: event.capacity,
        note: event.note,
        active
    };
}

function filterCalendarBlocks(blocks: SpecialistAvailabilityBlock[], filters: CalendarFilterState) {
    return blocks.filter((block) => {
        if (filters.officeId !== "" && block.officeId !== filters.officeId) return false;
        if (filters.serviceId !== "" && block.serviceId !== filters.serviceId) return false;
        if (filters.itemType !== "all" && (filters.itemType === "BOOKING" || filters.itemType === "FIXED_EVENT" || block.itemType !== filters.itemType)) return false;
        if (filters.status !== "all" && (filters.status === "ACTIVE_EVENT" || filters.status === "INACTIVE_EVENT" || !["AVAILABLE", "BLOCKED"].includes(filters.status) || block.status !== filters.status)) return false;
        return true;
    });
}

function filterCalendarEvents(events: SpecialistFixedEvent[], filters: CalendarFilterState) {
    return events.filter((event) => {
        if (filters.officeId !== "" && event.officeId !== filters.officeId) return false;
        if (filters.serviceId !== "" && event.serviceId !== filters.serviceId) return false;
        if (filters.itemType !== "all" && filters.itemType !== "FIXED_EVENT") return false;
        if (filters.status === "ACTIVE_EVENT" && !event.active) return false;
        if (filters.status === "INACTIVE_EVENT" && event.active) return false;
        if (filters.status !== "all" && filters.status !== "ACTIVE_EVENT" && filters.status !== "INACTIVE_EVENT") return false;
        return true;
    });
}

function filterCalendarBookings(bookings: SpecialistBooking[], filters: CalendarFilterState) {
    return bookings.filter((booking) => {
        if (filters.officeId !== "" && booking.officeId !== filters.officeId) return false;
        if (filters.serviceId !== "" && booking.serviceId !== filters.serviceId) return false;
        if (filters.itemType !== "all" && filters.itemType !== "BOOKING") return false;
        if (filters.status !== "all" && !["AWAITING_PAYMENT_CONFIRMATION", "CONFIRMED", "CANCELLED"].includes(filters.status)) return false;
        if (filters.status !== "all" && booking.status !== filters.status) return false;
        return true;
    });
}

function filterCalendarBuffers(buffers: CalendarBuffer[], filters: CalendarFilterState) {
    return buffers.filter((buffer) => {
        if (filters.officeId !== "" && buffer.officeId !== filters.officeId) return false;
        if (filters.serviceId !== "") return false;
        if (filters.itemType !== "all" && filters.itemType !== "BUFFER") return false;
        if (filters.status !== "all") return false;
        return true;
    });
}

function buildCalendarBuffers(bookings: SpecialistBooking[], events: SpecialistFixedEvent[], appointmentBufferMinutes: number): CalendarBuffer[] {
    const buffers: CalendarBuffer[] = [];
    for (const booking of bookings.filter((item) => item.status !== "CANCELLED")) {
        buffers.push(...bufferRanges(
            `booking-${booking.id}`,
            booking.startsAt,
            booking.endsAt,
            booking.specialistName,
            booking.officeId,
            booking.officeName,
            appointmentBufferMinutes
        ));
    }
    for (const event of events.filter((item) => item.active)) {
        buffers.push(...bufferRanges(
            `event-${event.id}`,
            event.startsAt,
            event.endsAt,
            event.specialistName,
            event.officeId,
            event.officeName,
            appointmentBufferMinutes
        ));
    }
    return buffers;
}

function bufferRanges(idPrefix: string, startsAt: string, endsAt: string, specialistName: string, officeId: number | null, officeName: string | null, appointmentBufferMinutes: number): CalendarBuffer[] {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const before = new Date(start);
    before.setMinutes(before.getMinutes() - appointmentBufferMinutes);
    const after = new Date(end);
    after.setMinutes(after.getMinutes() + appointmentBufferMinutes);
    return [
        {id: `${idPrefix}-before`, startsAt: before.toISOString(), endsAt: start.toISOString(), specialistName, officeId, officeName},
        {id: `${idPrefix}-after`, startsAt: end.toISOString(), endsAt: after.toISOString(), specialistName, officeId, officeName}
    ];
}

function compactBlockCalendarLabel(block: SpecialistAvailabilityBlock, copy: ReturnType<typeof scheduleCopy>, locale: string, t: T) {
    if (block.booked) return [t("legend.booked"), block.serviceTitle, block.officeName].filter(Boolean).join(" · ");
    if (block.itemType === "APPOINTMENT_SLOT") return [block.serviceTitle ?? copy.appointmentSlot, block.officeName].filter(Boolean).join(" · ");
    return [scheduleBlockLabel(block, copy, t), block.officeName, block.notes].filter(Boolean).join(" · ");
}

function blockCalendarDetail(block: SpecialistAvailabilityBlock, copy: ReturnType<typeof scheduleCopy>, locale: string, t: T): CalendarDetail {
    return {
        title: compactBlockCalendarLabel(block, copy, locale, t) || scheduleBlockLabel(block, copy, t),
        tone: block.booked ? "booking" : block.status === "AVAILABLE" ? "available" : "blocked",
        rows: [
            {label: copy.detailType, value: scheduleBlockTypeLabel(block, copy)},
            {label: copy.detailStatus, value: block.booked ? t("statuses.booked") : block.status === "AVAILABLE" ? t("statuses.available") : t("statuses.blocked")},
            {label: copy.startsAt, value: formatDateTime(block.startsAt, locale)},
            {label: copy.endsAt, value: formatDateTime(block.endsAt, locale)},
            {label: copy.specialistFilter, value: block.specialistName},
            {label: copy.office, value: block.officeName ?? copy.noOffice},
            {label: copy.slotService, value: block.serviceTitle ?? copy.notAssigned},
            {label: copy.capacity, value: block.capacity === null ? copy.notAssigned : String(block.capacity)}
        ].concat(block.notes ? [{label: copy.note, value: block.notes}] : [])
    };
}

function bookingCalendarDetail(booking: SpecialistBooking, copy: ReturnType<typeof scheduleCopy>, locale: string, t: T): CalendarDetail {
    return {
        title: `${bookingServiceTitle(booking, locale)} · ${booking.clientName}`,
        tone: "booking",
        rows: [
            {label: copy.detailType, value: copy.bookingsTitle},
            {label: copy.detailStatus, value: t(`bookings.statuses.${booking.status}`)},
            {label: copy.startsAt, value: formatDateTime(booking.startsAt, locale)},
            {label: copy.endsAt, value: formatDateTime(booking.endsAt, locale)},
            {label: copy.client, value: booking.clientName},
            {label: copy.clientContact, value: booking.clientContact || copy.noClientContact},
            {label: copy.slotService, value: bookingServiceTitle(booking, locale)},
            {label: copy.office, value: booking.officeName ?? copy.noOffice}
        ]
    };
}

function eventCalendarDetail(event: SpecialistFixedEvent, copy: ReturnType<typeof scheduleCopy>, locale: string): CalendarDetail {
    return {
        title: event.serviceTitle,
        tone: "event",
        rows: [
            {label: copy.detailType, value: copy.eventsTitle},
            {label: copy.detailStatus, value: event.active ? copy.statusActiveEvent : copy.statusInactiveEvent},
            {label: copy.startsAt, value: formatDateTime(event.startsAt, locale)},
            {label: copy.endsAt, value: formatDateTime(event.endsAt, locale)},
            {label: copy.specialistFilter, value: event.specialistName},
            {label: copy.office, value: event.officeName ?? copy.noOffice},
            {label: copy.capacity, value: `${event.enrolledCount}/${event.capacity}`},
            {label: copy.price, value: formatAmount(event.price, locale)}
        ].concat(event.note ? [{label: copy.note, value: event.note}] : [])
    };
}

function bufferCalendarDetail(buffer: CalendarBuffer, copy: ReturnType<typeof scheduleCopy>, locale: string): CalendarDetail {
    return {
        title: copy.buffer,
        tone: "buffer",
        rows: [
            {label: copy.detailType, value: copy.buffer},
            {label: copy.startsAt, value: formatDateTime(buffer.startsAt, locale)},
            {label: copy.endsAt, value: formatDateTime(buffer.endsAt, locale)},
            {label: copy.specialistFilter, value: buffer.specialistName},
            {label: copy.office, value: buffer.officeName ?? copy.noOffice}
        ]
    };
}

function toOptionalNumber(value: string): number | "" {
    return value ? Number(value) : "";
}

function userDisplayName(user: AdminUser) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return name || user.phone || user.email || `#${user.id}`;
}

function toDateInputValue(date: Date) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    return localDate.toISOString().slice(0, 10);
}

function parseDateList(value: string) {
    return Array.from(new Set(
        value
            .split(/[\s,;]+/)
            .map((item) => item.trim())
            .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item))
    ));
}

function scheduleCopy(t: T) {
    return {
        availabilityTitle: t("schedule.availabilityTitle"),
        blocksTitle: t("schedule.blocksTitle"),
        eventsTitle: t("schedule.eventsTitle"),
        bookingsTitle: t("schedule.bookingsTitle"),
        planMode: t("schedule.planMode"),
        agendaMode: t("schedule.agendaMode"),
        specialistFilter: t("schedule.specialistFilter"),
        allSpecialists: t("schedule.allSpecialists"),
        specialistsError: t("schedule.specialistsError"),
        allOffices: t("schedule.allOffices"),
        allServices: t("schedule.allServices"),
        serviceFilter: t("schedule.serviceFilter"),
        itemFilter: t("schedule.itemFilter"),
        statusFilter: t("schedule.statusFilter"),
        allItems: t("schedule.allItems"),
        allStatuses: t("schedule.allStatuses"),
        resetFilters: t("schedule.resetFilters"),
        statusAvailable: t("schedule.statusAvailable"),
        statusBlocked: t("schedule.statusBlocked"),
        statusAwaitingPayment: t("schedule.statusAwaitingPayment"),
        statusConfirmed: t("schedule.statusConfirmed"),
        statusCancelled: t("schedule.statusCancelled"),
        statusActiveEvent: t("schedule.statusActiveEvent"),
        statusInactiveEvent: t("schedule.statusInactiveEvent"),
        detailType: t("schedule.detailType"),
        detailStatus: t("schedule.detailStatus"),
        closeDetails: t("schedule.closeDetails"),
        notAssigned: t("schedule.notAssigned"),
        client: t("schedule.client"),
        clientContact: t("schedule.clientContact"),
        price: t("schedule.price"),
        itemType: t("schedule.itemType"),
        appointmentSlot: t("schedule.appointmentSlot"),
        openRange: t("schedule.openRange"),
        slotService: t("schedule.slotService"),
        selectSlotService: t("schedule.selectSlotService"),
        eventsBody: t("schedule.eventsBody"),
        eventFormHint: t("schedule.eventFormHint"),
        eventService: t("schedule.eventService"),
        selectEventService: t("schedule.selectEventService"),
        office: t("schedule.office"),
        noOffice: t("schedule.noOffice"),
        startsAt: t("schedule.startsAt"),
        endsAt: t("schedule.endsAt"),
        capacity: t("schedule.capacity"),
        note: t("schedule.note"),
        createEvent: t("schedule.createEvent"),
        saveEvent: t("schedule.saveEvent"),
        editEvent: t("schedule.editEvent"),
        cancelEdit: t("schedule.cancelEdit"),
        deactivateEvent: t("schedule.deactivateEvent"),
        active: t("schedule.active"),
        inactive: t("schedule.inactive"),
        saving: t("schedule.saving"),
        loading: t("schedule.loading"),
        eventCreated: t("schedule.eventCreated"),
        eventUpdated: t("schedule.eventUpdated"),
        eventError: t("schedule.eventError"),
        eventsError: t("schedule.eventsError"),
        eventsEmpty: t("schedule.eventsEmpty"),
        eventEnrollmentsTitle: t("schedule.eventEnrollmentsTitle"),
        eventEnrollmentsBody: t("schedule.eventEnrollmentsBody"),
        eventEnrollmentsError: t("schedule.eventEnrollmentsError"),
        eventEnrollmentsEmpty: t("schedule.eventEnrollmentsEmpty"),
        enrollmentActive: t("schedule.enrollmentActive"),
        enrollmentCancelled: t("schedule.enrollmentCancelled"),
        noClientContact: t("schedule.noClientContact"),
        reminderRequested: t("schedule.reminderRequested"),
        editAvailability: t("schedule.editAvailability"),
        saveAvailability: t("schedule.saveAvailability"),
        availabilityUpdated: t("schedule.availabilityUpdated"),
        editBlock: t("schedule.editBlock"),
        availabilityListHint: t("schedule.availabilityListHint"),
        blocksListHint: t("schedule.blocksListHint"),
        buffer: t("schedule.buffer"),
        availabilityCutHint: t("schedule.availabilityCutHint"),
        appointmentSlotHint: t("schedule.appointmentSlotHint"),
        copyTitle: t("schedule.copyTitle"),
        copyBody: t("schedule.copyBody"),
        copySourceDate: t("schedule.copySourceDate"),
        copyTargetDates: t("schedule.copyTargetDates"),
        copyTargetPlaceholder: t("schedule.copyTargetPlaceholder"),
        copyAvailability: t("schedule.copyAvailability"),
        copyEvents: t("schedule.copyEvents"),
        copyAction: t("schedule.copyAction"),
        templateTitle: t("schedule.templateTitle"),
        templateBody: t("schedule.templateBody"),
        templateAction: t("schedule.templateAction"),
        templateCreated: t("schedule.templateCreated"),
        templateError: t("schedule.templateError"),
        templateSlotNote: t("schedule.templateSlotNote"),
        templateBreakNote: t("schedule.templateBreakNote"),
        copyInvalid: t("schedule.copyInvalid"),
        copyHasConflicts: t("schedule.copyHasConflicts"),
        copyConflicts: t("schedule.copyConflicts"),
        copyError: t("schedule.copyError"),
        blockCutHint: t("schedule.blockCutHint"),
        manualSlotCutHint: t("schedule.manualSlotCutHint"),
        bookedBlockLocked: t("schedule.bookedBlockLocked"),
        bookedBlockEditHint: t("schedule.bookedBlockEditHint"),
        financeTitle: t("schedule.financeTitle"),
        financeBody: t("schedule.financeBody"),
        financeError: t("schedule.financeError"),
        financeEarnings: t("schedule.financeEarnings"),
        financePendingEarnings: t("schedule.financePendingEarnings"),
        financePayoutPending: t("schedule.financePayoutPending"),
        financePayoutPaid: t("schedule.financePayoutPaid"),
        financeCompleted: t("schedule.financeCompleted"),
        financePending: t("schedule.financePending"),
        financePayoutPendingCount: t("schedule.financePayoutPendingCount"),
        financePayoutPaidCount: t("schedule.financePayoutPaidCount"),
        financeWorked: t("schedule.financeWorked"),
        financeSharePercent: t("schedule.financeSharePercent"),
        financeHint: t("schedule.financeHint"),
        hoursShort: t("schedule.hoursShort"),
        minutesShort: t("schedule.minutesShort"),
        calendarMessages: calendarMessages(t),
        copySuccess: (availability: number, events: number) => t("schedule.copySuccess", {availability, events})
    };
}

function calendarMessages(t: T): AtaraksiaCalendarMessages {
    return {
        agenda: t("schedule.calendarMessages.agenda"),
        allDay: t("schedule.calendarMessages.allDay"),
        date: t("schedule.calendarMessages.date"),
        day: t("schedule.calendarMessages.day"),
        event: t("schedule.calendarMessages.event"),
        month: t("schedule.calendarMessages.month"),
        next: t("schedule.calendarMessages.next"),
        noEventsInRange: t("schedule.calendarMessages.noEventsInRange"),
        previous: t("schedule.calendarMessages.previous"),
        showMore: (count) => t("schedule.calendarMessages.showMore", {count}),
        time: t("schedule.calendarMessages.time"),
        today: t("schedule.calendarMessages.today"),
        tomorrow: t("schedule.calendarMessages.tomorrow"),
        week: t("schedule.calendarMessages.week"),
        work_week: t("schedule.calendarMessages.workWeek"),
        yesterday: t("schedule.calendarMessages.yesterday")
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

function buildManualBookingSlots(
    blocks: SpecialistAvailabilityBlock[],
    bookings: SpecialistBooking[],
    events: SpecialistFixedEvent[],
    appointmentBufferMinutes: number,
    service?: PublicService
): ManualBookingSlot[] {
    if (!service) return [];

    const now = Date.now();
    const activeBookings = bookings.filter((booking) => booking.status !== "CANCELLED");
    const activeEvents = events.filter((event) => event.active);
    const blockedBlocks = blocks.filter((block) => block.status === "BLOCKED");
    const slots: ManualBookingSlot[] = [];

    for (const block of blocks) {
        if (block.status !== "AVAILABLE") continue;
        if (block.itemType === "APPOINTMENT_SLOT") {
            if (block.serviceId !== service.id || block.booked) continue;
            const slotStart = new Date(block.startsAt);
            const slotEnd = new Date(block.endsAt);
            const overlapsBooking = activeBookings.some((booking) => overlapsBuffered(slotStart, slotEnd, booking.startsAt, booking.endsAt, appointmentBufferMinutes));
            const overlapsEvent = activeEvents.some((event) => overlapsBuffered(slotStart, slotEnd, event.startsAt, event.endsAt, appointmentBufferMinutes));
            const overlapsBlocked = blockedBlocks.some((blocked) => overlaps(slotStart, slotEnd, new Date(blocked.startsAt), new Date(blocked.endsAt)));

            if (slotStart.getTime() > now && !overlapsBooking && !overlapsEvent && !overlapsBlocked) {
                slots.push({
                    key: `${block.id}-${block.startsAt}`,
                    block,
                    startsAt: block.startsAt,
                    endsAt: block.endsAt
                });
            }
            continue;
        }
        if (block.itemType !== "OPEN_RANGE") continue;

        const blockEnd = new Date(block.endsAt);
        const slotStart = new Date(block.startsAt);

        while (slotStart.getTime() < blockEnd.getTime()) {
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + service.durationMinutes);

            if (slotEnd.getTime() > blockEnd.getTime()) break;

            const overlapsBooking = activeBookings.some((booking) => overlapsBuffered(slotStart, slotEnd, booking.startsAt, booking.endsAt, appointmentBufferMinutes));
            const overlapsEvent = activeEvents.some((event) => overlapsBuffered(slotStart, slotEnd, event.startsAt, event.endsAt, appointmentBufferMinutes));
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

function overlapsBuffered(firstStart: Date, firstEnd: Date, startsAt: string, endsAt: string, appointmentBufferMinutes: number) {
    const secondStart = new Date(startsAt);
    secondStart.setMinutes(secondStart.getMinutes() - appointmentBufferMinutes);
    const secondEnd = new Date(endsAt);
    secondEnd.setMinutes(secondEnd.getMinutes() + appointmentBufferMinutes);
    return overlaps(firstStart, firstEnd, secondStart, secondEnd);
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
        itemType: "APPOINTMENT_SLOT",
        serviceId: "",
        capacity: 1,
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

function toIsoDateAndTime(date: string, time: string) {
    return new Date(`${date}T${time}:00`).toISOString();
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

function formatTimeRange(start: string, end: string, locale: string) {
    return `${formatTime(start, locale)}–${formatTime(end, locale)}`;
}

function formatAmount(value: number, locale: string) {
    return new Intl.NumberFormat(locale === "ua" ? "uk-UA" : "en-US", {currency: "UAH", style: "currency"}).format(value);
}

function formatPercent(value: number, locale: string) {
    return new Intl.NumberFormat(locale === "ua" ? "uk-UA" : "en-US", {maximumFractionDigits: 2, style: "percent"}).format(value / 100);
}

function formatMinutes(value: number, copy: ReturnType<typeof scheduleCopy>) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    if (hours === 0) return `${minutes} ${copy.minutesShort}`;
    if (minutes === 0) return `${hours} ${copy.hoursShort}`;
    return `${hours} ${copy.hoursShort} ${minutes} ${copy.minutesShort}`;
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
