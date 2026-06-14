"use client";

import {useEffect, useMemo, useState, type ReactNode} from "react";
import {useLocale, useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateBookingMutation, useListMyBookingsQuery} from "@/features/bookings/bookings.api";
import {bookingServiceTitle} from "@/features/bookings/bookingTitles";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {
    useCancelFixedEventEnrollmentMutation,
    useEnrollFixedEventMutation,
    useListPublicAvailabilityQuery,
    useListPublicEventsQuery,
    useListPublicUnavailableQuery
} from "@/features/schedule/schedule.api";
import AtaraksiaCalendar, {toCalendarView, type AtaraksiaCalendarEvent, type AtaraksiaCalendarMessages} from "@/features/schedule/AtaraksiaCalendar";
import {useListServicesQuery} from "@/features/services/services.api";
import type {Booking} from "@/types/bookings";
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
type PaymentPrompt = Pick<Booking, "externalPaymentUrl" | "id" | "serviceTitleUa" | "serviceTitleEn" | "startsAt">;

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
    const t = useTranslations("calendar.page");
    const copy = labels(t);
    const toast = useToast();
    const [filters, setFilters] = useState<FilterState>({officeId: "", serviceId: "", specialistId: "", mode: "all", status: "all", period: 7});
    const [selectedView, setSelectedView] = useState<CalendarView>("week");
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [reminderOptIn, setReminderOptIn] = useState(false);
    const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
    const [selectedEventDetails, setSelectedEventDetails] = useState<PublicFixedEvent | null>(null);
    const [slotForServiceChoice, setSlotForServiceChoice] = useState<PublicScheduleAvailabilityBlock | null>(null);
    const [savedFilters, setSavedFilters] = useState<FilterState | null>(null);
    const [paymentPrompt, setPaymentPrompt] = useState<PaymentPrompt | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(true);
    const range = useMemo(() => buildRange(currentDate, selectedView, filters.period), [currentDate, selectedView, filters.period]);

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
    const {data: myBookingsData, isFetching: myBookingsFetching} = useListMyBookingsQuery(
        {page: 0, size: 100},
        {skip: filters.status !== "mine"}
    );
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
    const myBookings = filters.status === "mine" ? filterMyBookings(myBookingsData?.content ?? [], range) : [];
    const nearestSlots = filteredSlots.slice(0, 6);
    const nearestEvents = filteredEvents.filter((event) => !event.full && new Date(event.startsAt).getTime() > Date.now()).slice(0, 6);
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
        setPaymentPrompt(null);
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
        setFilters({officeId: "", serviceId: "", specialistId: "", mode: "all", status: "all", period: 7});
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
                setPaymentPrompt(booking.externalPaymentUrl ? booking : null);
                void refetchSlots();
            } else {
                await enrollEvent({id: pendingBooking.event.id, lang: locale, reminderOptIn}).unwrap();
                toast.success(copy.eventEnrolled);
                setPaymentPrompt(null);
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
        <main className="mx-auto w-full max-w-[1440px] space-y-5 overflow-x-clip px-3 py-6 sm:px-6 lg:px-8 lg:py-10">
            <header className="border-b border-stone-200 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{copy.eyebrow}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">{copy.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">{copy.subtitle}</p>
            </header>

            <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-stone-950">{copy.filtersTitle}</h2>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{copy.filtersHint}</p>
                    </div>
                    <button className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 md:hidden" onClick={() => setFiltersOpen((current) => !current)} type="button">
                        {filtersOpen ? copy.hideFilters : copy.showFilters}
                    </button>
                </div>
                <div className={`${filtersOpen ? "grid" : "hidden"} mt-3 gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-6`}>
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
                <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                    {activeFilterChips(filters, services, offices, specialists, copy).length === 0 ? <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-500">{copy.noActiveFilters}</span> : null}
                    {activeFilterChips(filters, services, offices, specialists, copy).map((chip) => <span className="max-w-full break-words rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600" key={chip}>{chip}</span>)}
                    {savedFilters ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">{copy.savedActive}</span> : null}
                    <span className="hidden grow sm:block" />
                    <button className={compactButtonClass} onClick={saveFilters} type="button">{savedFilters ? copy.updateSaved : copy.saveFilters}</button>
                    <button className={compactButtonClass} onClick={resetFilters} type="button">{copy.resetFilters}</button>
                    {savedFilters ? <button className={compactButtonClass} onClick={() => setFilters(savedFilters)} type="button">{copy.applySaved}</button> : null}
                    {savedFilters ? <button className={compactDangerButtonClass} onClick={deleteSavedFilters} type="button">{copy.deleteSaved}</button> : null}
                </div>
            </section>

            {paymentPrompt?.externalPaymentUrl ? (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-emerald-950">{copy.paymentTitle}</h2>
                            <p className="mt-1 text-sm leading-6 text-emerald-900">{copy.paymentBody(bookingServiceTitle(paymentPrompt, locale), formatDateTime(paymentPrompt.startsAt, locale))}</p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            <a className="rounded-lg bg-emerald-900 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-800" href={paymentPrompt.externalPaymentUrl} rel="noreferrer" target="_blank">{copy.paymentAction}</a>
                            <button className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100" onClick={() => setPaymentPrompt(null)} type="button">{copy.dismissPayment}</button>
                        </div>
                    </div>
                </section>
            ) : null}

            <section className="grid min-w-0 gap-4 lg:grid-cols-2">
                <BookingHighlights
                    copy={copy}
                    locale={locale}
                    onChooseEvent={chooseEvent}
                    onChooseSlot={chooseSlot}
                    selectedService={selected?.bookingMode === "INDIVIDUAL_APPOINTMENT" ? selected : undefined}
                    slots={nearestSlots}
                    events={nearestEvents}
                />
            </section>

            <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex min-w-0 flex-col gap-3 border-b border-stone-200 px-3 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-xl font-semibold text-stone-950">{copy.calendarTitle}</h2>
                            <p className="mt-1 break-words text-sm text-stone-500">{formatCalendarLabel(selectedView, range, locale)}</p>
                        </div>
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="grid w-full min-w-0 grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 sm:w-auto">
                                <button className={viewClass} onClick={() => setCurrentDate((date) => navigateDate(date, selectedView, filters.period, -1))} title={copy.previous} type="button">←</button>
                                <button className={viewClass} onClick={() => setCurrentDate(new Date())} type="button">{copy.today}</button>
                                <button className={viewClass} onClick={() => setCurrentDate((date) => navigateDate(date, selectedView, filters.period, 1))} title={copy.next} type="button">→</button>
                            </div>
                            <div className="grid w-full min-w-0 grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1 sm:w-auto">
                                {views.map((view) => (
                                    <button aria-pressed={selectedView === view} className={selectedView === view ? activeViewClass : viewClass} key={view} onClick={() => setSelectedView(view)} type="button">
                                        {copy.views[view]}
                                    </button>
                                ))}
                            </div>
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
                        myBookings={myBookings}
                        selectedService={selected?.bookingMode === "INDIVIDUAL_APPOINTMENT" ? selected : undefined}
                        slots={filteredSlots}
                        unavailable={filteredUnavailable}
                        view={selectedView}
                    />
                </div>

                <aside className="min-w-0 space-y-4">
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
                            <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-500">{slotsFetching || eventsFetching || myBookingsFetching ? copy.loading : copy.slotCount(nearestSlots.length)}</span>
                        </div>
                        {selected?.bookingMode !== "INDIVIDUAL_APPOINTMENT" ? <p className="mt-3 text-sm leading-6 text-stone-500">{copy.selectServicePrompt}</p> : null}
                        {nearestSlots.length > 0 ? (
                            <div className="mt-3 space-y-2">
                                {nearestSlots.map((slot) => (
                                    selected?.bookingMode === "INDIVIDUAL_APPOINTMENT"
                                        ? <CompactSlotRow copy={copy} key={slotKey(slot)} locale={locale} onChoose={() => setPendingBooking({type: "individual", service: selected, slot})} service={selected} slot={slot} />
                                        : <CompactOpenSlotRow copy={copy} key={slotKey(slot)} locale={locale} onChoose={() => chooseSlot(slot)} slot={slot} />
                                ))}
                            </div>
                        ) : null}
                        {nearestSlots.length === 0 && !slotsFetching ? (
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
const viewClass = "min-w-0 rounded-lg px-2 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-white sm:px-3";
const activeViewClass = "min-w-0 rounded-lg bg-stone-900 px-2 py-2 text-sm font-medium text-white shadow-sm sm:px-3";
const secondaryButtonClass = "max-w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100";
const compactButtonClass = "max-w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100";
const compactDangerButtonClass = "max-w-full rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100";

function BookingHighlights({
    copy,
    events,
    locale,
    onChooseEvent,
    onChooseSlot,
    selectedService,
    slots
}: {
    copy: Copy;
    events: PublicFixedEvent[];
    locale: string;
    onChooseEvent: (event: PublicFixedEvent) => void;
    onChooseSlot: (slot: PublicScheduleAvailabilityBlock) => void;
    selectedService?: PublicService;
    slots: PublicScheduleAvailabilityBlock[];
}) {
    return (
        <>
            <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-stone-950">{copy.nearestSlots}</h2>
                        <p className="mt-1 text-sm leading-5 text-stone-500">{selectedService ? copy.selectedServiceHint : copy.selectServicePrompt}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{copy.slotCount(slots.length)}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {slots.slice(0, 6).map((slot) => (
                        selectedService
                            ? <CompactSlotRow copy={copy} key={slotKey(slot)} locale={locale} onChoose={() => onChooseSlot(slot)} service={selectedService} slot={slot} />
                            : <CompactOpenSlotRow copy={copy} key={slotKey(slot)} locale={locale} onChoose={() => onChooseSlot(slot)} slot={slot} />
                    ))}
                    {slots.length === 0 ? <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-500 sm:col-span-2">{copy.noSlotsTitle}</p> : null}
                </div>
            </section>
            <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-stone-950">{copy.upcomingEvents}</h2>
                        <p className="mt-1 text-sm leading-5 text-stone-500">{copy.eventsWithPlaces}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">{events.length}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {events.slice(0, 6).map((event) => <CompactEventRow copy={copy} event={event} key={event.id} locale={locale} onChoose={() => onChooseEvent(event)} />)}
                    {events.length === 0 ? <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-500 sm:col-span-2">{copy.noEvents}</p> : null}
                </div>
            </section>
        </>
    );
}

function ServiceChoiceCard({copy, locale, onChoose, selected, service}: {copy: Copy; locale: string; onChoose: () => void; selected: boolean; service: PublicService}) {
    return (
        <button className={selected ? "w-full max-w-full rounded-xl border border-stone-900 bg-stone-900 p-3 text-left text-white" : "w-full max-w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white"} onClick={onChoose} type="button">
            <span className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold">{service.title}</span>
                    <span className={selected ? "mt-1 block break-words text-xs text-stone-200" : "mt-1 block break-words text-xs text-stone-500"}>{copy.minutes(service.durationMinutes)} · {formatAmount(service.basePrice, locale)}</span>
                </span>
                <span className={selected ? "shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-900" : "shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-700"}>{selected ? copy.selected : copy.select}</span>
            </span>
        </button>
    );
}

function CompactOpenSlotRow({copy, locale, onChoose, slot}: {copy: Copy; locale: string; onChoose: () => void; slot: PublicScheduleAvailabilityBlock}) {
    return (
        <button className="block w-full max-w-full rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left transition-colors hover:border-emerald-300 hover:bg-white" onClick={onChoose} type="button">
            <span className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold text-stone-950">{formatDate(slot.startsAt, locale)} · {formatTime(slot.startsAt, locale)}</span>
                    <span className="mt-1 block break-words text-xs text-stone-600">{slot.specialistName} · {slot.officeName ?? copy.withoutOffice}</span>
                </span>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-emerald-800">{copy.chooseTime}</span>
            </span>
        </button>
    );
}

function CompactSlotRow({copy, locale, onChoose, service, slot}: {copy: Copy; locale: string; onChoose: () => void; service: PublicService; slot: PublicScheduleAvailabilityBlock}) {
    return (
        <button className="block w-full max-w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white" onClick={onChoose} type="button">
            <span className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold text-stone-950">{formatDate(slot.startsAt, locale)} · {formatTime(slot.startsAt, locale)}</span>
                    <span className="mt-1 block break-words text-xs text-stone-500">{slot.specialistName} · {slot.officeName ?? copy.withoutOffice}</span>
                </span>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{copy.select}</span>
            </span>
            <span className="mt-2 block break-words text-xs text-stone-600">{service.title} · {copy.minutes(service.durationMinutes)} · {formatAmount(service.basePrice, locale)}</span>
        </button>
    );
}

function CompactEventRow({copy, event, locale, onChoose}: {copy: Copy; event: PublicFixedEvent; locale: string; onChoose: () => void}) {
    return (
        <button className="block w-full max-w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white" onClick={onChoose} type="button">
            <span className="block break-words text-sm font-semibold text-stone-950">{event.title}</span>
            <span className="mt-1 block break-words text-xs text-stone-500">{formatDateTimeRange(event.startsAt, event.endsAt, locale)}</span>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{copy.fixedEvent}</p>
                        <h2 className="mt-1 break-words text-xl font-semibold text-stone-950">{event.title}</h2>
                    </div>
                    <span className={event.enrolled ? "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800" : event.full ? "rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700" : "rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700"}>
                        {event.enrolled ? copy.enrolled : event.full ? copy.full : copy.remaining(event.remainingPlaces)}
                    </span>
                </div>
                {event.description ? <p className="mt-3 break-words text-sm leading-6 text-stone-600">{event.description}</p> : null}
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

function PublicScheduleCalendar({
    copy,
    currentDate,
    events,
    locale,
    myBookings,
    onChooseEvent,
    onChooseSlot,
    onChooseUnavailable,
    onNavigate,
    selectedService,
    slots,
    unavailable,
    view
}: {
    copy: Copy;
    currentDate: Date;
    events: PublicFixedEvent[];
    locale: string;
    myBookings: Booking[];
    onChooseEvent: (event: PublicFixedEvent) => void;
    onChooseSlot: (slot: PublicScheduleAvailabilityBlock) => void;
    onChooseUnavailable: () => void;
    onNavigate: (date: Date) => void;
    selectedService?: PublicService;
    slots: PublicScheduleAvailabilityBlock[];
    unavailable: PublicScheduleUnavailableBlock[];
    view: CalendarView;
}) {
    const slotByEventId = new Map(slots.map((slot) => [slotKey(slot), slot]));
    const fixedEventByEventId = new Map(events.map((event) => [`event-${event.id}`, event]));
    const unavailableIds = new Set(unavailable.map((item) => item.id));
    const groupedAvailability = selectedService ? [] : groupSlotsByDay(slots, locale, copy);
    const slotCalendarEvents = selectedService
        ? slots.map((slot) => ({
            id: slotKey(slot),
            badge: formatTimeRange(slot.startsAt, slot.endsAt, locale),
            title: selectedService.title,
            meta: [slot.specialistName, slot.officeName ?? copy.withoutOffice].join(" · "),
            start: new Date(slot.startsAt),
            end: new Date(slot.endsAt),
            tone: "available" as const
        }))
        : groupedAvailability;
    const calendarEvents: AtaraksiaCalendarEvent[] = [
        ...slotCalendarEvents,
        ...compactUnavailable(unavailable, view, locale, copy).map((item) => ({
            id: item.id,
            badge: item.badge,
            meta: item.meta,
            title: item.title,
            start: new Date(item.startsAt),
            end: new Date(item.endsAt),
            tone: item.tone
        })),
        ...myBookings.map((booking) => ({id: `my-booking-${booking.id}`, badge: formatTimeRange(booking.startsAt, booking.endsAt, locale), title: bookingServiceTitle(booking, locale), meta: booking.specialistName, start: new Date(booking.startsAt), end: new Date(booking.endsAt), tone: "booking" as const})),
        ...events.map((event) => ({id: `event-${event.id}`, badge: formatTimeRange(event.startsAt, event.endsAt, locale), title: event.title, meta: event.enrolled ? copy.enrolled : event.full ? copy.full : copy.remaining(event.remainingPlaces), start: new Date(event.startsAt), end: new Date(event.endsAt), tone: "event" as const}))
    ];

    if (calendarEvents.length === 0) {
        return <div className="flex min-h-72 items-center justify-center border-t border-stone-100 p-6"><p className="max-w-md rounded-xl border border-stone-200 bg-white px-5 py-4 text-center text-sm leading-6 text-stone-500 shadow-sm">{copy.calendarEmpty}</p></div>;
    }

    return (
        <div className="min-w-0 p-3 sm:p-6">
            <AtaraksiaCalendar
                culture={locale === "ua" ? "uk" : locale}
                date={currentDate}
                events={calendarEvents}
                messages={copy.calendarMessages}
                onNavigate={onNavigate}
                onSelectEvent={(event) => {
                    const slot = slotByEventId.get(event.id);
                    if (slot) return onChooseSlot(slot);
                    const fixedEvent = fixedEventByEventId.get(event.id);
                    if (fixedEvent) return onChooseEvent(fixedEvent);
                    if (event.id.startsWith("availability-day-") && event.start) return onNavigate(event.start);
                    if (unavailableIds.has(event.id)) return onChooseUnavailable();
                    return undefined;
                }}
                variant="booking"
                view={toCalendarView(view)}
            />
        </div>
    );
}

function ConfirmationModal({copy, isSaving, locale, onClose, onConfirm, pending, reminderOptIn, setReminderOptIn}: {copy: Copy; isSaving: boolean; locale: string; onClose: () => void; onConfirm: () => void; pending: PendingBooking; reminderOptIn: boolean; setReminderOptIn: (value: boolean) => void}) {
    const title = pending.type === "individual" ? pending.service.title : pending.event.title;
    const specialist = pending.type === "individual" ? pending.slot.specialistName : pending.event.specialistName;
    const office = pending.type === "individual" ? pending.slot.officeName : pending.event.officeName;
    const officeDetails = pending.type === "individual"
        ? pending.slot
        : pending.event;
    const startsAt = pending.type === "individual" ? pending.slot.startsAt : pending.event.startsAt;
    const endsAt = pending.type === "individual" ? pending.slot.endsAt : pending.event.endsAt;
    const price = pending.type === "individual" ? pending.service.basePrice : pending.event.price;
    const capacity = pending.type === "event" ? copy.remaining(pending.event.remainingPlaces) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5">
                <h2 className="break-words text-xl font-semibold text-stone-950">{pending.type === "individual" ? copy.confirmAppointment : copy.confirmEvent}</h2>
                <dl className="mt-5 space-y-3 text-sm">
                    <InfoRow label={copy.service} value={title} />
                    <InfoRow label={copy.specialist} value={specialist} />
                    <InfoRow label={copy.office} value={office ?? copy.withoutOffice} />
                    <InfoRow label={copy.time} value={formatDateTimeRange(startsAt, endsAt, locale)} />
                    <InfoRow label={copy.price} value={formatAmount(price, locale)} />
                    {capacity ? <InfoRow label={copy.places} value={capacity} /> : null}
                </dl>
                <OfficeDetailsBlock copy={copy} details={officeDetails} />
                <label className="mt-5 flex min-w-0 gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    <input checked={reminderOptIn} className="mt-0.5 h-4 w-4 accent-stone-900" onChange={(event) => setReminderOptIn(event.target.checked)} type="checkbox" />
                    <span className="min-w-0"><strong className="block break-words font-medium text-stone-900">{copy.reminder}</strong><span className="mt-0.5 block break-words text-xs leading-5 text-stone-500">{copy.reminderHint}</span></span>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5">
                <h2 className="break-words text-xl font-semibold text-stone-950">{copy.chooseServiceForTime}</h2>
                <p className="mt-2 break-words text-sm leading-6 text-stone-500">{formatDateTimeRange(slot.startsAt, slot.endsAt, locale)} · {slot.specialistName} · {slot.officeName ?? copy.withoutOffice}</p>
                <div className="mt-5 space-y-2">
                    {services.map((service) => (
                        <button className="block w-full max-w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white" key={service.id} onClick={() => onSelect(service)} type="button">
                            <span className="block break-words text-sm font-semibold text-stone-950">{service.title}</span>
                            <span className="mt-1 block break-words text-xs text-stone-500">{copy.minutes(service.durationMinutes)} · {formatAmount(service.basePrice, locale)}</span>
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
    return <label className="min-w-0"><span className="mb-1.5 block break-words text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</span>{children}</label>;
}

function InfoRow({label, value}: {label: string; value: string}) {
    return <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-3"><dt className="break-words text-stone-500">{label}</dt><dd className="break-words font-medium text-stone-900">{value}</dd></div>;
}

type OfficeDetailsSource = Pick<PublicScheduleAvailabilityBlock | PublicFixedEvent, "officeAddress" | "officeDirections" | "officePhotoUrl" | "officeVideoUrl" | "officeGoogleMapsUrl">;

function OfficeDetailsBlock({copy, details}: {copy: Copy; details: OfficeDetailsSource}) {
    const rows = [
        {label: copy.officeAddress, value: details.officeAddress},
        {label: copy.officeDirections, value: details.officeDirections}
    ].filter((row) => row.value);
    const hasMedia = Boolean(details.officePhotoUrl || details.officeVideoUrl || details.officeGoogleMapsUrl);

    if (rows.length === 0 && !hasMedia) {
        return null;
    }

    return (
        <section className="mt-5 border-t border-stone-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{copy.officeDetails}</h3>
            <dl className="mt-2 space-y-2 text-sm leading-6">
                {rows.map((row) => (
                    <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-3" key={row.label}>
                        <dt className="break-words text-stone-500">{row.label}</dt>
                        <dd className="whitespace-pre-line break-words font-medium text-stone-900">{row.value}</dd>
                    </div>
                ))}
            </dl>
            {details.officePhotoUrl ? (
                <a className="mt-4 block overflow-hidden rounded-xl border border-stone-200 bg-stone-50" href={details.officePhotoUrl} rel="noreferrer" target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={copy.officePhotoAlt} className="max-h-60 w-full object-cover" src={details.officePhotoUrl} />
                </a>
            ) : null}
            {hasMedia ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {details.officeVideoUrl ? <a className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50" href={details.officeVideoUrl} rel="noreferrer" target="_blank">{copy.officeVideo}</a> : null}
                    {details.officeGoogleMapsUrl ? <a className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50" href={details.officeGoogleMapsUrl} rel="noreferrer" target="_blank">{copy.officeMap}</a> : null}
                </div>
            ) : null}
        </section>
    );
}

function buildRange(date: Date, view: CalendarView, days: number) {
    const from = view === "week"
        ? startOfWeek(date)
        : view === "month"
        ? firstDayOfMonth(date)
        : new Date(date);
    from.setHours(0, 0, 0, 0);

    const to = new Date(from);
    if (view === "day") {
        to.setDate(to.getDate() + 1);
    } else if (view === "week") {
        to.setDate(to.getDate() + 7);
    } else if (view === "month") {
        to.setMonth(to.getMonth() + 1);
    } else {
        to.setDate(to.getDate() + days);
    }

    return {from: from.toISOString(), to: to.toISOString()};
}

function startOfWeek(date: Date) {
    const monday = new Date(date);
    const day = monday.getDay();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
    return monday;
}

function firstDayOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function navigateDate(date: Date, view: CalendarView, days: number, direction: -1 | 1) {
    const next = new Date(date);
    if (view === "month") next.setMonth(next.getMonth() + direction);
    else if (view === "week") next.setDate(next.getDate() + direction * 7);
    else if (view === "day") next.setDate(next.getDate() + direction);
    else next.setDate(next.getDate() + direction * days);
    return next;
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

function filterMyBookings(bookings: Booking[], range: {from: string; to: string}) {
    const from = new Date(range.from).getTime();
    const to = new Date(range.to).getTime();
    return bookings.filter((booking) => {
        const startsAt = new Date(booking.startsAt).getTime();
        return booking.status !== "CANCELLED" && startsAt >= from && startsAt <= to;
    });
}

function uniqueSpecialists(items: Array<{specialistId: number; specialistName: string}>) {
    const specialists = new Map<number, string>();
    for (const item of items) specialists.set(item.specialistId, item.specialistName);
    return Array.from(specialists, ([id, name]) => ({id, name}));
}

function activeFilterChips(filters: FilterState, services: PublicService[], offices: Array<{id: number; name: string}>, specialists: Array<{id: number; name: string}>, copy: Copy) {
    const chips = [
        filters.mode !== "all" ? (filters.mode === "individual" ? copy.individual : copy.events) : null,
        filters.status !== "all" ? statusFilterLabel(filters.status, copy) : null
    ];
    const service = selectedService(services, filters.serviceId);
    const office = filters.officeId === "" ? undefined : offices.find((item) => item.id === filters.officeId);
    const specialist = filters.specialistId === "" ? undefined : specialists.find((item) => item.id === filters.specialistId);
    return [...chips, service?.title, office?.name, specialist?.name].filter(Boolean) as string[];
}

function statusFilterLabel(status: Exclude<StatusFilter, "all">, copy: Copy) {
    if (status === "available") return copy.available;
    if (status === "unavailable") return copy.unavailable;
    if (status === "events") return copy.eventsWithPlaces;
    return copy.myBookings;
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

function groupSlotsByDay(slots: PublicScheduleAvailabilityBlock[], locale: string, copy: Copy): AtaraksiaCalendarEvent[] {
    const grouped = new Map<string, PublicScheduleAvailabilityBlock[]>();
    for (const slot of slots) {
        const key = slot.startsAt.slice(0, 10);
        grouped.set(key, [...(grouped.get(key) ?? []), slot]);
    }

    return Array.from(grouped.entries()).map(([dateKey, daySlots]) => {
        const sorted = [...daySlots].sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
        const start = new Date(sorted[0].startsAt);
        const end = new Date(sorted[sorted.length - 1].endsAt);
        return {
            id: `availability-day-${dateKey}`,
            badge: copy.available,
            title: copy.slotCount(sorted.length),
            meta: `${formatTime(sorted[0].startsAt, locale)} · ${sorted[0].officeName ?? copy.withoutOffice}`,
            start,
            end,
            tone: "available" as const
        };
    });
}

function compactUnavailable(unavailable: PublicScheduleUnavailableBlock[], view: CalendarView, locale: string, copy: Copy) {
    if (view === "day" || view === "list") {
        return unavailable.map((item) => ({
            id: item.id,
            badge: formatTimeRange(item.startsAt, item.endsAt, locale),
            title: item.status === "BUFFER" ? copy.unavailable : item.status === "OCCUPIED" ? copy.occupied : copy.unavailable,
            meta: [item.specialistName, item.officeName ?? copy.withoutOffice].join(" · "),
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            tone: item.status === "BUFFER" ? "buffer" as const : "blocked" as const
        }));
    }

    const grouped = new Map<string, PublicScheduleUnavailableBlock[]>();
    for (const item of unavailable) {
        const key = item.startsAt.slice(0, 10);
        grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }

    return Array.from(grouped.entries()).map(([dateKey, items]) => {
        const sorted = [...items].sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
        return {
            id: `unavailable-day-${dateKey}`,
            badge: copy.unavailable,
            title: `${items.length}`,
            meta: formatTime(sorted[0].startsAt, locale),
            startsAt: sorted[0].startsAt,
            endsAt: sorted[sorted.length - 1].endsAt,
            tone: "blocked" as const
        };
    });
}

function formatTimeRange(start: string, end: string, locale: string) {
    return `${formatTime(start, locale)}–${formatTime(end, locale)}`;
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
        period: params.get("period") === "31" ? 31 : 7
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

function formatDateTime(value: string, locale: string) {
    return `${new Intl.DateTimeFormat(toLanguageTag(locale), {day: "numeric", month: "long", weekday: "short"}).format(new Date(value))}, ${formatTime(value, locale)}`;
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
    const labelEnd = new Date(to);
    labelEnd.setDate(labelEnd.getDate() - 1);
    return `${new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "short"}).format(from)} – ${new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "short"}).format(labelEnd)}`;
}

function toLanguageTag(locale: string) {
    return locale === "ua" ? "uk" : locale;
}

type T = ReturnType<typeof useTranslations<"calendar.page">>;
type Copy = ReturnType<typeof labels>;

function labels(t: T) {
    return {
        eyebrow: t("eyebrow"),
        title: t("bookingScheduleTitle"),
        subtitle: t("bookingScheduleSubtitle"),
        chooseTitle: t("chooseTitle"),
        chooseDescription: t("chooseDescription"),
        loading: t("public.loading"),
        individual: t("public.individual"),
        fixedEvent: t("public.fixedEvent"),
        chooseTime: t("public.chooseTime"),
        bookEvent: t("public.bookEvent"),
        noDescription: t("public.noDescription"),
        withoutOffice: t("withoutOffice"),
        remaining: (count: number) => t("public.remaining", {count}),
        enrolled: t("public.enrolled"),
        full: t("public.full"),
        filtersTitle: t("public.filtersTitle"),
        filtersHint: t("public.filtersHint"),
        showFilters: t("public.showFilters"),
        hideFilters: t("public.hideFilters"),
        noActiveFilters: t("public.noActiveFilters"),
        resetFilters: t("public.resetFilters"),
        saveFilters: t("public.saveFilters"),
        updateSaved: t("public.updateSaved"),
        applySaved: t("public.applySaved"),
        deleteSaved: t("public.deleteSaved"),
        savedActive: t("public.savedActive"),
        mode: t("public.mode"),
        service: t("filters.service"),
        office: t("filters.office"),
        specialist: t("filters.specialist"),
        status: t("public.status"),
        period: t("filters.period"),
        all: t("public.all"),
        events: t("public.events"),
        allServices: t("public.allServices"),
        allOffices: t("filters.allOffices"),
        allSpecialists: t("filters.allSpecialists"),
        available: t("public.available"),
        unavailable: t("public.unavailable"),
        occupied: t("public.occupied"),
        eventsWithPlaces: t("public.eventsWithPlaces"),
        myBookings: t("public.myBookings"),
        days7: t("periods.days7"),
        days31: t("periods.days31"),
        nearestSlots: t("public.nearestSlots"),
        selectedSummary: t("public.selectedSummary"),
        selectServicePrompt: t("public.selectServicePrompt"),
        slotCount: (count: number) => t("slotCount", {count}),
        minutes: (count: number) => t("summary.minutes", {count}),
        select: t("public.select"),
        selected: t("public.selected"),
        noSlotsTitle: t("public.noSlotsTitle"),
        noSlotsBody: t("public.noSlotsBody"),
        otherDates: t("public.otherDates"),
        calendarTitle: t("public.calendarTitle"),
        calendarDescription: t("public.calendarDescription"),
        calendarEmpty: t("public.calendarEmpty"),
        previous: t("calendarMessages.previous"),
        next: t("calendarMessages.next"),
        today: t("calendarMessages.today"),
        loadError: t("loadError"),
        chooseServiceFirst: t("public.chooseServiceFirst"),
        chooseServiceForTime: t("public.chooseServiceForTime"),
        slotTooShort: t("public.slotTooShort"),
        unavailableClick: t("public.unavailableClick"),
        individualServiceTitle: t("public.individualServiceTitle"),
        individualServiceHint: t("public.individualServiceHint"),
        selectedServiceHint: t("public.selectedServiceHint"),
        upcomingEvents: t("public.upcomingEvents"),
        noEvents: t("public.noEvents"),
        views: {month: t("views.month"), week: t("views.week"), day: t("views.day"), list: t("views.list")},
        confirmAppointment: t("public.confirmAppointment"),
        confirmEvent: t("public.confirmEvent"),
        confirmParticipation: t("public.confirmParticipation"),
        time: t("public.time"),
        price: t("summary.price"),
        places: t("public.places"),
        officeDetails: t("public.officeDetails"),
        officeAddress: t("public.officeAddress"),
        officeDirections: t("public.officeDirections"),
        officePhotoAlt: t("public.officePhotoAlt"),
        officeVideo: t("public.officeVideo"),
        officeMap: t("public.officeMap"),
        reminder: t("booking.reminderOptIn"),
        reminderHint: t("booking.reminderHint"),
        cancel: t("public.cancel"),
        close: t("public.close"),
        cancelEnrollment: t("public.cancelEnrollment"),
        saving: t("public.saving"),
        bookingCreated: t("booking.created"),
        bookingCreatedWithPayment: t("booking.createdWithPayment"),
        paymentTitle: t("public.paymentTitle"),
        paymentBody: (service: string, startsAt: string) => t("public.paymentBody", {service, startsAt}),
        paymentAction: t("public.paymentAction"),
        dismissPayment: t("public.dismissPayment"),
        eventEnrolled: t("public.eventEnrolled"),
        eventCancelled: t("public.eventCancelled"),
        cancelEventError: t("public.cancelEventError"),
        bookingError: t("public.bookingError"),
        calendarMessages: calendarMessages(t)
    };
}

function calendarMessages(t: T): AtaraksiaCalendarMessages {
    return {
        agenda: t("calendarMessages.agenda"),
        allDay: t("calendarMessages.allDay"),
        date: t("calendarMessages.date"),
        day: t("calendarMessages.day"),
        event: t("calendarMessages.event"),
        month: t("calendarMessages.month"),
        next: t("calendarMessages.next"),
        noEventsInRange: t("calendarMessages.noEventsInRange"),
        previous: t("calendarMessages.previous"),
        showMore: (count) => t("calendarMessages.showMore", {count}),
        time: t("calendarMessages.time"),
        today: t("calendarMessages.today"),
        tomorrow: t("calendarMessages.tomorrow"),
        week: t("calendarMessages.week"),
        work_week: t("calendarMessages.workWeek"),
        yesterday: t("calendarMessages.yesterday")
    };
}
