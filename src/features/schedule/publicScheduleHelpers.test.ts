import {describe, expect, it} from "vitest";
import {
    buildMonthPickerDays,
    buildMonthRange,
    buildSelectedDayItems,
    dateKey,
    filterScheduleEvents,
    serviceDurationSlot,
    slotKey,
    toId,
    uniqueSpecialists
} from "./publicScheduleHelpers";
import type {PublicFixedEvent, PublicScheduleAvailabilityBlock} from "@/types/schedule";
import type {PublicService} from "@/types/services";

function slot(overrides: Partial<PublicScheduleAvailabilityBlock> = {}): PublicScheduleAvailabilityBlock {
    return {
        id: 1,
        specialistId: 10,
        specialistName: "Specialist",
        specialistAvatarMediaId: null,
        specialistAvatarMediaUrl: null,
        officeId: 20,
        officeName: "Office",
        officeAddress: null,
        officeDirections: null,
        officeGoogleMapsUrl: null,
        officePhotoMediaId: null,
        officePhotoMediaUrl: null,
        officeVideoMediaId: null,
        officeVideoMediaUrl: null,
        startsAt: "2035-04-10T10:00:00.000Z",
        endsAt: "2035-04-10T12:00:00.000Z",
        ...overrides
    };
}

function event(overrides: Partial<PublicFixedEvent> = {}): PublicFixedEvent {
    return {
        id: 1,
        serviceId: 100,
        title: "Event",
        description: null,
        specialistId: 10,
        specialistName: "Specialist",
        specialistAvatarMediaId: null,
        specialistAvatarMediaUrl: null,
        officeId: 20,
        officeName: "Office",
        officeAddress: null,
        officeDirections: null,
        officeGoogleMapsUrl: null,
        officePhotoMediaId: null,
        officePhotoMediaUrl: null,
        officeVideoMediaId: null,
        officeVideoMediaUrl: null,
        startsAt: "2035-04-10T11:00:00.000Z",
        endsAt: "2035-04-10T12:00:00.000Z",
        capacity: 8,
        enrolledCount: 0,
        remainingPlaces: 8,
        full: false,
        enrolled: false,
        enrollmentStatus: null,
        price: 1000,
        externalPaymentUrl: null,
        paymentConfirmed: false,
        note: null,
        membershipPurchaseId: null,
        paidWithMembership: false,
        ...overrides
    };
}

const service: PublicService = {
    basePrice: 1500,
    bookingMode: "INDIVIDUAL_APPOINTMENT",
    description: null,
    durationMinutes: 60,
    id: 100,
    title: "Service"
};

describe("publicScheduleHelpers", () => {
    it("builds month range and calendar picker days", () => {
        const range = buildMonthRange(new Date("2035-04-15T12:00:00"));
        expect(range.from).toBe(new Date("2035-04-01T00:00:00").toISOString());
        expect(range.to).toBe(new Date("2035-05-01T00:00:00").toISOString());

        const days = buildMonthPickerDays(new Date("2035-04-15T12:00:00"));
        expect(days).toHaveLength(42);
        expect(days[0].key).toBe(dateKey(new Date("2035-03-26T00:00:00")));
    });

    it("filters public fixed events by booking filters", () => {
        const events = [
            event({id: 1, enrolled: true}),
            event({id: 2, full: true}),
            event({id: 3, full: false})
        ];

        expect(filterScheduleEvents(events, {mode: "individual", officeId: "", period: 31, specialistId: "", status: "all"})).toEqual([]);
        expect(filterScheduleEvents(events, {mode: "all", officeId: "", period: 31, specialistId: "", status: "mine"}).map((item) => item.id)).toEqual([1]);
        expect(filterScheduleEvents(events, {mode: "all", officeId: "", period: 31, specialistId: "", status: "events"}).map((item) => item.id)).toEqual([1, 3]);
    });

    it("deduplicates specialists while preserving later avatar values", () => {
        expect(uniqueSpecialists([
            {specialistId: 1, specialistName: "First", specialistAvatarMediaUrl: null},
            {specialistId: 1, specialistName: "First", specialistAvatarMediaUrl: "/api/media/1"},
            {specialistId: 2, specialistName: "Second", specialistAvatarMediaUrl: null}
        ])).toEqual([
            {id: 1, name: "First", avatarMediaUrl: "/api/media/1"},
            {id: 2, name: "Second", avatarMediaUrl: null}
        ]);
    });

    it("cuts service duration slots only when the service fits", () => {
        expect(serviceDurationSlot(slot(), service)?.endsAt).toBe(new Date("2035-04-10T11:00:00.000Z").toISOString());
        expect(serviceDurationSlot(slot({endsAt: "2035-04-10T10:30:00.000Z"}), service)).toBeNull();
    });

    it("sorts selected day slots and events together", () => {
        expect(buildSelectedDayItems([
            slot({id: 1, startsAt: "2035-04-10T12:00:00.000Z"}),
            slot({id: 2, startsAt: "2035-04-10T10:00:00.000Z"})
        ], [
            event({id: 3, startsAt: "2035-04-10T11:00:00.000Z"})
        ]).map((item) => item.startsAt)).toEqual([
            "2035-04-10T10:00:00.000Z",
            "2035-04-10T11:00:00.000Z",
            "2035-04-10T12:00:00.000Z"
        ]);
    });

    it("keeps URL id and slot key conventions", () => {
        expect(toId("42")).toBe(42);
        expect(toId("")).toBe("");
        expect(slotKey(slot({id: 9}))).toBe("slot-9-2035-04-10T10:00:00.000Z");
    });
});
