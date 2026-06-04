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

export type SpecialistAvailabilityInput = {
    officeId?: number | null;
    status: ScheduleBlockStatus;
    startsAt: string;
    endsAt: string;
    notes?: string | null;
};
