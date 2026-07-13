"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {ReactNode} from "react";
import {createPortal} from "react-dom";
import {useLocale, useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateManualBookingMutation, useListSpecialistBookingsQuery} from "@/features/bookings/bookings.api";
import {bookingServiceTitle} from "@/features/bookings/bookingTitles";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {useListServicesQuery} from "@/features/services/services.api";
import {useListUsersQuery} from "@/features/users/users.api";
import {
    useCreateAvailabilityMutation,
    useCopyDayPlanMutation,
    useCreateSpecialistEventMutation,
    useDeleteSpecialistEventMutation,
    useGetScheduleConfigQuery,
    useListAvailabilityQuery,
    useListSpecialistEventEnrollmentsQuery,
    useListSpecialistEventsQuery,
    useUpdateAvailabilityMutation,
    useUpdateSpecialistEventMutation
} from "@/features/schedule/schedule.api";
import {
    buildManualBookingSlots,
    filterCalendarBlocks,
    filterCalendarBookings,
    filterCalendarEvents,
    hasRestPeriodConflict,
    isPastRange,
    type CalendarBuffer,
    type CalendarFilterState
} from "@/features/schedule/specialistScheduleLogic";
import AtaraksiaCalendar, {
    toCalendarView,
    type AtaraksiaCalendarEvent,
    type AtaraksiaCalendarMessages
} from "@/features/schedule/AtaraksiaCalendar";
import type {DayPlanCopyConflict, DayPlanCopyInput, DayPlanCopyResponse, ScheduleBlockStatus, ScheduleBlockType, SpecialistAvailabilityBlock, SpecialistFixedEvent, SpecialistFixedEventEnrollment, SpecialistFixedEventInput} from "@/types/schedule";
import type {SpecialistBooking} from "@/types/bookings";
import type {PublicService} from "@/types/services";
import type {AdminUser} from "@/types/users";
import type {Locale} from "@/i18n";
import {formatCurrencyAmount as formatAmount} from "@/shared/lib/i18n/formatNumbers";
import {toLanguageTag} from "@/shared/lib/i18n/toLanguageTag";

const personalViews = ["day", "week", "list"] as const;
const teamViews = ["day", "list"] as const;
const emptyBlocks: SpecialistAvailabilityBlock[] = [];
const defaultAppointmentBufferMinutes = 30;
type CalendarView = typeof personalViews[number];
type PlannerMode = "plan" | "bookings" | "all";
type PlannerScope = "mine" | "team";
type PlannerTool = "availability" | "event" | "copy" | "bookings";

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
type CalendarDetail = {
    title: string;
    tone: "available" | "blocked" | "booking" | "event" | "buffer" | "past" | "cancelled";
    rows: Array<{label: string; value: string}>;
};

