"use client";

import {useEffect, useMemo, useState, type ReactNode} from "react";
import {useLocale} from "next-intl";
import type {Locale} from "@/i18n";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateBookingMutation} from "@/features/bookings/bookings.api";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {
    useCancelFixedEventEnrollmentMutation,
    useEnrollFixedEventMutation,
    useListPublicAvailabilityQuery,
    useListPublicEventsQuery,
    useListPublicUnavailableQuery
} from "@/features/schedule/schedule.api";
import AtaraksiaCalendar, {toCalendarView, type AtaraksiaCalendarEvent} from "@/features/schedule/AtaraksiaCalendar";
import {useListServicesQuery} from "@/features/services/services.api";
import type {PublicFixedEvent, PublicScheduleAvailabilityBlock, PublicScheduleUnavailableBlock} from "@/types/schedule";
import type {PublicService} from "@/types/services";

const views = ["month", "week", "day", "list"] as const;
const periods = [7, 31] as const;
const savedFiltersKey = "ataraksia.publicScheduleFilters";
type CalendarView = typeof views[number];
type BookingModeFilter = "all" | "individual" | "events";
type StatusFilter = "all" | "available" | "unavailable" | "events" | "mine";
type PendingBooking =
    | {type: "individual"; service: PublicService; slot: PublicScheduleAvailabilityBlock}
    | {type: "event"; event: PublicFixedEvent};

type FilterState = {
    officeId: number | "";
    serviceId: number | "";
    specialistId: number | "";
    mode: BookingModeFilter;
    status: StatusFilter;
    period: 7 | 31;
};

