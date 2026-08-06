import type {SpecialistBooking} from "@/types/bookings";
import type {ScheduleBlockStatus, ScheduleBlockType, SpecialistAvailabilityBlock, SpecialistTrainingCalendarSession} from "@/types/schedule";
import type {ServiceVariant} from "@/types/services";

export type CalendarFilterState = {
    officeId: number | "";
    serviceId: number | "";
    itemType: "all" | ScheduleBlockType | "BOOKING" | "TRAINING_SESSION" | "BUFFER";
    status: "all" | ScheduleBlockStatus | SpecialistBooking["status"] | "ACTIVE_EVENT" | "INACTIVE_EVENT" | "PAST";
};

export type CalendarBuffer = {
    id: string;
    startsAt: string;
    endsAt: string;
    specialistName: string;
    officeId: number | null;
    officeName: string | null;
};

export type ManualBookingSlot = {
    key: string;
    block: SpecialistAvailabilityBlock;
    startsAt: string;
    endsAt: string;
};

export function filterCalendarBlocks(blocks: SpecialistAvailabilityBlock[], filters: CalendarFilterState) {
    return blocks.filter((block) => {
        if (filters.officeId !== "" && block.officeId !== filters.officeId) return false;
        if (filters.serviceId !== "" && block.serviceId !== filters.serviceId) return false;
        if (filters.itemType !== "all" && (filters.itemType === "BOOKING" || filters.itemType === "TRAINING_SESSION" || block.itemType !== filters.itemType)) return false;
        if (filters.status === "PAST") return isPastRange(block.endsAt);
        if (filters.status !== "all" && (filters.status === "ACTIVE_EVENT" || filters.status === "INACTIVE_EVENT" || !["AVAILABLE", "BLOCKED"].includes(filters.status) || block.status !== filters.status)) return false;
        return true;
    });
}

export function filterCalendarEvents(events: SpecialistTrainingCalendarSession[], filters: CalendarFilterState) {
    return events.filter((event) => {
        if (filters.officeId !== "" && event.officeId !== filters.officeId) return false;
        if (filters.serviceId !== "" && event.serviceId !== filters.serviceId) return false;
        if (filters.itemType !== "all" && filters.itemType !== "TRAINING_SESSION") return false;
        if (filters.status === "PAST") return isPastRange(event.endsAt);
        if (filters.status === "ACTIVE_EVENT" && !event.active) return false;
        if (filters.status === "INACTIVE_EVENT" && event.active) return false;
        if (filters.status !== "all" && filters.status !== "ACTIVE_EVENT" && filters.status !== "INACTIVE_EVENT") return false;
        return true;
    });
}

export function filterCalendarBookings(bookings: SpecialistBooking[], filters: CalendarFilterState) {
    return bookings.filter((booking) => {
        if (filters.officeId !== "" && booking.officeId !== filters.officeId) return false;
        if (filters.serviceId !== "" && booking.serviceId !== filters.serviceId) return false;
        if (filters.itemType !== "all" && filters.itemType !== "BOOKING") return false;
        if (filters.status === "PAST") return booking.status !== "CANCELLED" && isPastRange(booking.endsAt);
        if (filters.status !== "all" && !["PAYMENT_PENDING", "CONFIRMED", "CANCELLED"].includes(filters.status)) return false;
        if (filters.status !== "all" && booking.status !== filters.status) return false;
        return true;
    });
}

export function filterCalendarBuffers(buffers: CalendarBuffer[], filters: CalendarFilterState) {
    return buffers.filter((buffer) => {
        if (filters.officeId !== "" && buffer.officeId !== filters.officeId) return false;
        if (filters.serviceId !== "") return false;
        if (filters.itemType !== "all" && filters.itemType !== "BUFFER") return false;
        if (filters.status === "PAST") return isPastRange(buffer.endsAt);
        if (filters.status !== "all") return false;
        return true;
    });
}

export function buildCalendarBuffers(bookings: SpecialistBooking[], events: SpecialistTrainingCalendarSession[], appointmentBufferMinutes: number): CalendarBuffer[] {
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

export function bufferRanges(idPrefix: string, startsAt: string, endsAt: string, specialistName: string, officeId: number | null, officeName: string | null, appointmentBufferMinutes: number): CalendarBuffer[] {
    const end = new Date(endsAt);
    const after = new Date(end);
    after.setMinutes(after.getMinutes() + appointmentBufferMinutes);
    return [
        {id: `${idPrefix}-after`, startsAt: end.toISOString(), endsAt: after.toISOString(), specialistName, officeId, officeName}
    ];
}

export function isPastRange(endsAt: string, nowMs = Date.now()) {
    return new Date(endsAt).getTime() < nowMs;
}

export function hasRestPeriodConflict(
    startsAt: string,
    endsAt: string,
    bookings: SpecialistBooking[],
    events: SpecialistTrainingCalendarSession[],
    appointmentBufferMinutes: number,
    excludedEventId?: number
) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return false;
    }

    const activeBookings = bookings.filter((booking) => booking.status !== "CANCELLED");
    const activeEvents = events.filter((event) => event.active && event.id !== excludedEventId);

    return activeBookings.some((booking) => overlapsRestAfter(start, end, booking.endsAt, appointmentBufferMinutes))
        || activeEvents.some((event) => overlapsRestAfter(start, end, event.endsAt, appointmentBufferMinutes));
}