export default function SpecialistScheduleWorkspace({canManageAllSpecialists, currentUserId}: Props) {
    const t = useTranslations("admin.specialist.page");
    const locale = useLocale();
    const copy = scheduleCopy(t);
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [plannerScope, setPlannerScope] = useState<PlannerScope>("mine");
    const [selectedSpecialistId, setSelectedSpecialistId] = useState<number | "">(currentUserId);
    const [calendarFilters, setCalendarFilters] = useState<CalendarFilterState>({officeId: "", serviceId: "", itemType: "all", status: "all"});
    const range = useMemo(() => buildCalendarRange(currentDate), [currentDate]);
    const scheduleQuery = useMemo(() => ({
        ...range,
        specialistId: selectedSpecialistId
    }), [range, selectedSpecialistId]);
    const hasBackendCalendarFilters = calendarFilters.officeId !== "" || calendarFilters.serviceId !== "" || (calendarFilters.status !== "all" && calendarFilters.status !== "PAST");
    const calendarBackendStatus: CalendarFilterState["status"] | "" = calendarFilters.status === "all" || calendarFilters.status === "PAST" ? "" : calendarFilters.status;
    const calendarScheduleQuery = useMemo(() => ({
        ...range,
        specialistId: selectedSpecialistId,
        officeId: calendarFilters.officeId,
        serviceId: calendarFilters.serviceId,
        status: calendarBackendStatus
    }), [calendarBackendStatus, calendarFilters.officeId, calendarFilters.serviceId, range, selectedSpecialistId]);
    const {data, isFetching, isError, refetch: refetchAvailability} = useListAvailabilityQuery(scheduleQuery, {
        pollingInterval: 30_000,
        skipPollingIfUnfocused: true
    });
    const {data: events = [], isFetching: eventsFetching, isError: eventsError, refetch: refetchEvents} = useListSpecialistEventsQuery(scheduleQuery);
    const {data: eventEnrollments = [], isFetching: eventEnrollmentsFetching, isError: eventEnrollmentsError} = useListSpecialistEventEnrollmentsQuery(scheduleQuery);
    const {data: bookings = [], isFetching: bookingsFetching, isError: bookingsError} = useListSpecialistBookingsQuery(scheduleQuery);
    const {data: calendarData, isFetching: calendarAvailabilityFetching} = useListAvailabilityQuery(calendarScheduleQuery, {
        skip: !hasBackendCalendarFilters,
        pollingInterval: 30_000,
        skipPollingIfUnfocused: true
    });
    const {data: calendarEventsData = [], isFetching: calendarEventsFetching} = useListSpecialistEventsQuery(calendarScheduleQuery, {skip: !hasBackendCalendarFilters});
    const {data: calendarBookingsData = [], isFetching: calendarBookingsFetching} = useListSpecialistBookingsQuery(calendarScheduleQuery, {skip: !hasBackendCalendarFilters});
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
    const [deleteSpecialistEvent] = useDeleteSpecialistEventMutation();
    const [updateAvailability, {isLoading: isUpdatingAvailability}] = useUpdateAvailabilityMutation();
    const [selectedView, setSelectedView] = useState<CalendarView>("week");
    const [plannerMode, setPlannerMode] = useState<PlannerMode>("all");
    const [toolsOpen, setToolsOpen] = useState(false);
    const [toolsVisible, setToolsVisible] = useState(false);
    const [activeTool, setActiveTool] = useState<PlannerTool>("availability");
    const [form, setForm] = useState<AvailabilityForm>(() => buildDefaultForm());
    const [editingBlock, setEditingBlock] = useState<SpecialistAvailabilityBlock | null>(null);
    const [editingEvent, setEditingEvent] = useState<SpecialistFixedEvent | null>(null);
    const [selectedCalendarDetail, setSelectedCalendarDetail] = useState<CalendarDetail | null>(null);
    const calendarDetailTriggerRef = useRef<HTMLElement | null>(null);
    const toolsPanelRef = useRef<HTMLElement | null>(null);
    const toolsTriggerRef = useRef<HTMLElement | null>(null);
    const availableCount = blocks.filter((block) => block.status === "AVAILABLE" && !block.booked).length;
    const eventServices = services.filter((service) => service.bookingMode === "FIXED_EVENT");
    const individualServices = services.filter((service) => service.bookingMode === "INDIVIDUAL_APPOINTMENT");
    const appointmentBufferMinutes = scheduleConfig?.appointmentBufferMinutes ?? defaultAppointmentBufferMinutes;
    const calendarBlocksSource = hasBackendCalendarFilters ? calendarData ?? emptyBlocks : blocks;
    const calendarEventsSource = hasBackendCalendarFilters ? calendarEventsData : events;
    const calendarBookingsSource = hasBackendCalendarFilters ? calendarBookingsData : bookings;
    const calendarIsFetching = hasBackendCalendarFilters
        ? calendarAvailabilityFetching || calendarEventsFetching || calendarBookingsFetching
        : isFetching;
    const filteredCalendarBlocks = useMemo(() => filterCalendarBlocks(calendarBlocksSource, calendarFilters), [calendarBlocksSource, calendarFilters]);
    const filteredCalendarEvents = useMemo(() => filterCalendarEvents(calendarEventsSource, calendarFilters), [calendarEventsSource, calendarFilters]);
    const filteredCalendarBookings = useMemo(() => filterCalendarBookings(calendarBookingsSource, calendarFilters), [calendarBookingsSource, calendarFilters]);
    // The buffer remains part of conflict validation, but is intentionally not a calendar item.
    const filteredCalendarBuffers: CalendarBuffer[] = [];
    const draftConflict = useMemo(
        () => findDraftScheduleConflict(form, blocks, bookings, events, appointmentBufferMinutes, locale, editingBlock?.id),
        [appointmentBufferMinutes, blocks, bookings, editingBlock?.id, events, form, locale]
    );
    const closeTools = useCallback(() => {
        setToolsVisible(false);
        window.setTimeout(() => setToolsOpen(false), 180);
    }, []);

    useEffect(() => {
        const mobileQuery = window.matchMedia("(max-width: 639px)");

        if (mobileQuery.matches) {
            setSelectedView("list");
            setPlannerMode("all");
        }
    }, []);

    useEffect(() => {
        if (!toolsOpen) return;
        const frame = window.requestAnimationFrame(() => setToolsVisible(true));
        if (document.activeElement instanceof HTMLElement && !toolsPanelRef.current?.contains(document.activeElement)) {
            toolsTriggerRef.current = document.activeElement;
        }
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeTools();
            } else if (event.key === "Tab" && toolsPanelRef.current) {
                trapDialogTab(event, toolsPanelRef.current);
            }
        };
        document.addEventListener("keydown", closeOnEscape);
        toolsPanelRef.current?.focus();
        return () => {
            document.removeEventListener("keydown", closeOnEscape);
            window.cancelAnimationFrame(frame);
            document.body.style.overflow = previousOverflow;
            if (toolsTriggerRef.current?.isConnected) toolsTriggerRef.current.focus();
        };
    }, [closeTools, toolsOpen]);

    function updateForm<K extends keyof AvailabilityForm>(field: K, value: AvailabilityForm[K]) {
        setForm((current) => ({...current, [field]: value}));
    }

    function updateCalendarFilter<K extends keyof CalendarFilterState>(field: K, value: CalendarFilterState[K]) {
        setCalendarFilters((current) => ({...current, [field]: value}));
    }

    function openCalendarDetail(detail: CalendarDetail) {
        if (document.activeElement instanceof HTMLElement) {
            calendarDetailTriggerRef.current = document.activeElement;
        }
        setSelectedCalendarDetail(detail);
    }

    async function saveAvailability() {
        try {
            const startsAt = toIsoDateTime(form.startsAt);
            const endsAt = toIsoDateTime(form.endsAt);

            if (!startsAt || !endsAt) {
                toast.error(t("form.invalidRange"));
                return;
            }

            if (draftConflict) {
                toast.error(copy.previewConflict(draftConflict));
                return;
            }

            if (hasRestPeriodConflict(startsAt, endsAt, bookings, events, appointmentBufferMinutes)) {
                toast.error(copy.restConflictError);
                return;
            }

            const body = {
                officeId: form.officeId ? Number(form.officeId) : null,
                specialistId: selectedSpecialistId === "" ? null : selectedSpecialistId,
                status: "AVAILABLE" as const,
                itemType: "OPEN_RANGE" as const,
                serviceId: null,
                capacity: null,
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
        } catch (error) {
            toast.error(apiErrorMessage(error) ?? t("form.saveError"));
        }
    }

    function editEvent(event: SpecialistFixedEvent) {
        setPlannerMode("plan");
        setEditingEvent(event);
        openTool("event");
    }

    function cancelAvailabilityEdit() {
        setEditingBlock(null);
        setForm(buildDefaultForm());
    }

    function openTool(tool: PlannerTool) {
        setPlannerMode(tool === "bookings" ? "bookings" : "plan");
        setActiveTool(tool);
        setToolsOpen(true);
        if (tool === "availability") {
            setForm((current) => ({
                ...current,
                status: "AVAILABLE",
                itemType: "OPEN_RANGE",
                serviceId: "",
                capacity: 1
            }));
        }
    }

    return (
        <section className="w-full min-w-0">
            <div className="min-w-0 space-y-5">
                <header className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
                    <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("eyebrow")}</p>
                            <h1 className="mt-2 break-words text-2xl font-semibold text-stone-950 sm:text-3xl">{t("title")}</h1>
	                            <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-stone-600">{t("description")}</p>
	                        </div>
	                        <div className="flex w-full min-w-0 flex-col gap-2 lg:w-80">
	                            {canManageAllSpecialists ? (
	                                <>
	                                <div className="grid grid-cols-2 rounded-lg bg-stone-100 p-1" aria-label={copy.scopeLabel}>
	                                    {(["mine", "team"] as const).map((scope) => (
	                                        <button
	                                            aria-pressed={plannerScope === scope}
	                                            className={plannerScope === scope ? activeViewClass : viewClass}
	                                            key={scope}
	                                            onClick={() => {
	                                                setPlannerScope(scope);
	                                                setSelectedSpecialistId(scope === "mine" ? currentUserId : "");
	                                                if (scope === "team" && selectedView === "week") setSelectedView("day");
	                                            }}
	                                            type="button"
	                                        >
	                                            {scope === "mine" ? copy.mySchedule : copy.team}
	                                        </button>
	                                    ))}
	                                </div>
	                                {plannerScope === "team" ? <label className="block min-w-0">
	                                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">{copy.specialistFilter}</span>
	                                    <select
	                                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-700"
	                                        disabled={specialistsFetching}
	                                        onChange={(event) => {
	                                            const specialistId = event.target.value ? Number(event.target.value) : "";
	                                            setSelectedSpecialistId(specialistId);
	                                            if (specialistId !== "") setSelectedView("day");
	                                        }}
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
	                                </label> : null}
	                                </>
	                            ) : null}
	                            <div>
	                                <button className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700" onClick={() => openTool("availability")} type="button">
	                                    {t("actions.availability")}
	                                </button>
	                            </div>
	                        </div>
	                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
                        <StatCard label={t("stats.available")} value={availableCount} tone="success" />
                        <StatCard label={copy.eventsTitle} value={events.length} />
                        <StatCard label={t("stats.bookings")} value={bookings.length} />
                    </div>
                </header>

                <PlannerDayFocus
                    blocks={blocks}
                    bookings={bookings}
                    copy={copy}
                    currentDate={currentDate}
                    events={events}
                    locale={locale}
                    onOpenAgenda={() => {
                        setPlannerMode("all");
                        setSelectedView("list");
                    }}
                    onOpenBookings={() => {
                        setPlannerMode("bookings");
                        setActiveTool("bookings");
                        setToolsOpen(true);
                    }}
                    onOpenPlan={() => {
                        openTool("availability");
                    }}
                    onSelectDetail={openCalendarDetail}
                    t={t}
                />

                <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex min-w-0 flex-col gap-3 border-b border-stone-200 bg-stone-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-stone-950">{t("calendar.title")}</h2>
                            <p className="mt-1 break-words text-sm text-stone-500">{formatCalendarTitle(selectedView, currentDate, locale)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800" title={t("calendar.source")}>{calendarIsFetching ? t("calendar.loading") : t("calendar.connected")}</span>
                        </div>
                    </div>
                    <div className="flex min-w-0 flex-col gap-3 border-b border-stone-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-1">
                            <button className={controlButtonClass} onClick={() => setCurrentDate((date) => navigateDate(date, selectedView, -1))} type="button">←</button>
                            <button aria-pressed={dateKey(currentDate) === dateKey(new Date())} className={dateKey(currentDate) === dateKey(new Date()) ? activeViewClass : controlButtonClass} onClick={() => setCurrentDate(new Date())} type="button">{t("controls.today")}</button>
                            <button className={controlButtonClass} onClick={() => setCurrentDate((date) => navigateDate(date, selectedView, 1))} type="button">→</button>
                            <input aria-label={t("calendar.title")} className="h-9 rounded-lg border border-stone-300 bg-white px-2 text-xs font-medium text-stone-700 outline-none transition-colors hover:border-stone-400 focus:border-stone-800" onChange={(event) => {
                                if (event.target.value) setCurrentDate(new Date(`${event.target.value}T12:00:00`));
                            }} type="date" value={dateKey(currentDate)} />
                        </div>
                        <div className="grid w-full min-w-0 grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1 sm:flex sm:w-auto">
                            {(plannerScope === "team" && selectedSpecialistId === "" ? teamViews : personalViews).map((view) => (
                                <button aria-pressed={view === selectedView} className={view === selectedView ? activeViewClass : viewClass} key={view} onClick={() => setSelectedView(view)} type="button">
                                    {t(`views.${view}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <PlannerModeSwitch copy={copy} mode={plannerMode} onChange={(mode) => {
                        setPlannerMode(mode);
                    }} />
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
                            <LegendItem className="border-stone-400 bg-stone-700" label={t("legend.booking")} />
                            <LegendItem className="border-sky-200 bg-sky-50" label={copy.eventsTitle} />
                            <LegendItem className="border-stone-300 bg-stone-50" label={copy.statusPast} />
                            <LegendItem className="border-red-200 bg-red-50" label={copy.statusCancelled} />
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
                            onSelectDetail={openCalendarDetail}
                            plannerMode={plannerMode}
                            selectedView={selectedView}
                            teamScope={plannerScope === "team" && selectedSpecialistId === ""}
                            copy={copy}
                            t={t}
                        />
                    </div>
                    <p className="border-t border-stone-100 px-4 py-3 text-xs leading-5 text-stone-500">{t("calendar.source")}</p>
                </section>
                {selectedCalendarDetail ? <CalendarDetailPanel closeLabel={copy.closeDetails} detail={selectedCalendarDetail} onClose={() => setSelectedCalendarDetail(null)} returnFocusTo={calendarDetailTriggerRef.current} /> : null}
            </div>

            {toolsOpen ? <OverlayPortal>
            <button aria-label={copy.closeDetails} className={`fixed inset-0 z-40 bg-stone-950/20 transition-opacity duration-180 motion-reduce:transition-none ${toolsVisible ? "opacity-100" : "opacity-0"}`} onClick={closeTools} type="button" />
            <aside aria-label={copy.toolsTitle} aria-modal="true" className={`fixed inset-0 z-50 flex max-h-[100dvh] min-w-0 flex-col overflow-hidden border border-stone-200 bg-stone-50 shadow-2xl outline-none transition-[opacity,transform] duration-180 ease-out focus-visible:ring-2 focus-visible:ring-stone-500 motion-reduce:transition-none sm:inset-x-5 sm:bottom-auto sm:top-1/2 sm:mx-auto sm:max-h-[92dvh] sm:w-[min(1180px,calc(100vw-2.5rem))] sm:-translate-y-1/2 sm:rounded-2xl ${toolsVisible ? "translate-y-0 opacity-100 sm:-translate-y-1/2" : "translate-y-4 opacity-0 sm:-translate-y-[48%]"}`} ref={toolsPanelRef} role="dialog" tabIndex={-1}>
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3 sm:px-5">
                    <h2 className="text-base font-semibold text-stone-950">{copy.toolsTitle}</h2>
                    <button aria-label={copy.closeDetails} className={controlButtonClass} onClick={closeTools} type="button">×</button>
                </div>
                <div className="shrink-0 overflow-x-auto border-b border-stone-200 bg-stone-50 px-3 py-2 sm:px-5">
                    <div className="flex min-w-max gap-1" role="tablist">
                        {([
                            ["availability", copy.toolAvailability],
                            ["event", copy.toolEvent],
                            ["copy", copy.toolCopy],
                            ["bookings", copy.toolBookings]
                        ] as Array<[PlannerTool, string]>).map(([tool, label]) => (
                            <button aria-selected={activeTool === tool} className={activeTool === tool ? activeViewClass : viewClass} key={tool} onClick={() => openTool(tool)} role="tab" type="button">{label}</button>
                        ))}
                    </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
                {activeTool === "availability" ? (
                    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)]">
                <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5" id="availability-form">
                    <div className="border-b border-stone-100 pb-3">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                            <h2 className="min-w-0 break-words text-base font-semibold text-stone-950">{editingBlock ? copy.editAvailability : t("form.availableTitle")}</h2>
                            {editingBlock ? <button className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100" onClick={cancelAvailabilityEdit} type="button">{copy.cancelEdit}</button> : null}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{t("form.hint")}</p>
                        {editingBlock?.booked ? <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{copy.bookedBlockEditHint}</p> : null}
                    </div>
                    <div className="mt-5 space-y-4">
                        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">{t("form.hint")}</p>
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
                            disabled={Boolean(draftConflict) || isCreating || isUpdatingAvailability}
                            onClick={saveAvailability}
                            type="button"
                        >
                            {isCreating || isUpdatingAvailability ? t("form.saving") : editingBlock ? copy.saveAvailability : t("actions.availability")}
                        </button>
                    </div>
                </section>
                <AvailabilityDraftPreview
                    blocks={blocks}
                    bookings={bookings}
                    conflict={draftConflict}
                    copy={copy}
                    currentDate={currentDate}
                    events={events}
                    form={form}
                    locale={locale}
                    onNavigate={(date) => {
                        setCurrentDate(date);
                        const currentStart = new Date(form.startsAt);
                        const currentEnd = new Date(form.endsAt);
                        if (Number.isNaN(currentStart.getTime()) || Number.isNaN(currentEnd.getTime())) return;
                        const duration = currentEnd.getTime() - currentStart.getTime();
                        const nextStart = new Date(date);
                        nextStart.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0);
                        updateForm("startsAt", toDateTimeLocalValue(nextStart));
                        updateForm("endsAt", toDateTimeLocalValue(new Date(nextStart.getTime() + duration)));
                    }}
                    t={t}
                />
                    </div>
                ) : null}
                {activeTool === "event" ? <div className="grid gap-4 lg:grid-cols-2">
                <FixedEventForm
                    copy={copy}
                    editingEvent={editingEvent}
                    isLoading={isCreatingEvent || isUpdatingEvent}
                    offices={offices}
                    officesFetching={officesFetching}
                    onCreate={async (body) => {
                        if (hasRestPeriodConflict(body.startsAt, body.endsAt, bookings, events, appointmentBufferMinutes, editingEvent?.id)) {
                            toast.error(copy.restConflictError);
                            return;
                        }

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
                    onDelete={async (event) => {
                        try {
                            await deleteSpecialistEvent(event.id).unwrap();
                            void refetchEvents();
                            toast.success(copy.eventDeleted);
                        } catch (error) {
                            toast.error(apiErrorMessage(error) ?? copy.eventDeleteError);
                        }
                    }}
                    onEdit={editEvent}
                />
                </div> : null}
                {activeTool === "copy" ? <DayPlanCopyForm
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
                /> : null}
                {activeTool === "bookings" ? <div className="grid gap-4 lg:grid-cols-2">
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
                        <div className="space-y-4">
                        <EventEnrollmentsPanel
                            copy={copy}
                            enrollments={eventEnrollments}
                            isError={eventEnrollmentsError}
                            isFetching={eventEnrollmentsFetching}
                            locale={locale}
                        />
                        <BookingsPanel bookings={bookings} copy={copy} isError={bookingsError} isFetching={bookingsFetching} locale={locale} t={t} />
                        </div>
                </div> : null}
                </div>
            </aside>
            </OverlayPortal> : null}
        </section>
    );
}

function apiErrorMessage(error: unknown) {
    if (typeof error !== "object" || error === null || !("data" in error)) return null;
    const data = (error as {data?: {message?: unknown}}).data;
    return typeof data?.message === "string" && data.message.trim() ? data.message : null;
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
    teamScope,
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
    teamScope: boolean;
    t: T;
}) {
    const detailByEventId = new Map<string, CalendarDetail>();
    const visibleBlocks = plannerMode === "bookings" ? [] : blocks;
    const visibleBookings = plannerMode === "plan" ? [] : bookings;
    const visibleEvents = plannerMode === "bookings" ? [] : events;
    const visibleBuffers = plannerMode === "all" ? buffers.slice(0, 80) : buffers.slice(0, 40);

    if (teamScope && selectedView === "day") {
        return (
            <TeamResourceDay
                bookings={visibleBookings}
                blocks={visibleBlocks}
                buffers={visibleBuffers}
                copy={copy}
                currentDate={currentDate}
                events={visibleEvents}
                locale={locale}
                onSelectDetail={onSelectDetail}
                t={t}
            />
        );
    }

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
                tone: calendarToneForBlock(block)
            };
        }),
        ...visibleBookings.map((booking) => {
            const id = `booking-${booking.id}`;
            detailByEventId.set(id, bookingCalendarDetail(booking, copy, locale, t));
            return {
                id,
                badge: formatTimeRange(booking.startsAt, booking.endsAt, locale),
                title: bookingServiceTitle(booking, locale),
                meta: [bookingStatusLabel(booking, copy, t), booking.clientName, booking.officeName].filter(Boolean).join(" · "),
                start: new Date(booking.startsAt),
                end: new Date(booking.endsAt),
                tone: calendarToneForBooking(booking)
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
                meta: [eventStatusLabel(event, copy), `${event.enrolledCount}/${event.capacity}`, event.officeName ?? copy.noOffice].join(" · "),
                start: new Date(event.startsAt),
                end: new Date(event.endsAt),
                tone: calendarToneForEvent(event)
            };
        })
    ];

    return (
        <AtaraksiaCalendar
            culture={toLanguageTag(locale)}
            date={currentDate}
            events={calendarEvents}
            max={workingHourDate(20)}
            messages={copy.calendarMessages}
            min={workingHourDate(8)}
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

function TeamResourceDay({bookings, blocks, buffers, copy, currentDate, events, locale, onSelectDetail, t}: {
    bookings: SpecialistBooking[];
    blocks: SpecialistAvailabilityBlock[];
    buffers: CalendarBuffer[];
    copy: ReturnType<typeof scheduleCopy>;
    currentDate: Date;
    events: SpecialistFixedEvent[];
    locale: string;
    onSelectDetail: (detail: CalendarDetail) => void;
    t: T;
}) {
    const selectedDay = dateKey(currentDate);
    const entries = [
        ...blocks.map((block) => ({
            detail: blockCalendarDetail(block, copy, locale, t),
            end: block.endsAt,
            id: `block-${block.id}`,
            meta: [blockStatusLabel(block, copy, t), block.officeName ?? copy.noOffice, block.serviceTitle].filter(Boolean).join(" · "),
            specialistName: block.specialistName,
            start: block.startsAt,
            tone: calendarToneForBlock(block)
        })),
        ...bookings.map((booking) => ({
            detail: teamBookingCalendarDetail(booking, copy, locale, t),
            end: booking.endsAt,
            id: `booking-${booking.id}`,
            meta: [bookingStatusLabel(booking, copy, t), booking.officeName ?? copy.noOffice].join(" · "),
            specialistName: booking.specialistName,
            start: booking.startsAt,
            tone: calendarToneForBooking(booking)
        })),
        ...events.map((event) => ({
            detail: eventCalendarDetail(event, copy, locale),
            end: event.endsAt,
            id: `event-${event.id}`,
            meta: [eventStatusLabel(event, copy), `${event.enrolledCount}/${event.capacity}`, event.officeName ?? copy.noOffice].join(" · "),
            specialistName: event.specialistName,
            start: event.startsAt,
            tone: calendarToneForEvent(event)
        })),
        ...buffers.map((buffer) => ({
            detail: bufferCalendarDetail(buffer, copy, locale),
            end: buffer.endsAt,
            id: `buffer-${buffer.id}`,
            meta: [copy.buffer, buffer.officeName ?? copy.noOffice].join(" · "),
            specialistName: buffer.specialistName,
            start: buffer.startsAt,
            tone: "buffer" as const
        }))
    ]
        .filter((entry) => dateKey(new Date(entry.start)) === selectedDay)
        .sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime());
    const groups = entries.reduce<Map<string, typeof entries>>((result, entry) => {
        const name = entry.specialistName || copy.notAssigned;
        result.set(name, [...(result.get(name) ?? []), entry]);
        return result;
    }, new Map());

    if (groups.size === 0) {
        return <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">{copy.teamDayEmpty}</p>;
    }

    return (
        <div className="overflow-x-auto pb-2">
            <div className="grid min-w-max auto-cols-[minmax(260px,320px)] grid-flow-col gap-3" role="list">
                {Array.from(groups.entries()).map(([specialistName, groupEntries]) => (
                    <section className="rounded-xl border border-stone-200 bg-stone-50 p-3" key={specialistName} role="listitem">
                        <div className="mb-3 border-b border-stone-200 pb-2">
                            <h3 className="text-sm font-semibold text-stone-950">{specialistName}</h3>
                            <p className="mt-0.5 text-xs text-stone-500">{copy.teamDayItems(groupEntries.length)}</p>
                        </div>
                        <div className="space-y-2">
                            {groupEntries.map((entry) => (
                                <button className="w-full rounded-lg border border-stone-200 bg-white p-3 text-left transition-colors hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500" key={entry.id} onClick={() => onSelectDetail(entry.detail)} type="button">
                                    <span className="flex items-center gap-2">
                                        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${agendaToneDot(entry.tone)}`} />
                                        <span className="text-sm font-semibold text-stone-950">{formatTimeRange(entry.start, entry.end, locale)}</span>
                                    </span>
                                    <span className="mt-1 block text-sm font-medium text-stone-800">{entry.detail.title}</span>
                                    <span className="mt-1 block text-xs leading-5 text-stone-500">{entry.meta}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

function PlannerModeSwitch({copy, mode, onChange}: {copy: ReturnType<typeof scheduleCopy>; mode: PlannerMode; onChange: (mode: PlannerMode) => void}) {
    const options: Array<{label: string; value: PlannerMode}> = [
        {label: copy.planMode, value: "plan"},
        {label: copy.bookingsTitle, value: "bookings"},
        {label: copy.allMode, value: "all"}
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

function PlannerDayFocus({
    blocks,
    bookings,
    copy,
    currentDate,
    events,
    locale,
    onOpenAgenda,
    onOpenBookings,
    onOpenPlan,
    onSelectDetail,
    t
}: {
    blocks: SpecialistAvailabilityBlock[];
    bookings: SpecialistBooking[];
    copy: ReturnType<typeof scheduleCopy>;
    currentDate: Date;
    events: SpecialistFixedEvent[];
    locale: string;
    onOpenAgenda: () => void;
    onOpenBookings: () => void;
    onOpenPlan: () => void;
    onSelectDetail: (detail: CalendarDetail) => void;
    t: T;
}) {
    const dayItems = useMemo(() => {
        const key = dateKey(currentDate);
        return {
            available: blocks.filter((block) => block.status === "AVAILABLE" && !block.booked && dateKey(new Date(block.startsAt)) === key),
            blocked: blocks.filter((block) => block.status === "BLOCKED" && dateKey(new Date(block.startsAt)) === key),
            bookings: bookings.filter((booking) => booking.status !== "CANCELLED" && dateKey(new Date(booking.startsAt)) === key),
            pendingBookings: bookings.filter((booking) => booking.status === "AWAITING_PAYMENT_CONFIRMATION" && dateKey(new Date(booking.startsAt)) === key),
            events: events.filter((event) => event.active && dateKey(new Date(event.startsAt)) === key)
        };
    }, [blocks, bookings, currentDate, events]);
    const allNextItems = [
        ...dayItems.bookings.map((booking) => ({
            id: `booking-${booking.id}`,
            detail: bookingCalendarDetail(booking, copy, locale, t),
            startsAt: booking.startsAt,
            title: bookingServiceTitle(booking, locale),
            meta: booking.clientName,
            tone: "booking" as const
        })),
        ...dayItems.events.map((event) => ({
            id: `event-${event.id}`,
            detail: eventCalendarDetail(event, copy, locale),
            startsAt: event.startsAt,
            title: event.serviceTitle,
            meta: `${event.enrolledCount}/${event.capacity}`,
            tone: "event" as const
        })),
        ...dayItems.available.map((block) => ({
            id: `block-${block.id}`,
            detail: blockCalendarDetail(block, copy, locale, t),
            startsAt: block.startsAt,
            title: scheduleBlockTypeLabel(block, copy),
            meta: block.officeName ?? copy.noOffice,
            tone: "available" as const
        })),
        ...dayItems.blocked.map((block) => ({
            id: `blocked-${block.id}`,
            detail: blockCalendarDetail(block, copy, locale, t),
            startsAt: block.startsAt,
            title: scheduleBlockTypeLabel(block, copy),
            meta: block.officeName ?? copy.noOffice,
            tone: "blocked" as const
        }))
    ].sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
    const nextItems = allNextItems.slice(0, 5);
    const hiddenNextItems = Math.max(0, allNextItems.length - nextItems.length);

    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{copy.dayFocusEyebrow}</p>
                    <h2 className="mt-1 text-lg font-semibold text-stone-950">{copy.dayFocusTitle}</h2>
                    <p className="mt-1 text-sm text-stone-500">{formatLongDate(currentDate, locale)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className={controlButtonClass} onClick={onOpenPlan} type="button">{copy.planMode}</button>
                    <button className={controlButtonClass} onClick={onOpenBookings} type="button">{copy.bookingsTitle}</button>
                    <button className={controlButtonClass} onClick={onOpenAgenda} type="button">{copy.agendaAction}</button>
                </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <CompactMetric label={copy.bookingsTitle} value={dayItems.bookings.length} />
                <CompactMetric label={copy.dayFocusPending} tone={dayItems.pendingBookings.length > 0 ? "warning" : "neutral"} value={dayItems.pendingBookings.length} />
                <CompactMetric label={copy.eventsTitle} value={dayItems.events.length} />
                <CompactMetric label={copy.availabilityTitle} value={dayItems.available.length} />
                <CompactMetric label={copy.blocksTitle} value={dayItems.blocked.length} />
            </div>
            {nextItems.length > 0 ? (
                <div className="mt-4">
                    <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <h3 className="break-words text-sm font-semibold text-stone-950">{copy.dayFocusNext}</h3>
                        {hiddenNextItems > 0 ? <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-500">{copy.dayFocusMore(hiddenNextItems)}</span> : null}
                    </div>
                    <div className="grid gap-2 lg:grid-cols-5">
                        {nextItems.map((item) => (
                            <button className={`${dayFocusItemClass(item.tone)} text-left transition-colors hover:border-stone-400 hover:bg-white`} key={item.id} onClick={() => onSelectDetail(item.detail)} type="button">
                                <p className="text-xs font-semibold text-stone-500">{formatTime(item.startsAt, locale)}</p>
                                <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-stone-950">{item.title}</h3>
                                <p className="mt-1 truncate text-xs text-stone-500">{item.meta}</p>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="mt-4 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-sm text-stone-500">{copy.dayFocusEmpty}</p>
            )}
        </section>
    );
}

function CompactMetric({label, tone = "neutral", value}: {label: string; tone?: "neutral" | "warning"; value: number}) {
    return (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-xs font-medium text-stone-500">{label}</p>
            <p className={`mt-1 text-lg font-semibold ${tone === "warning" ? "text-amber-800" : "text-stone-950"}`}>{value}</p>
        </div>
    );
}

function dayFocusItemClass(tone: "available" | "blocked" | "booking" | "event") {
    const base = "min-w-0 rounded-lg border px-3 py-2";
    if (tone === "available") return `${base} border-emerald-200 bg-emerald-50`;
    if (tone === "event") return `${base} border-sky-200 bg-sky-50`;
    if (tone === "blocked") return `${base} border-amber-200 bg-amber-50`;
    return `${base} border-stone-300 bg-stone-50`;
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
    const allEntries = [
        ...blocks.map((block) => ({detail: blockCalendarDetail(block, copy, locale, t), end: block.endsAt, id: `block-${block.id}`, meta: [blockStatusLabel(block, copy, t), block.officeName ?? copy.noOffice, block.serviceTitle].filter(Boolean).join(" · "), specialistName: block.specialistName, start: block.startsAt, tone: calendarToneForBlock(block)})),
        ...bookings.map((booking) => ({detail: bookingCalendarDetail(booking, copy, locale, t), end: booking.endsAt, id: `booking-${booking.id}`, meta: [bookingStatusLabel(booking, copy, t), booking.clientName, booking.officeName ?? copy.noOffice].filter(Boolean).join(" · "), specialistName: booking.specialistName, start: booking.startsAt, tone: calendarToneForBooking(booking)})),
        ...events.map((event) => ({detail: eventCalendarDetail(event, copy, locale), end: event.endsAt, id: `event-${event.id}`, meta: [eventStatusLabel(event, copy), `${event.enrolledCount}/${event.capacity}`, event.officeName ?? copy.noOffice].join(" · "), specialistName: event.specialistName, start: event.startsAt, tone: calendarToneForEvent(event)})),
        ...buffers.map((buffer) => ({detail: bufferCalendarDetail(buffer, copy, locale), end: buffer.endsAt, id: `buffer-${buffer.id}`, meta: [copy.buffer, buffer.officeName ?? copy.noOffice].join(" · "), specialistName: buffer.specialistName, start: buffer.startsAt, tone: "buffer" as const}))
    ].sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime());
    const entries = allEntries.slice(0, 160);
    const hiddenEntries = Math.max(0, allEntries.length - entries.length);
    const groupedEntries = entries.reduce<Array<{dateKey: string; entries: typeof entries}>>((groups, entry) => {
        const key = dateKey(new Date(entry.start));
        const currentGroup = groups.at(-1);
        if (currentGroup?.dateKey === key) {
            currentGroup.entries.push(entry);
        } else {
            groups.push({dateKey: key, entries: [entry]});
        }
        return groups;
    }, []);

    if (entries.length === 0) {
        return <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">{t("blocks.empty")}</p>;
    }

    return (
        <div className="space-y-5">
            {groupedEntries.map((group) => (
                <section className="min-w-0" key={group.dateKey}>
                    <h3 className="mb-2 break-words text-xs font-semibold uppercase tracking-wide text-stone-500">{formatLongDate(new Date(`${group.dateKey}T00:00:00`), locale)}</h3>
                    <div className="space-y-2">
                        {group.entries.map((entry) => (
                            <button className="grid w-full min-w-0 gap-3 rounded-xl border border-stone-200 bg-white px-3 py-3 text-left transition-colors hover:border-stone-400 hover:bg-stone-50 sm:grid-cols-[112px_minmax(0,1fr)]" key={entry.id} onClick={() => onSelectDetail(entry.detail)} type="button">
                                <span className="text-sm font-semibold text-stone-950">{formatTimeRange(entry.start, entry.end, locale)}</span>
                                <span className="min-w-0">
                                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                                        <span className={`h-2.5 w-2.5 rounded-full ${agendaToneDot(entry.tone)}`} aria-hidden="true" />
                                        <span className="min-w-0 truncate text-sm font-semibold text-stone-950">{entry.detail.title}</span>
                                    </span>
                                    <span className="mt-1 block truncate text-xs text-stone-500">{entry.meta}</span>
                                    <span className="mt-0.5 block truncate text-xs text-stone-400">{entry.specialistName}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            ))}
            {hiddenEntries > 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("schedule.agendaLimitNotice", {count: hiddenEntries})}</p>
            ) : null}
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
    const activeChips = activeCalendarFilterChips(filters, offices, services, copy);

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
                        <option value="FIXED_EVENT">{copy.eventsTitle}</option>
                        <option value="BOOKING">{copy.bookingsTitle}</option>
                    </select>
                </CompactSelect>
                <CompactSelect label={copy.statusFilter}>
                    <select className={compactSelectClass} onChange={(event) => onChange("status", event.target.value as CalendarFilterState["status"])} value={filters.status}>
                        <option value="all">{copy.allStatuses}</option>
                        <option value="AVAILABLE">{copy.statusAvailable}</option>
                        <option value="AWAITING_PAYMENT_CONFIRMATION">{copy.statusAwaitingPayment}</option>
                        <option value="CONFIRMED">{copy.statusConfirmed}</option>
                        <option value="CANCELLED">{copy.statusCancelled}</option>
                        <option value="PAST">{copy.statusPast}</option>
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
            {activeChips.length > 0 ? (
                <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
                    {activeChips.map((chip) => (
                        <span className="max-w-full break-words rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700" key={chip}>{chip}</span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function activeCalendarFilterChips(
    filters: CalendarFilterState,
    offices: Array<{id: number; name: string}>,
    services: PublicService[],
    copy: ReturnType<typeof scheduleCopy>
) {
    const chips: string[] = [];
    if (filters.officeId !== "") {
        chips.push(offices.find((office) => office.id === filters.officeId)?.name ?? copy.office);
    }
    if (filters.serviceId !== "") {
        chips.push(services.find((service) => service.id === filters.serviceId)?.title ?? copy.serviceFilter);
    }
    if (filters.itemType !== "all") {
        chips.push(calendarItemFilterLabel(filters.itemType, copy));
    }
    if (filters.status !== "all") {
        chips.push(calendarStatusFilterLabel(filters.status, copy));
    }
    return chips;
}

function calendarItemFilterLabel(value: CalendarFilterState["itemType"], copy: ReturnType<typeof scheduleCopy>) {
    if (value === "APPOINTMENT_SLOT") return copy.appointmentSlot;
    if (value === "OPEN_RANGE") return copy.openRange;
    if (value === "BLOCK") return copy.blocksTitle;
    if (value === "FIXED_EVENT") return copy.eventsTitle;
    if (value === "BOOKING") return copy.bookingsTitle;
    if (value === "BUFFER") return copy.buffer;
    return copy.allItems;
}

function calendarStatusFilterLabel(value: CalendarFilterState["status"], copy: ReturnType<typeof scheduleCopy>) {
    if (value === "AVAILABLE") return copy.statusAvailable;
    if (value === "BLOCKED") return copy.statusBlocked;
    if (value === "AWAITING_PAYMENT_CONFIRMATION") return copy.statusAwaitingPayment;
    if (value === "CONFIRMED") return copy.statusConfirmed;
    if (value === "CANCELLED") return copy.statusCancelled;
    if (value === "PAST") return copy.statusPast;
    if (value === "ACTIVE_EVENT") return copy.statusActiveEvent;
    if (value === "INACTIVE_EVENT") return copy.statusInactiveEvent;
    return copy.allStatuses;
}

function CompactSelect({children, label}: {children: ReactNode; label: string}) {
    return (
        <label className="min-w-0">
            <span className="mb-1 block break-words text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</span>
            {children}
        </label>
    );
}

function CalendarDetailPanel({closeLabel, detail, onClose, returnFocusTo}: {closeLabel: string; detail: CalendarDetail; onClose: () => void; returnFocusTo: HTMLElement | null}) {
    const panelRef = useRef<HTMLElement>(null);
    const onCloseRef = useRef(onClose);
    const returnFocusRef = useRef(returnFocusTo);
    onCloseRef.current = onClose;
    returnFocusRef.current = returnFocusTo;
    const toneClass = detail.tone === "available"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : detail.tone === "blocked"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : detail.tone === "event"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : detail.tone === "buffer"
        ? "border-stone-300 bg-stone-100 text-stone-700"
        : detail.tone === "past"
        ? "border-stone-300 bg-stone-50 text-stone-600"
        : detail.tone === "cancelled"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-stone-300 bg-stone-800 text-white";

    useEffect(() => {
        const panel = panelRef.current;
        if (!panel) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        panel.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onCloseRef.current();
            } else if (event.key === "Tab") {
                trapDialogTab(event, panel);
            }
        };
        panel.addEventListener("keydown", handleKeyDown);
        return () => {
            panel.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
        };
    }, []);

    return (
        <OverlayPortal>
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-5" role="presentation">
        <button aria-label={closeLabel} className="absolute inset-0 bg-stone-950/40" onClick={onClose} type="button" />
        <section aria-labelledby="planner-detail-title" aria-modal="true" className="relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-stone-200 bg-white p-4 shadow-2xl outline-none motion-safe:animate-[content-enter_200ms_ease-out_both] motion-reduce:animate-none focus-visible:ring-2 focus-visible:ring-stone-400 sm:max-w-2xl sm:rounded-2xl sm:p-5" ref={panelRef} role="dialog" tabIndex={-1}>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`} id="planner-detail-title">{detail.title}</h2>
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
        </div>
        </OverlayPortal>
    );
}

function OverlayPortal({children}: {children: ReactNode}) {
    return createPortal(children, document.body);
}

function trapDialogTab(event: KeyboardEvent, container: HTMLElement) {
    const focusable = Array.from(container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
    if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
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

function AvailabilityDraftPreview({blocks, bookings, conflict, copy, currentDate, events, form, locale, onNavigate, t}: {
    blocks: SpecialistAvailabilityBlock[];
    bookings: SpecialistBooking[];
    conflict: string | null;
    copy: ReturnType<typeof scheduleCopy>;
    currentDate: Date;
    events: SpecialistFixedEvent[];
    form: AvailabilityForm;
    locale: string;
    onNavigate: (date: Date) => void;
    t: T;
}) {
    const start = new Date(form.startsAt);
    const end = new Date(form.endsAt);
    const hasDraft = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end;
    const calendarEvents: AtaraksiaCalendarEvent[] = [
        ...blocks.map((block) => ({
            id: `preview-block-${block.id}`,
            title: scheduleBlockLabel(block, copy, t),
            meta: block.officeName ?? copy.noOffice,
            start: new Date(block.startsAt),
            end: new Date(block.endsAt),
            tone: calendarToneForBlock(block)
        })),
        ...bookings.filter((booking) => booking.status !== "CANCELLED").map((booking) => ({
            id: `preview-booking-${booking.id}`,
            title: bookingServiceTitle(booking, locale),
            meta: booking.officeName ?? copy.noOffice,
            start: new Date(booking.startsAt),
            end: new Date(booking.endsAt),
            tone: calendarToneForBooking(booking)
        })),
        ...events.filter((event) => event.active).map((event) => ({
            id: `preview-event-${event.id}`,
            title: event.serviceTitle,
            meta: event.officeName ?? copy.noOffice,
            start: new Date(event.startsAt),
            end: new Date(event.endsAt),
            tone: calendarToneForEvent(event)
        })),
        ...(hasDraft ? [{
            id: "availability-draft",
            title: form.status === "BLOCKED" ? copy.toolBlocking : copy.previewDraft,
            meta: conflict ? copy.previewConflictShort : copy.previewReady,
            start,
            end,
            tone: conflict ? "cancelled" as const : form.status === "BLOCKED" ? "blocked" as const : "available" as const
        }] : [])
    ];

    return (
        <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex min-w-0 flex-col gap-3 border-b border-stone-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-stone-950">{copy.previewTitle}</h2>
                    <p className="mt-1 text-xs leading-5 text-stone-500">{copy.previewBody}</p>
                </div>
                <label className="shrink-0">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">{copy.previewDate}</span>
                    <input className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-700" onChange={(event) => {
                        if (!event.target.value) return;
                        const date = new Date(`${event.target.value}T12:00:00`);
                        if (!Number.isNaN(date.getTime())) onNavigate(date);
                    }} type="date" value={toDateInputValue(currentDate)} />
                </label>
            </div>
            <div className="my-3 flex flex-wrap gap-2">
                <button className={controlButtonClass} onClick={() => onNavigate(navigateDate(currentDate, "week", -1))} type="button">←</button>
                <button className={controlButtonClass} onClick={() => onNavigate(new Date())} type="button">{copy.calendarMessages.today}</button>
                <button className={controlButtonClass} onClick={() => onNavigate(navigateDate(currentDate, "week", 1))} type="button">→</button>
            </div>
            {conflict ? <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800" role="alert">{copy.previewConflict(conflict)}</p> : <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{copy.previewReady}</p>}
            <AtaraksiaCalendar culture={toLanguageTag(locale)} date={currentDate} events={calendarEvents} max={workingHourDate(20)} messages={copy.calendarMessages} min={workingHourDate(8)} onNavigate={onNavigate} variant="preview" view={toCalendarView("week")} />
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
                    <input
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-700"
                        onChange={(event) => setTargetDatesText(event.target.value)}
                        type="date"
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

function EventsPanel({copy, events, isError, isFetching, locale, onDeactivate, onDelete, onEdit}: {copy: ReturnType<typeof scheduleCopy>; events: SpecialistFixedEvent[]; isError: boolean; isFetching: boolean; locale: string; onDeactivate: (event: SpecialistFixedEvent) => void; onDelete: (event: SpecialistFixedEvent) => void; onEdit: (event: SpecialistFixedEvent) => void}) {
    const [pendingDeactivateId, setPendingDeactivateId] = useState<number | null>(null);

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
                            {event.enrolledCount === 0 ? <button className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50" onClick={() => {if (window.confirm(copy.eventDeleteConfirm)) onDelete(event)}} type="button">{copy.deleteEvent}</button> : null}
                            {event.active ? (
                                pendingDeactivateId === event.id ? (
                                    <>
                                        <button className="rounded-md bg-amber-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-600" onClick={() => { onDeactivate(event); setPendingDeactivateId(null); }} type="button">{copy.deactivateConfirmAction}</button>
                                        <button className="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100" onClick={() => setPendingDeactivateId(null)} type="button">{copy.cancelEdit}</button>
                                    </>
                                ) : (
                                    <button className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100" onClick={() => setPendingDeactivateId(event.id)} type="button">{copy.deactivateEvent}</button>
                                )
                            ) : null}
                        </div>
                        {pendingDeactivateId === event.id ? <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs leading-5 text-amber-800">{copy.deactivateConfirmBody}</p> : null}
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

function BookingsPanel({bookings, copy, isError, isFetching, locale, t}: {bookings: SpecialistBooking[]; copy: ReturnType<typeof scheduleCopy>; isError: boolean; isFetching: boolean; locale: string; t: T}) {
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
                                <BookingStatusBadge booking={booking} copy={copy} t={t} />
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

function BookingStatusBadge({booking, copy, t}: {booking: SpecialistBooking; copy: ReturnType<typeof scheduleCopy>; t: T}) {
    const tone = calendarToneForBooking(booking);
    const className = tone === "cancelled"
        ? "border-red-200 bg-red-50 text-red-800"
        : tone === "past"
        ? "border-stone-300 bg-stone-50 text-stone-600"
        : booking.status === "CONFIRMED"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
    return <span className={`max-w-full break-words rounded-full border px-2 py-1 text-[10px] font-semibold sm:shrink-0 ${className}`}>{bookingStatusLabel(booking, copy, t)}</span>;
}

function StatCard({label, tone = "neutral", value}: {label: string; tone?: "neutral" | "success" | "warning"; value: number}) {
    const valueClass = tone === "success" ? "text-emerald-800" : tone === "warning" ? "text-amber-800" : "text-stone-950";
    return <div className="flex min-h-20 min-w-0 flex-col justify-center rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 sm:px-4"><p className={`break-words text-xl font-semibold sm:text-2xl ${valueClass}`}>{value}</p><p className="mt-1.5 break-words text-xs font-medium text-stone-500">{label}</p></div>;
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
    if (tone === "past") return "bg-stone-300";
    if (tone === "cancelled") return "bg-red-500";
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

function calendarToneForBlock(block: SpecialistAvailabilityBlock): CalendarDetail["tone"] {
    if (isPastRange(block.endsAt)) return "past";
    if (block.booked) return "booking";
    return block.status === "AVAILABLE" ? "available" : "blocked";
}

function calendarToneForBooking(booking: SpecialistBooking): CalendarDetail["tone"] {
    if (booking.status === "CANCELLED") return "cancelled";
    if (isPastRange(booking.endsAt)) return "past";
    return "booking";
}

function calendarToneForEvent(event: SpecialistFixedEvent): CalendarDetail["tone"] {
    if (isPastRange(event.endsAt)) return "past";
    return event.active ? "event" : "blocked";
}

function blockStatusLabel(block: SpecialistAvailabilityBlock, copy: ReturnType<typeof scheduleCopy>, t: T) {
    if (isPastRange(block.endsAt)) return copy.statusPast;
    if (block.booked) return t("statuses.booked");
    return block.status === "AVAILABLE" ? t("statuses.available") : t("statuses.blocked");
}

function bookingStatusLabel(booking: SpecialistBooking, copy: ReturnType<typeof scheduleCopy>, t: T) {
    if (booking.status === "CANCELLED") return t("bookings.statuses.CANCELLED");
    if (isPastRange(booking.endsAt)) return copy.statusPast;
    return t(`bookings.statuses.${booking.status}`);
}

function eventStatusLabel(event: SpecialistFixedEvent, copy: ReturnType<typeof scheduleCopy>) {
    if (isPastRange(event.endsAt)) return copy.statusPast;
    return event.active ? copy.statusActiveEvent : copy.statusInactiveEvent;
}

function compactBlockCalendarLabel(block: SpecialistAvailabilityBlock, copy: ReturnType<typeof scheduleCopy>, locale: string, t: T) {
    if (isPastRange(block.endsAt)) return [copy.statusPast, scheduleBlockLabel(block, copy, t), block.officeName].filter(Boolean).join(" · ");
    if (block.booked) return [t("legend.booked"), block.serviceTitle, block.officeName].filter(Boolean).join(" · ");
    if (block.itemType === "APPOINTMENT_SLOT") return [block.serviceTitle ?? copy.appointmentSlot, block.officeName].filter(Boolean).join(" · ");
    return [scheduleBlockLabel(block, copy, t), block.officeName, publicNote(block.notes)].filter(Boolean).join(" · ");
}

function blockCalendarDetail(block: SpecialistAvailabilityBlock, copy: ReturnType<typeof scheduleCopy>, locale: string, t: T): CalendarDetail {
    return {
        title: compactBlockCalendarLabel(block, copy, locale, t) || scheduleBlockLabel(block, copy, t),
        tone: calendarToneForBlock(block),
        rows: [
            {label: copy.detailRecordId, value: `#${block.id}`},
            {label: copy.detailType, value: scheduleBlockTypeLabel(block, copy)},
            {label: copy.detailStatus, value: blockStatusLabel(block, copy, t)},
            {label: copy.startsAt, value: formatDateTime(block.startsAt, locale)},
            {label: copy.endsAt, value: formatDateTime(block.endsAt, locale)},
            {label: copy.specialistFilter, value: block.specialistName},
            {label: copy.office, value: block.officeName ?? copy.noOffice},
            {label: copy.slotService, value: block.serviceTitle ?? copy.notAssigned},
            {label: copy.capacity, value: block.capacity === null ? copy.notAssigned : String(block.capacity)},
            {label: copy.detailBooked, value: block.booked ? copy.yes : copy.no},
            {label: copy.detailCreated, value: formatDateTime(block.createdAt, locale)},
            {label: copy.detailUpdated, value: formatDateTime(block.updatedAt, locale)}
        ].concat(publicNote(block.notes) ? [{label: copy.note, value: publicNote(block.notes) as string}] : [])
    };
}

function bookingCalendarDetail(booking: SpecialistBooking, copy: ReturnType<typeof scheduleCopy>, locale: string, t: T): CalendarDetail {
    return {
        title: `${bookingServiceTitle(booking, locale)} · ${booking.clientName}`,
        tone: calendarToneForBooking(booking),
        rows: [
            {label: copy.detailType, value: copy.bookingsTitle},
            {label: copy.detailStatus, value: bookingStatusLabel(booking, copy, t)},
            {label: copy.startsAt, value: formatDateTime(booking.startsAt, locale)},
            {label: copy.endsAt, value: formatDateTime(booking.endsAt, locale)},
            {label: copy.client, value: booking.clientName},
            {label: copy.clientContact, value: booking.clientContact || copy.noClientContact},
            {label: copy.slotService, value: bookingServiceTitle(booking, locale)},
            {label: copy.office, value: booking.officeName ?? copy.noOffice}
        ]
    };
}

function teamBookingCalendarDetail(booking: SpecialistBooking, copy: ReturnType<typeof scheduleCopy>, locale: string, t: T): CalendarDetail {
    return {
        title: bookingServiceTitle(booking, locale),
        tone: calendarToneForBooking(booking),
        rows: [
            {label: copy.detailType, value: copy.bookingsTitle},
            {label: copy.detailStatus, value: bookingStatusLabel(booking, copy, t)},
            {label: copy.startsAt, value: formatDateTime(booking.startsAt, locale)},
            {label: copy.endsAt, value: formatDateTime(booking.endsAt, locale)},
            {label: copy.specialistFilter, value: booking.specialistName},
            {label: copy.slotService, value: bookingServiceTitle(booking, locale)},
            {label: copy.office, value: booking.officeName ?? copy.noOffice}
        ]
    };
}

function eventCalendarDetail(event: SpecialistFixedEvent, copy: ReturnType<typeof scheduleCopy>, locale: string): CalendarDetail {
    return {
        title: event.serviceTitle,
        tone: calendarToneForEvent(event),
        rows: [
            {label: copy.detailType, value: copy.eventsTitle},
            {label: copy.detailStatus, value: eventStatusLabel(event, copy)},
            {label: copy.startsAt, value: formatDateTime(event.startsAt, locale)},
            {label: copy.endsAt, value: formatDateTime(event.endsAt, locale)},
            {label: copy.specialistFilter, value: event.specialistName},
            {label: copy.office, value: event.officeName ?? copy.noOffice},
            {label: copy.capacity, value: `${event.enrolledCount}/${event.capacity}`},
            {label: copy.price, value: formatAmount(event.price, locale)}
        ].concat(publicNote(event.note) ? [{label: copy.note, value: publicNote(event.note) as string}] : [])
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
    return name || user.phone || user.email || "Specialist";
}

function publicNote(value?: string | null) {
    if (!value) return null;
    if (/\[DEV_(STRESS|EXTRA):/i.test(value)) return null;
    return value;
}

function workingHourDate(hour: number) {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return date;
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

function findDraftScheduleConflict(
    form: AvailabilityForm,
    blocks: SpecialistAvailabilityBlock[],
    bookings: SpecialistBooking[],
    events: SpecialistFixedEvent[],
    appointmentBufferMinutes: number,
    locale: string,
    editingBlockId?: number
) {
    const start = new Date(form.startsAt);
    const end = new Date(form.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null;

    const overlappingBlock = blocks.find((block) => block.id !== editingBlockId && rangesOverlap(start, end, new Date(block.startsAt), new Date(block.endsAt)));
    if (overlappingBlock) return `${overlappingBlock.specialistName}: ${formatTimeRange(overlappingBlock.startsAt, overlappingBlock.endsAt, locale)}`;

    const bufferMilliseconds = appointmentBufferMinutes * 60_000;
    const overlappingBooking = bookings.find((booking) => booking.status !== "CANCELLED" && rangesOverlap(start, end, new Date(booking.startsAt), new Date(new Date(booking.endsAt).getTime() + bufferMilliseconds)));
    if (overlappingBooking) return `${bookingServiceTitle(overlappingBooking, locale)}: ${formatTimeRange(overlappingBooking.startsAt, overlappingBooking.endsAt, locale)}`;

    const overlappingEvent = events.find((event) => event.active && rangesOverlap(start, end, new Date(event.startsAt), new Date(new Date(event.endsAt).getTime() + bufferMilliseconds)));
    if (overlappingEvent) return `${overlappingEvent.serviceTitle}: ${formatTimeRange(overlappingEvent.startsAt, overlappingEvent.endsAt, locale)}`;

    return null;
}

function rangesOverlap(firstStart: Date, firstEnd: Date, secondStart: Date, secondEnd: Date) {
    return firstStart < secondEnd && firstEnd > secondStart;
}

function scheduleCopy(t: T) {
    return {
        availabilityTitle: t("schedule.availabilityTitle"),
        blocksTitle: t("schedule.blocksTitle"),
        eventsTitle: t("schedule.eventsTitle"),
        bookingsTitle: t("schedule.bookingsTitle"),
        planMode: t("schedule.planMode"),
        allMode: t("schedule.allMode"),
        agendaAction: t("schedule.agendaAction"),
        dayFocusEyebrow: t("schedule.dayFocusEyebrow"),
        dayFocusTitle: t("schedule.dayFocusTitle"),
        dayFocusEmpty: t("schedule.dayFocusEmpty"),
        dayFocusNext: t("schedule.dayFocusNext"),
        dayFocusMore: (count: number) => t("schedule.dayFocusMore", {count}),
        dayFocusPending: t("schedule.dayFocusPending"),
        detailsTitle: t("schedule.detailsTitle"),
        detailsBody: t("schedule.detailsBody"),
        scopeLabel: t("schedule.scopeLabel"),
        mySchedule: t("schedule.mySchedule"),
        team: t("schedule.team"),
        toolsTitle: t("schedule.toolsTitle"),
        toolAvailability: t("schedule.toolAvailability"),
        toolBlocking: t("schedule.toolBlocking"),
        toolEvent: t("schedule.toolEvent"),
        toolTemplate: t("schedule.toolTemplate"),
        toolCopy: t("schedule.toolCopy"),
        toolBookings: t("schedule.toolBookings"),
        previewTitle: t("schedule.previewTitle"),
        previewBody: t("schedule.previewBody"),
        previewDate: t("schedule.previewDate"),
        previewDraft: t("schedule.previewDraft"),
        previewReady: t("schedule.previewReady"),
        previewConflictShort: t("schedule.previewConflictShort"),
        previewConflict: (item: string) => t("schedule.previewConflict", {item}),
        teamDayEmpty: t("schedule.teamDayEmpty"),
        teamDayItems: (count: number) => t("schedule.teamDayItems", {count}),
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
        statusPast: t("schedule.statusPast"),
        statusActiveEvent: t("schedule.statusActiveEvent"),
        statusInactiveEvent: t("schedule.statusInactiveEvent"),
        detailType: t("schedule.detailType"),
        detailStatus: t("schedule.detailStatus"),
        detailRecordId: t("schedule.detailRecordId"),
        detailBooked: t("schedule.detailBooked"),
        detailCreated: t("schedule.detailCreated"),
        detailUpdated: t("schedule.detailUpdated"),
        yes: t("schedule.yes"),
        no: t("schedule.no"),
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
        deleteEvent: t("schedule.deleteEvent"),
        eventDeleteConfirm: t("schedule.eventDeleteConfirm"),
        eventDeleted: t("schedule.eventDeleted"),
        eventDeleteError: t("schedule.eventDeleteError"),
        cancelEdit: t("schedule.cancelEdit"),
        deactivateEvent: t("schedule.deactivateEvent"),
        deactivateConfirmBody: t("schedule.deactivateConfirmBody"),
        deactivateConfirmAction: t("schedule.deactivateConfirmAction"),
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
        showLess: t("schedule.showLess"),
        showMore: t("schedule.showMore"),
        showingItems: (visible: number, total: number) => t("schedule.showingItems", {total, visible}),
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
        restConflictError: t("schedule.restConflictError"),
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

function buildDefaultForm(): AvailabilityForm {
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);

    const end = new Date(start);
    end.setHours(end.getHours() + 2);

    return {
        officeId: "",
        status: "AVAILABLE",
        itemType: "OPEN_RANGE",
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

function formatDateTime(value: string, locale: string) {
    const languageTag = toLanguageTag(locale);

    return new Intl.DateTimeFormat(languageTag, {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "short"
    }).format(new Date(value));
}

function formatLongDate(value: Date, locale: string) {
    return new Intl.DateTimeFormat(toLanguageTag(locale), {
        day: "numeric",
        month: "long",
        weekday: "long"
    }).format(value);
}

function dateKey(value: Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function formatTime(value: string, locale: string) {
    const languageTag = toLanguageTag(locale);

    return new Intl.DateTimeFormat(languageTag, {
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

function formatTimeRange(start: string, end: string, locale: string) {
    return `${formatTime(start, locale)}–${formatTime(end, locale)}`;
}

function formatCalendarTitle(view: CalendarView, currentDate: Date, locale: string) {
    const languageTag = toLanguageTag(locale);

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
    if (view === "day") next.setDate(next.getDate() + direction);
    else next.setDate(next.getDate() + direction * 7);
    return next;
}
