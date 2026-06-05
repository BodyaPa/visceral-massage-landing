export type ScheduleBlockStatus = "AVAILABLE" | "BLOCKED";

export interface SpecialistAvailabilityBlock {
    id: number;
    officeId: number | null;
    officeName: string | null;
    status: ScheduleBlockStatus;
    booked: boolean;
    startsAt: string;
    endsAt: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PublicScheduleAvailabilityBlock {
    id: number;
    specialistId: number;
    specialistName: string;
    officeId: number | null;
    officeName: string | null;
    startsAt: string;
    endsAt: string;
}

export interface PublicScheduleUnavailableBlock {
    id: string;
    status: "OCCUPIED" | "UNAVAILABLE";
    specialistId: number;
    specialistName: string;
    officeId: number | null;
    officeName: string | null;
    startsAt: string;
    endsAt: string;
}

export interface PublicFixedEvent {
    id: number;
    serviceId: number;
    title: string;
    description: string | null;
    specialistId: number;
    specialistName: string;
    officeId: number | null;
    officeName: string | null;
    startsAt: string;
    endsAt: string;
    capacity: number;
    enrolledCount: number;
    remainingPlaces: number;
    full: boolean;
    enrolled: boolean;
    price: number;
    note: string | null;
}

export interface SpecialistFixedEvent {
    id: number;
    serviceId: number;
    serviceTitle: string;
    officeId: number | null;
    officeName: string | null;
    startsAt: string;
    endsAt: string;
    capacity: number;
    enrolledCount: number;
    price: number;
    note: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SpecialistFixedEventEnrollment {
    id: number;
    eventId: number;
    eventTitle: string;
    eventStartsAt: string;
    eventEndsAt: string;
    clientId: number;
    clientName: string;
    clientContact: string;
    status: "ACTIVE" | "CANCELLED";
    reminderOptIn: boolean;
    createdAt: string;
    updatedAt: string;
}

export type SpecialistFixedEventInput = {
    serviceId: number;
    officeId?: number | null;
    startsAt: string;
    endsAt: string;
    capacity: number;
    note?: string | null;
    active: boolean;
};

export type SpecialistAvailabilityInput = {
    officeId?: number | null;
    status: ScheduleBlockStatus;
    startsAt: string;
    endsAt: string;
    notes?: string | null;
};
