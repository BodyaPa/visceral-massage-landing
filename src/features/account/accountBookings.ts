import type {Booking} from "@/types/bookings";
import type {AccountTrainingParticipation} from "@/types/training";

export type AccountBookingFilter = "upcoming" | "history" | "cancelled" | "all";
export type AccountEventStatus = "ACTIVE" | "PAST" | "CANCELLED";

export function filterBookings(bookings: Booking[], filter: AccountBookingFilter, nowMs = Date.now()) {
    return bookings.filter((booking) => {
        const past = new Date(booking.endsAt).getTime() < nowMs;
        if (filter === "all") return true;
        if (filter === "cancelled") return booking.status === "CANCELLED";
        if (filter === "history") return booking.status !== "CANCELLED" && past;
        return booking.status !== "CANCELLED" && !past;
    });
}

export function filterEvents(events: AccountTrainingParticipation[], filter: AccountBookingFilter, nowMs = Date.now()) {
    return events.filter((event) => {
        const status = eventStatus(event, nowMs);
        if (filter === "all") return true;
        if (filter === "cancelled") return status === "CANCELLED";
        if (filter === "history") return status === "PAST";
        return status === "ACTIVE";
    });
}

export function eventStatus(event: AccountTrainingParticipation, nowMs = Date.now()): AccountEventStatus {
    if (event.status === "CANCELLED" || event.status === "EXPIRED") return "CANCELLED";
    if (new Date(event.endsAt).getTime() < nowMs) return "PAST";
    return "ACTIVE";
}

export function buildAccountRange(now = new Date()) {
    const from = new Date(now);
    from.setDate(from.getDate() - 45);
    from.setHours(0, 0, 0, 0);

    const to = new Date(now);
    to.setDate(to.getDate() + 45);
    to.setHours(23, 59, 59, 999);

    return {from: from.toISOString(), to: to.toISOString()};
}
