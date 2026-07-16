export type TrainingType = {
    id: number;
    titleUa: string;
    descriptionUa: string | null;
    titleEn: string | null;
    descriptionEn: string | null;
    durationMinutes: number;
    price: number;
    depositAmount: number;
    defaultCapacity: number;
    active: boolean;
    trainerIds: number[];
};

export type TrainingTypeInput = Omit<TrainingType, "id">;

export type TrainingSessionStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

export type TrainingSession = {
    id: number;
    trainingTypeId: number;
    titleUa: string;
    titleEn: string | null;
    trainerId: number;
    trainerName: string;
    officeId: number;
    officeName: string;
    resourceId: number;
    resourceName: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    status: TrainingSessionStatus;
    note: string | null;
    durationMinutes: number;
    price: number;
    depositAmount: number;
};

export type TrainingSessionInput = {
    trainingTypeId: number;
    trainerId: number;
    officeId: number;
    resourceId: number;
    startsAt: string;
    capacity: number | null;
    status: TrainingSessionStatus;
    note: string | null;
};

export type PublicTrainingSession = {
    id: number;
    trainingTypeId: number;
    compatibilityServiceId: number;
    title: string;
    trainerId: number;
    trainerName: string;
    officeId: number;
    officeName: string;
    resourceId: number;
    resourceName: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    enrolledCount: number;
    remainingPlaces: number;
    full: boolean;
    enrolled: boolean;
    enrollmentStatus: "ACTIVE" | "CANCELLED" | null;
    price: number;
    depositAmount: number;
    externalPaymentUrl: string | null;
};

export type TrainingEnrollment = Pick<PublicTrainingSession, "enrolledCount" | "remainingPlaces" | "full" | "enrolled" | "enrollmentStatus" | "externalPaymentUrl"> & {
    sessionId: number;
    paidWithMembership: boolean;
    paidWithLoyaltyVoucher: boolean;
    paymentConfirmed: boolean;
};