export default function PublicSchedulePage() {
    const locale = useLocale() as Locale;
    const copy = labels(locale);
    const toast = useToast();
    const [filters, setFilters] = useState<FilterState>({officeId: "", serviceId: "", specialistId: "", mode: "all", status: "all", period: 31});
    const [selectedView, setSelectedView] = useState<CalendarView>("week");
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [reminderOptIn, setReminderOptIn] = useState(false);
    const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
    const [selectedEventDetails, setSelectedEventDetails] = useState<PublicFixedEvent | null>(null);
    const [slotForServiceChoice, setSlotForServiceChoice] = useState<PublicScheduleAvailabilityBlock | null>(null);
    const [savedFilters, setSavedFilters] = useState<FilterState | null>(null);
    const range = useMemo(() => buildRange(filters.period), [filters.period]);

    const {data: officesData} = useListPublicOfficesQuery({size: 100});
    const {data: servicesData} = useListServicesQuery({lang: locale, size: 100});
    const individualServiceId = filters.serviceId !== "" && selectedService(servicesData?.content ?? [], filters.serviceId)?.bookingMode === "INDIVIDUAL_APPOINTMENT"
        ? filters.serviceId
        : "";
    const {data: slotsData = [], isFetching: slotsFetching, isError: slotsError, refetch: refetchSlots} = useListPublicAvailabilityQuery({
        from: range.from,
        to: range.to,
        officeId: filters.officeId,
        serviceId: individualServiceId,
        specialistId: filters.specialistId
    });
    const {data: eventsData = [], isFetching: eventsFetching, refetch: refetchEvents} = useListPublicEventsQuery({
        from: range.from,
        to: range.to,
        officeId: filters.officeId,
        serviceId: eventServiceId(servicesData?.content ?? [], filters.serviceId),
        specialistId: filters.specialistId,
        lang: locale
    });
    const {data: unavailableData = []} = useListPublicUnavailableQuery({
        from: range.from,
        to: range.to,
        officeId: filters.officeId,
        specialistId: filters.specialistId
    });
    const [createBooking, {isLoading: bookingLoading}] = useCreateBookingMutation();
    const [enrollEvent, {isLoading: enrollmentLoading}] = useEnrollFixedEventMutation();
    const [cancelEventEnrollment, {isLoading: cancelEnrollmentLoading}] = useCancelFixedEventEnrollmentMutation();

    const offices = officesData?.content ?? [];
    const services = servicesData?.content ?? [];
    const individualServices = services.filter((service) => service.bookingMode === "INDIVIDUAL_APPOINTMENT");
    const selected = selectedService(services, filters.serviceId);
    const filteredEvents = filterEvents(eventsData, filters);
    const visibleEventUnavailableIds = new Set(filteredEvents.map((event) => `event-${event.id}`));
    const filteredUnavailable = filters.status === "available" || filters.status === "events" || filters.status === "mine"
        ? []
        : unavailableData.filter((item) => !visibleEventUnavailableIds.has(item.id));
    const filteredSlots = filters.mode === "events" || filters.status === "unavailable" || filters.status === "events" || filters.status === "mine" ? [] : slotsData;
    const nearestSlots = selected?.bookingMode === "INDIVIDUAL_APPOINTMENT" ? filteredSlots.slice(0, 5) : [];
    const specialists = uniqueSpecialists([...slotsData, ...eventsData, ...unavailableData]);
    const isSaving = bookingLoading || enrollmentLoading || cancelEnrollmentLoading;

    useEffect(() => {
        const loaded = loadSavedFilters();
        if (loaded) {
            setFilters(loaded);
            setSavedFilters(loaded);
        }
        const fromUrl = filtersFromUrl();
        if (fromUrl) setFilters(fromUrl);
    }, []);

    useEffect(() => {
        writeFiltersToUrl(filters);
    }, [filters]);

    function updateFilter<K extends keyof FilterState>(field: K, value: FilterState[K]) {
        setFilters((current) => ({...current, [field]: value}));
    }

    function chooseIndividualService(service: PublicService) {
        setFilters((current) => ({...current, serviceId: service.id, mode: "individual", status: "available"}));
        setCurrentDate(new Date());
    }

    function chooseEvent(event: PublicFixedEvent) {
        setSelectedEventDetails(event);
    }

    function chooseSlot(slot: PublicScheduleAvailabilityBlock) {
        if (selected?.bookingMode === "INDIVIDUAL_APPOINTMENT") {
            setPendingBooking({type: "individual", service: selected, slot});
            return;
        }
        setSlotForServiceChoice(slot);
    }

    function resetFilters() {
        setFilters({officeId: "", serviceId: "", specialistId: "", mode: "all", status: "all", period: 31});
    }

    function saveFilters() {
        localStorage.setItem(savedFiltersKey, JSON.stringify(filters));
        setSavedFilters(filters);
    }

    function deleteSavedFilters() {
        localStorage.removeItem(savedFiltersKey);
        setSavedFilters(null);
    }

    async function confirmBooking() {
        if (!pendingBooking) return;
        try {
            if (pendingBooking.type === "individual") {
                const booking = await createBooking({
                    availabilityBlockId: pendingBooking.slot.id,
                    serviceId: pendingBooking.service.id,
                    startsAt: pendingBooking.slot.startsAt,
                    reminderOptIn
                }).unwrap();
                toast.success(booking.externalPaymentUrl ? copy.bookingCreatedWithPayment : copy.bookingCreated);
                void refetchSlots();
            } else {
                await enrollEvent({id: pendingBooking.event.id, lang: locale, reminderOptIn}).unwrap();
                toast.success(copy.eventEnrolled);
                void refetchEvents();
            }
            setPendingBooking(null);
            setSelectedEventDetails(null);
            setReminderOptIn(false);
        } catch {
            toast.error(copy.bookingError);
            void refetchSlots();
            void refetchEvents();
        }
    }

    async function cancelSelectedEventEnrollment(event: PublicFixedEvent) {
        try {
            await cancelEventEnrollment({id: event.id, lang: locale}).unwrap();
            toast.success(copy.eventCancelled);
            setSelectedEventDetails(null);
            void refetchEvents();
        } catch {
            toast.error(copy.cancelEventError);
            void refetchEvents();
        }
    }

    return (
        <main className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <header className="border-b border-stone-200 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{copy.eyebrow}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">{copy.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">{copy.subtitle}</p>
            </header>

            <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                    <SelectField label={copy.mode}>
                        <select className={compactInputClass} value={filters.mode} onChange={(event) => updateFilter("mode", event.target.value as BookingModeFilter)}>
                            <option value="all">{copy.all}</option>
                            <option value="individual">{copy.individual}</option>
                            <option value="events">{copy.events}</option>
                        </select>
                    </SelectField>
                    <SelectField label={copy.service}>
                        <select className={compactInputClass} value={filters.serviceId} onChange={(event) => updateFilter("serviceId", toId(event.target.value))}>
                            <option value="">{copy.allServices}</option>
                            {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
                        </select>
                    </SelectField>
                    <SelectField label={copy.office}>
                        <select className={compactInputClass} value={filters.officeId} onChange={(event) => updateFilter("officeId", toId(event.target.value))}>
                            <option value="">{copy.allOffices}</option>
                            {offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
                        </select>
                    </SelectField>
                    <SelectField label={copy.specialist}>
                        <select className={compactInputClass} value={filters.specialistId} onChange={(event) => updateFilter("specialistId", toId(event.target.value))}>
                            <option value="">{copy.allSpecialists}</option>
                            {specialists.map((specialist) => <option key={specialist.id} value={specialist.id}>{specialist.name}</option>)}
                        </select>
                    </SelectField>
                    <SelectField label={copy.status}>
                        <select className={compactInputClass} value={filters.status} onChange={(event) => updateFilter("status", event.target.value as StatusFilter)}>
                            <option value="all">{copy.all}</option>
                            <option value="available">{copy.available}</option>
                            <option value="unavailable">{copy.unavailable}</option>
                            <option value="events">{copy.eventsWithPlaces}</option>
                            <option value="mine">{copy.myBookings}</option>
                        </select>
                    </SelectField>
                    <SelectField label={copy.period}>
                        <select className={compactInputClass} value={filters.period} onChange={(event) => updateFilter("period", Number(event.target.value) as 7 | 31)}>
                            {periods.map((days) => <option key={days} value={days}>{days === 7 ? copy.days7 : copy.days31}</option>)}
                        </select>
                    </SelectField>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    {activeFilterChips(filters, services, offices, specialists, copy).map((chip) => <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600" key={chip}>{chip}</span>)}
                    {savedFilters ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">{copy.savedActive}</span> : null}
                    <span className="grow" />
                    <button className={compactButtonClass} onClick={saveFilters} type="button">{savedFilters ? copy.updateSaved : copy.saveFilters}</button>
                    <button className={compactButtonClass} onClick={resetFilters} type="button">{copy.resetFilters}</button>
                    {savedFilters ? <button className={compactButtonClass} onClick={() => setFilters(savedFilters)} type="button">{copy.applySaved}</button> : null}
                    {savedFilters ? <button className={compactDangerButtonClass} onClick={deleteSavedFilters} type="button">{copy.deleteSaved}</button> : null}
                </div>
            </section>

            <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-stone-950">{copy.calendarTitle}</h2>
                            <p className="mt-1 text-sm text-stone-500">{formatCalendarLabel(selectedView, range, locale)}</p>
                        </div>
                        <div className="grid w-full grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1 sm:w-auto">
                            {views.map((view) => (
                                <button aria-pressed={selectedView === view} className={selectedView === view ? activeViewClass : viewClass} key={view} onClick={() => setSelectedView(view)} type="button">
                                    {copy.views[view]}
                                </button>
                            ))}
                        </div>
                    </div>
                    {slotsError ? <p className="m-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copy.loadError}</p> : null}
                    <PublicScheduleCalendar
                        copy={copy}
                        currentDate={currentDate}
                        events={filteredEvents}
                        locale={locale}
                        onChooseEvent={chooseEvent}
                        onChooseSlot={chooseSlot}
                        onChooseUnavailable={() => toast.error(copy.unavailableClick)}
                        onNavigate={setCurrentDate}
                        slots={filteredSlots}
                        unavailable={filteredUnavailable}
                        view={selectedView}
                    />
                </div>

                <aside className="space-y-4">
                    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                        <h2 className="text-base font-semibold text-stone-950">{copy.individualServiceTitle}</h2>
                        <p className="mt-1 text-sm leading-5 text-stone-500">{selected?.bookingMode === "INDIVIDUAL_APPOINTMENT" ? copy.selectedServiceHint : copy.individualServiceHint}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {individualServices.map((service) => (
                                <ServiceChoiceCard copy={copy} key={service.id} locale={locale} onChoose={() => chooseIndividualService(service)} selected={filters.serviceId === service.id} service={service} />
                            ))}
                        </div>
                        {selected?.bookingMode === "INDIVIDUAL_APPOINTMENT" ? (
                            <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-800">
                                {selected.title} · {copy.minutes(selected.durationMinutes)} · {formatAmount(selected.basePrice, locale)}
                            </p>
                        ) : null}
                    </section>

                    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-semibold text-stone-950">{copy.nearestSlots}</h2>
                            <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-500">{slotsFetching || eventsFetching ? copy.loading : copy.slotCount(nearestSlots.length)}</span>
                        </div>
                        {selected?.bookingMode !== "INDIVIDUAL_APPOINTMENT" ? <p className="mt-3 text-sm leading-6 text-stone-500">{copy.selectServicePrompt}</p> : null}
                        {selected?.bookingMode === "INDIVIDUAL_APPOINTMENT" && nearestSlots.length > 0 ? (
                            <div className="mt-3 space-y-2">
                                {nearestSlots.map((slot) => (
                                    <CompactSlotRow copy={copy} key={slotKey(slot)} locale={locale} onChoose={() => setPendingBooking({type: "individual", service: selected, slot})} service={selected} slot={slot} />
                                ))}
                            </div>
                        ) : null}
                        {selected?.bookingMode === "INDIVIDUAL_APPOINTMENT" && nearestSlots.length === 0 && !slotsFetching ? (
                            <div className="mt-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
                                <p>{copy.noSlotsTitle}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button className={compactButtonClass} onClick={() => updateFilter("period", 31)} type="button">{copy.otherDates}</button>
                                    <button className={compactButtonClass} onClick={resetFilters} type="button">{copy.resetFilters}</button>
                                </div>
                            </div>
                        ) : null}
                    </section>

                    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                        <h2 className="text-base font-semibold text-stone-950">{copy.upcomingEvents}</h2>
                        <div className="mt-3 space-y-2">
                            {filteredEvents.slice(0, 4).map((event) => (
                                <CompactEventRow copy={copy} event={event} key={event.id} locale={locale} onChoose={() => chooseEvent(event)} />
                            ))}
                            {filteredEvents.length === 0 ? <p className="text-sm text-stone-500">{copy.noEvents}</p> : null}
                        </div>
                    </section>
                </aside>
            </section>

            {pendingBooking ? (
                <ConfirmationModal
                    copy={copy}
                    isSaving={isSaving}
                    locale={locale}
                    onClose={() => setPendingBooking(null)}
                    onConfirm={confirmBooking}
                    pending={pendingBooking}
                    reminderOptIn={reminderOptIn}
                    setReminderOptIn={setReminderOptIn}
                />
            ) : null}
            {selectedEventDetails && !pendingBooking ? (
                <EventDetailsModal
                    copy={copy}
                    event={selectedEventDetails}
                    isSaving={isSaving}
                    locale={locale}
                    onCancelEnrollment={cancelSelectedEventEnrollment}
                    onClose={() => setSelectedEventDetails(null)}
                    onEnroll={(event) => setPendingBooking({type: "event", event})}
                />
            ) : null}
            {slotForServiceChoice ? (
                <ServiceChoiceModal
                    copy={copy}
                    locale={locale}
                    onClose={() => setSlotForServiceChoice(null)}
                    onSelect={(service) => {
                        const appointmentSlot = serviceDurationSlot(slotForServiceChoice, service);
                        if (!appointmentSlot) {
                            toast.error(copy.slotTooShort);
                            setSlotForServiceChoice(null);
                            return;
                        }
                        setFilters((current) => ({...current, serviceId: service.id, mode: "individual", status: "available"}));
                        setPendingBooking({type: "individual", service, slot: appointmentSlot});
                        setSlotForServiceChoice(null);
                    }}
                    services={individualServices}
                    slot={slotForServiceChoice}
                />
            ) : null}
        </main>
    );
}

const compactInputClass = "w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-stone-800";
const viewClass = "rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-white";
const activeViewClass = "rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white shadow-sm";
const secondaryButtonClass = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100";
const compactButtonClass = "rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100";
const compactDangerButtonClass = "rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100";

function ServiceChoiceCard({copy, locale, onChoose, selected, service}: {copy: Copy; locale: string; onChoose: () => void; selected: boolean; service: PublicService}) {
    return (
        <button className={selected ? "w-full rounded-xl border border-stone-900 bg-stone-900 p-3 text-left text-white" : "w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white"} onClick={onChoose} type="button">
            <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{service.title}</span>
                    <span className={selected ? "mt-1 block text-xs text-stone-200" : "mt-1 block text-xs text-stone-500"}>{copy.minutes(service.durationMinutes)} · {formatAmount(service.basePrice, locale)}</span>
                </span>
                <span className={selected ? "rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-900" : "rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-700"}>{selected ? copy.selected : copy.select}</span>
            </span>
        </button>
    );
}

function CompactSlotRow({copy, locale, onChoose, service, slot}: {copy: Copy; locale: string; onChoose: () => void; service: PublicService; slot: PublicScheduleAvailabilityBlock}) {
    return (
        <button className="block w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white" onClick={onChoose} type="button">
            <span className="flex items-start justify-between gap-3">
                <span>
                    <span className="block text-sm font-semibold text-stone-950">{formatDate(slot.startsAt, locale)} · {formatTime(slot.startsAt, locale)}</span>
                    <span className="mt-1 block text-xs text-stone-500">{slot.specialistName} · {slot.officeName ?? copy.withoutOffice}</span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{copy.select}</span>
            </span>
            <span className="mt-2 block text-xs text-stone-600">{service.title} · {copy.minutes(service.durationMinutes)} · {formatAmount(service.basePrice, locale)}</span>
        </button>
    );
}

function CompactEventRow({copy, event, locale, onChoose}: {copy: Copy; event: PublicFixedEvent; locale: string; onChoose: () => void}) {
    return (
        <button className="block w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white" onClick={onChoose} type="button">
            <span className="block text-sm font-semibold text-stone-950">{event.title}</span>
            <span className="mt-1 block text-xs text-stone-500">{formatDateTimeRange(event.startsAt, event.endsAt, locale)}</span>
            <span className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className={event.full ? "rounded-full bg-red-50 px-2 py-1 text-red-700" : "rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"}>{event.enrolled ? copy.enrolled : event.full ? copy.full : copy.remaining(event.remainingPlaces)}</span>
                <span className="rounded-full bg-white px-2 py-1 text-stone-700">{formatAmount(event.price, locale)}</span>
            </span>
        </button>
    );
}

function EventDetailsModal({copy, event, isSaving, locale, onCancelEnrollment, onClose, onEnroll}: {copy: Copy; event: PublicFixedEvent; isSaving: boolean; locale: string; onCancelEnrollment: (event: PublicFixedEvent) => void; onClose: () => void; onEnroll: (event: PublicFixedEvent) => void}) {
    const canCancel = event.enrolled && new Date(event.startsAt).getTime() > Date.now();
    const canEnroll = !event.enrolled && !event.full && new Date(event.startsAt).getTime() > Date.now();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{copy.fixedEvent}</p>
                        <h2 className="mt-1 text-xl font-semibold text-stone-950">{event.title}</h2>
                    </div>
                    <span className={event.enrolled ? "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800" : event.full ? "rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700" : "rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700"}>
                        {event.enrolled ? copy.enrolled : event.full ? copy.full : copy.remaining(event.remainingPlaces)}
                    </span>
                </div>
                {event.description ? <p className="mt-3 text-sm leading-6 text-stone-600">{event.description}</p> : null}
                <dl className="mt-5 space-y-3 text-sm">
                    <InfoRow label={copy.specialist} value={event.specialistName} />
                    <InfoRow label={copy.office} value={event.officeName ?? copy.withoutOffice} />
                    <InfoRow label={copy.time} value={formatDateTimeRange(event.startsAt, event.endsAt, locale)} />
                    <InfoRow label={copy.places} value={event.full ? copy.full : copy.remaining(event.remainingPlaces)} />
                    <InfoRow label={copy.price} value={formatAmount(event.price, locale)} />
                </dl>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button className={secondaryButtonClass} disabled={isSaving} onClick={onClose} type="button">{copy.close}</button>
                    {canCancel ? <button className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-red-300" disabled={isSaving} onClick={() => onCancelEnrollment(event)} type="button">{copy.cancelEnrollment}</button> : null}
                    {canEnroll ? <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={isSaving} onClick={() => onEnroll(event)} type="button">{copy.bookEvent}</button> : null}
                </div>
            </div>
        </div>
    );
}

function PublicScheduleCalendar({copy, currentDate, events, locale, onChooseEvent, onChooseSlot, onChooseUnavailable, onNavigate, slots, unavailable, view}: {copy: Copy; currentDate: Date; events: PublicFixedEvent[]; locale: string; onChooseEvent: (event: PublicFixedEvent) => void; onChooseSlot: (slot: PublicScheduleAvailabilityBlock) => void; onChooseUnavailable: () => void; onNavigate: (date: Date) => void; slots: PublicScheduleAvailabilityBlock[]; unavailable: PublicScheduleUnavailableBlock[]; view: CalendarView}) {
    const slotByEventId = new Map(slots.map((slot) => [slotKey(slot), slot]));
    const fixedEventByEventId = new Map(events.map((event) => [`event-${event.id}`, event]));
    const unavailableIds = new Set(unavailable.map((item) => item.id));
    const calendarEvents: AtaraksiaCalendarEvent[] = [
        ...slots.map((slot) => ({id: slotKey(slot), title: `${copy.available} · ${slot.specialistName}`, start: new Date(slot.startsAt), end: new Date(slot.endsAt), tone: "available" as const})),
        ...unavailable.map((item) => ({id: item.id, title: item.status === "OCCUPIED" ? copy.occupied : copy.unavailable, start: new Date(item.startsAt), end: new Date(item.endsAt), tone: "blocked" as const})),
        ...events.map((event) => ({id: `event-${event.id}`, title: event.enrolled ? `${event.title} · ${copy.enrolled}` : event.full ? `${event.title} · ${copy.full}` : `${event.title} · ${copy.remaining(event.remainingPlaces)}`, start: new Date(event.startsAt), end: new Date(event.endsAt), tone: "booking" as const}))
    ];

    if (calendarEvents.length === 0) {
        return <div className="flex min-h-72 items-center justify-center border-t border-stone-100 p-6"><p className="max-w-md rounded-xl border border-stone-200 bg-white px-5 py-4 text-center text-sm leading-6 text-stone-500 shadow-sm">{copy.calendarEmpty}</p></div>;
    }

    return (
        <div className="p-4 sm:p-6">
            <AtaraksiaCalendar
                culture={locale === "ua" ? "uk" : locale}
                date={currentDate}
                events={calendarEvents}
                onNavigate={onNavigate}
                onSelectEvent={(event) => {
                    const slot = slotByEventId.get(event.id);
                    if (slot) return onChooseSlot(slot);
                    const fixedEvent = fixedEventByEventId.get(event.id);
                    if (fixedEvent) return onChooseEvent(fixedEvent);
                    if (unavailableIds.has(event.id)) return onChooseUnavailable();
                    return undefined;
                }}
                view={toCalendarView(view)}
            />
        </div>
    );
}

function ConfirmationModal({copy, isSaving, locale, onClose, onConfirm, pending, reminderOptIn, setReminderOptIn}: {copy: Copy; isSaving: boolean; locale: string; onClose: () => void; onConfirm: () => void; pending: PendingBooking; reminderOptIn: boolean; setReminderOptIn: (value: boolean) => void}) {
    const title = pending.type === "individual" ? pending.service.title : pending.event.title;
    const specialist = pending.type === "individual" ? pending.slot.specialistName : pending.event.specialistName;
    const office = pending.type === "individual" ? pending.slot.officeName : pending.event.officeName;
    const startsAt = pending.type === "individual" ? pending.slot.startsAt : pending.event.startsAt;
    const endsAt = pending.type === "individual" ? pending.slot.endsAt : pending.event.endsAt;
    const price = pending.type === "individual" ? pending.service.basePrice : pending.event.price;
    const capacity = pending.type === "event" ? copy.remaining(pending.event.remainingPlaces) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
                <h2 className="text-xl font-semibold text-stone-950">{pending.type === "individual" ? copy.confirmAppointment : copy.confirmEvent}</h2>
                <dl className="mt-5 space-y-3 text-sm">
                    <InfoRow label={copy.service} value={title} />
                    <InfoRow label={copy.specialist} value={specialist} />
                    <InfoRow label={copy.office} value={office ?? copy.withoutOffice} />
                    <InfoRow label={copy.time} value={formatDateTimeRange(startsAt, endsAt, locale)} />
                    <InfoRow label={copy.price} value={formatAmount(price, locale)} />
                    {capacity ? <InfoRow label={copy.places} value={capacity} /> : null}
                </dl>
                <label className="mt-5 flex gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    <input checked={reminderOptIn} className="mt-0.5 h-4 w-4 accent-stone-900" onChange={(event) => setReminderOptIn(event.target.checked)} type="checkbox" />
                    <span><strong className="block font-medium text-stone-900">{copy.reminder}</strong><span className="mt-0.5 block text-xs leading-5 text-stone-500">{copy.reminderHint}</span></span>
                </label>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button className={secondaryButtonClass} disabled={isSaving} onClick={onClose} type="button">{copy.cancel}</button>
                    <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={isSaving} onClick={onConfirm} type="button">{isSaving ? copy.saving : pending.type === "individual" ? copy.confirmAppointment : copy.confirmParticipation}</button>
                </div>
            </div>
        </div>
    );
}

function ServiceChoiceModal({copy, locale, onClose, onSelect, services, slot}: {copy: Copy; locale: string; onClose: () => void; onSelect: (service: PublicService) => void; services: PublicService[]; slot: PublicScheduleAvailabilityBlock}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
                <h2 className="text-xl font-semibold text-stone-950">{copy.chooseServiceForTime}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">{formatDateTimeRange(slot.startsAt, slot.endsAt, locale)} · {slot.specialistName} · {slot.officeName ?? copy.withoutOffice}</p>
                <div className="mt-5 space-y-2">
                    {services.map((service) => (
                        <button className="block w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white" key={service.id} onClick={() => onSelect(service)} type="button">
                            <span className="block text-sm font-semibold text-stone-950">{service.title}</span>
                            <span className="mt-1 block text-xs text-stone-500">{copy.minutes(service.durationMinutes)} · {formatAmount(service.basePrice, locale)}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-6 flex justify-end">
                    <button className={secondaryButtonClass} onClick={onClose} type="button">{copy.cancel}</button>
                </div>
            </div>
        </div>
    );
}

function SelectField({children, label}: {children: ReactNode; label: string}) {
    return <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</span>{children}</label>;
}

function InfoRow({label, value}: {label: string; value: string}) {
    return <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3"><dt className="text-stone-500">{label}</dt><dd className="font-medium text-stone-900">{value}</dd></div>;
}

function buildRange(days: number) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + days);
    return {from: from.toISOString(), to: to.toISOString()};
}

function selectedService(services: PublicService[], id: number | "") {
    return id === "" ? undefined : services.find((service) => service.id === id);
}

function eventServiceId(services: PublicService[], id: number | "") {
    const service = selectedService(services, id);
    return service?.bookingMode === "FIXED_EVENT" ? id : "";
}

function filterEvents(events: PublicFixedEvent[], filters: FilterState) {
    if (filters.mode === "individual" || filters.status === "available" || filters.status === "unavailable") return [];
    if (filters.status === "mine") return events.filter((event) => event.enrolled);
    if (filters.status === "events") return events.filter((event) => !event.full);
    return events;
}

function uniqueSpecialists(items: Array<{specialistId: number; specialistName: string}>) {
    const specialists = new Map<number, string>();
    for (const item of items) specialists.set(item.specialistId, item.specialistName);
    return Array.from(specialists, ([id, name]) => ({id, name}));
}

function activeFilterChips(filters: FilterState, services: PublicService[], offices: Array<{id: number; name: string}>, specialists: Array<{id: number; name: string}>, copy: Copy) {
    const chips = [filters.mode !== "all" ? (filters.mode === "individual" ? copy.individual : copy.events) : null, filters.status !== "all" ? filters.status : null];
    const service = selectedService(services, filters.serviceId);
    const office = filters.officeId === "" ? undefined : offices.find((item) => item.id === filters.officeId);
    const specialist = filters.specialistId === "" ? undefined : specialists.find((item) => item.id === filters.specialistId);
    return [...chips, service?.title, office?.name, specialist?.name].filter(Boolean) as string[];
}

function slotKey(slot: PublicScheduleAvailabilityBlock) {
    return `slot-${slot.id}-${slot.startsAt}`;
}

function serviceDurationSlot(slot: PublicScheduleAvailabilityBlock, service: PublicService): PublicScheduleAvailabilityBlock | null {
    const startsAt = new Date(slot.startsAt);
    const endsAt = new Date(startsAt);
    endsAt.setMinutes(endsAt.getMinutes() + service.durationMinutes);
    if (endsAt.getTime() > new Date(slot.endsAt).getTime()) return null;
    return {...slot, endsAt: endsAt.toISOString()};
}

function toId(value: string): number | "" {
    return value ? Number(value) : "";
}

function loadSavedFilters(): FilterState | null {
    try {
        const raw = localStorage.getItem(savedFiltersKey);
        return raw ? JSON.parse(raw) as FilterState : null;
    } catch {
        return null;
    }
}

function filtersFromUrl(): FilterState | null {
    const params = new URLSearchParams(window.location.search);
    if (!params.size) return null;
    return {
        officeId: toId(params.get("officeId") ?? ""),
        serviceId: toId(params.get("serviceId") ?? ""),
        specialistId: toId(params.get("specialistId") ?? ""),
        mode: (params.get("mode") as BookingModeFilter) || "all",
        status: (params.get("status") as StatusFilter) || "all",
        period: params.get("period") === "7" ? 7 : 31
    };
}

function writeFiltersToUrl(filters: FilterState) {
    const params = new URLSearchParams();
    if (filters.officeId !== "") params.set("officeId", String(filters.officeId));
    if (filters.serviceId !== "") params.set("serviceId", String(filters.serviceId));
    if (filters.specialistId !== "") params.set("specialistId", String(filters.specialistId));
    if (filters.mode !== "all") params.set("mode", filters.mode);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.period !== 31) params.set("period", String(filters.period));
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

function formatAmount(value: number, locale: string) {
    return new Intl.NumberFormat(locale === "ua" ? "uk-UA" : "en-US", {currency: "UAH", maximumFractionDigits: 0, style: "currency"}).format(value);
}

function formatDate(value: string, locale: string) {
    return new Intl.DateTimeFormat(toLanguageTag(locale), {day: "numeric", month: "long"}).format(new Date(value));
}

function formatTime(value: string, locale: string) {
    return new Intl.DateTimeFormat(toLanguageTag(locale), {hour: "2-digit", minute: "2-digit"}).format(new Date(value));
}

function formatDateTimeRange(start: string, end: string, locale: string) {
    return `${new Intl.DateTimeFormat(toLanguageTag(locale), {day: "numeric", month: "long", weekday: "short"}).format(new Date(start))}, ${formatTime(start, locale)}–${formatTime(end, locale)}`;
}

function formatCalendarLabel(view: CalendarView, range: {from: string; to: string}, locale: string) {
    const languageTag = toLanguageTag(locale);
    const from = new Date(range.from);
    const to = new Date(range.to);
    if (view === "month") return new Intl.DateTimeFormat(languageTag, {month: "long", year: "numeric"}).format(from);
    if (view === "day") return new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "long", weekday: "long"}).format(from);
    return `${new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "short"}).format(from)} – ${new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "short"}).format(to)}`;
}

function toLanguageTag(locale: string) {
    return locale === "ua" ? "uk" : locale;
}

type Copy = ReturnType<typeof labels>;

function labels(locale: Locale) {
    const ua = locale === "ua";
    return {
        eyebrow: ua ? "Запис до Ataraksia" : "Book with Ataraksia",
        title: ua ? "Запис / Графік" : "Booking / Schedule",
        subtitle: ua ? "Оберіть послугу або подію, перегляньте доступний час і підтвердіть запис." : "Choose a service or event, review available time, and confirm your booking.",
        chooseTitle: ua ? "Оберіть послугу або подію" : "Choose a service or event",
        chooseDescription: ua ? "Почніть із реального варіанту запису. Фільтри нижче лише допомагають уточнити графік." : "Start from a real bookable option. Filters below only refine the schedule.",
        loading: ua ? "Оновлення..." : "Updating...",
        individual: ua ? "Індивідуальний запис" : "Individual appointment",
        fixedEvent: ua ? "Подія / груповий сеанс" : "Fixed event / group session",
        chooseTime: ua ? "Обрати час" : "Choose time",
        bookEvent: ua ? "Записатися" : "Enroll",
        noDescription: ua ? "Опис буде додано пізніше." : "Description will be added later.",
        withoutOffice: ua ? "Без прив’язки до офісу" : "No office assigned",
        remaining: (count: number) => ua ? `Залишилось ${count} місць` : `${count} places left`,
        enrolled: ua ? "Ви записані" : "You are enrolled",
        full: ua ? "Місць немає" : "Full",
        filtersTitle: ua ? "Фільтри календаря" : "Calendar filters",
        filtersHint: ua ? "За замовчуванням показуємо все публічне. Фільтри не замінюють перевірку backend під час запису." : "By default, all public schedule data is shown. Filters never replace backend validation.",
        resetFilters: ua ? "Скинути фільтри" : "Reset filters",
        saveFilters: ua ? "Зберегти фільтри" : "Save filters",
        updateSaved: ua ? "Оновити збережені" : "Update saved",
        applySaved: ua ? "Показати збережені" : "Apply saved",
        deleteSaved: ua ? "Видалити збережені" : "Delete saved",
        savedActive: ua ? "Збережені фільтри активні або доступні для застосування" : "Saved filters are active or ready to apply",
        mode: ua ? "Режим" : "Mode",
        service: ua ? "Послуга" : "Service",
        office: ua ? "Офіс" : "Office",
        specialist: ua ? "Спеціаліст" : "Specialist",
        status: ua ? "Статус" : "Status",
        period: ua ? "Період" : "Period",
        all: ua ? "Усе" : "All",
        events: ua ? "Події" : "Events",
        allServices: ua ? "Усі послуги й події" : "All services and events",
        allOffices: ua ? "Усі офіси" : "All offices",
        allSpecialists: ua ? "Усі спеціалісти" : "All specialists",
        available: ua ? "Доступно" : "Available",
        unavailable: ua ? "Недоступно" : "Unavailable",
        occupied: ua ? "Зайнято" : "Occupied",
        eventsWithPlaces: ua ? "Події з місцями" : "Events with places",
        myBookings: ua ? "Мої записи" : "My bookings",
        days7: ua ? "Найближчі 7 днів" : "Next 7 days",
        days31: ua ? "Найближчі 31 день" : "Next 31 days",
        nearestSlots: ua ? "Найближчий доступний час" : "Nearest available times",
        selectedSummary: ua ? "Обраний варіант" : "Selected option",
        selectServicePrompt: ua ? "Оберіть послугу або подію вище, щоб побачити доступний час." : "Choose a service or event above to see available times.",
        slotCount: (count: number) => ua ? `${count} слотів` : `${count} slots`,
        minutes: (count: number) => ua ? `${count} хв` : `${count} min`,
        select: ua ? "Обрати" : "Select",
        selected: ua ? "Обрано" : "Selected",
        noSlotsTitle: ua ? "Для цієї послуги немає доступного часу за обраними фільтрами." : "No available time for this service with the current filters.",
        noSlotsBody: ua ? "Спробуйте інші дати, усіх спеціалістів або скиньте фільтри." : "Try other dates, all specialists, or reset filters.",
        otherDates: ua ? "Показати інші дати" : "Show other dates",
        calendarTitle: ua ? "Календар" : "Calendar",
        calendarDescription: ua ? "Календар підтримує вибір часу, але запис створюється тільки після підтвердження." : "The calendar supports time selection, but booking is created only after confirmation.",
        calendarEmpty: ua ? "Оберіть послугу або змініть фільтри, щоб побачити графік." : "Choose a service or adjust filters to see the schedule.",
        loadError: ua ? "Не вдалося завантажити графік." : "Unable to load the schedule.",
        chooseServiceFirst: ua ? "Оберіть послугу для цього часу." : "Choose a service for this time.",
        chooseServiceForTime: ua ? "Оберіть послугу для цього часу" : "Choose a service for this time",
        slotTooShort: ua ? "Цей проміжок замалий для обраної послуги. Оберіть інший час." : "This time range is too short for the selected service. Choose another time.",
        unavailableClick: ua ? "Цей час недоступний. Оберіть інший слот." : "This time is unavailable. Choose another slot.",
        individualServiceTitle: ua ? "Індивідуальна послуга" : "Individual service",
        individualServiceHint: ua ? "Оберіть індивідуальну послугу, щоб підсвітити доступні слоти." : "Choose an individual service to highlight available slots.",
        selectedServiceHint: ua ? "Показано доступний час у календарі." : "Available time is shown in the calendar.",
        upcomingEvents: ua ? "Найближчі події" : "Upcoming events",
        noEvents: ua ? "Подій за цими фільтрами немає." : "No events match these filters.",
        views: {month: ua ? "Місяць" : "Month", week: ua ? "Тиждень" : "Week", day: ua ? "День" : "Day", list: ua ? "Список" : "List"},
        confirmAppointment: ua ? "Підтвердити запис" : "Confirm booking",
        confirmEvent: ua ? "Підтвердити участь" : "Confirm participation",
        confirmParticipation: ua ? "Підтвердити участь" : "Confirm participation",
        time: ua ? "Час" : "Time",
        price: ua ? "Ціна" : "Price",
        places: ua ? "Місця" : "Places",
        reminder: ua ? "Нагадати про запис" : "Send reminder",
        reminderHint: ua ? "Нагадування буде надіслано лише для цього запису." : "A reminder will only be sent for this booking.",
        cancel: ua ? "Скасувати" : "Cancel",
        close: ua ? "Закрити" : "Close",
        cancelEnrollment: ua ? "Скасувати участь" : "Cancel enrollment",
        saving: ua ? "Збереження..." : "Saving...",
        bookingCreated: ua ? "Бронювання створено. Очікує підтвердження оплати." : "Booking created. Payment confirmation is pending.",
        bookingCreatedWithPayment: ua ? "Бронювання створено. Перейдіть до оплати за посиланням послуги." : "Booking created. Use the service payment link to continue.",
        eventEnrolled: ua ? "Ви записані на подію." : "You are enrolled in the event.",
        eventCancelled: ua ? "Участь у події скасовано." : "Event enrollment cancelled.",
        cancelEventError: ua ? "Не вдалося скасувати участь у події." : "Unable to cancel event enrollment.",
        bookingError: ua ? "Не вдалося створити запис. Увійдіть в акаунт або оберіть інший час." : "Unable to book. Sign in or choose another time."
    };
}
