export type BookingStatus = "AWAITING_PAYMENT_CONFIRMATION" | "CONFIRMED" | "CANCELLED";
export type SpecialistPayoutStatus = "PENDING" | "PAID";
export type BookingSource = "PUBLIC_ACCOUNT" | "ADMIN_MANUAL" | "GUEST";
export type RecordAuditEntry = {
    id: number;
    action: "CREATED" | "JOINED" | "CANCELLED" | "PAYMENT_CONFIRMED";
    actorUserId: number | null;
    actorName: string | null;
    occurredAt: string;
};

export interface AdminBookingRecord {
    id: number;
    status: BookingStatus;
    source: BookingSource;
    direction: "MASSAGE" | "TRAINING";
    clientId: number;
    clientName: string;
    clientContact: string | null;
    specialistId: number;
    specialistName: string;
    serviceId: number;
    serviceTitleUa: string;
    serviceTitleEn: string | null;
    serviceVariantId: number | null;
    serviceVariantName: string | null;
    officeId: number | null;
    officeName: string | null;
    resourceId: number | null;
    resourceName: string | null;
    startsAt: string;
    endsAt: string;
    durationMinutes: number | null;
    bufferBeforeMinutes: number | null;
    bufferAfterMinutes: number | null;
    originalPrice: number | null;
    bookedPrice: number;
    depositAmount: number;
    promoCode: string | null;
    discountPercent: number | null;
    discountAmount: number | null;
    paidWithMembership: boolean;
    paidWithLoyaltyVoucher: boolean;
    reminderOptIn: boolean;
    cancellationReason: string | null;
    cancellationDetails: string | null;
    cancelledAt: string | null;
    attendanceStatus: "ATTENDED" | "NO_SHOW" | null;
    attendanceDecidedAt: string | null;
    attendanceDefaulted: boolean;
    createdByUserId: number;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
}

export interface Booking {
    id: number;
    status: BookingStatus;
    serviceId: number;
    serviceTitleUa: string;
    serviceTitleEn: string | null;
    specialistId: number;
    specialistName: string;
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
    reminderOptIn: boolean;
    externalPaymentUrl: string | null;
    membershipPurchaseId: number | null;
    paidWithMembership: boolean;
    loyaltyVoucherId?: number | null;
    paidWithLoyaltyVoucher?: boolean;
}

