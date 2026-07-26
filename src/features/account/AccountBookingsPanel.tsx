"use client";

import {useMemo, useState} from "react";
import {useTranslations} from "next-intl";
import {useToast} from "@/components/ui/toast/ToastProvider";
import {
    buildAccountRange,
    eventStatus,
    filterBookings,
    filterEvents,
    type AccountBookingFilter,
    type AccountEventStatus
} from "@/features/account/accountBookings";
import {useCancelBookingMutation, useListMyBookingsQuery} from "@/features/bookings/bookings.api";
import {bookingServiceTitle} from "@/features/bookings/bookingTitles";
import {useCancelTrainingSessionMutation, useListMyTrainingParticipationsQuery} from "@/features/training/training.api";
import type {Locale} from "@/i18n";
import {toLanguageTag} from "@/shared/lib/i18n/toLanguageTag";
import {withLocale} from "@/shared/lib/locale/withLocale";
import {resolveApiMediaUrl} from "@/shared/lib/media/resolveApiMediaUrl";
import type {Booking} from "@/types/bookings";
import type {AccountTrainingParticipation} from "@/types/training";
import Dialog from "@/components/ui/overlay/Dialog";
import Button from "@/components/ui/button/Button";
import {useCreateReviewMutation, useGetReviewEligibilityQuery} from "@/features/reviews/reviews.api";

const INITIAL_VISIBLE_ITEMS = 6;

