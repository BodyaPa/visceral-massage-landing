"use client";

import {useMemo} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {useCancelBookingMutation, useListMyBookingsQuery} from "@/features/bookings/bookings.api";
import {useCancelFixedEventEnrollmentMutation, useListMyFixedEventEnrollmentsQuery} from "@/features/schedule/schedule.api";
import type {Locale} from "@/i18n";
import type {Booking} from "@/types/bookings";
import type {PublicFixedEvent} from "@/types/schedule";

export default function AccountBookingsPanel({locale}: {locale: Locale}) {
    const t = useTranslations("accountPage.bookings");
    const copy = labels(t);
    const toast = useToast();
    const range = useMemo(() => buildAccountRange(), []);
    const {data: bookingsData, isFetching: bookingsFetching, isError: bookingsError} = useListMyBookingsQuery({page: 0, size: 10});
    const {data: events = [], isFetching: eventsFetching, isError: eventsError} = useListMyFixedEventEnrollmentsQuery({...range, lang: locale});
    const [cancelBooking, {isLoading: cancellingBooking}] = useCancelBookingMutation();
    const [cancelEnrollment, {isLoading: cancellingEnrollment}] = useCancelFixedEventEnrollmentMutation();
    const bookings = bookingsData?.content ?? [];

    async function cancelAppointment(id: number) {
        try {
            await cancelBooking(id).unwrap();
            toast.success(copy.cancelled);
        } catch {
            toast.error(copy.cancelError);
        }
    }

    async function cancelEvent(id: number) {
        try {
            await cancelEnrollment({id, lang: locale}).unwrap();
            toast.success(copy.cancelled);
        } catch {
            toast.error(copy.cancelError);
        }
    }

    return (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-col gap-1 border-b border-stone-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{copy.title}</h2>
                    <p className="mt-1 text-sm text-stone-600">{copy.body}</p>
                </div>
                {(bookingsFetching || eventsFetching) ? <span className="text-xs font-medium text-stone-500">{copy.loading}</span> : null}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <BookingList bookings={bookings} cancelling={cancellingBooking} copy={copy} isError={bookingsError} locale={locale} onCancel={cancelAppointment} />
                <EventList cancelling={cancellingEnrollment} copy={copy} events={events} isError={eventsError} locale={locale} onCancel={cancelEvent} />
            </div>
        </section>
    );
}

function BookingList({bookings, cancelling, copy, isError, locale, onCancel}: {bookings: Booking[]; cancelling: boolean; copy: Copy; isError: boolean; locale: Locale; onCancel: (id: number) => void}) {
    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-950">{copy.appointments}</h3>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">{bookings.length}</span>
            </div>
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copy.loadError}</p> : null}
            <div className="mt-3 space-y-2">
                {bookings.map((booking) => <BookingCard booking={booking} cancelling={cancelling} copy={copy} key={booking.id} locale={locale} onCancel={onCancel} />)}
                {bookings.length === 0 && !isError ? <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">{copy.noAppointments}</p> : null}
            </div>
        </div>
    );
}

function EventList({cancelling, copy, events, isError, locale, onCancel}: {cancelling: boolean; copy: Copy; events: PublicFixedEvent[]; isError: boolean; locale: Locale; onCancel: (id: number) => void}) {
    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-950">{copy.events}</h3>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">{events.length}</span>
            </div>
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copy.loadError}</p> : null}
            <div className="mt-3 space-y-2">
                {events.map((event) => <EventCard cancelling={cancelling} copy={copy} event={event} key={event.id} locale={locale} onCancel={onCancel} />)}
                {events.length === 0 && !isError ? <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">{copy.noEvents}</p> : null}
            </div>
        </div>
    );
}

