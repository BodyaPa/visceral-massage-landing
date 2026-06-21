"use client";

import {useEffect, useMemo, useState} from "react";
import {useLocale, useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateBookingMutation} from "@/features/bookings/bookings.api";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {
    useCancelFixedEventEnrollmentMutation,
    useEnrollFixedEventMutation,
    useListPublicAvailabilityQuery,
    useListPublicEventsQuery
} from "@/features/schedule/schedule.api";
import {useListServicesQuery} from "@/features/services/services.api";
import {API_URL} from "@/shared/constants/env";
import {withLocale} from "@/shared/lib/locale/withLocale";
import type {Office} from "@/types/offices";
import type {PublicFixedEvent, PublicScheduleAvailabilityBlock} from "@/types/schedule";
import type {PublicService} from "@/types/services";

const savedFiltersKey = "ataraksia.publicScheduleFilters";
type BookingModeFilter = "all" | "individual" | "events";
type StatusFilter = "all" | "available" | "unavailable" | "events" | "mine";
type PendingBooking =
    | {type: "individual"; service: PublicService; slot: PublicScheduleAvailabilityBlock}
    | {type: "event"; event: PublicFixedEvent};
type SpecialistOption = {id: number; name: string};
type PaymentPrompt = {
    externalPaymentUrl: string | null;
    serviceTitleUa?: string;
    serviceTitleEn?: string | null;
    title?: string;
    startsAt: string;
};

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
    const [filters, setFilters] = useState<FilterState>({officeId: "", serviceId: "", specialistId: "", mode: "all", status: "all", period: 31});
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [reminderOptIn, setReminderOptIn] = useState(false);
    const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
    const [selectedEventDetails, setSelectedEventDetails] = useState<PublicFixedEvent | null>(null);
    const [slotForServiceChoice, setSlotForServiceChoice] = useState<PublicScheduleAvailabilityBlock | null>(null);
    const [paymentPrompt, setPaymentPrompt] = useState<PaymentPrompt | null>(null);
    const guidedRange = useMemo(() => buildMonthRange(currentDate), [currentDate]);

    const {data: officesData} = useListPublicOfficesQuery({size: 100});
    const {data: servicesData} = useListServicesQuery({lang: locale, size: 100});
    const individualServiceId = filters.serviceId !== "" && selectedService(servicesData?.content ?? [], filters.serviceId)?.bookingMode === "INDIVIDUAL_APPOINTMENT"
        ? filters.serviceId
        : "";
    const {data: guidedSlotsData = [], isError: slotsError, refetch: refetchSlots} = useListPublicAvailabilityQuery({
        from: guidedRange.from,
        to: guidedRange.to,
        officeId: filters.officeId,
        serviceId: individualServiceId,
        specialistId: filters.specialistId
    });
    const {data: guidedEventsData = [], refetch: refetchEvents} = useListPublicEventsQuery({
        from: guidedRange.from,
        to: guidedRange.to,
        officeId: filters.officeId,
        serviceId: eventServiceId(servicesData?.content ?? [], filters.serviceId),
        specialistId: filters.specialistId,
        lang: locale
    });
    const [createBooking, {isLoading: bookingLoading}] = useCreateBookingMutation();
    const [enrollEvent, {isLoading: enrollmentLoading}] = useEnrollFixedEventMutation();
    const [cancelEventEnrollment, {isLoading: cancelEnrollmentLoading}] = useCancelFixedEventEnrollmentMutation();

    const offices = officesData?.content ?? [];
    const services = servicesData?.content ?? [];
    const individualServices = services.filter((service) => service.bookingMode === "INDIVIDUAL_APPOINTMENT");
    const eventServices = services.filter((service) => service.bookingMode === "FIXED_EVENT");
    const selected = selectedService(services, filters.serviceId);
    const guidedSlots = useMemo(() => (
        filters.mode === "events" || filters.status === "unavailable" || filters.status === "events" || filters.status === "mine" ? [] : guidedSlotsData
    ), [filters.mode, filters.status, guidedSlotsData]);
    const guidedEvents = useMemo(() => filterEvents(guidedEventsData, filters), [guidedEventsData, filters]);
    const guidedSpecialists = uniqueSpecialists([...guidedSlots, ...guidedEvents]);
    const isSaving = bookingLoading || enrollmentLoading || cancelEnrollmentLoading;
    const selectedDateKey = dateKey(currentDate);
    const availableDays = useMemo(() => buildAvailableDays(guidedSlots, guidedEvents, locale, copy), [copy, guidedEvents, guidedSlots, locale]);
    const selectedDaySlots = guidedSlots.filter((slot) => dateKey(new Date(slot.startsAt)) === selectedDateKey);
    const selectedDayEvents = guidedEvents.filter((event) => dateKey(new Date(event.startsAt)) === selectedDateKey);

    useEffect(() => {
        const loaded = loadSavedFilters();
        if (loaded) {
            setFilters(loaded);
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

    function chooseEventMode() {
        setFilters((current) => ({...current, mode: "events", serviceId: "", status: "events"}));
        setCurrentDate(new Date());
    }

    function chooseEventService(service: PublicService) {
        setFilters((current) => ({...current, serviceId: service.id, mode: "events", status: "events"}));
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
                setPaymentPrompt(booking);
                void refetchSlots();
            } else {
                await enrollEvent({id: pendingBooking.event.id, lang: locale, reminderOptIn}).unwrap();
                toast.success(copy.eventEnrolled);
                setPaymentPrompt({externalPaymentUrl: null, title: pendingBooking.event.title, startsAt: pendingBooking.event.startsAt});
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
        <main className="mx-auto w-full max-w-[1440px] space-y-5 overflow-x-clip bg-stone-50 px-3 py-6 sm:px-6 lg:px-8 lg:py-10">
            <header className="mx-auto w-full max-w-[760px] pb-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{copy.eyebrow}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">{copy.title}</h1>
                <p className="mt-2 text-sm leading-6 text-stone-600">{copy.subtitle}</p>
            </header>

            <GuidedBookingFlow
                availableDays={availableDays}
                copy={copy}
                currentDate={currentDate}
                events={selectedDayEvents}
                eventServices={eventServices}
                filters={filters}
                individualServices={individualServices}
                locale={locale}
                offices={offices}
                onChooseDate={(date) => {
                    setCurrentDate(date);
                }}
                onChooseOffice={(officeId) => updateFilter("officeId", officeId)}
                onChooseMonth={(date) => {
                    setCurrentDate(date);
                }}
                onChooseSpecialist={(specialistId) => updateFilter("specialistId", specialistId)}
                onChooseEvent={chooseEvent}
                onChooseEventMode={chooseEventMode}
                onChooseService={chooseIndividualService}
                onChooseEventService={chooseEventService}
                onChooseSlot={chooseSlot}
                selectedEventService={selected?.bookingMode === "FIXED_EVENT" ? selected : undefined}
                selectedService={selected?.bookingMode === "INDIVIDUAL_APPOINTMENT" ? selected : undefined}
                specialists={guidedSpecialists}
                slots={selectedDaySlots}
            />

            {slotsError ? <p className="mx-auto max-w-[760px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copy.loadError}</p> : null}

            {paymentPrompt ? (
                <section className="mx-auto max-w-[760px] rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-emerald-950">{copy.paymentTitle}</h2>
                            <p className="mt-1 text-sm leading-6 text-emerald-900">{copy.paymentBody(paymentPromptTitle(paymentPrompt, locale), formatDateTime(paymentPrompt.startsAt, locale))}</p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            {paymentPrompt.externalPaymentUrl ? <a className="rounded-lg bg-emerald-900 px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-800" href={paymentPrompt.externalPaymentUrl} rel="noreferrer" target="_blank">{copy.paymentAction}</a> : null}
                            <a className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-center text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100" href={withLocale("/account", locale)}>{copy.accountAction}</a>
                            <button className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100" onClick={() => setPaymentPrompt(null)} type="button">{copy.dismissPayment}</button>
                        </div>
                    </div>
                </section>
            ) : null}

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

const secondaryButtonClass = "max-w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100";
const compactButtonClass = "max-w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100";

type AvailableDay = {
    date: Date;
    eventsCount: number;
    key: string;
    label: string;
    slotsCount: number;
};

function GuidedBookingFlow({
    availableDays,
    copy,
    currentDate,
    events,
    eventServices,
    filters,
    individualServices,
    locale,
    offices,
    onChooseDate,
    onChooseEvent,
    onChooseEventMode,
    onChooseOffice,
    onChooseMonth,
    onChooseSpecialist,
    onChooseService,
    onChooseEventService,
    onChooseSlot,
    selectedEventService,
    selectedService,
    specialists,
    slots
}: {
    availableDays: AvailableDay[];
    copy: Copy;
    currentDate: Date;
    events: PublicFixedEvent[];
    eventServices: PublicService[];
    filters: FilterState;
    individualServices: PublicService[];
    locale: string;
    offices: Office[];
    onChooseDate: (date: Date) => void;
    onChooseEvent: (event: PublicFixedEvent) => void;
    onChooseEventMode: () => void;
    onChooseOffice: (officeId: number | "") => void;
    onChooseMonth: (date: Date) => void;
    onChooseSpecialist: (specialistId: number | "") => void;
    onChooseService: (service: PublicService) => void;
    onChooseEventService: (service: PublicService) => void;
    onChooseSlot: (slot: PublicScheduleAvailabilityBlock) => void;
    selectedEventService?: PublicService;
    selectedService?: PublicService;
    specialists: SpecialistOption[];
    slots: PublicScheduleAvailabilityBlock[];
}) {
    const selectedKey = dateKey(currentDate);
    const [officesExpanded, setOfficesExpanded] = useState(false);
    const [individualServicesExpanded, setIndividualServicesExpanded] = useState(false);
    const [eventServicesExpanded, setEventServicesExpanded] = useState(false);
    const [specialistsExpanded, setSpecialistsExpanded] = useState(false);
    const visibleDays = availableDays.slice(0, 14);
    const visibleOffices = officesExpanded ? offices : offices.slice(0, 3);
    const visibleIndividualServices = individualServicesExpanded ? individualServices : individualServices.slice(0, 6);
    const visibleEventServices = eventServicesExpanded ? eventServices : eventServices.slice(0, 5);
    const orderedSpecialists = prioritizeSelectedSpecialist(specialists, filters.specialistId);
    const visibleSpecialists = specialistsExpanded ? orderedSpecialists : orderedSpecialists.slice(0, 5);
    const showIndividualChoices = filters.mode === "individual";
    const showEventChoices = filters.mode === "events";
    const availableByDate = useMemo(() => new Map(availableDays.map((day) => [day.key, day])), [availableDays]);
    const monthDays = useMemo(() => buildMonthPickerDays(currentDate), [currentDate]);
    const nearestDay = availableDays.find((day) => day.date.getTime() >= startOfDay(new Date()).getTime()) ?? availableDays[0];

    return (
        <section className="mx-auto w-full max-w-[760px] rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
            <div className="grid gap-4">
                <div className="min-w-0 space-y-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{copy.guidedEyebrow}</p>
                        <h2 className="mt-2 text-xl font-semibold text-stone-950">{copy.guidedTitle}</h2>
                        <p className="mt-1 text-sm leading-6 text-stone-500">{copy.guidedDescription}</p>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-stone-950">{copy.chooseOfficeTitle}</h3>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{copy.chooseOfficeHint}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <button className={filters.officeId === "" ? "w-full rounded-xl border border-stone-900 bg-stone-900 p-3 text-left text-white" : "w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white"} onClick={() => onChooseOffice("")} type="button">
                                <span className="block text-sm font-semibold">{copy.allOffices}</span>
                                <span className={filters.officeId === "" ? "mt-1 block text-xs leading-5 text-stone-200" : "mt-1 block text-xs leading-5 text-stone-500"}>{copy.allOfficesHint}</span>
                            </button>
                            {visibleOffices.map((office) => (
                                <OfficeChoiceCard copy={copy} key={office.id} office={office} onChoose={() => onChooseOffice(office.id)} selected={filters.officeId === office.id} />
                            ))}
                        </div>
                        {offices.length > 3 ? (
                            <button className={`${compactButtonClass} mt-2`} onClick={() => setOfficesExpanded((current) => !current)} type="button">
                                {officesExpanded ? copy.showLess : copy.showMore}
                            </button>
                        ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <button
                            className={filters.mode === "individual" ? "rounded-xl border border-stone-900 bg-stone-900 p-4 text-left text-white" : "rounded-xl border border-stone-200 bg-stone-50 p-4 text-left transition-colors hover:border-stone-400 hover:bg-white"}
                            onClick={() => {
                                if (selectedService) return;
                                const firstService = individualServices[0];
                                if (firstService) onChooseService(firstService);
                            }}
                            type="button"
                        >
                            <span className="block text-sm font-semibold">{copy.individual}</span>
                            <span className={filters.mode === "individual" ? "mt-1 block text-xs leading-5 text-stone-200" : "mt-1 block text-xs leading-5 text-stone-500"}>{copy.chooseIndividualMode}</span>
                        </button>
                        <button
                            className={filters.mode === "events" ? "rounded-xl border border-stone-900 bg-stone-900 p-4 text-left text-white" : "rounded-xl border border-stone-200 bg-stone-50 p-4 text-left transition-colors hover:border-stone-400 hover:bg-white"}
                            onClick={onChooseEventMode}
                            type="button"
                        >
                            <span className="block text-sm font-semibold">{copy.fixedEvent}</span>
                            <span className={filters.mode === "events" ? "mt-1 block text-xs leading-5 text-stone-200" : "mt-1 block text-xs leading-5 text-stone-500"}>{copy.chooseEventMode}</span>
                        </button>
                    </div>
                    {showIndividualChoices ? <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-stone-950">{copy.individualServiceTitle}</h3>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {visibleIndividualServices.map((service) => (
                                <ServiceChoiceCard copy={copy} key={service.id} locale={locale} onChoose={() => onChooseService(service)} selected={selectedService?.id === service.id} service={service} />
                            ))}
                        </div>
                        {individualServices.length > 6 ? (
                            <button className={`${compactButtonClass} mt-2`} onClick={() => setIndividualServicesExpanded((current) => !current)} type="button">
                                {individualServicesExpanded ? copy.showLess : copy.showMore}
                            </button>
                        ) : null}
                    </div> : null}
                    {showEventChoices ? <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-stone-950">{copy.fixedEventServicesTitle}</h3>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{copy.fixedEventServicesHint}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <button className={filters.mode === "events" && filters.serviceId === "" ? "w-full rounded-xl border border-stone-900 bg-stone-900 p-3 text-left text-white" : "w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white"} onClick={onChooseEventMode} type="button">
                                <span className="block text-sm font-semibold">{copy.allEvents}</span>
                                <span className={filters.mode === "events" && filters.serviceId === "" ? "mt-1 block text-xs leading-5 text-stone-200" : "mt-1 block text-xs leading-5 text-stone-500"}>{copy.allEventsHint}</span>
                            </button>
                            {visibleEventServices.map((service) => (
                                <ServiceChoiceCard copy={copy} key={service.id} locale={locale} onChoose={() => onChooseEventService(service)} selected={selectedEventService?.id === service.id} service={service} />
                            ))}
                        </div>
                        {eventServices.length > 5 ? (
                            <button className={`${compactButtonClass} mt-2`} onClick={() => setEventServicesExpanded((current) => !current)} type="button">
                                {eventServicesExpanded ? copy.showLess : copy.showMore}
                            </button>
                        ) : null}
                        {eventServices.length === 0 ? <p className="mt-2 rounded-xl border border-dashed border-stone-300 bg-white px-3 py-2 text-xs leading-5 text-stone-500">{copy.noEventServices}</p> : null}
                    </div> : null}
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-stone-950">{copy.chooseSpecialistTitle}</h3>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{copy.chooseSpecialistHint}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <button className={filters.specialistId === "" ? "w-full rounded-xl border border-stone-900 bg-stone-900 p-3 text-left text-white" : "w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white"} onClick={() => onChooseSpecialist("")} type="button">
                                <span className="block text-sm font-semibold">{copy.allSpecialists}</span>
                                <span className={filters.specialistId === "" ? "mt-1 block text-xs leading-5 text-stone-200" : "mt-1 block text-xs leading-5 text-stone-500"}>{copy.allSpecialistsHint}</span>
                            </button>
                            {visibleSpecialists.map((specialist) => (
                                <SpecialistChoiceCard copy={copy} key={specialist.id} onChoose={() => onChooseSpecialist(specialist.id)} selected={filters.specialistId === specialist.id} specialist={specialist} />
                            ))}
                        </div>
                        {specialists.length > 5 ? (
                            <button className={`${compactButtonClass} mt-2`} onClick={() => setSpecialistsExpanded((current) => !current)} type="button">
                                {specialistsExpanded ? copy.showLess : copy.showMore}
                            </button>
                        ) : null}
                        {specialists.length === 0 ? <p className="mt-2 rounded-xl border border-dashed border-stone-300 bg-white px-3 py-2 text-xs leading-5 text-stone-500">{copy.noSpecialistsForFilters}</p> : null}
                    </div>
                </div>
                <div className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <div className="mb-3 rounded-xl border border-stone-200 bg-white p-3">
                        <h3 className="text-sm font-semibold text-stone-950">{copy.selectedSummary}</h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {guidedSelectionChips({
                                copy,
                                currentDate,
                                filters,
                                locale,
                                offices,
                                selectedEventService,
                                selectedService,
                                specialists
                            }).map((chip) => (
                                <span className="max-w-full break-words rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700" key={chip}>{chip}</span>
                            ))}
                        </div>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-stone-950">{copy.availableDaysTitle}</h3>
                            <p className="mt-1 text-xs leading-5 text-stone-500">{copy.availableDaysHint}</p>
                        </div>
                        <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-500">{copy.slotCount(availableDays.reduce((sum, day) => sum + day.slotsCount, 0))}</span>
                    </div>
                    <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                            <button className={compactButtonClass} onClick={() => onChooseMonth(addMonths(currentDate, -1))} type="button">{copy.previousMonth}</button>
                            <p className="text-sm font-semibold text-stone-950">{formatMonthLabel(currentDate, locale)}</p>
                            <button className={compactButtonClass} onClick={() => onChooseMonth(addMonths(currentDate, 1))} type="button">{copy.nextMonth}</button>
                        </div>
                        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-stone-400">
                            {weekdayLabels(locale).map((label) => <span key={label}>{label}</span>)}
                        </div>
                        <div className="mt-1 grid grid-cols-7 gap-1">
                            {monthDays.map((day) => {
                                const available = availableByDate.get(day.key);
                                const disabled = !available || !day.inCurrentMonth;
                                return (
                                    <button
                                        aria-label={available ? `${day.day}. ${available.slotsCount ? copy.slotCount(available.slotsCount) : copy.eventsCount(available.eventsCount)}` : `${day.day}. ${copy.noAvailabilityDay}`}
                                        aria-pressed={day.key === selectedKey}
                                        className={monthDayClass(day, Boolean(available), day.key === selectedKey)}
                                        disabled={disabled}
                                        key={day.key}
                                        onClick={() => available ? onChooseDate(available.date) : undefined}
                                        type="button"
                                    >
                                        <span className="block text-sm font-semibold">{day.day}</span>
                                        {available ? <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-emerald-500" /> : <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-transparent" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {visibleDays.length > 0 ? (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {visibleDays.map((day) => (
                                <button
                                    aria-pressed={day.key === selectedKey}
                                    className={day.key === selectedKey ? "min-w-28 rounded-xl border border-stone-900 bg-white px-3 py-2 text-left shadow-sm" : "min-w-28 rounded-xl border border-stone-200 bg-white px-3 py-2 text-left transition-colors hover:border-stone-400"}
                                    key={day.key}
                                    onClick={() => onChooseDate(day.date)}
                                    type="button"
                                >
                                    <span className="block text-sm font-semibold text-stone-950">{day.label}</span>
                                    <span className="mt-1 block text-xs text-stone-500">{day.slotsCount ? copy.slotCount(day.slotsCount) : copy.eventsCount(day.eventsCount)}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-stone-300 bg-white px-4 py-5 text-sm text-stone-500">
                            <p>{copy.noAvailableDays}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button className={compactButtonClass} onClick={() => onChooseMonth(addMonths(currentDate, 1))} type="button">{copy.nextMonth}</button>
                            </div>
                        </div>
                    )}
                    {nearestDay && nearestDay.key !== selectedKey ? (
                        <button className="mt-3 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-100" onClick={() => onChooseDate(nearestDay.date)} type="button">
                            {copy.nearestAvailable(formatDate(nearestDay.date.toISOString(), locale))}
                        </button>
                    ) : null}
                    <div className="mt-4 space-y-2">
                        {slots.slice(0, 5).map((slot) => (
                            selectedService
                                ? <CompactSlotRow copy={copy} key={slotKey(slot)} locale={locale} onChoose={() => onChooseSlot(slot)} service={selectedService} slot={slot} />
                                : <CompactOpenSlotRow copy={copy} key={slotKey(slot)} locale={locale} onChoose={() => onChooseSlot(slot)} slot={slot} />
                        ))}
                        {events.slice(0, 5).map((event) => <CompactEventRow copy={copy} event={event} key={event.id} locale={locale} onChoose={() => onChooseEvent(event)} />)}
                        {slots.length === 0 && events.length === 0 && visibleDays.length > 0 ? <p className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-5 text-sm text-stone-500">{copy.selectedDayEmpty}</p> : null}
                    </div>
                </div>
            </div>
        </section>
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

function OfficeChoiceCard({copy, office, onChoose, selected}: {copy: Copy; office: Office; onChoose: () => void; selected: boolean}) {
    return (
        <button className={selected ? "w-full max-w-full rounded-xl border border-stone-900 bg-stone-900 p-3 text-left text-white" : "w-full max-w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white"} onClick={onChoose} type="button">
            <span className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold">{office.name}</span>
                    <span className={selected ? "mt-1 line-clamp-2 block break-words text-xs leading-5 text-stone-200" : "mt-1 line-clamp-2 block break-words text-xs leading-5 text-stone-500"}>{office.address}</span>
                </span>
                <span className={selected ? "shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-900" : "shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-700"}>{selected ? copy.selected : copy.select}</span>
            </span>
        </button>
    );
}

function SpecialistChoiceCard({copy, onChoose, selected, specialist}: {copy: Copy; onChoose: () => void; selected: boolean; specialist: SpecialistOption}) {
    return (
        <button className={selected ? "w-full max-w-full rounded-xl border border-stone-900 bg-stone-900 p-3 text-left text-white" : "w-full max-w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white"} onClick={onChoose} type="button">
            <span className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold">{specialist.name}</span>
                    <span className={selected ? "mt-1 block text-xs leading-5 text-stone-200" : "mt-1 block text-xs leading-5 text-stone-500"}>{copy.specialistAvailabilityHint}</span>
                </span>
                <span className={selected ? "shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-900" : "shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-700"}>{selected ? copy.selected : copy.select}</span>
            </span>
        </button>
    );
}

function CompactOpenSlotRow({copy, locale, onChoose, slot}: {copy: Copy; locale: string; onChoose: () => void; slot: PublicScheduleAvailabilityBlock}) {
    return (
        <article className="w-full max-w-full rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-stone-950">{formatDate(slot.startsAt, locale)} · {formatTime(slot.startsAt, locale)}</p>
                    <p className="mt-1 break-words text-xs text-stone-600">{slot.specialistName} · {slot.officeName ?? copy.withoutOffice}</p>
                </div>
                <button className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100" onClick={onChoose} type="button">{copy.chooseTime}</button>
            </div>
            <OfficeDetailsInline copy={copy} details={slot} />
        </article>
    );
}

function CompactSlotRow({copy, locale, onChoose, service, slot}: {copy: Copy; locale: string; onChoose: () => void; service: PublicService; slot: PublicScheduleAvailabilityBlock}) {
    return (
        <article className="w-full max-w-full rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-stone-950">{formatDate(slot.startsAt, locale)} · {formatTime(slot.startsAt, locale)}</p>
                    <p className="mt-1 break-words text-xs text-stone-500">{slot.specialistName} · {slot.officeName ?? copy.withoutOffice}</p>
                </div>
                <button className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100" onClick={onChoose} type="button">{copy.select}</button>
            </div>
            <p className="mt-2 break-words text-xs text-stone-600">{service.title} · {copy.minutes(service.durationMinutes)} · {formatAmount(service.basePrice, locale)}</p>
            <OfficeDetailsInline copy={copy} details={slot} />
        </article>
    );
}

function CompactEventRow({copy, event, locale, onChoose}: {copy: Copy; event: PublicFixedEvent; locale: string; onChoose: () => void}) {
    return (
        <article className="w-full max-w-full rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-stone-950">{event.title}</p>
                    <p className="mt-1 break-words text-xs text-stone-500">{formatDateTimeRange(event.startsAt, event.endsAt, locale)}</p>
                </div>
                <button className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100" onClick={onChoose} type="button">{copy.details}</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className={event.full ? "rounded-full bg-red-50 px-2 py-1 text-red-700" : "rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"}>{event.enrolled ? copy.enrolled : event.full ? copy.full : copy.remaining(event.remainingPlaces)}</span>
                <span className="rounded-full bg-white px-2 py-1 text-stone-700">{formatAmount(event.price, locale)}</span>
                <span className="rounded-full bg-white px-2 py-1 text-stone-700">{event.officeName ?? copy.withoutOffice}</span>
            </div>
            <OfficeDetailsInline copy={copy} details={event} />
        </article>
    );
}

function OfficeDetailsInline({copy, details}: {copy: Copy; details: OfficeDetailsSource}) {
    const rows = [
        details.officeAddress,
        details.officeDirections,
        details.officePhotoMediaUrl,
        details.officeVideoMediaUrl,
        details.officeGoogleMapsUrl
    ].filter(Boolean);

    if (rows.length === 0) return null;

    return (
        <details className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-stone-700">{copy.officeDetails}</summary>
            <OfficeDetailsBlock compact copy={copy} details={details} />
        </details>
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

function InfoRow({label, value}: {label: string; value: string}) {
    return <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-3"><dt className="break-words text-stone-500">{label}</dt><dd className="break-words font-medium text-stone-900">{value}</dd></div>;
}

type OfficeDetailsSource = Pick<PublicScheduleAvailabilityBlock | PublicFixedEvent, "officeAddress" | "officeDirections" | "officeGoogleMapsUrl" | "officePhotoMediaUrl" | "officeVideoMediaUrl">;

function OfficeDetailsBlock({compact = false, copy, details}: {compact?: boolean; copy: Copy; details: OfficeDetailsSource}) {
    const rows = [
        {label: copy.officeAddress, value: details.officeAddress},
        {label: copy.officeDirections, value: details.officeDirections}
    ].filter((row) => row.value);
    const hasMedia = Boolean(details.officePhotoMediaUrl || details.officeVideoMediaUrl || details.officeGoogleMapsUrl);

    if (rows.length === 0 && !hasMedia) {
        return null;
    }

    return (
        <section className={compact ? "mt-3" : "mt-5 border-t border-stone-100 pt-4"}>
            {!compact ? <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{copy.officeDetails}</h3> : null}
            <dl className="mt-2 space-y-2 text-sm leading-6">
                {rows.map((row) => (
                    <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-3" key={row.label}>
                        <dt className="break-words text-stone-500">{row.label}</dt>
                        <dd className="whitespace-pre-line break-words font-medium text-stone-900">{row.value}</dd>
                    </div>
                ))}
            </dl>
            {details.officePhotoMediaUrl ? (
                <a className="mt-4 block overflow-hidden rounded-xl border border-stone-200 bg-stone-50" href={resolveApiMediaUrl(details.officePhotoMediaUrl)} rel="noreferrer" target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={copy.officePhotoAlt} className="max-h-60 w-full object-cover" src={resolveApiMediaUrl(details.officePhotoMediaUrl)} />
                </a>
            ) : null}
            {hasMedia ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {details.officeVideoMediaUrl ? <a className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50" href={resolveApiMediaUrl(details.officeVideoMediaUrl)} rel="noreferrer" target="_blank">{copy.officeVideo}</a> : null}
                    {details.officeGoogleMapsUrl ? <a className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50" href={details.officeGoogleMapsUrl} rel="noreferrer" target="_blank">{copy.officeMap}</a> : null}
                </div>
            ) : null}
        </section>
    );
}

function resolveApiMediaUrl(path: string) {
    return path.startsWith("/api/") ? `${API_URL}${path}` : path;
}

function buildMonthRange(date: Date) {
    const from = firstDayOfMonth(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
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

function startOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
}

function addMonths(date: Date, amount: number) {
    const next = new Date(date);
    next.setDate(1);
    next.setMonth(next.getMonth() + amount);
    return next;
}

type MonthPickerDay = {
    day: number;
    inCurrentMonth: boolean;
    key: string;
};

function buildMonthPickerDays(date: Date): MonthPickerDay[] {
    const first = firstDayOfMonth(date);
    const start = startOfWeek(first);
    const days: MonthPickerDay[] = [];

    for (let index = 0; index < 42; index += 1) {
        const current = new Date(start);
        current.setDate(start.getDate() + index);
        days.push({
            day: current.getDate(),
            inCurrentMonth: current.getMonth() === first.getMonth(),
            key: dateKey(current)
        });
    }

    return days;
}

function weekdayLabels(locale: string) {
    const monday = new Date(2024, 0, 1);
    return Array.from({length: 7}, (_, index) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + index);
        return new Intl.DateTimeFormat(toLanguageTag(locale), {weekday: "short"}).format(day);
    });
}

function monthDayClass(day: MonthPickerDay, available: boolean, selected: boolean) {
    if (!day.inCurrentMonth) return "min-h-12 rounded-lg border border-transparent px-1 py-2 text-stone-300 opacity-40";
    if (selected) return "min-h-12 rounded-lg border border-stone-900 bg-stone-900 px-1 py-2 text-white shadow-sm";
    if (available) return "min-h-12 rounded-lg border border-emerald-200 bg-emerald-50 px-1 py-2 text-emerald-950 transition-colors hover:border-emerald-400 hover:bg-emerald-100";
    return "min-h-12 cursor-not-allowed rounded-lg border border-stone-100 bg-stone-50 px-1 py-2 text-stone-400";
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

function uniqueSpecialists(items: Array<{specialistId: number; specialistName: string}>): SpecialistOption[] {
    const specialists = new Map<number, string>();
    for (const item of items) specialists.set(item.specialistId, item.specialistName);
    return Array.from(specialists, ([id, name]) => ({id, name}));
}

function prioritizeSelectedSpecialist(specialists: SpecialistOption[], selectedId: number | "") {
    if (selectedId === "") return specialists;
    return [...specialists].sort((first, second) => Number(second.id === selectedId) - Number(first.id === selectedId));
}

function guidedSelectionChips({
    copy,
    currentDate,
    filters,
    locale,
    offices,
    selectedEventService,
    selectedService,
    specialists
}: {
    copy: Copy;
    currentDate: Date;
    filters: FilterState;
    locale: string;
    offices: Office[];
    selectedEventService?: PublicService;
    selectedService?: PublicService;
    specialists: SpecialistOption[];
}) {
    const office = filters.officeId === "" ? copy.allOffices : offices.find((item) => item.id === filters.officeId)?.name ?? copy.allOffices;
    const mode = filters.mode === "events" ? copy.fixedEvent : filters.mode === "individual" ? copy.individual : copy.all;
    const service = filters.mode === "individual"
        ? selectedService?.title ?? copy.allServices
        : filters.mode === "events"
        ? selectedEventService?.title ?? copy.allEvents
        : copy.allServices;
    const specialist = filters.specialistId === "" ? copy.allSpecialists : specialists.find((item) => item.id === filters.specialistId)?.name ?? copy.allSpecialists;
    return [office, mode, service, specialist, formatDate(currentDate.toISOString(), locale)];
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

function buildAvailableDays(slots: PublicScheduleAvailabilityBlock[], events: PublicFixedEvent[], locale: string, copy: Copy): AvailableDay[] {
    const days = new Map<string, {date: Date; eventsCount: number; slotsCount: number}>();

    for (const slot of slots) {
        const date = new Date(slot.startsAt);
        const key = dateKey(date);
        const current = days.get(key) ?? {date, eventsCount: 0, slotsCount: 0};
        days.set(key, {...current, slotsCount: current.slotsCount + 1});
    }

    for (const event of events) {
        if (event.full && !event.enrolled) continue;
        const date = new Date(event.startsAt);
        const key = dateKey(date);
        const current = days.get(key) ?? {date, eventsCount: 0, slotsCount: 0};
        days.set(key, {...current, eventsCount: current.eventsCount + 1});
    }

    return Array.from(days.entries())
        .sort((first, second) => first[1].date.getTime() - second[1].date.getTime())
        .map(([key, day]) => ({
            date: day.date,
            eventsCount: day.eventsCount,
            key,
            label: formatShortDay(day.date, locale, copy),
            slotsCount: day.slotsCount
        }));
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

function formatMonthLabel(value: Date, locale: string) {
    return new Intl.DateTimeFormat(toLanguageTag(locale), {month: "long", year: "numeric"}).format(value);
}

function formatShortDay(value: Date, locale: string, copy: Copy) {
    const date = new Intl.DateTimeFormat(toLanguageTag(locale), {day: "numeric", month: "short"}).format(value);
    const weekday = new Intl.DateTimeFormat(toLanguageTag(locale), {weekday: "short"}).format(value);
    return `${weekday}, ${date}${dateKey(value) === dateKey(new Date()) ? ` · ${copy.today}` : ""}`;
}

function dateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

function paymentPromptTitle(prompt: PaymentPrompt, locale: string) {
    if (prompt.title) return prompt.title;
    return locale === "en" && prompt.serviceTitleEn ? prompt.serviceTitleEn : prompt.serviceTitleUa ?? "";
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
        venueFallbackName: t("public.venueFallbackName"),
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
        showMore: t("public.showMore"),
        showLess: t("public.showLess"),
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
        guidedEyebrow: t("public.guidedEyebrow"),
        guidedTitle: t("public.guidedTitle"),
        guidedDescription: t("public.guidedDescription"),
        chooseOfficeTitle: t("public.chooseOfficeTitle"),
        chooseOfficeHint: t("public.chooseOfficeHint"),
        allOfficesHint: t("public.allOfficesHint"),
        chooseSpecialistTitle: t("public.chooseSpecialistTitle"),
        chooseSpecialistHint: t("public.chooseSpecialistHint"),
        allSpecialistsHint: t("public.allSpecialistsHint"),
        specialistAvailabilityHint: t("public.specialistAvailabilityHint"),
        noSpecialistsForFilters: t("public.noSpecialistsForFilters"),
        fixedEventServicesTitle: t("public.fixedEventServicesTitle"),
        fixedEventServicesHint: t("public.fixedEventServicesHint"),
        allEvents: t("public.allEvents"),
        allEventsHint: t("public.allEventsHint"),
        noEventServices: t("public.noEventServices"),
        chooseIndividualMode: t("public.chooseIndividualMode"),
        chooseEventMode: t("public.chooseEventMode"),
        availableDaysTitle: t("public.availableDaysTitle"),
        availableDaysHint: t("public.availableDaysHint"),
        noAvailableDays: t("public.noAvailableDays"),
        noAvailabilityDay: t("public.noAvailabilityDay"),
        previousMonth: t("public.previousMonth"),
        nextMonth: t("public.nextMonth"),
        nearestAvailable: (date: string) => t("public.nearestAvailable", {date}),
        selectedDayEmpty: t("public.selectedDayEmpty"),
        myBookings: t("public.myBookings"),
        days7: t("periods.days7"),
        days31: t("periods.days31"),
        nearestSlots: t("public.nearestSlots"),
        eventsCount: (count: number) => t("public.eventsCount", {count}),
        selectedSummary: t("public.selectedSummary"),
        details: t("public.details"),
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
        accountAction: t("public.accountAction"),
        dismissPayment: t("public.dismissPayment"),
        eventEnrolled: t("public.eventEnrolled"),
        eventCancelled: t("public.eventCancelled"),
        cancelEventError: t("public.cancelEventError"),
        bookingError: t("public.bookingError")
    };
}
