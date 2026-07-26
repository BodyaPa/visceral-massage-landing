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

export type TrainingSessionStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";
export type TrainingParticipantStatus = "PAYMENT_PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "ATTENDED" | "NO_SHOW";

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
    enrolledCount: number;
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
    enrollmentStatus: TrainingParticipantStatus | null;
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

export type CalendarTrainingParticipant = {
    id: number;
    sessionId: number;
    sessionTitle: string;
    sessionStartsAt: string;
    sessionEndsAt: string;
    clientId: number;
    clientName: string;
    clientContact: string | null;
    status: TrainingParticipantStatus;
    reminderOptIn: boolean;
    createdAt: string;
    updatedAt: string;
};

export type AccountTrainingParticipation = {
    participantId: number;
    sessionId: number;
    title: string;
    trainerId: number;
    trainerName: string;
    officeId: number;
    officeName: string;
    officeAddress: string | null;
    officeDirections: string | null;
    officeGoogleMapsUrl: string | null;
    resourceId: number;
    resourceName: string;
    startsAt: string;
    endsAt: string;
    status: TrainingParticipantStatus;
    originalPrice: number;
    finalPrice: number;
    paidWithMembership: boolean;
    paidWithLoyaltyVoucher: boolean;
    paymentConfirmed: boolean;
    externalPaymentUrl: string | null;
    reminderOptIn: boolean;
};

export type AdminTrainingRecord = {
    id: number;
    participantStatus: TrainingParticipantStatus;
    sessionId: number;
    sessionStatus: TrainingSessionStatus;
    trainingTypeId: number;
    titleUa: string;
    titleEn: string | null;
    clientId: number;
    clientName: string;
    clientContact: string | null;
    trainerId: number;
    trainerName: string;
    officeId: number;
    officeName: string;
    resourceId: number;
    resourceName: string;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    originalPrice: number | null;
    finalPrice: number;
    depositAmount: number;
    promoCode: string | null;
    discountPercent: number | null;
    discountAmount: number | null;
    paidWithMembership: boolean;
    paidWithLoyaltyVoucher: boolean;
    paymentConfirmed: boolean;
    reminderOptIn: boolean;
    cancellationReason: string | null;
    cancellationDetails: string | null;
    cancelledAt: string | null;
    attendanceStatus: "ATTENDED" | "NO_SHOW" | null;
    attendanceDecidedAt: string | null;
    attendanceDefaulted: boolean;
    joinedAt: string;
    createdAt: string;
    updatedAt: string;
};
