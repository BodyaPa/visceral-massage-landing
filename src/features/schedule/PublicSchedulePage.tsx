"use client";

import {useEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {createPortal} from "react-dom";
import {useLocale, useTranslations} from "next-intl";
import type {Locale} from "@/i18n";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCreateBookingMutation} from "@/features/bookings/bookings.api";
import {useListPublicOfficesQuery} from "@/features/offices/offices.api";
import {
    useCancelFixedEventEnrollmentMutation,
    useEnrollFixedEventMutation,
    useListFittingOptionsQuery,
    useListPublicAvailabilityQuery,
    useListPublicEventsQuery
} from "@/features/schedule/schedule.api";
import {
    addMonths,
    buildMonthPickerDays,
    buildMonthRange,
    buildSelectedDayItems,
    dateKey,
    filterScheduleEvents,
    startOfDay,
    slotKey,
    toId,
    uniqueSpecialists,
    type BookingModeFilter,
    type FilterState,
    type MonthPickerDay,
    type SpecialistOption,
    type StatusFilter
} from "@/features/schedule/publicScheduleHelpers";
import {useListServicesQuery} from "@/features/services/services.api";
import {useListMembershipOffersQuery, useListMyMembershipPurchasesQuery} from "@/features/memberships/memberships.api";
import {formatWholeCurrencyAmount as formatAmount} from "@/shared/lib/i18n/formatNumbers";
import {toLanguageTag} from "@/shared/lib/i18n/toLanguageTag";
import {withLocale} from "@/shared/lib/locale/withLocale";
import {resolveApiMediaUrl} from "@/shared/lib/media/resolveApiMediaUrl";
import {initialsFromName} from "@/shared/lib/text/initials";
import {useValidatePromoMutation} from "@/features/promos/promos.api";
import type {PromoValidation} from "@/types/promos";
import type {Office} from "@/types/offices";
import type {FittingServiceOption, PublicFixedEvent, PublicScheduleAvailabilityBlock} from "@/types/schedule";
import type {PublicService} from "@/types/services";
import type {MembershipOffer, MembershipPurchase} from "@/types/memberships";
import {useActivateLoyaltyVoucherMutation, useGetLoyaltyVouchersQuery} from "@/features/loyalty/loyalty.api";
import type {LoyaltyVoucher} from "@/types/loyalty";

const savedFiltersKey = "ataraksia.publicScheduleFilters";
type PendingBooking =
    | {type: "individual"; service: PublicService; slot: PublicScheduleAvailabilityBlock; fitting: FittingServiceOption}
    | {type: "event"; event: PublicFixedEvent};
type ChoiceSectionKey = "office" | "specialist";
type PaymentPrompt = {
    externalPaymentUrl: string | null;
    paidWithMembership?: boolean;
    paidWithLoyaltyVoucher?: boolean;
    serviceTitleUa?: string;
    serviceTitleEn?: string | null;
    title?: string;
    startsAt: string;
};