export function buildManualBookingSlots(
    blocks: SpecialistAvailabilityBlock[],
    bookings: SpecialistBooking[],
    events: SpecialistTrainingCalendarSession[],
    appointmentBufferMinutes: number,
    variant?: ServiceVariant,
    nowMs = Date.now()
): ManualBookingSlot[] {
    if (!variant) return [];

    const activeBookings = bookings.filter((booking) => booking.status !== "CANCELLED");
    const activeEvents = events.filter((event) => event.active);
    const blockedBlocks = blocks.filter((block) => block.status === "BLOCKED");
    const slots: ManualBookingSlot[] = [];

    for (const block of blocks) {
        if (block.status !== "AVAILABLE") continue;
        if (block.itemType === "APPOINTMENT_SLOT") {
            if (block.serviceId !== variant.serviceId || block.booked) continue;
            if (!variant.specialistIds.includes(block.specialistId)) continue;
            if (block.resourceId === null || !variant.resourceIds.includes(block.resourceId)) continue;
            const slotStart = new Date(block.startsAt);
            const slotEnd = new Date(block.endsAt);
            const overlapsBooking = activeBookings.some((booking) => overlapsBuffered(slotStart, slotEnd, booking.startsAt, booking.endsAt, appointmentBufferMinutes));
            const overlapsEvent = activeEvents.some((event) => overlapsBuffered(slotStart, slotEnd, event.startsAt, event.endsAt, appointmentBufferMinutes));
            const overlapsBlocked = blockedBlocks.some((blocked) => overlaps(slotStart, slotEnd, new Date(blocked.startsAt), new Date(blocked.endsAt)));

            if (slotStart.getTime() > nowMs && !overlapsBooking && !overlapsEvent && !overlapsBlocked) {
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
            if (!variant.specialistIds.includes(block.specialistId)) break;
            if (block.resourceId === null || !variant.resourceIds.includes(block.resourceId)) break;
            slotEnd.setMinutes(slotEnd.getMinutes() + variant.durationMinutes);

            if (slotEnd.getTime() > blockEnd.getTime()) break;

            const overlapsBooking = activeBookings.some((booking) => overlapsBuffered(slotStart, slotEnd, booking.startsAt, booking.endsAt, appointmentBufferMinutes));
            const overlapsEvent = activeEvents.some((event) => overlapsBuffered(slotStart, slotEnd, event.startsAt, event.endsAt, appointmentBufferMinutes));
            const overlapsBlocked = blockedBlocks.some((blocked) => overlaps(slotStart, slotEnd, new Date(blocked.startsAt), new Date(blocked.endsAt)));

            if (slotStart.getTime() > nowMs && !overlapsBooking && !overlapsEvent && !overlapsBlocked) {
                const startsAt = slotStart.toISOString();
                slots.push({
                    key: `${block.id}-${startsAt}`,
                    block,
                    startsAt,
                    endsAt: slotEnd.toISOString()
                });
            }

            slotStart.setMinutes(slotStart.getMinutes() + variant.durationMinutes);
        }
    }

    return slots.sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime());
}

export function overlaps(firstStart: Date, firstEnd: Date, secondStart: Date, secondEnd: Date) {
    return firstStart < secondEnd && secondStart < firstEnd;
}

export function overlapsRestAfter(firstStart: Date, firstEnd: Date, endsAt: string, appointmentBufferMinutes: number) {
    const restStart = new Date(endsAt);
    const restEnd = new Date(restStart);
    restEnd.setMinutes(restEnd.getMinutes() + appointmentBufferMinutes);
    return overlaps(firstStart, firstEnd, restStart, restEnd);
}

export function overlapsBuffered(firstStart: Date, firstEnd: Date, startsAt: string, endsAt: string, appointmentBufferMinutes: number) {
    const firstBufferedEnd = new Date(firstEnd);
    firstBufferedEnd.setMinutes(firstBufferedEnd.getMinutes() + appointmentBufferMinutes);
    const secondStart = new Date(startsAt);
    const secondEnd = new Date(endsAt);
    secondEnd.setMinutes(secondEnd.getMinutes() + appointmentBufferMinutes);
    return overlaps(firstStart, firstBufferedEnd, secondStart, secondEnd);
}
