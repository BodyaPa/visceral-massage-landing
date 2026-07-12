import {describe, expect, it} from "vitest";
import {buildAccountRange, eventStatus, filterBookings, filterEvents} from "./accountBookings";
import type {Booking} from "@/types/bookings";
import type {PublicFixedEvent} from "@/types/schedule";

const nowMs = new Date("2035-06-15T12:00:00Z").getTime();

function booking(id: number, status: Booking["status"], startsAt: string, endsAt: string): Booking {
    return {
        id,
        status,
        serviceId: 10,
        serviceTitleUa: "Сеанс",
        serviceTitleEn: "Session",
        specialistId: 20,
        specialistName: "Specialist",
        officeId: 30,
        officeName: "Office",
        officeAddress: null,
        officeDirections: null,
        officeGoogleMapsUrl: null,
        officePhotoMediaId: null,
        officePhotoMediaUrl: null,
        officeVideoMediaId: null,
        officeVideoMediaUrl: null,
        startsAt,
        endsAt,
        reminderOptIn: false,
        externalPaymentUrl: null,
        membershipPurchaseId: null,
        paidWithMembership: false
    };
}

function event(id: number, endsAt: string, enrollmentStatus: PublicFixedEvent["enrollmentStatus"]): PublicFixedEvent {
    return {
        id,
        serviceId: 10,
        title: "Event",
        description: null,
        specialistId: 20,
        specialistName: "Specialist",
        specialistAvatarMediaId: null,
        specialistAvatarMediaUrl: null,
        officeId: 30,
        officeName: "Office",
        officeAddress: null,
        officeDirections: null,
        officeGoogleMapsUrl: null,
        officePhotoMediaId: null,
        officePhotoMediaUrl: null,
        officeVideoMediaId: null,
        officeVideoMediaUrl: null,
        startsAt: "2035-06-15T10:00:00Z",
        endsAt,
        capacity: 8,
        enrolledCount: 2,
        remainingPlaces: 6,
        full: false,
        enrolled: true,
        enrollmentStatus,
        price: 1000,
        note: null,
        membershipPurchaseId: null,
        paidWithMembership: false
    };
}

describe("accountBookings", () => {
    it("filters bookings by current personal account tabs", () => {
        const bookings = [
            booking(1, "CONFIRMED", "2035-06-16T10:00:00Z", "2035-06-16T11:00:00Z"),
            booking(2, "CONFIRMED", "2035-06-14T10:00:00Z", "2035-06-14T11:00:00Z"),
            booking(3, "CANCELLED", "2035-06-16T10:00:00Z", "2035-06-16T11:00:00Z")
        ];

        expect(filterBookings(bookings, "upcoming", nowMs).map((item) => item.id)).toEqual([1]);
        expect(filterBookings(bookings, "history", nowMs).map((item) => item.id)).toEqual([2]);
        expect(filterBookings(bookings, "cancelled", nowMs).map((item) => item.id)).toEqual([3]);
        expect(filterBookings(bookings, "all", nowMs).map((item) => item.id)).toEqual([1, 2, 3]);
    });

    it("classifies and filters fixed event enrollments", () => {
        const events = [
            event(1, "2035-06-16T11:00:00Z", "ACTIVE"),
            event(2, "2035-06-14T11:00:00Z", "ACTIVE"),
            event(3, "2035-06-16T11:00:00Z", "CANCELLED")
        ];

        expect(eventStatus(events[0], nowMs)).toBe("ACTIVE");
        expect(eventStatus(events[1], nowMs)).toBe("PAST");
        expect(eventStatus(events[2], nowMs)).toBe("CANCELLED");
        expect(filterEvents(events, "upcoming", nowMs).map((item) => item.id)).toEqual([1]);
        expect(filterEvents(events, "history", nowMs).map((item) => item.id)).toEqual([2]);
        expect(filterEvents(events, "cancelled", nowMs).map((item) => item.id)).toEqual([3]);
    });

    it("builds the account booking query range around the current day", () => {
        expect(buildAccountRange(new Date("2035-06-15T12:34:56Z"))).toEqual({
            from: new Date("2035-05-01T00:00:00").toISOString(),
            to: new Date("2035-07-30T23:59:59.999").toISOString()
        });
    });
});
