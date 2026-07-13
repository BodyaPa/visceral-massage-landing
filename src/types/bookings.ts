export type BookingStatus = "AWAITING_PAYMENT_CONFIRMATION" | "CONFIRMED" | "CANCELLED";
export type SpecialistPayoutStatus = "PENDING" | "PAID";

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
    startsAt: string;
    endsAt: string;
    reminderOptIn: boolean;
    createdAt: string;
    updatedAt: string;
}

export type FixedEventEnrollmentStatus = "ACTIVE" | "CANCELLED";

export interface FinanceEventEnrollment {
    id: number;
    status: FixedEventEnrollmentStatus;
    userId: number;
    clientName: string;
    clientContact: string | null;
    eventId: number;
    serviceId: number;
    serviceTitleUa: string;
    serviceTitleEn: string | null;
    externalPaymentUrl: string | null;
    membershipPurchaseId: number | null;
    paidWithMembership: boolean;
    loyaltyVoucherId?: number | null;
    paidWithLoyaltyVoucher?: boolean;
    bookedPrice: number;
    paymentConfirmed: boolean;
    paymentConfirmedAt: string | null;
    paymentConfirmedByUserId: number | null;
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
    serviceId: number;
    startsAt?: string;
    reminderOptIn: boolean;
    membershipPurchaseId?: number | null;
    loyaltyVoucherId?: number | null;
    promoCode?: string | null;
};

export type ManualBookingInput = BookingInput & {
    specialistId?: number | null;
    clientIdentifier: string;
};