export default function PublicSchedulePage() {
    const locale = useLocale() as Locale;
    const t = useTranslations("calendar.page");
    const copy = labels(t);
    const toast = useToast();
    const [filters, setFilters] = useState<FilterState>({officeId: "", specialistId: "", mode: "all", status: "all", period: 31});
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [reminderOptIn, setReminderOptIn] = useState(false);
    const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
    const [selectedMembershipPurchaseId, setSelectedMembershipPurchaseId] = useState<number | "">("");
    const [selectedLoyaltyVoucherId, setSelectedLoyaltyVoucherId] = useState<number | "">("");
    const [promoCode, setPromoCode] = useState("");
    const [selectedEventDetails, setSelectedEventDetails] = useState<PublicFixedEvent | null>(null);
    const [slotForServiceChoice, setSlotForServiceChoice] = useState<PublicScheduleAvailabilityBlock | null>(null);
    const modalTriggerRef = useRef<HTMLElement | null>(null);
    const [paymentPrompt, setPaymentPrompt] = useState<PaymentPrompt | null>(null);
    const guidedRange = useMemo(() => buildMonthRange(currentDate), [currentDate]);

    const {data: officesData} = useListPublicOfficesQuery({size: 100});
    const {data: servicesData} = useListServicesQuery({lang: locale, size: 100});
    const {data: membershipOffers = []} = useListMembershipOffersQuery();
    const {data: myMembershipsData, refetch: refetchMemberships} = useListMyMembershipPurchasesQuery({size: 50});
    const {data: loyaltyVouchersData, refetch: refetchLoyaltyVouchers} = useGetLoyaltyVouchersQuery({page: 0, size: 100});
    const {data: guidedSlotsData = [], isError: slotsError, refetch: refetchSlots} = useListPublicAvailabilityQuery({
        from: guidedRange.from,
        to: guidedRange.to,
        officeId: filters.officeId,
        serviceId: "",
        specialistId: filters.specialistId
    });
    const {data: guidedEventsData = [], refetch: refetchEvents} = useListPublicEventsQuery({
        from: guidedRange.from,
        to: guidedRange.to,
        officeId: filters.officeId,
        serviceId: "",
        specialistId: filters.specialistId,
        lang: locale
    });
    const {data: specialistOptionSlotsData = []} = useListPublicAvailabilityQuery({
        from: guidedRange.from,
        to: guidedRange.to,
        officeId: filters.officeId,
        serviceId: "",
        specialistId: ""
    });
    const {data: specialistOptionEventsData = []} = useListPublicEventsQuery({
        from: guidedRange.from,
        to: guidedRange.to,
        officeId: filters.officeId,
        serviceId: "",
        specialistId: "",
        lang: locale
    });
    const [createBooking, {isLoading: bookingLoading}] = useCreateBookingMutation();
    const [enrollEvent, {isLoading: enrollmentLoading}] = useEnrollFixedEventMutation();
    const [cancelEventEnrollment, {isLoading: cancelEnrollmentLoading}] = useCancelFixedEventEnrollmentMutation();

    const offices = officesData?.content ?? [];
    const services = servicesData?.content ?? [];
    const myMemberships = myMembershipsData?.content ?? [];
    const individualServices = services.filter((service) => service.bookingMode === "INDIVIDUAL_APPOINTMENT");
    const guidedSlots = useMemo(() => (
        filters.mode === "events" || filters.status === "unavailable" || filters.status === "events" || filters.status === "mine" ? [] : guidedSlotsData
    ), [filters.mode, filters.status, guidedSlotsData]);
    const guidedEvents = useMemo(() => filterScheduleEvents(guidedEventsData, filters), [guidedEventsData, filters]);
    const specialistOptionSlots = filters.mode === "events" || filters.status === "unavailable" || filters.status === "events" || filters.status === "mine" ? [] : specialistOptionSlotsData;
    const specialistOptionEvents = filterScheduleEvents(specialistOptionEventsData, {...filters, specialistId: ""});
    const guidedSpecialists = uniqueSpecialists([...specialistOptionSlots, ...specialistOptionEvents]);
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

    function chooseIndividualMode() {
        setFilters((current) => ({...current, mode: "individual", status: "available"}));
        setCurrentDate(new Date());
    }

    function chooseEventMode() {
        setFilters((current) => ({...current, mode: "events", status: "events"}));
        setCurrentDate(new Date());
    }

    function chooseEvent(event: PublicFixedEvent) {
        rememberModalTrigger();
        setSelectedEventDetails(event);
    }

    function chooseSlot(slot: PublicScheduleAvailabilityBlock) {
        rememberModalTrigger();
        setSlotForServiceChoice(slot);
    }

    function rememberModalTrigger() {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement && !activeElement.closest('[role="dialog"]')) {
            modalTriggerRef.current = activeElement;
        }
    }

    async function confirmBooking() {
        if (!pendingBooking) return;
        try {
            if (pendingBooking.type === "individual") {
                const booking = await createBooking({
                    availabilityBlockId: pendingBooking.slot.id,
                    resourceId: pendingBooking.slot.resourceId,
                    serviceId: pendingBooking.service.id,
                    serviceVariantId: pendingBooking.fitting.variantId,
                    startsAt: pendingBooking.slot.startsAt,
                    reminderOptIn,
                    membershipPurchaseId: selectedMembershipPurchaseId === "" ? null : selectedMembershipPurchaseId,
                    loyaltyVoucherId: selectedLoyaltyVoucherId === "" ? null : selectedLoyaltyVoucherId,
                    promoCode: promoCode || null
                }).unwrap();
                toast.success(booking.paidWithMembership ? copy.bookingCreatedWithMembership : booking.paidWithLoyaltyVoucher ? copy.bookingCreatedWithVoucher : booking.externalPaymentUrl ? copy.bookingCreatedWithPayment : copy.bookingCreated);
                setPaymentPrompt(booking);
                void refetchSlots();
            } else {
                const event = await enrollEvent({
                    id: pendingBooking.event.id,
                    lang: locale,
                    reminderOptIn,
                    membershipPurchaseId: selectedMembershipPurchaseId === "" ? null : selectedMembershipPurchaseId,
                    loyaltyVoucherId: selectedLoyaltyVoucherId === "" ? null : selectedLoyaltyVoucherId,
                    promoCode: promoCode || null
                }).unwrap();
                toast.success(event.paidWithMembership ? copy.eventEnrolledWithMembership : event.paidWithLoyaltyVoucher ? copy.eventEnrolledWithVoucher : copy.eventEnrolled);
                setPaymentPrompt({externalPaymentUrl: event.externalPaymentUrl, paidWithMembership: event.paidWithMembership, paidWithLoyaltyVoucher: event.paidWithLoyaltyVoucher, title: pendingBooking.event.title, startsAt: pendingBooking.event.startsAt});
                void refetchEvents();
            }
            void refetchMemberships();
            void refetchLoyaltyVouchers();
            setPendingBooking(null);
            setSelectedEventDetails(null);
            setSelectedMembershipPurchaseId("");
            setSelectedLoyaltyVoucherId("");
            setPromoCode("");
            setReminderOptIn(false);
        } catch (error) {
            toast.error(apiMessage(error) ?? copy.bookingError);
            void refetchSlots();
            void refetchEvents();
        }
    }

    async function cancelSelectedEventEnrollment(event: PublicFixedEvent, reason: string) {
        try {
            await cancelEventEnrollment({id: event.id, lang: locale, reason}).unwrap();
            toast.success(copy.eventCancelled);
            setSelectedEventDetails(null);
            setFilters((current) => ({...current, mode: "events", status: "events"}));
            void refetchEvents();
        } catch {
            toast.error(copy.cancelEventError);
            void refetchEvents();
        }
    }

    return (
        <main className="mx-auto w-full max-w-[1440px] space-y-5 overflow-x-clip bg-stone-50 px-3 py-6 sm:px-6 lg:px-8 lg:py-10" id="public-page-content">
            <header className="mx-auto w-full max-w-[1040px] pb-1 lg:w-[72vw] xl:w-[58vw]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{copy.eyebrow}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">{copy.title}</h1>
                <p className="mt-2 text-sm leading-6 text-stone-600">{copy.subtitle}</p>
            </header>

            <GuidedBookingFlow
                availableDays={availableDays}
                copy={copy}
                currentDate={currentDate}
                events={selectedDayEvents}
                filters={filters}
                locale={locale}
                offices={offices}
                onChooseDate={(date) => {
                    setCurrentDate(date);
                }}
                onChooseOffice={(officeId) => updateFilter("officeId", officeId)}
                onChooseMonth={(date) => {
                    setCurrentDate(date);
                }}
                onResetFilters={() => {
                    setFilters({officeId: "", specialistId: "", mode: "all", status: "all", period: 31});
                    setCurrentDate(new Date());
                    setPaymentPrompt(null);
                }}
                onChooseSpecialist={(specialistId) => updateFilter("specialistId", specialistId)}
                onChooseEvent={chooseEvent}
                onEnrollEvent={(event) => {
                    rememberModalTrigger();
                    setPendingBooking({type: "event", event});
                }}
                onChooseEventMode={chooseEventMode}
                onChooseIndividualMode={chooseIndividualMode}
                onChooseSlot={chooseSlot}
                specialists={guidedSpecialists}
                slots={selectedDaySlots}
            />

            {slotsError ? <p className="mx-auto w-full max-w-[1040px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 lg:w-[72vw] xl:w-[58vw]">{copy.loadError}</p> : null}

            {paymentPrompt ? <PaymentResultModal copy={copy} locale={locale} onClose={() => setPaymentPrompt(null)} prompt={paymentPrompt} /> : null}

            {pendingBooking ? (
                <ConfirmationModal
                    copy={copy}
                    isSaving={isSaving}
                    locale={locale}
                    memberships={eligibleMembershipsForPending(pendingBooking, myMemberships, membershipOffers, locale)}
                    vouchers={eligibleVouchersForPending(pendingBooking, loyaltyVouchersData?.content ?? [])}
                    onClose={() => {
                        setPendingBooking(null);
                        setSelectedMembershipPurchaseId("");
                        setSelectedLoyaltyVoucherId("");
                        setPromoCode("");
                    }}
                    onConfirm={confirmBooking}
                    pending={pendingBooking}
                    returnFocusTo={modalTriggerRef.current}
                    reminderOptIn={reminderOptIn}
                    selectedMembershipPurchaseId={selectedMembershipPurchaseId}
                    setSelectedMembershipPurchaseId={setSelectedMembershipPurchaseId}
                    selectedLoyaltyVoucherId={selectedLoyaltyVoucherId}
                    setSelectedLoyaltyVoucherId={setSelectedLoyaltyVoucherId}
                    promoCode={promoCode}
                    setPromoCode={setPromoCode}
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
                    returnFocusTo={modalTriggerRef.current}
                />
            ) : null}
            {slotForServiceChoice ? (
                <ServiceChoiceModal
                    copy={copy}
                    locale={locale}
                    onClose={() => setSlotForServiceChoice(null)}
                    onSelect={(service, fitting) => {
                        const appointmentSlot = {...slotForServiceChoice, resourceId: fitting.resourceId, resourceName: fitting.resourceName, endsAt: fitting.endsAt};
                        setFilters((current) => ({...current, mode: "individual", status: "available"}));
                        setPendingBooking({type: "individual", service, slot: appointmentSlot, fitting});
                        setSlotForServiceChoice(null);
                    }}
                    services={individualServices}
                    slot={slotForServiceChoice}
                    returnFocusTo={modalTriggerRef.current}
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

function ChoiceFilterTrigger({
    active,
    state = "neutral",
    onToggle,
    open,
    summary,
    title
}: {
    active: boolean;
    state?: "neutral" | "active" | "empty";
    onToggle: () => void;
    open: boolean;
    summary: string;
    title: string;
}) {
    return (
        <button
            aria-expanded={open}
            className={filterTriggerClass(state, open)}
            onClick={onToggle}
            type="button"
        >
            <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                    <span className={state === "empty" ? "h-2 w-2 shrink-0 rounded-full bg-amber-500" : active ? "h-2 w-2 shrink-0 rounded-full bg-emerald-500" : "h-2 w-2 shrink-0 rounded-full bg-stone-300"} />
                    <span className="truncate text-xs font-semibold uppercase tracking-wide text-stone-700">{title}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs font-medium text-stone-950">{summary}</span>
            </span>
            <span className={open ? "shrink-0 rotate-180 text-sm font-semibold text-stone-500 transition-transform duration-200 motion-reduce:transition-none" : "shrink-0 text-sm font-semibold text-stone-500 transition-transform duration-200 motion-reduce:transition-none"}>
                v
            </span>
        </button>
    );
}

function AnimatedFilterPanel({children, open}: {children: ReactNode; open: boolean}) {
    return (
        <div className={open ? "grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none" : "grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"}>
            <div className="min-h-0 overflow-hidden">
                <div className={open ? "rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none" : "translate-y-[-0.25rem] rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"}>
                    {children}
                </div>
            </div>
        </div>
    );
}

function filterTriggerClass(state: "neutral" | "active" | "empty", open: boolean) {
    const base = "flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:border-stone-400 motion-reduce:transition-none";
    if (open) return `${base} border-stone-900 bg-white shadow-sm`;
    if (state === "empty") return `${base} border-amber-300 bg-amber-50/85`;
    if (state === "active") return `${base} border-emerald-200 bg-emerald-50/70`;
    return `${base} border-stone-200 bg-stone-50/80`;
}

function GuidedBookingFlow({
    availableDays,
    copy,
    currentDate,
    events,
    filters,
    locale,
    offices,
    onChooseDate,
    onChooseEvent,
    onEnrollEvent,
    onChooseEventMode,
    onChooseIndividualMode,
    onChooseOffice,
    onChooseMonth,
    onResetFilters,
    onChooseSpecialist,
    onChooseSlot,
    specialists,
    slots
}: {
    availableDays: AvailableDay[];
    copy: Copy;
    currentDate: Date;
    events: PublicFixedEvent[];
    filters: FilterState;
    locale: string;
    offices: Office[];
    onChooseDate: (date: Date) => void;
    onChooseEvent: (event: PublicFixedEvent) => void;
    onEnrollEvent: (event: PublicFixedEvent) => void;
    onChooseEventMode: () => void;
    onChooseIndividualMode: () => void;
    onChooseOffice: (officeId: number | "") => void;
    onChooseMonth: (date: Date) => void;
    onResetFilters: () => void;
    onChooseSpecialist: (specialistId: number | "") => void;
    onChooseSlot: (slot: PublicScheduleAvailabilityBlock) => void;
    specialists: SpecialistOption[];
    slots: PublicScheduleAvailabilityBlock[];
}) {
    const selectedKey = dateKey(currentDate);
    const [officesExpanded, setOfficesExpanded] = useState(false);
    const [specialistsExpanded, setSpecialistsExpanded] = useState(false);
    const [openSection, setOpenSection] = useState<ChoiceSectionKey | null>(null);
    const [renderedSection, setRenderedSection] = useState<ChoiceSectionKey | null>(null);
    const [visibleResultCount, setVisibleResultCount] = useState(10);
    const visibleDays = availableDays.slice(0, 14);
    const visibleOffices = officesExpanded ? offices : offices.slice(0, 3);
    const visibleSpecialists = specialistsExpanded ? specialists : specialists.slice(0, 5);
    const availableByDate = useMemo(() => new Map(availableDays.map((day) => [day.key, day])), [availableDays]);
    const monthDays = useMemo(() => buildMonthPickerDays(currentDate), [currentDate]);
    const nearestDay = availableDays.find((day) => day.date.getTime() >= startOfDay(new Date()).getTime()) ?? availableDays[0];
    const selectedOffice = filters.officeId === "" ? undefined : offices.find((office) => office.id === filters.officeId);
    const selectedSpecialist = filters.specialistId === "" ? undefined : specialists.find((specialist) => specialist.id === filters.specialistId);
    const selectedDayItems = useMemo(() => buildSelectedDayItems(slots, events), [events, slots]);
    const visibleSelectedDayItems = selectedDayItems.slice(0, visibleResultCount);
    const selectedDayCountLabel = availabilityCountLabel({slotsCount: slots.length, eventsCount: events.length}, copy);
    const totalAvailableSlots = availableDays.reduce((sum, day) => sum + day.slotsCount, 0);
    const totalAvailableEvents = availableDays.reduce((sum, day) => sum + day.eventsCount, 0);
    const selectedFilterChips = useMemo(() => guidedSelectionChips({
        copy,
        currentDate,
        filters,
        locale,
        offices,
        specialists
    }), [copy, currentDate, filters, locale, offices, specialists]);

    useEffect(() => {
        setVisibleResultCount(10);
    }, [selectedKey, filters.officeId, filters.specialistId, filters.mode]);

    useEffect(() => {
        if (openSection) {
            setRenderedSection(openSection);
            return;
        }
        const timeout = window.setTimeout(() => setRenderedSection(null), 300);
        return () => window.clearTimeout(timeout);
    }, [openSection]);

    function toggleSection(section: ChoiceSectionKey) {
        setOpenSection((current) => current === section ? null : section);
    }

    return (
        <section className="mx-auto w-full max-w-[1040px] rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5 lg:w-[72vw] lg:p-6 xl:w-[58vw]">
            <div className="grid gap-4">
                <div className="min-w-0 space-y-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{copy.guidedEyebrow}</p>
                        <h2 className="mt-2 text-xl font-semibold text-stone-950">{copy.guidedTitle}</h2>
                        <p className="mt-1 text-sm leading-6 text-stone-500">{copy.guidedDescription}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <button
                            aria-pressed={filters.mode === "individual"}
                            className={filters.mode === "individual" ? "min-h-24 rounded-xl border border-stone-900 bg-stone-900 p-4 text-left text-white shadow-sm outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none" : "min-h-24 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-stone-400 hover:bg-white hover:shadow-sm active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none"}
                            onClick={onChooseIndividualMode}
                            type="button"
                        >
                            <span className="block text-sm font-semibold">{copy.individual}</span>
                            <span className={filters.mode === "individual" ? "mt-1 block text-xs leading-5 text-stone-200" : "mt-1 block text-xs leading-5 text-stone-500"}>{copy.chooseIndividualMode}</span>
                        </button>
                        <button
                            aria-pressed={filters.mode === "events"}
                            className={filters.mode === "events" ? "min-h-24 rounded-xl border border-stone-900 bg-stone-900 p-4 text-left text-white shadow-sm outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none" : "min-h-24 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-stone-400 hover:bg-white hover:shadow-sm active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none"}
                            onClick={onChooseEventMode}
                            type="button"
                        >
                            <span className="block text-sm font-semibold">{copy.fixedEvent}</span>
                            <span className={filters.mode === "events" ? "mt-1 block text-xs leading-5 text-stone-200" : "mt-1 block text-xs leading-5 text-stone-500"}>{copy.chooseEventMode}</span>
                        </button>
                    </div>
                </div>
                <div className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <div className="mb-3 grid gap-2 lg:grid-cols-2">
                        <ChoiceFilterTrigger
                            active={filters.officeId !== ""}
                            open={openSection === "office"}
                            state={filterChoiceState(filters.officeId !== "", slots.length + events.length)}
                            summary={selectedOffice?.name ?? copy.allOffices}
                            title={copy.chooseOfficeTitle}
                            onToggle={() => toggleSection("office")}
                        />
                        <ChoiceFilterTrigger
                            active={filters.specialistId !== ""}
                            open={openSection === "specialist"}
                            state={filterChoiceState(filters.specialistId !== "", slots.length + events.length)}
                            summary={selectedSpecialist?.name ?? copy.allSpecialists}
                            title={copy.chooseSpecialistTitle}
                            onToggle={() => toggleSection("specialist")}
                        />
                    </div>
                    <div className="mb-3">
                        <AnimatedFilterPanel open={openSection !== null}>
                            {renderedSection === "office" ? (
                                <>
                                    <p className="text-xs leading-5 text-stone-500">{copy.chooseOfficeHint}</p>
                                    <div className="ataraksia-booking-enter mt-2 grid gap-2 sm:grid-cols-2">
                                        <button className={filters.officeId === "" ? "w-full rounded-xl border border-stone-900 bg-stone-900 p-3 text-left text-white" : "w-full rounded-xl border border-stone-200 bg-white p-3 text-left transition-colors hover:border-stone-400"} onClick={() => onChooseOffice("")} type="button">
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
                                </>
                            ) : null}
                            {renderedSection === "specialist" ? (
                                <>
                                    <p className="text-xs leading-5 text-stone-500">{copy.chooseSpecialistHint}</p>
                                    <div className="ataraksia-booking-enter mt-2 grid gap-2 sm:grid-cols-2">
                                        <button className={filters.specialistId === "" ? "w-full rounded-xl border border-stone-900 bg-stone-900 p-3 text-left text-white" : "w-full rounded-xl border border-stone-200 bg-white p-3 text-left transition-colors hover:border-stone-400"} onClick={() => onChooseSpecialist("")} type="button">
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
                                </>
                            ) : null}
                        </AnimatedFilterPanel>
                    </div>
                    <div className="mb-3 rounded-xl border border-stone-200 bg-white p-3">
                        <h3 className="text-sm font-semibold text-stone-950">{copy.selectedSummary}</h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {selectedFilterChips.map((chip) => (
                                <span className="max-w-full break-words rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700" key={chip}>{chip}</span>
                            ))}
                        </div>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-stone-950">{copy.availableDaysTitle}</h3>
                            <p className="mt-1 text-xs leading-5 text-stone-500">{copy.availableDaysHint}</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5">
                            {totalAvailableSlots > 0 || totalAvailableEvents === 0 ? <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-500">{copy.slotCount(totalAvailableSlots)}</span> : null}
                            {totalAvailableEvents > 0 ? <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-500">{copy.eventsCount(totalAvailableEvents)}</span> : null}
                        </div>
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
                                        aria-label={available ? `${day.day}. ${availabilityCountLabel(available, copy)}` : `${day.day}. ${copy.noAvailabilityDay}`}
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
                        <div className="ataraksia-booking-enter mt-3 flex gap-2 overflow-x-auto pb-1">
                            {visibleDays.map((day) => (
                                <button
                                    aria-pressed={day.key === selectedKey}
                                    className={day.key === selectedKey ? "min-h-16 min-w-28 rounded-xl border border-stone-900 bg-white px-3 py-2 text-left shadow-sm outline-none transition-[border-color,box-shadow,transform] duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none" : "min-h-16 min-w-28 rounded-xl border border-stone-200 bg-white px-3 py-2 text-left outline-none transition-[border-color,box-shadow,transform] duration-200 hover:border-stone-400 hover:shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none"}
                                    key={day.key}
                                    onClick={() => onChooseDate(day.date)}
                                    type="button"
                                >
                                    <span className="block text-sm font-semibold text-stone-950">{day.label}</span>
                                    <span className="mt-1 block text-xs text-stone-500">{availabilityCountLabel(day, copy)}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="ataraksia-booking-enter mt-3 rounded-xl border border-dashed border-stone-300 bg-white px-4 py-5 text-sm text-stone-500">
                            <p>{copy.noAvailableDays}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button className={compactButtonClass} onClick={onResetFilters} type="button">{copy.resetFilters}</button>
                                <button className={compactButtonClass} onClick={() => onChooseMonth(addMonths(currentDate, 1))} type="button">{copy.nextMonth}</button>
                            </div>
                        </div>
                    )}
                    {nearestDay && nearestDay.key !== selectedKey ? (
                        <button className="ataraksia-booking-enter mt-3 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-100" onClick={() => onChooseDate(nearestDay.date)} type="button">
                            {copy.nearestAvailable(formatDate(nearestDay.date.toISOString(), locale))}
                        </button>
                    ) : null}
                    <div className="mt-4 space-y-2">
                        {selectedDayItems.length > 0 ? (
                            <div className="ataraksia-booking-enter flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2">
                                <h3 className="break-words text-sm font-semibold text-stone-950">{formatDate(currentDate.toISOString(), locale)}</h3>
                                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600">{selectedDayCountLabel}</span>
                            </div>
                        ) : null}
                        {visibleSelectedDayItems.map((item) => item.type === "slot" ? (
                            <CompactOpenSlotRow copy={copy} key={slotKey(item.slot)} locale={locale} onChoose={() => onChooseSlot(item.slot)} slot={item.slot} />
                        ) : (
                            <CompactEventRow copy={copy} event={item.event} key={`event-${item.event.id}`} locale={locale} onDetails={() => onChooseEvent(item.event)} onEnroll={() => onEnrollEvent(item.event)} />
                        ))}
                        {selectedDayItems.length > visibleSelectedDayItems.length ? (
                            <button className="ataraksia-booking-enter w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100" onClick={() => setVisibleResultCount((current) => current + 10)} type="button">
                                {copy.showMore}
                            </button>
                        ) : null}
                        {selectedDayItems.length === 0 && visibleDays.length > 0 ? (
                            <div className="ataraksia-booking-enter rounded-xl border border-dashed border-stone-300 bg-white px-4 py-5 text-sm text-stone-500">
                                <p>{copy.selectedDayEmpty}</p>
                                <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{copy.selectedSummary}</p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {selectedFilterChips.map((chip) => (
                                            <span className="max-w-full break-words rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700" key={chip}>{chip}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {nearestDay ? (
                                        <button className={compactButtonClass} onClick={() => onChooseDate(nearestDay.date)} type="button">
                                            {copy.nearestAvailable(formatDate(nearestDay.date.toISOString(), locale))}
                                        </button>
                                    ) : null}
                                    <button className={compactButtonClass} onClick={onResetFilters} type="button">{copy.resetFilters}</button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
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
            <span className="flex min-w-0 items-start justify-between gap-3">
                <span className="flex min-w-0 items-start gap-2">
                    <SpecialistAvatar name={specialist.name} selected={selected} url={specialist.avatarMediaUrl} />
                    <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold">{specialist.name}</span>
                    <span className={selected ? "mt-1 block text-xs leading-5 text-stone-200" : "mt-1 block text-xs leading-5 text-stone-500"}>{copy.specialistAvailabilityHint}</span>
                    </span>
                </span>
                <span className={selected ? "shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-900" : "shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-stone-700"}>{selected ? copy.selected : copy.select}</span>
            </span>
        </button>
    );
}

function SpecialistAvatar({name, selected, url}: {name: string; selected: boolean; url: string | null}) {
    const initials = initialsFromName(name, "S");
    const className = selected
        ? "grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/30 bg-white text-xs font-semibold text-stone-900"
        : "grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-stone-200 bg-stone-100 text-xs font-semibold text-stone-600";
    if (url) {
        return <span aria-hidden className={className} style={{backgroundImage: `url(${resolveApiMediaUrl(url)})`, backgroundPosition: "center", backgroundSize: "cover"}} />;
    }
    return <span className={className}>{initials}</span>;
}

function CompactOpenSlotRow({copy, locale, onChoose, slot}: {copy: Copy; locale: string; onChoose: () => void; slot: PublicScheduleAvailabilityBlock}) {
    return (
        <article className="ataraksia-booking-enter w-full max-w-full rounded-xl border border-emerald-200 bg-emerald-50 p-3 transition-[border-color,box-shadow,transform] duration-200 hover:border-emerald-300 hover:shadow-sm motion-reduce:transition-none">
            <div className="flex min-w-0 items-start gap-3">
                <SpecialistAvatar name={slot.specialistName} selected={false} url={slot.specialistAvatarMediaUrl} />
                <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-stone-950">{formatDateTimeRange(slot.startsAt, slot.endsAt, locale)}</p>
                    <p className="mt-1 break-words text-xs text-stone-600">{slot.specialistName} · {slot.officeName ?? copy.withoutOffice}{slot.resourceName ? ` · ${slot.resourceName}` : ""}</p>
                </div>
            </div>
            <OfficeDetailsInline copy={copy} details={slot} />
            <button className="mt-3 min-h-11 w-full rounded-xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white outline-none transition-[background-color,box-shadow,transform] duration-200 hover:bg-stone-800 hover:shadow-sm active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 motion-reduce:transition-none" onClick={onChoose} type="button">{copy.chooseTime}</button>
        </article>
    );
}

function CompactEventRow({copy, event, locale, onDetails, onEnroll}: {copy: Copy; event: PublicFixedEvent; locale: string; onDetails: () => void; onEnroll: () => void}) {
    const canEnroll = !event.enrolled && !event.full && new Date(event.startsAt).getTime() > Date.now();
    return (
        <article className="ataraksia-booking-enter w-full max-w-full rounded-xl border border-stone-200 bg-stone-50 p-3 transition-[border-color,box-shadow,transform] duration-200 hover:border-stone-300 hover:shadow-sm motion-reduce:transition-none">
            <div className="flex min-w-0 items-start gap-3">
                <SpecialistAvatar name={event.specialistName} selected={false} url={event.specialistAvatarMediaUrl} />
                <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-stone-950">{event.title}</p>
                    <p className="mt-1 break-words text-xs text-stone-500">{event.specialistName} · {formatDateTimeRange(event.startsAt, event.endsAt, locale)}</p>
                </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <span className={event.full ? "rounded-full bg-red-50 px-2 py-1 text-red-700" : "rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"}>{event.enrolled ? copy.enrolled : event.full ? copy.full : copy.remaining(event.remainingPlaces)}</span>
                <span className="rounded-full bg-white px-2 py-1 text-stone-700">{formatAmount(event.price, locale)}</span>
                <span className="rounded-full bg-white px-2 py-1 text-stone-700">{event.officeName ?? copy.withoutOffice}</span>
            </div>
            <OfficeDetailsInline copy={copy} details={event} />
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <button className="min-h-11 w-full rounded-xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white outline-none transition-[background-color,box-shadow,transform] duration-200 hover:bg-stone-800 hover:shadow-sm active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none motion-reduce:transition-none" disabled={!canEnroll} onClick={onEnroll} type="button">
                    {event.enrolled ? copy.enrolled : event.full ? copy.full : copy.bookEvent}
                </button>
                <button className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 outline-none transition-[background-color,border-color,transform] duration-200 hover:border-stone-400 hover:bg-stone-100 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 sm:w-fit motion-reduce:transition-none" onClick={onDetails} type="button">{copy.details}</button>
            </div>
        </article>
    );
}

function OfficeDetailsInline({copy, details}: {copy: Copy; details: OfficeDetailsSource}) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const rows = [
        details.officeAddress,
        details.officeDirections,
        details.officePhotoMediaUrl,
        details.officeVideoMediaUrl,
        details.officeGoogleMapsUrl
    ].filter(Boolean);

    if (rows.length === 0) return null;

    return (
        <>
            <button
                className="mt-3 inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-xs font-semibold text-stone-700 outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-stone-400 hover:bg-stone-50 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 motion-reduce:transition-none"
                onClick={() => setOpen(true)}
                ref={triggerRef}
                type="button"
            >
                <span>{copy.officeDetails}</span>
                <span aria-hidden="true" className="text-base leading-none">→</span>
            </button>
            {open ? <OfficeDetailsModal copy={copy} details={details} onClose={() => setOpen(false)} returnFocusTo={triggerRef.current} /> : null}
        </>
    );
}

function OfficeDetailsModal({copy, details, onClose, returnFocusTo}: {copy: Copy; details: OfficeDetailsSource; onClose: () => void; returnFocusTo: HTMLElement | null}) {
    const dialogRef = useModalFocus(onClose, returnFocusTo);

    return createPortal(
        <div aria-labelledby="office-details-title" aria-modal="true" className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 px-3 py-3 backdrop-blur-[2px] sm:items-center sm:px-4 sm:py-6" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose()}} ref={dialogRef} role="dialog" tabIndex={-1}>
            <div className="ataraksia-booking-enter max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-5">
                <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Ataraksia</p>
                        <h2 className="mt-1 text-xl font-semibold text-stone-950" id="office-details-title">{copy.officeDetails}</h2>
                    </div>
                    <button className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 outline-none transition-colors hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2" onClick={onClose} type="button">{copy.close}</button>
                </div>
                <OfficeDetailsBlock compact copy={copy} details={details} />
            </div>
        </div>,
        document.body
    );
}

function EventDetailsModal({copy, event, isSaving, locale, onCancelEnrollment, onClose, onEnroll, returnFocusTo}: {copy: Copy; event: PublicFixedEvent; isSaving: boolean; locale: string; onCancelEnrollment: (event: PublicFixedEvent, reason: string) => void; onClose: () => void; onEnroll: (event: PublicFixedEvent) => void; returnFocusTo: HTMLElement | null}) {
    const [confirmingCancel, setConfirmingCancel] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const dialogRef = useModalFocus(onClose, returnFocusTo);
    const canCancel = event.enrolled && new Date(event.startsAt).getTime() >= Date.now() + 2 * 60 * 60 * 1000;
    const canEnroll = !event.enrolled && !event.full && new Date(event.startsAt).getTime() > Date.now();

    return (
        <div aria-labelledby="event-details-title" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose()}} ref={dialogRef} role="dialog" tabIndex={-1}>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{copy.fixedEvent}</p>
                        <h2 className="mt-1 break-words text-xl font-semibold text-stone-950" id="event-details-title">{event.title}</h2>
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
                {confirmingCancel ? (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3">
                        <p className="text-sm font-semibold text-red-900">{copy.cancelEnrollmentConfirmTitle}</p>
                        <p className="mt-1 break-words text-xs leading-5 text-red-800">{copy.cancelEnrollmentConfirmBody(event.title)}</p>
                        <select className="mt-3 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-red-500" onChange={(changeEvent) => setCancelReason(changeEvent.target.value)} value={cancelReason}>
                            <option value="">{copy.cancelReasonPlaceholder}</option>
                            <option value="PLANS_CHANGED">{copy.cancelReasonPlans}</option>
                            <option value="HEALTH">{copy.cancelReasonHealth}</option>
                            <option value="EMERGENCY">{copy.cancelReasonEmergency}</option>
                        </select>
                    </div>
                ) : null}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button className={secondaryButtonClass} disabled={isSaving} onClick={onClose} type="button">{copy.close}</button>
                    {canCancel ? (
                        confirmingCancel ? (
                            <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-200" disabled={isSaving || !cancelReason} onClick={() => onCancelEnrollment(event, cancelReason)} type="button">{copy.cancelEnrollmentConfirmAction}</button>
                        ) : (
                            <button className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-red-300" disabled={isSaving} onClick={() => setConfirmingCancel(true)} type="button">{copy.cancelEnrollment}</button>
                        )
                    ) : null}
                    {canEnroll ? <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={isSaving} onClick={() => onEnroll(event)} type="button">{copy.bookEvent}</button> : null}
                </div>
            </div>
        </div>
    );
}

function PaymentResultModal({copy, locale, onClose, prompt}: {copy: Copy; locale: Locale; onClose: () => void; prompt: PaymentPrompt}) {
    const dialogRef = useModalFocus(onClose, null);
    const covered = prompt.paidWithMembership || prompt.paidWithLoyaltyVoucher;
    const title = prompt.paidWithMembership ? copy.membershipPaymentTitle : prompt.paidWithLoyaltyVoucher ? copy.voucherPaymentTitle : copy.paymentTitle;
    const body = prompt.paidWithMembership
        ? copy.membershipPaymentBody(paymentPromptTitle(prompt, locale), formatDateTime(prompt.startsAt, locale))
        : prompt.paidWithLoyaltyVoucher
        ? copy.voucherPaymentBody(paymentPromptTitle(prompt, locale), formatDateTime(prompt.startsAt, locale))
        : copy.paymentBody(paymentPromptTitle(prompt, locale), formatDateTime(prompt.startsAt, locale));

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section aria-labelledby="booking-result-title" aria-modal="true" className="w-full rounded-t-2xl border border-stone-200 bg-white p-4 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6" ref={dialogRef} role="dialog" tabIndex={-1}>
                <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Ataraksia</p>
                        <h2 className="mt-1 break-words text-xl font-semibold text-stone-950" id="booking-result-title">{title}</h2>
                    </div>
                    <button aria-label={copy.close} className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900" onClick={onClose} type="button">×</button>
                </div>
                <p className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${covered ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>{body}</p>
                {!covered && !prompt.externalPaymentUrl ? <p className="mt-3 text-sm leading-6 text-stone-600">{copy.paymentNoLink}</p> : null}
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {!covered && prompt.externalPaymentUrl ? <a className="inline-flex min-h-11 items-center justify-center rounded-lg bg-stone-950 px-4 py-2 text-center text-sm font-semibold text-white outline-none transition-[background-color,box-shadow,transform] hover:bg-stone-800 hover:shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2 motion-reduce:transition-none" href={prompt.externalPaymentUrl} rel="noreferrer" target="_blank">{copy.paymentAction}</a> : null}
                    <a className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-center text-sm font-semibold text-stone-800 outline-none transition-colors hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2" href={withLocale("/account/bookings", locale)}>{copy.accountAction}</a>
                    <button className="min-h-11 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 outline-none transition-colors hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 sm:col-span-2" onClick={onClose} type="button">{copy.dismissPayment}</button>
                </div>
            </section>
        </div>,
        document.body
    );
}

function ConfirmationModal({
    copy,
    isSaving,
    locale,
    memberships,
    vouchers,
    onClose,
    onConfirm,
    pending,
    reminderOptIn,
    returnFocusTo,
    selectedMembershipPurchaseId,
    setSelectedMembershipPurchaseId,
    selectedLoyaltyVoucherId,
    setSelectedLoyaltyVoucherId,
    promoCode,
    setPromoCode,
    setReminderOptIn
}: {
    copy: Copy;
    isSaving: boolean;
    locale: string;
    memberships: MembershipUsageOption[];
    vouchers: LoyaltyVoucher[];
    onClose: () => void;
    onConfirm: () => void;
    pending: PendingBooking;
    reminderOptIn: boolean;
    returnFocusTo: HTMLElement | null;
    selectedMembershipPurchaseId: number | "";
    setSelectedMembershipPurchaseId: (value: number | "") => void;
    selectedLoyaltyVoucherId: number | "";
    setSelectedLoyaltyVoucherId: (value: number | "") => void;
    promoCode: string;
    setPromoCode: (value: string) => void;
    setReminderOptIn: (value: boolean) => void;
}) {
    const [acknowledged, setAcknowledged] = useState(false);
    const [promoResult, setPromoResult] = useState<PromoValidation | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [activatedVoucher, setActivatedVoucher] = useState<LoyaltyVoucher | null>(null);
    const [codeSuccess, setCodeSuccess] = useState<string | null>(null);
    const [validatePromo, {isLoading: validatingPromo}] = useValidatePromoMutation();
    const [activateVoucher, {isLoading: activatingVoucher}] = useActivateLoyaltyVoucherMutation();
    const dialogRef = useModalFocus(onClose, returnFocusTo);
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
    const usableVouchers = activatedVoucher && !vouchers.some((voucher) => voucher.id === activatedVoucher.id)
        ? [activatedVoucher, ...vouchers]
        : vouchers;
    const selectedMembership = memberships.find((membership) => membership.id === selectedMembershipPurchaseId);
    const selectedVoucher = usableVouchers.find((voucher) => voucher.id === selectedLoyaltyVoucherId);
    const applyingCode = validatingPromo || activatingVoucher;

    async function applyCode() {
        setPromoResult(null);
        setPromoError(null);
        setCodeSuccess(null);
        try {
            const result = await validatePromo({
                code: promoCode,
                targetType: pending.type === "individual" ? "SERVICE" : "EVENT",
                targetId: pending.type === "individual" ? pending.service.id : pending.event.id
            }).unwrap();
            setPromoResult(result);
            setSelectedMembershipPurchaseId("");
            setSelectedLoyaltyVoucherId("");
            setActivatedVoucher(null);
            return;
        } catch (error) {
            if (isPromoScopeError(error)) {
                setPromoError(promoValidationMessage(error, copy));
                return;
            }
        }

        try {
            const voucher = await activateVoucher(promoCode).unwrap();
            const eligible = eligibleVouchersForPending(pending, [voucher]).length > 0;
            setPromoCode("");
            setSelectedMembershipPurchaseId("");
            if (eligible) {
                setActivatedVoucher(voucher);
                setSelectedLoyaltyVoucherId(voucher.id);
                setCodeSuccess(copy.giftCodeActivated);
            } else {
                setActivatedVoucher(null);
                setSelectedLoyaltyVoucherId("");
                setCodeSuccess(copy.giftCodeActivatedNotEligible);
            }
        } catch {
            setPromoError(copy.codeInvalid);
        }
    }

    return (
        <div aria-labelledby="booking-confirmation-title" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose()}} ref={dialogRef} role="dialog" tabIndex={-1}>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5">
                <h2 className="break-words text-xl font-semibold text-stone-950" id="booking-confirmation-title">{pending.type === "individual" ? copy.confirmAppointment : copy.confirmEvent}</h2>
                <dl className="mt-5 space-y-3 text-sm">
                    <InfoRow label={copy.service} value={title} />
                    <InfoRow label={copy.specialist} value={specialist} />
                    <InfoRow label={copy.office} value={office ?? copy.withoutOffice} />
                    <InfoRow label={copy.time} value={formatDateTimeRange(startsAt, endsAt, locale)} />
                    <InfoRow label={copy.price} value={formatAmount(price, locale)} />
                    {capacity ? <InfoRow label={copy.places} value={capacity} /> : null}
                </dl>
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-950">{copy.reviewStepTitle}</p>
                    <p className="mt-1 text-xs leading-5 text-amber-900">{selectedMembership ? copy.membershipManualNote : selectedVoucher ? copy.voucherManualNote : copy.paymentManualNote}</p>
                </div>
                <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <label className="block text-sm font-semibold text-stone-900" htmlFor="membership-use">{copy.membershipUseTitle}</label>
                    <p className="mt-1 text-xs leading-5 text-stone-500">{memberships.length > 0 ? copy.membershipUseHint : copy.membershipUseEmpty}</p>
                    {memberships.length > 0 ? (
                        <select
                            className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors focus:border-stone-900"
                            id="membership-use"
                            onChange={(event) => {setSelectedMembershipPurchaseId(event.target.value ? Number(event.target.value) : "");setSelectedLoyaltyVoucherId("");setPromoCode("");setPromoResult(null);setPromoError(null)}}
                            value={selectedMembershipPurchaseId}
                        >
                            <option value="">{copy.membershipDoNotUse}</option>
                            {memberships.map((membership) => (
                                <option key={membership.id} value={membership.id}>
                                    {membership.title} · {copy.membershipVisits(membership.visitsRemaining)}
                                </option>
                            ))}
                        </select>
                    ) : null}
                    {selectedMembership ? <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">{copy.membershipWillUse(selectedMembership.title)}</p> : null}
                </div>
                <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <label className="block text-sm font-semibold text-stone-900" htmlFor="loyalty-voucher-use">{copy.loyaltyVoucherTitle}</label>
                    <p className="mt-1 text-xs leading-5 text-stone-500">{vouchers.length > 0 ? copy.loyaltyVoucherHint : copy.loyaltyVoucherEmpty}</p>
                    {usableVouchers.length > 0 ? <select className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900" id="loyalty-voucher-use" onChange={(event) => {setSelectedLoyaltyVoucherId(event.target.value ? Number(event.target.value) : "");setSelectedMembershipPurchaseId("");setPromoCode("");setPromoResult(null);setPromoError(null);setCodeSuccess(null)}} value={selectedLoyaltyVoucherId}><option value="">{copy.loyaltyVoucherDoNotUse}</option>{usableVouchers.map((voucher) => <option key={voucher.id} value={voucher.id}>{locale === "en" && voucher.titleEn ? voucher.titleEn : voucher.titleUa}</option>)}</select> : null}
                    {selectedVoucher ? <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">{copy.loyaltyVoucherWillUse}</p> : null}
                </div>
                <div className="mt-4 rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <label className="block text-sm font-semibold text-stone-900" htmlFor="promo-code">{copy.codeTitle}</label>
                    <p className="mt-1 text-xs leading-5 text-stone-500">{copy.codeHint}</p>
                    <div className="mt-2 flex gap-2"><input className="min-h-11 min-w-0 flex-1 rounded-lg border border-stone-300 px-3 text-sm uppercase outline-none focus:border-stone-950" disabled={selectedMembershipPurchaseId!==""||selectedLoyaltyVoucherId!==""} id="promo-code" onChange={e=>{setPromoCode(e.target.value.toUpperCase());setPromoResult(null);setPromoError(null);setCodeSuccess(null)}} placeholder={copy.codePlaceholder} value={promoCode}/><button className="min-h-11 rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300" disabled={!promoCode.trim()||applyingCode||selectedMembershipPurchaseId!==""||selectedLoyaltyVoucherId!==""} onClick={()=>void applyCode()} type="button">{applyingCode?copy.codeChecking:copy.codeApply}</button></div>
                    {promoResult?<div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"><strong>{promoResult.discountPercent}%</strong> · <s>{formatAmount(promoResult.originalPrice,locale)}</s> → {formatAmount(promoResult.finalPrice,locale)}{promoResult.remainingUserUses!==null?<span className="block text-xs">{copy.promoRemaining(promoResult.remainingUserUses)}</span>:null}</div>:null}
                    {codeSuccess?<p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium leading-5 text-emerald-900">{codeSuccess}</p>:null}
                    {promoError?<p className="mt-2 text-xs font-medium text-red-700">{promoError}</p>:null}
                    {selectedMembershipPurchaseId!==""||selectedLoyaltyVoucherId!==""?<p className="mt-2 text-xs text-stone-500">{copy.codeBenefitExclusive}</p>:null}
                </div>
                <OfficeDetailsBlock copy={copy} details={officeDetails} />
                <label className="mt-5 flex min-w-0 gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    <input checked={reminderOptIn} className="mt-0.5 h-4 w-4 accent-stone-900" onChange={(event) => setReminderOptIn(event.target.checked)} type="checkbox" />
                    <span className="min-w-0"><strong className="block break-words font-medium text-stone-900">{copy.reminder}</strong><span className="mt-0.5 block break-words text-xs leading-5 text-stone-500">{copy.reminderHint}</span></span>
                </label>
                <label className="mt-3 flex min-w-0 gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
                    <input checked={acknowledged} className="mt-0.5 h-4 w-4 accent-stone-900" onChange={(event) => setAcknowledged(event.target.checked)} type="checkbox" />
                    <span className="min-w-0"><strong className="block break-words font-medium text-stone-900">{copy.confirmUnderstand}</strong><span className="mt-0.5 block break-words text-xs leading-5 text-stone-500">{selectedMembership ? copy.confirmUnderstandMembershipHint : selectedVoucher ? copy.confirmUnderstandVoucherHint : copy.confirmUnderstandPaymentHint}</span></span>
                </label>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button className={secondaryButtonClass} disabled={isSaving} onClick={onClose} type="button">{copy.cancel}</button>
                    <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300" disabled={isSaving || !acknowledged} onClick={onConfirm} type="button">{isSaving ? copy.saving : pending.type === "individual" ? copy.confirmAppointment : copy.confirmParticipation}</button>
                </div>
            </div>
        </div>
    );
}

type MembershipUsageOption = {
    id: number;
    title: string;
    visitsRemaining: number;
};

function eligibleMembershipsForPending(pending: PendingBooking, purchases: MembershipPurchase[], offers: MembershipOffer[], locale: string): MembershipUsageOption[] {
    const serviceId = pending.type === "individual" ? pending.service.id : pending.event.serviceId;
    const offerById = new Map(offers.map((offer) => [offer.id, offer]));
    const now = Date.now();

    return purchases
        .filter((purchase) => {
            if (purchase.status !== "ACTIVE") return false;
            if (purchase.visitsRemaining == null || purchase.visitsRemaining <= 0) return false;
            if (purchase.expiresAt && new Date(purchase.expiresAt).getTime() <= now) return false;
            const offer = offerById.get(purchase.offerId);
            return Boolean(offer?.eligibleServiceIds.includes(serviceId));
        })
        .map((purchase) => ({
            id: purchase.id,
            title: localeTitle(purchase.titleUa, purchase.titleEn, locale),
            visitsRemaining: purchase.visitsRemaining ?? 0
        }));
}

function eligibleVouchersForPending(pending: PendingBooking, vouchers: LoyaltyVoucher[]) {
    const serviceId = pending.type === "individual" ? pending.service.id : pending.event.serviceId;
    const eventId = pending.type === "event" ? pending.event.id : null;
    const now = Date.now();
    return vouchers.filter((voucher) => {
        if (voucher.status !== "ACTIVE" || !voucher.ownedByCurrentUser || (voucher.expiresAt && new Date(voucher.expiresAt).getTime() <= now)) return false;
        if (voucher.eligibleServiceIds.length > 0 && !voucher.eligibleServiceIds.includes(serviceId)) return false;
        if (voucher.eligibleEventIds.length > 0 && (eventId === null || !voucher.eligibleEventIds.includes(eventId))) return false;
        return true;
    });
}

function localeTitle(titleUa: string, titleEn: string, locale: string) {
    return locale === "en" ? titleEn || titleUa : titleUa || titleEn;
}

function ServiceChoiceModal({copy, locale, onClose, onSelect, returnFocusTo, services, slot}: {copy: Copy; locale: Locale; onClose: () => void; onSelect: (service: PublicService, fitting: FittingServiceOption) => void; returnFocusTo: HTMLElement | null; services: PublicService[]; slot: PublicScheduleAvailabilityBlock}) {
    const {data: fittingOptions = [], isError, isFetching} = useListFittingOptionsQuery({
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        officeId: slot.officeId ?? 0,
        specialistId: slot.specialistId,
        resourceId: slot.resourceId ?? undefined,
        lang: locale
    }, {skip: slot.officeId === null});
    const serviceById = new Map(services.map((service) => [service.id, service]));
    const dialogRef = useModalFocus(onClose, returnFocusTo);

    return (
        <div aria-labelledby="service-choice-title" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 py-4 sm:items-center sm:px-4 sm:py-6" onMouseDown={(event) => {if (event.target === event.currentTarget) onClose()}} ref={dialogRef} role="dialog" tabIndex={-1}>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-5">
                <h2 className="break-words text-xl font-semibold text-stone-950" id="service-choice-title">{copy.chooseServiceForTime}</h2>
                <p className="mt-2 break-words text-sm leading-6 text-stone-500">{formatDateTimeRange(slot.startsAt, slot.endsAt, locale)} · {slot.specialistName} · {slot.officeName ?? copy.withoutOffice}</p>
                {isFetching ? <p className="mt-4 text-sm text-stone-500">{copy.loading}</p> : null}
                {!isFetching && isError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">{copy.fittingOptionsError}</p> : null}
                {!isFetching && !isError && fittingOptions.length === 0 ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">{copy.noFittingOptions}</p> : null}
                <div className="mt-5 space-y-2">
                    {fittingOptions.map((fitting) => {
                        const service = serviceById.get(fitting.serviceId);
                        if (!service) return null;
                        return (
                            <button className="block w-full max-w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-left transition-colors hover:border-stone-400 hover:bg-white" key={`${fitting.variantId}-${fitting.specialistId}-${fitting.resourceId}`} onClick={() => onSelect(service, fitting)} type="button">
                                <span className="block break-words text-sm font-semibold text-stone-950">{service.title} · {fitting.variantName}</span>
                                <span className="mt-1 block break-words text-xs text-stone-500">{copy.minutes(fitting.durationMinutes)} · {formatAmount(fitting.price, locale)} · {fitting.resourceName}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-6 flex justify-end">
                    <button className={secondaryButtonClass} onClick={onClose} type="button">{copy.cancel}</button>
                </div>
            </div>
        </div>
    );
}

function useModalFocus(onClose: () => void, returnFocusTo: HTMLElement | null) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    const returnFocusRef = useRef(returnFocusTo);
    onCloseRef.current = onClose;
    returnFocusRef.current = returnFocusTo;

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const focusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"
        )).filter((element) => !element.hasAttribute("hidden"));
        const initialFocus = focusableElements()[0] ?? dialog;
        initialFocus.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onCloseRef.current();
                return;
            }

            if (event.key !== "Tab") return;

            const elements = focusableElements();
            if (elements.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const first = elements[0];
            const last = elements[elements.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        dialog.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            dialog.removeEventListener("keydown", handleKeyDown);
            if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
        };
    }, []);

    return dialogRef;
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

function weekdayLabels(locale: string) {
    const monday = new Date(2024, 0, 1);
    return Array.from({length: 7}, (_, index) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + index);
        return new Intl.DateTimeFormat(toLanguageTag(locale), {weekday: "short"}).format(day);
    });
}

function monthDayClass(day: MonthPickerDay, available: boolean, selected: boolean) {
    const base = "min-h-12 rounded-lg border px-1 py-2 transition-[border-color,background-color,box-shadow,color,transform] duration-200 motion-reduce:transition-none";
    if (!day.inCurrentMonth) return `${base} border-transparent text-stone-300 opacity-40`;
    if (selected) return `${base} border-stone-900 bg-stone-900 text-white shadow-sm`;
    if (available) return `${base} border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-400 hover:bg-emerald-100`;
    return `${base} cursor-not-allowed border-stone-100 bg-stone-50 text-stone-400`;
}

function filterChoiceState(active: boolean, resultCount: number): "neutral" | "active" | "empty" {
    if (!active) return "neutral";
    return resultCount > 0 ? "active" : "empty";
}

function guidedSelectionChips({
    copy,
    currentDate,
    filters,
    locale,
    offices,
    specialists
}: {
    copy: Copy;
    currentDate: Date;
    filters: FilterState;
    locale: string;
    offices: Office[];
    specialists: SpecialistOption[];
}) {
    const office = filters.officeId === "" ? copy.allOffices : offices.find((item) => item.id === filters.officeId)?.name ?? copy.allOffices;
    const mode = filters.mode === "events" ? copy.fixedEvent : filters.mode === "individual" ? copy.individual : copy.all;
    const specialist = filters.specialistId === "" ? copy.allSpecialists : specialists.find((item) => item.id === filters.specialistId)?.name ?? copy.allSpecialists;
    return [office, mode, specialist, formatDate(currentDate.toISOString(), locale)];
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

function availabilityCountLabel(day: Pick<AvailableDay, "eventsCount" | "slotsCount">, copy: Copy) {
    const parts = [];
    if (day.slotsCount > 0) parts.push(copy.slotCount(day.slotsCount));
    if (day.eventsCount > 0) parts.push(copy.eventsCount(day.eventsCount));
    return parts.join(" · ");
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
        specialistId: toId(params.get("specialistId") ?? ""),
        mode: (params.get("mode") as BookingModeFilter) || "all",
        status: (params.get("status") as StatusFilter) || "all",
        period: params.get("period") === "31" ? 31 : 7
    };
}

function writeFiltersToUrl(filters: FilterState) {
    const params = new URLSearchParams();
    if (filters.officeId !== "") params.set("officeId", String(filters.officeId));
    if (filters.specialistId !== "") params.set("specialistId", String(filters.specialistId));
    if (filters.mode !== "all") params.set("mode", filters.mode);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.period !== 31) params.set("period", String(filters.period));
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
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

function promoValidationMessage(error: unknown, copy: Copy) {
    const data = typeof error === "object" && error !== null && "data" in error
        ? (error as {data?: {message?: unknown}}).data
        : null;
    const message = typeof data?.message === "string" ? data.message : "";
    const separator = message.indexOf(":");
    if ((message.startsWith("PROMO_SCOPE_SERVICE:") || message.startsWith("PROMO_SCOPE_EVENT:")) && separator >= 0) {
        return copy.promoScope(message.slice(separator + 1));
    }
    return copy.promoInvalid;
}

function isPromoScopeError(error: unknown) {
    const data = typeof error === "object" && error !== null && "data" in error
        ? (error as {data?: {message?: unknown}}).data
        : null;
    const message = typeof data?.message === "string" ? data.message : "";
    return message.startsWith("PROMO_SCOPE_SERVICE:") || message.startsWith("PROMO_SCOPE_EVENT:");
}

function apiMessage(error: unknown) {
    const data = typeof error === "object" && error !== null && "data" in error
        ? (error as {data?: {message?: unknown}}).data
        : null;
    return typeof data?.message === "string" && data.message.trim() ? data.message : null;
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
        noFittingOptions: t("public.noFittingOptions"),
        fittingOptionsError: t("public.fittingOptionsError"),
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
        reviewStepTitle: t("public.reviewStepTitle"),
        paymentManualNote: t("public.paymentManualNote"),
        membershipManualNote: t("public.membershipManualNote"),
        voucherManualNote: t("public.voucherManualNote"),
        confirmUnderstand: t("public.confirmUnderstand"),
        confirmUnderstandPaymentHint: t("public.confirmUnderstandPaymentHint"),
        confirmUnderstandMembershipHint: t("public.confirmUnderstandMembershipHint"),
        confirmUnderstandVoucherHint: t("public.confirmUnderstandVoucherHint"),
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
        bookingAction: t("booking.action"),
        cancel: t("public.cancel"),
        close: t("public.close"),
        cancelEnrollment: t("public.cancelEnrollment"),
        cancelEnrollmentConfirmTitle: t("public.cancelEnrollmentConfirmTitle"),
        cancelEnrollmentConfirmBody: (title: string) => t("public.cancelEnrollmentConfirmBody", {title}),
        cancelEnrollmentConfirmAction: t("public.cancelEnrollmentConfirmAction"),
        cancelReasonPlaceholder: t("public.cancelReasonPlaceholder"),
        cancelReasonPlans: t("public.cancelReasonPlans"),
        cancelReasonHealth: t("public.cancelReasonHealth"),
        cancelReasonEmergency: t("public.cancelReasonEmergency"),
        saving: t("public.saving"),
        bookingCreated: t("booking.created"),
        bookingCreatedWithPayment: t("booking.createdWithPayment"),
        bookingCreatedWithMembership: t("booking.createdWithMembership"),
        bookingCreatedWithVoucher: t("booking.createdWithVoucher"),
        paymentTitle: t("public.paymentTitle"),
        paymentBody: (service: string, startsAt: string) => t("public.paymentBody", {service, startsAt}),
        membershipPaymentTitle: t("public.membershipPaymentTitle"),
        membershipPaymentBody: (service: string, startsAt: string) => t("public.membershipPaymentBody", {service, startsAt}),
        voucherPaymentTitle: t("public.voucherPaymentTitle"),
        voucherPaymentBody: (service: string, startsAt: string) => t("public.voucherPaymentBody", {service, startsAt}),
        paymentAction: t("public.paymentAction"),
        paymentNoLink: t("public.paymentNoLink"),
        accountAction: t("public.accountAction"),
        dismissPayment: t("public.dismissPayment"),
        eventEnrolled: t("public.eventEnrolled"),
        eventEnrolledWithMembership: t("public.eventEnrolledWithMembership"),
        eventEnrolledWithVoucher: t("public.eventEnrolledWithVoucher"),
        eventCancelled: t("public.eventCancelled"),
        cancelEventError: t("public.cancelEventError"),
        bookingError: t("public.bookingError"),
        membershipUseTitle: t("public.membershipUseTitle"),
        membershipUseHint: t("public.membershipUseHint"),
        membershipUseEmpty: t("public.membershipUseEmpty"),
        membershipDoNotUse: t("public.membershipDoNotUse"),
        membershipVisits: (count: number) => t("public.membershipVisits", {count}),
        membershipWillUse: (title: string) => t("public.membershipWillUse", {title}),
        loyaltyVoucherTitle: t("public.loyaltyVoucherTitle"),
        loyaltyVoucherHint: t("public.loyaltyVoucherHint"),
        loyaltyVoucherEmpty: t("public.loyaltyVoucherEmpty"),
        loyaltyVoucherDoNotUse: t("public.loyaltyVoucherDoNotUse"),
        loyaltyVoucherWillUse: t("public.loyaltyVoucherWillUse"),
        codeTitle: t("public.codeTitle"),
        codeHint: t("public.codeHint"),
        codePlaceholder: t("public.codePlaceholder"),
        codeApply: t("public.codeApply"),
        codeChecking: t("public.codeChecking"),
        codeInvalid: t("public.codeInvalid"),
        giftCodeActivated: t("public.giftCodeActivated"),
        giftCodeActivatedNotEligible: t("public.giftCodeActivatedNotEligible"),
        codeBenefitExclusive: t("public.codeBenefitExclusive"),
        promoTitle: t("public.promoTitle"),
        promoPlaceholder: t("public.promoPlaceholder"),
        promoApply: t("public.promoApply"),
        promoChecking: t("public.promoChecking"),
        promoInvalid: t("public.promoInvalid"),
        promoScope: (targets: string) => t("public.promoScope", {targets}),
        promoMembershipExclusive: t("public.promoMembershipExclusive"),
        promoRemaining: (count: number) => t("public.promoRemaining", {count})
    };
}
