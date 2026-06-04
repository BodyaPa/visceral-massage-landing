export type BookingStatus = "AWAITING_PAYMENT_CONFIRMATION" | "CONFIRMED" | "CANCELLED";

export interface Booking {
    id: number;
    status: BookingStatus;
    serviceId: number;
    serviceTitleUa: string;
    specialistId: number;
    specialistName: string;
    officeId: number | null;
    officeName: string | null;
    startsAt: string;
    endsAt: string;
    reminderOptIn: boolean;
    externalPaymentUrl: string | null;
}

export interface FinanceBooking {
    id: number;
    status: BookingStatus;
    userId: number;
    clientName: string;
    clientContact: string | null;
    serviceId: number;
    serviceTitleUa: string;
    basePrice: number;
    specialistId: number;
    specialistName: string;
    officeId: number | null;
    officeName: string | null;
    startsAt: string;
    endsAt: string;
    reminderOptIn: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FinanceSummary {
    pendingCount: number;
    confirmedCount: number;
    income: number;
    expenses: number;
    result: number;
}

export interface SpecialistBooking {
    id: number;
    status: BookingStatus;
    clientId: number;
    clientName: string;
    clientContact: string | null;
    serviceId: number;
    serviceTitleUa: string;
    officeId: number | null;
    officeName: string | null;
    startsAt: string;
    endsAt: string;
    reminderOptIn: boolean;
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

export type BookingInput = {
    availabilityBlockId: number;
    serviceId: number;
    reminderOptIn: boolean;
};

export type ManualBookingInput = BookingInput & {
    clientIdentifier: string;
};