function BookingCard({booking, cancelling, copy, locale, onCancel}: {booking: Booking; cancelling: boolean; copy: Copy; locale: Locale; onCancel: (id: number) => void}) {
    const cancellable = booking.status !== "CANCELLED" && new Date(booking.startsAt).getTime() > Date.now();
    const canPay = booking.status === "AWAITING_PAYMENT_CONFIRMATION" && Boolean(booking.externalPaymentUrl);

    return (
        <article className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{booking.serviceTitleUa}</p>
                    <p className="mt-1 text-xs text-stone-500">{booking.specialistName} · {booking.officeName ?? copy.noOffice}</p>
                </div>
                <StatusBadge copy={copy} status={booking.status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-stone-700">{formatDateTimeRange(booking.startsAt, booking.endsAt, locale)}</p>
                <div className="flex flex-wrap justify-end gap-2">
                    {canPay ? <a className="rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50" href={booking.externalPaymentUrl ?? undefined} rel="noreferrer" target="_blank">{copy.pay}</a> : null}
                    {cancellable ? <button className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300" disabled={cancelling} onClick={() => onCancel(booking.id)} type="button">{copy.cancel}</button> : null}
                </div>
            </div>
        </article>
    );
}

function EventCard({cancelling, copy, event, locale, onCancel}: {cancelling: boolean; copy: Copy; event: PublicFixedEvent; locale: Locale; onCancel: (id: number) => void}) {
    const cancellable = new Date(event.startsAt).getTime() > Date.now();

    return (
        <article className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{event.title}</p>
                    <p className="mt-1 text-xs text-stone-500">{event.specialistName} · {event.officeName ?? copy.noOffice}</p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">{copy.enrolled}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-stone-700">{formatDateTimeRange(event.startsAt, event.endsAt, locale)}</p>
                {cancellable ? <button className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300" disabled={cancelling} onClick={() => onCancel(event.id)} type="button">{copy.cancel}</button> : null}
            </div>
        </article>
    );
}

function StatusBadge({copy, status}: {copy: Copy; status: Booking["status"]}) {
    const confirmed = status === "CONFIRMED";
    const cancelled = status === "CANCELLED";
    const className = cancelled
        ? "border-red-200 bg-red-50 text-red-700"
        : confirmed
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-800";

    return <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${className}`}>{copy.statuses[status]}</span>;
}

function buildAccountRange() {
    const from = new Date();
    from.setDate(from.getDate() - 31);
    from.setHours(0, 0, 0, 0);

    const to = new Date();
    to.setDate(to.getDate() + 365);
    to.setHours(23, 59, 59, 999);

    return {from: from.toISOString(), to: to.toISOString()};
}

function formatDateTimeRange(start: string, end: string, locale: Locale) {
    const languageTag = locale === "ua" ? "uk" : locale;
    const date = new Intl.DateTimeFormat(languageTag, {day: "numeric", month: "short", weekday: "short"}).format(new Date(start));
    const time = new Intl.DateTimeFormat(languageTag, {hour: "2-digit", minute: "2-digit"});
    return `${date}, ${time.format(new Date(start))}–${time.format(new Date(end))}`;
}

type T = ReturnType<typeof useTranslations<"accountPage.bookings">>;

function labels(t: T) {
    return {
        title: t("title"),
        body: t("body"),
        loading: t("loading"),
        appointments: t("appointments"),
        events: t("events"),
        enrolled: t("enrolled"),
        noOffice: t("noOffice"),
        noAppointments: t("noAppointments"),
        noEvents: t("noEvents"),
        loadError: t("loadError"),
        cancel: t("cancel"),
        pay: t("pay"),
        cancelled: t("cancelled"),
        cancelError: t("cancelError"),
        statuses: {
            AWAITING_PAYMENT_CONFIRMATION: t("statuses.AWAITING_PAYMENT_CONFIRMATION"),
            CONFIRMED: t("statuses.CONFIRMED"),
            CANCELLED: t("statuses.CANCELLED")
        }
    };
}

type Copy = ReturnType<typeof labels>;
