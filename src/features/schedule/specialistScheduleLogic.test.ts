import {describe, expect, it} from "vitest";
import {
    buildCalendarBuffers,
    buildManualBookingSlots,
    filterCalendarBlocks,
    filterCalendarBookings,
    filterCalendarBuffers,
    filterCalendarEvents,
    hasRestPeriodConflict,
    overlaps
} from "./specialistScheduleLogic";
import type {SpecialistBooking} from "@/types/bookings";
import type {SpecialistAvailabilityBlock, SpecialistTrainingCalendarSession} from "@/types/schedule";
import type {ServiceVariant} from "@/types/services";

const variant: ServiceVariant = {
    active: true,
    bufferAfterMinutes: 30,
    bufferBeforeMinutes: 0,
    depositAmount: 250,
    durationMinutes: 60,
    id: 200,
    nameEn: "Service",
    nameUa: "Послуга",
    price: 1000,
    resourceIds: [30],
    serviceId: 100,
    specialistIds: [20]
};

function block(overrides: Partial<SpecialistAvailabilityBlock> = {}): SpecialistAvailabilityBlock {
    return {
        booked: false,
        capacity: 1,
        createdAt: "2035-05-01T00:00:00.000Z",
        endsAt: "2035-05-10T12:00:00.000Z",
        id: 1,
        itemType: "OPEN_RANGE",
        notes: null,
        officeId: 10,
        officeName: "Office",
        resourceId: 30,
        resourceName: "Room",
        serviceId: null,
        serviceTitle: null,
        specialistAvatarMediaId: null,
        specialistAvatarMediaUrl: null,
        specialistId: 20,
        specialistName: "Specialist",
        startsAt: "2035-05-10T09:00:00.000Z",
        status: "AVAILABLE",
        updatedAt: "2035-05-01T00:00:00.000Z",
        ...overrides
    };
}

function booking(overrides: Partial<SpecialistBooking> = {}): SpecialistBooking {
    return {
        availabilityBlockId: 50,
        bookedPrice: 1000,
        cancellationDetails: null,
        cancellationReason: null,
        cancelledAt: null,
        clientContact: null,
        clientId: 30,
        clientName: "Client",
        createdAt: "2035-05-01T00:00:00.000Z",
        discountAmount: null,
        discountPercent: null,
        endsAt: "2035-05-10T11:00:00.000Z",
        id: 1,
        officeId: 10,
        officeName: "Office",
        loyaltyVoucherId: null,
        membershipPurchaseId: null,
        originalPrice: 1000,
        paidWithLoyaltyVoucher: false,
        paidWithMembership: false,
        promoCode: null,
        resourceId: 30,
        resourceName: "Room",
        reminderOptIn: false,
        serviceId: 100,
        serviceTitleEn: "Service",
        serviceTitleUa: "Service",
        specialistId: 20,
        specialistName: "Specialist",
        startsAt: "2035-05-10T10:00:00.000Z",
        status: "CONFIRMED",
        updatedAt: "2035-05-01T00:00:00.000Z",
        ...overrides
    };
}

function event(overrides: Partial<SpecialistTrainingCalendarSession> = {}): SpecialistTrainingCalendarSession {
    return {
        active: true,
        capacity: 8,
        createdAt: "2035-05-01T00:00:00.000Z",
        endsAt: "2035-05-10T15:00:00.000Z",
        enrolledCount: 2,
        id: 1,
        note: null,
        officeId: 10,
        officeName: "Office",
        price: 1000,
        resourceId: 30,
        resourceName: "Room",
        serviceId: 100,
        serviceTitle: "Event",
        specialistId: 20,
        specialistName: "Specialist",
        startsAt: "2035-05-10T14:00:00.000Z",
        updatedAt: "2035-05-01T00:00:00.000Z",
        ...overrides
    };
}

describe("specialistScheduleLogic", () => {
    it("filters calendar items by type, office, service and status", () => {
        expect(filterCalendarBlocks([
            block({id: 1, serviceId: 100, status: "AVAILABLE"}),
            block({id: 2, officeId: 99, serviceId: 100}),
            block({id: 3, serviceId: 101})
        ], {itemType: "all", officeId: 10, serviceId: 100, status: "AVAILABLE"}).map((item) => item.id)).toEqual([1]);

        expect(filterCalendarEvents([
            event({id: 1, active: true}),
            event({id: 2, active: false})
        ], {itemType: "TRAINING_SESSION", officeId: "", serviceId: "", status: "ACTIVE_EVENT"}).map((item) => item.id)).toEqual([1]);

        expect(filterCalendarBookings([
            booking({id: 1, status: "CONFIRMED"}),
            booking({id: 2, status: "CANCELLED"})
        ], {itemType: "BOOKING", officeId: "", serviceId: "", status: "CANCELLED"}).map((item) => item.id)).toEqual([2]);
    });

    it("builds and filters rest buffers for active bookings and events", () => {
        const buffers = buildCalendarBuffers([
            booking({id: 1, status: "CONFIRMED"}),
            booking({id: 2, status: "CANCELLED"})
        ], [
            event({id: 1, active: true}),
            event({id: 2, active: false})
        ], 30);

        expect(buffers.map((item) => item.id)).toEqual(["booking-1-after", "event-1-after"]);
        expect(filterCalendarBuffers(buffers, {itemType: "BUFFER", officeId: 10, serviceId: "", status: "all"})).toHaveLength(2);
        expect(filterCalendarBuffers(buffers, {itemType: "BUFFER", officeId: 10, serviceId: 100, status: "all"})).toEqual([]);
    });

    it("detects rest-period conflicts after bookings and events", () => {
        expect(hasRestPeriodConflict(
            "2035-05-10T11:15:00.000Z",
            "2035-05-10T12:00:00.000Z",
            [booking()],
            [],
            30
        )).toBe(true);
        expect(hasRestPeriodConflict(
            "2035-05-10T11:31:00.000Z",
            "2035-05-10T12:00:00.000Z",
            [booking()],
            [],
            30
        )).toBe(false);
    });

    it("builds manual booking slots from open ranges while respecting conflicts", () => {
        const slots = buildManualBookingSlots([
            block({id: 1, startsAt: "2035-05-10T09:00:00.000Z", endsAt: "2035-05-10T12:00:00.000Z"}),
            block({id: 2, startsAt: "2035-05-10T13:00:00.000Z", endsAt: "2035-05-10T14:00:00.000Z", status: "BLOCKED"})
        ], [
            booking({startsAt: "2035-05-10T11:00:00.000Z", endsAt: "2035-05-10T12:00:00.000Z"})
        ], [], 30, variant, new Date("2035-05-01T00:00:00.000Z").getTime());

        expect(slots.map((item) => item.startsAt)).toEqual(["2035-05-10T09:00:00.000Z"]);
    });

    it("keeps overlap boundaries exclusive", () => {
        expect(overlaps(
            new Date("2035-05-10T10:00:00.000Z"),
            new Date("2035-05-10T11:00:00.000Z"),
            new Date("2035-05-10T11:00:00.000Z"),
            new Date("2035-05-10T12:00:00.000Z")
        )).toBe(false);
    });
});