export interface FinanceBooking {
    id: number;
    status: BookingStatus;
    userId: number;
    clientName: string;
    clientContact: string | null;
    specialistId: number;
    specialistName: string;
    serviceId: number;
    serviceTitleUa: string;
    serviceTitleEn: string | null;
    externalPaymentUrl: string | null;
    membershipPurchaseId: number | null;
    paidWithMembership: boolean;
    loyaltyVoucherId?: number | null;
    paidWithLoyaltyVoucher?: boolean;
    bookedPrice: number;
    specialistSharePercent: number;
    specialistShare: number;
    businessShare: number;
    specialistPayoutStatus: SpecialistPayoutStatus;
    specialistPayoutPaidAt: string | null;
    specialistPayoutPaidByUserId: number | null;
    officeId: number | null;
    officeName: string | null;
    resourceId: number | null;
    resourceName: string | null;
    startsAt: string;
    endsAt: string;
    reminderOptIn: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FinanceTrainingParticipant {
    id: number;
    status: "PAYMENT_PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "ATTENDED" | "NO_SHOW";
    userId: number;
    clientName: string;
    clientContact: string | null;
    sessionId: number;
    trainingTypeId: number;
    serviceTitleUa: string;
    serviceTitleEn: string | null;
    paidWithMembership: boolean;
    paidWithLoyaltyVoucher?: boolean;
    bookedPrice: number;
    paymentConfirmed: boolean;
    paymentConfirmedAt: string | null;
    specialistId: number;
    specialistName: string;
    officeId: number | null;
    officeName: string | null;
    startsAt: string;
    endsAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface FinanceSummary {
    pendingCount: number;
    confirmedCount: number;
    income: number;
    specialistEarnings: number;
    businessIncome: number;
    expenses: number;
    taxableIncome: number;
    quarterlyTaxPercent: number;
    estimatedTax: number;
    result: number;
}

export type FinancialTransactionType =
    | "PAYMENT_COLLECTED" | "REFUND_REQUIRED" | "REFUND_COMPLETED"
    | "FORFEITURE_RECOGNIZED" | "FORFEITURE_REVERSED" | "SPECIALIST_PAYOUT_LIABILITY"
    | "SPECIALIST_PAYOUT_REVERSED" | "SPECIALIST_PAYOUT_PAID"
    | "EXPENSE_RECORDED" | "EXPENSE_REVERSED";

export interface FinancialTransaction {
    id: number;
    type: FinancialTransactionType;
    sourceType: "BOOKING" | "TRAINING_PARTICIPANT" | "TRAINING_PARTICIPANT" | "MEMBERSHIP_PURCHASE" | "FINANCE_EXPENSE";
    sourceId: number;
    amount: number;
    currency: "UAH";
    clientName: string | null;
    clientContact: string | null;
    specialistUserId: number | null;
    externalReference: string | null;
    relatedTransactionId: number | null;
    payoutBase: number | null;
    payoutRatePercent: number | null;
    description: string | null;
    occurredAt: string;
}

export interface FinanceReconciliation {
    readyForLedgerReporting: boolean;
    missingPaymentFacts: number;
    missingExpenseFacts: number;
    missingPayoutFacts: number;
    samples: string[];
}

export interface FinanceAnalytics {
    from: string;
    to: string;
    collectedAmount: number;
    refundedAmount: number;
    netCollectedAmount: number;
    specialistPayoutLiability: number;
    expenses: number;
    businessResultBeforeTax: number;
    bookingCount: number;
    completedCount: number;
    cancelledCount: number;
    noShowCount: number;
    averageCheck: number;
    bookedMinutes: number;
    plannedWorkMinutes: number;
    occupancyPercent: number;
    sources: Array<{key: string; label: string; records: number; collectedAmount: number}>;
    offerings: Array<{key: string; label: string; records: number; collectedAmount: number}>;
}

export interface FinanceSettings {
    quarterlyTaxPercent: number;
    updatedByUserId: number | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface FinanceSpecialistSettings {
    specialistId: number;
    specialistName: string;
    specialistSharePercent: number;
    updatedByUserId: number | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface SpecialistFinanceOverview {
    completedCount: number;
    pendingCount: number;
    payoutPendingCount: number;
    payoutPaidCount: number;
    workedMinutes: number;
    grossIncome: number;
    specialistEarnings: number;
    payoutPendingEarnings: number;
    payoutPaidEarnings: number;
    pendingGrossIncome: number;
    pendingSpecialistEarnings: number;
    specialistSharePercent: number;
}

export interface SpecialistBooking {
    id: number;
    status: BookingStatus;
    clientId: number;
    clientName: string;
    clientContact: string | null;
    specialistId: number;
    specialistName: string;
    serviceId: number;
    serviceTitleUa: string;
    serviceTitleEn: string | null;
    officeId: number | null;
    officeName: string | null;
    resourceId: number | null;
    resourceName: string | null;
    availabilityBlockId: number;
    startsAt: string;
    endsAt: string;
    reminderOptIn: boolean;
    originalPrice: number | null;
    bookedPrice: number;
    promoCode: string | null;
    discountPercent: number | null;
    discountAmount: number | null;
    membershipPurchaseId: number | null;
    paidWithMembership: boolean;
    loyaltyVoucherId: number | null;
    paidWithLoyaltyVoucher: boolean;
    cancellationReason: string | null;
    cancellationDetails: string | null;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface FinanceExpense {
    id: number;
    amount: number;
    category: string;
    description: string;
    expenseDate: string;
    officeId: number | null;
    officeName: string | null;
    createdByUserId: number;
    createdAt: string;
    updatedAt: string;
}

export type FinanceExpenseInput = {
    amount: number;
    category: string;
    description: string;
    expenseDate: string;
    officeId: number | null;
};

export type FinanceSpecialistSettingsInput = {
    specialistSharePercent: number;
};

export type FinanceSettingsInput = {
    quarterlyTaxPercent: number;
};

export type BookingInput = {
    availabilityBlockId: number;
    resourceId?: number | null;
    serviceId: number;
    serviceVariantId: number;
    startsAt?: string;
    reminderOptIn: boolean;
    membershipPurchaseId?: number | null;
    loyaltyVoucherId?: number | null;
    promoCode?: string | null;
    cancellationPolicyAccepted: boolean;
};

export type ManualBookingInput = Omit<BookingInput, "cancellationPolicyAccepted"> & {
    specialistId?: number | null;
    clientIdentifier: string;
    overrideClientBuffer: boolean;
    clientBufferOverrideReason?: string | null;
};

export type ManualBookingConflictPreview = {
    specialistConflict: boolean;
    resourceConflict: boolean;
    clientBufferConflict: boolean;
};
