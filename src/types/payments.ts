export type PaymentStatus = "PENDING" | "APPROVED" | "DECLINED" | "EXPIRED" |
    "RECONCILIATION_REQUIRED" | "REFUND_PENDING" | "REFUNDED" | "REFUND_FAILED";

export type PaymentCheckout = {
    paymentId: string;
    status: PaymentStatus;
    amount: number;
    currency: string;
    holdExpiresAt: string;
    checkoutUrl: string;
    checkoutFields: Record<string, string | number | Array<string | number>>;
};

export type PaymentDetails = {
    paymentId: string;
    sourceType: "BOOKING" | "TRAINING_PARTICIPANT";
    sourceId: number;
    status: PaymentStatus;
    amount: number;
    currency: string;
    holdExpiresAt: string;
    providerStatus: string | null;
    reconciliationReason: string | null;
};
