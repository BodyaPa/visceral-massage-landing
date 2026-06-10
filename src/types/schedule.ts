export type ScheduleBlockStatus = "AVAILABLE" | "BLOCKED";
export type ScheduleBlockType = "OPEN_RANGE" | "APPOINTMENT_SLOT" | "BLOCK";

export interface SpecialistAvailabilityBlock {
    id: number;
    specialistId: number;
    specialistName: string;
    officeId: number | null;
    officeName: string | null;
    status: ScheduleBlockStatus;
    itemType: ScheduleBlockType;
    serviceId: number | null;
    serviceTitle: string | null;
    capacity: number | null;
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
    specialistId: number;
    specialistName: string;
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

export interface DayPlanCopyConflict {
    targetDate: string;
    itemType: string;
    startsAt: string;
    endsAt: string;
    reason: string;
}

export interface DayPlanCopyResponse {
    specialistId: number;
    sourceDate: string;
    targetDates: string[];
    copiedAvailabilityCount: number;
    copiedEventCount: number;
    conflicts: DayPlanCopyConflict[];
}

export type SpecialistFixedEventInput = {
    specialistId?: number | null;
    serviceId: number;
    officeId?: number | null;
    startsAt: string;
    endsAt: string;
    capacity: number;
    note?: string | null;
    active: boolean;
};

export type DayPlanCopyInput = {
    specialistId?: number | null;
    sourceDate: string;
    targetDates: string[];
    includeAvailability: boolean;
    includeFixedEvents: boolean;
};

export type SpecialistAvailabilityInput = {
    specialistId?: number | null;
    officeId?: number | null;
    status: ScheduleBlockStatus;
    itemType?: ScheduleBlockType;
    serviceId?: number | null;
    capacity?: number | null;
    startsAt: string;
    endsAt: string;
    notes?: string | null;
};