export default function AccountBookingsPanel({locale}: {locale: Locale}) {
    const t = useTranslations("accountPage.bookings");
    const copy = labels(t);
    const toast = useToast();
    const range = useMemo(() => buildAccountRange(), []);
    const [filter, setFilter] = useState<AccountBookingFilter>("upcoming");
    const [bookingsPage, setBookingsPage] = useState(0);
    const [eventsPage, setEventsPage] = useState(0);
    const [pendingCancel, setPendingCancel] = useState<{id: number; title: string; type: "booking" | "event"} | null>(null);
    const [pendingReview, setPendingReview] = useState<{id: number; title: string; targetType: "BOOKING" | "TRAINING_PARTICIPANT"} | null>(null);
    const {data: bookingsData, isFetching: bookingsFetching, isError: bookingsError} = useListMyBookingsQuery({page: bookingsPage, size: 20});
    const {data: eventsData, isFetching: eventsFetching, isError: eventsError} = useListMyTrainingParticipationsQuery({...range, lang: locale, page: eventsPage, size: 20});
    const [cancelBooking, {isLoading: cancellingBooking}] = useCancelBookingMutation();
    const [cancelEnrollment, {isLoading: cancellingEnrollment}] = useCancelTrainingSessionMutation();
    const [createReview, {isLoading: reviewSaving}] = useCreateReviewMutation();
    const {data: reviewEligibility} = useGetReviewEligibilityQuery();
    const reviewableBookingIds = useMemo(() => new Set(reviewEligibility?.reviewableBookingIds ?? []), [reviewEligibility]);
    const reviewableTrainingParticipantIds = useMemo(() => new Set(reviewEligibility?.reviewableTrainingParticipantIds ?? []), [reviewEligibility]);
    const bookings = useMemo(() => bookingsData?.content ?? [], [bookingsData?.content]);
    const events = useMemo(() => eventsData?.content ?? [], [eventsData?.content]);
    const filteredBookings = useMemo(() => filterBookings(bookings, filter), [bookings, filter]);
    const filteredEvents = useMemo(() => filterEvents(events, filter), [events, filter]);
    const counts = useMemo(() => ({
        upcoming: filterBookings(bookings, "upcoming").length + filterEvents(events, "upcoming").length,
        history: filterBookings(bookings, "history").length + filterEvents(events, "history").length,
        cancelled: filterBookings(bookings, "cancelled").length + filterEvents(events, "cancelled").length,
        all: bookings.length + events.length
    }), [bookings, events]);

    async function cancelAppointment(id: number, reason: string, details: string) {
        try {
            await cancelBooking({id, reason, details: details.trim() || null}).unwrap();
            toast.success(copy.cancelled);
        } catch {
            toast.error(copy.cancelError);
        }
    }

    async function cancelEvent(id: number, reason: string, details: string) {
        try {
            await cancelEnrollment({id, lang: locale, reason, details: details.trim() || null}).unwrap();
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
            <div className="mt-4 grid gap-1 rounded-xl bg-stone-100 p-1 sm:grid-cols-4">
                {(["upcoming", "history", "cancelled", "all"] as const).map((item) => (
                    <button aria-pressed={filter === item} className={filter === item ? activeFilterClass : filterClass} key={item} onClick={() => {setFilter(item);setBookingsPage(0);setEventsPage(0)}} type="button">
                        <span>{copy.filters[item]}</span>
                        <span className={filter === item ? "rounded-full bg-white/15 px-1.5 py-0.5 text-[10px]" : "rounded-full bg-white px-1.5 py-0.5 text-[10px] text-stone-500"}>{counts[item]}</span>
                    </button>
                ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <BookingList bookings={filteredBookings} cancelling={cancellingBooking} copy={copy} isError={bookingsError} locale={locale} onCancel={(booking) => setPendingCancel({id: booking.id, title: bookingServiceTitle(booking, locale), type: "booking"})} onReview={(booking) => setPendingReview({id: booking.id, title: bookingServiceTitle(booking, locale), targetType: "BOOKING"})} reviewableIds={reviewableBookingIds} />
                <EventList cancelling={cancellingEnrollment} copy={copy} events={filteredEvents} isError={eventsError} locale={locale} onCancel={(event) => setPendingCancel({id: event.sessionId, title: event.title, type: "event"})} onReview={(event) => setPendingReview({id: event.participantId, title: event.title, targetType: "TRAINING_PARTICIPANT"})} reviewableIds={reviewableTrainingParticipantIds} />
            </div>
            {bookingsData && bookingsData.totalPages > 1 ? <div className="mt-4 flex justify-end gap-2"><button className={pagerButtonClass} disabled={bookingsPage === 0} onClick={() => setBookingsPage((page) => page - 1)} type="button">{copy.previous}</button><button className={pagerButtonClass} disabled={bookingsPage + 1 >= bookingsData.totalPages} onClick={() => setBookingsPage((page) => page + 1)} type="button">{copy.next}</button></div> : null}
            {eventsData && eventsData.totalPages > 1 ? <div className="mt-2 flex justify-end gap-2"><button className={pagerButtonClass} disabled={eventsPage === 0} onClick={() => setEventsPage((page) => page - 1)} type="button">{copy.previous}</button><button className={pagerButtonClass} disabled={eventsPage + 1 >= eventsData.totalPages} onClick={() => setEventsPage((page) => page + 1)} type="button">{copy.next}</button></div> : null}

            {pendingCancel ? (
                <CancelConfirmationModal
                    copy={copy}
                    disabled={cancellingBooking || cancellingEnrollment}
                    onClose={() => setPendingCancel(null)}
                    onConfirm={async (reason, details) => {
                        if (pendingCancel.type === "booking") {
                            await cancelAppointment(pendingCancel.id, reason, details);
                        } else {
                            await cancelEvent(pendingCancel.id, reason, details);
                        }
                        setPendingCancel(null);
                    }}
                    title={pendingCancel.title}
                />
            ) : null}
            <ReviewDialog copy={copy} disabled={reviewSaving} onClose={() => setPendingReview(null)} onSubmit={async (rating, text) => {
                if (!pendingReview) return;
                try {
                    await createReview({targetType: pendingReview.targetType, targetId: pendingReview.id, rating, text: text.trim() || null, lang: locale}).unwrap();
                    toast.success(copy.reviewCreated);
                    setPendingReview(null);
                } catch {
                    toast.error(copy.reviewError);
                }
            }} open={pendingReview !== null} title={pendingReview?.title ?? ""} />
        </section>
    );
}

const filterClass = "flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:bg-white hover:text-stone-900";
const activeFilterClass = "flex min-w-0 items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white shadow-sm";
const pagerButtonClass = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40";

function BookingList({bookings, cancelling, copy, isError, locale, onCancel, onReview, reviewableIds}: {bookings: Booking[]; cancelling: boolean; copy: Copy; isError: boolean; locale: Locale; onCancel: (booking: Booking) => void; onReview: (booking: Booking) => void; reviewableIds: Set<number>}) {
    const [expanded, setExpanded] = useState(false);
    const visibleBookings = expanded ? bookings : bookings.slice(0, INITIAL_VISIBLE_ITEMS);
    const hiddenCount = Math.max(0, bookings.length - visibleBookings.length);

    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-950">{copy.appointments}</h3>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">{bookings.length}</span>
            </div>
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copy.loadError}</p> : null}
            <div className="mt-3 space-y-2">
                {visibleBookings.map((booking) => <BookingCard booking={booking} cancelling={cancelling} copy={copy} key={booking.id} locale={locale} onCancel={onCancel} onReview={onReview} reviewable={reviewableIds.has(booking.id)} />)}
                {bookings.length === 0 && !isError ? <AccountEmptyAction body={copy.noAppointments} href={withLocale("/calendar", locale)} label={copy.bookAppointment} /> : null}
                {bookings.length > INITIAL_VISIBLE_ITEMS ? (
                    <button className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50" onClick={() => setExpanded((current) => !current)} type="button">
                        {expanded ? copy.showLess : copy.showMore(hiddenCount)}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function EventList({cancelling, copy, events, isError, locale, onCancel, onReview, reviewableIds}: {cancelling: boolean; copy: Copy; events: AccountTrainingParticipation[]; isError: boolean; locale: Locale; onCancel: (event: AccountTrainingParticipation) => void; onReview: (event: AccountTrainingParticipation) => void; reviewableIds: Set<number>}) {
    const [expanded, setExpanded] = useState(false);
    const visibleEvents = expanded ? events : events.slice(0, INITIAL_VISIBLE_ITEMS);
    const hiddenCount = Math.max(0, events.length - visibleEvents.length);

    return (
        <div>
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-stone-950">{copy.events}</h3>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-500">{events.length}</span>
            </div>
            {isError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copy.loadError}</p> : null}
            <div className="mt-3 space-y-2">
                {visibleEvents.map((event) => <EventCard cancelling={cancelling} copy={copy} event={event} key={event.participantId} locale={locale} onCancel={onCancel} onReview={onReview} reviewable={reviewableIds.has(event.participantId)} />)}
                {events.length === 0 && !isError ? <AccountEmptyAction body={copy.noEvents} href={withLocale("/calendar", locale)} label={copy.findEvent} /> : null}
                {events.length > INITIAL_VISIBLE_ITEMS ? (
                    <button className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50" onClick={() => setExpanded((current) => !current)} type="button">
                        {expanded ? copy.showLess : copy.showMore(hiddenCount)}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function AccountEmptyAction({body, href, label}: {body: string; href: string; label: string}) {
    return (
        <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-sm text-stone-500">
            <p>{body}</p>
            <a className="mt-3 inline-flex rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100" href={href}>{label}</a>
        </div>
    );
}

function BookingCard({booking, cancelling, copy, locale, onCancel, onReview, reviewable}: {booking: Booking; cancelling: boolean; copy: Copy; locale: Locale; onCancel: (booking: Booking) => void; onReview: (booking: Booking) => void; reviewable: boolean}) {
    const cancellable = booking.status !== "CANCELLED" && new Date(booking.startsAt).getTime() >= Date.now() + 2 * 60 * 60 * 1000;
    const canPay = booking.status === "AWAITING_PAYMENT_CONFIRMATION" && Boolean(booking.externalPaymentUrl);

    return (
        <article className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{bookingServiceTitle(booking, locale)}</p>
                    <p className="mt-1 text-xs text-stone-500">{booking.specialistName} · {booking.officeName ?? copy.noOffice}</p>
                </div>
                <BookingStatusBadge booking={booking} copy={copy} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-stone-700">{formatDateTimeRange(booking.startsAt, booking.endsAt, locale)}</p>
                <div className="flex flex-wrap justify-end gap-2">
                    {canPay ? <a className="inline-flex min-h-9 items-center rounded-md bg-stone-950 px-3 py-1.5 text-xs font-semibold text-white outline-none transition-[background-color,box-shadow,transform] hover:bg-stone-800 hover:shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2" href={booking.externalPaymentUrl ?? undefined} rel="noreferrer" target="_blank">{copy.pay}</a> : null}
                    {cancellable ? <button className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300" disabled={cancelling} onClick={() => onCancel(booking)} type="button">{copy.cancel}</button> : null}
                    {reviewable ? <button className={pagerButtonClass} onClick={() => onReview(booking)} type="button">{copy.leaveReview}</button> : null}
                </div>
            </div>
            <BookingMetaChips booking={booking} copy={copy} />
            <OfficeDetails
                address={booking.officeAddress}
                copy={copy}
                directions={booking.officeDirections}
                googleMapsUrl={booking.officeGoogleMapsUrl}
                photoUrl={booking.officePhotoMediaUrl}
                videoUrl={booking.officeVideoMediaUrl}
            />
        </article>
    );
}

function EventCard({cancelling, copy, event, locale, onCancel, onReview, reviewable}: {cancelling: boolean; copy: Copy; event: AccountTrainingParticipation; locale: Locale; onCancel: (event: AccountTrainingParticipation) => void; onReview: (event: AccountTrainingParticipation) => void; reviewable: boolean}) {
    const status = eventStatus(event);
    const cancellable = status === "ACTIVE" && new Date(event.startsAt).getTime() >= Date.now() + 2 * 60 * 60 * 1000;
    const canPay = status === "ACTIVE"
        && !event.paymentConfirmed
        && !event.paidWithMembership
        && !event.paidWithLoyaltyVoucher
        && Boolean(event.externalPaymentUrl);

    return (
        <article className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{event.title}</p>
                    <p className="mt-1 text-xs text-stone-500">{event.trainerName} · {event.officeName ?? copy.noOffice}</p>
                </div>
                <EventStatusBadge copy={copy} status={status} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-stone-700">{formatDateTimeRange(event.startsAt, event.endsAt, locale)}</p>
                <div className="flex flex-wrap justify-end gap-2">
                    {canPay ? <a className="inline-flex min-h-9 items-center rounded-md bg-stone-950 px-3 py-1.5 text-xs font-semibold text-white outline-none transition-[background-color,box-shadow,transform] hover:bg-stone-800 hover:shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-stone-950 focus-visible:ring-offset-2" href={event.externalPaymentUrl ?? undefined} rel="noreferrer" target="_blank">{copy.pay}</a> : null}
                    {cancellable ? <button className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300" disabled={cancelling} onClick={() => onCancel(event)} type="button">{copy.cancel}</button> : null}
                    {reviewable ? <button className={pagerButtonClass} onClick={() => onReview(event)} type="button">{copy.leaveReview}</button> : null}
                </div>
            </div>
            <EventMetaChips copy={copy} event={event} />
            <OfficeDetails
                address={event.officeAddress}
                copy={copy}
                directions={event.officeDirections}
                googleMapsUrl={event.officeGoogleMapsUrl}
                photoUrl={null}
                videoUrl={null}
            />
        </article>
    );
}

function BookingMetaChips({booking, copy}: {booking: Booking; copy: Copy}) {
    const chips = [
        booking.status === "AWAITING_PAYMENT_CONFIRMATION" ? copy.paymentPendingHint : null,
        booking.paidWithMembership ? copy.paidWithMembership : null,
        booking.paidWithLoyaltyVoucher ? copy.paidWithLoyaltyVoucher : null,
        booking.reminderOptIn ? copy.reminderEnabled : null
    ].filter((chip): chip is string => Boolean(chip));

    if (chips.length === 0) return null;

    return <div className="mt-3 flex flex-wrap gap-1.5">{chips.map((chip) => <span className="max-w-full break-words rounded-full border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600" key={chip}>{chip}</span>)}</div>;
}

function EventMetaChips({copy, event}: {copy: Copy; event: AccountTrainingParticipation}) {
    const chips = [
        event.status === "PAYMENT_PENDING" && !event.paymentConfirmed && !event.paidWithMembership && !event.paidWithLoyaltyVoucher ? copy.paymentPendingHint : null,
        event.paidWithMembership ? copy.paidWithMembership : null,
        event.paidWithLoyaltyVoucher ? copy.paidWithLoyaltyVoucher : null
    ].filter((chip): chip is string => Boolean(chip));

    if (chips.length === 0) return null;

    return <div className="mt-3 flex flex-wrap gap-1.5">{chips.map((chip) => <span className="max-w-full break-words rounded-full border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600" key={chip}>{chip}</span>)}</div>;
}

function EventStatusBadge({copy, status}: {copy: Copy; status: AccountEventStatus}) {
    const className = status === "CANCELLED"
        ? "border-red-200 bg-red-50 text-red-700"
        : status === "PAST"
        ? "border-stone-300 bg-stone-100 text-stone-600"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";
    return <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${className}`}>{copy.eventStatuses[status]}</span>;
}

function OfficeDetails({address, copy, directions, googleMapsUrl, photoUrl, videoUrl}: {address: string | null; copy: Copy; directions: string | null; googleMapsUrl: string | null; photoUrl: string | null; videoUrl: string | null}) {
    const rows = [
        {label: copy.officeAddress, value: address},
        {label: copy.officeDirections, value: directions}
    ].filter((row) => row.value);
    const hasMedia = Boolean(photoUrl || videoUrl || googleMapsUrl);

    if (rows.length === 0 && !hasMedia) {
        return null;
    }

    return (
        <details className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-stone-500">{copy.officeDetails}</summary>
            <dl className="mt-2 space-y-1.5 text-xs leading-5">
                {rows.map((row) => (
                    <div className="grid min-w-0 gap-0.5 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-2" key={row.label}>
                        <dt className="break-words text-stone-500">{row.label}</dt>
                        <dd className="whitespace-pre-line break-words text-stone-800">{row.value}</dd>
                    </div>
                ))}
            </dl>
            {photoUrl ? (
                <a className="mt-3 block overflow-hidden rounded-lg border border-stone-200 bg-white" href={resolveApiMediaUrl(photoUrl)} rel="noreferrer" target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={copy.officePhotoAlt} className="max-h-48 w-full object-cover" src={resolveApiMediaUrl(photoUrl)} />
                </a>
            ) : null}
            {hasMedia ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {videoUrl ? <a className="rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50" href={resolveApiMediaUrl(videoUrl)} rel="noreferrer" target="_blank">{copy.officeVideo}</a> : null}
                    {googleMapsUrl ? <a className="rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50" href={googleMapsUrl} rel="noreferrer" target="_blank">{copy.officeMap}</a> : null}
                </div>
            ) : null}
        </details>
    );
}

function BookingStatusBadge({booking, copy}: {booking: Booking; copy: Copy}) {
    const past = booking.status !== "CANCELLED" && new Date(booking.endsAt).getTime() < Date.now();
    const confirmed = booking.status === "CONFIRMED" && !past;
    const cancelled = booking.status === "CANCELLED";
    const className = cancelled
        ? "border-red-200 bg-red-50 text-red-700"
        : past
        ? "border-stone-300 bg-stone-100 text-stone-600"
        : confirmed
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
    const label = past ? copy.statuses.PAST : copy.statuses[booking.status];

    return <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${className}`}>{label}</span>;
}

function ReviewDialog({copy, disabled, onClose, onSubmit, open, title}: {copy: Copy; disabled: boolean; onClose: () => void; onSubmit: (rating: number, text: string) => void; open: boolean; title: string}) {
    const [rating, setRating] = useState(0);
    const [text, setText] = useState("");
    return <Dialog closeLabel={copy.close} description={copy.reviewBody(title)} footer={<><Button disabled={disabled} onClick={onClose} variant="secondary">{copy.close}</Button><Button disabled={disabled || rating === 0} onClick={() => void onSubmit(rating, text)}>{disabled ? copy.reviewSaving : copy.reviewSubmit}</Button></>} onClose={onClose} open={open} title={copy.reviewTitle}>
        <fieldset><legend className="text-sm font-semibold text-stone-800">{copy.reviewRating}</legend><div className="mt-3 flex gap-2">{[1,2,3,4,5].map(value => <button aria-label={copy.reviewStar(value)} aria-pressed={rating === value} className={`min-h-11 min-w-11 rounded-lg border text-xl ${value <= rating ? "border-amber-400 bg-amber-50 text-amber-600" : "border-stone-200 bg-white text-stone-300"}`} key={value} onClick={() => setRating(value)} type="button">★</button>)}</div></fieldset>
        <label className="mt-4 block text-sm font-semibold text-stone-800">{copy.reviewText}<textarea className="mt-2 min-h-28 w-full rounded-xl border border-stone-300 p-3 text-sm outline-none focus:border-stone-950 focus:ring-2 focus:ring-stone-200" maxLength={3000} onChange={event => setText(event.target.value)} value={text} /></label>
    </Dialog>;
}

function CancelConfirmationModal({copy, disabled, onClose, onConfirm, title}: {copy: Copy; disabled: boolean; onClose: () => void; onConfirm: (reason: string, details: string) => void; title: string}) {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const valid = Boolean(reason) && (reason !== "OTHER" || Boolean(details.trim()));
    return (
        <Dialog closeLabel={copy.keepBooking} description={copy.cancelConfirmBody(title)} eyebrow={copy.cancelConfirmEyebrow} footer={<>
            <Button disabled={disabled} onClick={onClose} variant="secondary">{copy.keepBooking}</Button>
            <Button disabled={disabled || !valid} onClick={() => onConfirm(reason, details)} variant="danger">{copy.confirmCancel}</Button>
        </>} onClose={onClose} open title={copy.cancelConfirmTitle}>
                <div className="mt-4 space-y-3">
                    <label className="block text-sm font-semibold text-stone-900">{copy.cancelReasonLabel}
                        <select className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-normal outline-none focus:border-stone-800" onChange={(event) => setReason(event.target.value)} value={reason}>
                            <option value="">{copy.cancelReasonPlaceholder}</option>
                            <option value="PLANS_CHANGED">{copy.cancelReasons.plans}</option>
                            <option value="HEALTH">{copy.cancelReasons.health}</option>
                            <option value="EMERGENCY">{copy.cancelReasons.emergency}</option>
                            <option value="OTHER">{copy.cancelReasons.other}</option>
                        </select>
                    </label>
                    <label className="block text-sm font-semibold text-stone-900">{copy.cancelDetailsLabel}
                        <textarea className="mt-1 min-h-20 w-full resize-y rounded-lg border border-stone-300 px-3 py-2 font-normal outline-none focus:border-stone-800" maxLength={500} onChange={(event) => setDetails(event.target.value)} value={details} />
                    </label>
                    <p className="text-xs leading-5 text-stone-500">{copy.cancelDeadlineHint}</p>
                </div>
        </Dialog>
    );
}

function formatDateTimeRange(start: string, end: string, locale: Locale) {
    const languageTag = toLanguageTag(locale);
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
        bookAppointment: t("bookAppointment"),
        findEvent: t("findEvent"),
        showMore: (count: number) => t("showMore", {count}),
        showLess: t("showLess"),
        previous: t("previous"),
        next: t("next"),
        filters: {
            upcoming: t("filters.upcoming"),
            history: t("filters.history"),
            cancelled: t("filters.cancelled"),
            all: t("filters.all")
        },
        officeDetails: t("officeDetails"),
        officeAddress: t("officeAddress"),
        officeDirections: t("officeDirections"),
        officePhotoAlt: t("officePhotoAlt"),
        officeVideo: t("officeVideo"),
        officeMap: t("officeMap"),
        loadError: t("loadError"),
        cancel: t("cancel"),
        pay: t("pay"),
        paymentPendingHint: t("paymentPendingHint"),
        paidWithMembership: t("paidWithMembership"),
        paidWithLoyaltyVoucher: t("paidWithLoyaltyVoucher"),
        reminderEnabled: t("reminderEnabled"),
        cancelled: t("cancelled"),
        cancelError: t("cancelError"),
        cancelConfirmEyebrow: t("cancelConfirmEyebrow"),
        cancelConfirmTitle: t("cancelConfirmTitle"),
        cancelConfirmBody: (title: string) => t("cancelConfirmBody", {title}),
        keepBooking: t("keepBooking"),
        confirmCancel: t("confirmCancel"),
        cancelReasonLabel: t("cancelReasonLabel"),
        cancelReasonPlaceholder: t("cancelReasonPlaceholder"),
        cancelDetailsLabel: t("cancelDetailsLabel"),
        cancelDeadlineHint: t("cancelDeadlineHint"),
        leaveReview: t("leaveReview"),
        reviewTitle: t("reviewTitle"),
        reviewBody: (title: string) => t("reviewBody", {title}),
        reviewRating: t("reviewRating"),
        reviewStar: (value: number) => t("reviewStar", {value}),
        reviewText: t("reviewText"),
        reviewSubmit: t("reviewSubmit"),
        reviewSaving: t("reviewSaving"),
        reviewCreated: t("reviewCreated"),
        reviewError: t("reviewError"),
        close: t("close"),
        cancelReasons: {
            plans: t("cancelReasons.plans"),
            health: t("cancelReasons.health"),
            emergency: t("cancelReasons.emergency"),
            other: t("cancelReasons.other")
        },
        statuses: {
            AWAITING_PAYMENT_CONFIRMATION: t("statuses.AWAITING_PAYMENT_CONFIRMATION"),
            CONFIRMED: t("statuses.CONFIRMED"),
            CANCELLED: t("statuses.CANCELLED"),
            PAST: t("statuses.PAST")
        },
        eventStatuses: {
            ACTIVE: t("eventStatuses.ACTIVE"),
            PAST: t("eventStatuses.PAST"),
            CANCELLED: t("eventStatuses.CANCELLED")
        }
    };
}

type Copy = ReturnType<typeof labels>;
