export type ScheduleBlockStatus = "AVAILABLE" | "BLOCKED";
export type ScheduleBlockType = "OPEN_RANGE" | "APPOINTMENT_SLOT" | "BLOCK";

export interface ScheduleConfig {
    appointmentBufferMinutes: number;
}

export interface SpecialistAvailabilityBlock {
    id: number;
    specialistId: number;
    specialistName: string;
    specialistAvatarMediaId: string | null;
    specialistAvatarMediaUrl: string | null;
    officeId: number | null;
    officeName: string | null;
    resourceId: number | null;
    resourceName: string | null;
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
    specialistAvatarMediaId: string | null;
    specialistAvatarMediaUrl: string | null;
    officeId: number | null;
    officeName: string | null;
    resourceId: number | null;
    resourceName: string | null;
    officeAddress: string | null;
    officeDirections: string | null;
    officeGoogleMapsUrl: string | null;
    officePhotoMediaId: string | null;
    officePhotoMediaUrl: string | null;
    officeVideoMediaId: string | null;
    officeVideoMediaUrl: string | null;
    startsAt: string;
    endsAt: string;
}

export interface FittingServiceOption {
    variantId: number;
    serviceId: number;
    serviceTitle: string;
    variantName: string;
    durationMinutes: number;
    price: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    depositAmount: number;
    specialistId: number;
    specialistName: string;
    officeId: number;
    officeName: string;
    resourceId: number;
    resourceName: string;
    startsAt: string;
    endsAt: string;
}

export interface PublicScheduleUnavailableBlock {
    id: string;
    status: "OCCUPIED" | "UNAVAILABLE" | "BUFFER";
    specialistId: number;
    specialistName: string;
    officeId: number | null;
    officeName: string | null;
    startsAt: string;
    endsAt: string;
}

export interface PublicTrainingCalendarSession {
    id: number;
    serviceId: number;
    title: string;
    description: string | null;
    specialistId: number;
    specialistName: string;
    specialistAvatarMediaId: string | null;
    specialistAvatarMediaUrl: string | null;
    officeId: number | null;
    officeName: string | null;
    resourceId: number | null;
    resourceName: string | null;
    officeAddress: string | null;
    officeDirections: string | null;
    officeGoogleMapsUrl: string | null;
    officePhotoMediaId: string | null;
    officePhotoMediaUrl: string | null;
    officeVideoMediaId: string | null;
    officeVideoMediaUrl: string | null;
    startsAt: string;
    endsAt: string;
    capacity: number;
    enrolledCount: number;
    remainingPlaces: number;
    full: boolean;
    enrolled: boolean;
    enrollmentStatus: "ACTIVE" | "CANCELLED" | null;
    price: number;
    externalPaymentUrl: string | null;
    paymentConfirmed: boolean;
    note: string | null;
    membershipPurchaseId: number | null;
    paidWithMembership: boolean;
    loyaltyVoucherId?: number | null;
    paidWithLoyaltyVoucher?: boolean;
}

export interface SpecialistTrainingCalendarSession {
    id: number;
    specialistId: number;
    specialistName: string;
    serviceId: number;
    serviceTitle: string;
    officeId: number | null;
    officeName: string | null;
    resourceId: number | null;
    resourceName: string | null;
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
    targetDate: string;
    preview: boolean;
    copiedAvailabilityCount: number;
    copiedTrainingSessionCount: number;
    skippedAvailabilityCount: number;
    skippedTrainingSessionCount: number;
    conflicts: DayPlanCopyConflict[];
}

export type SpecialistTrainingCalendarInput = {
    specialistId?: number | null;
    serviceId: number;
    officeId?: number | null;
    resourceId?: number | null;
    startsAt: string;
    endsAt: string;
    capacity: number;
    note?: string | null;
    active: boolean;
};

export type DayPlanCopyInput = {
    specialistId?: number | null;
    sourceDate: string;
    targetDate: string;
    includeAvailability: boolean;
    includeTrainingSessions: boolean;
};

export type SpecialistAvailabilityInput = {
    specialistId?: number | null;
    officeId?: number | null;
    resourceId?: number | null;
    status: ScheduleBlockStatus;
    itemType?: ScheduleBlockType;
    serviceId?: number | null;
    capacity?: number | null;
    startsAt: string;
    endsAt: string;
    notes?: string | null;
};
